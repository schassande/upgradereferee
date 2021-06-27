import { AlertController, NavController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';

import { User, AccountStatus, CurrentApplicationName, ApplicationRole, AppRole } from './../../../app/model/user';
import { ResponseWithData } from './../../../app/service/response';
import { UserService } from './../../../app/service/UserService';
import { ToolService } from './../../../app/service/ToolService';
import { mergeMap, map } from 'rxjs/operators';
import { DataRegion } from 'src/app/model/common';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { CompetitionService } from 'src/app/service/CompetitionService';
import { RefereeUpgradeService } from 'src/app/service/RefereeUpgradeService';
import { CompetitionDayPanelVoteService } from 'src/app/service/CompetitionDayPanelVoteService';
import { CompetitionDayRefereeCoachVoteService } from 'src/app/service/CompetitionDayRefereeCoachVoteService';
import { CoachRef, Competition, RefereeRef } from 'src/app/model/competition';
import { CompetitionDayPanelVote, CompetitionDayRefereeCoachVote, RefereeUpgrade } from 'src/app/model/upgrade';
import { forkJoin, Observable, of, throwError } from 'rxjs';

@Component({
  selector: 'app-user-merger',
  templateUrl: './user-merger.component.html',
  styleUrls: ['./user-merger.component.scss']
})
export class UserMergerComponent implements OnInit {
  users: User[];
  filteredUsers: User[];
  nbAnalysed = 0;
  nbNotYetAnalysed = 0;
  error;
  region: DataRegion;
  user: User;
  similarUsers: User[];

  userFrom: User;
  userTo: User;
  userFinal: User;

  toMigrate = {
    competitions: [] as Competition[],
    competitionDayRefereeCoachVotes: [] as CompetitionDayRefereeCoachVote[],
    competitionDayPanelVotes: [] as CompetitionDayPanelVote[],
    refereeUpgrades: [] as RefereeUpgrade[]
  };

  constructor(
    private connectedUserService: ConnectedUserService,
    private competitionService: CompetitionService,
    private competitionDayPanelVoteService: CompetitionDayPanelVoteService,
    private competitionDayRefereeCoachVoteService: CompetitionDayRefereeCoachVoteService,
    private navController: NavController,
    private refereeUpgradeService: RefereeUpgradeService,
    private toolService: ToolService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.region = this.connectedUserService.getCurrentUser().region;
    this.loadData();
  }
  onRegionChange() {
    this.filterUsers();
  }
  loadData() {
    this.userService.all().subscribe((response: ResponseWithData<User[]>) => {
      this.users = this.sort(response.data.filter(u => u.applications.filter(ar => ar.name === CurrentApplicationName).length > 0));
      this.error = response.error;
      if (this.users) {
        this.filterUsers();
        this.findUserToMerge();
      }
    });
  }
  filterUsers() {
    if (this.users && this.toolService.isValidString(this.region)) {
      this.filteredUsers = this.users.filter(u => {
        let keep = true;
        if (keep && this.toolService.isValidString(this.region)) {
          keep = u.region === this.region;
        }
        return keep;
      });
      console.log('filterUsers(): ' + this.users.length + ' => ' + this.filteredUsers.length);
    } else {
      this.filteredUsers = this.users;
      console.log('filterUsers(): no filtering');
    }
    this.nbAnalysed = 0;
    this.nbNotYetAnalysed = this.filteredUsers.length;
  }

  sort(users: User[]): User[] {
    if (!users) {
      return users;
    }
    const status: AccountStatus[] = ['VALIDATION_REQUIRED', 'LOCKED', 'ACTIVE', 'DELETED'];
    return users.sort( (user1: User, user2: User) => {
      let res = 0;
      if (res === 0) {
        res = status.indexOf(user1.accountStatus) - status.indexOf(user2.accountStatus);
      }
      if (res === 0) {
        res = (user1.firstName + user1.lastName).localeCompare((user2.firstName + user2.lastName));
      }
      return res;
    });
  }
  sortRoles(roles: ApplicationRole[]): ApplicationRole[] {
    return roles.sort((r1: ApplicationRole, r2: ApplicationRole) => {
      const res = r1.name.localeCompare(r2.name);
      return res === 0 ? r1.role.localeCompare(r2.role) : res;
    });
  }
  findUserToMerge() {
    this.similarUsers = [];
    this.user = null;
    this.userTo = null;
    this.userFrom = null;
    this.userFinal = null;
    while (this.filteredUsers.length > 0 && this.similarUsers.length === 0) {
      this.user = this.filteredUsers.pop();
      this.similarUsers = this.filteredUsers.filter(u => this.isSimilar(this.user, u));
      console.log('Find simular user to ' + this.user.id + ': ' + this.similarUsers.length);
      this.nbAnalysed++;
      this.nbNotYetAnalysed--;
    }
    if (this.similarUsers.length === 0) {
      this.user = null;
    }
  }

  isSimilar(u1: User, u2: User): boolean {
    return u1.id === u2.id
      || u1.shortName === u2.shortName || ('_' + u1.shortName) === u2.shortName || u1.shortName === ('_' + u2.shortName)
      || (u1.firstName === u2.firstName && u1.lastName === u2.lastName)
      || (this.toolService.isValidString(u1.email)
          && (u1.email === u2.email || ('_' + u1.email) === u2.email || u1.email === ('_' + u2.email)))
      ;
  }

  startMerging(userFrom: User, userTo: User) {
    console.log('Merging ' + userFrom.id + ' into ' + userTo.id);
    this.userFrom = userFrom;
    this.userTo = userTo;
    this.userFinal =  {
      id: userTo.id,
      accountId: userTo.accountId,
      accountStatus: userTo.accountStatus,
      applications: userTo.applications.filter(u => true),
      demandingApplications: userTo.demandingApplications.filter(u => true),
      region: userTo.region,
      version: userTo.version,
      creationDate : userTo.creationDate,
      lastUpdate : userTo.lastUpdate,
      dataStatus: userTo.dataStatus,
      firstName: userTo.firstName,
      lastName: userTo.lastName,
      shortName: userTo.shortName,
      country: userTo.country,
      email: userTo.email,
      gender: userTo.gender,
      mobilePhones: userTo.mobilePhones,
      photo: userTo.photo,
      speakingLanguages: userTo.speakingLanguages,
      referee : {
          refereeLevel: userTo.referee.refereeLevel,
          refereeCategory : userTo.referee.refereeCategory,
          nextRefereeLevel: userTo.referee.nextRefereeLevel,
          region: userTo.referee.region ? userTo.referee.region : userFrom.referee.region
      },
      refereeCoach: {
          refereeCoachLevel: userTo.refereeCoach.refereeCoachLevel
      },
      password: userTo.password,
      token: userTo.token,
      defaultCompetition: userTo.defaultCompetition,
      defaultCompetitionId: userTo.defaultCompetitionId,
      defaultGameCatory: userTo.defaultGameCatory,
      dataSharingAgreement: userTo.dataSharingAgreement,
      groupIds: userTo.groupIds.filter(e => true)
    };
    if (!this.userFinal.referee.region) {
      this.userFinal.referee.region = null;
    }
    this.userFrom.applications.forEach(a1 => {
      const idx = this.userFinal.applications.findIndex(a2 => a1.name === a2.name && a1.role === a2.role);
      if (idx < 0) {
        this.userFinal.applications.push(a1);
      }
    });
    this.userFrom.demandingApplications.forEach(a1 => {
      const idxDA = this.userFinal.demandingApplications.findIndex(a2 => a1.name === a2.name && a1.role === a2.role);
      const idxA = this.userFinal.applications.findIndex(a2 => a1.name === a2.name && a1.role === a2.role);
      if (idxA < 0 && idxDA < 0) {
        this.userFinal.demandingApplications.push(a1);
      }
    });
    this.computeDependencies();
  }

  private computeDependencies() {
    const fromId = this.userFrom.id;
    const toId = this.userTo.id;
    this.competitionService.all().pipe(
      map(rcs => {
        this.toMigrate.competitions = rcs.data.filter(c =>
          c.ownerId === fromId
          || c.allocations.filter(a =>
              a.refereeCoaches.filter(rc => rc.coachId === fromId).length > 0
              || a.referees.filter(rc => rc.refereeId === fromId).length > 0).length > 0
          || c.refereeCoaches.filter(rc => rc.coachId === fromId).length > 0
          || c.referees.filter(rc => rc.refereeId === fromId).length > 0
          || c.refereePanelDirectorId === fromId
        ).map(c => this.migrateCompetition(c, fromId, toId, 'competition(' + c.id + ')'));
      }),

      mergeMap(() => this.competitionDayRefereeCoachVoteService.all()),
      map(rvs => {
        this.toMigrate.competitionDayRefereeCoachVotes = rvs.data
          .filter(v => this.needToMigrateCoachVote(v, fromId))
          .map(v => this.migrateCoachVote(v, fromId, toId, 'coachVote(' + v.id + ')'));
      }),

      mergeMap(() => this.competitionDayPanelVoteService.all()),
      map(rvs => {
        this.toMigrate.competitionDayPanelVotes = rvs.data
          .filter(v => this.needToMigratePanelVote(v, fromId))
          .map(v => this.migratePanelVote(v, fromId, toId, 'panelVote(' + v.id + ')'));
      }),

      mergeMap(() => this.refereeUpgradeService.all()),
      map(rus => {
        this.toMigrate.refereeUpgrades = rus.data.filter(u =>
          (u.allPanelVotes && u.allPanelVotes.filter(v => this.needToMigratePanelVote(v, fromId)).length > 0)
          || (u.c3PanelVotes && u.c3PanelVotes.filter(v => this.needToMigratePanelVote(v, fromId)).length > 0)
          || (u.c4PanelVotes && u.c4PanelVotes.filter(v => this.needToMigratePanelVote(v, fromId)).length > 0)
          || (u.c5PanelVotes && u.c5PanelVotes.filter(v => this.needToMigratePanelVote(v, fromId)).length > 0)
          || (u.referee && u.referee.refereeId === fromId)
          || (u.yesRefereeCoaches && u.yesRefereeCoaches.filter(rc => rc.coachId === fromId).length > 0)
        ).map(ru => this.migrateRefereeUpgrade(ru, fromId, toId, 'refereeUpgrade(' + ru.id + ')'));
      })
    ).subscribe();
  }

  migrateCompetition(c: Competition, fromId: string, toId: string, ctx: string = ''): Competition {
    if (c.ownerId === fromId) {
      console.log('Change the referenced ' + ctx + '.ownerId ' + c.ownerId + ' to ' + toId);
      c.ownerId = toId;
    }
    c.allocations.forEach(a => {
      a.refereeCoaches.forEach(rc => this.migrateCoachRef(rc, fromId, toId, ctx + '.allocations[].refereeCoaches[]'));
      a.referees.forEach(r => this.migrateRefereeRef(r, fromId, toId, ctx + '.allocations[].referees[]'));
    });
    c.refereeCoaches.forEach(rc => this.migrateCoachRef(rc, fromId, toId, ctx + '.refereeCoaches[]'));
    c.referees.forEach(r => this.migrateRefereeRef(r, fromId, toId, ctx + '.referees[]'));
    if (c.refereePanelDirectorId === fromId) {
      console.log('Change the referenced ' + ctx + '.refereePanelDirectorId ' + c.refereePanelDirectorId + ' to ' + toId);
      c.refereePanelDirectorId = toId;
    }
    return c;
  }

  migrateCoachVote(v: CompetitionDayRefereeCoachVote, fromId: string, toId: string, ctx: string = ''): CompetitionDayRefereeCoachVote {
    this.migrateCoachRef(v.coach, fromId, toId, ctx + '.coach');
    this.migrateRefereeRef(v.referee, fromId, toId, ctx + '.referee');
    return v;
  }

  migratePanelVote(v: CompetitionDayPanelVote, fromId: string, toId: string, ctx: string = ''): CompetitionDayPanelVote {
    v.coaches.forEach(c => this.migrateCoachRef(c, fromId, toId, ctx + '.coaches'));
    this.migrateRefereeRef(v.referee, fromId, toId, ctx + '.referee');
    v.yesCoaches.forEach(c => this.migrateCoachRef(c, fromId, toId, ctx + '.yesCoaches'));
    return v;
  }

  migrateRefereeRef(r: RefereeRef, fromId: string, toId: string, ctx: string = '') {
    if (r.refereeId === fromId) {
      console.log('Change the referenced ' + ctx + '.refereeId ' + r.refereeId + ' to ' + toId);
      r.refereeId = toId;
    }
  }

  migrateCoachRef(c: CoachRef, fromId: string, toId: string, ctx: string = '') {
    if (c.coachId === fromId) {
      console.log('Change the referenced ' + ctx + '.coachId ' + c.coachId + ' to ' + toId);
      c.coachId = toId;
    }
  }

  migrateRefereeUpgrade(ru: RefereeUpgrade, fromId: string, toId: string, ctx: string = ''): RefereeUpgrade {
    ru.allPanelVotes.forEach(v => this.migratePanelVote(v, fromId, toId, ctx + '.allPanelVotes[]'));
    ru.c3PanelVotes.forEach(v => this.migratePanelVote(v, fromId, toId, ctx + '.c3PanelVotes[]'));
    ru.c4PanelVotes.forEach(v => this.migratePanelVote(v, fromId, toId, ctx + '.c4PanelVotes[]'));
    ru.c5PanelVotes.forEach(v => this.migratePanelVote(v, fromId, toId, ctx + '.c5PanelVotes[]'));
    ru.yesRefereeCoaches.forEach(rc => this.migrateCoachRef(rc, fromId, toId, ctx + '.yesRefereeCoaches[]'));
    this.migrateRefereeRef(ru.referee, fromId, toId, ctx + '.referee');
    return ru;
  }

  needToMigratePanelVote(v: CompetitionDayPanelVote, fromId: string): boolean {
    return v.referee.refereeId === fromId || v.coaches.filter(c => c.coachId  === fromId).length > 0;
  }

  needToMigrateCoachVote(v: CompetitionDayRefereeCoachVote, fromId: string): boolean {
    return v.referee.refereeId === fromId || v.coach.coachId === fromId;
  }

  merge() {
    // save the userFinal
    console.log('User=' + JSON.stringify(this.userFinal, null, 2));
    this.toMigrate.competitions.forEach(c => console.log('Competition=' + JSON.stringify(c, null, 2)));
    this.toMigrate.competitionDayRefereeCoachVotes.forEach(v => console.log('CoachVote=' + JSON.stringify(v, null, 2)));
    this.toMigrate.competitionDayPanelVotes.forEach(v => console.log('PanelVote=' + JSON.stringify(v, null, 2)));
    this.toMigrate.refereeUpgrades.forEach(v => console.log('Upgrade=' + JSON.stringify(v, null, 2)));
    this.userService.save(this.userFinal).pipe(
      map(ru => {
        if (!ru.data) {
          console.log('Error' + ru.error);
          throwError('Error when saving');
        }
        console.log('User saved ' + this.userFinal.id);
        return ru;
      }),
      // update competition
      mergeMap(() => this.joinObs(this.toMigrate.competitions
          .map(c => this.competitionService.save(c)))),
      // update competitionDayRefereeCoachVotes
      mergeMap(() => this.joinObs(this.toMigrate.competitionDayRefereeCoachVotes
          .map(v => this.competitionDayRefereeCoachVoteService.save(v)))),
      // update competitionDayPanelVotes
      mergeMap(() => this.joinObs(this.toMigrate.competitionDayPanelVotes
          .map(v => this.competitionDayPanelVoteService.save(v)))),
      // update refereeUpgrades
      mergeMap(() => this.joinObs(this.toMigrate.refereeUpgrades
          .map(ru => this.refereeUpgradeService.save(ru)))),
      // remove the userFrom
      mergeMap(() => this.userService.delete(this.userFrom.id))
    ).subscribe();
  }
  private joinObs(obs: Observable<any>[]): Observable<any> {
    return  obs.length === 0 ? of('') : forkJoin(obs);
  }
  back() {
    this.navController.navigateRoot('/admin');
  }
  onSwipe(event) {
    // console.log('onSwipe', event);
    if (event.direction === 4) {
      this.back();
    }
  }
}
