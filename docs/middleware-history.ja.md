# withHistory - アンドゥ/リドゥ

> Zenith のコア機能の1つ、Immer Patches に基づく高性能なアンドゥ/リドゥシステム。

## クイックスタート

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

## なぜコア機能？

アンドゥ/リドゥは多くの現代的なアプリ（エディタ、キャンバス、フォームなど）に不可欠な機能です。Zenith はこれを**デフォルトのコア機能**として提供し、Middleware アーキテクチャを通じてオンデマンド読み込みを実現：

- ✅ **デフォルトサポート**：すぐに使える、追加設定不要
- ✅ **アーキテクチャ分離**：Core から分離、使用しない場合はゼロオーバーヘッド
- ✅ **メモリ効率**：Immer Patches に基づき、スナップショット方式の 100 倍効率的
- ✅ **スマートマージ**：自動デバウンス + 精密な粒度制御

## メモリ比較

**シナリオ：** 1MB ドキュメント、30 個の履歴レコード

| 方式 | メモリ使用量 | 計算 |
|------|-------------|------|
| スナップショット | **30MB** | 1MB × 30 |
| **Zenith Patches** | **~300KB** | ~10KB × 30 |
| **削減** | **100 倍** | |

## API リファレンス

### withHistory

```typescript
function withHistory<T extends object>(
  store: BaseStore<T>,
  options?: HistoryOptions
): HistoryMethods;
```

**オプション：**

```typescript
interface HistoryOptions {
  maxLength?: number;     // 最大履歴長（デフォルト 30）
  debounceTime?: number;  // デバウンス時間（ms、デフォルト 100）
}
```

**戻り値：**

```typescript
interface HistoryMethods {
  undo: () => void;
  redo: () => void;
  updateKeepRecord: (keep: boolean) => void;
  produce: (fn, options) => void;
}
```

## スマート履歴マージ

### 1. 自動デバウンスマージ

連続した高速操作は1つのアンドゥ単位にマージされます：

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

// ユーザーが "hello" と入力
// 1つの履歴単位のみ生成
store.undo(); // "hello" 全体を元に戻す
```

### 2. 精密な粒度制御

`updateKeepRecord` を使用してマージを制御：

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

// 結果：ドラッグ全体で 1 つのアンドゥ単位のみ生成
```

## ベストプラクティス

### 1. 適切な debounceTime の設定

```typescript
// 高速入力（タイピング）
withHistory(store, { debounceTime: 300 });

// 精密な操作（ドラッグ）
withHistory(store, { debounceTime: 50 });

// 低速な操作（フォーム入力）
withHistory(store, { debounceTime: 500 });
```

### 2. 履歴長を制限

```typescript
// 大規模データシナリオ
withHistory(store, { maxLength: 20 });

// 通常のシナリオ
withHistory(store, { maxLength: 50 });

// プロフェッショナルツール（コードエディタ）
withHistory(store, { maxLength: 100 });
```

### 3. UI 状態を除外

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

## まとめ

Zenith の `withHistory` はアンドゥ/リドゥのベストプラクティスです：

- ✅ **メモリ効率**：Patches に基づき、100 倍のメモリ節約
- ✅ **スマートマージ**：自動デバウンス + 精密な制御
- ✅ **ゼロ設定**：すぐに使える
- ✅ **高性能**：大規模ドキュメントと複雑なアプリに適している

Core から Middleware として分離されていますが、これは Zenith の**コア機能**の1つであり、あらゆるアンドゥ/リドゥシナリオで最初の選択肢となるべきです。

