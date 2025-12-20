# Zenith

**Engineering-Grade React State Management · Powered by Immer**

[![npm version](https://img.shields.io/npm/v/@do-md/zenith.svg)](https://www.npmjs.com/package/@do-md/zenith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Powered by Immer](https://img.shields.io/badge/Powered%20by-Immer-00D8FF)](https://immerjs.github.io/immer/)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

---

## 📑 Quick Navigation

**[🚀 Quick Start](#-quick-start)** · **[📊 Full Comparison](#-full-comparison)** · **[🎯 Real-World Case](#-real-world-case-domd)**

---

## ✨ Why Zenith?

**Simple as Zustand, Powerful as MobX**

Get Zustand's simplicity, MobX's reactive power, plus unique engineering features

> **Zenith = Zustand's API + MobX's Computed Properties + Beyond Both in Engineering**

- 🎯 **Zustand's API** — Lightweight, intuitive, zero-config, 5 minutes to start
- 🧲 **MobX's Power** — Computed properties, chained derivation, stable references, eliminate invalid renders
- 🔧 **Unique Engineering** — Middleware architecture, Immer Patches, DevTools, async queries
- 🏢 **Team-Ready** — Enforced encapsulation, TypeScript-first, business logic can't be bypassed

## 🎯 Core Capabilities

### 1️⃣ **Computed Properties + Chained Derivation: The Core of Reactive Systems**

> Computed properties and chained derivation make your code follow the "unidirectional data flow" principle: **Write-side only modifies atomic state, read-side automatically gets latest derived state**

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

  // 📍 Computed property: auto-cache + stable reference
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state;
    if (filter === "all") return todos;
    return todos.filter((t) =>
      filter === "active" ? !t.completed : t.completed
    );
  }

  // 🔗 Chained derivation: based on previous computed property
  @memo((self) => [self.filteredTodos])
  get stats() {
    return {
      total: this.filteredTodos.length,
      completed: this.filteredTodos.filter((t) => t.completed).length,
      active: this.filteredTodos.filter((t) => !t.completed).length,
    };
  }

  // ✅ Business methods: only modify atomic state
  setFilter(filter: State["filter"]) {
    this.produce((s) => {
      s.filter = filter;
    });
    // filteredTodos and stats automatically update
  }

  toggleTodo(id: string) {
    this.produce((s) => {
      const todo = s.todos.find((t) => t.id === id);
      if (todo) todo.completed = !todo.completed;
    });
  }
}
```

**Three components demonstrate reactive updates:**

```typescript
// Component 1: Display filtered list
function TodoList() {
  const todos = useStore(s => s.filteredTodos)
  // ✅ Only re-renders when todos or filter changes
  return <div>{todos.map(t => <TodoItem key={t.id} todo={t} />)}</div>
}

// Component 2: Display statistics
function TodoStats() {
  const stats = useStore(s => s.stats)
  // ✅ Only re-renders when filteredTodos changes
  return <div>Total: {stats.total} | Completed: {stats.completed}</div>
}

// Component 3: Toggle filter
function TodoFilter() {
  const filter = useStore(s => s.state.filter)
  const store = useStoreApi()
  // ✅ Only re-renders when filter changes
  return (
    <div>
      <button onClick={() => store.setFilter('all')}>All</button>
      <button onClick={() => store.setFilter('active')}>Active</button>
    </div>
  )
}
```

**Why is chained derivation so important?**

Computed properties and chained derivation make reactive systems truly powerful:

1. **Simple business logic**: One line `setFilter('active')`, all derived states auto-update
2. **Auto performance optimization**: Framework ensures only affected paths recompute, avoiding invalid calculations
3. **Stable references**: Returns same reference when deps unchanged, avoiding component invalid re-renders

**Update propagation chain:**

```
Scenario 1: Switch filter
setFilter('active')
  ↓
state.filter changes
  ↓
filteredTodos recomputes (depends on todos + filter)
  ↓
stats recomputes (depends on filteredTodos)
  ↓
TodoList and TodoStats re-render

Scenario 2: Toggle todo status
toggleTodo(id)
  ↓
state.todos changes
  ↓
filteredTodos recomputes
  ↓
stats recomputes
  ↓
TodoList and TodoStats re-render
```

### 2️⃣ **Enforced Encapsulation - Team-Grade Engineering**

```typescript
class OrderStore extends ZenithStore<State> {
  // ✅ Centralized business logic, compiler-enforced standards
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
    if (items.length === 0) throw new Error("Cart is empty");
    if (items.some((x) => x.stock < x.quantity)) throw new Error("Out of stock");
  }

  private syncToServer() {
    // Unified side-effect handling
  }
}

// In component
function CheckoutButton() {
  const storeApi = useStoreApi();
  // ✅ Can only use API
  storeApi?.submitOrder(items);

  // ❌ Cannot bypass validation
  // store.produceData(...)  // TypeScript error: produceData is protected
}
```

**Challenges of flexible approaches:**

```typescript
// Flexible but error-prone
const set = useStore.setState;
// In one component
set({ orders: [...orders, newOrder], cart: [] }); // Forgot validation!
// In another component
if (cart.length > 0) {
  set({ orders: [...orders, newOrder] }); // Forgot to clear cart!
}
// 20 places, 20 different ways, difficult to debug
```

## 📊 Full Comparison

| Feature         | Zenith           | Zustand          | MobX            | Redux Toolkit   |
| --------------- | ---------------- | ---------------- | --------------- | --------------- |
| **API Simplicity** | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐       | ⭐⭐⭐          | ⭐⭐⭐          |
| **Computed**    | ✅ @memo         | ❌               | ✅ computed     | ⚠️ selector     |
| **Stable Refs** | ✅ Auto          | ⚠️ Manual memo   | ✅ Auto         | ⚠️ reselect     |
| **Chained**     | ✅               | ❌               | ✅              | ⚠️ Complex      |
| **Encapsulation**| ✅              | ❌               | ⚠️              | ✅              |
| **Middleware**  | ✅ Built-in      | ✅               | ❌              | ✅              |
| **Undo/Redo**   | ✅ Patches       | ❌               | ❌              | ⚠️ Plugin       |
| **DevTools**    | ✅               | ⚠️ 3rd-party     | ✅              | ✅              |
| **TypeScript**  | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐        | ⭐⭐⭐⭐⭐      |
| **Learning**    | ⭐⭐⭐           | ⭐⭐             | ⭐⭐⭐⭐        | ⭐⭐⭐⭐        |
| **Bundle Size** | 2KB core         | ~3KB             | ~16KB           | ~22KB           |

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

## 🔌 Middleware Architecture

Zenith adopts a Middleware architecture with a lightweight core (2KB), load features on-demand:

### Core Middleware

#### 📦 withHistory - Undo/Redo

> **Zenith's core capability**: Though separated from Core, this is one of the most important features

Based on Immer Patches, 100x more memory efficient:

**Features:**

- ✅ Memory usage is 1% of snapshot approach
- ✅ Smart debounce merging
- ✅ Precise granularity control
- ✅ Suitable for editors, canvases, etc.

**[📖 Full Documentation](./docs/middleware-history.en.md)**

#### 🛠️ devtools - Redux DevTools Integration

Debug Store in development environment:

**Features:**

- ✅ Action tracking
- ✅ Time travel
- ✅ State export/import
- ✅ Zero config

**[📖 Full Documentation](./docs/middleware-devtools.en.md)**

## 📖 Documentation & Examples

**[📚 Full API Documentation](./docs/api.en.md)** · **[Todo App Example](./docs/todo-app.en.md)**

---

## 🎯 Real-World Case: domd

**[domd](https://demo.domd.app/?src=https://github.com/do-md/zenith)** — Powerful WYSIWYG Markdown editor built with Zenith

- 📦 **20KB, Full-Featured** — Only depends on Immer + Zenith, complete Markdown parsing and editing capabilities
- 🚀 **20000+ Lines Smooth Editing** — No lag, no delay, excellent performance
- 💾 **Extremely Low Memory Usage** — Perfect practice of stable references + Immer Patches
- 🔜 **Coming Open Source**

---

## 📄 License

MIT © [Jayden Wang](https://github.com/do-md)

## 💡 Acknowledgments

Zenith is built on top of **[Immer](https://github.com/immerjs/immer)** — an excellent library created by [Michel Weststrate](https://github.com/mweststrate) that makes immutable state updates natural and elegant.
