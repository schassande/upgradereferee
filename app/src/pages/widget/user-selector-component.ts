import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { ConnectedUserService } from '../../app/service/ConnectedUserService';
import { UserSearchCriteria, UserService } from '../../app/service/UserService';
import { ResponseWithData } from '../../app/service/response';

import { DataRegion, SharedWith } from './../../app/model/common';
import { AppRole, CONSTANTES, RefereeCoachLevel, RefereeLevel, User } from './../../app/model/user';
import { ToolService } from 'src/app/service/ToolService';

@Component({
    selector: 'app-user-selector',
    template: `
<ion-content padding>
    <div style="padding: 20px; text-align: center; font-size: 1.2em; background-color: #eeeeee;">
      <span>Select&nbsp;</span>
      <span *ngIf="role === 'REFEREE'">a referee</span>
      <span *ngIf="role === 'REFEREE_COACH'">a referee coach</span>
      <span *ngIf="role !== 'REFEREE_COACH' && role !== 'REFEREE'">an user</span>
    </div>
    <ion-list>
      <ion-item-group style="width: 100%;">
        <ion-item-divider color="light">Filtering criteria</ion-item-divider>
        <ion-item>
          <ion-label>Name</ion-label>
          <ion-searchbar [(ngModel)]="searchInput" [showCancelButton]="false" (ionChange)="loadUser()"></ion-searchbar>
        </ion-item>
        <ion-item>
            <ion-label>Country</ion-label>
            <ion-select [(ngModel)]="country" interface="action-sheet" (ionChange)="loadUser()">
              <ion-select-option value="">All</ion-select-option>
              <ion-select-option *ngFor="let c of constantes.europeanCountries" value="{{c[0]}}">{{c[1]}}</ion-select-option>
            </ion-select>
        </ion-item>
        <ion-item>
            <ion-label>Region</ion-label>
            <ion-select [(ngModel)]="region" interface="action-sheet" (ionChange)="loadUser()">
                <ion-select-option value="">All</ion-select-option>
                <ion-select-option *ngFor="let r of constantes.regions" value="{{r}}">{{r}}</ion-select-option>
            </ion-select>
        </ion-item>
        <ion-item *ngIf="showFilterRefereeLevel">
          <ion-label>Referee Level</ion-label>
          <ion-select [(ngModel)]="refereeLevel" interface="action-sheet" (ionChange)="loadUser()">
            <ion-select-option value="">All</ion-select-option>
            <ion-select-option *ngFor="let level of constantes.refereeLevels" value="{{level}}">{{level}}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item *ngIf="showFilterRefereeCoachLevel">
          <ion-label>Referee coach Level</ion-label>
          <ion-select [(ngModel)]="refereeCoachLevel" interface="action-sheet" (ionChange)="loadUser()">
              <ion-select-option value="">All</ion-select-option>
              <ion-select-option *ngFor="let level of constantes.refereeCoachLevels" value="{{level}}">{{level}}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-item-group>
      <ion-item-group style="width: 100%;">
        <ion-item-divider color="light">Search result</ion-item-divider>
        <div *ngIf="loading" style="margin: 20px; text-align: center;"><ion-spinner></ion-spinner></div>
        <div *ngIf="!loading">
          <div *ngIf="!users || users.length === 0" style="margin: 20px; text-align: center;">Empty result</div>
          <ion-item *ngFor="let user of users">
              <ion-icon slot="start" *ngIf="user.photo && !user.photo.url" name="person"></ion-icon>
              <ion-avatar slot="start" *ngIf="user.photo && user.photo.url"><img src="{{user.photo.url}}"></ion-avatar>
              <ion-label (click)="userSelected(user)">{{user.firstName}} {{user.lastName}}</ion-label>
              <ion-avatar slot="end" *ngIf="role === 'REFEREE'"><img src="assets/imgs/badge/{{user.referee.refereeLevel}}.png" /></ion-avatar>
              <ion-avatar slot="end" *ngIf="role === 'REFEREE_COACH'"><img src="assets/imgs/badge/coach_{{user.refereeCoach.refereeCoachLevel}}.png" /></ion-avatar>
          </ion-item>
        </div>
      </ion-item-group>
    </ion-list>
</ion-content>`,
  })
export class UserSelectorComponent implements OnInit {

    @Input()
    role: AppRole = null;
    @Input()
    region: DataRegion = null;
    @Input()
    country: string = null;
    @Input()
    refereeLevel: RefereeLevel = null;
    @Input()
    refereeCoachLevel: RefereeCoachLevel = null;

    users: User[];
    error;
    searchInput: string;
    showFilterRefereeLevel = false;
    showFilterRefereeCoachLevel = false;
    constantes = CONSTANTES;
    loading = false;

    constructor(
      public userService: UserService,
      public modalCtrl: ModalController,
      public connectedUserService: ConnectedUserService,
      private toolService: ToolService) {}

    ngOnInit() {
      this.showFilterRefereeLevel = this.role === 'REFEREE';
      this.showFilterRefereeCoachLevel = this.role === 'REFEREE_COACH';
      this.loadUser();
    }

    loadUser() {
      const criteria: UserSearchCriteria = {
        role : this.role,
        region : this.region,
        country : this.country,
        text : this.searchInput,
        refereeLevel : this.refereeLevel,
        refereeCoachLevel : this.refereeCoachLevel
      };
      this.loading = true;
      this.userService.searchUsers(criteria).subscribe((response: ResponseWithData<User[]>) => {
        this.users = this.userService.sortUsers(response.data);
        this.error = response.error;
        this.loading = false;
      });
    }

    public userSelected(user: User): void {
      const sharedWith: SharedWith = {users : [user], groups: []};
      this.modalCtrl.dismiss(sharedWith);
    }
}
