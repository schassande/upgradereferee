import { Upgradable } from './coaching';
import { PersistentData } from './common';
import { CoachRef, RefereeRef } from './competition';
import { RefereeLevel } from './user';

/**
 * The upgrade decision about a referee during a competition by the panel of the referee coaches.
 */
export interface CompetitionRefereeUpgrade extends  PersistentData {
    /** Identifier of the evaluated referee */
    refereeId: string;
    /** Short name of the evaluated referee */
    refereeShortName: string;
    /** Identifier of the competition where the referee has been observed */
    competitionId: string;
    /** Final vote of the referee coach about the referee during the competition */
    votes: any;
    /** The final decision of the panel */
    finalDecision: Upgradable;
    /** the season/year of the competition when the referee has been evaluated */
    season: string;
}

/**
 * A vote from a coach
 */
export interface UpgradeVote {
    /** Identifier of the voting coach if it is an app user. Otherwise it is the short name */
    coachId: string;
    /** The vote value */
    vote: Upgradable;
    /**
     * Does the vote is done by the user itself
     * Yes : the vote has been made by the panel director.
     * No : the user voted himself
     */
    force: boolean;
    /** does the referee coach is a user of the application. */
    isUser: boolean;
}
/** A vote during a day of a competition */
export interface CompetitionDayVote {
    /** Identifier of the competition where the referee has been observed */
    competitionId: string;
    /** Day of the competition */
    day: Date;
    /** The evaluated referee */
    referee: RefereeRef;
    /** The level to upgrade */
    upgradeLevel: RefereeLevel;
    /** The vote value */
    vote: Upgradable;
    /** Does the vote is closed */
    closed: boolean;
    /** Comment about the vote */
    commentForReferee: string;
    /** Comment about the vote */
    commentForCoach: string;
}
/** A vote about a referee during a day of a competition by a referee coach */
export interface CompetitionDayRefereeCoachVote extends  CompetitionDayVote, PersistentData {
    /** The the voting coach */
    coach: CoachRef;
 }
/** The panel upgrade decision about a referee during a day of a competition by the panel */
export interface CompetitionDayPanelVote extends  CompetitionDayVote, PersistentData {
    /** The the voting coach */
    coaches: CoachRef[];
}

export interface RefereeUpgrade extends PersistentData {
    /** The evaluated referee */
    referee: RefereeRef;
    /** The level to upgrade */
    upgradeLevel: RefereeLevel;
    /** The vote value */
    upgradeStatus: Upgradable;
    statusDate: Date;
    /** Number of competition which is multi-day */
    multiDay: number;
    yesRefereeCoach: number;
    c3PanelVoteIds: string[];
    c4PanelVoteIds: string[];
    c5PanelVoteIds: string[];
}
/**
 * Definition the upgrade criteria for a referee upgrade.
 */
export interface UpgradeCriteria extends PersistentData {
    /** Date (included) since the criteria is applied */
    beginDate: Date;
    /** Date (included) until the criteria is applied */
    endDate: Date;

    /** The level to upgrade */
    upgradeLevel: RefereeLevel;

    /** Number of competition which is multi-day */
    multiDayRequired: number;

    /** Number of required referee coach with the expected level (or higher) said yes */
    yesRefereeCoachRequired: number;

    /** Number of Category 3+ competition days required in the window */
    c3DaysRequired: number;
    /** Number of Category 4+ competition days required in the window */
    c4DaysRequired: number;
    /** Number of Category 5 competition days required in the window */
    c5DaysRequired: number;
    /** Number of competition days required in the window */
    daysRequired: number;

    /** Number of yes days required in the window */
    totalYesRequired: number;
    /** Number of yes C3 days required in the window */
    c3YesRequired: number;
    /** Number of yes C4 days required in the window */
    c4YesRequired: number;
    /** Number of yes C5 days required in the window */
    c5YesRequired: number;
}
