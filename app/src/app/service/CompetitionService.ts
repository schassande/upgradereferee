import { AppSettingsService } from './AppSettingsService';
import { DateService } from './DateService';
import { Competition, CompetitionCategory } from './../model/competition';
import { ConnectedUserService } from './ConnectedUserService';
import { Firestore, Query, query, where } from '@angular/fire/firestore';
import { Observable, forkJoin, of } from 'rxjs';
import { ResponseWithData, Response } from './response';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ToastController } from '@ionic/angular';
import { mergeMap, map } from 'rxjs/operators';
import { CompetitionDayPanelVoteService } from './CompetitionDayPanelVoteService';
import { CompetitionDayRefereeCoachVoteService } from './CompetitionDayRefereeCoachVoteService';
import { ToolService } from './ToolService';
import { DataRegion } from '../model/common';
import { CurrentApplicationName, Referee, RefereeCoachLevel, User } from '../model/user';
import { Functions } from '@angular/fire/functions';
import { CompetitionDayPanelVote, CompetitionDayRefereeCoachVote, RefereeUpgrade } from '../model/upgrade';
import { RefereeUpgradeService } from './RefereeUpgradeService';
import { Upgradable } from '../model/coaching';

@Injectable()
export class CompetitionService extends RemotePersistentDataService<Competition> {

    constructor(
        appSettingsService: AppSettingsService,
        db: Firestore,
        private angularFireFunctions: Functions,
        private competitionDayPanelVoteService: CompetitionDayPanelVoteService,
        private competitionDayRefereeCoachVoteService: CompetitionDayRefereeCoachVoteService,
        private connectedUserService: ConnectedUserService,
        private dateService: DateService,
        toastController: ToastController,
        private refereeUpgradeService: RefereeUpgradeService,
        private toolService: ToolService
    ) {
        super(appSettingsService, db, toastController);
    }

    getLocalStoragePrefix() {
        return 'competition';
    }

    getPriority(): number {
        return 4;
    }
    protected adjustFieldOnLoad(item: Competition) {
        item.date = this.adjustDate(item.date, this.dateService);
        if (item.allocations === undefined) {
            item.allocations = [];
        }
        item.allocations.forEach( (alloc) => {
            alloc.date = this.adjustDate(alloc.date, this.dateService);
        });

        if (!item.days) {
            item.days = [];
        }
        item.days = item.days
            // .filter(d => d !== null && d !== undefined)
            .map((day) => this.adjustDate(day, this.dateService));
        if (item.days.length === 0 && item.date) {
            item.days.push(item.date);
        }
        if (!item.categorySenior) {
            item.categorySenior = item.category;
        }
    }

    public searchCompetitions(text: string,
                              options: 'default' | 'server' | 'cache' = 'default',
                              region: DataRegion = null): Observable<ResponseWithData<Competition[]>> {
        let q: Query<Competition> = this.getCollectionRef();
        if (region) {
            console.log('searchCompetitions(' + text + ',' + options + ') filter by the region of the user: \'' + region + '\'');
            q = query(q, where('region', '==', region));
        }
        let res = this.query(q, options);
        const str = this.toolService.isValidString(text) ? text.trim() : null;
        if (str) {
            console.log('searchCompetitions(' + text + ',' + options + ') filter by the competition name.');
            res = super.filter(res, (item: Competition) => this.stringContains(str, item.name));
        }
        return res;
    }

    public filterCompetitionsByCoach(competitions: Competition[], coachId: string): Competition[] {
        return competitions.filter((competition) => this.authorized(competition, coachId));
    }

    public authorized(competition: Competition, coachId: string): boolean {
        return competition.refereePanelDirectorId === coachId
                || competition.ownerId === coachId
                || competition.refereeCoaches.filter((coach) => coach.coachId === coachId).length > 0
                || this.connectedUserService.isAdmin();
    }

    public sortCompetitions(competitions: Competition[], reverse: boolean = false): Competition[] {
        if (!competitions) {
            return competitions;
        }
        let array: Competition[] = competitions.sort(this.compareCompetition.bind(this));
        if (reverse) {
            array = array.reverse();
        }
        return array;
    }

    public compareCompetition(competition1: Competition, competition2: Competition): number {
        let res = 0;
        if (res === 0) {
          // Compare date
          res = this.dateService.compareDate(competition1.date, competition2.date);
        }
        if (res === 0) {
          // compare competition name
          res = competition1.name.localeCompare(competition2.name);
        }
        return res;
    }
    public getCompetitionByName(name: string): Observable<ResponseWithData<Competition>> {
        if (!name) {
            return of({data: null, error: null});
        }
        return this.queryOne(query(this.getCollectionRef(), where('name', '==', name)));
    }

    public delete(competitionId: string): Observable<Response> {
        return of('').pipe(
            mergeMap(() => forkJoin([
                this.competitionDayPanelVoteService.onCompetitionDelete(competitionId),
                this.competitionDayRefereeCoachVoteService.onCompetitionDelete(competitionId)]
                )),
            mergeMap(() => {
                console.log('Deleting competition ...');
                return super.delete(competitionId);
            })
        );
    }
    public getCompetitionCategory(competition: Competition, referee: Referee): CompetitionCategory {
        if (referee.referee.refereeCategory === 'SENIOR' && competition.categorySenior) {
          return competition.categorySenior;
        } else {
          return competition.category;
        }
    }

    public canBeAssessed(competition: Competition, referee: Referee): boolean {
        const compCat: CompetitionCategory = this.getCompetitionCategory(competition, referee);
        switch (referee?.referee?.nextRefereeLevel) {
            case 'EURO_3':
            case 'EURO_4':
            case 'EURO_5':
                return compCat === 'C3' || compCat === 'C4' || compCat === 'C5';
        }
        return false;
    }
    public getRefereeUpgradeStatusAsCsv(competition: Competition, day: Date): Observable<any> {
        return this.refereeUpgradeService.getRefereeUpgradeStatusAsCsv(
            competition.referees.map(ref => ref.refereeId),
            day
        );
    }

    public computeVoteAnalysis(competition: Competition,
                               referees: User[],
                               refereeCoaches: User[],
                               coachVotes: CompetitionDayRefereeCoachVote[],
                               panelVotes: CompetitionDayPanelVote[],
                               upgrades: RefereeUpgrade[]
                               ): VoteAnalysis {
        // filter referees to get only upgradable
        const upgradableReferees = referees.filter(r => this.isUpgradableReferee(r));
        const nbDays = competition.days.length;
        const expected =
          upgradableReferees.filter(r => r.referee.nextRefereeLevel === 'EURO_3').length
          * refereeCoaches.filter(c => this.valueIn(c.refereeCoach.refereeCoachLevel, 'EURO_3', 'EURO_4', 'EURO_5')).length
          + upgradableReferees.filter(r => r.referee.nextRefereeLevel === 'EURO_4').length
          * refereeCoaches.filter(c => this.valueIn(c.refereeCoach.refereeCoachLevel, 'EURO_4', 'EURO_5')).length
          + upgradableReferees.filter(r => r.referee.nextRefereeLevel === 'EURO_5').length
          * refereeCoaches.filter(c => this.valueIn(c.refereeCoach.refereeCoachLevel, 'EURO_5')).length
          ;
        // console.log('computeVoteAnalysis: expected=' + expected);
        // console.log('computeVoteAnalysis: coachVotes.length=' + coachVotes.length);
        // console.log('computeVoteAnalysis: panelVotes.length=' + panelVotes.length);
        // console.log('computeVoteAnalysis: upgrades.length=' + upgrades.length);
        const globalAnalysis: VoteAnalysis = competition.days.map(d => {
            const day = this.dateService.to00h00(d);
            // console.log('computeVoteAnalysis: day=' + this.dateService.date2string(day));
            const analysis: VoteAnalysis = {
                day,
                coachVote: { existing: 0, ratio: 0, expected, byCoach: [] },
                panelVote: { existing: 0, ratio: 0, expected: upgradableReferees.length, refereeIds: [] },
                publishedUpgrade: { existing: 0, ratio: 0, expected: upgradableReferees.length, refereeIds: [] }
            };
            coachVotes.forEach(cv => {
                if (cv.day.getTime() === day.getTime()) {
                    const cvs = analysis.coachVote.byCoach.filter(elem => elem.coachId === cv.coach.coachId);
                    // console.log('computeVoteAnalysis: looking for coach (' + cv.coach.coachShortName + '): cvs=' + JSON.stringify(cvs));
                    let cva: CoachVoteAnalysis;
                    if (cvs.length > 0) {
                        cva = cvs[0];
                    } else {
                        cva = {
                            coachId: cv.coach.coachId,
                            coachLevel: refereeCoaches.filter(rc => rc.id === cv.coach.coachId)[0].refereeCoach.refereeCoachLevel,
                            existing: 0,
                            expected: 0,
                            ratio: 0,
                            refereeIds: []
                        };
                        analysis.coachVote.byCoach.push(cva);
                    }
                    if (cva.refereeIds.filter(refereeId => refereeId === cv.referee.refereeId).length === 0) {
                        cva.refereeIds.push(cv.referee.refereeId);
                        cva.existing++;
                        analysis.coachVote.existing++;
                    }
                }
            });
            panelVotes.forEach(pv => {
                if (pv.day.getTime() === day.getTime()) {
                    if (analysis.panelVote.refereeIds.filter(refereeId => refereeId === pv.referee.refereeId).length === 0) {
                        analysis.panelVote.refereeIds.push(pv.referee.refereeId);
                        analysis.panelVote.existing++;
                    }
                }
            });
            upgrades.forEach(u => {
                if (u.decisionDate.getTime() === day.getTime()) {
                    if (analysis.publishedUpgrade.refereeIds.filter(refereeId => refereeId === u.referee.refereeId).length === 0) {
                        analysis.publishedUpgrade.refereeIds.push(u.referee.refereeId);
                        analysis.publishedUpgrade.existing++;
                    }
                }
            });
            analysis.coachVote.byCoach.forEach(cv => {
                cv.expected = upgradableReferees.filter(r => {
                    if (cv.coachLevel === 'EURO_3') {
                        return this.valueIn(r.referee.nextRefereeLevel, 'EURO_3');
                    } else if (cv.coachLevel === 'EURO_4') {
                        return this.valueIn(r.referee.nextRefereeLevel, 'EURO_3', 'EURO_4');
                    } else if (cv.coachLevel === 'EURO_5') {
                        return this.valueIn(r.referee.nextRefereeLevel, 'EURO_3', 'EURO_4', 'EURO_5');
                    } else {
                        return false;
                    }
                }).length;
            });
            return analysis;
        }).reduce((prev, cur) => {
            prev.day = undefined;
            prev.coachVote.byCoach.forEach(cv => cv.refereeIds = undefined);
            prev.panelVote.refereeIds = undefined;
            prev.publishedUpgrade.refereeIds = undefined;
            // console.log('Merging ', JSON.stringify(prev, null, 2), JSON.stringify(cur, null, 2));
            prev.coachVote.existing += cur.coachVote.existing;
            prev.coachVote.expected += cur.coachVote.expected;
            prev.panelVote.existing += cur.panelVote.existing;
            prev.panelVote.expected += cur.panelVote.expected;
            prev.publishedUpgrade.existing += cur.publishedUpgrade.existing;
            prev.publishedUpgrade.expected += cur.publishedUpgrade.expected;

            cur.coachVote.byCoach.forEach(cv => {
                prev.coachVote.byCoach.filter(prevCv => prevCv.coachId === cv.coachId).forEach(prevCv => {
                    prevCv.existing += cv.existing;
                    prevCv.expected += cv.expected;
                });
            });
            return prev;
        });
        globalAnalysis.coachVote.ratio = globalAnalysis.coachVote.existing / globalAnalysis.coachVote.expected;
        globalAnalysis.panelVote.ratio = globalAnalysis.panelVote.existing / globalAnalysis.panelVote.expected;
        globalAnalysis.publishedUpgrade.ratio = globalAnalysis.publishedUpgrade.existing / globalAnalysis.publishedUpgrade.expected;
        globalAnalysis.coachVote.byCoach.forEach(cv => {
            cv.ratio = cv.existing / cv.expected;
            globalAnalysis.coachVote[cv.coachId] = cv;
        });
        return globalAnalysis;
    }

    public isUpgradableReferee(referee: User) {
        return referee.applications.filter(ar => ar.role === 'REFEREE' && ar.name === CurrentApplicationName).length > 0
          && referee.accountStatus === 'ACTIVE'
          && this.valueIn(referee.referee.nextRefereeLevel, 'EURO_3', 'EURO_4', 'EURO_5');
      }
    public valueIn(str: string, ...values: string[]): boolean {
        return values.filter(v => str === v).length > 0;
    }
    public autoComputePanelVote(competition: Competition, referee: Referee, day: Date, updateIfExists = false): Observable<ResponseWithData<CompetitionDayPanelVote>>  {
        const refereeId = referee.id;
        const coachVotes: CompetitionDayRefereeCoachVote[] = [];
        let totalYes = 0;
        let totalNo = 0;
        let panelVote: Upgradable;
        let commentFC = '';
        let commentFR = '';
        console.log(`Looking for Coach Votes (competition=${competition.id}, day=${this.dateService.date2string(day)}, referee=${refereeId})`);
        return forkJoin(competition.refereeCoaches.map(
            rc => this.competitionDayRefereeCoachVoteService.getVote(competition.id, day, rc.coachId, referee.id).pipe(
              map(rcvote => {
                if (rcvote.data) {
                  coachVotes.push(rcvote.data);
                }
              }),
            )
        )).pipe(
            map(() => {
                // compute result
                coachVotes.forEach((v: CompetitionDayRefereeCoachVote) => {
                    switch (v.vote){
                        case 'Yes': totalYes++; break;
                        case 'No': totalNo++; break;
                    }
                });
                const delta = totalYes - totalNo;
                if (delta > 0) {
                    panelVote = 'Yes';
                } else if (delta < 0) {
                    panelVote = 'No';
                } else {
                    panelVote = 'Abstain';
                }
                coachVotes.forEach(cv => {
                    commentFC = this.mergeComments(cv.commentForCoach, commentFC, '-' );
                    commentFR = this.mergeComments(cv.commentForReferee, commentFR, '-' + cv.coach.coachShortName + ':');
                });
            }),
            // load panel vote
            mergeMap(() => this.competitionDayPanelVoteService.getVote(competition.id, day, refereeId)),
            mergeMap((rvote) => {
                let vote: CompetitionDayPanelVote = rvote.data;
                if (!vote) {
                    // panel vote does not exist => create one
                    vote = {
                        id: '',
                        dataStatus: 'NEW',
                        creationDate: new Date(),
                        lastUpdate: new Date(),
                        version: 0,
                        competitionRef: { 
                            competitionId: competition.id,
                            competitionName: competition.name
                        },
                        competitionCategory: this.getCompetitionCategory(competition, referee),
                        day: this.dateService.to00h00(day),
                        referee: {
                            refereeShortName: referee.shortName,
                            refereeId: refereeId
                        },
                        upgradeLevel: referee.referee.nextRefereeLevel,
                        vote: panelVote,
                        commentForCoach: commentFC.length > 0 ? commentFC : '-',
                        commentForReferee: commentFR.length > 0 ? commentFR : '-',
                        closed: false,
                        coaches: competition.refereeCoaches,
                        yesCoaches: coachVotes.filter(cv => cv.vote === 'Yes').map(cv => cv.coach),
                        isMultiDayCompetition: competition.days.length > 1
                    };
                } else if (!updateIfExists) {
                    // panel vote exist and must NOT be updated
                    return of({data: vote, error: null});
                } else {
                    // panel vote exist and must be updated
                    vote.vote = panelVote;
                    vote.coaches = competition.refereeCoaches;
                    vote.yesCoaches = coachVotes.filter(cv => cv.vote === 'Yes').map(cv => cv.coach);
                }
                // save the updated or created panel vote.
                return this.competitionDayPanelVoteService.save(vote);
            })
        );
    }
    private mergeComments(coachComment: string, panelComment: string, prefix: string): string {
        if (coachComment.length > 1) {
          if (panelComment.length > 0) {
            panelComment = panelComment + '<br>-' + coachComment;
          } else {
            panelComment = prefix + coachComment;
          }
        }
        return panelComment;
    }    
}
export interface VoteAnalysis {
    day?: Date;
    coachVote: {
        existing: number;
        expected: number;
        ratio: number;
        byCoach: CoachVoteAnalysis[];
    };
    panelVote: {
        existing: number;
        expected: number;
        ratio: number;
        refereeIds?: string[];
    };
    publishedUpgrade: {
        existing: number;
        expected: number;
        ratio: number;
        refereeIds?: string[];
    };
}
export interface CoachVoteAnalysis {
    coachId: string;
    coachLevel: RefereeCoachLevel;
    existing: number;
    expected: number;
    ratio: number;
    refereeIds?: string[];
}
