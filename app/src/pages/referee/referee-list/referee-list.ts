import { HelpService } from './../../../app/service/HelpService';
import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, NavController } from '@ionic/angular';
import { ResponseWithData } from '../../../app/service/response';
import { CONSTANTES, Referee, RefereeLevel, User } from '../../../app/model/user';
import { UserSearchCriteria, UserService } from 'src/app/service/UserService';
import { DataRegion } from 'src/app/model/common';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { RefereeUpgradeService } from 'src/app/service/RefereeUpgradeService';
import { downloadContentAsFile } from 'src/pages/widget/file-downloader';
import { CompetitionService } from 'src/app/service/CompetitionService';
import { ToolService } from 'src/app/service/ToolService';

/**
 * Generated class for the RefereeListPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
  selector: 'app-page-referee-list',
  templateUrl: 'referee-list.html',
})
export class RefereeListPage implements OnInit {

  region: DataRegion = 'Europe';
  country: string = null;
  refereeLevel: RefereeLevel = null;
  constantes = CONSTANTES;
  referees: User[];
  error: any;
  searchInput: string;
  sortBy: string;
  applicationUser = true;
  loading = false;
  showFilterRegion = true;
  showFilterCountry = true;
  isNDR = false;
  isAdmin = false;

  constructor(
    private alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private competitionService: CompetitionService,
    private dateService: DateService,
    private helpService: HelpService,
    public modalController: ModalController,
    private navController: NavController,
    private refereeUpgradeService: RefereeUpgradeService,
    private toolService: ToolService,
    public userService: UserService
    ) {
  }

  ngOnInit() {
    this.helpService.setHelp('referee-list');
    const curUser: User = this.connectedUserService.getCurrentUser();
    this.isAdmin = this.connectedUserService.isAdmin();
    this.isNDR = this.connectedUserService.isNDR();
    this.region = curUser.region;
    this.showFilterRegion = this.isAdmin || !this.isNDR;
    this.showFilterCountry = this.isAdmin || !this.isNDR;
    if (this.isNDR && !this.isAdmin) {
      this.country = curUser.country;
    }
    this.searchReferee();
  }

  public searchReferee() {
    const criteria: UserSearchCriteria = {
      role : 'REFEREE',
      region: this.region,
      country : this.country,
      text : this.searchInput,
      refereeLevel : this.refereeLevel,
      accountStatus: this.applicationUser ? 'ACTIVE' : null
    };
    this.loading = true;
    this.userService.searchUsers(criteria).subscribe((response: ResponseWithData<User[]>) => {
      this.referees = this.sortReferees(response.data);
      this.error = response.error;
      this.loading = false;
    });
  }
  private sortReferees(referees: User[]): User[] {
    if (!referees) {
      return referees;
    }
    if (this.sortBy === 'level') {
      return referees.sort((ref1: Referee, ref2: Referee) => {
        let res = 0;
        if (res === 0) {
          res = ref1.referee.refereeLevel.localeCompare(ref2.referee.refereeLevel);
        }
        if (res === 0) {
            res = ref1.shortName.localeCompare(ref2.shortName);
        }
        return res;
      });
    } else {
      return referees.sort((ref1: Referee, ref2: Referee) => ref1.shortName.localeCompare(ref2.shortName));
    }
  }

  public refereeSelected(event: any, referee: Referee): void {
    this.navController.navigateRoot(`/referee/view/${referee.id}`);
  }

  public onSearchBarInput() {
    this.searchReferee();
  }
  exportRefereeUpgrades() {
    const refIds: string[] = this.referees
      .filter(ref => this.competitionService.isUpgradableReferee(ref))
      .map(ref => ref.id);
    // console.log('exportRefereeUpgrades()', refIds);
    if (refIds.length === 0) {
      this.alertCtrl.create({message: 'No upgradable referee found.'}).then((alert) => alert.present());
    } else {
      let fileName = 'Referees_Upgrade_status'
        + (this.toolService.isValidString(this.region) ? '_' + this.region : '')
        + (this.toolService.isValidString(this.country) ? '_' + this.country : '')
        + (this.toolService.isValidString(this.refereeLevel) ? '_' + this.refereeLevel : '')
        + (this.toolService.isValidString(this.searchInput) ? '_' + this.searchInput.trim() : '');
      this.refereeUpgradeService.getRefereeUpgradeStatusAsCsv(refIds, new Date()).subscribe({
        next: (content) => downloadContentAsFile(content, 
          `${fileName}_${this.dateService.date2string(new Date())}.csv`, 'text/csv'),
        error: (err) => console.error(err)
      });
    }
  }
  onSwipe(event) {
    // console.log('onSwipe', event);
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
