import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { NavController } from '@ionic/angular';
import { forkJoin, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { Assessment } from 'src/app/model/assessment';
import { Coaching } from 'src/app/model/coaching';
import { Competition } from 'src/app/model/competition';
import { CompetitionDayRefereeCoachVote } from 'src/app/model/upgrade';
import { CurrentApplicationName, RefereeLevel, User } from 'src/app/model/user';
import { AssessmentService } from 'src/app/service/AssessmentService';
import { CoachingService } from 'src/app/service/CoachingService';
import { CompetitionDayRefereeCoachVoteService } from 'src/app/service/CompetitionDayRefereeCoachVoteService';
import { CompetitionService } from 'src/app/service/CompetitionService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { ResponseWithData } from 'src/app/service/response';
import { UserService } from 'src/app/service/UserService';

type VoteSummaryStatus = 'LOADING' | 'LOADED' | 'NOT_FOUND';
interface VoteSummary {
  status: VoteSummaryStatus;
  referee: User;
  vote?: CompetitionDayRefereeCoachVote;
}
@Component({
  selector: 'app-voting',
  styleUrls: ['./voting.component.scss'],
  templateUrl: './voting.component.html'
})
export class VotingComponent implements OnInit {

  /** Id of the selected referee. This id can be given in parameter of the page. Can be null */
  inputRefereeId: string;
  /** Id of the selected competition. This id can be given in parameter of the page. Can be null */
  inputCompetitionId: string;

  dirty = false;
  saving = false;
  /** Competition object selected. Can be null */
  competition: Competition;
  competitionId: string;
  /** List of the competitions if the page is not dedicated to a competition. Can be null */
  competitions: Competition[];
  /** Show or not the combox to select a competition */
  showCompetitionSelector = true;

  /** The day of the competition */
  day: Date;
  /** Show or not the combox to select a competition */
  showDaySelector = false;

  /** Id of the selected referee. This id can be given in parameter of the page. Can be null */
  selectedRefereeId: string = null;
  /** User object selected representing the referee. Can be null */
  referee: User = null;
  /** List of the referees if the page is not dedicated to a referee. Can be null */
  referees: User[];
  /** List of the referees filtered by upgrade level if the page is not dedicated to a referee. Can be null */
  filteredReferees: User[];
  /** Show or not the combox to select a referee */
  showRefereeSelector = false;

  coachings: Coaching[];
  errorfindCoachings: any;
  assessments: Assessment[];
  errorfindAssessments: any;

  /** The */
  vote: CompetitionDayRefereeCoachVote;
  summary: VoteSummary[] = null;
  summaryPercent: number;

  loading = true;

  coach: User;
  isCoachOfCompetition = false;
  upgradeLevel: RefereeLevel;
  upgradeLevels: RefereeLevel[];

  constructor(
    private activatedRoute: ActivatedRoute,
    private assessmentService: AssessmentService,
    public coachingService: CoachingService,
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
        if (this.competition) {
          this.isCoachOfCompetition = this.competition.refereeCoaches.filter(rc => rc.coachId === this.coach.id).length > 0;
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
      this.showDaySelector = false;
      return;
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
      + '\nthis.inputCompetitionId=', this.inputCompetitionId
      + '\nthis.competitionId=' + this.competitionId
      + '\nthis.competition=', this.competition
      + '\nthis.competitions=', this.competitions
      + '\nthis.day=', this.dateService.date2string(this.day)
      + '\nthis.inputRefereeId=' + this.inputRefereeId
      + '\nthis.selectedRefereeId=' + this.selectedRefereeId
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
    this.inputCompetitionId = params.get('competitionId');
    if (this.inputCompetitionId) {
      this.competitionId = this.inputCompetitionId;
      console.log('PARAM competitionId=' + this.inputCompetitionId);
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
    this.inputRefereeId = params.get('refereeId');
    if (this.inputRefereeId) {
      console.log('PARAM refereeId=' + this.inputRefereeId);
    }
    return '';
  }

  private loadCompetitionFromId(): Observable<any> {
    // console.log('BEGIN loadCompetitionFromId()');
    if (this.inputCompetitionId) {
      return this.competitionService.get(this.inputCompetitionId).pipe(
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
      if (this.inputRefereeId && c.referees.filter(r => r.refereeId === this.inputRefereeId).length === 0) {
        // console.log('filterCompetitions: does not include the referee ' + this.refereeId);
        return false;
      }
      if (!this.connectedUserService.isAdmin() && c.refereeCoaches.filter(rc => rc.coachId === this.coach.id).length === 0) {
        // console.log('filterCompetitions: does not include the referee coach ' + this.coach.id);
        return false;
      }
      return true;
    });
  }

  private loadRefereeFromId(): Observable<any> {
    // console.log('BEGIN loadRefereeFromId()');
    if (this.inputRefereeId) { // load the referee
      return this.userService.get(this.inputRefereeId).pipe(
        map((ruser: ResponseWithData<User>) => this.referee = ruser.data),
      );
    }
    return of('');
  }

  private loadReferees(): Observable<any> {
    // console.log('BEGIN loadReferees()');
    this.referees = [];
    if (this.inputRefereeId && this.referee) {
      this.showRefereeSelector = false;
      console.log('loadReferees(): Have a referee', this.referee, this.inputRefereeId);
    } else {
      this.showRefereeSelector = true;
      if (this.competition) {
        console.log('loadRefereesFromCompetition(): Load referees from the competition');
        this.referees = [];
        const refs: User[] = [];
        // load the referee list from the competitions
        const obs: Observable<any>[] = this.competition.referees.map(
          r => this.userService.get(r.refereeId).pipe(
            map((ruser) => {
              if (this.checkReferee(ruser.data)) {
                refs.push(ruser.data);
              }
            }))
        );
        return obs.length === 0 ?  of('') : forkJoin(obs).pipe(
          map(() => {
            this.referees = refs;
          })
        );
      } else {
        this.referees = [];
        this.filteredReferees = [];
      }
    }
    return of('');
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
      if (this.inputRefereeId) {
        // filter by the referee id given as parameter
        this.filteredReferees = this.referees.filter((r) => r.id === this.inputRefereeId);
        console.log('Keep only the referee specified as parameter => ' + this.referees.length + ' => ' + this.filteredReferees.length + ' referees.');
      } else if (this.upgradeLevel) {
        // filter by the upgrade level
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
    this.filteredReferees.sort((r1, r2) => {
      return (r1.firstName+r1.lastName).localeCompare(r2.firstName+r2.lastName);
    })
  }

  private adjustReferee(): any {
    // console.log('BEGIN adjustReferee()');
    if (this.competition && this.inputRefereeId
      && this.competition.referees.filter(r => r.refereeId === this.inputRefereeId).length === 0) {
      // the competition exists but the referee does not belong the competition!
      // => ignore the referee id given by the url
      this.referee = null;
      this.selectedRefereeId = null;
    }
    if ((this.referee && this.filteredReferees.filter((r) => r.id === this.referee.id).length === 0)
        || this.filteredReferees.filter((r) => r.id === this.selectedRefereeId).length === 0) {
      // the current selected referee does not belong the filtered list of referees
      this.referee = null;
      this.selectedRefereeId = null;
    }
    if (!this.selectedRefereeId && !this.referee && this.filteredReferees.length > 0) {
      this.referee = this.filteredReferees[0];
      this.selectedRefereeId = this.referee.id;
    }
    console.log('END adjustReferee() referee=', this.referee, 'this.selectedRefereeId=', this.selectedRefereeId);
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
      this.competitionId = this.competition ? this.competition.id : null;
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
            this.competitionId = this.competition.id;
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
    if (referee.referee.nextRefereeLevel !== 'EURO_3'
      && referee.referee.nextRefereeLevel !== 'EURO_4'
      && referee.referee.nextRefereeLevel !== 'EURO_5'
      ) {
      console.log('Referee ' + referee.shortName + ' is NOT upgradable (wrong nextRefereeLevel: ' + referee.referee.nextRefereeLevel + ')');
        // the referee is not upgradable
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
    if (!this.competitionService.canBeAssessed(this.competition, referee)) {
      console.log('Referee ' + referee.shortName + ' cannot be assessed at the competition');
      return false;
    }
    console.log('Referee ' + referee.shortName + ' is upgradable');
    return true;
  }

  private loadVote(): Observable<any> {
    this.loading = true;
    this.vote = null;
    console.log(`Looking for Vote (competition=${this.competitionId}, day=${this.dateService.date2string(this.day)}, coach=${this.coach.id}, referee=${this.referee})`);
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

  public loadSumary() {
    console.log('loadSumary()');
    if (!this.competitionId || this.referee !== null || !this.day) {
      console.log('loadSumary() do nothing: ' + this.competitionId + ', ' + this.referee + ', ' + this.day);
      return of('');
    }
    this.summary = this.filteredReferees.map(ref => {
      const v: VoteSummary = {
        status : 'LOADING',
        vote: null,
        referee: ref
      };
      this.competitionDayRefereeCoachVoteService.getVote(
        this.competitionId, this.day, this.coach.id, ref.id).pipe(
          map((rvote) => { 
            v.vote = rvote.data;
            v.status = rvote.data ? 'LOADED' : 'NOT_FOUND';
            const notLoading = this.summary.filter(elem => elem.status !== 'LOADING').length
            const loaded = this.summary.filter(elem => elem.status === 'LOADED').length
            this.summaryPercent = notLoading > 0 ? Math.trunc(loaded * 100 / notLoading) : 0;
          })
        ).subscribe();
      return v
    });
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
        refereeId: this.referee.id
      },
      upgradeLevel: this.referee.referee.nextRefereeLevel,
      vote: undefined,
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
      this.showDaySelector = this.competition.days.length > 1;
      this.isCoachOfCompetition = this.competition.refereeCoaches.filter(rc => rc.coachId === this.coach.id).length > 0;
      return this.loadReferees().pipe(
        map(() => {
          this.computeUpgradeLevels();
          this.computeFilteredReferees();
          this.adjustReferee();
          this.computeDay();
        }),
        mergeMap(() => this.loadVote())
      );
    } else {
      return of('');
    }
  }

  onDayChange($event: any) {
    const dateStr = $event.target.value;
    if (dateStr !== this.dateService.date2string(this.day)) {
      this.day = this.dateService.string2date(dateStr, null);
      this.loadVote().subscribe();
    }
  }

  onUpgradeLevelChange() {
    this.computeFilteredReferees();
    if (this.selectedRefereeId ==='all') {
      this.referee = null;  
      this.loadSumary();
    } else {
      this.adjustReferee();
      this.summary = null;
      this.referee = this.referees.find(r => r.id === this.selectedRefereeId);
      this.loadVote().subscribe();
    }
  }
  onRefereeSelected(refereeId: string) {
   this.selectedRefereeId = refereeId;
   this.onRefereeChange();
  }
  onRefereeChange() {
    if (this.selectedRefereeId ==='all') {
      this.referee = null;  
      this.loadSumary();
    } else {
      this.summary = null;
      this.referee = this.referees.find(r => r.id === this.selectedRefereeId);
      this.loadVote().subscribe();
      this.coachingService.getCoachingByReferee(this.selectedRefereeId).subscribe((response: ResponseWithData<Coaching[]>) => {
        this.errorfindCoachings = response.error;
        this.coachings = this.coachingService.sortCoachings(response.data, true).filter(c => c.competitionId === this.competitionId);
      });
      this.assessmentService.getAssessmentByReferee(this.selectedRefereeId).subscribe((response: ResponseWithData<Assessment[]>) => {
        this.errorfindAssessments = response.error;
        this.assessments = this.assessmentService.sortAssessments(response.data, true).filter(c => c.competitionId === this.competitionId);
      });
    }
  }
  previousDay() {
    let idx = this.competition.days.indexOf(this.day);
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
  previousLevel() {
    const beginUpgradeLevel: string = this.upgradeLevel;
    if (!this.upgradeLevel || beginUpgradeLevel === '') {
      this.upgradeLevel = this.upgradeLevels[this.upgradeLevels.length-1];
    } else {
      let idx = this.upgradeLevels.indexOf(this.upgradeLevel);
      if (idx >= 0) {
        idx--;
        if (idx < 0) {
          this.upgradeLevel = undefined;
        } else {
          this.upgradeLevel = this.upgradeLevels[idx];
        }
      }
    }
    this.onUpgradeLevelChange();
  }
  nextLevel() {
    const beginUpgradeLevel: string = this.upgradeLevel;
    if (!this.upgradeLevel || beginUpgradeLevel === '') {
      this.upgradeLevel = this.upgradeLevels[0];
      this.onUpgradeLevelChange();
    } else {
      let idx = this.upgradeLevels.indexOf(this.upgradeLevel);
      if (idx >= 0) {
        idx++;
        if (idx >= this.upgradeLevels.length) {
          this.upgradeLevel = undefined;
        } else {
          this.upgradeLevel = this.upgradeLevels[idx];
        }
        this.onUpgradeLevelChange();
      }
    }
  }
  previousReferee() {
    let idx = this.filteredReferees.findIndex(r => r.id === this.referee.id);
    if (idx >= 0) {
      if (idx === 0) {
        idx = this.filteredReferees.length - 1;
      } else {
        idx = idx - 1;
      }
      this.referee = this.filteredReferees[idx];
      this.selectedRefereeId = this.referee.id;
      this.onRefereeChange();
    }
  }
  nextReferee() {
    let idx = this.filteredReferees.findIndex(r => r.id === this.referee.id);
    // console.log('Current referee at ' + idx + ' over ' + this.referees.length + '. referee id: ' + this.refereeId);
    if (idx >= 0) {
      idx = (idx + 1 ) % this.filteredReferees.length;
      this.referee = this.filteredReferees[idx];
      this.selectedRefereeId = this.referee.id;
      this.onRefereeChange();
    }
  }
  onVoteChange() {
    this.dirty = true;
    this.saveVote();
  }
  saveVote(count = 3) {
    if (!this.vote.vote || this.vote.closed) {
      return;
    }
    if (this.saving && count > 0) {
      setTimeout(() => {
        this.saveVote(count-1);
      }, 1000);
      return;
    }
    this.saving = true;
    this.competitionDayRefereeCoachVoteService.save(this.vote).pipe(
      map((rvote) => {
        this.vote = rvote.data;
        this.saving = false;
        this.dirty = false;
      })
    ).subscribe();
  }
  deleteVote() {
    if (this.saving || !this.vote) {
      return;
    }
    this.loading = true;
    this.vote.dataStatus = 'REMOVED';
    this.competitionDayRefereeCoachVoteService.delete(this.vote.id).pipe(
      mergeMap(() => this.loadVote())
    ).subscribe();
  }

  getRefIdx(coaching: Coaching) {
    return coaching.refereeIds.indexOf(this.referee.id);
  }

  navBack() {
    if (this.inputCompetitionId) {
      this.navController.navigateRoot([`/competition/${this.inputCompetitionId}/home`]);
    } else if (this.inputRefereeId) {
      this.navController.navigateRoot([`/referee/view/${this.inputRefereeId}`]);
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
