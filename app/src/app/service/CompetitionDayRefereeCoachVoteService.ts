import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { CompetitionDayRefereeCoachVote } from '../model/upgrade';
import { Observable, forkJoin, of } from 'rxjs';
import { ResponseWithData, Response } from './response';
import { DateService } from './DateService';
import { mergeMap } from 'rxjs/operators';

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
            .where('competitionRef.competitionId', '==', competitionId)
            .where('day', '==', this.dateService.to00h00(day))
            .where('coach.coachId', '==', coachId)
            .where('referee.refereeId', '==', refereeId)
            , 'default');
    }
    onCompetitionDelete(competitionId: string): Observable<Response[]> {
        return this.query(this.getCollectionRef().where('competitionRef.competitionId', '==', competitionId), 'default')
            .pipe(mergeMap((rvs) => {
                if (rvs.data && rvs.data.length > 0) {
                    return forkJoin(rvs.data.map(v => this.delete(v.id)));
                } else {
                    return of([{error: null}]);
                }
            }));
    }
    findByCompetition(competitionId: string): Observable<ResponseWithData<CompetitionDayRefereeCoachVote[]>> {
        return this.query(this.getCollectionRef().where('competitionRef.competitionId', '==', competitionId), 'default');
    }
}
