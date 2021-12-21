import { ConnectedUserService } from './../../app/service/ConnectedUserService';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { NavController } from '@ionic/angular';
import { UserService } from '../../app/service/UserService';
import { AppSettingsService } from '../../app/service/AppSettingsService';
import { LocalAppSettings } from '../../app/model/settings';
import { getNextRefereeLevel, Referee, User } from './../../app/model/user';

import { environment } from '../../environments/environment';
import { RefereeService } from 'src/app/service/RefereeService';
import { ResponseWithData } from 'src/app/service/response';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { UpgradeCriteriaService } from 'src/app/service/UpgradeCriteriaService';
import { ToolService } from 'src/app/service/ToolService';


/**
 * Generated class for the SettingsPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */
@Component({
  selector: 'app-page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage implements OnInit {

  settings: LocalAppSettings;
  msg: string[] = [];
  env = environment;
  @ViewChild('inputReferees') inputReferees: ElementRef;
  launchMode = '';
  showDebugInfo = false;
  deferredPrompt;
  showInstallBtn = false;
  currentUser: User;
  isAdmin = false;

  constructor(
    private appSettingsService: AppSettingsService,
    private connectedUserService: ConnectedUserService,
    private navController: NavController,
    private refereeService: RefereeService,
    private upgradeCriteriaService: UpgradeCriteriaService,
    private userService: UserService,
    private toolService: ToolService,
  ) {
  }

  ngOnInit() {
    this.installAsApp();
    this.computeLaunchMode();
    this.currentUser = this.connectedUserService.getCurrentUser();
    this.isAdmin = this.connectedUserService.isAdmin();
    this.appSettingsService.get().subscribe((appSettings: LocalAppSettings) => {
      if (appSettings.forceOffline === undefined) {
        appSettings.forceOffline = false;
      }
      this.settings = appSettings;
    });
  }

  private installAsApp() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      // e.preventDefault();
      // Stash the event so it can be triggered later on the button event.
      this.deferredPrompt = e;
    // Update UI by showing a button to notify the user they can add to home screen
      this.showInstallBtn = true;
      this.launchMode += '<br>App can be installed.';
    });
    window.addEventListener('appinstalled', (event) => { this.launchMode += '<br>App installed'; });
  }

  private computeLaunchMode() {
    this.launchMode = '';
    if (window.hasOwnProperty('navigator') && window.navigator.hasOwnProperty('standalone')) {
      try {
        const nav: any = window.navigator;
        if (nav && nav.standalone === true) {
          this.launchMode += '<br>display-mode is standalone on iphone';
        } else {
          this.launchMode += '<br>display-mode is launch from Safari';
        }
      } catch (err) {
      }

    } else if (window.matchMedia('(display-mode: standalone)').matches) {
      this.launchMode += '<br>display-mode is standalone';

    } else {
      this.launchMode += '<br>display-mode is launch from web browser';
    }
  }

  public saveSettings(navigate = true) {
    this.appSettingsService.save(this.settings).pipe(
      map((settings: LocalAppSettings) => {
        this.settings = settings;
        if (navigate) {
          this.navController.navigateRoot(['/home']);
        }
      })
    ).subscribe();
  }

  migrateReferees() {
    this.refereeService.all().pipe(
      mergeMap(rreferees => forkJoin(rreferees.data.map((referee: Referee) => this.migrateReferee(referee))))
    ).subscribe();
  }

  migrateReferee(referee: Referee): Observable<User> {
    let exist = false;
    return this.userService.get(referee.id).pipe(
      map((ruser: ResponseWithData<User>) => {
        exist = ruser.data && ruser.data.id !== null;
        if (exist && ruser.data.accountStatus !== 'NO_ACCOUNT') {
          return throwError(referee.shortName + ': Problem de merge');
        }
      }),
      map(() => {
        const user: User = referee as User;
        user.dataStatus = exist  ? 'CLEAN' : 'NEW';
        user.password = '-';
        user.accountId = '-';
        user.token = '-';
        user.defaultCompetition = '-';
        user.defaultCompetitionId = '-';
        user.defaultGameCatory = 'OPEN';
        user.dataSharingAgreement = {
          personnalInfoSharing: 'YES',
          photoSharing: 'YES',
          refereeAssessmentSharing: 'YES',
          refereeCoachingInfoSharing: 'YES',
          coachAssessmentSharing: 'YES',
          coachCoachingInfoSharing: 'YES',
          coachProSharing: 'YES'
        };
        if (user.referee.refereeLevel && !user.referee.nextRefereeLevel) {
          const nextLevel = getNextRefereeLevel(user.referee.refereeLevel);
          if (nextLevel !== user.referee.refereeLevel) {
            user.referee.nextRefereeLevel = nextLevel;
          }
        }
        // adjust region based on badge
        if (user.referee.refereeLevel.startsWith('EURO')) {
          user.region = 'Europe';
        } else if (user.referee.refereeLevel.startsWith('AUS')) {
          user.region = 'Australia';
        } else if (user.referee.refereeLevel.startsWith('NZ')) {
          user.region = 'New Zealand';
        } else {
          user.region = 'Others';
        }

        user.role = 'REFEREE';
        user.applications = [{name: 'RefereeCoach', role: 'REFEREE'}, {name: 'Upgrade', role: 'REFEREE'}];
        user.demandingApplications = [];
        user.groupIds = [];
        user.authProvider = 'EMAIL';
        user.accountStatus = 'NO_ACCOUNT';
        // console.log(JSON.stringify(user, null, 2));
        return user;
      }),
      mergeMap(user => this.userService.save(user)),
      map(ruser => {
        if (ruser.error) {
          console.error(referee.shortName + ': ' + ruser.error);
        } else if (ruser.data.id !== referee.id) {
          console.error(referee.shortName + ': Wrong user id', ruser.data.id, referee.id);
        } else {
          console.log(referee.shortName + ': Ok');
        }
        return ruser.data;
      }),
      catchError(err => {
        console.error(err);
        return of(null);
      })
    );
  }

  initUpgradeCriteria() {
    this.upgradeCriteriaService.initData().subscribe();
  }

  cleanNoAccount() {
    console.log('cleanNoAccount: begin');
    this.userService.all().pipe(
      mergeMap((rus) => {
        if (rus.error) {
          throwError(rus.error);
        }
        if (rus.data.length === 0) {
          return of('');
        }
        return forkJoin(rus.data.map(user => {
          if (user.accountStatus === 'NO_ACCOUNT'
            && this.toolService.isValidString(user.email)
            && !user.email.startsWith('_')) {
            user.email = '_' + user.email;
            user.shortName = '_' + user.shortName;
            console.log('cleanNoAccount: adjust user ', user.email, user.accountId);
            return this.userService.save(user);
          }
          return of('');
        }));
      })
    ).subscribe(() => console.log('cleanNoAccount: end'));
  }

  toggleDebugInfo() {
    this.showDebugInfo = ! this.showDebugInfo;
    console.log('this.showDebugInfo =', this.showDebugInfo);
  }

  addToHome() {
    // hide our user interface that shows our button
    // Show the prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice
      .then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the prompt');
        } else {
          console.log('User dismissed the prompt');
        }
        this.deferredPrompt = null;
      });
  }
  onSwipe(event) {
    // console.log('onSwipe', event);
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
