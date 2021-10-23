import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './AuthGuard';
import { AdminGuard } from './AdminGuard';
import { AdminHomeComponent } from 'src/pages/admin/admin-home/admin-home.component';
import { CompetitionListPage } from '../pages/competition/competition-list/competition-list';
import { CompetitionEditComponent } from '../pages/competition/competition-edit/competition-edit.component';
import { CompetitionHomePage } from 'src/pages/competition/competition-home/competition-home.page';
import { CompetitionCoachesPage } from 'src/pages/competition/competition-coaches/competition-coaches.page';
import { CompetitionRefereesPage } from 'src/pages/competition/competition-referees/competition-referees.page';
import { UserManagerComponent } from 'src/pages/admin/user-manager/user-manager.component';
import { HomePage } from 'src/pages/home/home';
import { RefereeListPage } from 'src/pages/referee/referee-list/referee-list';
import { RefereeViewPage } from 'src/pages/referee/referee-view/referee-view';
import { SettingsPage } from 'src/pages/settings/settings';
import { UserLoginComponent } from 'src/pages/user/user-login/user-login.component';
import { UserEditPage } from 'src/pages/user/user-edit/user-edit';
import { UserWaitingValidationPage } from 'src/pages/user/user-waiting-validation/user-waiting-validation';
import { CoachValidationComponent } from 'src/pages/user/coach-validation/coach-validation.component';
import { NdrValidationComponent } from 'src/pages/user/ndr-validation/ndr-validation.component';
import { RefereeValidationComponent } from 'src/pages/user/referee-validation/referee-validation.component';
import { RefereeCoachViewComponent } from 'src/pages/referee-coach/referee-coach-view/referee-coach-view.component';
import { RefereeCoachListComponent } from 'src/pages/referee-coach/referee-coach-list/referee-coach-list.component';
import { CompetitionVotesComponent } from 'src/pages/upgrade/competition-votes/competition-votes.component';
import { RefereeVotesComponent } from 'src/pages/upgrade/referee-votes/referee-votes.component';
import { VotingComponent } from 'src/pages/upgrade/voting/voting.component';
import { RefereeCoachGuard } from './RefereeCoachGuard';
import { UpgradeCriteriaComponent } from 'src/pages/upgrade/upgrade-criteria/upgrade-criteria.component';
import { CompetitionUpgradesComponent } from 'src/pages/upgrade/competition-upgrades/competition-upgrades.component';
import { NdrGuard } from './NdrGuard';
import { UserMergerComponent } from 'src/pages/admin/user-merger/user-merger.component';
import { NdrListComponent } from 'src/pages/ndr/ndr-list/ndr-list.component';

const routes: Routes = [
  { path: 'admin', component: AdminHomeComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/user-manager', component: UserManagerComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/user-merger', component: UserMergerComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/coach-validation', component: CoachValidationComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/ndr-validation', component: NdrValidationComponent, canActivate: [AuthGuard, AdminGuard] },

  { path: 'competition/list', component: CompetitionListPage, canActivate: [AuthGuard] },
  { path: 'competition/:id/home', component: CompetitionHomePage, canActivate: [AuthGuard] },
  { path: 'competition/:id/edit', component: CompetitionEditComponent, canActivate: [AuthGuard, RefereeCoachGuard] },
  { path: 'competition/:id/coaches', component: CompetitionCoachesPage, canActivate: [AuthGuard] },
  { path: 'competition/:id/referees', component: CompetitionRefereesPage, canActivate: [AuthGuard] },
  { path: 'competition/:id/votes', component: CompetitionVotesComponent, canActivate: [AuthGuard, RefereeCoachGuard] },
  { path: 'competition/:id/upgrades', component: CompetitionUpgradesComponent, canActivate: [AuthGuard, RefereeCoachGuard] },

  { path: 'upgrade/voting', component: VotingComponent, canActivate: [AuthGuard, RefereeCoachGuard] },
  { path: 'upgrade/criteria', component: UpgradeCriteriaComponent, canActivate: [AuthGuard] },

  { path: 'home', component: HomePage, canActivate: [AuthGuard]},

  { path: 'ndr/list', component: NdrListComponent, canActivate: [AuthGuard] },

  { path: 'referee/list', component: RefereeListPage, canActivate: [AuthGuard] },
  { path: 'referee/view/:id', component: RefereeViewPage, canActivate: [AuthGuard] },
  { path: 'referee/votes/:id', component: RefereeVotesComponent, canActivate: [AuthGuard] },
  // MODAL { path: 'referee/select', component: RefereeSelectPage, canActivate: [AuthGuard] },

  { path: 'referee-coach/list', component: RefereeCoachListComponent, canActivate: [AuthGuard] },
  { path: 'referee-coach/view/:id', component: RefereeCoachViewComponent, canActivate: [AuthGuard] },

  { path: 'settings', component: SettingsPage, canActivate: [AuthGuard]},

  { path: 'user/login', component: UserLoginComponent},
  { path: 'user/create', component: UserEditPage},
  { path: 'user/waiting-validation', component: UserWaitingValidationPage},
  { path: 'user/edit/:id', component: UserEditPage, canActivate: [AuthGuard] },
  { path: 'user/referee-validation', component: RefereeValidationComponent, canActivate: [AuthGuard, NdrGuard] },

  { path: '', redirectTo: '/home', pathMatch: 'full' },

];


@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
