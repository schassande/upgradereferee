import { Component, OnInit } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { AppRole, User } from 'src/app/model/user';
import { UserService } from 'src/app/service/UserService';

@Component({
  selector: 'app-coach-validation',
  templateUrl: './coach-validation.component.html'
})
export class CoachValidationComponent implements OnInit {

  private readonly role: AppRole = 'REFEREE_COACH';

  users: User[] = null;

  constructor(
    private alertCtrl: AlertController,
    private navController: NavController,
    private userService: UserService
    ) { }

  ngOnInit() {
    this.updateUserList().subscribe();
  }

  private updateUserList(): Observable<User[]> {
    return this.userService.findPendingValidations(this.role).pipe(
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
      this.navController.navigateRoot(`/admin`);
    }
  }
}
