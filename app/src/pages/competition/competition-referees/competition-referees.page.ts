import { ConnectedUserService } from './../../../app/service/ConnectedUserService';
import { CurrentApplicationName, User } from './../../../app/model/user';
import { ToolService } from './../../../app/service/ToolService';
import { ResponseWithData } from './../../../app/service/response';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { Observable, of, forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, ModalController } from '@ionic/angular';
import { HelpService } from './../../../app/service/HelpService';
import { DateService } from 'src/app/service/DateService';
import { CompetitionService } from './../../../app/service/CompetitionService';
import { Competition } from './../../../app/model/competition';
import { Component, OnInit } from '@angular/core';
import { SharedWith } from 'src/app/model/common';
import { UserSelectorComponent } from 'src/pages/widget/user-selector-component';
import { UserService } from 'src/app/service/UserService';

@Component({
  selector: 'app-competition-referees',
  templateUrl: './competition-referees.page.html',
  styleUrls: ['./competition-referees.page.scss'],
})
export class CompetitionRefereesPage implements OnInit {

  competition: Competition;
  referees: User[] = [];
  loading = false;
  errors: string[] = [];

  constructor(
    private alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private modalController: ModalController,
    private competitionService: CompetitionService,
    public dateService: DateService,
    private helpService: HelpService,
    private navController: NavController,
    private userService: UserService,
    private route: ActivatedRoute,
    private toolService: ToolService
  ) { }

  ngOnInit() {
    this.helpService.setHelp('competition-edit');
    this.loadCompetition().subscribe();
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
          // the competition has not been found => create it
          this.navController.navigateRoot('/competition/list');
        } else if (!this.competitionService.authorized(this.competition, this.connectedUserService.getCurrentUser().id)) {
          // the coach is not allowed to access to this competition
          this.navController.navigateRoot('/competition/list');
        }
        return this.competition;
      }),
      // load referees
      mergeMap(() => this.loadReferees()),
      catchError((err) => {
        console.log('loadCompetition error: ', err);
        this.loading = false;
        return of(this.competition);
      }),
      map (() => {
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

  async addReferee() {
    const modal = await this.modalController.create({ component: UserSelectorComponent,
      componentProps: { role: 'REFEREE', region: this.connectedUserService.getCurrentUser().region}  });
    modal.onDidDismiss().then( (data) => {
      const sharedWith: SharedWith = data.data as SharedWith;
      if (!sharedWith || !sharedWith.users) {
        return;
      }
      const referee = sharedWith.users[0];
      if (referee) {
        const idx = this.referees.findIndex((ref) => ref.id === referee.id);
        if (idx >= 0) {
          // the referee is already in the list
          return;
        }
        this.referees.push(referee);
        this.competition.referees.push({ refereeShortName: referee.shortName, refereeId: referee.id});
        this.competitionService.save(this.competition).subscribe();
      }
    });
    return await modal.present();
  }

  onDeleteAll() {
    this.alertCtrl.create({
      message: 'Do you reaaly want to delete all the referes from this competition?',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Delete All',
          handler: () => {
            this.referees = [];
            this.competition.referees = [];
            this.competitionService.save(this.competition).subscribe();
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }
  onImport() {
    // Ask a ist of referee short names
    this.alertCtrl.create({
      message: 'Paste a list of referee short names (use space as separator)',
      inputs: [{ type: 'text', label: 'Short names', value: '' }],
      buttons: [
        'Cancel',
        {
          text: 'Add all',
          handler: (data: string[]) => {
            console.log('Data:', data[0]);
            this.importRefereesByShortNames(data[0].split(' '));
          }
        }]
    }).then( (alert) => alert.present());
  }

  importRefereesByShortNames(refShortNames: string[]) {
    const obs: Observable<ResponseWithData<User[]>>[] = [];
    let addedRefereeNumber = 0;
    const unknownShortNames: string[] = [];
    let alreadyAddNames = 0;
    refShortNames.forEach((refShortName) => {
      console.log('Searching referee ', refShortName);
      obs.push(
        this.userService.findByShortName(refShortName).pipe(
          map((rref) => {
            if (rref.data && rref.data.length) {
              rref.data.forEach(referee => {
                const existRef = this.referees.find( (ref) => ref.id === referee.id);
                if (!existRef) {
                  addedRefereeNumber ++;
                  this.referees.push(referee);
                  this.competition.referees.push({ refereeShortName: referee.shortName, refereeId: referee.id});
                  console.log('Referee ', refShortName, ' added.');
                } else {
                  alreadyAddNames ++;
                  console.log('Referee ', refShortName, ' already belongd the compeetition.');
                }
              });
            } else {
              unknownShortNames.push(refShortName);
              console.log('Referee ', refShortName, ' does not exist.');
            }
            return rref;
          })
        )
      );
    });
    if (obs.length) {
      forkJoin(obs).pipe(
        mergeMap(() => this.competitionService.save(this.competition)),
        map(() => {
          this.refereesImported(refShortNames.length, addedRefereeNumber, unknownShortNames, alreadyAddNames);
        })
      ).subscribe();
    }
  }

  refereesImported(givenRefNames: number, addedRefereeNumber: number, unknownShortNames: string[], alreadyAddNames: number) {
    console.log('Import finished.');
    this.alertCtrl.create({
      message: `Given ${givenRefNames} names, ${addedRefereeNumber} have been imported,`
        + (alreadyAddNames ? `${alreadyAddNames} already in` : '')
        + (unknownShortNames.length ? `${unknownShortNames.length} names are unknown: ${unknownShortNames.join(', ')}` : '')
        + '.',
      buttons: [{ text: 'Ok', role: 'cancel'}]
    }).then( (alert) => alert.present() );
  }

  deleteReferee(referee: User) {
    this.alertCtrl.create({
      message: 'Do you reaaly want to delete the refere ' + referee.shortName + ' from this competition?',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Delete',
          handler: () => {
            // remove the referee from the competition object
            this.toolService.deleteFromArrayById(this.competition.referees, referee.id, 'refereeId');
            // remove the referee from the local list
            this.toolService.deleteFromArrayById(this.referees, referee.id);
            this.competitionService.save(this.competition).subscribe();
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }
  isUpgradableReferee(referee: User) {
    return  referee.accountStatus === 'ACTIVE'
      && referee.applications.filter(ar => ar.role === 'REFEREE' && ar.name === CurrentApplicationName).length > 0;
  }
  back() {
    if (this.competition.id) {
      this.navController.navigateRoot(`/competition/${this.competition.id}/home`);
    } else {
      this.navController.navigateRoot(`/competition/list`);
    }
  }

  exportReferees() {
    const content = this.userService.listToCSV(this.referees);
    const oMyBlob = new Blob([content], {type : 'text/csv'});
    const url = URL.createObjectURL(oMyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CoachReferee_export_referees_${this.competition.name}_${this.dateService.date2string(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
}
