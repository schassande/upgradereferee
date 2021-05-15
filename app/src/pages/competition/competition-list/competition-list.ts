import { ConnectedUserService } from './../../../app/service/ConnectedUserService';
import { HelpService } from './../../../app/service/HelpService';
import { ResponseWithData } from './../../../app/service/response';
import { Competition } from './../../../app/model/competition';
import { NavController, AlertController, LoadingController } from '@ionic/angular';
import { CompetitionService } from './../../../app/service/CompetitionService';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DateService } from 'src/app/service/DateService';
import { CurrentApplicationName, User } from 'src/app/model/user';
import { DataRegion } from 'src/app/model/common';
import { CursorError } from '@angular/compiler/src/ml_parser/lexer';

/**
 * Generated class for the CompetitionListPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
  selector: 'app-page-competition-list',
  templateUrl: 'competition-list.html',
})
export class CompetitionListPage implements OnInit {

  competitions: Competition[];
  error;
  searchInput: string;
  loading = false;
  canCreate = false;
  currentUser: User;
  region: DataRegion = 'Europe';
  attendedCompetition = false;

  constructor(
    private alertCtrl: AlertController,
    private competitionService: CompetitionService,
    private connectedUserService: ConnectedUserService,
    private changeDetectorRef: ChangeDetectorRef,
    public dateService: DateService,
    private loadingController: LoadingController,
    private helpService: HelpService,
    private navController: NavController
    ) {
  }

  ngOnInit() {
    this.helpService.setHelp('competition-list');
    this.currentUser = this.connectedUserService.getCurrentUser();
    this.region = this.currentUser.region;
    this.canCreate = this.connectedUserService.isRefereeCoach() || this.connectedUserService.isAdmin();
    setTimeout(() => {
      this.doRefresh(null);
    }, 200);
  }

  doRefresh(event) {
    this.searchCompetition(false, event);
  }

  onSearchBarInput() {
    this.doRefresh(null);
  }

  private searchCompetition(forceServer: boolean = false, event: any = null) {
    this.loading = true;
    // console.log('searchCompetition(' + this.searchInput + ')');
    this.competitionService.searchCompetitions(this.searchInput, forceServer ? 'server' : 'default', this.region)
      .subscribe((response: ResponseWithData<Competition[]>) => {
        this.competitions = this.competitionService.sortCompetitions(this.filterAttendedCompetitions(response.data), true);
        this.loading = false;
        if (event) {
          event.target.complete();
        }
        this.error = response.error;
        if (this.error) {
          console.log('searchCompetition(' + this.searchInput + ') error=' + this.error);
        }
        this.changeDetectorRef.detectChanges();
      });
  }
  private filterAttendedCompetitions(cs: Competition[]): Competition[] {
    if (!cs || !this.attendedCompetition) {
      return cs;
    }
    const isReferee = this.connectedUserService.isReferee();
    const isRefereeCoach = this.connectedUserService.isRefereeCoach();
    return  cs.filter(c =>
      (isReferee && c.referees.filter(r => r.refereeId === this.currentUser.id).length > 0)
      || (isRefereeCoach && c.refereeCoaches.filter(r => r.coachId === this.currentUser.id).length > 0)
    );
  }
  newCompetition() {
    this.navController.navigateRoot(`/competition/-1/edit`);
  }

  competitionSelected(competition: Competition) {
    this.navController.navigateRoot(`/competition/${competition.id}/home`);
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
            this.competitionService.delete(competition.id).subscribe(() => {
              loading.dismiss();
              this.searchCompetition();
            },
            () => loading.dismiss());
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }

  getCompetitionDate(competition: Competition) {
    return this.dateService.date2string(competition.date);
  }

  onSwipe(event) {
    // console.log('onSwipe', event);
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
