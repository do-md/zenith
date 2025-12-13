import { useDebugValue, useEffect, useSyncExternalStore } from 'react'

import { BaseStore } from '../core/BaseStore'
import { getPropertyName, trackGetterAccess, untrackGetterAccess } from '../core/memo'
import { ExtractState, identity } from '../type';

// Overload: no selector - returns full state
export function useStore<S extends BaseStore<any>>(
  store: S
): [ExtractState<S>, S]

// Overload: with selector - returns selected slice
export function useStore<S extends BaseStore<any>, U>(
  store: S,
  selector: (state: ExtractState<S>) => U
): [U, S]

// Implementation
export function useStore<S extends BaseStore<any>, U = ExtractState<S>>(
  store: S,
  selector: (state: ExtractState<S>) => U = identity as any
): [U, S] {
  const slice = useSyncExternalStore(
    store.subscribe,
    () => selector(store.state as ExtractState<S>),
    () => selector(store.initialState as ExtractState<S>)
  )
  useDebugValue(slice)
  return [slice, store]
}

export function useGetter<S extends BaseStore<any>, TReturn>(
  store: S,
  getter: (store: S) => TReturn
): TReturn {
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

