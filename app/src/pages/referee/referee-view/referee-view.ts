import { ModalController, LoadingController, NavController } from '@ionic/angular';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';

import { BookmarkService } from '../../../app/service/BookmarkService';
import { ConnectedUserService } from '../../../app/service/ConnectedUserService';
import { CONSTANTES, User } from '../../../app/model/user';
import { HelpService } from './../../../app/service/HelpService';
import { ResponseWithData } from '../../../app/service/response';
import { ToolService } from '../../../app/service/ToolService';
import { UserService } from 'src/app/service/UserService';


@Component({
  selector: 'app-page-referee-view',
  templateUrl: 'referee-view.html'
})
export class RefereeViewPage implements OnInit {
  referee: User;
  refereeLanguage: string[];
  refereeCountry: string;


  constructor(
    public modalCtrl: ModalController,
    private route: ActivatedRoute,
    private connectedUserService: ConnectedUserService,
    private navController: NavController,
    private helpService: HelpService,
    private userService: UserService,
    private loadingCtrl: LoadingController,
    private bookmarkService: BookmarkService,
    private toolService: ToolService) {
  }

  ngOnInit() {
    this.helpService.setHelp('referee-view');
    this.route.paramMap.pipe(
      map((params: ParamMap) => {
        const id = params.get('id');
        if (id) {
          this.setRefereeId(id);
        } else {
          this.navBack();
        }
      })
    ).subscribe();
  }
  canEdit(): boolean {
    return this.connectedUserService.getCurrentUser().id === this.referee.id || this.connectedUserService.isAdmin();
  }
  isRefereeCoach(): boolean {
    return this.connectedUserService.isRefereeCoach();
  }
  isAdmin(): boolean {
    return this.connectedUserService.isAdmin();
  }
  navBack() {
    this.navController.navigateRoot( ['/referee/list']);
  }
  canVote() {
    return this.referee.accountStatus === 'ACTIVE' && this.isRefereeCoach()
      && this.userService.canVote(this.referee, this.connectedUserService.getCurrentUser());
  }
  canViewUpgrade() {
    return this.referee.accountStatus === 'ACTIVE'
      && (this.connectedUserService.getCurrentUser().id === this.referee.id
        || this.canVote()
        || this.userService.isNdrOf(this.connectedUserService.getCurrentUser(), this.referee));
  }

  private setRefereeId(id: string) {
    // console.log('RefereeView.setRefereeId(' + id + ')');
    this.userService.get(id).subscribe((response: ResponseWithData<User>) => {
      if (response.error) {
        this.loadingCtrl.create({
          // content: 'Problem to load referee informaion ...',
          duration: 3000
        }).then( (loader) => loader.present()
        ).then(() => {
          this.navBack();
        });
      } else {
        this.setReferee(response.data);
      }
    });
  }

  private setReferee(referee: User) {
    // console.log('RefereeView.setReferee: ', referee);
    this.referee = referee;
    if (referee) {
      this.refereeCountry = this.toolService.getValue(CONSTANTES.countries, this.referee.country);
      this.refereeLanguage = this.toolService.getValues(CONSTANTES.languages, this.referee.speakingLanguages);
      this.bookmarkPage();
    }
  }

  private bookmarkPage() {
    this.bookmarkService.addBookmarkEntry({
      id: 'referee' + this.referee.id,
      label: 'Referee ' + this.referee.shortName,
      url: `/referee/view/${this.referee.id}` });
  }

  onSwipe(event) {
    if (event.direction === 4) {
      this.navBack();
    }
  }
}
