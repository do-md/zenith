# Zenith

**エンジニアリンググレードの React 状態管理 · Immer によって強化**

[![npm version](https://img.shields.io/npm/v/@domd/zenith.svg)](https://www.npmjs.com/package/@domd/zenith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Powered by Immer](https://img.shields.io/badge/Powered%20by-Immer-00D8FF)](https://immerjs.github.io/immer/)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

---

## 📑 クイックナビゲーション

**[🚀 クイックスタート](#-クイックスタート)** · **[📖 API リファレンス](#-api-リファレンス)** · **[🎯 実世界の例](#-実世界の例domd)** · **[📊 包括的な比較](#-包括的な比較)**

---

## ✨ なぜ Zenith？

- 🧊 **デフォルトで不変** — Immer により、ミュータブルなコードを書いて、イミュータブルな状態を取得
- ⚡ **リアクティブな算出プロパティ** — 自動キャッシュ、安定した参照、無駄な再レンダリングなし
- ⏪ **アンドゥ/リドゥ組み込み** — Immer Patches、スナップショット方式の100倍のメモリ効率
- 🔒 **チームフレンドリー** — 強制的なカプセル化、ビジネスロジックのバイパス不可
- 🎯 **使いやすい API** — 直感的な更新方法、シンプルなフック、TypeScript ファースト

---

## 💥 一つの比較で Zenith を理解する

### シナリオ：アクティブユーザーリストの表示（フィルタとマップ付き）

#### ❌ よくあるパターン：繰り返しレンダリング + 冗長な計算

```typescript
function ActiveUsers() {
  // 問題1：毎回新しい配列、セレクタ比較失敗 → 必ず再レンダリング
  const activeUsers = useStore(s => 
    s.users.filter(u => u.active).map(u => ({ id: u.id, name: u.name }))
  )
  // users が変更されていなくても再レンダリング！
}

function UserCount() {
  // 問題2：手動 memo、3つのコンポーネントで3回書く
  const users = useStore(s => s.users)
  const activeUsers = useMemo(() => 
    users.filter(u => u.active).map(u => ({ id: u.id, name: u.name })),
    [users]
  )
  // それでも冗長な計算 + 3つのコピーをキャッシュ
}
```

**課題**：
1. ⚠️ **不要な再レンダリング**：セレクタが毎回新しい参照を返す
2. ⚠️ **冗長な計算**：各コンポーネントが独立して計算
3. ⚠️ **メモリの無駄**：同じデータの N 個のコピーをキャッシュ

---

#### ✅ Zenith：安定した参照 + グローバルキャッシュ

```typescript
class UserStore extends ZenithStore<State> {
  // 一度書けば、どこでも恩恵を受ける
  @memo((self) => [self.state.users])
  get activeUsers() {
    return this.state.users
      .filter(u => u.active)
      .map(u => ({ id: u.id, name: u.name }))
  }
  // ✅ users が変更されたときのみ再計算
  // ✅ 安定した参照を返す（依存関係不変 = 参照不変）
  // ✅ すべてのコンポーネントが単一の結果を共有
}

function ActiveUsers() {
  const activeUsers = useContextGetter(UserContext, s => s.activeUsers)
  // ✅ users 不変 → activeUsers 参照不変 → レンダリングなし
}

function UserCount() {
  const activeUsers = useContextGetter(UserContext, s => s.activeUsers)
  // ✅ 同じデータを再利用、追加計算ゼロ
}
```

**利点**：
- ✅ **安定した参照**：依存関係が変わらない時、同じオブジェクト参照を返し、不要な再レンダリングを防ぐ
- ✅ **一度計算**：すべてのコンポーネントが計算結果を共有
- ✅ **自動クリーンアップ**：コンポーネントが使用していない時メモリを解放（RefCount メカニズム）

---

## 🎯 コアアドバンテージ

### 1️⃣ **@memo デコレータ - 安定した参照 + 自動キャッシュ**

#### 問題：派生状態の再レンダリングトラップ

```typescript
// ❌ よくある間違い：毎回新しいオブジェクト → 必ず再レンダリング
const filteredList = useStore(s => s.list.filter(x => x.active))
const mappedList = useStore(s => s.list.map(x => ({ ...x, label: x.name })))

// list が変更されていなくてもコンポーネントが再レンダリング！
// 理由：useSyncExternalStore は Object.is 比較を使用、新しい配列 !== 古い配列
```

#### 解決策：@memo が参照の安定性を保証

```typescript
class DataStore extends ZenithStore<State> {
  // ✅ 依存関係不変 → 参照不変 → レンダリングトリガーなし
  @memo((self) => [self.state.list])
  get filteredList() {
    return this.state.list.filter(x => x.active)
  }
  
  // ✅ チェーン派生：前の memo からの安定した参照に基づく
  @memo((self) => [self.filteredList])
  get sortedList() {
    return [...this.filteredList].sort((a, b) => a.score - b.score)
  }
  
  // ✅ 複数の依存関係：いずれかが変更された時のみ再計算
  @memo((self) => [self.state.list, self.state.filter, self.state.sortBy])
  get processedList() {
    return this.state.list
      .filter(x => x.type === this.state.filter)
      .sort((a, b) => a[this.state.sortBy] - b[this.state.sortBy])
      .map(x => ({ id: x.id, label: x.name }))
  }
}

function List() {
  const data = useContextGetter(DataContext, s => s.processedList)
  // ✅ list/filter/sortBy のいずれかが変更された時のみ再レンダリング
  // ✅ 他の状態変更（loading など）はこのコンポーネントをトリガーしない
}
```

---

### 2️⃣ **強制的なカプセル化 - チームレベルのエンジニアリング**

```typescript
class OrderStore extends ZenithStore<State> {
  // ✅ ビジネスロジックの集中、コンパイラによる規則の強制
  submitOrder(items: Item[]) {
    this.validateCart(items)
    this.produceData(state => {
      state.orders.push({
        id: nanoid(),
        items,
        status: 'pending',
        createdAt: Date.now()
      })
      state.cart = []
    })
    this.syncToServer()
  }
  
  private validateCart(items: Item[]) {
    if (items.length === 0) throw new Error('カートが空です')
    if (items.some(x => x.stock < x.quantity)) throw new Error('在庫不足')
  }
  
  private syncToServer() {
    // 統一された副作用処理
  }
}

// コンポーネント内
function CheckoutButton() {
  const store = useContext(OrderContext)
  // ✅ API を通る必要がある
  store?.submitOrder(items)
  
  // ❌ 検証をバイパスできない
  // store.produceData(...)  // TypeScript エラー：produceData は protected
}
```

**柔軟なパターンの課題**：

```typescript
// 柔軟だがエラーが起こりやすい
const set = useStore.setState
// あるコンポーネントで
set({ orders: [...orders, newOrder], cart: [] })  // 検証を忘れた！
// 別のコンポーネントで
if (cart.length > 0) {
  set({ orders: [...orders, newOrder] })  // カートのクリアを忘れた！
}
// 20箇所、20の異なる実装、デバッグの悪夢
```

---

### 3️⃣ **Immer Patches - アンドゥ/リドゥのベストプラクティス** ⭐

> **コア技術：Immer の Patches メカニズムに基づく**

Zenith は [Immer](https://immerjs.github.io/immer/) を深く統合し、その革命的な Patches 機能を活用：

#### 🎯 100倍のメモリ効率

```typescript
class EditorStore extends ZenithStore<EditorState> {
  constructor() {
    super({ content: '' }, {
      enableHistory: true,      // Immer Patches 履歴を有効化
      enablePatch: true,
      historyDebounceTime: 100  // スマートマージ
    })
  }
}

store.undo()  // Immer の inversePatches を適用
store.redo()  // Immer の patches を適用
```

**メモリ比較**（1MB ドキュメント、30履歴エントリ）：
- スナップショット方式：1MB × 30 = **30MB**
- **Zenith + Immer Patches**：~10KB × 30 = **~300KB**
- **節約：100倍！**

#### 🎮 スマート履歴マージ

```typescript
class EditorStore extends ZenithStore<EditorState> {
  // シナリオ1：連続入力の自動マージ
  insertText(text: string) {
    this.produceData(state => {
      state.content += text  // Immer が変更を追跡
    })
    // 100ms 以内の連続入力を一つの Patch グループに自動マージ
  }
  
  // シナリオ2：ドラッグの精密制御
  startDrag(nodeId: string) {
    this.updateKeepRecord(true)  // マージ開始
  }
  
  onDrag(nodeId: string, position: Position) {
    this.produceData(state => {
      state.nodes.find(n => n.id === nodeId).position = position
    })
    // 複数の Patches を一つの履歴ユニットにマージ
  }
  
  endDrag() {
    this.updateKeepRecord(false)  // マージ終了
  }
}
```

**機能**：
- ✅ **自動デバウンスマージ**（連続操作を一つのアンドゥユニットにマージ）
- ✅ **精密な粒度制御**（`keepRecord` メカニズム）
- ✅ **タイムトラベルデバッグ**（Immer Patches に基づく）

---

### 4️⃣ **Immer Patches - 共同編集の業界標準** ⭐

> **革命的機能：Immer Patches は共同編集を自然にサポート**

```typescript
class DocStore extends ZenithStore<DocState> {
  editLocal(content: string) {
    this.produceData(
      state => { state.content = content },
      false,
      (patches, inversePatches) => {
        // 🌐 Immer 生成の Patches - 共同編集の標準フォーマット
        // ドキュメント全体ではなく、操作の差分のみを送信
        websocket.send({ 
          type: 'edit',
          patches,  // Immer Patches: [{ op: 'replace', path: ['content'], value: ... }]
          userId: currentUser.id,
          timestamp: Date.now()
        })
      }
    )
  }
  
  applyRemote(patches: Patch[]) {
    this.produceData(
      state => applyPatches(state, patches),  // Immer の applyPatches
      true  // リモート操作をローカル履歴に記録しない
    )
  }
}
```

**共同編集の利点**：

| 次元 | 従来（全体同期） | Zenith + Immer Patches |
|------|-----------------|------------------------|
| **帯域幅** | 1MB ドキュメント = 1MB 転送 | 1MB ドキュメント ≈ 1KB Patches |
| **競合解決** | 複雑（CRDT が必要） | シンプル（操作ベース） |
| **履歴再生** | 別途実装が必要 | 組み込み（inversePatches） |
| **OT アルゴリズム** | カスタムフォーマットが必要 | JSON Patch 標準 |

**Immer Patches フォーマット例**：
```json
[
  { "op": "replace", "path": ["content"], "value": "Hello World" },
  { "op": "add", "path": ["tags", 0], "value": "important" }
]
```

**なぜ Immer を選ぶのか？**
- ✅ 業界標準の JSON Patch フォーマット
- ✅ OT（Operational Transform）アルゴリズムと自然に互換
- ✅ CRDT（Conflict-free Replicated Data Types）統合をサポート
- ✅ 完全なシリアライズ/デシリアライズ機能

---

## 🏗️ 技術アーキテクチャ：Immer との深い統合

```typescript
class ZenithStore<T> {
  // コアメソッド：Immer の produce に基づく
  produceData(fn: (draft: T) => void, disableRecord?, patchCallback?) {
    const prevState = this._state
    
    // 🔥 Immer のマジック：自動変更追跡 + Patches 生成
    const newState = produce(
      this._state, 
      fn,  // あなたの更新ロジック（ミュータブルスタイル）
      (patches, inversePatches) => {
        // Immer 自動生成の Patches
        if (enabled && !preventPatches && !disableRecord) {
          this.recordHistory(patches, inversePatches)
        }
        patchCallback?.(patches, inversePatches)
      }
    )
    
    this._state = newState  // Immer 保証のイミュータブル更新
    this._listeners.forEach((listener) => listener(newState, prevState))
  }
}
```

**Immer が Zenith に提供するコア機能**：

1. **イミュータブル更新** - `produce` が新しいイミュータブル状態を自動生成
2. **Patches 追跡** - すべての変更を JSON Patch フォーマットで自動記録
3. **簡潔な更新構文** - ミュータブルスタイルの記述、イミュータブル更新の保証
4. **パフォーマンス最適化** - 構造共有（Structural Sharing）

---

## 📊 包括的な比較

| 機能 | Zenith | Zustand | MobX | Redux Toolkit |
|------|----------|---------|------|---------------|
| **安定した参照** | ✅ 自動保証 | ⚠️ 手動 memo | ✅ computed | ⚠️ reselect |
| **派生状態** | ✅ @memo デコレータ | ⚠️ 手動 useMemo | ✅ computed | ⚠️ createSelector |
| **コンポーネント間キャッシュ** | ✅ Store レベル | ❌ コンポーネントレベル | ✅ | ✅ |
| **自動メモリクリーンアップ** | ✅ RefCount | ❌ | ❌ | ❌ |
| **再レンダリング防止** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **アンドゥ/リドゥ** | ✅ Immer Patches | ❌ 手動 | ❌ 手動 | ⚠️ プラグイン |
| **履歴マージ** | ✅ スマートデバウンス | ❌ | ❌ | ❌ |
| **共同編集** | ✅ Immer Patches ネイティブ | ❌ | ❌ | ❌ |
| **強制カプセル化** | ✅ Protected | ❌ 完全オープン | ⚠️ バイパス可能 | ✅ |
| **イミュータブル更新** | ✅ Immer 保証 | ⚠️ 手動 | ❌ ミュータブル | ✅ Immer オプション |
| **TypeScript** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **学習曲線** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **バンドルサイズ** | ~3KB + Immer | ~3KB | ~16KB | ~22KB + Immer |

### 推奨シナリオ

| ソリューション | 最適な用途 | コア強み |
|--------------|----------|---------|
| **Zenith** | 📝 エディタ、🎨 共同ツール、📊 データ集約型アプリ | Immer Patches + 安定参照 + エンジニアリング |
| **Zustand** | 📱 シンプルなアプリ、クイックプロトタイプ | 軽量、シンプルな API |
| **MobX** | 🔄 リアクティブアプリ、複雑な状態グラフ | 自動依存追跡、きめ細かい更新 |
| **Redux Toolkit** | 🏢 大規模エンタープライズアプリ、厳格な規則 | 完全なエコシステム、強力な DevTools |

---

## 🤔 Zenith はあなたに適していますか？

### ✅ 強く推奨

- **📝 エディタ型アプリケーション**（Markdown、コード、リッチテキスト）
  - アンドゥ/リドゥが必要：Immer Patches は100倍メモリ効率的
  - 共同編集が必要：Patches は業界標準フォーマット
  
- **🎨 描画/フローチャートツール**
  - ドラッグ履歴マージ：精密なアンドゥ粒度制御
  - 複雑な計算キャッシュ：@memo 安定参照で再レンダリング回避
  
- **📊 データ集約型アプリケーション**
  - 多層フィルタ/ソート/マップ：チェーン @memo で冗長計算回避
  - 大規模リストレンダリング：安定した参照が仮想リストの鍵
  
- **👥 チームコラボレーションプロジェクト**（3人以上）
  - 強制カプセル化：コンパイラがビジネスロジックのバイパスを防止
  - コードレビューフレンドリー：Store クラスのみをチェック

### ⚠️ 適さない可能性

- **📱 シンプルな CRUD**
  - カウンター、シンプルなフォーム：Zustand がより軽量
  - 複雑な派生状態なし：@memo を使わない
  
- **🚀 クイックプロトタイピング**
  - デコレータ設定が必要：初期コストがやや高い
  - シンプルなシナリオ：やや重い可能性

### 💡 他のソリューションからの移行

#### Zustand から
- ✅ 類似した API、低い学習曲線
- ✅ 段階的な強化、オプトイン機能
- ✅ より良いパフォーマンス（安定参照 + グローバルキャッシュ）

```typescript
// Zustand スタイル
const useStore = create((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}))

// Zenith スタイル（類似だがより強力）
class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produceData(state => { state.count++ })  // Immer の簡潔な構文
  }
}
```

#### Redux から
- ✅ より簡潔（actions/reducers の分離不要）
- ✅ 規則の維持（強制カプセル化 + TypeScript）
- ✅ より効率的（Immer Patches vs 完全スナップショット）

---

## 🚀 クイックスタート

### インストール

```bash
npm install @domd/zenith immer
# または
pnpm add @domd/zenith immer
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

### 完全な例

```typescript
import { ZenithStore, memo, useContextGetter } from '@domd/zenith'
import { createContext, useState, useContext } from 'react'

// 1. State を定義
interface TodoState {
  todos: Todo[]
  filter: 'all' | 'active' | 'completed'
  searchTerm: string
}

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

// 2. Store を定義
class TodoStore extends ZenithStore<TodoState> {
  constructor() {
    super(
      { 
        todos: [], 
        filter: 'all',
        searchTerm: ''
      },
      {
        enableHistory: true,    // Immer Patches 履歴を有効化
        enablePatch: true,
        historyDebounceTime: 100
      }
    )
  }
  
  // ✅ 派生状態：自動キャッシュ + 安定した参照
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state
    if (filter === 'all') return todos
    return todos.filter(t => 
      filter === 'active' ? !t.completed : t.completed
    )
  }
  
  // ✅ チェーン派生
  @memo((self) => [self.filteredTodos, self.state.searchTerm])
  get displayTodos() {
    const term = this.state.searchTerm.toLowerCase()
    if (!term) return this.filteredTodos
    return this.filteredTodos.filter(t => 
      t.text.toLowerCase().includes(term)
    )
  }
  
  // ✅ 算出プロパティ
  @memo((self) => [self.state.todos])
  get stats() {
    const total = this.state.todos.length
    const completed = this.state.todos.filter(t => t.completed).length
    return { total, completed, active: total - completed }
  }
  
  // アクション：ビジネスロジックをカプセル化
  addTodo(text: string) {
    if (!text.trim()) {
      throw new Error('Todo を空にできません')
    }
    
    // Immer の簡潔な更新構文
    this.produceData(state => {
      state.todos.push({ 
        id: nanoid(), 
        text: text.trim(), 
        completed: false,
        createdAt: Date.now()
      })
    })
  }
  
  toggleTodo(id: string) {
    this.produceData(state => {
      const todo = state.todos.find(t => t.id === id)
      if (todo) todo.completed = !todo.completed
    })
  }
  
  setFilter(filter: TodoState['filter']) {
    this.produceData(state => {
      state.filter = filter
    })
  }
  
  setSearchTerm(term: string) {
    this.produceData(state => {
      state.searchTerm = term
    })
  }
}

// 3. Context を作成
const TodoContext = createContext<TodoStore | null>(null)

// 4. コンポーネントで使用
function TodoList() {
  // ✅ displayTodos 参照安定、依存関係変更時のみ再レンダリング
  const todos = useContextGetter(TodoContext, s => s.displayTodos)
  const store = useContext(TodoContext)
  
  return (
    <div>
      {todos.map(todo => (
        <TodoItem 
          key={todo.id} 
          todo={todo}
          onToggle={() => store?.toggleTodo(todo.id)}
        />
      ))}
    </div>
  )
}

function TodoStats() {
  // ✅ stats は安定した参照、todos 変更時のみ再レンダリング
  // ✅ filter や searchTerm の変更はこのコンポーネントをトリガーしない
  const stats = useContextGetter(TodoContext, s => s.stats)
  
  return (
    <div>
      合計：{stats.total} | 
      完了：{stats.completed} | 
      アクティブ：{stats.active}
    </div>
  )
}

function TodoFilters() {
  const filter = useContextGetter(TodoContext, s => s.state.filter)
  const store = useContext(TodoContext)
  
  return (
    <div>
      <button onClick={() => store?.setFilter('all')}>すべて</button>
      <button onClick={() => store?.setFilter('active')}>アクティブ</button>
      <button onClick={() => store?.setFilter('completed')}>完了</button>
      {/* Immer Patches ベースのアンドゥ/リドゥ */}
      <button onClick={() => store?.undo()}>元に戻す</button>
      <button onClick={() => store?.redo()}>やり直す</button>
    </div>
  )
}

// 5. Store を提供
function App() {
  const [store] = useState(() => new TodoStore())
  return (
    <TodoContext.Provider value={store}>
      <TodoFilters />
      <TodoStats />
      <TodoList />
    </TodoContext.Provider>
  )
}
```

---

## 💎 安定した参照が重要な理由

### 問題のデモンストレーション

```typescript
// ❌ よくあるパフォーマンストラップ
function UserList() {
  const activeUsers = useStore(s => 
    s.users.filter(u => u.active)  // 毎回新しい配列
  )
  
  // 問題：users が変更されていなくても毎秒コンポーネントが再レンダリング！
  // 理由：他の状態変更（loading など）→ セレクタ再実行 → 新しい配列参照
}

// ✅ Zenith ソリューション
class UserStore extends ZenithStore<State> {
  @memo((self) => [self.state.users])
  get activeUsers() {
    return this.state.users.filter(u => u.active)
  }
  // users 不変 → キャッシュされた同じ配列を返す → コンポーネント再レンダリングなし
}

function UserList() {
  const activeUsers = useContextGetter(UserContext, s => s.activeUsers)
  // ✅ users 変更時のみ再レンダリング
}
```

### 実際のパフォーマンス比較（10,000アイテム）

| アプローチ | 再レンダリング回数 | 計算回数 | メモリ使用量 |
|----------|----------------|---------|------------|
| 裸のセレクタ | 状態変更ごと | コンポーネントごと毎回 | N × データサイズ |
| 手動 useMemo | 依存関係変更時 | コンポーネントごと毎回 | N × データサイズ |
| **Zenith @memo** | **依存関係変更時** | **グローバルで一度** | **1 × データサイズ** |

**結論**：同じ派生データを使用する3つのコンポーネント

- 従来：3回計算、3つのコピーをキャッシュ、N回再レンダリングの可能性
- **Zenith：一度計算、一度キャッシュ、必要な時のみレンダリング**

---

## 🎓 設計哲学

### 1. 巨人の肩の上に立つ

> **Zenith = 慎重に設計された API + Immer の強力な機能**

車輪の再発明はせず、実戦検証済みの技術を深く統合：
- **Immer**：イミュータブル更新 + Patches メカニズム
- **MobX**：算出プロパティ設計のインスピレーション
- **Zustand**：シンプルな API のインスピレーション
- **TypeScript**：コンパイル時の保証

### 2. 利便性よりもパフォーマンス

```typescript
// @memo が保証するもの：
// 1. 安定した参照（再レンダリング防止）
// 2. コンポーネント間共有（冗長計算回避）
// 3. 自動クリーンアップ（メモリリーク防止）
```

### 3. 段階的な強化

```typescript
// 基本的な使用：Zustand と同じくらいシンプル
class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produceData(s => { s.count++ })
  }
}

// 高度な使用：必要に応じて Immer Patches をオプトイン
new TodoStore(initialState, {
  enableHistory: true,      // アンドゥ/リドゥが必要な時
  enablePatch: true,
  historyDebounceTime: 100
})
```

### 4. 型安全ファースト

```typescript
// TypeScript が保証するもの：
// - produceData は protected、外部から呼び出せない
// - すべてのゲッターが自動的に型を推論
// - Immer の完全な型サポート
```

---

## 📖 API リファレンス

### ZenithStore

```typescript
class MyStore extends ZenithStore<State> {
  constructor(initialState: State, options?: StoreOptions)
  
  // コアメソッド（Immer ベース）
  protected produceData(
    fn: (draft: State) => void,
    disableRecord?: boolean,
    patchCallback?: (patches: Patch[], inversePatches: Patch[]) => void
  ): void
  
  subscribe(listener: (newState: State, prevState: State) => void): () => void
  
  // 履歴メソッド（enableHistory が必要）
  undo(): void
  redo(): void
  updateKeepRecord(keep: boolean): void
  
  // プロパティ
  state: State          // 現在の状態（読み取り専用）
  initialState: State   // 初期状態
}
```

### @memo デコレータ

```typescript
@memo((self: Store) => [dependency1, dependency2, ...])
get computedProperty() {
  return expensiveComputation(...)
}
```

### React フック

```typescript
// 状態スライスを購読
const [data, store] = useContextStore(StoreContext, state => state.data)

// ゲッターを購読（自動 RefCount 管理）
const computed = useContextGetter(StoreContext, store => store.computed)
```

### Effect（非 React）

```typescript
const cleanup = addEffect(store, effect, [state => state.field])
```

### StoreOptions

```typescript
interface StoreOptions {
  enablePatch?: boolean          // Immer Patches を有効化
  enableHistory?: boolean         // 履歴追跡を有効化
  historyLength?: number          // 最大履歴長（デフォルト30）
  historyDebounceTime?: number    // 履歴マージ時間（デフォルト100ms）
}
```

---

## 📚 ドキュメントと例

### 🎯 実世界の例：domd

**[domd](https://demo.domd.app/?src=https://github.com/do-md/zenith)** — Zenith で構築された強力な WYSIWYG Markdown エディタ

- 📦 **20KB、完全なパワー** — Immer + Zenith のみに依存、完全な Markdown パースと編集を提供
- 🚀 **20,000行以上、バターのように滑らか** — ラグなし、ジャンクなし、ただパフォーマンス
- 💾 **最小限のメモリフットプリント** — 安定した参照 + Immer Patches の実践
- 🔜 **オープンソース近日公開**

> ほとんどのエディタは domd が 20KB で行うことに 200KB+ 必要とします。これが Zenith の力です。

---

## 📄 ライセンス

MIT © [Jayden Wang](https://github.com/do-md)

---

## 💡 謝辞

Zenith は **[Immer](https://github.com/immerjs/immer)** の上に構築されています — [Michel Weststrate](https://github.com/mweststrate) による、イミュータブルな状態更新を自然に感じさせる素晴らしいライブラリです。

