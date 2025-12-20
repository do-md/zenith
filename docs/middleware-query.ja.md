# withQuery - 非同期クエリ

> 非同期データフェッチを Zenith Store に統合し、算出プロパティと連携してリアクティブなデータフローを実現。

## クイックスタート

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
  if (userData.state === "Pending") return <div>読み込み中...</div>;
  if (userData.state === "Error") return <div>エラー: {userData.error}</div>;
  return <div>{userData.data?.name}</div>;
}
```

## API リファレンス

### withQuery

```typescript
function withQuery<T extends object>(
  store: BaseStore<T>
): QueryHelper;
```

**戻り値：**

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

**APIState 型：**

```typescript
interface APIState<TData = any> {
  state: FetcherState;      // "Idle" | "Pending" | "Success" | "Error"
  data: TData | undefined;
  error: any;
}
```

## コアコンセプト

### 1. リクエスト状態管理

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

// 状態フロー：Idle → Pending → Success/Error
```

### 2. 条件付きクエリ

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

### 3. 依存関係変更時の自動再フェッチ

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
    // searchResults が自動更新
  }
}
```

## 使用パターン

### 1. リストクエリ

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

### 2. 詳細クエリ

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

### 3. 複数のクエリ

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

## 手動制御

### 1. 手動無効化

```typescript
class TodoStore extends ZenithStore<State> {
  addTodo(text: string) {
    api.addTodo(text).then(() => {
      this.queryHelper.invalidate("todos");
    });
  }
}
```

### 2. ポーリング

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

## ベストプラクティス

### 1. 適切なキー設定

```typescript
// ✅ 良い：キーにすべてのパラメータを含む
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

// ❌ 悪い：キーにパラメータを含まない
@memo((self) => [self.state.userId, self.state.page])
get userData() {
  return this.queryHelper.query(
    () => api.getUser(this.state.userId, this.state.page),
    {
      key: "user", // 間違い！異なるパラメータでキャッシュを共有
      deps: (s) => [s.state.userId, s.state.page],
    }
  );
}
```

### 2. enabled で無効なリクエストを回避

```typescript
// ✅ 良い：userId がある場合のみフェッチ
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

| 機能 | Zenith withQuery | TanStack Query |
|------|------------------|----------------|
| **統合方法** | Store に組み込み | 独立した Hook |
| **状態管理** | Store で統一 | コンポーネントに分散 |
| **算出プロパティ** | ✅ サポート | ❌ |
| **キャッシュ戦略** | deps ベース | key + staleTime ベース |
| **自動リトライ** | ❌ | ✅ |
| **楽観的更新** | 手動 | ✅ |
| **ユースケース** | Store 状態と密結合 | 汎用非同期クエリ |

## 将来の機能強化

計画中の機能（貢献歓迎）：

- [ ] `refetch()` 手動再フェッチ
- [ ] `retry` 自動リトライ
- [ ] `staleTime` 有効期限
- [ ] `cacheTime` キャッシュ時間
- [ ] `isLoading` / `isSuccess` / `isError` 便利プロパティ
- [ ] 楽観的更新サポート

## まとめ

`withQuery` は非同期データフェッチを Zenith Store の一部にします：

- ✅ 状態管理と統一
- ✅ 算出プロパティと連携
- ✅ 自動依存関係追跡
- ✅ クリーンな API

非同期データが Store 状態と密結合しているシナリオに適しています。独立した非同期クエリの場合、TanStack Query が依然として優れた選択肢です。

