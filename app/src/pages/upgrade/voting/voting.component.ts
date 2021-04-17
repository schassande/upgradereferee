import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { NavController } from '@ionic/angular';
import { forkJoin, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { Competition } from 'src/app/model/competition';
import { CompetitionDayRefereeCoachVote } from 'src/app/model/upgrade';
import { ApplicationRole, CurrentApplicationName, RefereeLevel, User } from 'src/app/model/user';
import { CompetitionDayRefereeCoachVoteService } from 'src/app/service/CompetitionDayRefereeCoachVoteService';
import { CompetitionService } from 'src/app/service/CompetitionService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { ResponseWithData } from 'src/app/service/response';
import { UserService } from 'src/app/service/UserService';

@Component({
  selector: 'app-voting',
  styleUrls: ['./voting.component.scss'],
  templateUrl: './voting.component.html'
})
export class VotingComponent implements OnInit {

  /** Id of the selected competition. This id can be given in parameter of the page. Can be null */
  competitionId: string;
  /** Competition object selected. Can be null */
  competition: Competition;
  /** List of the competitions if the page is not dedicated to a competition. Can be null */
  competitions: Competition[];
  /** Show or not the combox to select a competition */
  showCompetitionSelector = true;

  /** The day of the competition */
  day: Date;
  /** Show or not the combox to select a competition */
  showDaySelector = true;

  /** Id of the selected referee. This id can be given in parameter of the page. Can be null */
  refereeId: string;
  /** User object selected representing the referee. Can be null */
  referee: User;
  /** List of the referees if the page is not dedicated to a referee. Can be null */
  referees: User[];
  /** List of the referees filtered by upgrade level if the page is not dedicated to a referee. Can be null */
  filteredReferees: User[];
  /** Show or not the combox to select a referee */
  showRefereeSelector = true;

  /** The */
  vote: CompetitionDayRefereeCoachVote;

  loading = true;

  coach: User;
  upgradeLevel: RefereeLevel;
  upgradeLevels: RefereeLevel[];

  constructor(
    private activatedRoute: ActivatedRoute,
    private competitionDayRefereeCoachVoteService: CompetitionDayRefereeCoachVoteService,
    private competitionService: CompetitionService,
    private connectedUserService: ConnectedUserService,
    public dateService: DateService,
    private navController: NavController,
    private userService: UserService,
  ) { }

  ngOnInit() {
    this.loading = true;
    this.coach = this.connectedUserService.getCurrentUser();
    this.activatedRoute.queryParamMap.pipe(
      map((params: Params) => this.loadParams(params)),
      mergeMap(() => this.loadCompetitionFromId()),
      mergeMap(() => this.loadCompetitions()),
      map(() => this.adjustRefereeId()),
      mergeMap(() => this.loadRefereeFromId()),
      mergeMap(() => this.loadReferees()),
      map(() => this.computeFilteredReferees()),
      mergeMap(() => {
        if (this.competition) {
          // check the day field
          if (this.day) {
            this.day = this.competition.days.find(day => this.dateService.compareDate(day, this.day) === 0);
          }
          if (!this.day) {
            this.day = this.competition.days.find(day => this.dateService.compareDate(day, new Date()) === 0);
          }
          if (!this.day) {
            this.day = this.competition.days[0];
          }
        } else {
          this.findInitialCompetition();
        }
        return this.loadVote();
      }),
      map(() => this.print())
    ).subscribe();

  }

  private print() {
    console.log('this.showCompetitionSelector=' + this.showCompetitionSelector);
    console.log('this.showDaySelector=' + this.showDaySelector);
    console.log('this.showRefereeSelector=' + this.showRefereeSelector);
    console.log('this.competitionId=' + this.competitionId);
    console.log('this.competition=', this.competition);
    console.log('this.competitions=', this.competitions);
    console.log('this.day=', this.dateService.date2string(this.day));
    console.log('this.refereeId=' + this.refereeId);
    console.log('this.referee=', this.referee);
    console.log('this.referees=', this.referees);
    console.log('this.filteredReferees=', this.filteredReferees);
    console.log('this.vote=', this.vote);
    console.log('this.upgradeLevel=', this.upgradeLevel);
    console.log('this.upgradeLevels=', this.upgradeLevels);
    console.log('this.loading=', this.loading);
  }

  private loadParams(params: Params) {
    this.competitionId = params.get('competitionId');
    if (this.competitionId) {
      console.log('PARAM competitionId=' + this.competitionId);
      const dayStr = params.get('day');
      if (dayStr) {
        try {
          this.day = new Date(Number.parseInt(dayStr, 10));
          console.log('PARAM day=' + this.dateService.date2string(this.day));
        } catch (err) {
          console.error('VotingComponent: error when parsing the day of the competition day=', dayStr, err);
        }
      }
    }
    this.refereeId = params.get('refereeId');
    if (this.refereeId) {
      console.log('PARAM refereeId=' + this.refereeId);
    }
    return '';
  }

  private loadCompetitionFromId(): Observable<any> {
    if (this.competitionId) {
      return this.competitionService.get(this.competitionId).pipe(
        map((rcompetition: ResponseWithData<Competition>) => this.competition = rcompetition.data)
      );
    }
    return of('');
  }

  private loadCompetitions(): Observable<any> {
    if (this.competition) {
      console.log('loadCompetitions(): have a competition');
      this.showCompetitionSelector = false;
      return of('');
    } else {
      console.log('loadCompetitions(): load competitions');
      this.showCompetitionSelector = true;
      return this.competitionService.all().pipe(
        map((rcompetitions: ResponseWithData<Competition[]>) =>
          this.competitions = this.competitionService.sortCompetitions(rcompetitions.data, true))
      );
    }
  }

  private adjustRefereeId(): any {
    if (this.competition && this.refereeId
      && this.competition.referees.findIndex((referee) => referee.refereeId === this.refereeId) < 0) {
      // the competition exists but the referee does not belong the competition!
      // => ignore the referee id given by the url
      this.refereeId = null;
    }
    return '';
  }

  private loadRefereeFromId(): Observable<any> {
    if (this.refereeId) { // load the referee
      return this.userService.get(this.refereeId).pipe(
        map((ruser: ResponseWithData<User>) => this.referee = ruser.data),
      );
    }
    return of('');
  }

  private loadReferees(): Observable<any> {
    this.referees = [];
    if (this.referee) {
      this.showRefereeSelector = false;
      console.log('loadReferees(): Have a referee', this.referee);
    } else {
      this.showRefereeSelector = true;
      if (this.competition) {
        return this.loadRefereesFromCompetition();
      } else {
        console.log('loadReferees(): Load referees');
        // load upgradable referee
        return this.userService.searchUsers({}).pipe(
          map((rusers: ResponseWithData<User[]>) => this.referees = this.filterReferees(rusers.data))
        );
      }
    }
    return of('');
  }

  private loadRefereesFromCompetition(): Observable<any> {
    console.log('loadReferees(): Load referees from the competition');
    this.referees = [];
    // load the referee list from the competitions
    return forkJoin(this.competition.referees.map(
      referee => this.userService.get(referee.refereeId).pipe(
        map((ruser) => {
          if (this.checkReferee(ruser.data)) {
            console.log('Referee ' + ruser.data.shortName + ' is upgradable');
            this.referees.push(ruser.data);
            if (!this.refereeId && !this.referee) {
              this.referee = this.referees[0];
              this.refereeId = this.referee.id;
            }
          } else {
            console.log('Referee ' + ruser.data.shortName + ' is NOT upgradable');
          }
        }))
      ));
  }
  computeUpgradeLevels() {
    this.upgradeLevels = [];
    if (this.referees) {
      this.referees.forEach(ref => {
        if (this.upgradeLevels.indexOf(ref.referee.nextRefereeLevel) < 0) {
          this.upgradeLevels.push(ref.referee.nextRefereeLevel);
        }
      });
      this.upgradeLevels.sort();
    }
    console.log('upgradeLevels:', this.upgradeLevels);
  }

  computeFilteredReferees() {
    if (this.referees && this.referees.length > 0) {
      if (this.upgradeLevel) {
        this.filteredReferees = this.referees.filter((ref) => ref.referee.nextRefereeLevel === this.upgradeLevel);
        console.log('After level filtering => ' + this.referees.length + ' => ' + this.filterReferees.length + ' referees.');
      } else {
        this.filteredReferees = this.referees;
        console.log('No level filtering => ' + this.filteredReferees.length + ' referees.');
      }
    } else {
      this.filteredReferees = this.referees;
      console.log('Empty referees list');
    }
  }

  private findInitialCompetition() {
    // use the default competition
    this.competitionId = this.coach.defaultCompetitionId;
    if (this.competitionId) {
      this.competition = this.competitions.find(c => c.id === this.competitionId);
      if (this.competition) {
        this.day = this.day ? this.competition.days.find(day => this.dateService.compareDate(day, this.day)) : null;
        if (!this.day) {
          const now = new Date().getTime();
          const days = this.competition.days.filter(day => day.getTime() < now);
          if (days && days.length > 0) {
            this.day = days[days.length - 1];
          }
        }
        console.log('Use the default competition of the user', this.competition, this.dateService.date2string(this.day));
      }
    }
    if (!this.competition) {
      // else find the competition having a day as today
      this.competition = this.competitions.find(c => {
        this.day = c.days.find(day => this.dateService.compareDate(day, this.day));
        return this.day !== null && this.day !== undefined;
      });
      console.log('Try to find a competition happening today', this.competition, this.dateService.date2string(this.day));
    }
    if (!this.competition) {
      // else take the last competition before today
      this.competitions.filter(c => {
        this.day = this.competition.days.find(day => this.dateService.isToday(day));
        if (!this.day) {
          const now = new Date().getTime();
          const days = c.days.filter(day => day.getTime() < now);
          if (days && days.length > 0) {
            this.day = days[days.length - 1];
          }
        }
        return this.day !== null && this.day !== undefined;
      });
      console.log('Try to find a competition happening recently', this.competition, this.dateService.date2string(this.day));
    }
  }

  private filterReferees(referees: User[]): User[] {
    return referees ? referees.filter(referee => this.checkReferee(referee)) : referees;
  }

  private checkReferee(referee: User): boolean {
    if (!referee) {
      return false;
    }
    if (referee.accountStatus !== 'ACTIVE') {
      // the account of the referee is not validated
      return false;
    }
    if (referee.applications.findIndex((ar) => ar.role === 'REFEREE' && ar.name === CurrentApplicationName) < 0) {
      // the referee is not a registered account as Referee
      return false;
    }
    return true;
  }

  private loadVote(): Observable<any> {
    this.loading = true;
    console.log(`Looking for Vote(competition=${this.competitionId}, day=${this.dateService.date2string(this.day)}, coach=${this.coach.id}, referee=${this.refereeId})`);
    if (this.competitionId && this.refereeId && this.day) {
      return this.competitionDayRefereeCoachVoteService.getVote(
        this.competitionId, this.day, this.coach.id, this.refereeId).pipe(
          map(rvote => this.vote = rvote.data),
          map(() => {
            if (this.vote) {
              console.log(`Existing Vote: ${this.vote.id}`);
            } else {
              this.createVote();
            }
          }),
          map(() => this.loading = false)
        );
    } else {
      this.loading = false;
      this.vote = null;
      return of('');
    }
  }

  private createVote() {
    console.log('createVote()');
    this.vote = {
      id: '',
      dataStatus: 'NEW',
      creationDate: new Date(),
      lastUpdate: new Date(),
      version: 0,
      competitionId: this.competitionId,
      day: this.dateService.to00h00(this.day),
      referee: {
        refereeShortName: this.referee.shortName,
        refereeId: this.refereeId
      },
      vote: 'Abstein',
      commentForCoach: '-',
      commentForReferee: '-',
      closed: false,
      coach: {
        coachShortName: this.coach.shortName,
        coachId: this.coach.id
      }
    };
  }

  onCompetitionChange() {
    if (!this.competition || this.competitionId !== this.competition.id) {
      this.competition = this.competitions.find(c => c.id === this.competitionId);
      console.log('onCompetitionChange() => ' + this.competitionId);
      this.loadRefereesFromCompetition().pipe(
        map(() => this.computeFilteredReferees()),
        map(() => this.adjustRefereeId()),
      ).subscribe();
    }
  }

  onDayChange($event: any) {
    const dateStr = $event.target.value;
    if (dateStr !== this.dateService.date2string(this.day)) {
      console.log('onDayChange()', dateStr);
      this.day = this.dateService.string2date(dateStr, null);
      // TODO
      this.loadVote().subscribe();
    }
  }

  onUpgradeLevelChange() {
    console.log('onUpgradeLevelChange()');
    // TODO
    this.loadVote().subscribe();
  }

  onRefereeChange() {
    console.log('onRefereeChange()');
    this.referee = this.referees.find(r => r.id === this.refereeId);
    this.loadVote().subscribe();
  }

  onVoteChange() {
    // console.log('onVoteChange()\n' +  JSON.stringify(this.vote, null, 2));
    this.competitionDayRefereeCoachVoteService.save(this.vote).pipe(
      map((rvote) => {
        this.vote = rvote.data;
        // console.log('Vote saved: ', this.vote);
      })
    ).subscribe();
  }

  navBack() {
    if (this.competitionId) {
      this.navController.navigateRoot([`/competition/${this.competitionId}/home`]);
    } else if (this.refereeId) {
      this.navController.navigateRoot([`/referee/view/${this.refereeId}`]);
    } else {
      this.navController.navigateRoot(['/home']);
    }
  }

  onSwipe($event) {
  }
}
