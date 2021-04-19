import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { CompetitionDayPanelVote, RefereeUpgrade } from '../model/upgrade';
import { DateService } from './DateService';
import { ResponseWithData } from './response';
import { Observable, of } from 'rxjs';

@Injectable()
export class RefereeUpgradeService extends RemotePersistentDataService<RefereeUpgrade> {

    constructor(
        appSettingsService: AppSettingsService,
        db: AngularFirestore,
        toastController: ToastController,
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
            .orderBy('upgradeStatus', 'desc')
            .limit(10)
            , 'default');
    }
}
