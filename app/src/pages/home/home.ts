import { Invitation } from './../../app/model/invitation';
import { AlertController } from '@ionic/angular';
import { InvitationService } from './../../app/service/InvitationService';
import { HelpService } from './../../app/service/HelpService';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { ConnectedUserService } from './../../app/service/ConnectedUserService';

import { User } from './../../app/model/user';
import { NotificationService } from 'src/app/service/NotificationService';
import { Notification } from 'src/app/model/notification';
import { DateService } from 'src/app/service/DateService';


@Component({
  templateUrl: 'home.html',
  styleUrls: ['home.scss']
})
export class HomePage implements OnInit {

  currentUser: User = null;
  showInstallBtn = false;
  deferredPrompt;
  notifications: Notification[] = [];

  constructor(
      private alertCtrl: AlertController,
      private connectedUserService: ConnectedUserService,
      public dateService: DateService,
      private helpService: HelpService,
      private invitationService: InvitationService,
      private notificationService: NotificationService,
      private changeDetectorRef: ChangeDetectorRef) {
  }
  public getShortName(): string {
    return this.currentUser.shortName;
  }
  public isRefereeCoach() {
    return this.connectedUserService.isRefereeCoach();
  }
  public isAdmin() {
    return this.connectedUserService.isAdmin();
  }
  public isNdr() {
    return this.connectedUserService.isNDR();
  }
  public isReferee() {
    return this.connectedUserService.isReferee();
  }

  ngOnInit() {
    this.helpService.setHelp('home');
    this.currentUser = this.connectedUserService.getCurrentUser();
    this.changeDetectorRef.detectChanges();
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later on the button event.
      this.deferredPrompt = e;
    // Update UI by showing a button to notify the user they can add to home screen
      this.showInstallBtn = true;
    });
    window.addEventListener('appinstalled', (event) => console.log('App installed'));
    this.notificationService.findMyNotitifications().subscribe((rn) => {
      this.notifications = rn.data;
    });
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

  inviteCoach() {
    // ask the email of the new user
    this.alertCtrl.create({
        message: 'To invite a new user of the application without the requirement of a validation,'
          + 'please enter the email address of the new user to invite:',
        inputs: [{ value: '', label: 'Email', type: 'text', name: 'email' }],
        buttons: [ 'Cancel',
          { text: 'Invite', handler: (data) => {
            this.invitationService.invite(data.email).subscribe();
          }},
        ]
      }).then( (alert) => alert.present() );
  }
  closeAllNotifications() {
    this.notifications.forEach(not => this.notificationService.closeNotification(not).subscribe());
    this.notifications = [];
  }
  closeNotification(notificationIdx: number) {
    this.notificationService.closeNotification(this.notifications.splice(notificationIdx)[0]).subscribe();
  }
}
