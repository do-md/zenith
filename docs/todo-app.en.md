# Todo App Complete Example

This is a complete Todo app example showcasing Zenith's core features:

- ✅ Computed properties and chained derivation
- ✅ Middleware architecture (undo/redo)
- ✅ Enforced encapsulation of business logic
- ✅ createReactStore simplified API

## Complete Code

```typescript
import { ZenithStore, memo, createReactStore } from "@do-md/zenith";
import { withHistory } from "@do-md/zenith/middleware";

// 1. Define State
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

// 2. Define Store
class TodoStore extends ZenithStore<TodoState> {
  // Undo/Redo methods
  undo!: () => void;
  redo!: () => void;

  constructor() {
    super(
      { todos: [], filter: "all", searchTerm: "" },
      { enablePatch: true }
    );

    // Enable history middleware
    const history = withHistory(this, {
      maxLength: 50,
      debounceTime: 100,
    });

    this.undo = history.undo;
    this.redo = history.redo;
  }

  // ✅ Derived state: auto-cache + stable reference
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    const { todos, filter } = this.state;
    if (filter === "all") return todos;
    return todos.filter((t) =>
      filter === "active" ? !t.completed : t.completed
    );
  }

  // ✅ Chained derivation
  @memo((self) => [self.filteredTodos, self.state.searchTerm])
  get displayTodos() {
    const term = this.state.searchTerm.toLowerCase();
    if (!term) return this.filteredTodos;
    return this.filteredTodos.filter((t) =>
      t.text.toLowerCase().includes(term)
    );
  }

  // ✅ Computed property
  @memo((self) => [self.state.todos])
  get stats() {
    const total = this.state.todos.length;
    const completed = this.state.todos.filter((t) => t.completed).length;
    return { total, completed, active: total - completed };
  }

  // Actions: Encapsulate business logic
  addTodo(text: string) {
    if (!text.trim()) {
      throw new Error("Todo cannot be empty");
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

// 3. Create React Store (auto-generates Provider and Hooks)
const { StoreProvider, useStore, useStoreApi } = createReactStore(TodoStore);

// 4. Usage
function TodoList() {
  // ✅ displayTodos reference stable, only re-renders on dependency change
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
  // ✅ stats is stable reference, only re-renders when todos change
  const stats = useStore((s) => s.stats);

  return (
    <div>
      Total: {stats.total} | Completed: {stats.completed} | Active: {stats.active}
    </div>
  );
}

function TodoFilters() {
  const filter = useStore((s) => s.state.filter);
  const store = useStoreApi();

  return (
    <div>
      <button onClick={() => store.setFilter("all")}>All</button>
      <button onClick={() => store.setFilter("active")}>Active</button>
      <button onClick={() => store.setFilter("completed")}>Completed</button>
      {/* Undo/Redo based on Immer Patches */}
      <button onClick={() => store.undo()}>Undo</button>
      <button onClick={() => store.redo()}>Redo</button>
    </div>
  );
}

// 5. Provide Store
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

## Key Features Explained

### 1. Computed Properties and Chained Derivation

```typescript
// Layer 1: Filter
@memo((self) => [self.state.todos, self.state.filter])
get filteredTodos() { ... }

// Layer 2: Search based on filteredTodos
@memo((self) => [self.filteredTodos, self.state.searchTerm])
get displayTodos() { ... }

// Layer 3: Stats based on todos
@memo((self) => [self.state.todos])
get stats() { ... }
```

**Update Propagation:**
- `setFilter()` → filteredTodos recomputes → displayTodos recomputes
- `setSearchTerm()` → displayTodos recomputes (filteredTodos stays cached)
- `toggleTodo()` → filteredTodos recomputes → displayTodos recomputes → stats recomputes

### 2. Middleware Architecture

```typescript
// Enable middleware in constructor
const history = withHistory(this, {
  maxLength: 50,
  debounceTime: 100,
});

this.undo = history.undo;
this.redo = history.redo;
```

Based on Immer Patches, 100x more memory efficient.

### 3. createReactStore Simplified API

```typescript
// One line generates Provider and Hooks
const { StoreProvider, useStore, useStoreApi } = createReactStore(TodoStore);

// Usage
function MyComponent() {
  const data = useStore((s) => s.displayTodos);
  const store = useStoreApi();
  // ...
}
```

No need to manually create Context, Provider, and custom Hooks.

## Online Demo

[CodeSandbox Example](https://codesandbox.io) _(Coming soon)_

