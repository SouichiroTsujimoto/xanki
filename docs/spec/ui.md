# UI / UX

## デザイン SSoT

| レイヤ | 正本 |
|--------|------|
| 意味・原則・トークン名 | 本 spec |
| **値（色・半径・影）** | [`packages/ui/src/styles/tokens.css`](../../packages/ui/src/styles/tokens.css) |
| コンポーネントスタイル | [`packages/ui/src/styles/globals.css`](../../packages/ui/src/styles/globals.css) + Tailwind |
| 共有 UI コンポーネント | [`packages/ui`](../../packages/ui/)（`@xanki/ui`） |

Web / デスクトップは **同一 `@xanki/ui` コンポーネント** を使用する。プラットフォーム差分（Tauri 取込・Web 認証等）は `AppApi` 注入と slot props で吸収する。

**必須**: 共通化できる UI（ログイン、学習、設定、ダイアログ等）は `@xanki/ui` に置く。`web/` と `xanki/` に同等コンポーネントを重複実装しない。認証フローなど AppApi に載らない差分は、共有 presentational コンポーネント + 各アプリの thin wrapper で分離する。

## UI コピー方針

| レイヤ | 正本 |
|--------|------|
| 用語・UI 表示名 | [glossary.md](./glossary.md) |
| 実装値 | [`packages/ui/src/copy.ts`](../../packages/ui/src/copy.ts) |

- ユーザー向け本文は **日本語**
- コード・API・型名は **英語**（識別子のリネームは別 PR）
- **homonym 禁止**: タブ名と学習モード名を同一日本語にしない（例: タブ「学習」≠ モード `learn` → UI「復習」）
- eyebrow（小見出し）も原則日本語（固有名 `Coverflow` 等は glossary に明記）
- 仕様・UI 文言を変えたら **同じ PR で glossary.md と copy.ts を更新**
- エージェント・会話では glossary の **UI 表示（正）** 列を使う

### トークン対応表（抜粋）

| 意味 | CSS 変数（`tokens.css`） | Tailwind 例 |
|------|--------------------------|-------------|
| Chartreuse アクセント | `--color-accent` | `bg-accent`, `text-accent` |
| 背景（snow） | `--color-background` | `bg-background` |
| 本文 | `--color-foreground` | `text-foreground` |
| カード面 | `--color-card` | `bg-card` |
| ボーダー | `--color-border` | `border-border` |
| 角丸（小） | `--radius-sm` | `rounded-sm` |

## デザイン原則

- **白ベース + Chartreuse アクセント**（`--color-accent`, `--color-accent-soft`, `--color-accent-outline`）
- システムフォント（SF Pro / Hiragino）
- メイン: 左サイドレール + 白タイトルバー（Light theme）
- マスクエディタ: 白背景、通常ウィンドウ枠（当初設計の「完全透過」は未採用）

## メインウィンドウ構成

### サイドバー（折りたたみ可）

| 項目 | 内容 |
|------|------|
| **ホーム** | デッキ一覧（作成・リネーム・削除・import/export） |
| **学習** | 選択中デッキのカードコレクション + 5 学習モード起動 |
| **設定** | 権限・環境設定 |

- **学習ハブ**・**設定タブ**の縦スクロールバーは非表示（スクロール自体は可能。カード一覧と同様）
- **900px 以下**の狭いウィンドウでは、サイドバーはオフキャンバスドロワー（初期状態は閉）。開いたときは半透明スクリムをタップで閉じる。スライドは **Motion spring**（`prefers-reduced-motion` 時は即時）
- **学習セッション開始時**（モード実行中）はサイドバーを自動で閉じ、メイン領域を全画面表示にする
- セッション中にトグルでサイドバーを開くと **オーバーレイ** として表示される
- 「戻る」で学習ハブ（モードボタン + カード一覧）に復帰。セッション開始前にサイドバーが開いていた場合は、ハブ復帰時に再度開く

### トップバー

| タブ | 表示 |
|------|------|
| ホーム | ホーム |
| 学習（ハブ） | 選択デッキ名、カード検索、復習待ち件数 |
| 学習（セッション） | モード名、「戻る」 |
| 設定 | 設定 |

## ウィンドウ

| ウィンドウ | サイズ | 備考 |
|-----------|--------|------|
| main | 1280×840 | 起動時ホーム表示。Dock クリックはウィンドウを前面に出すだけ（タブは維持） |
| テキストエディタ | 720×600 | |
| 画像エディタ | 1000×1000 | |

## UI アニメーション（Motion）

- 実装: [`packages/ui`](../../packages/ui/) の `motion`（`motion/react`）。アプリ側から直接 import しない
- 共通: [`useReducedMotion`](../../packages/ui/src/lib/use-reduced-motion.ts) — `prefers-reduced-motion: reduce` 時は duration 0 / 即時切替
- **メインタブ切替**（ホーム / 学習 / 設定）: アニメーションなし（即時切替）
- **学習ハブ Coverflow**: 選択デッキのカードを 3D カルーセル表示。ドラッグで移動（装飾・ナビ UI なし）
- **900px 以下ドロワー**: spring スライド + スクリム fade
- **削除確認ダイアログ**: backdrop / panel の fade + scale
- **学習モード起動ボタン**: hover / tap の subtle motion（CSS transform と二重適用しない）

## ダイアログ方針

- **`window.confirm` / `window.alert` を使わない**
- 破壊的操作（削除）はアプリ内モーダル（Motion で開閉アニメーション）
- エラーはモーダル内メッセージまたは console + ユーザー向け短文

## ショートカット一覧

### グローバル

| キー | 動作 |
|------|------|
| ⌥⌘M | テキスト取込 |
| ⌥⌘S | スクショ取込 |

### テキストマスクエディタ

| キー | 動作 |
|------|------|
| ⌘Enter | 保存 |
| Esc | キャンセル |

### 画像マスクエディタ（新規）

| キー | 動作 |
|------|------|
| Enter | 保存 |
| Esc | キャンセル |

### 学習（SRS）

| キー | 動作 |
|------|------|
| Space | 答え |
| 1 / 2 | 自己評価 |

## 文言

- 保存ボタン: 「暗記カード作成 ✦」/「更新」
- キャンセル: 「キャンセル」

## 受け入れ条件

- [ ] Web / デスクトップが同一 `@xanki/ui` コンポーネントを使用
- [ ] ログイン画面が `@xanki/ui` の `LoginView` を Web/Tauri 共通利用（認証のみ各アプリ wrapper）
- [ ] デザイン値の変更が `tokens.css` で両アプリに反映される
- [ ] `App.css` / `styles.css` が存在しない（Tailwind + `@xanki/ui` のみ）
- [ ] Web で `prompt()` / `window.confirm` が使われていない
- [ ] サイドバーに ホーム / 学習 / 設定 が並ぶ
- [ ] 学習モード開始でサイドバーが閉じ、トグルで再表示できる
- [ ] カード削除でネイティブ confirm が出ず、アプリ内ダイアログが出る
- [ ] 全体が白ベース + Chartreuse で統一されている
