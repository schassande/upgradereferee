import { Injectable } from '@angular/core';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { AppSettingsService } from './AppSettingsService';
import { ConnectedUserService } from './ConnectedUserService';
import { CompetitionService } from './CompetitionService';
import { LocalAppSettings } from './../model/settings';
import { UserService } from './UserService';

@Injectable()
export class OfflinesService  {

    constructor(
        private appSettingsService: AppSettingsService,
        private connectedUserService: ConnectedUserService,
        private competitionService: CompetitionService,
        private firestore: AngularFirestore,
        private userService: UserService
    ) {}

    public switchOfflineMode(): Observable<LocalAppSettings> {
        let settings = null;
        return this.appSettingsService.get().pipe(
            mergeMap((s: LocalAppSettings) => {
                settings = s;
                let obs: Observable<any> = null;
                if (settings.forceOffline) {
                    // Enable the network
                    obs = from(this.firestore.firestore.enableNetwork().then(() => console.log('Online')));
                } else {
                    // preload data
                    obs = this.competitionService.preload().pipe(
                        mergeMap(() => {
                            // for admin preload user list
                            if (this.connectedUserService.isConnected() && this.connectedUserService.getCurrentUser().role === 'ADMIN') {
                                return this.userService.preload();
                            } else {
                                return of('');
                            }
                        }),
                        // then disable the network
                        mergeMap(() => from(this.firestore.firestore.disableNetwork().then(() => console.log('Offline')))),
                    );
                }
                // store the offline mode
                return obs.pipe(
                    mergeMap( () => {
                        settings.forceOffline = !settings.forceOffline;
                        return this.appSettingsService.save(settings);
                    })
                );
            })
        );
    }
}
