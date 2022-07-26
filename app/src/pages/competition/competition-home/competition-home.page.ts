import { UserService } from 'src/app/service/UserService';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { forkJoin, Observable, of } from 'rxjs';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { CompetitionService, VoteAnalysis } from 'src/app/service/CompetitionService';
import { NavController, AlertController, LoadingController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { HelpService } from 'src/app/service/HelpService';
import { DateService } from 'src/app/service/DateService';
import { Competition } from 'src/app/model/competition';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CurrentApplicationName, User } from 'src/app/model/user';
import { ResponseWithData } from 'src/app/service/response';
import { environment } from 'src/environments/environment';
import * as moment from 'moment';
import { CompetitionDayRefereeCoachVoteService } from 'src/app/service/CompetitionDayRefereeCoachVoteService';
import { CompetitionDayPanelVoteService } from 'src/app/service/CompetitionDayPanelVoteService';
import { RefereeUpgradeService } from 'src/app/service/RefereeUpgradeService';
import { downloadContentAsFile } from 'src/pages/widget/file-downloader';

@Component({
  selector: 'app-competition-home',
  templateUrl: './competition-home.page.html',
  styleUrls: ['./competition-home.page.scss'],
})
export class CompetitionHomePage implements OnInit {

  competition: Competition;
  referees: User[] = [];
  refereeCoaches: User[] = [];
  loading = false;
  owner: string;
  canEdit = false;
  user: User;
  isAdmin = false;
  isDirector = false;
  isRefereeCoachOfCompetition = false;
  env = environment;
  downloading = false;
  coachVoteRatio = 0.0;
  panelVoteRatio = 0.0;
  voteAnalysis: VoteAnalysis = null;
  upgradable = false;

  constructor(
    private alertCtrl: AlertController,
    private changeDetectorRef: ChangeDetectorRef,
    private connectedUserService: ConnectedUserService,
    private competitionService: CompetitionService,
    private competitionDayRefereeCoachVoteService: CompetitionDayRefereeCoachVoteService,
    private competitionDayPanelVoteService: CompetitionDayPanelVoteService,
    public dateService: DateService,
    private helpService: HelpService,
    private loadingController: LoadingController,
    private navController: NavController,
    private refereeUpgradeService: RefereeUpgradeService,
    private route: ActivatedRoute,
    public userService: UserService
  ) { }

  ngOnInit() {
    this.user = this.connectedUserService.getCurrentUser();
    this.isAdmin = this.connectedUserService.isAdmin();
    this.helpService.setHelp('competition-list');
    this.loadCompetition().subscribe(() => {
      this.changeDetectorRef.detectChanges();
    });
  }

  private loadCompetition(): Observable<Competition> {
    this.loading = true;
    // load id from url path
    return this.route.paramMap.pipe(
      // load competition from the id
      mergeMap( (paramMap) => this.competitionService.get(paramMap.get('id'))),
      map( (rcompetition) => {
        this.competition = rcompetition.data;
        if (!this.competition) {
          // the competition has not been found => back to list of competition
          this.navController.navigateRoot('/competition/list');
        }
        this.isRefereeCoachOfCompetition = this.connectedUserService.isRefereeCoach()
          && this.competition.refereeCoaches.filter(rc => rc.coachId === this.connectedUserService.getCurrentUser().id).length > 0;
        this.isDirector = this.competition.refereePanelDirectorId === this.connectedUserService.getCurrentUser().id;
        this.upgradable = this.competitionService.valueIn(this.competition.category, 'C3', 'C4', 'C5')
          || this.competitionService.valueIn(this.competition.categorySenior, 'C3', 'C4', 'C5');
        return this.competition;
      }),
      mergeMap(() => this.loadReferees()),
      mergeMap(() => this.loadRefereeCoaches()),
      // load competition owner info
      mergeMap( () => {
        this.owner = '';
        if (this.competition && this.competition.ownerId) {
          return this.userService.get(this.competition.ownerId).pipe(
            map( (ruser) => {
              if (ruser.data) {
                this.owner = ruser.data.firstName + ' ' + ruser.data.lastName + '(' + ruser.data.shortName + ')';
              }
              return this.owner;
            })
          );
        }
        return of(this.owner);
      }),
      catchError((err) => {
        console.log('loadCompetition error: ', err);
        this.loading = false;
        return of(this.competition);
      }),
      map (() => {
        this.canEdit = this.isAdmin || this.competition.ownerId === this.connectedUserService.getCurrentUser().id;
        this.loading = false;
        this.computeCoachVoteRatio();
        return this.competition;
      })
    );
  }

  private async computeCoachVoteRatio() {
    if (this.upgradable) {
      const coachVotes = await this.competitionDayRefereeCoachVoteService.findByCompetition(this.competition.id).toPromise();
      const panelVotes = await this.competitionDayPanelVoteService.findByCompetition(this.competition.id).toPromise();
      const upgrades = await this.refereeUpgradeService.findByCompetition(this.competition.id).toPromise();
      this.voteAnalysis = this.competitionService.computeVoteAnalysis(
        this.competition, this.referees, this.refereeCoaches, coachVotes.data, panelVotes.data, upgrades.data);
      // To log analysis: JSON.stringify(this.voteAnalysis, null, 2));
    }
  }

  private loadReferees(): Observable<User[]> {
    if (!this.competition.referees || this.competition.referees.length === 0) {
      this.referees = [];
      return of(this.referees);
    }
    const obs: Observable<User>[] = [];
    const newReferees: User[] = [];
    this.competition.referees.forEach((ref) => {
      if (ref.refereeId !== null) {
        obs.push(this.userService.get(ref.refereeId).pipe(
              map((res: ResponseWithData<User>) => {
                  if (res.data) {
                    newReferees.push(res.data);
                  } else {
                    this.competition.referees = this.competition.referees.filter(r => r.refereeId !== ref.refereeId);
                    this.competitionService.save(this.competition).subscribe();
                    console.error('Referee ' + ref.refereeId + ' does not exist !');
                  }
                  return res.data;
              }))
            );
      } else {
        console.log('null refereeId, ref.refereeShortName', ref.refereeShortName);
      }
    });
    if (obs.length === 0) {
      this.referees = [];
      return of(this.referees);
    }
    return forkJoin(obs).pipe(
      map(() => {
        this.referees = newReferees;
        return this.referees;
      })
    );
  }
  private loadRefereeCoaches(): Observable<User[]> {
    if (!this.competition.refereeCoaches || this.competition.refereeCoaches.length === 0) {
      this.refereeCoaches = [];
      return of(this.refereeCoaches);
    }
    const obs: Observable<User>[] = [];
    const newRefereeCoaches: User[] = [];
    this.competition.refereeCoaches.forEach((ref) => {
      if (ref.coachId !== null) {
        obs.push(this.userService.get(ref.coachId).pipe(
              map((res: ResponseWithData<User>) => {
                  if (res.data) {
                    newRefereeCoaches.push(res.data);
                  } else {
                      console.error('RefereeCoach ' + ref.coachId + ' does not exist !');
                  }
                  return res.data;
              }))
            );
      } else {
        console.log('null coachId, ref.refereeShortName=', ref.coachShortName);
      }
    });
    if (obs.length === 0) {
      this.refereeCoaches = [];
      return of(this.refereeCoaches);
    }
    return forkJoin(obs).pipe(
      map(() => {
        this.refereeCoaches = newRefereeCoaches;
        return this.refereeCoaches;
      })
    );
  }
  isUpgradableReferee(referee: User) {
    return referee.applications.filter(ar => ar.role === 'REFEREE' && ar.name === CurrentApplicationName).length > 0
      && referee.accountStatus === 'ACTIVE'
      && referee.referee.nextRefereeLevel;
  }
  onDelete() {
    this.deleteCompetition(this.competition);
  }
  deleteCompetition(competition: Competition) {
    this.alertCtrl.create({
      message: 'Do you really want to delete the competition ' + competition.name + '-' + competition.year + '?',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Delete',
          handler: async () => {
            const loading = await this.loadingController.create({ message: 'Deleting competition ...'});
            loading.present();
            this.competitionService.delete(competition.id)
              .subscribe(() => {
                loading.dismiss();
                this.navController.navigateRoot('/competition/list');
              },
              () => loading.dismiss());
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }

  exportRefereeUpgradeStatus() {
    const dayBefore = moment(this.competition.days[0]).add(-1, 'day').toDate();
    const inputs: any[] = [
      { name: 'radio-1', type: 'radio', label: 'End of ' + this.dateService.date2string(dayBefore), value: dayBefore },
      ...this.competition.days.map((day, idx) => {
        return { name: 'radio' + idx, type: 'radio', label: 'End of ' + this.dateService.date2string(day), value: day };
      })
    ];
    this.alertCtrl.create({
      message: 'Which end of day do you want the status analysis?',
      inputs,
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Analysis',
          handler: (day) => {
            this.exportRefereeUpgradeStatusAtDay(day ? day : this.competition.days[0]);
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }
  exportRefereeUpgradeStatusAtDay(day: Date) {
    this.downloading = true;
    this.competitionService.getRefereeUpgradeStatusAsCsv(this.competition, day).subscribe(
      (content) => {
        downloadContentAsFile(content, `Referees_Upgrade_status_${this.dateService.date2string(day)}.csv`, 'text/csv');
        this.downloading = false;
      },
      (err) => {
        console.error(err);
        this.downloading = false;
      }
    );
  }
  switchCompleted() {
    this.competition.completed = !this.competition.completed;
    this.competitionService.save(this.competition).subscribe();
  }
}
