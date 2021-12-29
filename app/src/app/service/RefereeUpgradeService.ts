import { AppSettingsService } from './AppSettingsService';
import { Firestore, limit, orderBy, Query, query, where } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { RefereeUpgrade, RefereeUpgradeStatus } from '../model/upgrade';
import { DateService } from './DateService';
import { ResponseWithData } from './response';
import { from, Observable, of } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { map } from 'rxjs/operators';
import { Upgradable } from '../model/coaching';

@Injectable()
export class RefereeUpgradeService extends RemotePersistentDataService<RefereeUpgrade> {

    constructor(
        appSettingsService: AppSettingsService,
        db: Firestore,
        toastController: ToastController,
        private angularFireFunctions: Functions,
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
        item.decisionDate = this.adjustDate(item.decisionDate, this.dateService);
        item.c3PanelVotes.forEach(v => v.day = this.adjustDate(v.day, this.dateService));
        item.c4PanelVotes.forEach(v => v.day = this.adjustDate(v.day, this.dateService));
        item.c5PanelVotes.forEach(v => v.day = this.adjustDate(v.day, this.dateService));
        if (item.allPanelVotes) {
            item.allPanelVotes.forEach(v => v.day = this.adjustDate(v.day, this.dateService));
        }
    }

    public getLastRefereeUpgrade(refereeId: string): Observable<ResponseWithData<RefereeUpgrade>> {
        return this.queryOne(query(this.getCollectionRef(),
            where('referee.refereeId', '==', refereeId),
            orderBy('decision', 'desc'),
            limit(1)));
    }
    public find10LastRefereeUpgrades(refereeId: string,
                                     upgradeStatus: RefereeUpgradeStatus = null): Observable<ResponseWithData<RefereeUpgrade[]>> {
        let q: Query<RefereeUpgrade> = query(this.getCollectionRef(),
            where('referee.refereeId', '==', refereeId),
            orderBy('decisionDate', 'desc'),
            limit(10));
        if (upgradeStatus) {
            q = query(q, where('upgradeStatus', '==', upgradeStatus));
        }
        return this.query(q);
    }
    public computeRefereeUpgrade(refereeId: string, day: Date): Observable<RefereeUpgrade> {
        return from(httpsCallable<any,RefereeUpgrade>(this.angularFireFunctions, 'computeRefereeUpgrade')({
            refereeId,
            day: this.dateService.date2string(day)
        })).pipe(
            map((a) => {
                const ru: RefereeUpgrade = a.data;
                this.adjustFieldOnLoad(ru);
                return ru;
            })
        );
    }
    public findRefereeUpgradeByDate(decisionDate: Date, decision: Upgradable): Observable<ResponseWithData<RefereeUpgrade[]>> {
        return this.query(query(this.getCollectionRef(),
            where('decisionDate', '==', decisionDate),
            where('decision', '==', decision)));
    }
    public findRefereeUpgradeByCompetition(competitionId: string,
                                           decision: Upgradable = null): Observable<ResponseWithData<RefereeUpgrade[]>> {
        let q: Query<RefereeUpgrade> = query(this.getCollectionRef(),
            where('competitionId', '==', competitionId));
        if (decision) {
            q = query(q, where('decision', '==', decision));
        }
        return this.query(q, 'default');
    }
    public sendRefereeUpgrade(upgrade: RefereeUpgrade): Observable<any> {
        if (upgrade.decision === 'Yes') {
            return from(httpsCallable(this.angularFireFunctions, 'sendRefereeUpgrade')({upgradeId: upgrade.id}));
        } else {
            return of('');
        }
    }
    findByCompetition(competitionId: string): Observable<ResponseWithData<RefereeUpgrade[]>> {
        return this.query(query(this.getCollectionRef(), where('competitionId', '==', competitionId)));
    }
}
