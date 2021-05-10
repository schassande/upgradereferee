import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { NavController } from '@ionic/angular';
import { throwError, forkJoin, of, Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { Competition } from 'src/app/model/competition';
import { CompetitionDayPanelVote, RefereeUpgrade, UpgradeCriteria } from 'src/app/model/upgrade';
import { CurrentApplicationName, User } from 'src/app/model/user';
import { CompetitionDayPanelVoteService } from 'src/app/service/CompetitionDayPanelVoteService';
import { CompetitionService } from 'src/app/service/CompetitionService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { RefereeUpgradeService } from 'src/app/service/RefereeUpgradeService';
import { ToolService } from 'src/app/service/ToolService';
import { UpgradeCriteriaService } from 'src/app/service/UpgradeCriteriaService';
import { UserService } from 'src/app/service/UserService';

@Component({
  selector: 'app-referee-votes',
  templateUrl: './referee-votes.component.html',
  styleUrls: ['./referee-votes.component.scss'],
})
export class RefereeVotesComponent implements OnInit {

  /** Id of the selected referee. This id can be given in parameter of the page. Can be null */
  refereeId: string;
  /** User object selected representing the referee. Can be null */
  referee: User;

  refereeUpgradeId: string;
  refereeUpgrade: RefereeUpgrade;
  refereeUpgrades: RefereeUpgrade[];
  upgradeCriteria: UpgradeCriteria;
  c3YesPanelVotes = 0;
  c4YesPanelVotes = 0;
  c5YesPanelVotes = 0;
  nbDay = 0;
  nbYesDay = 0;

  loading = false;
  computing = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private connectedUserService: ConnectedUserService,
    public dateService: DateService,
    private navController: NavController,
    private refereeUpgradeService: RefereeUpgradeService,
    private upgradeCriteriaService: UpgradeCriteriaService,
    private userService: UserService,
  ) {}

  ngOnInit() {
    this.loading = true;
    this.activatedRoute.paramMap.pipe(
      map((params: ParamMap) => {
        this.refereeId = params.get('id');
        console.log('PARAM refereeId=' + this.refereeId);
        if  (!this.refereeId) {
          throwError('Referee it not found in parameter.');
        }
      }),
      mergeMap(() => this.userService.get(this.refereeId)),
      map((ruser) => {
        this.referee = ruser.data;
        if (!this.referee) {
          throwError('User (' + this.refereeId + ') does not exist.');
        }
        if (this.referee.accountStatus !== 'ACTIVE') {
          throwError('User (' + this.refereeId + ') is not active.');
        }
        if (this.referee.applications.filter(ar => ar.name === CurrentApplicationName && ar.role === 'REFEREE_COACH').length === 0) {
          throwError('User (' + this.refereeId + ') has not role of REFEREE.');
        }
      }),
      mergeMap(() => this.refereeUpgradeService.find10LastRefereeUpgrades(this.refereeId)),
      map(rru => {
        this.refereeUpgrades = rru.data;
        console.log('this.refereeUpgrades', this.refereeUpgrades);
        this.loading = false;

        if (this.refereeUpgrades && this.refereeUpgrades.length > 0) {
          this.refereeUpgradeId = this.refereeUpgrades[0].id;
          this.onRefereeUpgradeChange();
        }
      })
    ).subscribe();
  }

  onRefereeUpgradeChange() {
    this.refereeUpgrade = this.refereeUpgrades.find(ru2 => ru2.id === this.refereeUpgradeId);
    this.c3YesPanelVotes = this.refereeUpgrade.c3PanelVotes.filter(v => v.vote === 'Yes').length;
    this.c4YesPanelVotes = this.refereeUpgrade.c4PanelVotes.filter(v => v.vote === 'Yes').length;
    this.c5YesPanelVotes = this.refereeUpgrade.c5PanelVotes.filter(v => v.vote === 'Yes').length;
    this.nbDay = this.refereeUpgrade.c3PanelVotes.length
               + this.refereeUpgrade.c4PanelVotes.length
               + this.refereeUpgrade.c5PanelVotes.length;
    this.nbYesDay = this.c3YesPanelVotes + this.c4YesPanelVotes + this.c5YesPanelVotes;
    this.upgradeCriteriaService.get(this.refereeUpgrade.upgradeCriteriaId)
      .subscribe(ruc => this.upgradeCriteria = ruc.data);
  }
  onRecomputeUpgrade() {
    this.computing = true;
    const decisionDate = this.refereeUpgrade ? this.refereeUpgrade.decisionDate : new Date();
    this.refereeUpgradeService.computeRefereeUpgrade(this.refereeId, decisionDate).subscribe(
      ru => {
        console.log('onRecomputeUpgrade()', ru);
        const idx = this.refereeUpgrades.findIndex(ru2 => ru2.id === ru.id);
        console.log('onRecomputeUpgrade() idx=' + idx);
        if (idx >= 0) {
          this.refereeUpgrades[idx] = ru;
        } else {
          this.refereeUpgrades.push(ru);
        }
        if (!this.refereeUpgrade && !this.refereeUpgradeId) {
          this.refereeUpgradeId = ru.id;
        }
        if (!this.refereeUpgrade || ru.id === this.refereeUpgrade.id) {
          this.refereeUpgrade = ru;
        }
        this.computing = false;
      }
    );
  }
  navBack() {
    this.navController.navigateRoot(['/home']);
  }

  onSwipe($event) {}
}
