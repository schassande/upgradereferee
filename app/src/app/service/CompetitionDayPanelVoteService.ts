import { AppSettingsService } from './AppSettingsService';
import { Firestore, Query, query, where } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { CompetitionDayPanelVote } from '../model/upgrade';
import { DateService } from './DateService';
import { ResponseWithData, Response } from './response';
import { Observable, forkJoin, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable()
export class CompetitionDayPanelVoteService extends RemotePersistentDataService<CompetitionDayPanelVote> {

    constructor(
        appSettingsService: AppSettingsService,
        db: Firestore,
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

    getVote(competitionId: string, day: Date, refereeId: string): Observable<ResponseWithData<CompetitionDayPanelVote>> {
        return this.queryOne(query(this.getCollectionRef(),
            where('competitionRef.competitionId', '==', competitionId),
            where('day', '==', this.dateService.to00h00(day)),
            where('referee.refereeId', '==', refereeId)));
    }
    findClosedVotesByReferee(refereeId: string): Observable<ResponseWithData<CompetitionDayPanelVote[]>> {
        return this.query(query(this.getCollectionRef(),
            where('referee.refereeId', '==', refereeId),
            where('closed', '==', 'true')));
    }
    onCompetitionDelete(competitionId: string): Observable<Response[]> {
        return this.query(query(this.getCollectionRef(), where('competitionRef.competitionId', '==', competitionId)))
            .pipe(mergeMap((rvs) => {
                if (rvs.data && rvs.data.length > 0) {
                    return forkJoin(rvs.data.map(v => this.delete(v.id)));
                } else {
                    return of([{error: null}]);
                }
            }));
    }
    findByCompetition(competitionId: string): Observable<ResponseWithData<CompetitionDayPanelVote[]>> {
        return this.query(query(this.getCollectionRef(),
            where('competitionRef.competitionId', '==', competitionId)));
    }
}
