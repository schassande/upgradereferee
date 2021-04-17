import { User, UserGroup } from './user';

export interface HasId {
    /** Identifier of the persistent object */
    id: string;
}

export interface PersistentData extends HasId {
    /** Version number of the persistent object */
    version: number;
    /** The creation date of the persistent object */
    creationDate: Date;
    /** The date of the last update of the persistent object */
    lastUpdate: Date;
    /** Status of the persistent object */
    dataStatus: DataStatus;
}

export type DataStatus =
    'CLEAN' /** The persistent object has not been modified. */
    | 'NEW'  /** persistent object is new and does not exist on the back end */
    | 'DIRTY' /** The persistent object exists and has been modified locally. */
    | 'REMOVED' /** The persistent object exists but has been removed locally. */
    ;
/** Object shared with users */
export interface SharedElement {
    /** List of users */
    sharedWith: SharedWithIds;
}
export interface SharedWithIds {
    /** List of users id */
    users: string[];
    /** List of group id */
    groups: string[];
}

export interface SharedWith {
    /** List of users */
    users: User[];
    /** List of group */
    groups: UserGroup[];
}

export type DataRegion =
    'Europe'
    |'Australia'
    |'New Zealand'
    |'Others'
    | ''
    ;

export const DATA_REGIONS =  [ 'Europe', 'Australia', 'New Zealand', 'Others'];
