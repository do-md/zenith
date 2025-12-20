# devtools - Redux DevTools 統合

> 開発環境で Redux DevTools を使用して Zenith Store をデバッグ。

## クイックスタート

```typescript
import { ZenithStore } from "@do-md/zenith";
import { devtools } from "@do-md/zenith/middleware";

class CounterStore extends ZenithStore<State> {
  constructor() {
    super({ count: 0 });

    if (process.env.NODE_ENV === "development") {
      devtools(this, { name: "CounterStore" });
    }
  }

  increment() {
    this.produce(
      (s) => {
        s.count++;
      },
      { actionName: "INCREMENT" }
    );
  }
}
```

## API リファレンス

### devtools

```typescript
function devtools<T extends object>(
  store: BaseStore<T>,
  options?: DevtoolsOptions
): () => void;
```

**オプション：**

```typescript
interface DevtoolsOptions {
  name?: string;        // Store 名（デフォルトはクラス名）
  enabled?: boolean;    // 有効化（デフォルト true）
  features?: {
    pause?: boolean;
    lock?: boolean;
    persist?: boolean;
    export?: boolean;
    import?: string;
    jump?: boolean;
    skip?: boolean;
    reorder?: boolean;
    dispatch?: boolean;
  };
}
```

**戻り値：** クリーンアップ関数。呼び出すと DevTools との接続を切断します。

## 機能

### 1. アクショントラッキング

```typescript
class TodoStore extends ZenithStore<TodoState> {
  constructor() {
    super({ todos: [] });
    devtools(this, { name: "TodoStore" });
  }

  addTodo(text: string) {
    this.produce(
      (s) => {
        s.todos.push({ id: nanoid(), text, completed: false });
      },
      { actionName: "ADD_TODO" }
    );
  }

  toggleTodo(id: string) {
    this.produce(
      (s) => {
        const todo = s.todos.find((t) => t.id === id);
        if (todo) todo.completed = !todo.completed;
      },
      { actionName: `TOGGLE_TODO/${id}` }
    );
  }
}

// DevTools で表示：
// ADD_TODO
// TOGGLE_TODO/abc123
// ...
```

### 2. タイムトラベルデバッグ

DevTools の任意のアクションをクリックすると、Store の状態がその時点にジャンプします。

### 3. ステートのエクスポート/インポート

DevTools はステートのエクスポートとインポートをサポート：
- バグの再現
- ステートスナップショットの共有
- 特定の状態のテスト

### 4. Diff ビュー

各アクションによって引き起こされた状態の変更を表示：

```typescript
class CartStore extends ZenithStore<CartState> {
  addItem(item: Item) {
    this.produce(
      (s) => {
        s.items.push(item);
        s.total += item.price;
      },
      { actionName: "ADD_ITEM" }
    );
  }
}

// DevTools Diff ビューに表示：
// + items[0]: { id: 1, name: "Product", price: 99 }
// ~ total: 0 → 99
```

## 高度な使用法

### 1. 複数の Store

```typescript
class UserStore extends ZenithStore<UserState> {
  constructor() {
    super(initialState);
    devtools(this, { name: "UserStore" });
  }
}

class CartStore extends ZenithStore<CartState> {
  constructor() {
    super(initialState);
    devtools(this, { name: "CartStore" });
  }
}

// DevTools で2つの独立した Store を表示
```

### 2. 条件付き有効化

```typescript
class MyStore extends ZenithStore<State> {
  constructor() {
    super(initialState);

    // 開発環境のみ
    if (process.env.NODE_ENV === "development") {
      devtools(this, { name: "MyStore" });
    }
  }
}
```

## ベストプラクティス

### 1. 意味のあるアクション名

```typescript
// ✅ 良い：明確なアクション名
increment() {
  this.produce((s) => { s.count++; }, { actionName: "INCREMENT" });
}

// ❌ 悪い：アクション名なし
increment() {
  this.produce((s) => { s.count++; });
  // DevTools に "STATE_UPDATE" と表示
}
```

### 2. コンテキストを含める

```typescript
// ✅ 良い：具体的な情報を含む
updateUser(userId: string, data: UserData) {
  this.produce(
    (s) => { s.users[userId] = data; },
    { actionName: `UPDATE_USER/${userId}` }
  );
}
```

### 3. 関連するアクションをグループ化

```typescript
class TodoStore extends ZenithStore<TodoState> {
  addTodo(text: string) {
    this.produce((s) => { ... }, { actionName: "TODO/ADD" });
  }

  removeTodo(id: string) {
    this.produce((s) => { ... }, { actionName: "TODO/REMOVE" });
  }

  setFilter(filter: string) {
    this.produce((s) => { ... }, { actionName: "FILTER/SET" });
  }
}
```

## よくある質問

### Q: DevTools が表示されない？

A: Redux DevTools 拡張機能がインストールされていることを確認してください：
- [Chrome](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

### Q: "STATE_UPDATE" と表示される？

A: `actionName` が提供されていません：

```typescript
this.produce((s) => { ... }, { actionName: "MY_ACTION" });
```

### Q: 本番環境でのパフォーマンスへの影響は？

A: ありません。開発環境でのみ有効化：

```typescript
if (process.env.NODE_ENV === "development") {
  devtools(this);
}
```

## まとめ

`devtools` middleware は Zenith Store に強力なデバッグ機能を提供します：

- ✅ ゼロ設定の Redux DevTools 統合
- ✅ アクショントラッキングとタイムトラベル
- ✅ ステートのエクスポート/インポート
- ✅ Diff ビュー
- ✅ 複数 Store サポート

開発環境で必須のデバッグツール。

