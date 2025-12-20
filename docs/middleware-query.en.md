# withQuery - Async Queries

> Integrate async data fetching into Zenith Store, works with computed properties for reactive data flow.

## Quick Start

```typescript
import { ZenithStore, memo } from "@do-md/zenith";
import { withQuery, APIState } from "@do-md/zenith/middleware";

class UserStore extends ZenithStore<State> {
  private queryHelper: ReturnType<typeof withQuery>;

  constructor() {
    super({ userId: null });
    this.queryHelper = withQuery(this);
  }

  @memo((self) => [self.state.userId])
  get userData() {
    return this.queryHelper.query(
      () => fetchUser(this.state.userId),
      {
        key: "user",
        deps: (s) => [s.state.userId],
        enabled: (s) => !!s.state.userId,
      }
    );
  }
}

function UserProfile() {
  const userData = useStore((s) => s.userData);

  if (userData.state === "Idle") return null;
  if (userData.state === "Pending") return <div>Loading...</div>;
  if (userData.state === "Error") return <div>Error: {userData.error}</div>;
  return <div>{userData.data?.name}</div>;
}
```

## API Reference

### withQuery

```typescript
function withQuery<T extends object>(
  store: BaseStore<T>
): QueryHelper;
```

**Returns:**

```typescript
interface QueryHelper {
  query: <TData>(
    service: () => Promise<TData>,
    options: {
      key: string;
      enabled?: (self: Store) => boolean;
      deps?: (self: Store) => any[];
    }
  ) => APIState<TData>;

  invalidate: (key: string) => void;
}
```

**APIState Type:**

```typescript
interface APIState<TData = any> {
  state: FetcherState;      // "Idle" | "Pending" | "Success" | "Error"
  data: TData | undefined;
  error: any;
}
```

## Core Concepts

### 1. Request State Management

```typescript
class PostStore extends ZenithStore<State> {
  private queryHelper: ReturnType<typeof withQuery>;

  constructor() {
    super({ postId: null });
    this.queryHelper = withQuery(this);
  }

  @memo((self) => [self.state.postId])
  get postData() {
    return this.queryHelper.query(
      () => api.getPost(this.state.postId),
      { key: "post", deps: (s) => [s.state.postId] }
    );
  }
}

// State flow: Idle → Pending → Success/Error
```

### 2. Conditional Queries

```typescript
class TodoStore extends ZenithStore<State> {
  @memo((self) => [self.state.filter])
  get filteredTodos() {
    return this.queryHelper.query(
      () => api.getTodos(this.state.filter),
      {
        key: "todos",
        deps: (s) => [s.state.filter],
        enabled: (s) => s.state.filter !== "none",
      }
    );
  }
}
```

### 3. Auto Refetch on Deps Change

```typescript
class SearchStore extends ZenithStore<State> {
  @memo((self) => [self.state.keyword])
  get searchResults() {
    return this.queryHelper.query(
      () => api.search(this.state.keyword),
      {
        key: "search",
        deps: (s) => [s.state.keyword],
      }
    );
  }

  setKeyword(keyword: string) {
    this.produce((s) => {
      s.keyword = keyword;
    });
    // searchResults auto-updates
  }
}
```

## Usage Patterns

### 1. List Query

```typescript
class ProductStore extends ZenithStore<State> {
  @memo((self) => [self.state.category, self.state.page])
  get products() {
    return this.queryHelper.query(
      () => api.getProducts({
        category: this.state.category,
        page: this.state.page,
      }),
      {
        key: `products-${this.state.category}-${this.state.page}`,
        deps: (s) => [s.state.category, s.state.page],
      }
    );
  }
}
```

### 2. Detail Query

```typescript
class UserStore extends ZenithStore<State> {
  @memo((self) => [self.state.selectedUserId])
  get userDetail() {
    return this.queryHelper.query(
      () => api.getUserDetail(this.state.selectedUserId),
      {
        key: `user-${this.state.selectedUserId}`,
        deps: (s) => [s.state.selectedUserId],
        enabled: (s) => !!s.state.selectedUserId,
      }
    );
  }
}
```

### 3. Multiple Queries

```typescript
class DashboardStore extends ZenithStore<State> {
  @memo((self) => [self.state.userId])
  get userInfo() {
    return this.queryHelper.query(
      () => api.getUserInfo(this.state.userId),
      { key: "userInfo", deps: (s) => [s.state.userId] }
    );
  }

  @memo((self) => [self.state.userId])
  get userPosts() {
    return this.queryHelper.query(
      () => api.getUserPosts(this.state.userId),
      { key: "userPosts", deps: (s) => [s.state.userId] }
    );
  }
}
```

## Manual Control

### 1. Manual Invalidation

```typescript
class TodoStore extends ZenithStore<State> {
  addTodo(text: string) {
    api.addTodo(text).then(() => {
      this.queryHelper.invalidate("todos");
    });
  }
}
```

### 2. Polling

```typescript
class RealtimeStore extends ZenithStore<State> {
  private intervalId?: number;

  constructor() {
    super(initialState);
    const queryHelper = withQuery(this);

    this.intervalId = setInterval(() => {
      queryHelper.invalidate("realtimeData");
    }, 5000);
  }

  destroy() {
    clearInterval(this.intervalId);
  }
}
```

## Best Practices

### 1. Proper Key Setting

```typescript
// ✅ Good: Key includes all parameters
@memo((self) => [self.state.userId, self.state.page])
get userData() {
  return this.queryHelper.query(
    () => api.getUser(this.state.userId, this.state.page),
    {
      key: `user-${this.state.userId}-${this.state.page}`,
      deps: (s) => [s.state.userId, s.state.page],
    }
  );
}

// ❌ Bad: Key doesn't include parameters
@memo((self) => [self.state.userId, self.state.page])
get userData() {
  return this.queryHelper.query(
    () => api.getUser(this.state.userId, this.state.page),
    {
      key: "user", // Wrong! Different parameters share cache
      deps: (s) => [s.state.userId, s.state.page],
    }
  );
}
```

### 2. Use enabled to Avoid Invalid Requests

```typescript
// ✅ Good: Only fetch when userId exists
@memo((self) => [self.state.userId])
get userData() {
  return this.queryHelper.query(
    () => api.getUser(this.state.userId),
    {
      key: `user-${this.state.userId}`,
      deps: (s) => [s.state.userId],
      enabled: (s) => !!s.state.userId,
    }
  );
}
```

## vs TanStack Query

| Feature | Zenith withQuery | TanStack Query |
|---------|------------------|----------------|
| **Integration** | Built into Store | Independent Hook |
| **State Management** | Unified in Store | Distributed in components |
| **Computed Properties** | ✅ Supported | ❌ |
| **Cache Strategy** | Based on deps | Based on key + staleTime |
| **Auto Retry** | ❌ | ✅ |
| **Optimistic Updates** | Manual | ✅ |
| **Use Case** | Tightly coupled with Store state | General async queries |

## Future Enhancements

Planned features (contributions welcome):

- [ ] `refetch()` manual refetch
- [ ] `retry` auto retry
- [ ] `staleTime` expiration time
- [ ] `cacheTime` cache time
- [ ] `isLoading` / `isSuccess` / `isError` convenience properties
- [ ] Optimistic updates support

## Summary

`withQuery` makes async data fetching part of Zenith Store:

- ✅ Unified with state management
- ✅ Works with computed properties
- ✅ Auto dependency tracking
- ✅ Clean API

Suitable for scenarios where async data is tightly coupled with Store state. For independent async queries, TanStack Query remains the better choice.

