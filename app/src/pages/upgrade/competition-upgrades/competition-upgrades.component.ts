import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { Upgradable } from 'src/app/model/coaching';
import { Competition } from 'src/app/model/competition';
import { RefereeUpgrade, RefereeUpgradeStatus } from 'src/app/model/upgrade';
import { RefereeLevel, User } from 'src/app/model/user';
import { CompetitionService } from 'src/app/service/CompetitionService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { RefereeUpgradeService } from 'src/app/service/RefereeUpgradeService';
import { ToolService } from 'src/app/service/ToolService';
import { UserService } from 'src/app/service/UserService';

export type UpgradeSort = 'Level-Date' | 'Date-Level';
export interface RefUp {
  referee: User;
  upgrade: RefereeUpgrade;
}
@Component({
  selector: 'app-competition-upgrades',
  templateUrl: './competition-upgrades.component.html',
  styleUrls: ['./competition-upgrades.component.scss'],
})
export class CompetitionUpgradesComponent implements OnInit {

  competition: Competition;
  loading = false;
  upgrades: RefUp[] = [];
  sort: UpgradeSort = 'Level-Date';
  hasUnpublished = false;

  // FILTERS //
  filteredUpgrades: RefUp[] = [];
  /** The level to upgrade */
  upgradeLevel: RefereeLevel;
  /** The decision of the upgrade. Only 2 possible values: 'Yes' or 'No' */
  decision: Upgradable;
  /** Indicate the status of the upgrade */
  upgradeStatus: RefereeUpgradeStatus;
  referees: User[] = [];
  selectedRefereeIdx = 0;

  constructor(
    private competitionService: CompetitionService,
    private connectedUserService: ConnectedUserService,
    public dateService: DateService,
    private navController: NavController,
    private refereeUpgradeService: RefereeUpgradeService,
    private route: ActivatedRoute,
    private toolService: ToolService,
    public userService: UserService
  ) { }

  ngOnInit() {
    this.loadCompetition().subscribe();
  }

  private loadCompetition(): Observable<Competition> {
    this.loading = true;
    const coach: User = this.connectedUserService.getCurrentUser();
    let isAdminOrDirector = this.connectedUserService.isAdmin();
    const list: RefereeUpgrade[] = [];
    const id2Ref: Map<string, User> = new Map();
    // load id from url path
    return this.route.paramMap.pipe(
      // load competition from the id
      mergeMap( (paramMap) => this.competitionService.get(paramMap.get('id'))),
      map( (rcompetition) => {
        this.competition = rcompetition.data;
        if (!this.competition) {
          // the competition has not been found => back to list of competition
          this.navController.navigateRoot('/competition/list');
        } else  if (!this.competitionService.authorized(this.competition, this.connectedUserService.getCurrentUser().id)) {
          // the coach is not allowed to access to this competition
          this.navController.navigateRoot('/competition/list');
        }
        isAdminOrDirector = isAdminOrDirector || this.competition.refereePanelDirectorId === coach.id;
        return this.competition;
      }),
      // load Referee Upgrade
      mergeMap(() =>
        forkJoin(this.competition.days
          .map(day => this.refereeUpgradeService.findRefereeUpgradeByCompetition(this.competition.id).pipe(
          map(rrus => rrus.data.forEach(ru => {
            if (isAdminOrDirector || this.userService.canVoteLevel(ru.upgradeLevel, coach.refereeCoach.refereeCoachLevel)) {
              list.push(ru);
              if (ru.upgradeStatus === 'DECIDED') {
                this.hasUnpublished = true;
              }
            }
          }))
        )))
      ),
      mergeMap(() => {
        if (list.length === 0) {
          return of('');
        }
        // extract the list of the referee ids
        const refIds: string[] = [];
        list.forEach(ru => this.toolService.addToSet(refIds, ru.referee.refereeId));

        // load the referee data
        return forkJoin(refIds.map(refereeId => this.userService.get(refereeId).pipe(
          map(ruser => {
            const referee: User = ruser.data;
            if (referee) {
              this.referees.push(referee);
              // create an item for each RefereeUpgrade of the referee
              list.filter(ru => ru.referee.refereeId === referee.id)
                  .forEach(ru => {
                this.upgrades.push({referee, upgrade: ru});
              });
            } else {
              console.error('Referee ' + refereeId + ' has not been found: ' + ruser.error);
            }
          })
        )));
      }),
      catchError((err) => {
        console.error('load error: ', err);
        this.loading = false;
        return of(this.competition);
      }),
      map (() => {
        this.filterUpgrades();
        this.loading = false;
        return this.competition;
      })
    );
  }

  onSortChange() {
    console.log('onSortChange() ' + this.sort);
    return this.upgrades.sort((u1: RefUp, u2: RefUp) => {
      let res = 0;
      if (this.sort === 'Date-Level') {
        res = this.compareUpgradeDate(u1, u2);
        if (res === 0) {
          res = this.compareUpgradeStatus(u1, u2);
        }
      } else if (this.sort === 'Level-Date') {
        res = this.compareUpgradeStatus(u1, u2);
        if (res === 0) {
          res = this.compareUpgradeDate(u1, u2);
        }
      }
      if (res === 0) {
        res = u1.referee.firstName.localeCompare(u2.referee.firstName);
      }
      if (res === 0) {
        res = u1.referee.lastName.localeCompare(u2.referee.lastName);
      }
      return res;
    });
  }

  filterUpgrades() {
    this.filteredUpgrades = this.upgrades.filter(ru => {
      if (this.toolService.isValidString(this.upgradeLevel) && this.upgradeLevel !== ru.upgrade.upgradeLevel) {
        return false;
      }
      if (this.toolService.isValidString(this.upgradeStatus) && this.upgradeStatus !== ru.upgrade.upgradeStatus) {
        return false;
      }
      if (this.toolService.isValidString(this.decision) && this.decision !== ru.upgrade.decision) {
        return false;
      }
      if (0 <= this.selectedRefereeIdx
          && this.selectedRefereeIdx < this.referees.length
          && this.referees[this.selectedRefereeIdx].id !== ru.upgrade.referee.refereeId) {
        return false;
      }
      return true;
    });
  }

  public publishAll() {
    forkJoin(this.upgrades.map(u => {
      if (u.upgrade.upgradeStatus === 'DECIDED') {
        u.upgrade.upgradeStatus = 'PUBLISHED';
        return this.refereeUpgradeService.save(u.upgrade);
      } else {
        return of();
      }
    })).subscribe();
  }
  private compareUpgradeDate(u1: RefUp, u2: RefUp): number {
    return this.dateService.compareDate(u1.upgrade.decisionDate, u2.upgrade.decisionDate);
  }
  private compareUpgradeStatus(u1: RefUp, u2: RefUp): number {
    return u1.upgrade.upgradeStatus.localeCompare(u2.upgrade.upgradeStatus);
  }

  back() {
    this.navController.navigateRoot(`/competition/${this.competition.id}/home`);
  }
}
