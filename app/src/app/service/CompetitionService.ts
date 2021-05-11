import { AppSettingsService } from './AppSettingsService';
import { DateService } from './DateService';
import { Competition } from './../model/competition';
import { ConnectedUserService } from './ConnectedUserService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { ResponseWithData, Response } from './response';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { map, mergeMap } from 'rxjs/operators';
import { CompetitionDayPanelVoteService } from './CompetitionDayPanelVoteService';
import { CompetitionDayRefereeCoachVoteService } from './CompetitionDayRefereeCoachVoteService';
import { ToolService } from './ToolService';
import { DataRegion } from '../model/common';

@Injectable()
export class CompetitionService extends RemotePersistentDataService<Competition> {

    constructor(
        appSettingsService: AppSettingsService,
        db: AngularFirestore,
        private competitionDayPanelVoteService: CompetitionDayPanelVoteService,
        private competitionDayRefereeCoachVoteService: CompetitionDayRefereeCoachVoteService,
        private connectedUserService: ConnectedUserService,
        private dateService: DateService,
        toastController: ToastController,
        private toolService: ToolService
    ) {
        super(appSettingsService, db, toastController);
    }

    getLocalStoragePrefix() {
        return 'competition';
    }

    getPriority(): number {
        return 4;
    }
    protected adjustFieldOnLoad(item: Competition) {
        item.date = this.adjustDate(item.date, this.dateService);
        if (item.allocations === undefined) {
            item.allocations = [];
        }
        item.allocations.forEach( (alloc) => {
            alloc.date = this.adjustDate(alloc.date, this.dateService);
        });

        if (!item.days) {
            item.days = [];
        }
        item.days = item.days
            // .filter(d => d !== null && d !== undefined)
            .map((day) => this.adjustDate(day, this.dateService));
        if (item.days.length === 0 && item.date) {
            item.days.push(item.date);
        }
    }

    public searchCompetitions(text: string,
                              options: 'default' | 'server' | 'cache' = 'default',
                              region: DataRegion = null): Observable<ResponseWithData<Competition[]>> {
        let q: Query<Competition> = this.getCollectionRef();
        if (region) {
            console.log('searchCompetitions(' + text + ',' + options + ') filter by the region of the user: \'' + region + '\'');
            q = q.where('region', '==', region);
        }
        let res = this.query(q, options);
        const str = this.toolService.isValidString(text) ? text.trim() : null;
        if (str) {
            console.log('searchCompetitions(' + text + ',' + options + ') filter by the competition name.');
            res = super.filter(res, (item: Competition) => this.stringContains(str, item.name));
        }
        return res;
    }

    public filterCompetitionsByCoach(competitions: Competition[], coachId: string): Competition[] {
        return competitions.filter((competition) => this.authorized(competition, coachId));
    }

    public authorized(competition: Competition, coachId: string): boolean {
        return competition.refereePanelDirectorId === coachId
                || competition.ownerId === coachId
                || competition.refereeCoaches.filter((coach) => coach.coachId === coachId).length > 0;
    }

    public sortCompetitions(competitions: Competition[], reverse: boolean = false): Competition[] {
        if (!competitions) {
            return competitions;
        }
        let array: Competition[] = competitions.sort(this.compareCompetition.bind(this));
        if (reverse) {
            array = array.reverse();
        }
        return array;
    }

    public compareCompetition(competition1: Competition, competition2: Competition): number {
        let res = 0;
        if (res === 0) {
          // Compare date
          res = this.dateService.compareDate(competition1.date, competition2.date);
        }
        if (res === 0) {
          // compare competition name
          res = competition1.name.localeCompare(competition2.name);
        }
        return res;
    }
    public getCompetitionByName(name: string): Observable<ResponseWithData<Competition>> {
        if (!name) {
            return of({data: null, error: null});
        }
        return this.queryOne(this.getCollectionRef().where('name', '==', name), 'default');
    }

    public delete(competitionId: string): Observable<Response> {
        return of('').pipe(
            mergeMap(() => forkJoin([
                this.competitionDayPanelVoteService.onCompetitionDelete(competitionId),
                this.competitionDayRefereeCoachVoteService.onCompetitionDelete(competitionId)]
                )),
            mergeMap(() => {
                console.log('Deleting competition ...');
                return super.delete(competitionId);
            })
        );
    }
}
