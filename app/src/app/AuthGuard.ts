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
export class AuthGuard implements CanActivate {

  constructor(
    private connectedUserService: ConnectedUserService,
    private userService: UserService,
    private navController: NavController
    ) {}

  canActivate(): boolean|Observable<boolean> {
    const connected: boolean = this.connectedUserService.isConnected();
    if (connected) {
      return true;
    }
    return this.userService.autoLogin().pipe(
      map(() => {
        if (!this.connectedUserService.isConnected()) {
          this.navController.navigateRoot(['/user/login']);
          return false;
        }
        return true;
      })
    );
  }
}
