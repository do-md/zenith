# Zenith

**工程化的 React 状态管理 · 基于 Immer 的强大能力**

[![npm version](https://img.shields.io/npm/v/@do-md/zenith.svg)](https://www.npmjs.com/package/@do-md/zenith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Powered by Immer](https://img.shields.io/badge/Powered%20by-Immer-00D8FF)](https://immerjs.github.io/immer/)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

---

## 📑 快速导航

**[🚀 快速开始](#-快速开始)** · **[📊 全面对比](#-全面对比)** · **[🎯 真实案例](#-真实案例domd)**

---

## ✨ 为什么选择 Zenith？

**Simple as Zustand, Powerful as MobX**

用 Zustand 的简洁，获得 MobX 的响应能力，加上独有的工程化特性

> **Zenith = Zustand 的易用性 + MobX 的计算属性 + 超越两者的工程化**

- 🎯 **Zustand 的 API** — 轻量、直观、零配置，5 分钟上手
- 🧲 **MobX 的能力** — 计算属性、链式派生、稳定引用，杜绝无效渲染
- 🔧 **独有的工程化** — Middleware 架构、Immer Patches、DevTools、异步查询
- 🏢 **适合团队** — 强制封装、TypeScript 优先、业务逻辑无法被绕过

## 🎯 核心能力

### 1️⃣ **计算属性 + 链式派生：响应式系统的核心**

> 计算属性和链式派生让你的代码符合"单一数据流"原则：**写入侧只需修改原子状态，读取侧自动获取最新派生状态**

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

  // 📍 计算属性：自动缓存 + 稳定引用
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state;
    if (filter === "all") return todos;
    return todos.filter((t) =>
      filter === "active" ? !t.completed : t.completed
    );
  }

  // 🔗 链式派生：基于上一个计算属性
  @memo((self) => [self.filteredTodos])
  get stats() {
    return {
      total: this.filteredTodos.length,
      completed: this.filteredTodos.filter((t) => t.completed).length,
      active: this.filteredTodos.filter((t) => !t.completed).length,
    };
  }

  // ✅ 业务方法：只需修改原子状态
  setFilter(filter: State["filter"]) {
    this.produce((s) => {
      s.filter = filter;
    });
    // filteredTodos 和 stats 自动响应更新
  }

  toggleTodo(id: string) {
    this.produce((s) => {
      const todo = s.todos.find((t) => t.id === id);
      if (todo) todo.completed = !todo.completed;
    });
  }
}
```

**三个组件展示响应式更新：**

```typescript
// 组件 1：显示过滤后的列表
function TodoList() {
  const todos = useStore(s => s.filteredTodos)
  // ✅ 只在 todos 或 filter 变化时重渲染
  return <div>{todos.map(t => <TodoItem key={t.id} todo={t} />)}</div>
}

// 组件 2：显示统计信息
function TodoStats() {
  const stats = useStore(s => s.stats)
  // ✅ 只在 filteredTodos 变化时重渲染
  return <div>总计: {stats.total} | 完成: {stats.completed}</div>
}

// 组件 3：切换过滤器
function TodoFilter() {
  const filter = useStore(s => s.state.filter)
  const store = useStoreApi()
  // ✅ 只在 filter 变化时重渲染
  return (
    <div>
      <button onClick={() => store.setFilter('all')}>全部</button>
      <button onClick={() => store.setFilter('active')}>进行中</button>
    </div>
  )
}
```

**为什么链式派生如此重要？**

计算属性和链式派生让响应式系统真正强大：

1. **业务逻辑简单**：`setFilter('active')` 一行代码，所有派生状态自动更新
2. **性能自动优化**：框架保证只重算受影响的链路，避免无效计算
3. **引用稳定**：依赖不变时返回相同引用，避免组件无效重渲染

**更新传播链路：**

```
场景 1：切换过滤器
setFilter('active')
  ↓
state.filter 变化
  ↓
filteredTodos 重新计算（依赖 todos + filter）
  ↓
stats 重新计算（依赖 filteredTodos）
  ↓
TodoList 和 TodoStats 重新渲染

场景 2：切换待办状态
toggleTodo(id)
  ↓
state.todos 变化
  ↓
filteredTodos 重新计算
  ↓
stats 重新计算
  ↓
TodoList 和 TodoStats 重新渲染
```

### 2️⃣ **强制封装 - 团队级工程化**

```typescript
class OrderStore extends ZenithStore<State> {
  // ✅ 业务逻辑集中，编译器强制规范
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
    if (items.length === 0) throw new Error("购物车为空");
    if (items.some((x) => x.stock < x.quantity)) throw new Error("库存不足");
  }

  private syncToServer() {
    // 统一的副作用处理
  }
}

// 组件中
function CheckoutButton() {
  const storeApi = useStoreApi();
  // ✅ 只能通过 API
  storeApi?.submitOrder(items);

  // ❌ 无法绕过验证
  // store.produceData(...)  // TypeScript 报错：produceData 是 protected
}
```

**对比灵活方案的挑战**：

```typescript
// 灵活但容易出错的写法
const set = useStore.setState;
// 某个组件里
set({ orders: [...orders, newOrder], cart: [] }); // 忘记验证！
// 另一个组件里
if (cart.length > 0) {
  set({ orders: [...orders, newOrder] }); // 忘记清空购物车！
}
// 20 个地方，20 种写法，调试困难
```

## 📊 全面对比

| 特性           | Zenith      | Zustand      | MobX        | Redux Toolkit |
| -------------- | ----------- | ------------ | ----------- | ------------- |
| **API 简洁性** | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐   | ⭐⭐⭐      | ⭐⭐⭐        |
| **计算属性**   | ✅ @memo    | ❌           | ✅ computed | ⚠️ selector   |
| **稳定引用**   | ✅ 自动     | ⚠️ 手动 memo | ✅ 自动     | ⚠️ reselect   |
| **链式派生**   | ✅          | ❌           | ✅          | ⚠️ 复杂       |
| **强制封装**   | ✅          | ❌           | ⚠️          | ✅            |
| **Middleware** | ✅ 内置架构 | ✅           | ❌          | ✅            |
| **撤销/重做**  | ✅ Patches  | ❌           | ❌          | ⚠️ 插件       |
| **DevTools**   | ✅          | ⚠️ 第三方    | ✅          | ✅            |
| **TypeScript** | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐    |
| **学习曲线**   | ⭐⭐⭐      | ⭐⭐         | ⭐⭐⭐⭐    | ⭐⭐⭐⭐      |
| **包体积**     | 2KB 核心    | ~3KB         | ~16KB       | ~22KB         |

---

## 🚀 快速开始

### 安装

```bash
npm install @do-md/zenith immer
# or
pnpm add @do-md/zenith immer
```

> **注意**：Immer 是 peer dependency，需要显式安装

### 启用 TypeScript 装饰器

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

## 🔌 Middleware 架构

Zenith 采用 Middleware 架构，核心轻量（2KB），功能按需加载：

### 核心 Middleware

#### 📦 withHistory - 撤销/重做

> **Zenith 的核心能力**：虽从 Core 剥离，但这是最重要的特性之一

基于 Immer Patches 实现，内存高效 100 倍：

**特点：**

- ✅ 内存占用是快照方案的 1%
- ✅ 智能防抖合并
- ✅ 精确粒度控制
- ✅ 适用于编辑器、画板等场景

**[📖 完整文档](./docs/middleware-history.zh-CN.md)**

#### 🛠️ devtools - Redux DevTools 集成

在开发环境中调试 Store：

**特点：**

- ✅ Action 追踪
- ✅ 时间旅行
- ✅ 状态导出/导入
- ✅ 零配置

**[📖 完整文档](./docs/middleware-devtools.zh-CN.md)**

## 📖 文档与示例

**[📚 完整 API 文档](./docs/api.zh-CN.md)** · **[Todo App 完整示例](./docs/todo-app.zh-CN.md)**

---

## 🎯 真实案例：domd

**[domd](https://demo.domd.app/?src=https://github.com/do-md/zenith)** — 基于 Zenith 构建的强大所见即所得 Markdown 编辑器

- 📦 **20KB，完整能力** — 仅依赖 Immer + Zenith，具备完整的 Markdown 解析与编辑能力
- 🚀 **20000+ 行丝滑编辑** — 无卡顿、无延迟，性能卓越
- 💾 **极低内存占用** — 稳定引用 + Immer Patches 的完美实践
- 🔜 **即将开源**

---

## 📄 开源协议

MIT © [Jayden Wang](https://github.com/do-md)

## 💡 致谢

Zenith 构建于 **[Immer](https://github.com/immerjs/immer)** 之上 — 这是 [Michel Weststrate](https://github.com/mweststrate) 创造的杰出库，让不可变状态更新变得自然而优雅。
