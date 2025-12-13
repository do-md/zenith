import { BaseStore } from "./BaseStore";

type MemoCacheEntry = {
  value: any;
  deps: any[];
  refCount: number;
};

// Modified cache structure: use store + propertyName as key
const memoCache = new WeakMap<object, Map<string, MemoCacheEntry>>();

export function memo(getDeps: (self: any) => any[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    const originalGetter = descriptor.get;
    if (!originalGetter) throw new Error('@memo can only be used on getters');

    descriptor.get = function () {
      const store = this;
      let storeMap = memoCache.get(store);
      if (!storeMap) {
        storeMap = new Map();
        memoCache.set(store, storeMap);
      }

      const deps = getDeps.call(store, store);
      const cacheEntry = storeMap.get(propertyKey);

      if (cacheEntry) {
        const depsChanged =
          deps.length !== cacheEntry.deps.length ||
          deps.some((dep, i) => dep !== cacheEntry.deps[i]);

        if (!depsChanged) return cacheEntry.value;
      }

      const value = originalGetter.call(store);
      storeMap.set(propertyKey, {
        value,
        deps: [...deps],
        refCount: cacheEntry?.refCount ?? 0,
      });

      return value;
    };

  };
}

export function trackGetterAccess(store: object, propertyName: string) {
  const storeMap = memoCache.get(store);

  const entry = storeMap?.get(propertyName);
  if (entry) {
    entry.refCount++;
  }
}

export function untrackGetterAccess(store: object, propertyName: string) {
  const storeMap = memoCache.get(store);
  const entry = storeMap?.get(propertyName);
  if (entry) {
    entry.refCount--;
    if (entry.refCount <= 0) {
      storeMap?.delete(propertyName);
    }
  }
}

// Helper function to get property name
export function getPropertyName<S extends BaseStore<any>>(
  store: S,
  getter: (store: S) => unknown
): string | null {
  let accessedKey: string | null = null;

  const proxy = new Proxy({}, {
    get(_, key: string) {
      accessedKey = key;
      return store[key as keyof typeof store];
    },
  }) as S;

  try {
    getter(proxy);
  } catch {
    // Ignore exceptions, only used for access
  }

  return accessedKey;
}

