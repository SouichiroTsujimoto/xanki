# 設定・認証 — 実装メモ

**設定**タブ、**ログイン**、**オンボーディング**のレイアウト。  
仕様: [ui.md](./spec/ui.md), [cloud.md](./spec/cloud.md)。索引: [dev-ui.md](./dev-ui.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| 設定 | [`settings-view.tsx`](../packages/ui/src/components/xanki/settings-view.tsx), [`cloud-account-section.tsx`](../packages/ui/src/components/xanki/cloud-account-section.tsx) |
| ログイン | [`login-view.tsx`](../packages/ui/src/components/xanki/login-view.tsx) |
| オンボーディング | [`onboarding-view.tsx`](../packages/ui/src/components/xanki/onboarding-view.tsx) |
| スタイル | [`settings.css`](../packages/ui/src/styles/components/settings.css), [`onboarding.css`](../packages/ui/src/styles/components/onboarding.css) |

## DOM 構造

**設定**

```
.settings-view（app-main 内）
  └── .settings-grid    ← auto-fit minmax(300px, 1fr), max-width 960px
        └── .settings-card × N
```

**オンボーディング / ログイン**

```
.onboarding-frame       ← grid 2 列（900px 以下 1 列）
  ├── .onboarding-brand
  └── .onboarding-panel / フォーム
```

## 不変条件

1. **設定 grid** — `repeat(auto-fit, minmax(300px, 1fr))`。狭幅で 1 列に自然折返し
2. **設定タブ scroll** — spec: スクロールバー非表示・スクロール可（app-main / 子ビューで実装）
3. **900px 以下** — `.onboarding-frame` 1 列（responsive.css）
4. **Cloud ブロック** — `CloudAccountSection` は presentational。Web/Tauri は wrapper が auth 状態を注入
5. **フォーム** — `:user-invalid` / autocomplete パターンは [ui.md](./spec/ui.md)

## 症状 → 原因

| 症状 | よくある原因 |
|------|----------------|
| 設定カードが横にはみ出す | grid `minmax` と親 padding |
| オンボーディング 2 列が狭幅で潰れる | responsive 1 列未適用 |
| ログインエラーが alert | Tauri 禁止 → インライン表示へ |

## デバッグ手順

1. `.settings-grid` の列数と container 幅
2. onboarding の `@media 900px`
3. フォーム error 表示 DOM

## 手動 QA

- [ ] 設定: 複数カード、狭幅 1 列、scroll
- [ ] Web ログイン / Cloud アカウント表示
- [ ] オンボーディング 900px 境界
- [ ] Tauri: alert 不使用

## 変更時ガイド

- 文言 → glossary + copy.ts
- Cloud 挙動 → cloud.md + dev-cloud.md

## 履歴メモ

| 日付 | 症状 | 原因 | 対応 |
|------|------|------|------|
| — | （追記用） | | |
