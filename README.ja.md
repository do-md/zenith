# Zenith

**エンジニアリング指向のReact状態管理・ZustandのシンプルさとMobXの組織力を融合**

[![npm version](https://img.shields.io/npm/v/@do-md/zenith.svg?style=flat-square)](https://www.npmjs.com/package/@do-md/zenith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Powered by Immer](https://img.shields.io/badge/Powered%20by-Immer-00D8FF?style=flat-square)](https://immerjs.github.io/immer/)
[![Gzipped Size](https://img.shields.io/badge/minzipped-3.5kb-success?style=flat-square)](https://bundlephobia.com/package/@do-md/zenith)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

---

## ⚡️ はじめに

Zenithは、**不変データ（Immutable Data）に基づく自動化されたリアクティブモデル**です。

これはReactの状態管理における古典的なジレンマを解決することを目指しています：**MobXのような自動派生機能**を享受しながら、**Redux/Immerのようなスナップショットの予測可能性**を維持することです。

- 🛡️ **Immerの不変性** — Reactの直感に適合し、データ構造の共有により高性能なスナップショットを実現します。
- 🎯 **Zustandのシンプルさ** — ボイラープレートなし、直感的なAPI。
- ⚡️ **MobXのリアクティブ力** — リアクティブな計算プロパティ、依存関係の自動追跡、多層チェーン派生により、無駄な再レンダリングを防ぎます。
- 🏢 **企業級のエンジニアリング** — ビジネスロジックのカプセル化を強制し、UI層からの無秩序な状態変更を防ぎます。

---

## 🚀 30秒で始める

### 1. Storeの定義

`class`を使用してロジックを整理し、`@memo`で高性能な計算プロパティを定義します。

```typescript
import { ZenithStore, memo } from "@do-md/zenith";

class TodoStore extends ZenithStore<State> {
  constructor() {
    super({ todos: [], filter: "all" });
  }

  // ⚡️ 計算プロパティ：依存関係を自動追跡し、結果を自動キャッシュ
  // todos または filter が変化した時のみ再計算されます
  @memo((s) => [s.state.todos, s.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state;
    if (filter === "all") return todos;
    return todos.filter((t) => t.completed === (filter === "completed"));
  }

  // 🔗 チェーン派生：前の計算プロパティに基づく
  @memo((s) => [s.filteredTodos])
  get stats() {
    return {
      total: this.filteredTodos.length,
      active: this.filteredTodos.filter((t) => !t.completed).length,
    };
  }

  // 🔧 ビジネスアクション：Draftを直接変更、Immerが不変性を担保します
  addTodo(text: string) {
    this.produce((draft) => {
      draft.todos.push({ id: Date.now(), text, completed: false });
    });
  }

  toggle(id: number) {
    this.produce((draft) => {
      const todo = draft.todos.find((t) => t.id === id);
      if (todo) todo.completed = !todo.completed;
    });
  }
}
```

### 2. コンポーネントでの使用

ZustandのようにHooksを使用しますが、TypeScriptの完全な型推論を享受できます。

```tsx
const { StoreProvider, useStore, useStoreApi } = createReactStore(TodoStore);

function TodoApp() {
  return (
    <StoreProvider>
      <TodoStats />
      <TodoList />
    </StoreProvider>
  );
}

function TodoStats() {
  // ✅ チェーン派生：statsはfilteredTodosに依存し、filteredTodosはtodosに依存
  // filter変更 -> filteredTodos更新 -> stats更新 -> コンポーネント再レンダリング
  const stats = useStore((s) => s.stats);
  return (
    <div>
      合計: {stats.total} | 未完了: {stats.active}
    </div>
  );
}

function TodoList() {
  // ✅ Selectorパターン：filteredTodosが変化した時のみレンダリング
  const todos = useStore((s) => s.filteredTodos);
  const store = useStoreApi();

  return (
    <div>
      {todos.map((todo) => (
        <div key={todo.id} onClick={() => store.toggle(todo.id)}>
          {todo.text}
        </div>
      ))}
    </div>
  );
}
```

---

## コア機能の詳細

### 1️⃣ スマートな計算プロパティ (`@memo`)

無駄なレンダリングを拒否します。Zenithの `@memo` はMobXの `computed` に似ていますが、完全に不変データに基づいています。

- **チェーン派生**：計算プロパティは他の計算プロパティに依存でき、効率的なデータフローグラフを構築します。
- **正確な更新**：計算結果の参照（Reference Equality）が変わらない場合、コンポーネントは再レンダリングされません。
- **明示的な依存**：`@memo((s) => [deps])` により、データフローが明確になり、MobXのような「魔法」のブラックボックスを回避できます。

### 2️⃣ 強制的なカプセル化 (Force Encapsulation)

チーム開発において、状態管理で最も恐れられるのは「無秩序な変更」です。Zustandではコンポーネント内のどこでも `setState` が可能で、ビジネスロジックが分散してしまいます。

**ZenithはロジックをStore内部に書くことを強制します：**

```typescript
// ✅ Good: UIは意図を呼び出すだけ
<button onClick={() => store.submitOrder(items)} />

// ❌ Bad: UIはStateを直接変更できない（setStateメソッドが公開されていない）
// store.state.orders = ... // Error!
```

これにより、**リファクタリングが極めて簡単**になり（Refactor-friendly）、参照の検索（Find Usages）が常に正確になります。

### 3️⃣ 組み込みミドルウェアアーキテクチャ

コアはわずか ~3.5KB ですが、機能は無限に拡張可能です。

- **📦 withHistory**：Patchesに基づいたUndo/Redo。スナップショット方式と比較してメモリ使用量が **1/100** で、エディタやキャンバスアプリ向けに設計されています。
  - [📖 History ミドルウェア ドキュメント](./docs/middleware-history.ja.md)
- **🛠️ DevTools**：設定不要でRedux DevToolsに接続し、タイムトラベルデバッグをサポートします。
  - [📖 DevTools ミドルウェア ドキュメント](./docs/middleware-devtools.ja.md)

---

## 📊 比較

| 機能 | Zenith | Zustand | MobX | Redux Toolkit |
| :--- | :--- | :--- | :--- | :--- |
| **コアパラダイム** | **Immutable Class** | Functional | Mutable Class | Functional |
| **計算プロパティ** | ✅ **@memo (Chain)** | ❌ (手動) | ✅ computed | ⚠️ selector |
| **APIのシンプルさ** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **型安全性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **チーム標準化** | ✅ **強制カプセル化** | ❌ 弱い | ⚠️ 弱い | ✅ 強い |
| **Undo/Redo** | ✅ **Patches (高速)** | ❌ | ❌ | ⚠️ 重い |
| **バンドルサイズ** | **~3.5KB** | ~1KB | ~16KB | ~20KB+ |

---

## 📖 その他のドキュメント

- **[📚 完全なAPIドキュメント](./docs/api.ja.md)**
- **[Todo App 完全な例](./docs/todo-app.ja.md)**

---

## 📦 インストール

Zenithは不変データの処理に `immer` を使用します。

```bash
# npm
npm install @do-md/zenith immer

# pnpm
pnpm add @do-md/zenith immer

# yarn
yarn add @do-md/zenith immer
```

デコレータをサポートするために `tsconfig.json` を設定します：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

---

## 🎯 実際の使用例

**[domd](https://demo.domd.app/?src=https://github.com/do-md/zenith)** — Zenithで構築された強力なWYSIWYG Markdownエディタ。
- ⚡️ **パフォーマンス**：20,000行以上のドキュメントをスムーズに処理。
- 🔙 **Undo**：Zenith Historyミドルウェアに基づく正確なUndo/Redo。
- 💾 **メモリ**：Immer Patchesによりメモリオーバーヘッドを劇的に削減。

---

## 📄 ライセンス

MIT © [Jayden Wang](https://github.com/do-md)
