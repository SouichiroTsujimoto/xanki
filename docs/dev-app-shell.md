# アプリシェル — 実装メモ

メインウィンドウの **フレーム**（サイドレール、トップバー、狭幅ドロワー、学習セッション時の全画面化）。  
仕様: [ui.md §メインウィンドウ](./spec/ui.md)。索引: [dev-ui.md](./dev-ui.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| 仕様 | [`docs/spec/ui.md`](./spec/ui.md) |
| シェル | [`packages/ui/src/components/xanki/app-shell.tsx`](../packages/ui/src/components/xanki/app-shell.tsx) |
| スタイル | [`packages/ui/src/styles/components/app-shell.css`](../packages/ui/src/styles/components/app-shell.css) |
| 狭幅 | [`packages/ui/src/styles/components/responsive.css`](../packages/ui/src/styles/components/responsive.css) |
| Motion | [`packages/ui/src/lib/motion-presets.ts`](../packages/ui/src/lib/motion-presets.ts) |

## DOM 構造

```
.app-frame
  ├── .app-rail / .app-rail-motion   ← サイドバー（900px 以下は fixed ドロワー）
  ├── .sidebar-scrim                  ← 狭幅時のみ（z-index 199）
  └── .app-main
        ├── .app-topbar               ← タブ別タイトル・検索・戻る
        └── {tab content}             ← home / study-hub / settings 等
```

| モード | クラス | 挙動 |
|--------|--------|------|
| 通常 | `.app-frame` | rail 固定幅 `--spacing-rail` |
| サイドバー閉 | `.sidebar-collapsed` | rail 幅 0・非表示 |
| 狭幅 | `.app-frame-narrow` | rail は Motion ドロワー |
| 学習セッション | `.study-session-shell` | rail 自動閉、main 全幅 |
| セッション中 rail 開 | `.sidebar-overlay-open` | rail を fixed z-index 200 でオーバーレイ |

## 不変条件

1. **ブレークポイント** — 狭幅判定は JS/CSS とも **`max-width: 900px`**
2. **`.app-frame`** — `height: 100vh; overflow: hidden`。メインコンテンツの縦スクロールは **子ビュー**（`.home-view`, `.study-hub` 等）に委譲
3. **学習セッション** — 開始時に sidebar を閉じる。ハブ復帰時に開いていたなら再開（spec 準拠）
4. **z-index** — scrim 199、rail ドロワー 200。ダイアログ（1000）より下
5. **`prefers-reduced-motion`** — ドロワー spring を即時に（`transitionForReduced` / CSS `transition: none`）
6. **rail ナビ** — `Button variant="ghost"` + `.rail-link.active` のみ `--color-accent-soft`。`accent-button` を nav に使わない
7. **Tauri macOS** — トップバー／rail に `data-tauri-drag-region`（[ui.md](./spec/ui.md)）

## 症状 → 原因

| 症状 | よくある原因 |
|------|----------------|
| rail 全ボタンが chartreuse 背景 | `Button` デフォルト `variant="accent"`。nav は `variant="ghost"` + `.rail-link.active` のみ accent-soft |
| 900px 付近で rail が二重表示 | `.app-frame-narrow` と `.sidebar-collapsed` の組み合わせ不整合 |
| 学習中に rail がレイアウトを押し広げる | セッション時も rail が flow 内に残っている（overlay クラス不足） |
| メインがスクロールできない | `.app-main` に overflow を付けすぎ、子の `min-height: 0` 欠如 |
| ドロワーが背面クリックを阻害 | scrim の `pointer-events` / `sidebar-collapsed` 時の `pointer-events: none` |
| reduced-motion でアニメ残る | Motion と CSS transition の両方が動いている |

## デバッグ手順

1. `.app-frame` の modifier クラス一覧を確認
2. `matchMedia('(max-width: 900px)')` と実ウィンドウ幅
3. 学習セッション props（`studySessionActive`, `deckStudySessionActive`, `leitnerSessionActive`）
4. rail の `position`（sticky vs fixed）と z-index スタック

## 手動 QA

- [ ] 幅 > 900px: rail 常時表示、折りたたみ可
- [ ] 幅 ≤ 900px: ドロワー + scrim、タップで閉
- [ ] デッキ / スマート学習セッション開始 → rail 自動閉、戻るでハブ復帰
- [ ] セッション中 rail トグル → オーバーレイ（コンテンツ幅は維持）
- [ ] `prefers-reduced-motion: reduce` — ドロワー即時

## 変更時ガイド

- ブレークポoint を変えるときは **TS・CSS・spec/ui.md** を同時更新
- rail 幅は `--spacing-rail`（tokens.css）を正とする

## 履歴メモ

| 日付 | 症状 | 原因 | 対応 |
|------|------|------|------|
| 2026-07 | rail 全項目が chartreuse 背景 | `Button` 既定 variant が `accent` | nav を `ghost`、`app-shell.css` で非 active は transparent |
| 2026-07 | Tauri のみ直り Web が古い | 旧: wrangler + dist 静的配信 | `@cloudflare/vite-plugin` + vite dev HMR（[dev-cloud.md](./dev-cloud.md)） |
| — | （追記用） | | |
