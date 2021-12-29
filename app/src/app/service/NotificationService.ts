import { AppSettingsService } from './AppSettingsService';
import { DateService } from './DateService';
import { Firestore, orderBy, query, where } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { Notification, NotificationType } from '../model/notification';
import { ConnectedUserService } from './ConnectedUserService';
import { Observable } from 'rxjs';
import { ApplicationName, CurrentApplicationName, Referee, User } from '../model/user';
import { Competition } from '../model/competition';
import { ResponseWithData } from './response';

@Injectable()
export class NotificationService extends RemotePersistentDataService<Notification> {

    constructor(
      appSettingsService: AppSettingsService,
      private connectedUserService: ConnectedUserService,
      db: Firestore,
      private dateService: DateService,
      toastController: ToastController
    ) {
        super(appSettingsService, db, toastController);
    }

    getLocalStoragePrefix() {
        return 'notification';
    }

    getPriority(): number {
        return 5;
    }

    protected adjustFieldOnLoad(item: Notification) {
      item.eventDate = this.adjustDate(item.eventDate, this.dateService);
    }

    findMyNotitifications(): Observable<ResponseWithData<Notification[]>> {
      return this.query(query(this.getCollectionRef(),
        where('applicationNames', 'array-contains', CurrentApplicationName),
        where('targetedUserId', '==', this.connectedUserService.getCurrentUser().id),
        orderBy('eventDate', 'asc')));
    }

    closeNotification(notification: Notification): Observable<any> {
      return this.delete(notification.id);
    }
    refereeAddedToCompetition(referee: Referee, competition: Competition): Observable<any> {
      return this.newNotif(['RefereeCoach', 'Upgrade'], 'COMP_REFEREE_ADDED',
        `The referee ${referee.firstName} ${referee.lastName} has been added to the competition '${competition.name}'`,
        'COMPETITION',
        referee.id
      );
    }

    refereeRemovedFromCompetition(referee: Referee, competition: Competition): Observable<any> {
      return this.newNotif(['RefereeCoach', 'Upgrade'], 'COMP_REFEREE_REMOVED',
        `The referee ${referee.firstName} ${referee.lastName} has been removed from the competition '${competition.name}'`,
        'COMPETITION',
        referee.id
      );
    }

    coachAddedToCompetition(coach: User, competition: Competition): Observable<any> {
      return this.newNotif(['RefereeCoach', 'Upgrade'], 'COMP_COACH_ADDED',
        `The referee coach ${coach.firstName} ${coach.lastName} has been added to the competition '${competition.name}'`,
        'COMPETITION',
        coach.id
      );
    }

    coachRemovedFromCompetition(coach: User, competition: Competition): Observable<any> {
      return this.newNotif(['RefereeCoach', 'Upgrade'], 'COMP_COACH_REMOVED',
        `The referee coach ${coach.firstName} ${coach.lastName} has been removed from the competition '${competition.name}'`,
        'COMPETITION',
        coach.id
      );
    }

    private newNotif(applicationNames: ApplicationName[],
                     eventCode: string,
                     eventMessage: string,
                     eventType: NotificationType,
                     targetedUserId: string,
                     dataId: string = null) {
      const notif: Notification = {
        applicationNames,
        id: null,
        creationDate: new Date(),
        dataId,
        dataStatus: 'NEW',
        eventCode,
        eventDate: new Date(),
        eventMessage,
        eventType,
        lastUpdate: new Date(),
        sourceShortName: this.connectedUserService.getCurrentUser().shortName,
        sourceUserId: this.connectedUserService.getCurrentUser().id,
        targetedUserId,
        version: 0
      };
      return this.save(notif);
    }
}
