# Zenith

**工程化的 React 状态管理 · 基于 Immer 的强大能力**

[![npm version](https://img.shields.io/npm/v/@do-md/zenith.svg)](https://www.npmjs.com/package/@do-md/zenith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Powered by Immer](https://img.shields.io/badge/Powered%20by-Immer-00D8FF)](https://immerjs.github.io/immer/)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

---

## 📑 快速导航

**[🚀 快速开始](#-快速开始)** · **[📖 API 参考](#-api-参考)** · **[🎯 真实案例](#-真实案例domd)** · **[📊 全面对比](#-全面对比)**

---

## ✨ 为什么选择 Zenith？

- 🧊 **天然不可变** — 基于 Immer，用可变的写法，得到不可变的状态
- ⚡ **响应式计算属性** — 自动缓存、稳定引用、杜绝无效渲染
- ⏪ **内置撤销/重做** — Immer Patches，内存效率是快照方案的 100 倍
- 🔒 **适合团队** — 强制封装，业务逻辑无法被绕过
- 🎯 **友好的 API** — 直观的更新方式，简洁的 Hooks，TypeScript 优先

---

## 💥 一个对比，看懂 Zenith

### 场景：展示活跃用户列表（包含过滤和映射）

#### ❌ 常见写法：重复渲染 + 重复计算

```typescript
function ActiveUsers() {
  // 问题1：每次都是新数组，selector 对比失败 → 必定重渲染
  const activeUsers = useStore(s => 
    s.users.filter(u => u.active).map(u => ({ id: u.id, name: u.name }))
  )
  // 即使 users 没变，也会重新渲染！
}

function UserCount() {
  // 问题2：手动 memo，3 个组件就要写 3 次
  const users = useStore(s => s.users)
  const activeUsers = useMemo(() => 
    users.filter(u => u.active).map(u => ({ id: u.id, name: u.name })),
    [users]
  )
  // 还是会重复计算 + 缓存 3 份
}
```

**挑战**：
1. ⚠️ **不必要的重渲染**：每次 selector 返回新引用
2. ⚠️ **重复计算**：每个组件都要算一遍
3. ⚠️ **内存浪费**：缓存 N 份相同数据

---

#### ✅ Zenith：稳定引用 + 全局缓存

```typescript
class UserStore extends ZenithStore<State> {
  // 写一次，处处受益
  @memo((self) => [self.state.users])
  get activeUsers() {
    return this.state.users
      .filter(u => u.active)
      .map(u => ({ id: u.id, name: u.name }))
  }
  // ✅ 只在 users 变化时重新计算
  // ✅ 返回稳定引用（依赖不变 = 引用不变）
  // ✅ 所有组件共享一份结果
}

function ActiveUsers() {
  const activeUsers = useContextGetter(UserContext, s => s.activeUsers)
  // ✅ users 不变 → activeUsers 引用不变 → 不触发渲染
}

function UserCount() {
  const activeUsers = useContextGetter(UserContext, s => s.activeUsers)
  // ✅ 复用同一份数据，零额外计算
}
```

**优势**：
- ✅ **稳定引用**：依赖不变时，返回相同对象引用，避免不必要的重渲染
- ✅ **计算一次**：所有组件共享计算结果
- ✅ **自动清理**：无组件使用时释放内存（RefCount 机制）

---

## 🎯 核心优势

### 1️⃣ **@memo 装饰器 - 稳定引用 + 自动缓存**

#### 问题：派生状态的重渲染陷阱

```typescript
// ❌ 常见错误：每次都是新对象 → 必定重渲染
const filteredList = useStore(s => s.list.filter(x => x.active))
const mappedList = useStore(s => s.list.map(x => ({ ...x, label: x.name })))

// 即使 list 没变，组件也会重新渲染！
// 原因：useSyncExternalStore 用 Object.is 对比，新数组 !== 旧数组
```

#### 解决：@memo 保证引用稳定

```typescript
class DataStore extends ZenithStore<State> {
  // ✅ 依赖不变 → 引用不变 → 不触发渲染
  @memo((self) => [self.state.list])
  get filteredList() {
    return this.state.list.filter(x => x.active)
  }
  
  // ✅ 链式派生：基于上一个 memo 的稳定引用
  @memo((self) => [self.filteredList])
  get sortedList() {
    return [...this.filteredList].sort((a, b) => a.score - b.score)
  }
  
  // ✅ 多依赖：任一变化才重新计算
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
  // ✅ 只在 list/filter/sortBy 任一变化时重新渲染
  // ✅ 其他 state 变化（如 loading）不会触发这个组件渲染
}
```

---

### 2️⃣ **强制封装 - 团队级工程化**

```typescript
class OrderStore extends ZenithStore<State> {
  // ✅ 业务逻辑集中，编译器强制规范
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
    if (items.length === 0) throw new Error('购物车为空')
    if (items.some(x => x.stock < x.quantity)) throw new Error('库存不足')
  }
  
  private syncToServer() {
    // 统一的副作用处理
  }
}

// 组件中
function CheckoutButton() {
  const store = useContext(OrderContext)
  // ✅ 只能通过 API
  store?.submitOrder(items)
  
  // ❌ 无法绕过验证
  // store.produceData(...)  // TypeScript 报错：produceData 是 protected
}
```

**对比灵活方案的挑战**：

```typescript
// 灵活但容易出错的写法
const set = useStore.setState
// 某个组件里
set({ orders: [...orders, newOrder], cart: [] })  // 忘记验证！
// 另一个组件里
if (cart.length > 0) {
  set({ orders: [...orders, newOrder] })  // 忘记清空购物车！
}
// 20 个地方，20 种写法，调试困难
```

---

### 3️⃣ **Immer Patches - 撤销/重做的最佳实践** ⭐

> **核心技术：基于 Immer 的 Patches 机制**

Zenith 深度集成 [Immer](https://immerjs.github.io/immer/)，利用其革命性的 Patches 能力实现：

#### 🎯 内存高效 100 倍

```typescript
class EditorStore extends ZenithStore<EditorState> {
  constructor() {
    super({ content: '' }, {
      enableHistory: true,      // 启用 Immer Patches 历史
      enablePatch: true,
      historyDebounceTime: 100  // 智能合并
    })
  }
}

store.undo()  // 应用 Immer 的 inversePatches
store.redo()  // 应用 Immer 的 patches
```

**内存对比**（1MB 文档，30 个历史）：
- 快照方案：1MB × 30 = **30MB**
- **Zenith + Immer Patches**：~10KB × 30 = **~300KB**
- **节省：100 倍！**

#### 🎮 智能历史合并

```typescript
class EditorStore extends ZenithStore<EditorState> {
  // 场景1：连续输入自动合并
  insertText(text: string) {
    this.produceData(state => {
      state.content += text  // Immer 追踪变化
    })
    // 100ms 内的连续输入自动合并成一个 Patch 组
  }
  
  // 场景2：拖拽精确控制
  startDrag(nodeId: string) {
    this.updateKeepRecord(true)  // 开始合并
  }
  
  onDrag(nodeId: string, position: Position) {
    this.produceData(state => {
      state.nodes.find(n => n.id === nodeId).position = position
    })
    // 多次 Patches 合并为一个历史单元
  }
  
  endDrag() {
    this.updateKeepRecord(false)  // 结束合并
  }
}
```

**特性**：
- ✅ **自动防抖合并**（连续操作合并为一个撤销单元）
- ✅ **精确粒度控制**（`keepRecord` 机制）
- ✅ **时间旅行调试**（基于 Immer Patches）

---

## 📊 全面对比

| 特性 | Zenith | Zustand | MobX | Redux Toolkit |
|------|----------|---------|------|---------------|
| **稳定引用** | ✅ 自动保证 | ⚠️ 需手动 memo | ✅ computed | ⚠️ reselect |
| **派生状态** | ✅ @memo 装饰器 | ⚠️ 手写 useMemo | ✅ computed | ⚠️ createSelector |
| **跨组件共享缓存** | ✅ Store 级 | ❌ 组件级 | ✅ | ✅ |
| **自动内存清理** | ✅ RefCount | ❌ | ❌ | ❌ |
| **避免重渲染** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **撤销/重做** | ✅ Immer Patches | ❌ 需手写 | ❌ 需手写 | ⚠️ 需插件 |
| **历史合并** | ✅ 智能防抖 | ❌ | ❌ | ❌ |
| **协同编辑** | ✅ Immer Patches 原生 | ❌ | ❌ | ❌ |
| **强制封装** | ✅ Protected | ❌ 完全开放 | ⚠️ 可绕过 | ✅ |
| **不可变更新** | ✅ Immer 保证 | ⚠️ 手动保证 | ❌ Mutable | ✅ Immer 可选 |
| **TypeScript** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **学习曲线** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **包体积** | ~3KB + Immer | ~3KB | ~16KB | ~22KB + Immer |

### 推荐场景

| 方案 | 最适合场景 | 核心优势 |
|------|-----------|---------|
| **Zenith** | 📝 编辑器、🎨 协同工具、📊 数据密集应用 | Immer Patches + 稳定引用 + 工程化 |
| **Zustand** | 📱 简单应用、快速原型 | 轻量、API 简洁 |
| **MobX** | 🔄 响应式应用、复杂状态图 | 自动依赖追踪、细粒度更新 |
| **Redux Toolkit** | 🏢 大型企业应用、需严格规范 | 生态完善、DevTools 强大 |

---

## 🤔 Zenith 适合你吗？

### ✅ 强烈推荐

- **📝 编辑器类应用**（Markdown、代码、富文本）
  - 需要撤销/重做：Immer Patches 内存高效 100 倍
  - 需要协同编辑：Patches 是行业标准格式
  
- **🎨 绘图/流程图工具**
  - 拖拽历史合并：精确控制撤销粒度
  - 复杂计算缓存：@memo 稳定引用避免重渲染
  
- **📊 数据密集应用**
  - 多层过滤/排序/映射：链式 @memo 避免重复计算
  - 大列表渲染：稳定引用是虚拟列表的关键
  
- **👥 团队协作项目**（>3 人）
  - 强制封装：编译器保证业务逻辑不被绕过
  - 代码审查友好：只需检查 Store 类

### ⚠️ 可能不适合

- **📱 简单 CRUD**
  - 计数器、简单表单：Zustand 更轻量
  - 无复杂派生状态：用不上 @memo
  
- **🚀 快速原型**
  - 需要装饰器配置：初期成本略高
  - 简单场景：可能略显重型

### 💡 从其他方案迁移

#### 从 Zustand 迁移
- ✅ API 类似，学习成本低
- ✅ 渐进式增强，按需启用功能
- ✅ 性能更优（稳定引用 + 全局缓存）

```typescript
// Zustand 风格
const useStore = create((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}))

// Zenith 风格（类似但更强大）
class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produceData(state => { state.count++ })  // Immer 的简洁语法
  }
}
```

#### 从 Redux 迁移
- ✅ 更简洁（无需 actions/reducers 分离）
- ✅ 保留规范性（强制封装 + TypeScript）
- ✅ 更高效（Immer Patches vs 完整快照）

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

### 完整示例

```typescript
import { ZenithStore, memo, useContextGetter } from '@do-md/zenith'
import { createContext, useState, useContext } from 'react'

// 1. 定义 State
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

// 2. 定义 Store
class TodoStore extends ZenithStore<TodoState> {
  constructor() {
    super(
      { 
        todos: [], 
        filter: 'all',
        searchTerm: ''
      },
      {
        enableHistory: true,    // 启用 Immer Patches 历史
        enablePatch: true,
        historyDebounceTime: 100
      }
    )
  }
  
  // ✅ 派生状态：自动缓存 + 稳定引用
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state
    if (filter === 'all') return todos
    return todos.filter(t => 
      filter === 'active' ? !t.completed : t.completed
    )
  }
  
  // ✅ 链式派生
  @memo((self) => [self.filteredTodos, self.state.searchTerm])
  get displayTodos() {
    const term = this.state.searchTerm.toLowerCase()
    if (!term) return this.filteredTodos
    return this.filteredTodos.filter(t => 
      t.text.toLowerCase().includes(term)
    )
  }
  
  // ✅ 计算属性
  @memo((self) => [self.state.todos])
  get stats() {
    const total = this.state.todos.length
    const completed = this.state.todos.filter(t => t.completed).length
    return { total, completed, active: total - completed }
  }
  
  // Actions：封装业务逻辑
  addTodo(text: string) {
    if (!text.trim()) {
      throw new Error('待办事项不能为空')
    }
    
    // Immer 的简洁更新语法
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

// 3. 创建 Context
const TodoContext = createContext<TodoStore | null>(null)

// 4. 使用
function TodoList() {
  // ✅ displayTodos 引用稳定，只在依赖变化时重渲染
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
  // ✅ stats 是稳定引用，todos 变化才重渲染
  // ✅ filter 或 searchTerm 变化不会触发这个组件渲染
  const stats = useContextGetter(TodoContext, s => s.stats)
  
  return (
    <div>
      总计：{stats.total} | 
      已完成：{stats.completed} | 
      进行中：{stats.active}
    </div>
  )
}

function TodoFilters() {
  const filter = useContextGetter(TodoContext, s => s.state.filter)
  const store = useContext(TodoContext)
  
  return (
    <div>
      <button onClick={() => store?.setFilter('all')}>全部</button>
      <button onClick={() => store?.setFilter('active')}>进行中</button>
      <button onClick={() => store?.setFilter('completed')}>已完成</button>
      {/* 基于 Immer Patches 的撤销/重做 */}
      <button onClick={() => store?.undo()}>撤销</button>
      <button onClick={() => store?.redo()}>重做</button>
    </div>
  )
}

// 5. 提供 Store
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

## 💎 为什么稳定引用这么重要？

### 问题演示

```typescript
// ❌ 常见性能陷阱
function UserList() {
  const activeUsers = useStore(s => 
    s.users.filter(u => u.active)  // 每次返回新数组
  )
  
  // 问题：即使 users 完全没变，这个组件也会每秒重渲染！
  // 原因：其他 state 变化（如 loading）→ selector 重新执行 → 新数组引用
}

// ✅ Zenith 解决方案
class UserStore extends ZenithStore<State> {
  @memo((self) => [self.state.users])
  get activeUsers() {
    return this.state.users.filter(u => u.active)
  }
  // users 不变 → 返回缓存的同一个数组 → 组件不重渲染
}

function UserList() {
  const activeUsers = useContextGetter(UserContext, s => s.activeUsers)
  // ✅ 只在 users 变化时重渲染
}
```

### 实际性能对比（10,000 条数据）

| 方案 | 重渲染次数 | 计算次数 | 内存占用 |
|------|-----------|---------|---------|
| 裸 selector | 每次 state 变化 | 每次每组件 | N × 数据大小 |
| 手动 useMemo | 依赖变化时 | 每次每组件 | N × 数据大小 |
| **Zenith @memo** | **依赖变化时** | **全局一次** | **1 × 数据大小** |

**结论**：3 个组件使用同一派生数据

- 传统方案：计算 3 次，缓存 3 份，可能重渲染 N 次
- **Zenith：计算 1 次，缓存 1 份，只在必要时渲染**

---

## 🎓 设计哲学

### 1. 站在巨人的肩膀上

> **Zenith = 精心设计的 API + Immer 的强大能力**

我们没有重新发明轮子，而是深度整合了经过实战检验的技术：
- **Immer**：不可变更新 + Patches 机制
- **MobX**：计算属性设计启发
- **Zustand**：简洁 API 启发
- **TypeScript**：编译期保证

### 2. 性能优于便利

```typescript
// @memo 保证：
// 1. 稳定引用（避免重渲染）
// 2. 跨组件共享（避免重复计算）
// 3. 自动清理（避免内存泄漏）
```

### 3. 渐进式增强

```typescript
// 基础用法：简单如 Zustand
class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produceData(s => { s.count++ })
  }
}

// 高级用法：按需启用 Immer Patches
new TodoStore(initialState, {
  enableHistory: true,      // 需要撤销/重做时
  enablePatch: true,
  historyDebounceTime: 100
})
```

### 4. 类型安全第一

```typescript
// TypeScript 保证：
// - produceData 是 protected，外部无法调用
// - 所有 getter 自动推导类型
// - Immer 的完整类型支持
```

---

## 📖 API 参考

### ZenithStore

```typescript
class MyStore extends ZenithStore<State> {
  constructor(initialState: State, options?: StoreOptions)
  
  // 核心方法（基于 Immer）
  protected produceData(
    fn: (draft: State) => void,
    disableRecord?: boolean,
    patchCallback?: (patches: Patch[], inversePatches: Patch[]) => void
  ): void
  
  subscribe(listener: (newState: State, prevState: State) => void): () => void
  
  // 历史方法（需启用 enableHistory）
  undo(): void
  redo(): void
  updateKeepRecord(keep: boolean): void
  
  // 属性
  state: State          // 当前状态（只读）
  initialState: State   // 初始状态
}
```

### @memo 装饰器

```typescript
@memo((self: Store) => [dependency1, dependency2, ...])
get computedProperty() {
  return expensiveComputation(...)
}
```

### React Hooks

```typescript
// 订阅状态切片
const [data, store] = useContextStore(StoreContext, state => state.data)

// 订阅 getter（自动 RefCount 管理）
const computed = useContextGetter(StoreContext, store => store.computed)
```

### Effect（非 React）

```typescript
const cleanup = addEffect(store, effect, [state => state.field])
```

### StoreOptions

```typescript
interface StoreOptions {
  enablePatch?: boolean          // 启用 Immer Patches
  enableHistory?: boolean         // 启用历史记录
  historyLength?: number          // 最大历史长度（默认 30）
  historyDebounceTime?: number    // 历史合并时间（默认 100ms）
}
```

---

## 📚 文档与示例

### 🎯 真实案例：domd

**[domd](https://demo.domd.app/?src=https://github.com/do-md/zenith)** — 基于 Zenith 构建的强大所见即所得 Markdown 编辑器

- 📦 **20KB，完整能力** — 仅依赖 Immer + Zenith，具备完整的 Markdown 解析与编辑能力
- 🚀 **20000+ 行丝滑编辑** — 无卡顿、无延迟，性能卓越
- 💾 **极低内存占用** — 稳定引用 + Immer Patches 的完美实践
- 🔜 **即将开源**

> 别人 200KB+ 才能实现的功能，domd 用 20KB 做到了。这就是 Zenith 的力量。

---

## 📄 开源协议

MIT © [Jayden Wang](https://github.com/do-md)

---

## 💡 致谢

Zenith 构建于 **[Immer](https://github.com/immerjs/immer)** 之上 — 这是 [Michel Weststrate](https://github.com/mweststrate) 创造的杰出库，让不可变状态更新变得自然而优雅。
