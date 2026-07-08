# ホーム — 実装メモ

**ホーム**タブ（デッキ一覧・スポットライト・クイック操作）。  
仕様: [library.md](./spec/library.md), [ui.md](./spec/ui.md)。索引: [dev-ui.md](./dev-ui.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| コンポーネント | [`packages/ui/src/components/xanki/home-view.tsx`](../packages/ui/src/components/xanki/home-view.tsx) |
| メトリクス UI | [`packages/ui/src/components/xanki/home-metrics-panel.tsx`](../packages/ui/src/components/xanki/home-metrics-panel.tsx) |
| スタイル | [`packages/ui/src/styles/components/home.css`](../packages/ui/src/styles/components/home.css) |
| デッキ一覧 UI | [`packages/ui/src/components/xanki/card-collection.tsx`](../packages/ui/src/components/xanki/card-collection.tsx)（ホームでも使用） |

## DOM 構造

```
.app-main
  └── .home-view              ← flex:1, overflow-y:auto, max-width 960px
        ├── .home-spotlight
        ├── .home-metrics     ← 学習サマリー + デッキ詳細
        ├── .home-create-bar
        ├── .home-deck-section  ← デッキグリッド / 操作
        └── …
```

| レイヤ | スクロール |
|--------|------------|
| `.app-frame` | なし（hidden） |
| `.home-view` | **縦スクロール**（scrollbar 非表示） |

## 不変条件

1. **`.home-view`** — `flex: 1; min-height: 0; overflow-y: auto`（app-main 内で高さを取る）
2. **最大幅** — `max-width: 960px`、左右 padding は狭幅でもはみ出さない（`box-sizing: border-box`）
3. **スクロールバー** — ホームは非表示（`scrollbar-width: none`）。スクロール自体は可能
4. **Web / Tauri** — 同一 `HomeView`。取込ショートカット等は props / AppApi で差し替え

## 症状 → 原因

| 症状 | よくある原因 |
|------|----------------|
| ホーム全体がスクロールしない | 親 `.app-main` に `min-height: 0` がない |
| 下端が app フレームで切れる | `.home-view` が `flex:1` になっていない |
| 狭幅で横スクロール | 固定幅子要素 + padding の合算 overflow |

## デバッグ手順

1. `.app-main` → `.home-view` の flex チェーンと `clientHeight`
2. オーバーフロー要素（DevTools → scrollable overflow）

## 手動 QA

- [ ] デッキ多数で縦スクロール可能（バー非表示）
- [ ] 900px 以下トップバー + ホームコンテンツが共存
- [ ] スポットライト・デッキグリッドが max-width 内に収まる

## 変更時ガイド

- デッキグリッドの詳細レイアウトは [dev-library.md](./dev-library.md) も参照

## 履歴メモ

| 日付 | 症状 | 原因 | 対応 |
|------|------|------|------|
| 2026-07 | スマート学習の間隔パネルが常時展開で縦長 | 全セクションを常時表示 | `<details>` でデフォルト折りたたみ。数値は range スライダー + 単位 select（旧 `deck-scheduler-settings.tsx`） |
| 2026-07 | ホームにデッキ別間隔設定があり縦長・分散 | デッキごと設定 UI | ホームから削除。全デッキ共通設定を設定タブへ移動（[`scheduler-settings.tsx`](../packages/ui/src/components/xanki/scheduler-settings.tsx)） |
| — | （追記用） | | |
