# UI レイアウト — 開発者向け索引

画面構成・レイアウト・overflow・レスポンシブに関する **実装メモ（WHY / 再発防止）** の索引。  
ユーザー向け挙動の正本は [`docs/spec/`](./spec/README.md)（特に [ui.md](./spec/ui.md)）。

## ドキュメント一覧

| 画面・領域 | 実装メモ | 仕様（WHAT） | 主な CSS / コンポーネント |
|-----------|----------|--------------|---------------------------|
| **索引（本書）** | [dev-ui.md](./dev-ui.md) | [ui.md](./spec/ui.md) | — |
| アプリシェル・サイドバー | [dev-app-shell.md](./dev-app-shell.md) | [ui.md §メインウィンドウ](./spec/ui.md) | `app-shell.css`, `responsive.css`, `app-shell.tsx` |
| ホーム | [dev-home.md](./dev-home.md) | [library.md](./spec/library.md) | `home.css`, `home-view.tsx` |
| デッキ・カード一覧 | [dev-library.md](./dev-library.md) | [library.md](./spec/library.md) | `library.css`, `library-extras.css`, `card-collection.tsx` |
| 学習ハブ（Coverflow 等） | [dev-study-hub.md](./dev-study-hub.md) | [deck-study.md](./spec/deck-study.md), [leitner-study.md](./spec/leitner-study.md) | `study-hub.css`, `study-card-coverflow.tsx` |
| 学習セッション（フリップ） | [dev-study-layout.md](./dev-study-layout.md) | [study.md](./spec/study.md) | `review.css`, `study-flip-scene.tsx`, flip hooks |
| マスクエディタ | [dev-mask-editor.md](./dev-mask-editor.md) | [text-masks.md](./spec/text-masks.md), [image-masks.md](./spec/image-masks.md) | `mask-editor.css`, `text-mask-editor.tsx`, `image-mask-editor.tsx` |
| ダイアログ・オーバーレイ | [dev-dialogs-overlays.md](./dev-dialogs-overlays.md) | [ui.md §ダイアログ](./spec/ui.md) | `dialogs.css`, `NativeDialog`, `study-ai-panel.tsx` |
| 設定・認証 | [dev-settings-auth.md](./dev-settings-auth.md) | [ui.md](./spec/ui.md), [cloud.md](./spec/cloud.md) | `settings.css`, `onboarding.css`, `settings-view.tsx`, `login-view.tsx` |
| クラウド API（非 UI レイアウト） | [dev-cloud.md](./dev-cloud.md) | [cloud.md](./spec/cloud.md) | `web/` |

## 各 dev ドocument の構成（テンプレート）

新規作成・追記時は次の見出しを揃える。

1. **概要** — 対象画面と spec へのリンク
2. **関連ファイル** — 表
3. **DOM / レイアウト構造** — ツリーまたは表
4. **不変条件** — 変更前に確認（番号付き）
5. **症状 → 原因** — 再発時の切り分け表
6. **デバッグ手順** — DevTools で見る順序
7. **手動 QA** — チェックリスト
8. **変更時ガイド** — 触るファイルごとの注意
9. **履歴メモ** — 日付・症状・原因・対応（下記ルールで追記）

## レイアウト問題修正時の記録ルール（必須）

**ユーザーが画面構成・レイアウト上の問題を指摘し、修正した PR では必ず実施する。**

1. **該当 dev  doc を更新**（上表から画面を選ぶ。複数にまたがる場合は主因の doc + 必要なら索引から相互リンク）
2. **履歴メモ** に 1 行追加: `| YYYY-MM | 症状 | 原因 | 対応 |`
3. **新しい不変条件** が判明したら §不変条件 に追記
4. **新しい症状パターン** があれば §症状→原因 に追記
5. **ユーザー向け挙動が変わった** 場合のみ `docs/spec/` も同 PR で更新（WHY は dev doc、WHAT は spec）
6. **Web / Tauri 共通** — 修正は `@xanki/ui` に置き、片方だけのコピペを増やさない

Agent 向けルール: [`.cursor/rules/ui-layout-dev-docs.mdc`](../.cursor/rules/ui-layout-dev-docs.mdc)

Agent 向けワークフロー（設計スキル + ブラウザ確認 + 記録）: [`.cursor/skills/xanki-ui-fix-workflow/SKILL.md`](../.cursor/skills/xanki-ui-fix-workflow/SKILL.md)（`@xanki-ui-fix-workflow`）

## レイヤの役割分担

| レイヤ | 置き場 | 書く内容 |
|--------|--------|----------|
| WHAT | `docs/spec/` | ユーザーが見る挙動・受け入れ条件 |
| WHY / 罠 | `docs/dev-*.md` | DOM、overflow、計測、再発防止 |
| 即時警告 | コード内コメント | 1〜2 行 + dev doc への参照 |
| 個人ショートカット | Cursor Memory（任意） | 「レイアウト修正 → dev-ui.md」程度 |

Cursor Memory に詳細を書かない。正本は git 上の dev doc。
