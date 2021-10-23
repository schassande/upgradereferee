import { Injectable } from '@angular/core';
// Module dependencies
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/Storage-angular';
// Firebase dependencies
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireModule } from '@angular/fire';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireFunctionsModule } from '@angular/fire/functions';
// other module dependencies
import { MarkdownModule } from 'ngx-markdown';
import { ChartsModule } from 'ng2-charts';
import { HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
@Injectable()
export class CustomHammerConfig extends HammerGestureConfig {}

// Application dependencies
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { environment } from '../environments/environment';

// Pages
import { AdminHomeComponent } from '../pages/admin/admin-home/admin-home.component';
import { CoachValidationComponent } from '../pages/user/coach-validation/coach-validation.component';
import { CompetitionSelectorComponent } from '../pages/widget/competition-selector';
import { CompetitionListPage } from '../pages/competition/competition-list/competition-list';
import { CompetitionEditComponent } from '../pages/competition/competition-edit/competition-edit.component';
import { CompetitionHomePage } from 'src/pages/competition/competition-home/competition-home.page';
import { CompetitionCoachesPage } from 'src/pages/competition/competition-coaches/competition-coaches.page';
import { CompetitionRefereesPage } from 'src/pages/competition/competition-referees/competition-referees.page';
import { HomePage } from '../pages/home/home';
import { NdrValidationComponent } from 'src/pages/user/ndr-validation/ndr-validation.component';
import { RefereeCoachListComponent } from 'src/pages/referee-coach/referee-coach-list/referee-coach-list.component';
import { RefereeCoachViewComponent } from 'src/pages/referee-coach/referee-coach-view/referee-coach-view.component';
import { RefereeListPage } from '../pages/referee/referee-list/referee-list';
import { RefereeSelectPage } from '../pages/referee/referee-select/referee-select';
import { RefereeValidationComponent } from 'src/pages/user/referee-validation/referee-validation.component';
import { SettingsPage } from '../pages/settings/settings';
import { UserEditPage } from '../pages/user/user-edit/user-edit';
import { UserLoginComponent } from '../pages/user/user-login/user-login.component';
import { UserManagerComponent } from '../pages/admin/user-manager/user-manager.component';

// Widgets
import { CameraIconComponent } from '../pages/widget/camera-icon-component';
import { HelpWidgetComponent } from './../pages/widget/help-widget-component';
import { UserSelectorComponent } from '../pages/widget/user-selector-component';
import { UserWaitingValidationPage } from '../pages/user/user-waiting-validation/user-waiting-validation';

// Services
import { AppSettingsService } from './service/AppSettingsService';
import { BookmarkService } from './service/BookmarkService';
import { CompetitionService } from './service/CompetitionService';
import { CompetitionDayRefereeCoachVoteService } from './service/CompetitionDayRefereeCoachVoteService';
import { CompetitionDayPanelVoteService } from './service/CompetitionDayPanelVoteService';
import { ConnectedUserService } from './service/ConnectedUserService';
import { DateService } from './service/DateService';
import { EmailService } from './service/EmailService';
import { HelpService } from './service/HelpService';
import { InvitationService } from './service/InvitationService';
import { LocalDatabaseService } from './service/LocalDatabaseService';
import { OfflinesService } from './service/OfflineService';
import { RefereeService } from './service/RefereeService';
import { ToolService } from './service/ToolService';
import { UserService } from './service/UserService';
import { UserGroupService } from './service/UserGroupService';
import { VersionService } from './service/VersionService';
import { RefereeViewPage } from 'src/pages/referee/referee-view/referee-view';
import { VotingComponent } from 'src/pages/upgrade/voting/voting.component';
import { RefereeVotesComponent } from 'src/pages/upgrade/referee-votes/referee-votes.component';
import { CompetitionVotesComponent } from 'src/pages/upgrade/competition-votes/competition-votes.component';
import { RefereeUpgradeService } from './service/RefereeUpgradeService';
import { UpgradeCriteriaService } from './service/UpgradeCriteriaService';
import { UpgradeCriteriaComponent } from 'src/pages/upgrade/upgrade-criteria/upgrade-criteria.component';
import { CompetitionUpgradesComponent } from 'src/pages/upgrade/competition-upgrades/competition-upgrades.component';
import { UserMergerComponent } from 'src/pages/admin/user-merger/user-merger.component';
import { NdrListComponent } from 'src/pages/ndr/ndr-list/ndr-list.component';


@NgModule({
  declarations: [AppComponent,
    AdminHomeComponent, UserManagerComponent, UserMergerComponent,
    CoachValidationComponent,
    CompetitionSelectorComponent,
    CompetitionListPage, CompetitionEditComponent, CompetitionHomePage, CompetitionCoachesPage, CompetitionRefereesPage,
    CompetitionVotesComponent, CompetitionUpgradesComponent,
    HomePage, HelpWidgetComponent,
    NdrValidationComponent, NdrListComponent,
    RefereeCoachListComponent, RefereeCoachViewComponent,
    RefereeListPage, RefereeSelectPage, RefereeValidationComponent, RefereeViewPage, RefereeVotesComponent,
    SettingsPage,
    UserEditPage, UserLoginComponent, UserWaitingValidationPage,
    CameraIconComponent, UserSelectorComponent,
    UpgradeCriteriaComponent,
    VotingComponent,
  ],
  entryComponents: [AppComponent, HomePage, RefereeSelectPage,
    UserSelectorComponent, CompetitionSelectorComponent, HelpWidgetComponent],
  imports: [
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule.enablePersistence(),
    AngularFireStorageModule,
    AngularFireFunctionsModule,
    BrowserModule,
    ChartsModule,
    FormsModule,
    HttpClientModule,
    MarkdownModule.forRoot({ loader: HttpClient }),
    IonicModule.forRoot(),
    IonicStorageModule.forRoot(),
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
  ],
  providers: [
    AppSettingsService,
    BookmarkService,
    CompetitionService,
    CompetitionDayRefereeCoachVoteService,
    CompetitionDayPanelVoteService,
    ConnectedUserService,
    DateService,
    EmailService,
    HelpService,
    InvitationService,
    LocalDatabaseService,
    OfflinesService,
    RefereeService,
    RefereeUpgradeService,
    ToolService,
    UpgradeCriteriaService,
    UserService,
    UserGroupService,
    VersionService,
    { provide: HAMMER_GESTURE_CONFIG, useClass: CustomHammerConfig },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
  bootstrap: [AppComponent]
})
export class AppModule {}
