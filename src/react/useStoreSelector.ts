import { useDebugValue, useEffect, useSyncExternalStore } from 'react'

import { BaseStore } from '../core/BaseStore'
import { getPropertyName, trackGetterAccess, untrackGetterAccess } from '../core/memo'

export function useStoreSelector<S extends BaseStore<any>, TReturn>(
  store: S,
  selector: (store: S) => TReturn
): TReturn {
  const slice = useSyncExternalStore(
    store.subscribe,
    () => selector(store),
    () => selector(store),
  )
  useDebugValue(slice)
  useEffect(() => {
    const propertyName = getPropertyName(store, selector);
    if (propertyName) {
      trackGetterAccess(store, propertyName);
      return () => {
        untrackGetterAccess(store, propertyName)
      }
    }
  }, []);

  return slice;
}

