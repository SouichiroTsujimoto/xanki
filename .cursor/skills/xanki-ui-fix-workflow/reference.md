# xanki UI 修正 — 参照

## 画面 → dev doc マップ

| 画面・領域 | dev doc | 主な CSS / コンポーネント |
|-----------|---------|---------------------------|
| アプリシェル・サイドバー | [dev-app-shell.md](../../../docs/dev-app-shell.md) | `app-shell.css`, `app-shell.tsx` |
| ホーム | [dev-home.md](../../../docs/dev-home.md) | `home.css`, `home-view.tsx` |
| デッキ・カード一覧 | [dev-library.md](../../../docs/dev-library.md) | `library.css`, `card-collection.tsx` |
| 学習ハブ | [dev-study-hub.md](../../../docs/dev-study-hub.md) | `study-hub.css`, `study-card-coverflow.tsx` |
| 学習セッション（フリップ） | [dev-study-layout.md](../../../docs/dev-study-layout.md) | `review.css`, `study-flip-scene.tsx` |
| マスクエディタ | [dev-mask-editor.md](../../../docs/dev-mask-editor.md) | `mask-editor.css` |
| ダイアログ | [dev-dialogs-overlays.md](../../../docs/dev-dialogs-overlays.md) | `dialogs.css` |
| 設定・認証 | [dev-settings-auth.md](../../../docs/dev-settings-auth.md) | `settings.css`, `login-view.tsx` |

索引: [dev-ui.md](../../../docs/dev-ui.md)

## dev doc 追記テンプレート

### 履歴メモ（表の 1 行）

```markdown
| 2026-07 | 症状の短い説明 | 根本原因（CSS/DOM/計測） | 対応（ファイル・方針） |
```

### 症状 → 原因（新パターン）

```markdown
| 症状 | よくある原因 | 確認方法 |
|------|-------------|----------|
| … | … | DevTools で … を見る |
```

### 不変条件（新規）

```markdown
N. **タイトル**
   - 守る理由
   - 破ると起きること
```

## ブラウザ確認プロトコル（MCP）

### 基本ループ

1. `browser_navigate` → 対象 URL
2. `browser_lock` → 操作 → `browser_unlock`
3. 各ステップ後 `browser_snapshot`（構造）+ `browser_take_screenshot`（見た目）
4. レイアウト問題: viewport を変えて再取得

### xanki よく使う URL（dev:cloud）

| 画面 | パス（ログイン後） |
|------|-------------------|
| ホーム | `/` |
| ライブラリ | `/library` 等（ルータ定義に合わせる） |
| 学習 | デッキから学習開始 |

ログインが必要な場合: Google OAuth または dev OTP（[dev-cloud.md](../../../docs/dev-cloud.md)）。

### viewport チェックリスト

| 幅 | 確認項目 |
|----|----------|
| 1280 | デスクトップ通常 |
| 900 以下 | サイドバードロワー（Tauri / 狭幅 Web） |
| 390 | モバイル縦・テキスト折返し |

### 学習 UI スモーク（AGENTS.md より）

- デッキ学習 Coverflow → フリップ → 長文カードスクロール
- 削除ダイアログ
- `prefers-reduced-motion: reduce` でフリップ即時切替

## modern-web-guidance の読み方

1. `.agents/skills/modern-web-guidance/SKILL.md` を開く
2. 症状キーワードで `guides/` を grep（overflow, flex, scroll, viewport 等）
3. 該当 guide のパターンを `@xanki/ui` の CSS/TS に写す（プロジェクトのトークン・命名に合わせる）

## frontend-design の使い方（xanki 文脈）

- **レイアウトバグ修正**が主目的のとき: 美学は既存デザインシステム（`tokens.css`, shadcn プリミティブ）に従い、派手な再デザインは避ける
- **新規画面・目立つ UI 変更**のとき: frontend-design で方向性を決め、spec / glossary の用語と矛盾させない

## 報告フォーマット（ユーザー向け完了報告）

```markdown
## 修正内容
- …

## ブラウザ確認
- 環境: dev:cloud / dev:desktop
- 操作: …
- 結果: 症状解消 / スクリーンショット所見

## ドキュメント
- 更新: docs/dev-*.md §履歴メモ
- spec: 更新なし / docs/spec/… を更新
```
