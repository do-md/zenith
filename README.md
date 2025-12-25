# Zenith

**Engineering-grade React State Management · Merging Zustand's Simplicity with MobX's Organizational Power**

[![npm version](https://img.shields.io/npm/v/@do-md/zenith.svg?style=flat-square)](https://www.npmjs.com/package/@do-md/zenith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Powered by Immer](https://img.shields.io/badge/Powered%20by-Immer-00D8FF?style=flat-square)](https://immerjs.github.io/immer/)
[![Gzipped Size](https://img.shields.io/badge/minzipped-1kb-success?style=flat-square)](https://bundlephobia.com/package/@do-md/zenith)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

---

## ⚡️ Introduction

Zenith is an **Automated Reactivity Model based on Immutable Data**.

It aims to solve a classic dilemma in React state management: how to enjoy **MobX's automated derivation** capabilities while retaining the **predictability of Redux/Immer snapshots**.

- 🛡️ **Immer's Immutability** — Fits React's intuition, structural sharing, and high-performance snapshots.
- 🎯 **Zustand's Simplicity** — Zero boilerplate, intuitive API.
- ⚡️ **MobX's Reactivity** — Reactive computed properties, automatic dependency tracking, multi-level chained derivation, and rejection of unnecessary renders.
- 🏢 **Enterprise Engineering** — Forced encapsulation of business logic, preventing arbitrary state modification from the UI layer.

---

## 🚀 Get Started in 30 Seconds

### 1. Define Store

Use `class` to organize logic and `@memo` to define high-performance computed properties.

```typescript
import { ZenithStore, memo } from "@do-md/zenith";

class TodoStore extends ZenithStore<State> {
  constructor() {
    super({ todos: [], filter: "all" });
  }

  // ⚡️ Computed: Dependencies tracked automatically, result cached automatically
  // filteredTodos only recalculates when 'todos' or 'filter' changes
  @memo((s) => [s.state.todos, s.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state;
    if (filter === "all") return todos;
    return todos.filter((t) => t.completed === (filter === "completed"));
  }

  // 🔗 Chained Derivation: Based on the previous computed property
  @memo((s) => [s.filteredTodos])
  get stats() {
    return {
      total: this.filteredTodos.length,
      active: this.filteredTodos.filter((t) => !t.completed).length,
    };
  }

  // 🔧 Business Action: Mutate Draft directly, Immer handles immutability
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

### 2. Use in Components

Use Hooks just like Zustand, and enjoy complete TypeScript type inference.

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
  // ✅ Chained Derivation: stats depends on filteredTodos, filteredTodos depends on todos
  // When filter changes -> filteredTodos updates -> stats updates -> component re-renders
  const stats = useStore((s) => s.stats);
  return (
    <div>
      Total: {stats.total} | Active: {stats.active}
    </div>
  );
}

function TodoList() {
  // ✅ Selector Pattern: Renders only when filteredTodos changes
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

## Deep Dive into Core Features

### 1️⃣ Smart Computed Properties (`@memo`)

Reject unnecessary renders. Zenith's `@memo` is similar to MobX's `computed`, but strictly based on immutable data.

- **Chained Derivation**: Computed properties can depend on other computed properties, building an efficient data flow graph.
- **Precise Updates**: If the computed result's reference hasn't changed (Reference Equality), the component won't re-render.
- **Explicit Dependencies**: `@memo((s) => [deps])` lets you clearly know the data flow, avoiding MobX's "magic" black box.

### 2️⃣ Force Encapsulation

In team collaboration, the biggest fear in state management is "arbitrary modification." Zustand allows `setState` anywhere in components, leading to scattered business logic.

**Zenith forces you to write logic inside the Store:**

```typescript
// ✅ Good: UI only invokes intent
<button onClick={() => store.submitOrder(items)} />

// ❌ Bad: UI cannot directly modify State (no setState method exposed)
// store.state.orders = ... // Error!
```

This makes **refactoring extremely simple** (Refactor-friendly), and Find Usages is always accurate.

### 3️⃣ Flexible Lifecycle Management (`StoreProvider`)

**Reject state pollution, support component-level state isolation.**

`StoreProvider` grants Store complete control over React lifecycle:

- **🔄 Component-level Isolation**: Each `<StoreProvider>` creates an independent Store instance with completely isolated state between different component trees.
- **♻️ Automatic Cleanup**: Store is automatically destroyed when the component unmounts, preventing memory leaks.
- **🧩 Reusable Components**: The same Store can be used in multiple places, each instance having independent state, naturally supporting modularity.

```tsx
// ✅ Recommended: Control lifecycle via Provider
function App() {
  return (
    <>
      <StoreProvider>
        <TodoList /> {/* Independent Store instance A */}
      </StoreProvider>
      <StoreProvider>
        <TodoList /> {/* Independent Store instance B */}
      </StoreProvider>
    </>
  );
}

// ⚠️ Global Store also supported, but not recommended (loses lifecycle management benefits)
const globalStore = new TodoStore();
```

**Always use `StoreProvider` is recommended**, even for global state scenarios, you'll gain better testability and component isolation.

### 4️⃣ Built-in Middleware Architecture

Core is only ~1KB, but functionality is infinitely extensible.

- **📦 withHistory**: Undo/Redo based on Patches. Memory usage is **100x lower** than snapshot solutions, designed for editors/canvases.
  - [📖 History Middleware Docs](./docs/middleware-history.en.md)
- **🛠️ DevTools**: Zero-config Redux DevTools integration, supporting Time Travel debugging.
  - [📖 DevTools Middleware Docs](./docs/middleware-devtools.en.md)

---

## 📊 Comparison

| Feature | Zenith | Zustand | MobX | Redux Toolkit |
| :--- | :--- | :--- | :--- | :--- |
| **Core Paradigm** | **Immutable Class** | Functional | Mutable Class | Functional |
| **Computed Props** | ✅ **@memo (Chained)** | ❌ (Manual) | ✅ computed | ⚠️ selector |
| **API Simplicity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Type Safety** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Team Standard** | ✅ **Force Encapsulation** | ❌ Weak | ⚠️ Weak | ✅ Strong |
| **Undo/Redo** | ✅ **Patches (Fast)** | ❌ | ❌ | ⚠️ Heavy |
| **Bundle Size** | **~1KB** | ~1KB | ~16KB | ~20KB+ |

---

## 📖 More Documentation

- **[📚 Complete API Docs](./docs/api.en.md)**
- **[Todo App Complete Example](./docs/todo-app.en.md)**

---

## 📦 Installation

Zenith relies on `immer` to handle immutable data.

```bash
# npm
npm install @do-md/zenith immer

# pnpm
pnpm add @do-md/zenith immer

# yarn
yarn add @do-md/zenith immer
```

Configure `tsconfig.json` to support decorators:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

---

## 🎯 Real-world Case

**[domd](https://demo.domd.app/?src=https://github.com/do-md/zenith)** — A powerful WYSIWYG Markdown editor built on Zenith.
- ⚡️ **Performance**: Handles 20,000+ lines of documents smoothly.
- 🔙 **Undo**: Precise Undo/Redo based on Zenith History middleware.
- 💾 **Memory**: Immer Patches significantly reduce memory overhead.

---

## 📄 License

MIT © [Jayden Wang](https://github.com/do-md)
