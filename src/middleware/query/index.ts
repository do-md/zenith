import { BaseStore } from "../../core/BaseStore";
import { FetcherState } from "../../type";

type MemoCacheEntry = {
    value: any;
    deps: any[];
    refCount: number;
};

export interface APIState<TData = any> {
    state: FetcherState
    data: TData | undefined
    error: any
}

// Modified cache structure: use store + propertyName as key
const queryCache = new WeakMap<object, Map<string, MemoCacheEntry>>();

class QueryStore extends BaseStore<{ queryState: Record<string, APIState> }> {
    constructor() {
        super({
            queryState: {}
        });
    }

    public fetcher(service: () => Promise<any>, key: string) {
        if (!this.state.queryState[key]) {
            this.produce((draft) => {
                draft.queryState[key] = {
                    state: FetcherState.Idle,
                    data: undefined,
                    error: undefined
                }
            })
        }

        const currentState = this.state.queryState[key]

        if (currentState.state === FetcherState.Idle) {
            this.produce((draft) => {
                draft.queryState[key] = {
                    state: FetcherState.Pending,
                    data: undefined,
                    error: undefined
                }
            })

            service()
                .then((res) => {
                    this.produce((draft) => {
                        draft.queryState[key] = {
                            state: FetcherState.Success,
                            data: res,
                            error: undefined
                        }
                    })
                })
                .catch((err) => {
                    this.produce((draft) => {
                        draft.queryState[key] = {
                            state: FetcherState.Error,
                            data: undefined,
                            error: err
                        }
                    });
                })
        }

        return this.state.queryState[key]
    }

    public invalidate(key: string) {
        this.produce((draft) => {
            draft.queryState[key] = {
                state: FetcherState.Idle,
                data: undefined,
                error: undefined
            }
        })
    }
}

export function withQuery<T extends object>(store: BaseStore<T>) {
    const queryStore = new QueryStore();

    const idleState = {
        state: FetcherState.Idle,
        data: undefined,
        error: undefined
    }

    queryStore.subscribe(() => {
        store.produce(() => { })
    })

    const query = <TData = any>(
        service: () => Promise<TData>,
        {
            key,
            enabled = () => true,
            deps = () => [],
        }: {
            key: string,
            enabled?: (self: any) => boolean,
            deps?: (self: any) => any[],
        }
    ) => {
        if (!enabled.call(store, store)) return idleState as APIState<TData>;
        let storeMap = queryCache.get(store);
        if (!storeMap) {
            storeMap = new Map();
            queryCache.set(store, storeMap);
        }

        const depsValue = deps.call(store, store);
        const cacheEntry = storeMap.get(key);

        if (cacheEntry) {
            const depsChanged =
                depsValue.length !== cacheEntry.deps.length ||
                depsValue.some((dep, i) => dep !== cacheEntry.deps[i]);

            if (depsChanged && typeof queryStore.invalidate === 'function') {
                queryStore.invalidate(key);
                storeMap.set(key, {
                    value: cacheEntry.value,
                    deps: depsValue,
                    refCount: cacheEntry.refCount
                });
            }
        }

        const fetcherResult = queryStore.fetcher(service, key);

        if (!cacheEntry) {
            storeMap.set(key, {
                value: fetcherResult,
                deps: depsValue,
                refCount: 0,
            });
        }

        return fetcherResult as APIState<TData>;
    }

    return {
        query,
        invalidate: (key: string) => {
            queryStore.invalidate(key);
        }
    }
}