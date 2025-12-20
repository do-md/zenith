# Zenith

**エンジニアリンググレードの React 状態管理 · Immer の強力な機能**

[![npm version](https://img.shields.io/npm/v/@do-md/zenith.svg)](https://www.npmjs.com/package/@do-md/zenith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Powered by Immer](https://img.shields.io/badge/Powered%20by-Immer-00D8FF)](https://immerjs.github.io/immer/)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

---

## 📑 クイックナビゲーション

**[🚀 クイックスタート](#-クイックスタート)** · **[📊 包括的な比較](#-包括的な比較)** · **[🎯 実世界の例](#-実世界の例domd)**

---

## ✨ なぜ Zenith？

**Zustand のようにシンプル、MobX のようにパワフル**

Zustand のシンプルさ、MobX のリアクティブな能力、そして独自のエンジニアリング機能を実現

> **Zenith = Zustand の使いやすさ + MobX の算出プロパティ + 両者を超えるエンジニアリング**

- 🎯 **Zustand の API** — 軽量、直感的、ゼロ設定、5分で開始
- 🧲 **MobX の能力** — 算出プロパティ、連鎖派生、安定した参照、無効なレンダリングを排除
- 🔧 **独自のエンジニアリング** — Middleware アーキテクチャ、Immer Patches、DevTools、非同期クエリ
- 🏢 **チーム向け** — 強制カプセル化、TypeScript 優先、ビジネスロジックのバイパス不可

## 🎯 コア機能

### 1️⃣ **算出プロパティ + 連鎖派生：リアクティブシステムのコア**

> 算出プロパティと連鎖派生により、コードは「単方向データフロー」の原則に従います：**書き込み側はアトミックステートのみを変更し、読み取り側は自動的に最新の派生ステートを取得**

```typescript
import { ZenithStore, memo } from "@do-md/zenith";

interface State {
  todos: Todo[];
  filter: "all" | "active" | "completed";
}

class TodoStore extends ZenithStore<State> {
  constructor() {
    super({ todos: [], filter: "all" });
  }

  // 📍 算出プロパティ：自動キャッシュ + 安定した参照
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state;
    if (filter === "all") return todos;
    return todos.filter((t) =>
      filter === "active" ? !t.completed : t.completed
    );
  }

  // 🔗 連鎖派生：前の算出プロパティに基づく
  @memo((self) => [self.filteredTodos])
  get stats() {
    return {
      total: this.filteredTodos.length,
      completed: this.filteredTodos.filter((t) => t.completed).length,
      active: this.filteredTodos.filter((t) => !t.completed).length,
    };
  }

  // ✅ ビジネスメソッド：アトミックステートのみを変更
  setFilter(filter: State["filter"]) {
    this.produce((s) => {
      s.filter = filter;
    });
    // filteredTodos と stats が自動的に更新される
  }

  toggleTodo(id: string) {
    this.produce((s) => {
      const todo = s.todos.find((t) => t.id === id);
      if (todo) todo.completed = !todo.completed;
    });
  }
}
```

**3つのコンポーネントでリアクティブ更新を実演：**

```typescript
// コンポーネント 1：フィルター済みリストを表示
function TodoList() {
  const todos = useStore(s => s.filteredTodos)
  // ✅ todos または filter が変更されたときのみ再レンダリング
  return <div>{todos.map(t => <TodoItem key={t.id} todo={t} />)}</div>
}

// コンポーネント 2：統計情報を表示
function TodoStats() {
  const stats = useStore(s => s.stats)
  // ✅ filteredTodos が変更されたときのみ再レンダリング
  return <div>合計: {stats.total} | 完了: {stats.completed}</div>
}

// コンポーネント 3：フィルターを切り替え
function TodoFilter() {
  const filter = useStore(s => s.state.filter)
  const store = useStoreApi()
  // ✅ filter が変更されたときのみ再レンダリング
  return (
    <div>
      <button onClick={() => store.setFilter('all')}>全て</button>
      <button onClick={() => store.setFilter('active')}>進行中</button>
    </div>
  )
}
```

**なぜ連鎖派生はこれほど重要なのか？**

算出プロパティと連鎖派生により、リアクティブシステムが真に強力になります：

1. **シンプルなビジネスロジック**：`setFilter('active')` の1行で、すべての派生ステートが自動更新
2. **自動パフォーマンス最適化**：フレームワークが影響を受けるパスのみを再計算し、無効な計算を回避
3. **安定した参照**：依存関係が変更されていない場合、同じ参照を返し、コンポーネントの無効な再レンダリングを回避

**更新伝播チェーン：**

```
シナリオ 1：フィルターを切り替え
setFilter('active')
  ↓
state.filter が変更
  ↓
filteredTodos が再計算（todos + filter に依存）
  ↓
stats が再計算（filteredTodos に依存）
  ↓
TodoList と TodoStats が再レンダリング

シナリオ 2：Todo のステータスを切り替え
toggleTodo(id)
  ↓
state.todos が変更
  ↓
filteredTodos が再計算
  ↓
stats が再計算
  ↓
TodoList と TodoStats が再レンダリング
```

### 2️⃣ **強制カプセル化 - チームグレードエンジニアリング**

```typescript
class OrderStore extends ZenithStore<State> {
  // ✅ ビジネスロジックの集中、コンパイラによる強制規範
  submitOrder(items: Item[]) {
    this.validateCart(items);
    this.produceData((state) => {
      state.orders.push({
        id: nanoid(),
        items,
        status: "pending",
        createdAt: Date.now(),
      });
      state.cart = [];
    });
    this.syncToServer();
  }

  private validateCart(items: Item[]) {
    if (items.length === 0) throw new Error("カートが空です");
    if (items.some((x) => x.stock < x.quantity)) throw new Error("在庫不足");
  }

  private syncToServer() {
    // 統一された副作用処理
  }
}

// コンポーネント内
function CheckoutButton() {
  const storeApi = useStoreApi();
  // ✅ API 経由でのみ使用可能
  storeApi?.submitOrder(items);

  // ❌ 検証をバイパスできない
  // store.produceData(...)  // TypeScript エラー：produceData は protected
}
```

**柔軟なアプローチの課題：**

```typescript
// 柔軟だがエラーが発生しやすい書き方
const set = useStore.setState;
// あるコンポーネントで
set({ orders: [...orders, newOrder], cart: [] }); // 検証を忘れた！
// 別のコンポーネントで
if (cart.length > 0) {
  set({ orders: [...orders, newOrder] }); // カートのクリアを忘れた！
}
// 20箇所で20通りの書き方、デバッグが困難
```

## 📊 包括的な比較

| 機能              | Zenith          | Zustand         | MobX            | Redux Toolkit   |
| ---------------- | --------------- | --------------- | --------------- | --------------- |
| **API シンプルさ** | ⭐⭐⭐⭐⭐      | ⭐⭐⭐⭐⭐      | ⭐⭐⭐          | ⭐⭐⭐          |
| **算出プロパティ**  | ✅ @memo        | ❌              | ✅ computed     | ⚠️ selector     |
| **安定した参照**   | ✅ 自動          | ⚠️ 手動 memo    | ✅ 自動          | ⚠️ reselect     |
| **連鎖派生**      | ✅              | ❌              | ✅              | ⚠️ 複雑          |
| **強制カプセル化** | ✅              | ❌              | ⚠️              | ✅              |
| **Middleware**   | ✅ 組み込み      | ✅              | ❌              | ✅              |
| **アンドゥ/リドゥ** | ✅ Patches      | ❌              | ❌              | ⚠️ プラグイン    |
| **DevTools**     | ✅              | ⚠️ サードパーティ | ✅              | ✅              |
| **TypeScript**   | ⭐⭐⭐⭐⭐      | ⭐⭐⭐⭐⭐      | ⭐⭐⭐⭐        | ⭐⭐⭐⭐⭐      |
| **学習曲線**      | ⭐⭐⭐          | ⭐⭐            | ⭐⭐⭐⭐        | ⭐⭐⭐⭐        |
| **バンドルサイズ** | 2KB コア        | ~3KB            | ~16KB           | ~22KB           |

---

## 🚀 クイックスタート

### インストール

```bash
npm install @do-md/zenith immer
# または
pnpm add @do-md/zenith immer
```

> **注意**：Immer は peer dependency であり、明示的にインストールする必要があります

### TypeScript デコレータを有効化

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

## 🔌 Middleware アーキテクチャ

Zenith は Middleware アーキテクチャを採用し、軽量なコア（2KB）で、機能をオンデマンドで読み込みます：

### コア Middleware

#### 📦 withHistory - アンドゥ/リドゥ

> **Zenith のコア機能**：Core から分離されていますが、最も重要な機能の1つです

Immer Patches に基づき、メモリ効率が100倍：

**特徴：**

- ✅ メモリ使用量はスナップショット方式の1%
- ✅ スマートデバウンスマージ
- ✅ 精密な粒度制御
- ✅ エディタ、キャンバスなどに適している

**[📖 完全なドキュメント](./docs/middleware-history.ja.md)**

#### 🛠️ devtools - Redux DevTools 統合

開発環境で Store をデバッグ：

**特徴：**

- ✅ アクショントラッキング
- ✅ タイムトラベル
- ✅ ステートのエクスポート/インポート
- ✅ ゼロ設定

**[📖 完全なドキュメント](./docs/middleware-devtools.ja.md)**

## 📖 ドキュメントと例

**[📚 完全な API ドキュメント](./docs/api.ja.md)** · **[Todo App の完全な例](./docs/todo-app.ja.md)**

---

## 🎯 実世界の例：domd

**[domd](https://demo.domd.app/?src=https://github.com/do-md/zenith)** — Zenith で構築された強力な WYSIWYG Markdown エディタ

- 📦 **20KB、フル機能** — Immer + Zenith のみに依存、完全な Markdown パースと編集機能
- 🚀 **20000+ 行のスムーズな編集** — ラグなし、遅延なし、優れたパフォーマンス
- 💾 **極めて低いメモリ使用量** — 安定した参照 + Immer Patches の完璧な実践
- 🔜 **オープンソース予定**

---

## 📄 ライセンス

MIT © [Jayden Wang](https://github.com/do-md)

## 💡 謝辞

Zenith は **[Immer](https://github.com/immerjs/immer)** の上に構築されています — [Michel Weststrate](https://github.com/mweststrate) によって作成された優れたライブラリで、イミュータブルな状態更新を自然でエレガントにします。
