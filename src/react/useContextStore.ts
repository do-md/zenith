import { useContext, useDebugValue, useEffect, useSyncExternalStore } from 'react'

import { BaseStore } from '../core/BaseStore'
import { getPropertyName, trackGetterAccess, untrackGetterAccess } from '../core/memo'
import { ExtractState, identity } from '../type';




// Overload: no selector - returns full state
export function useContextStore<S extends BaseStore<any>>(
  storeContext: React.Context<S | null>
): [ExtractState<S>, S]

// Overload: with selector - returns selected slice
export function useContextStore<S extends BaseStore<any>, U>(
  storeContext: React.Context<S | null>,
  selector: (state: ExtractState<S>) => U
): [U, S]

// Implementation
export function useContextStore<S extends BaseStore<any>, U = ExtractState<S>>(
  storeContext: React.Context<S | null>,
  selector: (state: ExtractState<S>) => U = identity as any
): [U, S] {
  const store = useContext(storeContext)
  if (!store) {
    throw new Error('useContextStore must be used within a store provider')
  }

  const slice = useSyncExternalStore(
    store.subscribe,
    () => selector(store.state as ExtractState<S>),
    () => selector(store.initialState as ExtractState<S>)
  )
  useDebugValue(slice)
  return [slice, store]
}

export function useContextGetter<S extends BaseStore<any>, TReturn>(
  storeContext: React.Context<S | null>,
  getter: (store: S) => TReturn
): TReturn {
  const store = useContext(storeContext)
  if (!store) {
    throw new Error('useContextGetter must be used within a store provider')
  }

  const slice = useSyncExternalStore(
    store.subscribe,
    () => getter(store),
    () => getter(store),
  )

  useEffect(() => {
    const propertyName = getPropertyName(store, getter);
    if (propertyName) {
      trackGetterAccess(store, propertyName);
      return () => {
        untrackGetterAccess(store, propertyName)
      }
    }
  }, []);

  return slice;
}

