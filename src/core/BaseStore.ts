import { produce, enablePatches, applyPatches, Patch } from 'immer';
import { debounce } from '../utils';
import { HistoryConfig, HistoryState, StoreOptions } from '../type';

export class BaseStore<T extends object> {
    // ===== Core State =====
    private _state: T;
    private _initialState: T;

    // ===== Subscribers =====
    private _listeners = new Set<(newState: T, prevState: T) => void>();

    // ===== History =====
    private _historyConfig: HistoryConfig;
    private _historyState: HistoryState;
    private _clearLastChange?: () => void;

    constructor(
        initState: T,
        {
            enablePatch = false,
            enableHistory = false,
            historyLength = 30,
            historyDebounceTime = 100
        }: StoreOptions = {}) {
        this._state = initState;
        this._initialState = initState;

        this._historyConfig = {
            enabled: enableHistory,
            maxLength: historyLength,
            debounceTime: historyDebounceTime,
        };

        this._historyState = {
            list: [],
            cursor: 0,
            last: undefined,
            preventPatches: false,
            keepRecord: false,
        };

        if (enablePatch) {
            enablePatches();
        }

        if (enableHistory) {
            this._clearLastChange = debounce(() => {
                this._historyState.last = undefined;
            }, historyDebounceTime + 100);
        }
    }


    public get initialState() {
        return this._initialState;
    }

    public get state() {
        return this._state;
    }

    public subscribe = (listener: (newState: T, prevState: T) => void) => {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }

    public updateKeepRecord(keepRecord: boolean) {
        this._historyState.keepRecord = keepRecord;
    }

    public produceData(
        fn: (draft: T) => void,
        disableRecord = false,
        patchCallback?: (patches: Patch[], inversePatches: Patch[]) => void,
    ) {
        const prevState = this._state;
        const newState = produce(this._state, fn, (patches, inversePatches) => {
            const { enabled } = this._historyConfig;
            const { preventPatches } = this._historyState;
            if (enabled && !preventPatches && !disableRecord) {
                this.recordHistory(patches, inversePatches);
            }
            patchCallback?.(patches, inversePatches);
        });
        this._state = newState;
        this._listeners.forEach((listener) => listener(newState, prevState));
    }

    private recordHistory(patches: Patch[], inversePatches: Patch[]) {
        const { maxLength } = this._historyConfig;
        const state = this._historyState;

        if (!state.last) {
            while (state.cursor < state.list.length - 1) {
                state.list.pop();
            }
            if (state.list.length > maxLength) {
                state.list.shift();
            }
            state.last = {
                patches: [patches],
                inversePatches: [inversePatches],
            };
            state.list.push(state.last);
            state.cursor = state.list.length - 1;
        } else {
            state.last.patches.push(patches);
            state.last.inversePatches.unshift(inversePatches);
        }

        if (!state.keepRecord) {
            this._clearLastChange?.();
        }
    }

    public undo() {
        const { debounceTime, enabled } = this._historyConfig;
        if (!enabled) throw new Error('History is not enabled');
        const state = this._historyState;

        if (state.cursor < 0) return;
        const history = state.list[state.cursor];

        if (history) {
            history.inversePatches.forEach((inversePatches) => {
                this._state = applyPatches(this._state, inversePatches) as T;
            });
            state.preventPatches = true;
            setTimeout(() => {
                state.preventPatches = false;
            }, debounceTime);
            state.cursor -= 1;
        }
    }

    public redo() {
        const { debounceTime, enabled } = this._historyConfig;
        if (!enabled) throw new Error('History is not enabled');
        const state = this._historyState;

        const history = state.list[state.cursor + 1];
        if (history) {
            history.patches.forEach((patches) => {
                this._state = applyPatches(this._state, patches) as T;
            });
            state.preventPatches = true;
            setTimeout(() => {
                state.preventPatches = false;
            }, debounceTime);
            state.cursor += 1;
        }
    }
}

