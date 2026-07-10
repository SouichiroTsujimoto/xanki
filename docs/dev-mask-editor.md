# マスクエディタ — 実装メモ

**テキストマスクエディタ**・**画像マスクエディタ**ウィンドウのレイアウト。  
座標・JSON の正本は spec（本書はレイアウト・overflow 中心）。  
仕様: [text-masks.md](./spec/text-masks.md), [image-masks.md](./spec/image-masks.md)。索引: [dev-ui.md](./dev-ui.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| テキスト | [`text-mask-editor.tsx`](../packages/ui/src/components/xanki/mask/text-mask-editor.tsx), [`text-mask-composer.tsx`](../packages/ui/src/components/xanki/mask/text-mask-composer.tsx) |
| 作成モード保持 | [`text-editor-mode-storage.ts`](../packages/ui/src/lib/text-editor-mode-storage.ts)（`localStorage` `xanki:text-editor-mode`） |
| 画像 | [`image-mask-editor.tsx`](../packages/ui/src/components/xanki/mask/image-mask-editor.tsx), [`image-with-mask-overlays.tsx`](../packages/ui/src/components/xanki/mask/image-with-mask-overlays.tsx) |
| スタイル | [`mask-editor.css`](../packages/ui/src/styles/components/mask-editor.css) |

## DOM 構造（共通）

```
.editor-shell.text-editor | .image-editor
  ├── .editor-hero / .image-editor-header   ← flex-shrink:0, Tauri drag region
  ├── .editor-toolbar / tools
  ├── .text-workspace | .image-workspace    ← flex:1, min-height:0
  └── .editor-footer                        ← flex-shrink:0
```

| レイヤ | スクロール |
|--------|------------|
| `.editor-shell` | `height: 100vh; overflow: hidden` |
| workspace 内 | テキスト編集域・画像キャンバスが scroll / pan |

## 不変条件

1. **シェル** — `100vh` + **`overflow: hidden`**。ページ全体 scroll ではなく workspace 内に閉じる
2. **Tauri macOS** — `html.tauri-macos` で hero/header に **`padding-top: calc(1rem + 20px)`**（traffic light）。**`-webkit-app-region: drag`**、ボタン・入力は **`no-drag`**
3. **狭幅** — `responsive.css`: `.text-workspace` を 1 列に（900px 以下）
4. **座標** — 画面上のマスク矩形と保存 JSON の換算は **spec 正本**。レイアウト変更で scale が変わる場合は spec + 実装を同時更新
5. **画像** — キャンバス aspect・object-fit と overlay 座標の基準点を一致させる

## 症状 → 原因

| 症状 | よくある原因 |
|------|----------------|
| フッターが画面外 | workspace が `flex:1; min-height:0` になっていない |
| traffic light と hero が重なる | `tauri-macos` padding / drag region 未適用 |
| マスク位置ずれ | 画像表示サイズと座標換算の不一致（レイアウト変更後） |
| 900px 以下で 2 列のまま | `responsive.css` の grid 上書き |

## デバッグ手順

1. `.editor-shell` の flex チェーン
2. workspace の `clientHeight` vs 子 canvas
3. Tauri 時 `html.tauri-macos` クラスの有無
4. 座標問題 → spec の座標系セクションと DevTools 実寸比較

## 手動 QA

- [ ] 720×600（テキスト）/ 1000×1000（画像）で hero・footer 固定、中央 scroll
- [ ] Tauri: ドラッグ移動 vs ボタンクリック
- [ ] 900px 以下 workspace 1 列
- [ ] 保存後プレビューでマスク位置一致

## 変更時ガイド

- レイアウトのみ → 本 doc + mask-editor.css
- 座標・JSON → **必ず** text-masks / image-masks spec 先

## 履歴メモ

| 日付 | 症状 | 原因 | 対応 |
|------|------|------|------|
| — | （追記用） | | |
