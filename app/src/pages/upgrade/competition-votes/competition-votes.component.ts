import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Params } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { Competition } from 'src/app/model/competition';
import { CompetitionDayPanelVote, CompetitionDayRefereeCoachVote } from 'src/app/model/upgrade';
import { CurrentApplicationName, RefereeLevel, User } from 'src/app/model/user';
import { CompetitionDayPanelVoteService } from 'src/app/service/CompetitionDayPanelVoteService';
import { CompetitionDayRefereeCoachVoteService } from 'src/app/service/CompetitionDayRefereeCoachVoteService';
import { CompetitionService } from 'src/app/service/CompetitionService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { ResponseWithData } from 'src/app/service/response';
import { ToolService } from 'src/app/service/ToolService';
import { UserService } from 'src/app/service/UserService';
import { RefereeUpgradeService } from 'src/app/service/RefereeUpgradeService';

@Component({
  selector: 'app-competition-votes',
  templateUrl: './competition-votes.component.html',
  styleUrls: ['./competition-votes.component.scss'],
})
export class CompetitionVotesComponent implements OnInit {

  /** The flag of data loading */
  loading = true;
  dirty = false;
  /** Id of the selected competition. This id can be given in parameter of the page. Can be null */
  competitionId: string;
  /** Competition object selected. Can be null */
  competition: Competition;
  /** The day of the competition */
  day: Date;
  /** The coach using this page */
  coach: User;
  /** the list of the refere coaches of the competition */
  coaches: User[] = [];
  /** The selected referee level for upgrade */
  upgradeLevel: RefereeLevel;
  /** The list of the upgrade level to examin */
  upgradeLevels: RefereeLevel[];
  /** Id of the selected referee. This id can be given in parameter of the page. Can be null */
  refereeId: string;
  /** User object selected representing the referee. Can be null */
  referee: User;
  /** List of the referees if the page is not dedicated to a referee. Can be null */
  referees: User[];
  /** List of the referees filtered by upgrade level if the page is not dedicated to a referee. Can be null */
  filteredReferees: User[];
  isRefereeCoachOfCompetition = false;
  isPanelDirector = false;
  isAdmin = false;
  canVote = false;

  ///////////////////////////////////////////
  // FIELD USED WHEN A REFEREE IS SELECTED //
  ///////////////////////////////////////////

  /** The panel for the selected referee */
  vote: CompetitionDayPanelVote;
  /** The list of the coach vote about the selected referee */
  coachVotes: CompetitionDayRefereeCoachVote[] = [];
  /** The number of decision 'No' for the selected referee */
  totalNo = 0;
  /** The number of decision 'Abstain' for the selected referee */
  totalAbstain = 0;
  /** The number of decision 'Yes' for the selected referee */
  totalYes = 0;


  ////////////////////////////////////////////
  // FIELD USED WHEN NO REFEREE IS SELECTED //
  ////////////////////////////////////////////

  /**
   * The list of the panel vote for the filtered list of the referees.
   * Used when no referee is selected
   */
  panelVotes: CompetitionDayPanelVote[] = [];
  /**
   * Flag indicating if among the 'panelVotes' there is a non closed vote.
   * Used when no referee is selected
   */
  hasOpenVote = false;
  /**
   * The sub list of the filtered referees without a panel vote.
   * Used when no referee is selected
   */
  refereesWithoutPanelVote: User[] = [];


  constructor(
    private activatedRoute: ActivatedRoute,
    private alertCtrl: AlertController,
    private competitionDayRefereeCoachVoteService: CompetitionDayRefereeCoachVoteService,
    private competitionDayPanelVoteService: CompetitionDayPanelVoteService,
    private competitionService: CompetitionService,
    private connectedUserService: ConnectedUserService,
    public dateService: DateService,
    private navController: NavController,
    private toolService: ToolService,
    private refereeUpgradeService: RefereeUpgradeService,
    private userService: UserService,
  ) { }

  ngOnInit() {
    this.loading = true;
    this.coach = this.connectedUserService.getCurrentUser();
    this.isAdmin = this.connectedUserService.isAdmin();
    this.activatedRoute.paramMap.pipe(
      map((params: ParamMap) => {
        this.competitionId = params.get('id');
        console.log('PARAM competitionId=' + this.competitionId);
      }),
      mergeMap(() => this.loadCompetitionFromId()),
      mergeMap(() => this.loadRefereesFromCompetition()),
      map(() => this.computeUpgradeLevels()),
      map(() => this.computeFilteredReferees()),
      map(() => this.selectReferee()),
      map(() => this.selectDay()),
      map(() => this.loadAllVotes()),
      catchError(err => {
        console.error(err);
        this.navBack();
        return of(err);
      }),
      map(() => this.loading = false)
    ).subscribe();
  }

  private loadCompetitionFromId(): Observable<any> {
    return this.competitionService.get(this.competitionId).pipe(
      map((rcompetition: ResponseWithData<Competition>) => {
        this.competition = rcompetition.data;
        this.isRefereeCoachOfCompetition = this.competition
          && this.competition.refereeCoaches.filter(rc => rc.coachId === this.coach.id).length > 0;
        this.isPanelDirector = this.competition && this.competition.refereePanelDirectorId === this.coach.id;
        if (!this.competition) {
          return throwError('Unknown competition ' + this.competitionId);
        }
        if (this.competition.refereePanelDirectorId !== this.coach.id) {
          return throwError('You are not the director of the competition.');
        }
      })
    );
  }
  private loadRefereesFromCompetition(): Observable<any> {
    console.log('loadReferees(): Load referees from the competition');
    this.referees = [];
    // load the referee list from the competitions
    const obs: Observable<any>[] = this.competition.referees.map(
      referee => this.userService.get(referee.refereeId).pipe(
        map((ruser) => {
          if (this.checkReferee(ruser.data)) {
            console.log('Referee ' + ruser.data.shortName + ' is upgradable');
            this.referees.push(ruser.data);
          } else {
            console.log('Referee ' + ruser.data.shortName + ' is NOT upgradable');
          }
        }))
    );
    return obs.length === 0 ? of('') : forkJoin(obs);
  }

  private computeUpgradeLevels() {
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

  private computeFilteredReferees() {
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

  private selectReferee() {
    if (this.filteredReferees.length > 0 && this.refereeId) {
        this.referee = this.filteredReferees.find(r => r.id === this.refereeId);
    } else {
      this.referee = null;
    }
    this.refereeId = this.referee ? this.referee.id : '-';
  }

  private checkReferee(referee: User): boolean {
    if (!referee) {
      return false;
    }
    if (referee.accountStatus !== 'ACTIVE') {
      // the account of the referee is not validated
      return false;
    }
    if (referee.referee.nextRefereeLevel !== 'EURO_3'
      && referee.referee.nextRefereeLevel !== 'EURO_4'
      && referee.referee.nextRefereeLevel !== 'EURO_5'
      ) {
      // the referee is not upgradable
      return false;
    }
    if (referee.applications.findIndex((ar) => ar.role === 'REFEREE' && ar.name === CurrentApplicationName) < 0) {
      // the referee is not a registered account as Referee
      return false;
    }
    if (!this.userService.canVote(referee, this.coach) && !this.connectedUserService.isAdmin() && !this.isPanelDirector) {
      return false;
    }
    return true;
  }

  private selectDay() {
    // check the day field
    this.day = this.competition.days.find(day => this.dateService.compareDate(day, new Date()) === 0);
    if (!this.day) {
      this.day = this.competition.days[0];
    }
  }

  private loadAllVotes() {
    if (this.referee) {
      this.loadCoachVotes().pipe(
        map(() => {
          this.totalYes = 0;
          this.totalAbstain = 0;
          this.totalNo = 0;
          this.coachVotes.forEach(v => {
            switch (v.vote){
              case 'Yes': this.totalYes++; break;
              case 'Abstein': this.totalAbstain++; break;
              case 'Abstain': this.totalAbstain++; break;
              case 'No': this.totalNo++; break;
            }
          });
        }),
        mergeMap(() => this.loadPanelVote())
      ).subscribe();
    } else {
      this.loadPanelVotesOfReferees().pipe(
        map(() => this.computeMissingPanelVotes())
      ).subscribe();
    }
  }

  private loadPanelVote(): Observable<any> {
    this.loading = true;
    console.log(`Looking for Panel Vote(competition=${this.competitionId}, day=${this.dateService.date2string(this.day)}, referee=${this.refereeId})`);
    if (this.competitionId && this.refereeId && this.day) {
      return this.competitionDayPanelVoteService.getVote(this.competitionId, this.day, this.refereeId).pipe(
          map(rvote => this.vote = rvote.data),
          map(() => {
            this.canVote = this.competition.refereePanelDirectorId === this.coach.id || this.isAdmin;
            if (this.vote) {
              console.log(`Existing Vote: ${this.vote.id}`);
            } else if (this.canVote) {
              this.createPanelVote();
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

  private createPanelVote() {
    console.log('createVote()');
    this.vote = {
      id: '',
      dataStatus: 'NEW',
      creationDate: new Date(),
      lastUpdate: new Date(),
      version: 0,
      competitionRef: { competitionId: this.competitionId, competitionName: this.competition.name },
      competitionCategory: this.competition.category,
      day: this.dateService.to00h00(this.day),
      referee: {
        refereeShortName: this.referee.shortName,
        refereeId: this.refereeId
      },
      upgradeLevel: this.referee.referee.nextRefereeLevel,
      vote: 'Abstain',
      commentForCoach: '-',
      commentForReferee: '-',
      closed: false,
      coaches: this.competition.refereeCoaches,
      yesCoaches: this.coachVotes.filter(cv => cv.vote === 'Yes').map(cv => cv.coach),
      isMultiDayCompetition: this.competition.days.length > 1
    };
    // compute vote from total
    if ((this.totalYes - this.totalNo) > 0) {
      this.vote.vote = 'Yes';
    } else if ((this.totalYes - this.totalNo) < 0) {
      this.vote.vote = 'No';
    } else {
      this.vote.vote = 'Abstain';
    }
  }

  loadCoachVotes(): Observable<any> {
    this.loading = true;
    const coachVotesL = [];
    console.log(`Looking for Coach Votes (competition=${this.competitionId}, day=${this.dateService.date2string(this.day)}, referee=${this.refereeId})`);
    if (this.competition && this.refereeId && this.day) {
      return forkJoin(this.competition.refereeCoaches.map(
        rc => this.competitionDayRefereeCoachVoteService.getVote(this.competitionId, this.day, rc.coachId, this.refereeId).pipe(
          map(rcvote => {
            if (rcvote.data) {
              coachVotesL.push(rcvote.data);
              console.log(`Coach ${rc.coachShortName} has a vote: ${rcvote.data.id}`);
            } else {
              console.log(`No vote by the coach ${rc.coachShortName}`);
            }
          }),
        )
      )).pipe(map(() => {
        this.loading = false;
        this.dirty = false;
        this.coachVotes = coachVotesL;
      }));
    } else {
      this.loading = false;
      this.dirty = false;
      return of('');
    }
  }

  private loadPanelVotesOfReferees(): Observable<any> {
    this.loading = true;
    let hasOpenVoteL = false;
    const panelVotesL = [];
    console.log(`Looking for Panel Votes for filtered referees (competition=${this.competitionId}, day=${this.dateService.date2string(this.day)}, referees=${this.filteredReferees.length})`);
    if (this.competition && this.day) {
      return forkJoin(this.filteredReferees.map(
        ref => this.competitionDayPanelVoteService.getVote(this.competitionId, this.day, ref.id).pipe(
          map(rpvote => {
            if (rpvote.data) {
              panelVotesL.push(rpvote.data);
              console.log(`Referee ${ref.shortName} has a panel vote: ${rpvote.data.id}`);
              hasOpenVoteL = hasOpenVoteL || !rpvote.data.closed;
            } else {
              console.log(`No panel vote for the referee ${ref.shortName}`);
            }
          }),
        )
      )).pipe(map(() => {
        this.loading = false;
        this.dirty = false;
        this.hasOpenVote = hasOpenVoteL;
        this.panelVotes = panelVotesL;
      }));
    } else {
      this.loading = false;
      this.dirty = false;
      return of('');
    }
  }

  private computeMissingPanelVotes() {
    this.refereesWithoutPanelVote = this.filteredReferees.filter(ref => {
      return this.panelVotes.filter(pv => pv.referee.refereeId === ref.id).length === 0;
    });
  }

  showPanelVote(refereeId: string) {
    this.refereeId = refereeId;
    this.onRefereeChange();
  }

  onDayChange($event: any) {
    const dateStr = $event.target.value;
    if (dateStr !== this.dateService.date2string(this.day)) {
      console.log('onDayChange()', dateStr);
      this.day = this.dateService.string2date(dateStr, null);
      this.loadAllVotes();
    }
  }

  onUpgradeLevelChange() {
    console.log('onUpgradeLevelChange()');
    this.computeFilteredReferees();
    this.selectReferee();
    this.loadAllVotes();
  }

  onRefereeChange() {
    console.log('onRefereeChange()', this.refereeId, this.referee);
    this.selectReferee();
    this.loadAllVotes();
  }
  previousReferee() {
    if (this.refereeId === '-') {
      this.referee = this.filteredReferees[this.filteredReferees.length - 1];
      this.refereeId = this.referee.id;
      this.onRefereeChange();
    } else {
      let idx = this.filteredReferees.findIndex(r => r.id === this.refereeId);
      if (idx >= 0) {
        if (idx === 0) {
          idx = this.filteredReferees.length - 1;
        } else {
          idx = idx - 1;
        }
        this.referee = this.filteredReferees[idx];
        this.refereeId = this.referee.id;
        this.onRefereeChange();
      }
    }
  }
  nextReferee() {
    if (this.refereeId === '-') {
      this.referee = this.filteredReferees[0];
      this.refereeId = this.referee.id;
      this.onRefereeChange();
    } else {
      let idx = this.filteredReferees.findIndex(r => r.id === this.refereeId);
      // console.log('Current referee at ' + idx + ' over ' + this.referees.length + '. referee id: ' + this.refereeId);
      if (idx >= 0) {
        idx = (idx + 1 ) % this.filteredReferees.length;
        this.referee = this.filteredReferees[idx];
        this.refereeId = this.referee.id;
        // console.log('New referee selected at ' + idx + ' over ' + this.referees.length + '. referee id: ' + this.refereeId);
        this.onRefereeChange();
      }
    }
  }

  onVoteChange() {
    console.log('onVoteChange(): ' +  this.dirty);
    if (!this.toolService.isValidString(this.vote.commentForCoach)) {
      this.vote.commentForCoach = '-';
    }
    if (!this.toolService.isValidString(this.vote.commentForReferee)) {
      this.vote.commentForReferee = '-';
    }
    this.dirty = true;
  }

  savePanelVote() {
    this.competitionDayPanelVoteService.save(this.vote).pipe(
      map((rvote) => {
        this.vote = rvote.data;
        this.dirty = false;
      })
    ).subscribe();
  }

  closePanelVote(pvote: CompetitionDayPanelVote) {
    this.alertCtrl.create({
      message: 'Do you really want to close the panel vote for the referee ' + pvote.referee.refereeShortName
        + '?<br>Referee coach decisions and the panel decision cannot be changed later.',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Close votes',
          handler: () => {
            this.performClosePanelVote(pvote);
          }
        }
      ]
    }).then(alert => alert.present() );
  }

  closeAll() {
    this.alertCtrl.create({
      message: 'Do you really want to close the panel vote for all the selected referees?<br>Decision will be published to the referee.',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Close votes',
          handler: () => {
            this.panelVotes.forEach((pv) => {
              if (!pv.closed) {
                this.performClosePanelVote(pv);
              }
            });
          }
        }
      ]
    }).then(alert => alert.present() );
  }

  private performClosePanelVote(pvote: CompetitionDayPanelVote) {
    // close the vote of the referee coaches for the day of the competition
    forkJoin(this.competition.refereeCoaches.map(
      rc => this.competitionDayRefereeCoachVoteService.getVote(
          pvote.competitionRef.competitionId, pvote.day, rc.coachId, pvote.referee.refereeId).pipe(
        mergeMap((rvote) => {
          if (rvote.data) {
            if (!rvote.data.closed) {
              rvote.data.closed = true;
              console.log('Closing coach vote ' + rvote.data.id);
              return this.competitionDayRefereeCoachVoteService.save(rvote.data);
            } else {
              console.log('Coach vote ' + rvote.data.id + ' already closed.');
            }
          } else {
            console.warn('No coach vote for the (competition=' + pvote.competitionRef.competitionId
              + ', day=' + this.dateService.date2string(pvote.day) + ', coach=' + rc.coachId
              + ', refereee=' + pvote.referee.refereeId + ') !!!!');
          }
          return of('');
        })
      )
    )).pipe(
      mergeMap(() => {
        // close the vote of the panel for the day of the competition
        if (!pvote.closed) {
          console.log('Closing panel vote ' + pvote.id);
          pvote.closed = true;
          return this.competitionDayPanelVoteService.save(pvote);
        } else {
          console.log('Panel vote ' + pvote.id + ' already closed.');
          return of('');
        }
      }),
      map(() => this.computeHasOpen()), // in order to hide the close button
      map(() => this.computeUpgrade(pvote))
    ).subscribe();
  }
  computeUpgrade(pvote: CompetitionDayPanelVote) {
    // Call a function to compute the referee upgrade on server side
    this.refereeUpgradeService.computeRefereeUpgrade(pvote.referee.refereeId, pvote.day)
      .subscribe(
        data => console.log('computeRefereeUpgrade Ok', data),
        err => console.log('computeRefereeUpgrade Error', err));
  }
  private computeHasOpen() {
    this.hasOpenVote = this.panelVotes.filter(pv => !pv.closed).length > 0;
  }

  navBack() {
    this.navController.navigateRoot([`/competition/${this.competitionId}/home`]);
  }

  onSwipe($event) {
    if ($event.direction === 4) {
      this.navBack();
    }
  }
}
