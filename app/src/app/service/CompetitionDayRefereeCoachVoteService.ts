import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { CompetitionDayRefereeCoachVote } from '../model/upgrade';
import { Observable } from 'rxjs';
import { ResponseWithData } from './response';
import { ToolService } from './ToolService';
import { DateService } from './DateService';

@Injectable()
export class CompetitionDayRefereeCoachVoteService extends RemotePersistentDataService<CompetitionDayRefereeCoachVote> {

    constructor(
        appSettingsService: AppSettingsService,
        db: AngularFirestore,
        toastController: ToastController,
        private dateService: DateService
    ) {
        super(appSettingsService, db, toastController);
    }

    getLocalStoragePrefix() {
        return 'competitionDayRefereeCoachVote';
    }

    getPriority(): number {
        return 4;
    }
    protected adjustFieldOnLoad(item: CompetitionDayRefereeCoachVote) {
        item.day = this.adjustDate(item.day, this.dateService);
    }

    getVote(competitionId: string, day: Date, coachId: string, refereeId: string)
        : Observable<ResponseWithData<CompetitionDayRefereeCoachVote>> {
        return this.queryOne(this.getCollectionRef()
            .where('competitionId', '==', competitionId)
            .where('day', '==', this.dateService.to00h00(day))
            .where('coach.coachId', '==', coachId)
            .where('referee.refereeId', '==', refereeId)
            , 'default');
    }
}
