import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { LoadingController, ModalController, NavController } from '@ionic/angular';
import { map } from 'rxjs/operators';
import { CONSTANTES, User } from 'src/app/model/user';
import { BookmarkService } from 'src/app/service/BookmarkService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { EmailService } from 'src/app/service/EmailService';
import { HelpService } from 'src/app/service/HelpService';
import { ResponseWithData } from 'src/app/service/response';
import { ToolService } from 'src/app/service/ToolService';
import { UserService } from 'src/app/service/UserService';
import { UserSelectorComponent } from 'src/pages/widget/user-selector-component';

@Component({
  selector: 'app-referee-coach-view',
  templateUrl: './referee-coach-view.component.html'
})
export class RefereeCoachViewComponent implements OnInit {
  coach: User;
  coachLanguage: string[];
  coachCountry: string;

  constructor(
    public modalCtrl: ModalController,
    private route: ActivatedRoute,
    private navController: NavController,
    private helpService: HelpService,
    public dateService: DateService,
    public connectedUserService: ConnectedUserService,
    public loadingCtrl: LoadingController,
    public bookmarkService: BookmarkService,
    public emailService: EmailService,
    public toolService: ToolService,
    public userService: UserService,
    ) {
  }

  ngOnInit() {
    this.helpService.setHelp('referee-coach-view');
    this.route.paramMap.pipe(
      map((params: ParamMap) => {
        const id = params.get('id');
        if (id) {
          this.setCoachId(id);
        } else {
          this.navBack();
        }
      })
    ).subscribe();
  }

  navBack() {
    this.navController.navigateRoot( ['/referee-coach/list']);
  }

  private setCoachId(id: string) {
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
        this.setCoach(response.data);
      }
    });
  }

  private setCoach(coach: User) {
    this.coach = coach;
    this.coachCountry = this.toolService.getValue(CONSTANTES.countries, this.coach.country);
    this.coachLanguage = this.toolService.getValues(CONSTANTES.languages, this.coach.speakingLanguages);
    this.bookmarkPage();
  }

  private bookmarkPage() {
    this.bookmarkService.addBookmarkEntry({
      id: 'coach' + this.coach.id,
      label: 'Coach ' + this.coach.shortName,
      url: `/referee-coach/view/${this.coach.id}` });
  }

  public canEdit(): boolean {
    return this.connectedUserService.getCurrentUser().id === this.coach.id || this.connectedUserService.isAdmin();
  }

  public async editCoach() {
    const modal = await this.modalCtrl.create(
      { component: UserSelectorComponent, componentProps : {role: 'REFEREE_COACH'}});
    modal.onDidDismiss().then( (data) => this.setCoachId(this.coach.id));
    return await modal.present();
  }

  onSwipe(event) {
    if (event.direction === 4) {
      this.navBack();
    }
  }
}
