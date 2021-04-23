import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { CompetitionDayPanelVote, RefereeUpgrade } from '../model/upgrade';
import { DateService } from './DateService';
import { ResponseWithData } from './response';
import { Observable, of } from 'rxjs';
import { AngularFireFunctions } from '@angular/fire/functions';

@Injectable()
export class RefereeUpgradeService extends RemotePersistentDataService<RefereeUpgrade> {

    constructor(
        appSettingsService: AppSettingsService,
        db: AngularFirestore,
        toastController: ToastController,
        private angularFireFunctions: AngularFireFunctions,
        private dateService: DateService
    ) {
        super(appSettingsService, db, toastController);
    }

    getLocalStoragePrefix() {
        return 'refereeUpgrade';
    }

    getPriority(): number {
        return 4;
    }
    protected adjustFieldOnLoad(item: RefereeUpgrade) {
        item.upagrdeStatusDate = this.adjustDate(item.upagrdeStatusDate, this.dateService);
        item.c3PanelVotes.forEach(v => v.day = this.adjustDate(v.day, this.dateService));
        item.c4PanelVotes.forEach(v => v.day = this.adjustDate(v.day, this.dateService));
        item.c5PanelVotes.forEach(v => v.day = this.adjustDate(v.day, this.dateService));
    }

    public getLastRefereeUpgrade(refereeId: string): Observable<ResponseWithData<RefereeUpgrade>> {
        return this.queryOne(this.getCollectionRef()
            .where('referee.refereeId', '==', refereeId)
            .orderBy('upgradeStatus', 'desc')
            .limit(1)
            , 'default');
    }
    public find10LastRefereeUpgrades(refereeId: string): Observable<ResponseWithData<RefereeUpgrade[]>> {
        return this.query(this.getCollectionRef()
            .where('referee.refereeId', '==', refereeId)
            .orderBy('upagrdeStatusDate', 'desc')
            .limit(10)
            , 'default');
    }
    public computeRefereeUpgrade(coachId: string, refereeId: string, day: Date): Observable<RefereeUpgrade> {
        return this.angularFireFunctions.httpsCallable('computeRefereeUpgrade')({
            coachId,
            refereeId,
            day: this.dateService.date2string(day)
        });
    }
}
