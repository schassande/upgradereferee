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
import { UserMigrateComponent } from 'src/pages/user/user-migrate/user-migrate.component';
import { AllowedAuthGuard } from './AllowedAuthGuard';

const routes: Routes = [
  { path: 'admin', component: AdminHomeComponent, canActivate: [AllowedAuthGuard, AdminGuard] },
  { path: 'admin/user-manager', component: UserManagerComponent, canActivate: [AllowedAuthGuard, AdminGuard] },
  { path: 'admin/user-merger', component: UserMergerComponent, canActivate: [AllowedAuthGuard, AdminGuard] },
  { path: 'admin/coach-validation', component: CoachValidationComponent, canActivate: [AllowedAuthGuard, AdminGuard] },
  { path: 'admin/ndr-validation', component: NdrValidationComponent, canActivate: [AllowedAuthGuard, AdminGuard] },

  { path: 'competition/list', component: CompetitionListPage, canActivate: [AllowedAuthGuard] },
  { path: 'competition/:id/home', component: CompetitionHomePage, canActivate: [AllowedAuthGuard] },
  { path: 'competition/:id/edit', component: CompetitionEditComponent, canActivate: [AllowedAuthGuard, RefereeCoachGuard] },
  { path: 'competition/:id/coaches', component: CompetitionCoachesPage, canActivate: [AllowedAuthGuard] },
  { path: 'competition/:id/referees', component: CompetitionRefereesPage, canActivate: [AllowedAuthGuard] },
  { path: 'competition/:id/votes', component: CompetitionVotesComponent, canActivate: [AllowedAuthGuard, RefereeCoachGuard] },
  { path: 'competition/:id/upgrades', component: CompetitionUpgradesComponent, canActivate: [AllowedAuthGuard, RefereeCoachGuard] },

  { path: 'upgrade/voting', component: VotingComponent, canActivate: [AllowedAuthGuard, RefereeCoachGuard] },
  { path: 'upgrade/criteria', component: UpgradeCriteriaComponent, canActivate: [AllowedAuthGuard] },

  { path: 'home', component: HomePage, canActivate: [AllowedAuthGuard]},

  { path: 'ndr/list', component: NdrListComponent, canActivate: [AllowedAuthGuard] },

  { path: 'referee/list', component: RefereeListPage, canActivate: [AllowedAuthGuard] },
  { path: 'referee/view/:id', component: RefereeViewPage, canActivate: [AllowedAuthGuard] },
  { path: 'referee/votes/:id', component: RefereeVotesComponent, canActivate: [AllowedAuthGuard] },
  // MODAL { path: 'referee/select', component: RefereeSelectPage, canActivate: [AuthGuard] },

  { path: 'referee-coach/list', component: RefereeCoachListComponent, canActivate: [AllowedAuthGuard] },
  { path: 'referee-coach/view/:id', component: RefereeCoachViewComponent, canActivate: [AllowedAuthGuard] },

  { path: 'settings', component: SettingsPage, canActivate: [AllowedAuthGuard]},

  { path: 'user/login', component: UserLoginComponent},
  { path: 'user/create', component: UserEditPage},
  { path: 'user/migrate/:id', component: UserMigrateComponent, canActivate: [AuthGuard]},
  { path: 'user/waiting-validation', component: UserWaitingValidationPage},
  { path: 'user/edit/:id', component: UserEditPage, canActivate: [AllowedAuthGuard] },
  { path: 'user/referee-validation', component: RefereeValidationComponent, canActivate: [AllowedAuthGuard, NdrGuard] },

  { path: '', redirectTo: '/home', pathMatch: 'full' },

];


@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
