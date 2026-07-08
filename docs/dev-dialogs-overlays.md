# ダイアログ・オーバーレイ — 実装メモ

**NativeDialog**（削除確認等）、**学習中 AI パネル**、その他モーダル／バックドrop。  
仕様: [ui.md §ダイアログ](./spec/ui.md)。索引: [dev-ui.md](./dev-ui.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| Dialog | [`native-dialog.tsx`](../packages/ui/src/components/ui/native-dialog.tsx), [`confirm-delete-dialog.tsx`](../packages/ui/src/components/xanki/confirm-delete-dialog.tsx) |
| AI パネル | [`study-ai-panel.tsx`](../packages/ui/src/components/xanki/study/study-ai-panel.tsx) |
| スタイル | [`dialogs.css`](../packages/ui/src/styles/components/dialogs.css) |

## レイヤー（z-index）

| 要素 | z-index | 備考 |
|------|---------|------|
| `.sidebar-scrim` | 199 | [dev-app-shell](./dev-app-shell.md) |
| `.app-rail` オーバーレイ | 200 | 同上 |
| `.native-dialog`, `.confirm-backdrop` | **1000** | top layer / fixed full viewport |
| フリップ中 overflow visible | — | ダイアログは常に最前面 |

## 不変条件

1. **`window.confirm` / `window.alert` 禁止**（Tauri 含む）。必ず NativeDialog またはインラインエラー
2. **NativeDialog** — `<dialog>` + `@starting-style` + `transition-behavior: allow-discrete`。Safari 不足時 Motion fallback（[ui.md](./spec/ui.md)）
3. **`prefers-reduced-motion`** — opacity/transform を 0.01ms に短縮
4. **AI パネル** — 学習セッション内オーバーレイ。エラーもパネル内（alert 不可）
5. **light dismiss** — `closedby="any"`（spec）。破壊的操作は明示ボタンで確認

## 症状 → 原因

| 症状 | よくある原因 |
|------|----------------|
| ダイアログが表示されない | `<dialog>` の `showModal()` 未呼び出し / closed 状態 |
| アニメが二重 | Motion fallback と CSS `@starting-style` が同時 |
| 背面クリックが効かない | `::backdrop` / pointer-events |
| Safari で開閉が瞬間 | `@starting-style` 非対応 → Motion fallback 経路を確認 |
| AI パネルがカード下に隠れる | z-index / stacking context（祖先 transform） |

## デバッグ手順

1. dialog の `open` 属性と top layer
2. `prefers-reduced-motion` 時の class / transition
3. 祖先の `transform` / `filter` が stacking を作っていないか

## 手動 QA

- [ ] 削除確認: 開閉アニメ、キャンセル、確定
- [ ] reduced-motion: 即時
- [ ] 学習中 AI: ストリーム表示、エラー表示（alert なし）
- [ ] Tauri / Web 両方

## 変更時ガイド

- 新規モーダルは NativeDialog パターンに合わせる
- z-index を 1000 未満に下げない（rail より上）

## 履歴メモ

| 日付 | 症状 | 原因 | 対応 |
|------|------|------|------|
| — | （追記用） | | |
