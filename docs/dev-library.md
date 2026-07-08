# デッキ・カード一覧 — 実装メモ

**ライブラリレイアウト**（デッキパネル + カードグリッド）と **デッキ学習ハブ内のカード一覧**。  
仕様: [library.md](./spec/library.md)。索引: [dev-ui.md](./dev-ui.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| コンポーネント | [`card-collection.tsx`](../packages/ui/src/components/xanki/card-collection.tsx), [`card-tile-preview.tsx`](../packages/ui/src/components/xanki/card-tile-preview.tsx), [`collection-add-bar.tsx`](../packages/ui/src/components/xanki/collection-add-bar.tsx) |
| スタイル | [`library.css`](../packages/ui/src/styles/components/library.css), [`library-extras.css`](../packages/ui/src/styles/components/library-extras.css) |
| 狭幅 | [`responsive.css`](../packages/ui/src/styles/components/responsive.css)（`.library-layout` → 1 列） |

## DOM 構造（ライブラリ 2 ペイン）

```
.library-layout          ← flex, min-height:0, overflow:hidden
  ├── .deck-panel        ← 固定幅 240px, 内部 .deck-list が scroll
  └── .cards-panel       ← flex:1, min-height:0
        └── .card-grid   ← タイル一覧
```

| 領域 | スクロール |
|------|------------|
| `.deck-list` | デッキ名リストのみ |
| カード側 | `.cards-panel` / グリッド内（実装に依存） |
| 900px 以下 | `.library-layout` 1 列（responsive.css） |

## 不変条件

1. **`.library-layout`** — 親が flex のとき **`min-height: 0`** 必須。さもないと子の `overflow-y` が効かない
2. **`.deck-panel`** — `flex-shrink: 0`、幅 240px。リスト部分だけ scroll
3. **タイルプレビュー** — マスク・画像は `card-tile-preview` 経由。座標は [image-masks spec](./spec/image-masks.md) 準拠
4. **study-hub 内** — `.study-hub .card-collection` で余白・幅が上書きされる（study-hub.css）。ハブとホームで見た目差があるのは意図

## 症状 → 原因

| 症状 | よくある原因 |
|------|----------------|
| デッキリストが伸び切って画面からはみ出す | `.deck-list` に `flex:1; min-height:0; overflow-y:auto` 欠如 |
| 2 ペインが縦に潰れる | `.library-layout` の `min-height: 0` 欠如 |
| 狭幅で横並びのまま | `responsive.css` の `@media (max-width: 900px)` 未適用 |
| ハブとホームで一覧の幅が不一致 | `study-hub.css` と `library.css` の上書き関係未確認 |

## デバッグ手順

1. `.library-layout` の computed height と子の `min-height`
2. どの子が `scrollHeight > clientHeight` か
3. `@media 900px` 発火の有無

## 手動 QA

- [ ] デッキ数多 → 左パネルのみスクロール
- [ ] カード数多 → 右側スクロール
- [ ] 900px 以下 → 1 列スタック
- [ ] デッキ学習ハブ内カード一覧も同様

## 変更時ガイド

- グリッド列数・gap 変更時は **ホーム・study-hub 両方** を目視
- データ形式・座標は spec を先に更新

## 履歴メモ

| 日付 | 症状 | 原因 | 対応 |
|------|------|------|------|
| — | （追記用） | | |
