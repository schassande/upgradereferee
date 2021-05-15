import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DataRegion } from 'src/app/model/common';
import { CONSTANTES, RefereeCoachLevel, User } from 'src/app/model/user';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { HelpService } from 'src/app/service/HelpService';
import { ResponseWithData } from 'src/app/service/response';
import { UserSearchCriteria, UserService } from 'src/app/service/UserService';

@Component({
  selector: 'app-referee-coach-list',
  templateUrl: './referee-coach-list.component.html'
})
export class RefereeCoachListComponent implements OnInit {

  region: DataRegion = 'Europe';
  country: string = null;
  refereeCoachLevel: RefereeCoachLevel = null;
  constantes = CONSTANTES;

  coaches: User[];
  error: any;
  searchInput: string;
  sortBy = 'level';
  loading = false;

  constructor(
    private connectedUserService: ConnectedUserService,
    private helpService: HelpService,
    private navController: NavController,
    public userService: UserService
    ) {
  }

  ngOnInit() {
    this.helpService.setHelp('referee-coach-list');
    this.region = this.connectedUserService.getCurrentUser().region;
    this.searchRefereeCoaches();
  }

  public searchRefereeCoaches() {
    const criteria: UserSearchCriteria = {
      role : 'REFEREE_COACH',
      region: this.region,
      country : this.country,
      text : this.searchInput,
      refereeCoachLevel : this.refereeCoachLevel,
      accountStatus: 'ACTIVE'
    };
    this.loading = true;
    this.userService.searchUsers(criteria).subscribe((response: ResponseWithData<User[]>) => {
      this.coaches = this.sortCoaches(response.data);
      this.error = response.error;
      this.loading = false;
    });
  }
  private sortCoaches(coaches: User[]): User[] {
    if (!coaches) {
      return coaches;
    }
    if (this.sortBy === 'level') {
      return coaches.sort((ref1: User, ref2: User) => {
        let res = 0;
        if (res === 0 && ref1.refereeCoach.refereeCoachLevel && ref2.refereeCoach.refereeCoachLevel) {
          res = ref1.refereeCoach.refereeCoachLevel.localeCompare(ref2.refereeCoach.refereeCoachLevel);
        }
        if (res === 0) {
            res = ref1.shortName.localeCompare(ref2.shortName);
        }
        return res;
      });
    } else {
      return coaches.sort((ref1: User, ref2: User) => ref1.shortName.localeCompare(ref2.shortName));
    }
  }

  public refereeCoachSelected(event: any, coach: User): void {
    this.navController.navigateRoot(`/referee-coach/view/${coach.id}`);
  }

  public onSearchBarInput() {
    this.searchRefereeCoaches();
  }

  onSwipe(event) {
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
