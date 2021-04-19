import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { UpgradeCriteria } from '../model/upgrade';
import { DateService } from './DateService';
import { of, forkJoin, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RefereeLevel } from '../model/user';
import { ResponseWithData } from './response';

@Injectable()
export class UpgradeCriteriaService extends RemotePersistentDataService<UpgradeCriteria> {

    constructor(
        appSettingsService: AppSettingsService,
        db: AngularFirestore,
        toastController: ToastController,
        private dateService: DateService
    ) {
        super(appSettingsService, db, toastController);
    }

    getLocalStoragePrefix() {
        return 'upgradeCriteria';
    }

    getPriority(): number {
        return 4;
    }
    protected adjustFieldOnLoad(item: UpgradeCriteria) {
        item.beginDate = this.adjustDate(item.beginDate, this.dateService);
        item.endDate = this.adjustDate(item.endDate, this.dateService);
    }

    public initData(): Observable<any> {
        const beginDate: Date = this.dateService.string2date('2021-05-01', null);
        const endDate: Date = this.dateService.string2date('2050-12-31', null);
        const euroCriteria: UpgradeCriteria[] = [
            {
                id: 'EURO3_2021',
                version: 0,
                creationDate: new Date(),
                lastUpdate: new Date(),
                dataStatus: 'NEW',
                beginDate,
                endDate,
                upgradeLevel: 'EURO_3',
                multiDayCompetitionRequired: 0,
                yesRefereeCoachRequired: 2,
                c3DaysRequired: 5,
                c4DaysRequired: 0,
                c5DaysRequired: 0,
                daysRequired: 5,
                totalYesRequired: 3,
                c3YesRequired: 3,
                c4YesRequired: 0,
                c5YesRequired: 0
            },
            {
                id: 'EURO4_2021',
                version: 0,
                creationDate: new Date(),
                lastUpdate: new Date(),
                dataStatus: 'NEW',
                beginDate,
                endDate,
                upgradeLevel: 'EURO_4',
                multiDayCompetitionRequired: 0,
                yesRefereeCoachRequired: 3,
                c3DaysRequired: 2,
                c4DaysRequired: 4,
                c5DaysRequired: 0,
                daysRequired: 6,
                totalYesRequired: 4,
                c3YesRequired: 0,
                c4YesRequired: 2,
                c5YesRequired: 0
            },
            {
                id: 'EURO5_2021',
                version: 0,
                creationDate: new Date(),
                lastUpdate: new Date(),
                dataStatus: 'NEW',
                beginDate,
                endDate,
                upgradeLevel: 'EURO_5',
                multiDayCompetitionRequired: 2,
                yesRefereeCoachRequired: 3,
                c3DaysRequired: 4,
                c4DaysRequired: 3,
                c5DaysRequired: 3,
                daysRequired: 10,
                totalYesRequired: 6,
                c3YesRequired: 0,
                c4YesRequired: 0,
                c5YesRequired: 2
            }
        ];
        return forkJoin(euroCriteria.map(c =>
            this.get(c.id).pipe(mergeMap(ruc => !ruc.data ? this.save(c) : of(ruc.data)))
        ));
    }

    public getUpgradeCriteria(refereeLevel: RefereeLevel, applicationDate: Date): Observable<ResponseWithData<UpgradeCriteria>> {
        return this.queryOne(this.getCollectionRef()
            .where('beginDate', '<=', applicationDate)
            .where('endDate', '>=', applicationDate)
            .where('upgradeLevel', '==', refereeLevel)
            .orderBy('beginDate', 'desc')
            .limit(1)
            , 'default');
    }
}
