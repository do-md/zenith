import { produce, enablePatches, applyPatches, Patch } from 'immer';
import { StoreOptions } from '../type';

export class BaseStore<T extends object> {
    // ===== Core State =====
    private _state: T;
    private _initialState: T;

    // ===== Subscribers =====
    private _listeners = new Set<(newState: T, prevState: T) => void>();

    private enablePatch: boolean;


    constructor(
        initState: T,
        {
            enablePatch = false,
        }: StoreOptions = {}) {
        this._state = initState;
        this._initialState = initState;
        this.enablePatch = enablePatch;

        if (enablePatch) {
            enablePatches();
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

    public produce(
        fn: (draft: T) => void,
        options?: {
            patchCallback?: (patches: Patch[], inversePatches: Patch[]) => void;
            actionName?: string;
        }
    ) {
        const { patchCallback } = options || {};
        const prevState = this._state;
        const handlePatches = this.enablePatch ? (patches: Patch[], inversePatches: Patch[]) => {
            patchCallback?.(patches, inversePatches);
        } : undefined;
        const newState = produce(this._state, fn, handlePatches);
        this._state = newState;
        this._listeners.forEach((listener) => listener(newState, prevState));
    }

    public applyPatches(patches: Patch[]) {
        this._state = applyPatches(this._state, patches) as T;
    }
}

