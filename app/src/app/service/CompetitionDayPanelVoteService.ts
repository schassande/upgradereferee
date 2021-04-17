import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { CompetitionDayPanelVote } from '../model/upgrade';

@Injectable()
export class CompetitionDayPanelVoteService extends RemotePersistentDataService<CompetitionDayPanelVote> {

    constructor(
        appSettingsService: AppSettingsService,
        db: AngularFirestore,
        toastController: ToastController
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
    }
}
