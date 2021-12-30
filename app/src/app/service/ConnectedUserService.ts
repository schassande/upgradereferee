import { AppSettingsService } from './AppSettingsService';
import { Injectable, EventEmitter } from '@angular/core';
import { AppRole, CurrentApplicationName, User } from './../model/user';
import { UserCredential } from '@angular/fire/auth';

@Injectable()
export class ConnectedUserService {

  /** The current user */
  private currentUser: User = null;
  private credential: UserCredential = null;

  /** The event about user connection */
  public $userConnectionEvent: EventEmitter<User> = new EventEmitter<User>();

  constructor(
      public appSettingsService: AppSettingsService) {
  }

  public isOnline(): boolean {
    return navigator.onLine;
  }
  public isConnected(): boolean {
    return this.currentUser && this.currentUser !== null;
  }
  public isLogin(): boolean {
    return this.currentUser && this.currentUser !== null
      && this.currentUser.token && this.currentUser.token !== null;
  }
  public getCurrentUser(): User {
    return this.currentUser;
  }

  public userConnected(user: User, credential: UserCredential) {
    this.currentUser = user;
    if (credential !== null || this.credential === null || this.credential.user.email !== user.email) {
      // set the new credential or clean if user is
      this.credential = credential;
    } // else keep the credential because it is same user
    console.log('User connected: ' + this.currentUser.email);
    this.$userConnectionEvent.emit(this.currentUser);
  }
  public userDisconnected() {
    this.currentUser = null;
    // keep the credential in case of
    console.log('User disconnected.');
    this.$userConnectionEvent.emit(this.currentUser);
  }
  public hasApplicationAccess(): boolean {
    return this.isConnected() && this.currentUser.applications.filter(ar => ar.name === CurrentApplicationName).length > 0;
  }

  public hasRole(role: AppRole): boolean {
    return this.isConnected()
      && this.currentUser.applications.filter(ar => ar.name === CurrentApplicationName && ar.role === role).length > 0;
  }

  public isAdmin() {
    return this.hasRole('ADMIN');
  }
  public isReferee() {
    return this.hasRole('REFEREE');
  }
  public isRefereeCoach() {
    return this.hasRole('REFEREE_COACH');
  }
  public isNDR() {
    return this.hasRole('NDR');
  }
}
