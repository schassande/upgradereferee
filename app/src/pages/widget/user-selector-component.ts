import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { ConnectedUserService } from '../../app/service/ConnectedUserService';
import { UserService } from '../../app/service/UserService';
import { ResponseWithData } from '../../app/service/response';

import { DataRegion, SharedWith } from './../../app/model/common';
import { AppRole, CONSTANTES, RefereeCoachLevel, RefereeLevel, User } from './../../app/model/user';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-user-selector',
    template: `
<ion-content padding>
    <div style="margin-bottom: 20px;">Select an user.</div>
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
                <ion-select-option *ngFor="let c of constantes.europeanCountries" value="{{c[0]}}">{{c[1]}}</ion-select-option>
            </ion-select>
        </ion-item>
        <ion-item *ngIf="showFilterRefereeLevel">
          <ion-label>Referee Level</ion-label>
          <ion-select [(ngModel)]="refereeLevel" interface="action-sheet" (ionChange)="loadUser()">
            <ion-select-option *ngFor="let level of constantes.refereeLevels" value="{{level}}">{{level}}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item *ngIf="showFilterRefereeCoachLevel">
          <ion-label>Referee coach Level</ion-label>
          <ion-select [(ngModel)]="refereeCoachLevel" interface="action-sheet" (ionChange)="loadUser()">
              <ion-select-option *ngFor="let level of constantes.refereeCoachLevels" value="{{level}}">{{level}}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-item-group>
      <ion-item-group style="width: 100%;">
        <ion-item-divider color="light">Search result</ion-item-divider>
        <ion-item *ngFor="let user of users">
            <ion-icon slot="start" *ngIf="user.photo && !user.photo.url" name="person"></ion-icon>
            <ion-avatar slot="start" *ngIf="user.photo && user.photo.url"><img src="{{user.photo.url}}"></ion-avatar>
            <ion-label (click)="userSelected(user)">{{user.firstName}} {{user.lastName}}</ion-label>
        </ion-item>
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
    showFilterCountry = false;
    showFilterRefereeLevel = false;
    showFilterRefereeCoachLevel = false;
    constantes = CONSTANTES;

    constructor(
      public userService: UserService,
      public modalCtrl: ModalController,
      public connectedUserService: ConnectedUserService) {}

    ngOnInit() {
      this.showFilterCountry = this.country != null && !this.country;
      this.showFilterRefereeLevel = this.role === 'REFEREE';
      this.showFilterRefereeCoachLevel = this.role === 'REFEREE_COACH';
      this.loadUser();
    }

    loadUser() {
      this.userService.searchUsers({
        text: this.searchInput,
        role: this.role,
        refereeLevel: this.refereeLevel,
        refereeCoachLevel: this.refereeCoachLevel,
        country: this.country,
        region: this.region}
      ).subscribe((response: ResponseWithData<User[]>) => {
        this.users = this.userService.sortUsers(response.data);
        this.error = response.error;
        if (this.users == null || this.users.length === 0) {
            this.modalCtrl.dismiss({ user: null});
        }
      });
    }

    public userSelected(user: User): void {
      const sharedWith: SharedWith = {users : [user], groups: []};
      this.modalCtrl.dismiss(sharedWith);
    }
}
