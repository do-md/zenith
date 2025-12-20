# Todo App 完全な例

これは Zenith のコア機能を示す完全な Todo アプリの例です：

- ✅ 算出プロパティと連鎖派生
- ✅ Middleware アーキテクチャ（アンドゥ/リドゥ）
- ✅ ビジネスロジックの強制カプセル化
- ✅ createReactStore による API の簡素化

## 完全なコード

```typescript
import { ZenithStore, memo, createReactStore } from "@do-md/zenith";
import { withHistory } from "@do-md/zenith/middleware";

// 1. State を定義
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

// 2. Store を定義
class TodoStore extends ZenithStore<TodoState> {
  undo!: () => void;
  redo!: () => void;

  constructor() {
    super(
      { todos: [], filter: "all", searchTerm: "" },
      { enablePatch: true }
    );

    const history = withHistory(this, {
      maxLength: 50,
      debounceTime: 100,
    });

    this.undo = history.undo;
    this.redo = history.redo;
  }

  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state;
    if (filter === "all") return todos;
    return todos.filter((t) =>
      filter === "active" ? !t.completed : t.completed
    );
  }

  @memo((self) => [self.filteredTodos, self.state.searchTerm])
  get displayTodos() {
    const term = this.state.searchTerm.toLowerCase();
    if (!term) return this.filteredTodos;
    return this.filteredTodos.filter((t) =>
      t.text.toLowerCase().includes(term)
    );
  }

  @memo((self) => [self.state.todos])
  get stats() {
    const total = this.state.todos.length;
    const completed = this.state.todos.filter((t) => t.completed).length;
    return { total, completed, active: total - completed };
  }

  addTodo(text: string) {
    if (!text.trim()) {
      throw new Error("Todo を空にすることはできません");
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

// 3. React Store を作成
const { StoreProvider, useStore, useStoreApi } = createReactStore(TodoStore);

// 4. 使用
function TodoList() {
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
  const stats = useStore((s) => s.stats);

  return (
    <div>
      合計：{stats.total} | 完了：{stats.completed} | 進行中：{stats.active}
    </div>
  );
}

function TodoFilters() {
  const filter = useStore((s) => s.state.filter);
  const store = useStoreApi();

  return (
    <div>
      <button onClick={() => store.setFilter("all")}>全て</button>
      <button onClick={() => store.setFilter("active")}>進行中</button>
      <button onClick={() => store.setFilter("completed")}>完了</button>
      <button onClick={() => store.undo()}>元に戻す</button>
      <button onClick={() => store.redo()}>やり直す</button>
    </div>
  );
}

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

## 主な機能の説明

### 1. 算出プロパティと連鎖派生

```typescript
// レイヤー 1：フィルター
@memo((self) => [self.state.todos, self.state.filter])
get filteredTodos() { ... }

// レイヤー 2：filteredTodos に基づく検索
@memo((self) => [self.filteredTodos, self.state.searchTerm])
get displayTodos() { ... }

// レイヤー 3：todos に基づく統計
@memo((self) => [self.state.todos])
get stats() { ... }
```

**更新伝播：**
- `setFilter()` → filteredTodos 再計算 → displayTodos 再計算
- `setSearchTerm()` → displayTodos 再計算（filteredTodos はキャッシュを維持）
- `toggleTodo()` → filteredTodos 再計算 → displayTodos 再計算 → stats 再計算

### 2. Middleware アーキテクチャ

```typescript
const history = withHistory(this, {
  maxLength: 50,
  debounceTime: 100,
});

this.undo = history.undo;
this.redo = history.redo;
```

Immer Patches に基づき、メモリ効率が 100 倍。

### 3. createReactStore による API の簡素化

```typescript
const { StoreProvider, useStore, useStoreApi } = createReactStore(TodoStore);

function MyComponent() {
  const data = useStore((s) => s.displayTodos);
  const store = useStoreApi();
  // ...
}
```

Context、Provider、カスタム Hooks を手動で作成する必要はありません。

## オンラインデモ

[CodeSandbox の例](https://codesandbox.io) _(近日公開)_

