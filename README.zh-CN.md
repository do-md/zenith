# Zenith

**工程化的 React 状态管理 · 融合 Zustand 的极简与 MobX 的组织力**

[![npm version](https://img.shields.io/npm/v/@do-md/zenith.svg?style=flat-square)](https://www.npmjs.com/package/@do-md/zenith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Powered by Immer](https://img.shields.io/badge/Powered%20by-Immer-00D8FF?style=flat-square)](https://immerjs.github.io/immer/)
[![Gzipped Size](https://img.shields.io/badge/minzipped-3.5kb-success?style=flat-square)](https://bundlephobia.com/package/@do-md/zenith)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

---

## ⚡️ 简介

Zenith 是一个 **基于不可变数据（Immutable Data）的自动化响应模型**。

它旨在解决 React 状态管理中的一个经典矛盾：如何在享受 **MobX 自动派生能力**的同时，保留 **Redux/Immer 快照的可预测性**。

- 🛡️ **Immer 的不可变性** — 符合 React 直觉，数据结构共享，高性能快照。
- ⚡️ **MobX 的响应力** — 响应式计算属性、自动依赖追踪，多层级链式派生，拒绝无效渲染。
- 🎯 **Zustand 的极简** — 零模版代码，直观的 API。
- 🏢 **企业级工程化** — 强制封装业务逻辑，拒绝 UI 层随意修改状态。

---

## 🚀 30 秒上手

### 1. 定义 Store

使用 `class` 组织逻辑，用 `@memo` 定义高性能计算属性。

```typescript
import { ZenithStore, memo } from "@do-md/zenith";

class TodoStore extends ZenithStore<State> {
  constructor() {
    super({ todos: [], filter: "all" });
  }

  // ⚡️ 计算属性：依赖自动追踪，结果自动缓存
  // 只有当 todos 或 filter 变化时，filteredTodos 才会重新计算
  @memo((s) => [s.state.todos, s.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state;
    if (filter === "all") return todos;
    return todos.filter((t) => t.completed === (filter === "completed"));
  }

  // 🔗 链式派生：基于上一个计算属性
  @memo((s) => [s.filteredTodos])
  get stats() {
    return {
      total: this.filteredTodos.length,
      active: this.filteredTodos.filter((t) => !t.completed).length,
    };
  }

  // 🔧 业务 Action：直接修改 Draft，Immer 负责生成不可变数据
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

### 2. 在组件中使用

像 Zustand 一样使用 Hooks，具备完整的 TypeScript 类型推导。

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
  // ✅ 链式派生：stats 依赖 filteredTodos，filteredTodos 依赖 todos
  // 当切换 filter 时，filteredTodos 变 -> stats 变 -> 组件重渲染
  const stats = useStore((s) => s.stats);
  return (
    <div>
      总计: {stats.total} | 待办: {stats.active}
    </div>
  );
}

function TodoList() {
  // ✅ Selector 模式：只在 filteredTodos 变化时渲染
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

## 核心特性深度解析

### 1️⃣ 智能的计算属性 (`@memo`)

拒绝无效渲染。Zenith 的 `@memo` 类似于 MobX 的 `computed`，但完全基于不可变数据。

- **链式派生**：计算属性可以依赖其他计算属性，构建高效的数据流图。
- **精准更新**：如果计算结果的引用没有变化（Reference Equality），组件不会重渲染。
- **显式依赖**：`@memo((s) => [deps])` 让你清楚地知道数据流向，避免 MobX 的"魔法"黑盒。

### 2️⃣ 强制封装 (Force Encapsulation)

在团队协作中，状态管理最怕"随意修改"。Zustand 允许在组件中随意 `setState`，导致业务逻辑分散。

**Zenith 强制你把逻辑写在 Store 内部：**

```typescript
// ✅ Good: UI 只负责调用意图
<button onClick={() => store.submitOrder(items)} />

// ❌ Bad: UI 无法直接修改 State（没有 setState 方法暴露）
// store.state.orders = ... // Error!
```

这使得**重构变得极其简单**（Refactor-friendly），查找引用（Find Usages）永远准确。

### 3️⃣ 内置中间件架构

核心仅 2KB，但功能无限扩展。

- **📦 withHistory**：基于 Patches 的撤销/重做。内存占用比快照方案低 **100倍**，专为编辑器/画板设计。
  - [📖 History 中间件文档](./docs/middleware-history.zh-CN.md)
- **🛠️ DevTools**：零配置接入 Redux DevTools，支持时间旅行调试。
  - [📖 DevTools 中间件文档](./docs/middleware-devtools.zh-CN.md)

---

## 📊 选型对比

| 特性 | Zenith | Zustand | MobX | Redux Toolkit |
| :--- | :--- | :--- | :--- | :--- |
| **核心范式** | **Immutable Class** | Functional | Mutable Class | Functional |
| **计算属性** | ✅ **@memo (链式)** | ❌ (需手动) | ✅ computed | ⚠️ selector |
| **API 简洁性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **类型安全** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **团队规范性** | ✅ **强制封装** | ❌ 弱约束 | ⚠️ 弱约束 | ✅ 强约束 |
| **撤销/重做** | ✅ **Patches (极快)** | ❌ | ❌ | ⚠️ 较重 |
| **包体积** | **~3.5KB** | ~1KB | ~16KB | ~20KB+ |

---

## 📖 更多文档

- **[📚 完整 API 文档](./docs/api.zh-CN.md)**
- **[Todo App 完整示例](./docs/todo-app.zh-CN.md)**

---

## 📦 安装

Zenith 依赖 `immer` 来处理不可变数据。

```bash
# npm
npm install @do-md/zenith immer

# pnpm
pnpm add @do-md/zenith immer

# yarn
yarn add @do-md/zenith immer
```

配置 `tsconfig.json` 以支持装饰器：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

---

## 🎯 真实案例

**[domd](https://demo.domd.app/?src=https://github.com/do-md/zenith)** — 基于 Zenith 构建的所见即所得 Markdown 编辑器。
- ⚡️ **性能**：处理 20,000+ 行文档丝滑流畅。
- 🔙 **撤销**：基于 Zenith History 中间件的精确撤销重做。
- 💾 **内存**：Immer Patches 极大降低了内存开销。

---

## 📄 License

MIT © [Jayden Wang](https://github.com/do-md)
