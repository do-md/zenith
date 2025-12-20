# Todo App 完整示例

这是一个完整的 Todo 应用示例，展示了 Zenith 的核心特性：

- ✅ 计算属性和链式派生
- ✅ Middleware 架构（撤销/重做）
- ✅ 强制封装的业务逻辑
- ✅ createReactStore 简化 API

## 完整代码

```typescript
import { ZenithStore, memo, createReactStore } from "@do-md/zenith";
import { withHistory } from "@do-md/zenith/middleware";

// 1. 定义 State
interface TodoState {
  todos: Todo[];
  filter: "all" | "active" | "completed";
  searchTerm: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

// 2. 定义 Store
class TodoStore extends ZenithStore<TodoState> {
  // 撤销/重做方法
  undo!: () => void;
  redo!: () => void;

  constructor() {
    super(
      { todos: [], filter: "all", searchTerm: "" },
      { enablePatch: true }
    );

    // 启用历史记录 middleware
    const history = withHistory(this, {
      maxLength: 50,
      debounceTime: 100,
    });

    this.undo = history.undo;
    this.redo = history.redo;
  }

  // ✅ 派生状态：自动缓存 + 稳定引用
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state;
    if (filter === "all") return todos;
    return todos.filter((t) =>
      filter === "active" ? !t.completed : t.completed
    );
  }

  // ✅ 链式派生
  @memo((self) => [self.filteredTodos, self.state.searchTerm])
  get displayTodos() {
    const term = this.state.searchTerm.toLowerCase();
    if (!term) return this.filteredTodos;
    return this.filteredTodos.filter((t) =>
      t.text.toLowerCase().includes(term)
    );
  }

  // ✅ 计算属性
  @memo((self) => [self.state.todos])
  get stats() {
    const total = this.state.todos.length;
    const completed = this.state.todos.filter((t) => t.completed).length;
    return { total, completed, active: total - completed };
  }

  // Actions：封装业务逻辑
  addTodo(text: string) {
    if (!text.trim()) {
      throw new Error("待办事项不能为空");
    }

    this.produce((state) => {
      state.todos.push({
        id: nanoid(),
        text: text.trim(),
        completed: false,
        createdAt: Date.now(),
      });
    });
  }

  toggleTodo(id: string) {
    this.produce((state) => {
      const todo = state.todos.find((t) => t.id === id);
      if (todo) todo.completed = !todo.completed;
    });
  }

  setFilter(filter: TodoState["filter"]) {
    this.produce((state) => {
      state.filter = filter;
    });
  }

  setSearchTerm(term: string) {
    this.produce((state) => {
      state.searchTerm = term;
    });
  }
}

// 3. 创建 React Store（自动生成 Provider 和 Hooks）
const { StoreProvider, useStore, useStoreApi } = createReactStore(TodoStore);

// 4. 使用
function TodoList() {
  // ✅ displayTodos 引用稳定，只在依赖变化时重渲染
  const todos = useStore((s) => s.displayTodos);
  const store = useStoreApi();

  return (
    <div>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={() => store.toggleTodo(todo.id)}
        />
      ))}
    </div>
  );
}

function TodoStats() {
  // ✅ stats 是稳定引用，todos 变化才重渲染
  const stats = useStore((s) => s.stats);

  return (
    <div>
      总计：{stats.total} | 已完成：{stats.completed} | 进行中：{stats.active}
    </div>
  );
}

function TodoFilters() {
  const filter = useStore((s) => s.state.filter);
  const store = useStoreApi();

  return (
    <div>
      <button onClick={() => store.setFilter("all")}>全部</button>
      <button onClick={() => store.setFilter("active")}>进行中</button>
      <button onClick={() => store.setFilter("completed")}>已完成</button>
      {/* 基于 Immer Patches 的撤销/重做 */}
      <button onClick={() => store.undo()}>撤销</button>
      <button onClick={() => store.redo()}>重做</button>
    </div>
  );
}

// 5. 提供 Store
function App() {
  return (
    <StoreProvider initialProps={undefined}>
      <TodoFilters />
      <TodoStats />
      <TodoList />
    </StoreProvider>
  );
}
```

## 关键特性说明

### 1. 计算属性和链式派生

```typescript
// 第一层：过滤
@memo((self) => [self.state.todos, self.state.filter])
get filteredTodos() { ... }

// 第二层：基于 filteredTodos 搜索
@memo((self) => [self.filteredTodos, self.state.searchTerm])
get displayTodos() { ... }

// 第三层：基于 todos 统计
@memo((self) => [self.state.todos])
get stats() { ... }
```

**更新传播：**
- `setFilter()` → filteredTodos 重算 → displayTodos 重算
- `setSearchTerm()` → displayTodos 重算（filteredTodos 保持缓存）
- `toggleTodo()` → filteredTodos 重算 → displayTodos 重算 → stats 重算

### 2. Middleware 架构

```typescript
// 在构造函数中启用 middleware
const history = withHistory(this, {
  maxLength: 50,
  debounceTime: 100,
});

this.undo = history.undo;
this.redo = history.redo;
```

基于 Immer Patches，内存高效 100 倍。

### 3. createReactStore 简化 API

```typescript
// 一行代码生成 Provider 和 Hooks
const { StoreProvider, useStore, useStoreApi } = createReactStore(TodoStore);

// 使用
function MyComponent() {
  const data = useStore((s) => s.displayTodos);
  const store = useStoreApi();
  // ...
}
```

不需要手动创建 Context、Provider 和自定义 Hooks。

## 在线演示

[CodeSandbox 示例](https://codesandbox.io) _(即将上线)_

