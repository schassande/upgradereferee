import { Component, OnInit } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { AppRole, User } from 'src/app/model/user';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { UserService } from 'src/app/service/UserService';

@Component({
  selector: 'app-referee-validation',
  templateUrl: './referee-validation.component.html'
})
export class RefereeValidationComponent implements OnInit {

  private readonly role: AppRole = 'REFEREE';

  users: User[] = null;

  constructor(
    private alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private navController: NavController,
    private userService: UserService
    ) { }

  ngOnInit() {
    this.updateUserList().subscribe();
  }

  private updateUserList(): Observable<User[]> {
    const country = this.connectedUserService.isAdmin() ? null : this.connectedUserService.getCurrentUser().country;
    return this.userService.findPendingValidations(this.role, country).pipe(
      map((rusers) => {
      this.users = rusers.data;
      return this.users;
    }));
  }
  userSelected(user: User) {
    this.navController.navigateRoot('/user/edit/' + user.id);
  }

  validate(user: User) {
    this.userService.validateRole(user, this.role).pipe(
      mergeMap(() => this.updateUserList())
    ).subscribe();
  }

  unvalidate(user: User) {
    this.userService.unvalidateRole(user, this.role).pipe(
      mergeMap(() => this.updateUserList())
    ).subscribe();
  }

  onSwipe(event) {
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
