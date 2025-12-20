# API 参考

## 核心 API

### ZenithStore

基础 Store 类，所有状态管理类都应继承此类。

```typescript
class MyStore extends ZenithStore<State> {
  constructor(initialState: State, options?: StoreOptions);

  // 核心方法（基于 Immer）
  protected produce(
    fn: (draft: State) => void,
    options?: {
      patchCallback?: (patches: Patch[], inversePatches: Patch[]) => void;
      actionName?: string;
    }
  ): void;

  subscribe(listener: (newState: State, prevState: State) => void): () => void;

  applyPatches(patches: Patch[]): void;

  // 属性
  state: State; // 当前状态（只读）
  initialState: State; // 初始状态
}
```

**参数说明：**

- `initialState`: 初始状态对象
- `options`: 可选配置项
  - `enablePatch`: 是否启用 Immer Patches（默认 `false`）

**方法说明：**

- `produce()`: 使用 Immer 更新状态（protected，只能在 Store 内部调用）
  - `fn`: 状态更新函数
  - `options.patchCallback`: Patches 回调（需要 `enablePatch: true`）
  - `options.actionName`: 操作名称（用于 DevTools）
- `subscribe()`: 订阅状态变化，返回取消订阅函数
- `applyPatches()`: 应用 Immer Patches

---

### @memo 装饰器

用于创建计算属性，自动缓存和稳定引用。

```typescript
@memo((self: Store) => [dependency1, dependency2, ...])
get computedProperty() {
  return expensiveComputation(...)
}
```

**参数说明：**

- `getDeps`: 依赖获取函数，返回依赖数组
  - 依赖未变化时，返回缓存值
  - 依赖变化时，重新计算

**特性：**

- ✅ 自动缓存：依赖不变时返回相同引用
- ✅ 链式派生：可以依赖其他 @memo 属性
- ✅ RefCount 管理：无组件使用时自动清理

**示例：**

```typescript
class TodoStore extends ZenithStore<State> {
  // 单依赖
  @memo((self) => [self.state.todos])
  get activeTodos() {
    return this.state.todos.filter((t) => !t.completed);
  }

  // 多依赖
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    return this.state.todos.filter((t) => t.type === this.state.filter);
  }

  // 链式派生
  @memo((self) => [self.filteredTodos])
  get sortedTodos() {
    return [...this.filteredTodos].sort((a, b) => a.order - b.order);
  }
}
```

---

## React API

### createReactStore

创建 React Store，自动生成 Provider 和 Hooks。

```typescript
const { StoreProvider, useStore, useStoreApi } = createReactStore(StoreClass);
```

**返回值：**

- `StoreProvider`: Store Provider 组件
- `useStore`: 订阅状态的 Hook
- `useStoreApi`: 获取 Store 实例的 Hook

**示例：**

```typescript
import { createReactStore } from "@do-md/zenith";

class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produce((s) => {
      s.count++;
    });
  }
}

const { StoreProvider, useStore, useStoreApi } = createReactStore(CounterStore);

function Counter() {
  const count = useStore((s) => s.state.count);
  const store = useStoreApi();

  return <button onClick={() => store.increment()}>{count}</button>;
}

function App() {
  return (
    <StoreProvider initialProps={undefined}>
      <Counter />
    </StoreProvider>
  );
}
```

---

### useStoreSelector

底层 Hook，订阅 Store 状态切片。

```typescript
const value = useStoreSelector(store, selector);
```

**参数：**

- `store`: Store 实例
- `selector`: 选择器函数

**示例：**

```typescript
function MyComponent() {
  const store = useContext(StoreContext);
  const count = useStoreSelector(store, (s) => s.state.count);

  return <div>{count}</div>;
}
```

---

## Middleware API

### withHistory

添加撤销/重做能力（基于 Immer Patches）。

```typescript
import { withHistory } from "@do-md/zenith/middleware";

const history = withHistory(store, options);
```

**选项：**

```typescript
interface HistoryOptions {
  maxLength?: number; // 最大历史长度（默认 30）
  debounceTime?: number; // 防抖时间，ms（默认 100）
}
```

**返回值：**

```typescript
{
  undo: () => void;              // 撤销
  redo: () => void;              // 重做
  updateKeepRecord: (keep: boolean) => void;  // 控制历史合并
  produce: (fn, options) => void;  // 替代原 produce 方法
}
```

**示例：**

```typescript
class EditorStore extends ZenithStore<EditorState> {
  undo!: () => void;
  redo!: () => void;

  constructor() {
    super({ content: "" }, { enablePatch: true });

    const history = withHistory(this, {
      maxLength: 50,
      debounceTime: 100,
    });

    // 暴露方法
    this.undo = history.undo;
    this.redo = history.redo;
  }

  insertText(text: string) {
    this.produce((state) => {
      state.content += text;
    });
  }
}
```

**高级用法：精确控制历史粒度**

```typescript
class CanvasStore extends ZenithStore<State> {
  private history: ReturnType<typeof withHistory>;

  constructor() {
    super(initialState, { enablePatch: true });
    this.history = withHistory(this);
  }

  startDrag() {
    this.history.updateKeepRecord(true); // 开始合并
  }

  onDrag(position: Position) {
    this.produce((s) => {
      s.position = position;
    });
    // 多次更新合并为一个历史单元
  }

  endDrag() {
    this.history.updateKeepRecord(false); // 结束合并
  }
}
```

---

### withQuery

添加异步查询能力。

```typescript
import { withQuery, APIState } from "@do-md/zenith/middleware";

const { query, invalidate } = withQuery(store);
```

**返回值：**

```typescript
{
  query: <TData>(
    service: () => Promise<TData>,
    options: {
      key: string;
      enabled?: (self: Store) => boolean;
      deps?: (self: Store) => any[];
    }
  ) => APIState<TData>;

  invalidate: (key: string) => void;
}
```

**APIState 类型：**

```typescript
interface APIState<TData = any> {
  state: FetcherState; // Idle | Pending | Success | Error
  data: TData | undefined;
  error: any;
}
```

**示例：**

```typescript
class UserStore extends ZenithStore<State> {
  private query: ReturnType<typeof withQuery>["query"];

  constructor() {
    super(initialState);
    const queryHelper = withQuery(this);
    this.query = queryHelper.query;
  }

  @memo((self) => [self.state.userId])
  get userData() {
    return this.query(() => fetchUser(this.state.userId), {
      key: "user",
      deps: (s) => [s.state.userId],
      enabled: (s) => !!s.state.userId,
    });
  }
}

function UserProfile() {
  const userData = useStore((s) => s.userData);

  if (userData.state === "Pending") return <div>Loading...</div>;
  if (userData.state === "Error") return <div>Error: {userData.error}</div>;
  return <div>{userData.data?.name}</div>;
}
```

---

### devtools

集成 Redux DevTools。

```typescript
import { devtools } from "@do-md/zenith/middleware";

devtools(store, options);
```

**选项：**

```typescript
interface DevtoolsOptions {
  name?: string; // Store 名称
  enabled?: boolean; // 是否启用（默认 true）
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

**示例：**

```typescript
class MyStore extends ZenithStore<State> {
  constructor() {
    super(initialState);

    // 只在开发环境启用
    if (process.env.NODE_ENV === "development") {
      devtools(this, { name: "MyStore" });
    }
  }

  increment() {
    this.produce(
      (s) => {
        s.count++;
      },
      { actionName: "INCREMENT" }
    ); // 在 DevTools 中显示
  }
}
```

---

## 工具函数

### addEffect

添加副作用（非 React 环境）。

```typescript
import { addEffect } from "@do-md/zenith";

const cleanup = addEffect(store, effect, deps);
```

**参数：**

- `store`: Store 实例
- `effect`: 副作用函数
- `deps`: 依赖获取函数数组

**示例：**

```typescript
const store = new MyStore();

// 监听状态变化
const cleanup = addEffect(
  store,
  () => {
    console.log("Count changed:", store.state.count);
  },
  [(state) => state.count]
);

// 清理
cleanup();
```

---

## TypeScript 类型

### ExtractState

提取 Store 的 State 类型。

```typescript
import { ExtractState } from "@do-md/zenith";

type MyState = ExtractState<typeof MyStore>;
```

---

## 配置选项

### StoreOptions

Store 构造函数的配置选项。

```typescript
interface StoreOptions {
  enablePatch?: boolean; // 启用 Immer Patches（默认 false）
}
```

**使用场景：**

- `enablePatch: true`: 需要使用 Middleware（如 withHistory、devtools）时必须启用

---

## 最佳实践

### 1. 计算属性的依赖声明

```typescript
// ✅ 好：依赖明确
@memo((self) => [self.state.todos, self.state.filter])
get filteredTodos() { ... }

// ❌ 差：遗漏依赖
@memo((self) => [self.state.todos])  // 忘记 filter
get filteredTodos() {
  return this.state.todos.filter(t => t.type === this.state.filter)
}
```

### 2. 链式派生

```typescript
// ✅ 好：链式派生，性能最优
@memo((self) => [self.state.data])
get filtered() { return this.state.data.filter(...) }

@memo((self) => [self.filtered])
get sorted() { return [...this.filtered].sort(...) }

// ⚠️ 可以但不推荐：重复计算
@memo((self) => [self.state.data])
get sorted() {
  return this.state.data.filter(...).sort(...)
}
```

### 3. Middleware 组合

```typescript
class MyStore extends ZenithStore<State> {
  constructor() {
    super(initialState, { enablePatch: true }); // 必须启用

    // 可以组合多个 middleware
    const history = withHistory(this);
    const query = withQuery(this);
    devtools(this, { name: "MyStore" });

    // 暴露需要的能力
    this.undo = history.undo;
    this.redo = history.redo;
    this.query = query.query;
  }
}
```

---

## 迁移指南

### 从 Zustand 迁移

```typescript
// Zustand
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Zenith
class CounterStore extends ZenithStore<{ count: number }> {
  increment() {
    this.produce((s) => {
      s.count++;
    });
  }
}
const { useStore } = createReactStore(CounterStore);
```

### 从 MobX 迁移

```typescript
// MobX
class TodoStore {
  @observable todos = [];

  @computed get activeTodos() {
    return this.todos.filter((t) => !t.completed);
  }

  @action addTodo(text) {
    this.todos.push({ text, completed: false });
  }
}

// Zenith
class TodoStore extends ZenithStore<{ todos: Todo[] }> {
  @memo((self) => [self.state.todos])
  get activeTodos() {
    return this.state.todos.filter((t) => !t.completed);
  }

  addTodo(text: string) {
    this.produce((s) => {
      s.todos.push({ text, completed: false });
    });
  }
}
```

