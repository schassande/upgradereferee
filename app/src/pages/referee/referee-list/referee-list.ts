import { HelpService } from './../../../app/service/HelpService';
import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { ResponseWithData } from '../../../app/service/response';
import { Referee, User } from '../../../app/model/user';
import { UserService } from 'src/app/service/UserService';

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

  referees: User[];
  error: any;
  searchInput: string;
  sortBy: string;

  constructor(
    private helpService: HelpService,
    public modalController: ModalController,
    private navController: NavController,
    public userService: UserService
    ) {
  }

  ngOnInit() {
    this.helpService.setHelp('referee-list');
    this.searchReferee();
  }

  private searchReferee() {
    this.userService.searchReferees(this.searchInput).subscribe((response: ResponseWithData<User[]>) => {
      this.referees = this.sortReferees(response.data);
      this.error = response.error;
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
