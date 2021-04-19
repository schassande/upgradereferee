import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { NavController } from '@ionic/angular';
import { throwError } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { CompetitionDayPanelVote } from 'src/app/model/upgrade';
import { CurrentApplicationName, User } from 'src/app/model/user';
import { CompetitionDayPanelVoteService } from 'src/app/service/CompetitionDayPanelVoteService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { ToolService } from 'src/app/service/ToolService';
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
  /** The list of the panel votes. */
  votes: CompetitionDayPanelVote[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private competitionDayPanelVoteService: CompetitionDayPanelVoteService,
    private connectedUserService: ConnectedUserService,
    public dateService: DateService,
    private navController: NavController,
    private toolService: ToolService,
    private userService: UserService,
  ) {}

  ngOnInit() {
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
      mergeMap(() => this.competitionDayPanelVoteService.findClosedVotesByReferee(this.refereeId)),
      map(rvotes => {
        this.votes = rvotes.data;
      })
    ).subscribe();
  }

  navBack() {}

  onSwipe($event) {}
}
