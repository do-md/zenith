# withQuery - 异步查询

> 将异步数据获取集成到 Zenith Store，配合计算属性实现响应式数据流。

## 快速开始

```typescript
import { ZenithStore, memo } from "@do-md/zenith";
import { withQuery, APIState } from "@do-md/zenith/middleware";

class UserStore extends ZenithStore<State> {
  private queryHelper: ReturnType<typeof withQuery>;

  constructor() {
    super({ userId: null });
    this.queryHelper = withQuery(this);
  }

  // 结合 @memo 使用
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

// 使用
function UserProfile() {
  const userData = useStore((s) => s.userData);

  if (userData.state === "Idle") return null;
  if (userData.state === "Pending") return <div>Loading...</div>;
  if (userData.state === "Error") return <div>Error: {userData.error}</div>;
  return <div>{userData.data?.name}</div>;
}
```

## API 参考

### withQuery

```typescript
function withQuery<T extends object>(
  store: BaseStore<T>
): QueryHelper;
```

**返回值：**

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

**APIState 类型：**

```typescript
interface APIState<TData = any> {
  state: FetcherState;      // "Idle" | "Pending" | "Success" | "Error"
  data: TData | undefined;
  error: any;
}
```

## 核心概念

### 1. 请求状态管理

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

// 状态变化：Idle → Pending → Success/Error
```

### 2. 条件查询

```typescript
class TodoStore extends ZenithStore<State> {
  @memo((self) => [self.state.filter])
  get filteredTodos() {
    return this.queryHelper.query(
      () => api.getTodos(this.state.filter),
      {
        key: "todos",
        deps: (s) => [s.state.filter],
        enabled: (s) => s.state.filter !== "none", // 条件查询
      }
    );
  }
}
```

### 3. 依赖变化自动重新请求

```typescript
class SearchStore extends ZenithStore<State> {
  @memo((self) => [self.state.keyword])
  get searchResults() {
    return this.queryHelper.query(
      () => api.search(this.state.keyword),
      {
        key: "search",
        deps: (s) => [s.state.keyword], // keyword 变化自动重新请求
      }
    );
  }

  setKeyword(keyword: string) {
    this.produce((s) => {
      s.keyword = keyword;
    });
    // searchResults 自动更新
  }
}
```

## 使用模式

### 1. 列表查询

```typescript
class ProductStore extends ZenithStore<State> {
  private queryHelper: ReturnType<typeof withQuery>;

  constructor() {
    super({ category: "all", page: 1 });
    this.queryHelper = withQuery(this);
  }

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

  nextPage() {
    this.produce((s) => {
      s.page++;
    });
  }
}

function ProductList() {
  const products = useStore((s) => s.products);

  if (products.state === "Pending") return <Spinner />;
  if (products.state === "Error") return <Error error={products.error} />;

  return (
    <div>
      {products.data?.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
```

### 2. 详情查询

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

  selectUser(userId: string) {
    this.produce((s) => {
      s.selectedUserId = userId;
    });
  }
}
```

### 3. 多个查询组合

```typescript
class DashboardStore extends ZenithStore<State> {
  private queryHelper: ReturnType<typeof withQuery>;

  constructor() {
    super(initialState);
    this.queryHelper = withQuery(this);
  }

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

  @memo((self) => [self.state.userId])
  get userStats() {
    return this.queryHelper.query(
      () => api.getUserStats(this.state.userId),
      { key: "userStats", deps: (s) => [s.state.userId] }
    );
  }
}

function Dashboard() {
  const userInfo = useStore((s) => s.userInfo);
  const userPosts = useStore((s) => s.userPosts);
  const userStats = useStore((s) => s.userStats);

  const isLoading =
    userInfo.state === "Pending" ||
    userPosts.state === "Pending" ||
    userStats.state === "Pending";

  if (isLoading) return <Spinner />;

  return (
    <div>
      <UserInfo data={userInfo.data} />
      <UserPosts data={userPosts.data} />
      <UserStats data={userStats.data} />
    </div>
  );
}
```

## 手动控制

### 1. 手动失效

```typescript
class TodoStore extends ZenithStore<State> {
  private queryHelper: ReturnType<typeof withQuery>;

  @memo((self) => [])
  get todos() {
    return this.queryHelper.query(
      () => api.getTodos(),
      { key: "todos", deps: () => [] }
    );
  }

  addTodo(text: string) {
    api.addTodo(text).then(() => {
      // 手动失效，触发重新请求
      this.queryHelper.invalidate("todos");
    });
  }
}
```

### 2. 轮询

```typescript
class RealtimeStore extends ZenithStore<State> {
  private intervalId?: number;

  constructor() {
    super(initialState);
    const queryHelper = withQuery(this);

    // 开始轮询
    this.intervalId = setInterval(() => {
      queryHelper.invalidate("realtimeData");
    }, 5000);
  }

  @memo((self) => [self.state.timestamp])
  get realtimeData() {
    return this.queryHelper.query(
      () => api.getRealtimeData(),
      { key: "realtimeData", deps: (s) => [s.state.timestamp] }
    );
  }

  destroy() {
    clearInterval(this.intervalId);
  }
}
```

## 最佳实践

### 1. 合理设置 key

```typescript
// ✅ 好：key 包含所有参数
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

// ❌ 差：key 不包含参数，会导致缓存错误
@memo((self) => [self.state.userId, self.state.page])
get userData() {
  return this.queryHelper.query(
    () => api.getUser(this.state.userId, this.state.page),
    {
      key: "user", // 错误！不同参数会共享缓存
      deps: (s) => [s.state.userId, s.state.page],
    }
  );
}
```

### 2. 使用 enabled 避免无效请求

```typescript
// ✅ 好：只在有 userId 时请求
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

// ❌ 差：userId 为 null 时也会请求
@memo((self) => [self.state.userId])
get userData() {
  return this.queryHelper.query(
    () => api.getUser(this.state.userId), // userId 可能为 null
    {
      key: `user-${this.state.userId}`,
      deps: (s) => [s.state.userId],
    }
  );
}
```

### 3. 结合计算属性使用

```typescript
class PostStore extends ZenithStore<State> {
  @memo((self) => [self.state.postId])
  get postData() {
    return this.queryHelper.query(
      () => api.getPost(this.state.postId),
      { key: `post-${this.state.postId}`, deps: (s) => [s.state.postId] }
    );
  }

  // 链式派生
  @memo((self) => [self.postData])
  get postTitle() {
    if (self.postData.state === "Success") {
      return self.postData.data?.title || "";
    }
    return "";
  }
}
```

## 与 TanStack Query 对比

| 特性 | Zenith withQuery | TanStack Query |
|------|------------------|----------------|
| **集成方式** | Store 内置 | 独立 Hook |
| **状态管理** | 统一在 Store | 分散在组件 |
| **计算属性** | ✅ 支持 | ❌ |
| **缓存策略** | 基于 deps | 基于 key + staleTime |
| **自动重试** | ❌ | ✅ |
| **乐观更新** | 手动 | ✅ |
| **适用场景** | 与 Store 状态紧密关联 | 通用异步查询 |

## 未来增强

计划中的功能（欢迎贡献）：

- [ ] `refetch()` 手动重新请求
- [ ] `retry` 自动重试
- [ ] `staleTime` 过期时间
- [ ] `cacheTime` 缓存时间
- [ ] `isLoading` / `isSuccess` / `isError` 便捷属性
- [ ] 乐观更新支持

## 总结

`withQuery` 让异步数据获取成为 Zenith Store 的一部分：

- ✅ 与状态管理统一
- ✅ 配合计算属性使用
- ✅ 自动依赖追踪
- ✅ 简洁的 API

适用于异步数据与 Store 状态紧密关联的场景。对于独立的异步查询，TanStack Query 仍然是更好的选择。

