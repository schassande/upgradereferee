import { HelpService } from './../../../app/service/HelpService';
import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { ResponseWithData } from '../../../app/service/response';
import { CONSTANTES, Referee, RefereeLevel, User } from '../../../app/model/user';
import { UserSearchCriteria, UserService } from 'src/app/service/UserService';
import { DataRegion } from 'src/app/model/common';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';

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

  constructor(
    private connectedUserService: ConnectedUserService,
    private helpService: HelpService,
    public modalController: ModalController,
    private navController: NavController,
    public userService: UserService
    ) {
  }

  ngOnInit() {
    this.helpService.setHelp('referee-list');
    const curUser: User = this.connectedUserService.getCurrentUser();
    const isAdmin = this.connectedUserService.isAdmin();
    const isNDR = this.connectedUserService.isNDR();
    this.region = curUser.region;
    this.showFilterRegion = isAdmin || !isNDR;
    this.showFilterCountry = isAdmin || !isNDR;
    if (isNDR && !isAdmin) {
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
  onSwipe(event) {
    // console.log('onSwipe', event);
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
