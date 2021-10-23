import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/model/user';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { ResponseWithData } from 'src/app/service/response';
import { UserSearchCriteria, UserService } from 'src/app/service/UserService';

@Component({
  selector: 'app-ndr-list',
  templateUrl: './ndr-list.component.html',
})
export class NdrListComponent implements OnInit {

  ndrs: User[];
  error: any;
  loading = false;

  constructor(
    private connectedUserService: ConnectedUserService,
    public userService: UserService
    ) {
  }

  ngOnInit() {
    this.searchNdr();
  }

  public searchNdr() {
    const criteria: UserSearchCriteria = {
      role : 'NDR',
      region : 'Europe',
      accountStatus: 'ACTIVE'
    };
    this.loading = true;
    this.userService.searchUsers(criteria).subscribe((response: ResponseWithData<User[]>) => {
      this.ndrs = this.sortNdrs(response.data);
      this.error = response.error;
      this.loading = false;
    });
  }
  private sortNdrs(ndrs: User[]): User[] {
    if (!ndrs) {
      return ndrs;
    }
    return ndrs.sort((ref1: User, ref2: User) => ref1.firstName.localeCompare(ref2.firstName));
  }
}
