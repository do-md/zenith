# devtools - Redux DevTools Integration

> Use Redux DevTools to debug Zenith Store in development environment.

## Quick Start

```typescript
import { ZenithStore } from "@do-md/zenith";
import { devtools } from "@do-md/zenith/middleware";

class CounterStore extends ZenithStore<State> {
  constructor() {
    super({ count: 0 });

    if (process.env.NODE_ENV === "development") {
      devtools(this, { name: "CounterStore" });
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

## API Reference

### devtools

```typescript
function devtools<T extends object>(
  store: BaseStore<T>,
  options?: DevtoolsOptions
): () => void;
```

**Options:**

```typescript
interface DevtoolsOptions {
  name?: string;        // Store name (defaults to class name)
  enabled?: boolean;    // Enable (default true)
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

**Returns:** Cleanup function that disconnects DevTools when called.

## Features

### 1. Action Tracking

```typescript
class TodoStore extends ZenithStore<TodoState> {
  constructor() {
    super({ todos: [] });
    devtools(this, { name: "TodoStore" });
  }

  addTodo(text: string) {
    this.produce(
      (s) => {
        s.todos.push({ id: nanoid(), text, completed: false });
      },
      { actionName: "ADD_TODO" }
    );
  }

  toggleTodo(id: string) {
    this.produce(
      (s) => {
        const todo = s.todos.find((t) => t.id === id);
        if (todo) todo.completed = !todo.completed;
      },
      { actionName: `TOGGLE_TODO/${id}` }
    );
  }
}

// In DevTools:
// ADD_TODO
// TOGGLE_TODO/abc123
// ...
```

### 2. Time Travel Debugging

Click any action in DevTools, and Store state jumps to that moment:

```typescript
class EditorStore extends ZenithStore<EditorState> {
  constructor() {
    super({ content: "" });
    devtools(this, { name: "EditorStore" });
  }

  insertText(text: string) {
    this.produce(
      (s) => {
        s.content += text;
      },
      { actionName: `INSERT_TEXT/${text}` }
    );
  }
}

// Usage
store.insertText("H");  // State: { content: "H" }
store.insertText("i");  // State: { content: "Hi" }
store.insertText("!");  // State: { content: "Hi!" }

// Click second action in DevTools
// State jumps to: { content: "Hi" }
```

### 3. State Export/Import

DevTools supports exporting and importing state for:
- Reproducing bugs
- Sharing state snapshots
- Testing specific states

### 4. Diff View

View state changes caused by each action:

```typescript
class CartStore extends ZenithStore<CartState> {
  addItem(item: Item) {
    this.produce(
      (s) => {
        s.items.push(item);
        s.total += item.price;
      },
      { actionName: "ADD_ITEM" }
    );
  }
}

// DevTools Diff view shows:
// + items[0]: { id: 1, name: "Product", price: 99 }
// ~ total: 0 → 99
```

## Advanced Usage

### 1. Multiple Stores

```typescript
class UserStore extends ZenithStore<UserState> {
  constructor() {
    super(initialState);
    devtools(this, { name: "UserStore" });
  }
}

class CartStore extends ZenithStore<CartState> {
  constructor() {
    super(initialState);
    devtools(this, { name: "CartStore" });
  }
}

// DevTools shows two independent Stores
```

### 2. Conditional Enable

```typescript
class MyStore extends ZenithStore<State> {
  constructor() {
    super(initialState);

    // Option 1: Development environment
    if (process.env.NODE_ENV === "development") {
      devtools(this, { name: "MyStore" });
    }

    // Option 2: URL parameter
    if (new URLSearchParams(window.location.search).has("debug")) {
      devtools(this, { name: "MyStore" });
    }

    // Option 3: Configuration toggle
    if (window.__ENABLE_DEVTOOLS__) {
      devtools(this, { name: "MyStore" });
    }
  }
}
```

### 3. Cleanup Connection

```typescript
class MyStore extends ZenithStore<State> {
  private devtoolsCleanup?: () => void;

  constructor() {
    super(initialState);

    if (process.env.NODE_ENV === "development") {
      this.devtoolsCleanup = devtools(this, { name: "MyStore" });
    }
  }

  destroy() {
    this.devtoolsCleanup?.();
  }
}
```

## Best Practices

### 1. Meaningful Action Names

```typescript
// ✅ Good: Clear action names
increment() {
  this.produce((s) => { s.count++; }, { actionName: "INCREMENT" });
}

// ❌ Bad: No action name
increment() {
  this.produce((s) => { s.count++; });
  // DevTools shows "STATE_UPDATE"
}
```

### 2. Include Context

```typescript
// ✅ Good: Includes specific info
updateUser(userId: string, data: UserData) {
  this.produce(
    (s) => { s.users[userId] = data; },
    { actionName: `UPDATE_USER/${userId}` }
  );
}
```

### 3. Group Related Actions

```typescript
class TodoStore extends ZenithStore<TodoState> {
  addTodo(text: string) {
    this.produce((s) => { ... }, { actionName: "TODO/ADD" });
  }

  removeTodo(id: string) {
    this.produce((s) => { ... }, { actionName: "TODO/REMOVE" });
  }

  setFilter(filter: string) {
    this.produce((s) => { ... }, { actionName: "FILTER/SET" });
  }
}

// DevTools shows:
// TODO/ADD
// TODO/ADD
// FILTER/SET
// TODO/UPDATE
```

## Common Issues

### Q: DevTools not showing?

A: Make sure Redux DevTools extension is installed:
- [Chrome](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

### Q: Why showing "STATE_UPDATE"?

A: No `actionName` provided:

```typescript
this.produce((s) => { ... }, { actionName: "MY_ACTION" });
```

### Q: Performance impact in production?

A: No. Only enable in development:

```typescript
if (process.env.NODE_ENV === "development") {
  devtools(this);
}
```

## Summary

`devtools` middleware gives Zenith Store powerful debugging capabilities:

- ✅ Zero-config Redux DevTools integration
- ✅ Action tracking and time travel
- ✅ State export/import
- ✅ Diff view
- ✅ Multiple Store support

Essential debugging tool for development environment.

