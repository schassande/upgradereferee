import { UserService } from './../../../app/service/UserService';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { forkJoin, Observable, of } from 'rxjs';
import { ConnectedUserService } from './../../../app/service/ConnectedUserService';
import { CompetitionService } from './../../../app/service/CompetitionService';
import { NavController, AlertController, LoadingController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { HelpService } from './../../../app/service/HelpService';
import { DateService } from './../../../app/service/DateService';
import { Competition } from './../../../app/model/competition';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CurrentApplicationName, User } from 'src/app/model/user';
import { ResponseWithData } from 'src/app/service/response';

@Component({
  selector: 'app-competition-home',
  templateUrl: './competition-home.page.html',
  styleUrls: ['./competition-home.page.scss'],
})
export class CompetitionHomePage implements OnInit {

  competition: Competition;
  referees: User[] = [];
  loading = false;
  owner: string;
  canEdit = false;
  user: User;


  constructor(
    private alertCtrl: AlertController,
    private changeDetectorRef: ChangeDetectorRef,
    private connectedUserService: ConnectedUserService,
    private competitionService: CompetitionService,
    public dateService: DateService,
    private helpService: HelpService,
    private loadingController: LoadingController,
    private navController: NavController,
    private route: ActivatedRoute,
    public userService: UserService
  ) { }

  ngOnInit() {
    this.user = this.connectedUserService.getCurrentUser();
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
        return this.competition;
      }),
      mergeMap(() => this.loadReferees()),
      // load competition owner info
      mergeMap( () => {
        this.owner = '';
        console.log('competition.ownerId=' + this.competition.ownerId);
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
        this.canEdit = this.competition.ownerId === this.connectedUserService.getCurrentUser().id;
        this.loading = false;
        return this.competition;
      })
    );
  }
  private loadReferees(): Observable<User[]> {
    console.log('loadReferees');
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
  isRefereeCoach() {
    return this.connectedUserService.isRefereeCoach();
  }
  isAdmin() {
    return this.connectedUserService.isAdmin();
  }
}
