import { AppSettingsService } from './../../../app/service/AppSettingsService';
import { LocalAppSettings } from './../../../app/model/settings';
import { map, mergeMap } from 'rxjs/operators';
import { ConnectedUserService } from './../../../app/service/ConnectedUserService';
import { NavController, LoadingController, AlertController, ToastController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/service/UserService';
import { ApplicationRole, AppRole, CONSTANTES, CurrentApplicationName, getNextRefereeLevel, User } from 'src/app/model/user';
import { ResponseWithData } from 'src/app/service/response';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-login',
  styleUrls: ['user-migrate.component.scss'],
  templateUrl: './user-migrate.component.html'
})
export class UserMigrateComponent implements OnInit {

  user: User;
  error: string[] = [];
  constantes = CONSTANTES;
  saving = false;
  acceptCondition = false;
  valid = false;

  refereeRole = false;
  refereeCoachRole = false;
  ndrRole = false;

  refereeRoleInit = false;
  refereeCoachRoleInit = false;
  ndrRoleInit = false;

  constructor(
    private connectedUserService: ConnectedUserService,
    private loadingController: LoadingController,
    private navController: NavController,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private userService: UserService,
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(
      map( (paramMap: ParamMap) => {
        const userId = paramMap.get('id');
        if (userId) {
          this.userService.get(userId).subscribe((res: ResponseWithData<User>) => {
            if (res.error) {
              this.loadingController.create({
                message: 'Problem to load referee informaion ...',
                duration: 3000
              }).then( (loader) => loader.present())
              .then(() => {
                this.cancel();
              });
            } else if (res.data) {
              this.user = res.data;
              this.initApplicationRoles();
              console.log('load user: ', this.user);
              this.ensureDataSharing();
            } else {
              this.cancel();
            }
          });
        } else {
          this.cancel();
        }
      })
    ).subscribe();
  }
  onRefereeRoleChange() {
    this.onXXXRoleChange(this.refereeRole, this.refereeRoleInit, 'REFEREE');
  }
  onRefereeCoachRoleChange() {
    this.onXXXRoleChange(this.refereeCoachRole, this.refereeCoachRoleInit, 'REFEREE_COACH');
  }
  onNDRRoleChange() {
    this.onXXXRoleChange(this.ndrRole, this.ndrRoleInit, 'NDR');
  }
  disallowRefereeLevelChange(): boolean {
    return this.user.accountStatus === 'ACTIVE' && this.hasRole('REFEREE') && !this.connectedUserService.isAdmin();
  }
  disallowRefereeCoachLevelChange(): boolean {
    return this.user.accountStatus === 'ACTIVE' && this.hasRole('REFEREE_COACH') && !this.connectedUserService.isAdmin();
  }

  private hasRole(role: AppRole): boolean {
    return this.user.applications.filter(ar => ar.name === CurrentApplicationName && ar.role === role).length > 0;
  }
  private demandRole(role: AppRole): boolean {
    return this.user.demandingApplications.filter(ar => ar.name === CurrentApplicationName && ar.role === role).length > 0;
  }
  public getDemandingRoles(): ApplicationRole[] {
    return this.user.demandingApplications.filter(ar => ar.name === CurrentApplicationName);
  }
  private onXXXRoleChange(hasRole: boolean, hadRole: boolean, role: AppRole) {
    const ar: ApplicationRole = { name: CurrentApplicationName, role};
    if (hasRole) {
      if (hadRole) {
        this.addRoleToSet(this.user.applications, ar);
      } else {
        this.addRoleToSet(this.user.demandingApplications, ar);
      }
    } else {
      this.user.demandingApplications = this.removeAllRoleFrom(this.user.demandingApplications, ar);
      this.user.applications = this.removeAllRoleFrom(this.user.applications, ar);
    }
    this.isValid();
    console.log('onXXXRoleChange():'
      + '\nuser.applications=' + JSON.stringify(this.user.applications)
      + '\nuser.demandingApplications=' + JSON.stringify(this.user.demandingApplications)
      + '\nrefereeRole=' + this.refereeRoleInit + ' => ' + this.refereeRole + ' ' + this.user.referee.refereeLevel
      + '\nrefereeCoachRole=' + this.refereeCoachRoleInit + ' => ' + this.refereeCoachRole + ' ' + this.user.refereeCoach.refereeCoachLevel
      + '\nndrRole=' + this.ndrRoleInit + ' => ' + this.ndrRole
      + '\nvalid=' + this.valid
      );
  }

  private addRoleToSet(ars: ApplicationRole[], ar: ApplicationRole) {
    if (ars.filter(arc => arc.name === ar.name && arc.role === ar.role).length === 0) {
      ars.push(ar);
    }
  }
  public onRefereeCoachLevel() {
    this.isValid();
    console.log("onRefereeCoachLevel: " + this.valid + ' ' + this.user.refereeCoach.refereeCoachLevel);
  }
  public onRefereeLevel() {
    this.isValid();
    console.log("onRefereeLevel: " + this.valid + ' ' + this.user.referee.refereeLevel);
  }
  private removeAllRoleFrom(ars: ApplicationRole[], ar: ApplicationRole): ApplicationRole[] {
    return ars.filter((arc) => !(arc.name === ar.name && arc.role === ar.role));
  }

  private initApplicationRoles(): void {
    if (!this.user.applications) {
      this.user.applications = [];
    }
    const appRolesInit: ApplicationRole[] = this.user.applications.filter(ar => ar.name === CurrentApplicationName);
    this.refereeRoleInit = appRolesInit.filter(ar => ar.role === 'REFEREE').length > 0;
    this.refereeCoachRoleInit = appRolesInit.filter(ar => ar.role === 'REFEREE_COACH').length > 0;
    this.ndrRoleInit = appRolesInit.filter(ar => ar.role === 'NDR').length > 0;

    const appRolesDem: ApplicationRole[] = this.user.demandingApplications.filter(ar => ar.name === CurrentApplicationName);
    this.refereeRole = this.refereeRoleInit || appRolesDem.filter(ar => ar.role === 'REFEREE').length > 0;
    this.refereeCoachRole = this.refereeCoachRoleInit || appRolesDem.filter(ar => ar.role === 'REFEREE_COACH').length > 0;
    this.ndrRole = this.ndrRoleInit || appRolesDem.filter(ar => ar.role === 'NDR').length > 0;
    console.log('initApplicationRoles():'
      + '\nuser.applications=' + JSON.stringify(this.user.applications)
      + '\nuser.demandingApplications=' + JSON.stringify(this.user.demandingApplications)
      + '\nrefereeRole=' + this.refereeRoleInit + ' => ' + this.refereeRole
      + '\nrefereeCoachRole=' + this.refereeCoachRoleInit + ' => ' + this.refereeCoachRole
      + '\nndrRole=' + this.ndrRoleInit + ' => ' + this.ndrRole
      );
    this.isValid();
  }

  private ensureDataSharing() {
    if (!this.user.dataSharingAgreement) {
      console.log('Add dataSharingAgreement field to the existing user.');
      this.user.dataSharingAgreement = {
        personnalInfoSharing: 'YES',
        photoSharing: 'YES',
        refereeAssessmentSharing: 'YES',
        refereeCoachingInfoSharing: 'YES',
        coachAssessmentSharing: 'YES',
        coachCoachingInfoSharing: 'YES',
        coachProSharing: 'NO'
      };
    }
  }

  cancel() {
    this.navController.navigateRoot('/user/login');
  }

  public adjustRefereeNextLevel() {
    this.user.referee.nextRefereeLevel = getNextRefereeLevel(this.user.referee.refereeLevel);
  }

  isValid(): boolean {
    this.error = [];
    if (this.refereeRole && !this.isValidString(this.user.referee.refereeLevel)) {
      this.error.push('You must specify your referee level');
    }
    if (this.refereeCoachRole && !this.isValidString(this.user.refereeCoach.refereeCoachLevel)) {
      this.error.push('You must specify your referee coach level');
    }
    if (this.ndrRole && !this.isValidString(this.user.country)) {
      this.error.push('You must specify your referee coach level');
    }
    if (!this.refereeRole && !this.refereeCoachRole && !this.ndrRole) {
      this.error.push('You must specify your role: Referee, Referee Coach or NDR');
    }
    if (!this.acceptCondition && this.user.dataStatus === 'NEW') {
      this.error.push('You must accept the general conditions');
    }
    this.valid = this.error.length === 0;
    return this.valid;
  }

  isValidString(str: string, minimalLength: number = 0, maximalLength: number = 100): boolean {
    return str && str.trim().length >= minimalLength && str.trim().length <= maximalLength;
  }

  private notifyValidationRequired(): Observable<any> {
    const askNdr: boolean = this.demandRole('NDR');
    const askCoach: boolean = this.demandRole('REFEREE_COACH');
    const askReferee: boolean = this.demandRole('REFEREE');
    if (askNdr || askCoach) {
      // Send notification to the Admins
      let adminEmails: string[] = [];
      const rolesToValidate: AppRole[] = [];
      if (askNdr) {
        rolesToValidate.push('NDR');
      }
      if (askCoach) {
        rolesToValidate.push('REFEREE_COACH');
      }
      return this.userService.searchUsers({ role: 'ADMIN'}).pipe(
        map(rusers => {
          adminEmails = rusers.error || rusers.data.length === 0
            ? []
            : rusers.data.map(u => u.email);
        }),
        mergeMap(() => this.userService.sendValidationRequired(this.user.id, rolesToValidate, adminEmails, []))
      );
    }
    if (askReferee) {
      // Send notification to the NDR and the admin
      let ndrEmails: string[] = [];
      let adminEmails: string[] = [];
      return this.userService.searchUsers({ role: 'NDR', country: this.user.country}).pipe(
        map(rusers => {
          ndrEmails = rusers.error || rusers.data.length === 0
            ? []
            : rusers.data.map(u => u.email);
        }),
        mergeMap(() => this.userService.searchUsers({ role: 'ADMIN'})),
        map(rusers => {
          adminEmails = rusers.error || rusers.data.length === 0
            ? []
            : rusers.data.map(u => u.email);
        }),
        mergeMap(() => this.userService.sendValidationRequired(this.user.id, ['REFEREE'], ndrEmails, adminEmails))
      );
    }
  }

  save() {
    this.adjustRefereeNextLevel();
    if (!this.isValid()) {
      return;
    }
    this.saving = true;
    this.userService.save(this.user).pipe(
      map((response: ResponseWithData<User>) => {
        if (response.error) {
          this.saving = false;
          this.error = response.error.error;
          console.log('Error', response.error);
          this.toastController.create({ message: 'Error when saving the user info: ' + response.error, duration: 10000})
            .then((toast) => toast.present());
        } else {
          this.user = response.data;
          console.log('Saved user: ', this.user);
          this.notifyValidationRequired().subscribe();
          if (this.user.accountStatus === 'ACTIVE' 
            && (this.hasRole('NDR') || this.hasRole('REFEREE_COACH') || this.hasRole('REFEREE'))) {
              this.navController.navigateRoot('/home');
          } else {
            this.navController.navigateRoot('/user/waiting-validation');
          }
          this.saving = false;
        }
      })
    ).subscribe();
  }
}
