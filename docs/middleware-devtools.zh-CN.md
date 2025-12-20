# devtools - Redux DevTools 集成

> 在开发环境中使用 Redux DevTools 调试 Zenith Store。

## 快速开始

```typescript
import { ZenithStore } from "@do-md/zenith";
import { devtools } from "@do-md/zenith/middleware";

class CounterStore extends ZenithStore<State> {
  constructor() {
    super({ count: 0 });

    // 只在开发环境启用
    if (process.env.NODE_ENV === "development") {
      devtools(this, { name: "CounterStore" });
    }
  }

  increment() {
    this.produce(
      (s) => {
        s.count++;
      },
      { actionName: "INCREMENT" } // 在 DevTools 中显示
    );
  }
}
```

## API 参考

### devtools

```typescript
function devtools<T extends object>(
  store: BaseStore<T>,
  options?: DevtoolsOptions
): () => void;
```

**选项：**

```typescript
interface DevtoolsOptions {
  name?: string;        // Store 名称（默认为类名）
  enabled?: boolean;    // 是否启用（默认 true）
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

**返回值：**

返回清理函数，调用后断开 DevTools 连接。

## 功能特性

### 1. Action 追踪

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
      { actionName: "ADD_TODO" } // 显示为 "ADD_TODO"
    );
  }

  toggleTodo(id: string) {
    this.produce(
      (s) => {
        const todo = s.todos.find((t) => t.id === id);
        if (todo) todo.completed = !todo.completed;
      },
      { actionName: `TOGGLE_TODO/${id}` } // 显示为 "TOGGLE_TODO/123"
    );
  }
}
```

在 DevTools 中看到：
```
ADD_TODO
TOGGLE_TODO/abc123
ADD_TODO
...
```

### 2. 时间旅行调试

点击 DevTools 中的任意 action，Store 状态会跳转到该时刻：

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

// 使用
store.insertText("H");  // State: { content: "H" }
store.insertText("i");  // State: { content: "Hi" }
store.insertText("!");  // State: { content: "Hi!" }

// 在 DevTools 中点击第二个 action
// State 跳转到: { content: "Hi" }
```

### 3. 状态导出/导入

DevTools 支持导出和导入状态，便于：
- 复现 bug
- 分享状态快照
- 测试特定状态

```typescript
// 点击 DevTools 的 Export 按钮
// 下载 state.json

// 点击 Import 按钮上传 state.json
// Store 恢复到该状态
```

### 4. Diff 视图

查看每个 action 导致的状态变化：

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

// DevTools Diff 视图显示：
// + items[0]: { id: 1, name: "Product", price: 99 }
// ~ total: 0 → 99
```

## 高级用法

### 1. 多 Store 调试

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

// DevTools 中显示两个独立的 Store
// 可以分别查看和调试
```

### 2. 条件启用

```typescript
class MyStore extends ZenithStore<State> {
  constructor() {
    super(initialState);

    // 方案 1：开发环境
    if (process.env.NODE_ENV === "development") {
      devtools(this, { name: "MyStore" });
    }

    // 方案 2：URL 参数
    if (new URLSearchParams(window.location.search).has("debug")) {
      devtools(this, { name: "MyStore" });
    }

    // 方案 3：配置开关
    if (window.__ENABLE_DEVTOOLS__) {
      devtools(this, { name: "MyStore" });
    }
  }
}
```

### 3. 自定义 Features

```typescript
devtools(store, {
  name: "MyStore",
  features: {
    pause: true,     // 暂停记录
    lock: true,      // 锁定状态
    persist: true,   // 持久化
    export: true,    // 导出
    import: "custom", // 自定义导入
    jump: true,      // 跳转到 action
    skip: true,      // 跳过 action
    reorder: true,   // 重新排序
    dispatch: true,  // 手动 dispatch
  },
});
```

### 4. 清理连接

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
    // 断开 DevTools 连接
    this.devtoolsCleanup?.();
  }
}
```

## 最佳实践

### 1. 有意义的 Action 名称

```typescript
// ✅ 好：清晰的 action 名称
increment() {
  this.produce((s) => { s.count++; }, { actionName: "INCREMENT" });
}

decrement() {
  this.produce((s) => { s.count--; }, { actionName: "DECREMENT" });
}

// ❌ 差：没有 action 名称
increment() {
  this.produce((s) => { s.count++; });
  // DevTools 显示为 "STATE_UPDATE"
}
```

### 2. 包含上下文信息

```typescript
// ✅ 好：包含具体信息
updateUser(userId: string, data: UserData) {
  this.produce(
    (s) => { s.users[userId] = data; },
    { actionName: `UPDATE_USER/${userId}` }
  );
}

// ⚠️ 可以：但不够具体
updateUser(userId: string, data: UserData) {
  this.produce(
    (s) => { s.users[userId] = data; },
    { actionName: "UPDATE_USER" }
  );
}
```

### 3. 分组相关 Actions

```typescript
// 使用命名空间
class TodoStore extends ZenithStore<TodoState> {
  addTodo(text: string) {
    this.produce((s) => { ... }, { actionName: "TODO/ADD" });
  }

  removeTodo(id: string) {
    this.produce((s) => { ... }, { actionName: "TODO/REMOVE" });
  }

  updateTodo(id: string, data: any) {
    this.produce((s) => { ... }, { actionName: "TODO/UPDATE" });
  }

  setFilter(filter: string) {
    this.produce((s) => { ... }, { actionName: "FILTER/SET" });
  }
}

// DevTools 中显示：
// TODO/ADD
// TODO/ADD
// FILTER/SET
// TODO/UPDATE
// TODO/REMOVE
```

## 与 Redux DevTools 的区别

| 特性 | Zenith devtools | Redux DevTools |
|------|-----------------|----------------|
| **安装方式** | 一行代码 | 配置 enhancer |
| **Action 定义** | 方法名 + actionName | Action creators |
| **时间旅行** | ✅ | ✅ |
| **状态导出** | ✅ | ✅ |
| **Diff 视图** | ✅ | ✅ |
| **性能影响** | 极小 | 小 |

## 常见问题

### Q: DevTools 不显示？

A: 确保已安装 Redux DevTools 扩展：
- [Chrome](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

### Q: 为什么显示 "STATE_UPDATE"？

A: 没有提供 `actionName`：

```typescript
// 添加 actionName
this.produce((s) => { ... }, { actionName: "MY_ACTION" });
```

### Q: 会影响生产环境性能吗？

A: 不会。只在开发环境启用：

```typescript
if (process.env.NODE_ENV === "development") {
  devtools(this);
}
```

### Q: 可以禁用某些 action 吗？

A: 目前不支持。所有 `produce` 调用都会被记录。

## 调试技巧

### 1. 使用 Diff 视图定位问题

当状态变化异常时，查看 Diff 视图确认：
- 哪些字段变化了
- 变化的值是否正确

### 2. 时间旅行复现 Bug

1. 复现 bug
2. 在 DevTools 中找到导致 bug 的 action
3. 跳转到该 action 之前的状态
4. 逐步执行，观察状态变化

### 3. 导出状态给测试

```typescript
// 1. 在 DevTools 中导出状态
// 2. 在测试中使用

test("should handle exported state", () => {
  const exportedState = require("./fixtures/state.json");
  const store = new MyStore();
  
  // 手动设置状态
  (store as any)._state = exportedState;
  
  // 继续测试...
});
```

## 总结

`devtools` middleware 让 Zenith Store 获得强大的调试能力：

- ✅ 零配置集成 Redux DevTools
- ✅ Action 追踪和时间旅行
- ✅ 状态导出/导入
- ✅ Diff 视图
- ✅ 多 Store 支持

在开发环境中必备的调试工具。

