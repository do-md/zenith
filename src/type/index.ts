import { Patch } from 'immer';
import { BaseStore } from '../core/BaseStore';

export interface History {
    patches: Patch[][];
    inversePatches: Patch[][];
}

export interface HistoryConfig {
    enabled: boolean;
    maxLength: number;
    debounceTime: number;
}

export interface HistoryState {
    list: History[];
    cursor: number;
    last?: History;
    preventPatches: boolean;
    keepRecord: boolean;
}

export interface StoreOptions {
    enablePatch?: boolean;
    enableHistory?: boolean;
    historyLength?: number;
    historyDebounceTime?: number;
}

// Extract state type from store
export type ExtractState<S> = S extends BaseStore<infer T> ? T : never;

export const identity = <T>(arg: T): T => arg;