import { map } from 'rxjs/operators';
import { UserService } from './service/UserService';
import { Observable } from 'rxjs';
import { ConnectedUserService } from './service/ConnectedUserService';
import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class AllowedAuthGuard implements CanActivate {

  constructor(
    private connectedUserService: ConnectedUserService,
    private userService: UserService,
    private navController: NavController
    ) {}

  canActivate(): boolean|Observable<boolean> {
    const connected: boolean = this.connectedUserService.isConnected();
    if (connected) {
      if (this.connectedUserService.hasApplicationAccess()) {
        return true;
      } else {
        this.reject();
        return false;
      }
    }
    return this.userService.autoLogin().pipe(
      map(() => {
        if (!this.connectedUserService.isConnected()) {
          this.navController.navigateRoot(['/user/login']);
          return false;
        }
        if (this.connectedUserService.hasApplicationAccess()) {
          return true;
        } else {
          this.reject();
          return false;
        }
      })
    );
  }
  private reject(): void {
    let rights = '';
    this.connectedUserService.getCurrentUser().applications.forEach(ar =>
      rights += '\n\t-Application: ' + ar.name + ', role: ' + ar.role);
    this.connectedUserService.getCurrentUser().demandingApplications.forEach(ar =>
      rights += '\n\t-Application: ' + ar.name + ', demanding role: ' + ar.role);
    console.log('the user has not access to the application. He has to ask right:' + rights);
    this.navController.navigateRoot(['/user/migrate/' + this.connectedUserService.getCurrentUser().id ]);
  }
}
