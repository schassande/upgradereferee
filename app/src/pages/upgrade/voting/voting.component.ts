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

  dirty = false;
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
  showDaySelector = false;

  /** Id of the selected referee. This id can be given in parameter of the page. Can be null */
  refereeId: string;
  /** User object selected representing the referee. Can be null */
  referee: User;
  /** List of the referees if the page is not dedicated to a referee. Can be null */
  referees: User[];
  /** List of the referees filtered by upgrade level if the page is not dedicated to a referee. Can be null */
  filteredReferees: User[];
  /** Show or not the combox to select a referee */
  showRefereeSelector = false;

  /** The */
  vote: CompetitionDayRefereeCoachVote;

  loading = true;

  coach: User;
  isCoachOfCompetition = false;
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
      mergeMap(() => this.loadRefereeFromId()),
      mergeMap(() => this.loadCompetitions()),
      mergeMap(() => {
        if (!this.competition) {
          this.findInitialCompetition();
        }
        this.isCoachOfCompetition = this.competition.refereeCoaches.filter(rc => rc.coachId === this.coach.id).length > 0;
        if (this.competition) {
          this.competitionId = this.competition.id;
          return this.onCompetitionChange();
        } else {
          this.computeDay();
          return this.loadVote();
        }
      }),
      map(() => this.print())
    ).subscribe();
  }

  private computeDay() {
    // console.log('BEGIN computeDay()');
    if (!this.competition) {
      this.day = null;
    }
    if (!this.competition.days || this.competition.days.length === 0) {
      this.competition.days = [this.competition.date];
    }
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
    this.showDaySelector = this.competition.days.length > 1;
  }

  private print() {
    console.log('this.showCompetitionSelector=' + this.showCompetitionSelector
      + '\nthis.showDaySelector=' + this.showDaySelector
      + '\nthis.showRefereeSelector=' + this.showRefereeSelector
      + '\nthis.competitionId=' + this.competitionId
      + '\nthis.competition=', this.competition
      + '\nthis.competitions=', this.competitions
      + '\nthis.day=', this.dateService.date2string(this.day)
      + '\nthis.refereeId=' + this.refereeId
      + '\nthis.referee=', this.referee
      + '\nthis.referees=', this.referees
      + '\nthis.filteredReferees=', this.filteredReferees
      + '\nthis.vote=', this.vote
      + '\nthis.upgradeLevel=', this.upgradeLevel
      + '\nthis.upgradeLevels=', this.upgradeLevels
      + '\nthis.loading=', this.loading);
  }

  private loadParams(params: Params) {
    // console.log('BEGIN loadParams()');
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
    // console.log('BEGIN loadCompetitionFromId()');
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
          this.competitions = this.competitionService.sortCompetitions(this.filterCompetitions(rcompetitions.data), true))
      );
    }
  }

  private filterCompetitions(cs: Competition[]): Competition[] {
    return !cs ? [] : cs.filter(c => {
      if (this.refereeId && c.referees.filter(r => r.refereeId === this.refereeId).length === 0) {
        return false;
      }
      if (!this.connectedUserService.isAdmin() && c.refereeCoaches.filter(rc => rc.coachId === this.coach.id).length === 0) {
        return false;
      }
      return true;
    });
  }

  private adjustRefereeId(): any {
    // console.log('BEGIN adjustRefereeId()');
    if (this.competition && this.refereeId
      && this.competition.referees.findIndex((referee) => referee.refereeId === this.refereeId) < 0) {
      // the competition exists but the referee does not belong the competition!
      // => ignore the referee id given by the url
      this.refereeId = null;
      this.referee = null;
    }
    if (this.referee && this.competition.referees.filter((referee) => referee.refereeId === this.referee.id).length === 0) {
      this.referee = null;
    }
  }

  private loadRefereeFromId(): Observable<any> {
    // console.log('BEGIN loadRefereeFromId()');
    if (this.refereeId) { // load the referee
      return this.userService.get(this.refereeId).pipe(
        map((ruser: ResponseWithData<User>) => this.referee = ruser.data),
      );
    }
    return of('');
  }

  private loadReferees(): Observable<any> {
    // console.log('BEGIN loadReferees()');
    this.referees = [];
    if (this.referee) {
      this.showRefereeSelector = false;
      console.log('loadReferees(): Have a referee', this.referee, this.refereeId);
    } else {
      this.showRefereeSelector = true;
      if (this.competition) {
        return this.loadRefereesFromCompetition();
      } else {
        this.referees = [];
        this.filteredReferees = [];
        this.referee = null;
        this.refereeId = null;
      }
    }
    return of('');
  }

  private loadRefereesFromCompetition(): Observable<any> {
    console.log('loadRefereesFromCompetition(): Load referees from the competition');
    this.referees = [];
    this.referee = null;
    const refs: User[] = [];
    // load the referee list from the competitions
    const obs: Observable<any>[] = this.competition.referees.map(
      referee => this.userService.get(referee.refereeId).pipe(
        map((ruser) => {
          if (this.checkReferee(ruser.data)) {
            refs.push(ruser.data);
          }
        }))
    );
    return obs.length === 0 ?  of('') : forkJoin(obs).pipe(
      map(() => {
        this.referees = refs;
        if (!this.refereeId && !this.referee) {
          this.referee = this.referees[0];
          // this.refereeId = this.referee.id;
        }
      })
    );
  }

  private computeUpgradeLevels() {
    // console.log('BEGIN computeUpgradeLevels()');
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
    // console.log('BEGIN computeFilteredReferees()');
    if (this.referees && this.referees.length > 0) {
      if (this.upgradeLevel) {
        this.filteredReferees = this.referees.filter((ref) => ref.referee.nextRefereeLevel === this.upgradeLevel);
        console.log('After level filtering => ' + this.referees.length + ' => ' + this.filteredReferees.length + ' referees.');
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
    // console.log('BEGIN findInitialCompetition()');
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
    if (!this.competition && this.day) {
      // else find the competition having a day as today
      this.competition = this.competitions.find(c => {
        if (c.refereeCoaches.filter(rc => rc.coachId === this.coach.id).length === 0) {
          return false;
        }
        this.day = c.days.find(day => this.dateService.compareDate(day, this.day));
        return this.day !== null && this.day !== undefined;
      });
      console.log('Try to find a competition happening today', this.competition, this.dateService.date2string(this.day));
    }
    if (!this.competition) {
      // else take the last competition before today
      this.day = null;
      this.competitions.forEach(c => {
        if (c.refereeCoaches.filter(rc => rc.coachId === this.coach.id).length === 0) {
          return;
        }
        const now = new Date();
        const cDays = c.days.filter(d => this.dateService.compareDate(d, now) < 0);
        const cDay: Date = cDays.length > 0 ? cDays[cDays.length - 1] : null;
        if (cDay) {
          if (!this.day || this.dateService.compareDate(cDay, this.day) > 0) {
            this.day = cDay;
            this.competition = c;
          }
        }
      });
      console.log('Try to find a competition happening recently', this.competition, this.dateService.date2string(this.day));
    }
  }

  private checkReferee(referee: User): boolean {
    if (!referee) {
      return false;
    }
    if (referee.accountStatus !== 'ACTIVE') {
      // the account of the referee is not validated
      console.log('Referee ' + referee.shortName + ' is NOT upgradable (account status)');
      return false;
    }
    if (referee.applications.findIndex((ar) => ar.role === 'REFEREE' && ar.name === CurrentApplicationName) < 0) {
      // the referee is not a registered account as Referee
      console.log('Referee ' + referee.shortName + ' is NOT upgradable (not a referee of the application)');
      return false;
    }
    if (!this.userService.canVote(referee, this.coach) && !this.connectedUserService.isAdmin()) {
      console.log('Referee ' + referee.shortName + ' is NOT upgradable (cannot vote)');
      return false;
    }
    console.log('Referee ' + referee.shortName + ' is upgradable');
    return true;
  }

  private loadVote(): Observable<any> {
    // console.log('BEGIN loadVote()');
    this.loading = true;
    this.vote = null;
    console.log(`Looking for Vote (competition=${this.competitionId}, day=${this.dateService.date2string(this.day)}, coach=${this.coach.id}, referee=${this.refereeId})`);
    if (this.competitionId && this.referee && this.day) {
      return this.competitionDayRefereeCoachVoteService.getVote(
        this.competitionId, this.day, this.coach.id, this.referee.id).pipe(
          map(rvote => this.vote = rvote.data),
          map(() => {
            if (this.vote) {
              console.log(`Existing Vote: ${this.vote.id}`);
            } else {
              this.createVote();
            }
          }),
          map(() => { this.loading = false; this.dirty = false; })
        );
    } else {
      this.loading = false;
      this.dirty = false;
      this.vote = null;
      return of('');
    }
  }

  private createVote() {
    // console.log('createVote()');
    this.vote = {
      id: '',
      dataStatus: 'NEW',
      creationDate: new Date(),
      lastUpdate: new Date(),
      version: 0,
      competitionRef: {competitionId: this.competitionId, competitionName: this.competition.name},
      isMultiDayCompetition: this.competition.days.length > 1,
      day: this.dateService.to00h00(this.day),
      referee: {
        refereeShortName: this.referee.shortName,
        refereeId: this.refereeId
      },
      upgradeLevel: this.referee.referee.nextRefereeLevel,
      vote: 'Abstein',
      commentForCoach: '-',
      commentForReferee: '-',
      closed: false,
      coach: {
        coachShortName: this.coach.shortName,
        coachId: this.coach.id
      }
    };
    this.dirty = true;
  }
  onCompetitionChangeByUser() {
    this.onCompetitionChange(true).subscribe();
  }

  private onCompetitionChange(fromUser = false): Observable<any> {
    if (this.competition && this.competitionId && this.competition.id === this.competitionId && fromUser) {
      return of('');
    }
    console.log('BEGIN onCompetitionChange(' + fromUser + ')');
    if (this.competitions) {
      this.competition = this.competitions.find(c => c.id === this.competitionId);
    }
    if (this.competition) {
      // console.log('onCompetitionChange() => ' + this.competitionId);
      this.showDaySelector = this.competition.days.length > 1;
      this.isCoachOfCompetition = this.competition.refereeCoaches.filter(rc => rc.coachId === this.coach.id).length > 0;
      return this.loadReferees().pipe(
        map(() => {
          this.computeUpgradeLevels();
          this.computeFilteredReferees();
          this.adjustRefereeId();
          this.computeDay();
        }),
        mergeMap(() => this.loadVote())
      );
    } else {
      return of('');
    }
  }

  onDayChange($event: any) {
    // console.log('BEGIN onDayChange()');
    const dateStr = $event.target.value;
    if (dateStr !== this.dateService.date2string(this.day)) {
      // console.log('onDayChange()', dateStr);
      this.day = this.dateService.string2date(dateStr, null);
      this.loadVote().subscribe();
    }
  }

  onUpgradeLevelChange() {
    // console.log('BEGIN onUpgradeLevelChange()');
    this.loadVote().subscribe();
  }

  onRefereeChange() {
    // console.log('BEGIN onRefereeChange()');
    this.referee = this.referees.find(r => r.id === this.refereeId);
    // console.log('onRefereeChange(): ', this.referee);
    this.loadVote().subscribe();
  }
  previousDay() {
    let idx = this.competition.days.indexOf(this.day);
    // console.log('previousDay(): ' + idx);
    if (idx >= 0) {
      if (idx === 0) {
        idx = this.competition.days.length - 1;
      } else {
        idx = idx - 1;
      }
      this.day = this.competition.days[idx];
      this.loadVote().subscribe();
    }
  }
  nextDay() {
    let idx = this.competition.days.indexOf(this.day);
    // console.log('nextDay(): ' + idx);
    if (idx >= 0) {
      idx = (idx + 1 ) % this.competition.days.length;
      this.day = this.competition.days[idx];
      this.loadVote().subscribe();
    }
  }
  previousReferee() {
    let idx = this.referees.findIndex(r => r.id === this.refereeId);
    if (idx >= 0) {
      if (idx === 0) {
        idx = this.referees.length - 1;
      } else {
        idx = idx - 1;
      }
      this.refereeId = this.referees[idx].id;
      this.onRefereeChange();
    }
  }
  nextReferee() {
    let idx = this.referees.findIndex(r => r.id === this.refereeId);
    // console.log('Current referee at ' + idx + ' over ' + this.referees.length + '. referee id: ' + this.refereeId);
    if (idx >= 0) {
      idx = (idx + 1 ) % this.referees.length;
      this.refereeId = this.referees[idx].id;
      // console.log('New referee selected at ' + idx + ' over ' + this.referees.length + '. referee id: ' + this.refereeId);
      this.onRefereeChange();
    }
  }
  onVoteChange() {
    // console.log('onVoteChange()\n' +  JSON.stringify(this.vote, null, 2));
    this.dirty = true;
  }
  saveVote() {
    this.competitionDayRefereeCoachVoteService.save(this.vote).pipe(
      map((rvote) => {
        this.vote = rvote.data;
        this.dirty = false;
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
    if ($event.direction === 4) {
      this.navBack();
    }
  }
}
