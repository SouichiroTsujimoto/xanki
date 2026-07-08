# 学習ハブ — 実装メモ

**デッキ学習ハブ**（Coverflow + 4 手段 + カード一覧）と **スマート学習ハブ**（復習予定ヒーロー・一覧）。  
セッション中のフリップは [dev-study-layout.md](./dev-study-layout.md)。  
仕様: [deck-study.md](./spec/deck-study.md), [leitner-study.md](./spec/leitner-study.md)。索引: [dev-ui.md](./dev-ui.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| デッキ学習 | [`deck-study-view.tsx`](../packages/ui/src/components/xanki/study/deck-study-view.tsx), [`flashcards-mode.tsx`](../packages/ui/src/components/xanki/study/flashcards-mode.tsx) 等 |
| スマート学習 | [`leitner-study-view.tsx`](../packages/ui/src/components/xanki/study/leitner-study-view.tsx), [`learn-mode.tsx`](../packages/ui/src/components/xanki/study/learn-mode.tsx), [`leitner-due-complete-panel.tsx`](../packages/ui/src/components/xanki/study/leitner-due-complete-panel.tsx) |
| Coverflow | [`study-card-coverflow.tsx`](../packages/ui/src/components/xanki/study/study-card-coverflow.tsx), [`coverflow-motion.ts`](../packages/ui/src/lib/coverflow-motion.ts) |
| スタイル | [`study-hub.css`](../packages/ui/src/styles/components/study-hub.css) |

## DOM 構造（デッキ学習ハブ）

```
.study-hub                    ← overflow-y:auto, scrollbar 非表示
  ├── .study-hub-toolbar
  ├── .study-coverflow
  │     └── .study-coverflow-stage   ← 固定高, perspective, overflow:hidden
  │           └── .study-coverflow-track (preserve-3d)
  ├── モード起動ボタン群
  └── .card-collection
```

スマート学習: `.leitner-study-hub` — 同様にハブ全体 scroll、内部ヒーロー + デッキ別復習予定リスト。

## 不変条件

1. **ハブ scroll** — `.study-hub` / `.leitner-study-hub` が **タブ内縦スクロール** の主体（spec: スクロールバー非表示）
2. **Coverflow stage** — `container: coverflow / inline-size`。**stage 高さ**は container query で 236 / 200 / 176px。track は `preserve-3d`
3. **Coverflow vs フリップ** — ハブの 3D は **別実装**（`study-coverflow-*`）。セッションの `study-flip-*` と CSS を混同しない
4. **ドラッグ** — `touch-action: pan-y`（縦スクロールと競合しないよう）
5. **user-select: none** — Coverflow 内（ドラッグ誤選択防止）。セッションのテキスト選択とは別コンテキスト
6. **スマート学習 完了 UI** — 全デッキ復習予定 0 は `LeitnerDueCompletePanel`（ハブ・セッション共通）。デッキ別完了で他復習予定残存は `LeitnerDeckSessionComplete`

## 症状 → 原因

| 症状 | よくある原因 |
|------|----------------|
| Coverflow カードが stage で切れる | stage `overflow: hidden` + slide transform がはみ出す（意図的 clip。高さ不足なら container query） |
| ハブがスクロールしない | `.study-hub` の `flex:1; min-height:0` または親 app-main チェーン |
| 狭幅で Coverflow が重なる | `@container coverflow` ブレークポイント（520 / 400）未調整 |
| ドラッグでページが横スクroll | `touch-action` / pointer 処理の欠如 |

## デバッグ手順

1. `.study-hub` の scroll 可否
2. `.study-coverflow-stage` の `clientHeight` と container 幅
3. `study-coverflow-track` の transform（DevTools 3D  view）

## 手動 QA

- [ ] ハブ全体 scroll（バー非表示）
- [ ] Coverflow ドラッグ・選択デッキ切替
- [ ]  container 幅 520 / 400 未満で stage 高さ縮小
- [ ] スマート学習ハブ: 復習予定ヒーロー + 一覧
- [ ] モード起動 → セッション UI（[dev-study-layout](./dev-study-layout.md)）

## 変更時ガイド

- Coverflow 定数は `coverflow-motion.ts` と `study-hub.css` をセットで
- セッション flip の overflow ルールをハブに持ち込まない

## 履歴メモ

| 日付 | 症状 | 原因 | 対応 |
|------|------|------|------|
| 2026-07 | セッション完了が静的 `StudyEmpty` で達成感不足 | ハブのみホロパネル、セッションは別 UI | `LeitnerDueCompletePanel` 共有化 + Motion / パーティクル。デッキ別完了は控えめ UI |
