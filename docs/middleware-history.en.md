# withHistory - Undo/Redo

> One of Zenith's core capabilities, a high-performance undo/redo system based on Immer Patches.

## Quick Start

```typescript
import { ZenithStore } from "@do-md/zenith";
import { withHistory } from "@do-md/zenith/middleware";

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

## Why Core Capability?

Undo/redo is essential for many modern apps (editors, canvases, forms). Zenith provides it as a **default core capability**, implemented through Middleware architecture for on-demand loading:

- ✅ **Default support**: Out-of-the-box, no extra configuration
- ✅ **Architectural separation**: Separated from Core, zero overhead when not used
- ✅ **Memory efficient**: Based on Immer Patches, 100x more efficient than snapshots
- ✅ **Smart merging**: Auto-debounce + precise granularity control

## Memory Comparison

**Scenario:** 1MB document, 30 history records

| Approach | Memory Usage | Calculation |
|----------|-------------|-------------|
| Snapshot | **30MB** | 1MB × 30 |
| **Zenith Patches** | **~300KB** | ~10KB × 30 |
| **Savings** | **100x** | |

## API Reference

### withHistory

```typescript
function withHistory<T extends object>(
  store: BaseStore<T>,
  options?: HistoryOptions
): HistoryMethods;
```

**Options:**

```typescript
interface HistoryOptions {
  maxLength?: number;     // Max history length (default 30)
  debounceTime?: number;  // Debounce time in ms (default 100)
}
```

**Returns:**

```typescript
interface HistoryMethods {
  undo: () => void;
  redo: () => void;
  updateKeepRecord: (keep: boolean) => void;
  produce: (fn, options) => void;
}
```

## Smart History Merging

### 1. Auto-Debounce Merging

Rapid consecutive operations merge into a single undo unit:

```typescript
class EditorStore extends ZenithStore<EditorState> {
  constructor() {
    super({ content: "" }, { enablePatch: true });
    
    const history = withHistory(this, {
      debounceTime: 100,
    });
    
    this.undo = history.undo;
  }

  insertChar(char: string) {
    this.produce((state) => {
      state.content += char;
    });
  }
}

// User types "hello"
// Only generates 1 history unit
store.undo(); // Undoes entire "hello"
```

### 2. Precise Granularity Control

Use `updateKeepRecord` to control when to merge:

```typescript
class CanvasStore extends ZenithStore<CanvasState> {
  private history: ReturnType<typeof withHistory>;

  constructor() {
    super(initialState, { enablePatch: true });
    this.history = withHistory(this);
  }

  startDrag(nodeId: string) {
    this.history.updateKeepRecord(true);
  }

  onDrag(nodeId: string, position: Position) {
    this.produce((state) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      if (node) node.position = position;
    });
  }

  endDrag() {
    this.history.updateKeepRecord(false);
  }
}

// Result: Entire drag generates only 1 undo unit
```

## Use Cases

### Text Editor

```typescript
class TextEditorStore extends ZenithStore<EditorState> {
  constructor() {
    super({ content: "", cursor: 0 }, { enablePatch: true });
    
    const history = withHistory(this, {
      debounceTime: 300,
    });
    
    this.undo = history.undo;
    this.redo = history.redo;
  }

  insertText(text: string) {
    this.produce((state) => {
      const { content, cursor } = state;
      state.content = content.slice(0, cursor) + text + content.slice(cursor);
      state.cursor = cursor + text.length;
    });
  }
}
```

### Drawing App

```typescript
class DrawingStore extends ZenithStore<DrawingState> {
  private history: ReturnType<typeof withHistory>;

  constructor() {
    super(initialState, { enablePatch: true });
    this.history = withHistory(this, {
      maxLength: 100,
      debounceTime: 50,
    });
  }

  startDrawing() {
    this.history.updateKeepRecord(true);
  }

  drawPoint(point: Point) {
    this.produce((state) => {
      state.currentPath.push(point);
    });
  }

  endDrawing() {
    this.history.updateKeepRecord(false);
  }
}
```

## Best Practices

### 1. Set Reasonable debounceTime

```typescript
// Fast input (typing)
withHistory(store, { debounceTime: 300 });

// Precise operations (dragging)
withHistory(store, { debounceTime: 50 });

// Slow operations (form filling)
withHistory(store, { debounceTime: 500 });
```

### 2. Limit History Length

```typescript
// Large data scenarios
withHistory(store, { maxLength: 20 });

// Normal scenarios
withHistory(store, { maxLength: 50 });

// Professional tools (code editors)
withHistory(store, { maxLength: 100 });
```

### 3. Exclude UI State

```typescript
class AppStore extends ZenithStore<State> {
  updateData(data: any) {
    this.produce((state) => {
      state.data = data;
    });
  }

  updateUIState(ui: any) {
    this.produce(
      (state) => {
        state.ui = ui;
      },
      { disableRecord: true }
    );
  }
}
```

## Summary

Zenith's `withHistory` is the best practice for undo/redo:

- ✅ **Memory efficient**: Based on Patches, saves 100x memory
- ✅ **Smart merging**: Auto-debounce + precise control
- ✅ **Zero config**: Works out of the box
- ✅ **High performance**: Suitable for large documents and complex apps

Though separated from Core as Middleware, this is one of Zenith's **core capabilities** and should be the first choice for any undo/redo scenario.

