# API リファレンス

## コア API

### ZenithStore

すべての状態管理クラスが継承すべき基本 Store クラス。

```typescript
class MyStore extends ZenithStore<State> {
  constructor(initialState: State, options?: StoreOptions);

  // コアメソッド（Immer ベース）
  protected produce(
    fn: (draft: State) => void,
    options?: {
      patchCallback?: (patches: Patch[], inversePatches: Patch[]) => void;
      actionName?: string;
    }
  ): void;

  subscribe(listener: (newState: State, prevState: State) => void): () => void;

  applyPatches(patches: Patch[]): void;

  // プロパティ
  state: State; // 現在の状態（読み取り専用）
  initialState: State; // 初期状態
}
```

**パラメータ：**

- `initialState`: 初期状態オブジェクト
- `options`: オプション設定
  - `enablePatch`: Immer Patches を有効化（デフォルト `false`）

**メソッド：**

- `produce()`: Immer を使用して状態を更新（protected、Store 内でのみ呼び出し可能）
  - `fn`: 状態更新関数
  - `options.patchCallback`: Patches コールバック（`enablePatch: true` が必要）
  - `options.actionName`: アクション名（DevTools 用）
- `subscribe()`: 状態変更をサブスクライブ、アンサブスクライブ関数を返す
- `applyPatches()`: Immer Patches を適用

---

### @memo デコレータ

算出プロパティを作成し、自動キャッシュと安定した参照を提供。

```typescript
@memo((self: Store) => [dependency1, dependency2, ...])
get computedProperty() {
  return expensiveComputation(...)
}
```

**パラメータ：**

- `getDeps`: 依存関係取得関数、依存配列を返す
  - 依存関係が変更されていない場合、キャッシュ値を返す
  - 依存関係が変更された場合、再計算

**特徴：**

- ✅ 自動キャッシュ：依存関係が変更されていない場合、同じ参照を返す
- ✅ 連鎖派生：他の @memo プロパティに依存可能
- ✅ RefCount 管理：コンポーネントが使用していない場合、自動クリーンアップ

**例：**

```typescript
class TodoStore extends ZenithStore<State> {
  // 単一の依存関係
  @memo((self) => [self.state.todos])
  get activeTodos() {
    return this.state.todos.filter((t) => !t.completed);
  }

  // 複数の依存関係
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    return this.state.todos.filter((t) => t.type === this.state.filter);
  }

  // 連鎖派生
  @memo((self) => [self.filteredTodos])
  get sortedTodos() {
    return [...this.filteredTodos].sort((a, b) => a.order - b.order);
  }
}
```

---

## React API

### createReactStore

React Store を作成し、Provider と Hooks を自動生成。

```typescript
const { StoreProvider, useStore, useStoreApi } = createReactStore(StoreClass);
```

**戻り値：**

- `StoreProvider`: Store Provider コンポーネント
- `useStore`: 状態をサブスクライブする Hook
- `useStoreApi`: Store インスタンスを取得する Hook

**例：**

```typescript
import { createReactStore } from "@do-md/zenith";

class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produce((s) => {
      s.count++;
    });
  }
}

const { StoreProvider, useStore, useStoreApi } = createReactStore(CounterStore);

function Counter() {
  const count = useStore((s) => s.state.count);
  const store = useStoreApi();

  return <button onClick={() => store.increment()}>{count}</button>;
}

function App() {
  return (
    <StoreProvider initialProps={undefined}>
      <Counter />
    </StoreProvider>
  );
}
```

---

## Middleware API

### withHistory

アンドゥ/リドゥ機能を追加（Immer Patches ベース）。

```typescript
import { withHistory } from "@do-md/zenith/middleware";

const history = withHistory(store, options);
```

**オプション：**

```typescript
interface HistoryOptions {
  maxLength?: number; // 最大履歴長（デフォルト 30）
  debounceTime?: number; // デバウンス時間（ms、デフォルト 100）
}
```

**戻り値：**

```typescript
{
  undo: () => void;
  redo: () => void;
  updateKeepRecord: (keep: boolean) => void;
  produce: (fn, options) => void;
}
```

---

### withQuery

非同期クエリ機能を追加。

```typescript
import { withQuery, APIState } from "@do-md/zenith/middleware";

const { query, invalidate } = withQuery(store);
```

**APIState 型：**

```typescript
interface APIState<TData = any> {
  state: FetcherState; // "Idle" | "Pending" | "Success" | "Error"
  data: TData | undefined;
  error: any;
}
```

---

### devtools

Redux DevTools と統合。

```typescript
import { devtools } from "@do-md/zenith/middleware";

devtools(store, options);
```

**オプション：**

```typescript
interface DevtoolsOptions {
  name?: string; // Store 名
  enabled?: boolean; // 有効化（デフォルト true）
}
```

---

## ベストプラクティス

### 1. 算出プロパティの依存関係

```typescript
// ✅ 良い：明確な依存関係
@memo((self) => [self.state.todos, self.state.filter])
get filteredTodos() { ... }

// ❌ 悪い：依存関係の欠落
@memo((self) => [self.state.todos])
get filteredTodos() {
  return this.state.todos.filter(t => t.type === this.state.filter)
}
```

### 2. 連鎖派生

```typescript
// ✅ 良い：連鎖派生、最適なパフォーマンス
@memo((self) => [self.state.data])
get filtered() { return this.state.data.filter(...) }

@memo((self) => [self.filtered])
get sorted() { return [...this.filtered].sort(...) }
```

### 3. Middleware の組み合わせ

```typescript
class MyStore extends ZenithStore<State> {
  constructor() {
    super(initialState, { enablePatch: true });

    const history = withHistory(this);
    const query = withQuery(this);
    devtools(this, { name: "MyStore" });

    this.undo = history.undo;
    this.redo = history.redo;
    this.query = query.query;
  }
}
```

---

## マイグレーションガイド

### Zustand から

```typescript
// Zustand
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Zenith
class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produce((s) => {
      s.count++;
    });
  }
}
const { useStore } = createReactStore(CounterStore);
```

### MobX から

```typescript
// MobX
class TodoStore {
  @observable todos = [];

  @computed get activeTodos() {
    return this.todos.filter((t) => !t.completed);
  }

  @action addTodo(text) {
    this.todos.push({ text, completed: false });
  }
}

// Zenith
class TodoStore extends ZenithStore<{ todos: Todo[] }> {
  @memo((self) => [self.state.todos])
  get activeTodos() {
    return this.state.todos.filter((t) => !t.completed);
  }

  addTodo(text: string) {
    this.produce((s) => {
      s.todos.push({ text, completed: false });
    });
  }
}
```

