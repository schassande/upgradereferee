import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { CompetitionDayPanelVote } from '../model/upgrade';
import { DateService } from './DateService';
import { ResponseWithData } from './response';
import { Observable } from 'rxjs';

@Injectable()
export class CompetitionDayPanelVoteService extends RemotePersistentDataService<CompetitionDayPanelVote> {

    constructor(
        appSettingsService: AppSettingsService,
        db: AngularFirestore,
        toastController: ToastController,
        private dateService: DateService
    ) {
        super(appSettingsService, db, toastController);
    }

    getLocalStoragePrefix() {
        return 'competitionDayPanelVote';
    }

    getPriority(): number {
        return 4;
    }
    protected adjustFieldOnLoad(item: CompetitionDayPanelVote) {
        item.day = this.adjustDate(item.day, this.dateService);
    }

    getVote(competitionId: string, day: Date, refereeId: string)
        : Observable<ResponseWithData<CompetitionDayPanelVote>> {
        return this.queryOne(this.getCollectionRef()
            .where('competitionId', '==', competitionId)
            .where('day', '==', this.dateService.to00h00(day))
            .where('referee.refereeId', '==', refereeId)
            , 'default');
    }
}
