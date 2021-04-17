import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { User } from 'src/app/model/user';
import { HelpService } from 'src/app/service/HelpService';
import { ResponseWithData } from 'src/app/service/response';
import { UserService } from 'src/app/service/UserService';

@Component({
  selector: 'app-referee-coach-list',
  templateUrl: './referee-coach-list.component.html'
})
export class RefereeCoachListComponent implements OnInit {

  coaches: User[];
  error: any;
  searchInput: string;
  sortBy = 'level';

  constructor(
    private helpService: HelpService,
    private navController: NavController,
    public userService: UserService
    ) {
  }

  ngOnInit() {
    this.helpService.setHelp('referee-coach-list');
    this.searchRefereeCoaches();
  }

  private searchRefereeCoaches() {
    this.userService.searchRefereeCoaches(this.searchInput).subscribe((response: ResponseWithData<User[]>) => {
      this.coaches = this.sortCoaches(response.data);
      this.error = response.error;
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
