import { Component, OnInit, Input } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { mergeMap, map } from 'rxjs/operators';
import { Observable, forkJoin, of } from 'rxjs';

import { CompetitionService } from './../../../app/service/CompetitionService';
import { DataRegion } from './../../../app/model/common';
import { ResponseWithData } from './../../../app/service/response';
import { User } from '../../../app/model/user';
import { PersistentDataFilter } from './../../../app/service/PersistentDataFonctions';
import { UserService } from 'src/app/service/UserService';

/**
 * Generated class for the RefereeSelectPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
  selector: 'app-page-referee-select',
  templateUrl: 'referee-select.html',
})
export class RefereeSelectPage implements OnInit {

  @Input() competitionId: string;
  @Input() region: DataRegion;
  referees: User[];
  error: any;
  searchInput: string;
  refereesDatabase: User[] = null;

  constructor(
    public userService: UserService,
    public competitionService: CompetitionService,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController) {
  }

  ngOnInit() {
    this.userService.lastSelectedReferee.referee = null;
    setTimeout(() => this.searchReferee(), 500);
  }

  private getRefereesDatabase(): Observable<User[]> {
    // console.log('RefereeSelectPage.getRefereesDatabase(): competitionId=', this.competitionId);
    if (this.competitionId && this.competitionId.length > 0 && this.refereesDatabase == null) {
      // console.log('RefereeSelectPage.getRefereesDatabase(): load competition');
      // load the competition
      return this.competitionService.get(this.competitionId).pipe(
        mergeMap((rcomp) => {
          // console.log('RefereeSelectPage.getRefereesDatabase(): competition=', rcomp.data);
          this.refereesDatabase = [];
          if (rcomp.data) {
            const obss: Observable<ResponseWithData<User>>[] = [];
            rcomp.data.referees.forEach((ref) => {
              obss.push(this.userService.get(ref.refereeId).pipe(
                map( (rref) => {
                  if (rref.data) {
                    this.refereesDatabase.push(rref.data);
                  }
                  return rref;
                })
              ));
            });
            return forkJoin(obss);
          } else {
            return of('');
          }
        }),
        map(() => this.refereesDatabase)
      );
    } else {
      return of(this.refereesDatabase);
    }
  }

  private searchReferee() {
    this.getRefereesDatabase().pipe(
      mergeMap( (refDb: User[]) => {
        if (!refDb || refDb.length === 0) {
          // search in the global database of referees through the service
          return this.userService.searchReferees(this.searchInput);
        } else {
          // search in the sub set of referes
          // get the filter from search word
          const filter: PersistentDataFilter<User> = this.userService.getFilterByText(this.searchInput);
          if (filter === null) { // no filter then return the ref db
            return of({data: refDb, error: null});
          } else { // use the filter to filter the ref db
            return of({data: refDb.filter(filter), error: null});
          }
        }
      })
    ).subscribe((response: ResponseWithData<User[]>) => {
      this.referees = response.data;
      this.error = response.error;
    });
  }

  public refereeSelected(referee: User): void {
    // console.log('refereeSelected', referee);
    this.userService.lastSelectedReferee.referee = referee;
    this.modalCtrl.dismiss( { referee});
  }

  public cancel() {
    this.userService.lastSelectedReferee.referee = null;
    this.modalCtrl.dismiss( { referee: null});
  }

  public onSearchBarInput() {
    this.searchReferee();
  }
  onSwipe(event) {
    if (event.direction === 4) {
      this.cancel();
    }
  }
}
