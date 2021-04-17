import { AppSettingsService } from './AppSettingsService';
import { DateService } from './DateService';
import { Competition } from './../model/competition';
import { ConnectedUserService } from './ConnectedUserService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Observable, forkJoin, of } from 'rxjs';
import { ResponseWithData } from './response';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { IonItemSliding, ToastController } from '@ionic/angular';

@Injectable()
export class CompetitionService extends RemotePersistentDataService<Competition> {

    constructor(
        appSettingsService: AppSettingsService,
        db: AngularFirestore,
        private connectedUserService: ConnectedUserService,
        private dateService: DateService,
        toastController: ToastController
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
                              options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<Competition[]>> {
        const str = text !== null && text && text.trim().length > 0 ? text.trim() : null;
        return str ?
            super.filter(this.allO(options), (item: Competition) => {
                return this.stringContains(str, item.name);
            })
            : this.allO(options);
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
}
