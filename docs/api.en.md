# API Reference

## Core API

### ZenithStore

Base Store class that all state management classes should extend.

```typescript
class MyStore extends ZenithStore<State> {
  constructor(initialState: State, options?: StoreOptions);

  // Core methods (based on Immer)
  protected produce(
    fn: (draft: State) => void,
    options?: {
      patchCallback?: (patches: Patch[], inversePatches: Patch[]) => void;
      actionName?: string;
    }
  ): void;

  subscribe(listener: (newState: State, prevState: State) => void): () => void;

  applyPatches(patches: Patch[]): void;

  // Properties
  state: State; // Current state (read-only)
  initialState: State; // Initial state
}
```

**Parameters:**

- `initialState`: Initial state object
- `options`: Optional configuration
  - `enablePatch`: Enable Immer Patches (default `false`)

**Methods:**

- `produce()`: Update state using Immer (protected, only callable within Store)
  - `fn`: State update function
  - `options.patchCallback`: Patches callback (requires `enablePatch: true`)
  - `options.actionName`: Action name (for DevTools)
- `subscribe()`: Subscribe to state changes, returns unsubscribe function
- `applyPatches()`: Apply Immer Patches

---

### @memo Decorator

Create computed properties with auto-caching and stable references.

```typescript
@memo((self: Store) => [dependency1, dependency2, ...])
get computedProperty() {
  return expensiveComputation(...)
}
```

**Parameters:**

- `getDeps`: Dependency getter function, returns dependency array
  - Returns cached value when deps unchanged
  - Recomputes when deps change

**Features:**

- ✅ Auto-cache: Returns same reference when deps unchanged
- ✅ Chained derivation: Can depend on other @memo properties
- ✅ RefCount management: Auto cleanup when no components use it

**Example:**

```typescript
class TodoStore extends ZenithStore<State> {
  // Single dependency
  @memo((self) => [self.state.todos])
  get activeTodos() {
    return this.state.todos.filter((t) => !t.completed);
  }

  // Multiple dependencies
  @memo((self) => [self.state.todos, self.state.filter])
  get filteredTodos() {
    return this.state.todos.filter((t) => t.type === this.state.filter);
  }

  // Chained derivation
  @memo((self) => [self.filteredTodos])
  get sortedTodos() {
    return [...this.filteredTodos].sort((a, b) => a.order - b.order);
  }
}
```

---

## React API

### createReactStore

Create React Store, automatically generates Provider and Hooks.

```typescript
const { StoreProvider, useStore, useStoreApi } = createReactStore(StoreClass);
```

**Returns:**

- `StoreProvider`: Store Provider component
- `useStore`: Hook for subscribing to state
- `useStoreApi`: Hook for getting Store instance

**Example:**

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

Low-level Hook for subscribing to Store state slices.

```typescript
const value = useStoreSelector(store, selector);
```

**Parameters:**

- `store`: Store instance
- `selector`: Selector function

**Example:**

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

Add undo/redo capability (based on Immer Patches).

```typescript
import { withHistory } from "@do-md/zenith/middleware";

const history = withHistory(store, options);
```

**Options:**

```typescript
interface HistoryOptions {
  maxLength?: number; // Max history length (default 30)
  debounceTime?: number; // Debounce time in ms (default 100)
}
```

**Returns:**

```typescript
{
  undo: () => void;              // Undo
  redo: () => void;              // Redo
  updateKeepRecord: (keep: boolean) => void;  // Control history merging
  produce: (fn, options) => void;  // Replaces original produce method
}
```

**Example:**

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

---

### devtools

Integrate with Redux DevTools.

```typescript
import { devtools } from "@do-md/zenith/middleware";

devtools(store, options);
```

**Options:**

```typescript
interface DevtoolsOptions {
  name?: string; // Store name
  enabled?: boolean; // Enable (default true)
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

**Example:**

```typescript
class MyStore extends ZenithStore<State> {
  constructor() {
    super(initialState);

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
    );
  }
}
```

---

## Utility Functions

### addEffect

Add side effects (non-React environment).

```typescript
import { addEffect } from "@do-md/zenith";

const cleanup = addEffect(store, effect, deps);
```

**Parameters:**

- `store`: Store instance
- `effect`: Effect function
- `deps`: Dependency getter function array

**Example:**

```typescript
const store = new MyStore();

const cleanup = addEffect(
  store,
  () => {
    console.log("Count changed:", store.state.count);
  },
  [(state) => state.count]
);

cleanup();
```

---

## TypeScript Types

### ExtractState

Extract Store's State type.

```typescript
import { ExtractState } from "@do-md/zenith";

type MyState = ExtractState<typeof MyStore>;
```

---

## Configuration Options

### StoreOptions

Configuration options for Store constructor.

```typescript
interface StoreOptions {
  enablePatch?: boolean; // Enable Immer Patches (default false)
}
```

**Use Cases:**

- `enablePatch: true`: Must be enabled when using Middleware (like withHistory, devtools)

---

## Best Practices

### 1. Computed Property Dependencies

```typescript
// ✅ Good: Clear dependencies
@memo((self) => [self.state.todos, self.state.filter])
get filteredTodos() { ... }

// ❌ Bad: Missing dependencies
@memo((self) => [self.state.todos])  // Forgot filter
get filteredTodos() {
  return this.state.todos.filter(t => t.type === this.state.filter)
}
```

### 2. Chained Derivation

```typescript
// ✅ Good: Chained derivation, optimal performance
@memo((self) => [self.state.data])
get filtered() { return this.state.data.filter(...) }

@memo((self) => [self.filtered])
get sorted() { return [...this.filtered].sort(...) }
```

### 3. Middleware Composition

```typescript
class MyStore extends ZenithStore<State> {
  constructor() {
    super(initialState, { enablePatch: true });

    const history = withHistory(this);
    devtools(this, { name: "MyStore" });

    this.undo = history.undo;
    this.redo = history.redo;
    this.query = query.query;
  }
}
```

---

## Migration Guide

### From Zustand

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

### From MobX

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
