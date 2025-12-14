# Zenith

**Engineering-Grade React State Management · Powered by Immer**

[![npm version](https://img.shields.io/npm/v/@do-md/zenith.svg)](https://www.npmjs.com/package/@do-md/zenith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Powered by Immer](https://img.shields.io/badge/Powered%20by-Immer-00D8FF)](https://immerjs.github.io/immer/)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

---

## 📑 Quick Navigation

**[🚀 Quick Start](#-quick-start)** · **[📖 API Reference](#-api-reference)** · **[🎯 Real-World Example](#-real-world-example-domd)** · **[📊 Comparison](#-comprehensive-comparison)**

---

## ✨ Why Zenith?

- 🧊 **Immutable by default** — Powered by Immer, write mutable code, get immutable state
- ⚡ **Reactive computed properties** — Auto-cached, stable references, no redundant renders
- ⏪ **Undo/Redo built-in** — Immer Patches, 100x more memory efficient than snapshots
- 🔒 **Team-friendly** — Enforced encapsulation, business logic can't be bypassed
- 🎯 **Friendly API** — Intuitive updates, simple hooks, TypeScript-first

---

## 💥 One Comparison, Understand Zenith

### Scenario: Display Active User List (with filter and map)

#### ❌ Common Pattern: Repeated Renders + Redundant Computation

```typescript
function ActiveUsers() {
  // Problem 1: New array every time, selector comparison fails → Always re-renders
  const activeUsers = useStore(s => 
    s.users.filter(u => u.active).map(u => ({ id: u.id, name: u.name }))
  )
  // Re-renders even when users haven't changed!
}

function UserCount() {
  // Problem 2: Manual memo, write 3 times for 3 components
  const users = useStore(s => s.users)
  const activeUsers = useMemo(() => 
    users.filter(u => u.active).map(u => ({ id: u.id, name: u.name })),
    [users]
  )
  // Still redundant computation + 3 copies cached
}
```

**Challenges**:
1. ⚠️ **Unnecessary Re-renders**: Selector returns new reference every time
2. ⚠️ **Redundant Computation**: Each component computes independently
3. ⚠️ **Memory Waste**: N copies of identical data cached

---

#### ✅ Zenith: Stable References + Global Cache

```typescript
class UserStore extends ZenithStore<State> {
  // Write once, benefit everywhere
  @memo((self) => [self.state.users])
  get activeUsers() {
    return this.state.users
      .filter(u => u.active)
      .map(u => ({ id: u.id, name: u.name }))
  }
  // ✅ Only recomputes when users change
  // ✅ Returns stable reference (deps unchanged = reference unchanged)
  // ✅ All components share single result
}

function ActiveUsers() {
  const activeUsers = useContextGetter(UserContext, s => s.activeUsers)
  // ✅ users unchanged → activeUsers reference unchanged → No render
}

function UserCount() {
  const activeUsers = useContextGetter(UserContext, s => s.activeUsers)
  // ✅ Reuse same data, zero extra computation
}
```

**Advantages**:
- ✅ **Stable References**: Returns same object reference when deps unchanged, prevents unnecessary re-renders
- ✅ **Compute Once**: All components share computation result
- ✅ **Auto Cleanup**: Releases memory when no components use it (RefCount mechanism)

---

## 🎯 Core Advantages

### 1️⃣ **@memo Decorator - Stable References + Auto Caching**

#### Problem: Re-render Trap of Derived State

```typescript
// ❌ Common mistake: New object every time → Always re-renders
const filteredList = useStore(s => s.list.filter(x => x.active))
const mappedList = useStore(s => s.list.map(x => ({ ...x, label: x.name })))

// Component re-renders even when list hasn't changed!
// Reason: useSyncExternalStore uses Object.is comparison, new array !== old array
```

#### Solution: @memo Guarantees Reference Stability

```typescript
class DataStore extends ZenithStore<State> {
  // ✅ Deps unchanged → Reference unchanged → No render triggered
  @memo((self) => [self.state.list])
  get filteredList() {
    return this.state.list.filter(x => x.active)
  }
  
  // ✅ Chained derivation: Based on stable reference from previous memo
  @memo((self) => [self.filteredList])
  get sortedList() {
    return [...this.filteredList].sort((a, b) => a.score - b.score)
  }
  
  // ✅ Multiple dependencies: Recomputes only when any changes
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
  // ✅ Only re-renders when list/filter/sortBy changes
  // ✅ Other state changes (like loading) won't trigger this component
}
```

---

### 2️⃣ **Enforced Encapsulation - Team-Level Engineering**

```typescript
class OrderStore extends ZenithStore<State> {
  // ✅ Business logic centralized, compiler-enforced standards
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
    if (items.length === 0) throw new Error('Cart is empty')
    if (items.some(x => x.stock < x.quantity)) throw new Error('Insufficient stock')
  }
  
  private syncToServer() {
    // Unified side effect handling
  }
}

// In component
function CheckoutButton() {
  const store = useContext(OrderContext)
  // ✅ Must go through API
  store?.submitOrder(items)
  
  // ❌ Cannot bypass validation
  // store.produceData(...)  // TypeScript error: produceData is protected
}
```

**Challenges of Flexible Patterns**:

```typescript
// Flexible but error-prone
const set = useStore.setState
// In some component
set({ orders: [...orders, newOrder], cart: [] })  // Forgot validation!
// In another component
if (cart.length > 0) {
  set({ orders: [...orders, newOrder] })  // Forgot to clear cart!
}
// 20 places, 20 different implementations, debugging nightmare
```

---

### 3️⃣ **Immer Patches - Best Practice for Undo/Redo** ⭐

> **Core Technology: Based on Immer's Patches Mechanism**

Zenith deeply integrates [Immer](https://immerjs.github.io/immer/), leveraging its revolutionary Patches capability:

#### 🎯 100x Memory Efficient

```typescript
class EditorStore extends ZenithStore<EditorState> {
  constructor() {
    super({ content: '' }, {
      enableHistory: true,      // Enable Immer Patches history
      enablePatch: true,
      historyDebounceTime: 100  // Smart merging
    })
  }
}

store.undo()  // Apply Immer's inversePatches
store.redo()  // Apply Immer's patches
```

**Memory Comparison** (1MB document, 30 history entries):
- Snapshot approach: 1MB × 30 = **30MB**
- **Zenith + Immer Patches**: ~10KB × 30 = **~300KB**
- **Savings: 100x!**

#### 🎮 Smart History Merging

```typescript
class EditorStore extends ZenithStore<EditorState> {
  // Scenario 1: Auto-merge continuous input
  insertText(text: string) {
    this.produceData(state => {
      state.content += text  // Immer tracks changes
    })
    // Continuous input within 100ms auto-merges into one Patch group
  }
  
  // Scenario 2: Precise drag control
  startDrag(nodeId: string) {
    this.updateKeepRecord(true)  // Start merging
  }
  
  onDrag(nodeId: string, position: Position) {
    this.produceData(state => {
      state.nodes.find(n => n.id === nodeId).position = position
    })
    // Multiple Patches merged into one history unit
  }
  
  endDrag() {
    this.updateKeepRecord(false)  // End merging
  }
}
```

**Features**:
- ✅ **Auto debounce merging** (continuous operations merge into one undo unit)
- ✅ **Precise granularity control** (`keepRecord` mechanism)
- ✅ **Time-travel debugging** (based on Immer Patches)

---

## 📊 Comprehensive Comparison

| Feature | Zenith | Zustand | MobX | Redux Toolkit |
|---------|----------|---------|------|---------------|
| **Stable References** | ✅ Auto guaranteed | ⚠️ Manual memo | ✅ computed | ⚠️ reselect |
| **Derived State** | ✅ @memo decorator | ⚠️ Manual useMemo | ✅ computed | ⚠️ createSelector |
| **Cross-component Cache** | ✅ Store-level | ❌ Component-level | ✅ | ✅ |
| **Auto Memory Cleanup** | ✅ RefCount | ❌ | ❌ | ❌ |
| **Prevent Re-renders** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Undo/Redo** | ✅ Immer Patches | ❌ Manual | ❌ Manual | ⚠️ Plugin |
| **History Merging** | ✅ Smart debounce | ❌ | ❌ | ❌ |
| **Collaborative Editing** | ✅ Immer Patches native | ❌ | ❌ | ❌ |
| **Enforced Encapsulation** | ✅ Protected | ❌ Fully open | ⚠️ Bypassable | ✅ |
| **Immutable Updates** | ✅ Immer guaranteed | ⚠️ Manual | ❌ Mutable | ✅ Immer optional |
| **TypeScript** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Learning Curve** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Bundle Size** | ~3KB + Immer | ~3KB | ~16KB | ~22KB + Immer |

### Recommended Scenarios

| Solution | Best For | Core Strengths |
|----------|----------|---------------|
| **Zenith** | 📝 Editors, 🎨 Collaborative tools, 📊 Data-intensive apps | Immer Patches + Stable refs + Engineering |
| **Zustand** | 📱 Simple apps, Quick prototypes | Lightweight, Simple API |
| **MobX** | 🔄 Reactive apps, Complex state graphs | Auto dependency tracking, Fine-grained updates |
| **Redux Toolkit** | 🏢 Large enterprise apps, Strict standards | Complete ecosystem, Powerful DevTools |

---

## 🤔 Is Zenith Right for You?

### ✅ Highly Recommended

- **📝 Editor-type Applications** (Markdown, Code, Rich Text)
  - Need undo/redo: Immer Patches 100x memory efficient
  - Need collaborative editing: Patches are industry standard format
  
- **🎨 Drawing/Flowchart Tools**
  - Drag history merging: Precise undo granularity control
  - Complex computation cache: @memo stable refs avoid re-renders
  
- **📊 Data-Intensive Applications**
  - Multi-layer filter/sort/map: Chained @memo avoids redundant computation
  - Large list rendering: Stable references are key to virtual lists
  
- **👥 Team Collaboration Projects** (>3 people)
  - Enforced encapsulation: Compiler guarantees business logic isn't bypassed
  - Code review friendly: Only need to check Store class

### ⚠️ May Not Be Suitable

- **📱 Simple CRUD**
  - Counter, simple forms: Zustand is more lightweight
  - No complex derived state: Won't use @memo
  
- **🚀 Quick Prototyping**
  - Decorator configuration needed: Slightly higher initial cost
  - Simple scenarios: May be overkill

### 💡 Migrating from Other Solutions

#### From Zustand
- ✅ Similar API, low learning curve
- ✅ Progressive enhancement, opt-in features
- ✅ Better performance (stable refs + global cache)

```typescript
// Zustand style
const useStore = create((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}))

// Zenith style (similar but more powerful)
class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produceData(state => { state.count++ })  // Immer's concise syntax
  }
}
```

#### From Redux
- ✅ More concise (no need to separate actions/reducers)
- ✅ Maintains standards (enforced encapsulation + TypeScript)
- ✅ More efficient (Immer Patches vs full snapshots)

---

## 🚀 Quick Start

### Installation

```bash
npm install @do-md/zenith immer
# or
pnpm add @do-md/zenith immer
```

> **Note**: Immer is a peer dependency and must be explicitly installed

### Enable TypeScript Decorators

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

### Complete Example

```typescript
import { ZenithStore, memo, useContextGetter } from '@do-md/zenith'
import { createContext, useState, useContext } from 'react'

// 1. Define State
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

// 2. Define Store
class TodoStore extends ZenithStore<TodoState> {
  constructor() {
    super(
      { 
        todos: [], 
        filter: 'all',
        searchTerm: ''
      },
      {
        enableHistory: true,    // Enable Immer Patches history
        enablePatch: true,
        historyDebounceTime: 100
      }
    )
  }
  
  // ✅ Derived state: Auto caching + Stable reference
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state
    if (filter === 'all') return todos
    return todos.filter(t => 
      filter === 'active' ? !t.completed : t.completed
    )
  }
  
  // ✅ Chained derivation
  @memo((self) => [self.filteredTodos, self.state.searchTerm])
  get displayTodos() {
    const term = this.state.searchTerm.toLowerCase()
    if (!term) return this.filteredTodos
    return this.filteredTodos.filter(t => 
      t.text.toLowerCase().includes(term)
    )
  }
  
  // ✅ Computed property
  @memo((self) => [self.state.todos])
  get stats() {
    const total = this.state.todos.length
    const completed = this.state.todos.filter(t => t.completed).length
    return { total, completed, active: total - completed }
  }
  
  // Actions: Encapsulate business logic
  addTodo(text: string) {
    if (!text.trim()) {
      throw new Error('Todo cannot be empty')
    }
    
    // Immer's concise update syntax
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

// 3. Create Context
const TodoContext = createContext<TodoStore | null>(null)

// 4. Use in Components
function TodoList() {
  // ✅ displayTodos reference stable, only re-renders when deps change
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
  // ✅ stats is stable reference, only re-renders when todos change
  // ✅ filter or searchTerm changes won't trigger this component
  const stats = useContextGetter(TodoContext, s => s.stats)
  
  return (
    <div>
      Total: {stats.total} | 
      Completed: {stats.completed} | 
      Active: {stats.active}
    </div>
  )
}

function TodoFilters() {
  const filter = useContextGetter(TodoContext, s => s.state.filter)
  const store = useContext(TodoContext)
  
  return (
    <div>
      <button onClick={() => store?.setFilter('all')}>All</button>
      <button onClick={() => store?.setFilter('active')}>Active</button>
      <button onClick={() => store?.setFilter('completed')}>Completed</button>
      {/* Undo/Redo based on Immer Patches */}
      <button onClick={() => store?.undo()}>Undo</button>
      <button onClick={() => store?.redo()}>Redo</button>
    </div>
  )
}

// 5. Provide Store
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

## 💎 Why Stable References Matter

### Problem Demonstration

```typescript
// ❌ Common performance trap
function UserList() {
  const activeUsers = useStore(s => 
    s.users.filter(u => u.active)  // New array every time
  )
  
  // Problem: Component re-renders every second even when users unchanged!
  // Reason: Other state changes (like loading) → selector re-executes → new array reference
}

// ✅ Zenith solution
class UserStore extends ZenithStore<State> {
  @memo((self) => [self.state.users])
  get activeUsers() {
    return this.state.users.filter(u => u.active)
  }
  // users unchanged → returns cached same array → component doesn't re-render
}

function UserList() {
  const activeUsers = useContextGetter(UserContext, s => s.activeUsers)
  // ✅ Only re-renders when users change
}
```

### Real Performance Comparison (10,000 items)

| Approach | Re-render Count | Computation Count | Memory Usage |
|----------|----------------|-------------------|--------------|
| Bare selector | Every state change | Each time per component | N × data size |
| Manual useMemo | When deps change | Each time per component | N × data size |
| **Zenith @memo** | **When deps change** | **Once globally** | **1 × data size** |

**Conclusion**: 3 components using same derived data

- Traditional: Compute 3 times, cache 3 copies, may re-render N times
- **Zenith: Compute once, cache once, render only when necessary**

---

## 🎓 Design Philosophy

### 1. Standing on the Shoulders of Giants

> **Zenith = Carefully Designed API + Immer's Powerful Capabilities**

We didn't reinvent the wheel; we deeply integrated battle-tested technologies:
- **Immer**: Immutable updates + Patches mechanism
- **MobX**: Computed properties design inspiration
- **Zustand**: Simple API inspiration
- **TypeScript**: Compile-time guarantees

### 2. Performance over Convenience

```typescript
// @memo guarantees:
// 1. Stable references (prevent re-renders)
// 2. Cross-component sharing (avoid redundant computation)
// 3. Auto cleanup (prevent memory leaks)
```

### 3. Progressive Enhancement

```typescript
// Basic usage: As simple as Zustand
class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produceData(s => { s.count++ })
  }
}

// Advanced usage: Opt-in Immer Patches when needed
new TodoStore(initialState, {
  enableHistory: true,      // When undo/redo needed
  enablePatch: true,
  historyDebounceTime: 100
})
```

### 4. Type Safety First

```typescript
// TypeScript guarantees:
// - produceData is protected, cannot be called externally
// - All getters auto-infer types
// - Full Immer type support
```

---

## 📖 API Reference

### ZenithStore

```typescript
class MyStore extends ZenithStore<State> {
  constructor(initialState: State, options?: StoreOptions)
  
  // Core methods (based on Immer)
  protected produceData(
    fn: (draft: State) => void,
    disableRecord?: boolean,
    patchCallback?: (patches: Patch[], inversePatches: Patch[]) => void
  ): void
  
  subscribe(listener: (newState: State, prevState: State) => void): () => void
  
  // History methods (requires enableHistory)
  undo(): void
  redo(): void
  updateKeepRecord(keep: boolean): void
  
  // Properties
  state: State          // Current state (readonly)
  initialState: State   // Initial state
}
```

### @memo Decorator

```typescript
@memo((self: Store) => [dependency1, dependency2, ...])
get computedProperty() {
  return expensiveComputation(...)
}
```

### React Hooks

```typescript
// Subscribe to state slice
const [data, store] = useContextStore(StoreContext, state => state.data)

// Subscribe to getter (auto RefCount management)
const computed = useContextGetter(StoreContext, store => store.computed)
```

### Effect (Non-React)

```typescript
const cleanup = addEffect(store, effect, [state => state.field])
```

### StoreOptions

```typescript
interface StoreOptions {
  enablePatch?: boolean          // Enable Immer Patches
  enableHistory?: boolean         // Enable history tracking
  historyLength?: number          // Max history length (default 30)
  historyDebounceTime?: number    // History merge time (default 100ms)
}
```

---

## 📚 Documentation & Examples

### 🎯 Real-World Example: domd

**[domd](https://demo.domd.app/?src=https://github.com/do-md/zenith)** — A powerful WYSIWYG Markdown editor built with Zenith

- 📦 **20KB, full power** — Only depends on Immer + Zenith, delivers complete Markdown parsing & editing
- 🚀 **20,000+ lines, buttery smooth** — No lag, no jank, just performance
- 💾 **Minimal memory footprint** — Stable references + Immer Patches in action
- 🔜 **Open source coming soon**

> Most editors need 200KB+ to do what domd does in 20KB. This is the power of Zenith.

---

## 📄 License

MIT © [Jayden Wang](https://github.com/do-md)

---

## 💡 Acknowledgments

Zenith is built on top of **[Immer](https://github.com/immerjs/immer)** — the brilliant library by [Michel Weststrate](https://github.com/mweststrate) that makes immutable state updates feel natural.

