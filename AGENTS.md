# xanki — Agent 向けガイド

## 仕様 (SSoT)

**正本は [`docs/spec/`](./docs/spec/README.md) です。**

| 変更対象 | 読む spec |
|---------|-----------|
| 取込・ショートカット | [capture.md](./docs/spec/capture.md) |
| テキストマスク | [text-masks.md](./docs/spec/text-masks.md) |
| 画像マスク・座標 | [image-masks.md](./docs/spec/image-masks.md) |
| DB / JSON | [data-model.md](./docs/spec/data-model.md) |
| ライブラリ | [library.md](./docs/spec/library.md)（用語: [glossary.md](./docs/spec/glossary.md)） |
| UI / ダイアログ | [ui.md](./docs/spec/ui.md) |
| UI コンポーネント選択 | [ui-components.md](./docs/spec/ui-components.md) |
| UI レイアウト（実装・索引） | [dev-ui.md](./docs/dev-ui.md) |
| 用語・UI 文言 | [glossary.md](./docs/spec/glossary.md) |
| クラウド層 | [cloud.md](./docs/spec/cloud.md) |

## モノレポ

| パッケージ | 役割 |
|-----------|------|
| `xanki/` | Tauri デスクトップ（シェル + 取込 + 同期） |
| `mobile/` | Capacitor iOS（学習専用 MVP + Cloud REST） |
| `web/` | Cloud SPA + Workers API |
| `packages/ui/` | 共有 UI（`@xanki/ui`）— Tailwind + shadcn プリミティブ |
| `shared/` | 型・スキーマ（`@xanki/shared`）— BC 別サブフォルダ |

### `@xanki/shared` 構成

| サブフォルダ | 内容 |
|-------------|------|
| `masks/` | masks JSON Zod・`parse*Json` |
| `library/` | API 型・`mapApi*`・`filterStudyCards`・`countDueCards` |
| `study/` | `LeitnerScheduler`・`mask-answers`・`deck-session` |
| `cloud/` | `cloud-client`・`create-app-api`・`library-sync-controller` |
| `sync/` | レガシー sync 型（縮小予定） |
| `entitlements.ts` | プラン上限 |

**開発者向けメモ（リポジトリ管理）** — 索引: [dev-ui.md](./docs/dev-ui.md)

| ドキュメント | 内容 |
|-------------|------|
| [dev-jj.md](./docs/dev-jj.md) | **jujutsu（jj）運用** — change 文脈判断・workspace・main push |
| [dev-ui.md](./docs/dev-ui.md) | UI レイアウト索引・記録ルール |
| [dev-cloud.md](./docs/dev-cloud.md) | クラウド層ローカル動作確認 |
| [dev-app-shell.md](./docs/dev-app-shell.md) | シェル・サイドバー・狭幅ドロワー |
| [dev-home.md](./docs/dev-home.md) | ホーム |
| [dev-library.md](./docs/dev-library.md) | デッキ・カード一覧 |
| [dev-study-hub.md](./docs/dev-study-hub.md) | 学習ハブ・Coverflow |
| [dev-study-layout.md](./docs/dev-study-layout.md) | 学習セッション・フリップ、**hooks による load ループ再発防止** |
| [dev-mask-editor.md](./docs/dev-mask-editor.md) | マスクエディタ |
| [dev-dialogs-overlays.md](./docs/dev-dialogs-overlays.md) | ダイアログ・オーバーレイ |
| [dev-settings-auth.md](./docs/dev-settings-auth.md) | 設定・認証 |
| [dev-mobile.md](./docs/dev-mobile.md) | iOS Capacitor・Safe Area |
| [dev-jj.md](./docs/dev-jj.md) | **jujutsu（jj）** — change 文脈判断・workspace・main push |

レイアウト問題修正時は dev doc の **履歴メモ** を同 PR で更新（[ui-layout-dev-docs.mdc](./.cursor/rules/ui-layout-dev-docs.mdc)）。

**画面 UI 修正の一連ワークフロー**（設計スキル → 実装 → ブラウザ確認 → dev doc）: [`.cursor/skills/xanki-ui-fix-workflow/SKILL.md`](./.cursor/skills/xanki-ui-fix-workflow/SKILL.md) — 呼び出し例 `@xanki-ui-fix-workflow`

```bash
pnpm setup:cloud          # 初回のみ
pnpm check:secrets        # 1Password dev secrets 診断
pnpm check:design         # border/focus トークン準拠チェック
pnpm dev:cloud            # Web API + SPA (8787、Vite HMR)
pnpm dev:cloud -- --skip-setup  # vite dev のみ再起動
pnpm smoke:cloud          # API 自動テスト
pnpm dev:cloud:all        # + Tauri デスクトップ
pnpm dev:cloud:mobile     # + Mobile Vite + iOS シミュレータ（live reload）
pnpm dev:desktop          # Desktop のみ（Cloud は別途 dev:cloud）
pnpm dev:mobile           # Mobile Vite (5174)。API は別途 dev:cloud
pnpm dev:mobile:ios       # Mobile Vite + iOS シミュレータ（live reload）
pnpm build:mobile:ios     # dist ビルド + cap sync ios（Xcode / TestFlight）
```

**Dev secrets:** 正本は [`web/.dev.vars.op`](web/.dev.vars.op)（`op://` 参照・リポジトリ管理）。`pnpm dev:cloud` は [`scripts/with-dev-secrets.sh`](scripts/with-dev-secrets.sh) 経由で `op run` する。**workspace 間で `web/.dev.vars` を手コピーする案内はしない。** 詳細: [dev-cloud.md](./docs/dev-cloud.md)

**VCS（jujutsu）:** 作業着手前に change 文脈を判断（別文脈なら `describe` → `new`）。`@jj-workspace` / `@jj-workspace-close` / `@jj-push-main`。secondary では `pnpm dev:*` / `pnpm setup:*` 禁止。正本: [dev-jj.md](./docs/dev-jj.md)、[dev-jujutsu.mdc](./.cursor/rules/dev-jujutsu.mdc)

コマンド体系の詳細: [`README.md`](./README.md)

## Browser Support

**Browser Support:** Tauri デスクトップ（macOS WebKit / Safari 17.4+）を主ターゲットとする。Baseline Widely available の機能は fallback なしで採用する。Baseline Newly Available は feature detect し、20 行以内・外部依存なしの軽量 fallback のみ許可する。polyfill は使わない。

UI 変更後の手動スモーク:

- `pnpm dev:cloud` — ログイン、ホーム、デッキ学習 Coverflow、フリップ、削除ダイアログ
- `pnpm dev:desktop` — 同上 + 900px 以下サイドバードロワー
- `pnpm dev:cloud:mobile` または `pnpm dev:mobile:ios` — 同上（取込・編集・import/export は非表示）
- `prefers-reduced-motion: reduce` — フリップ即時切替、ドロワー即時

## ルール

1. 挙動を変えたら **同じ変更で spec を更新**する
2. **画面レイアウト問題**（見切れ・重なり等）を直したら **同じ PR で** [dev-ui.md](./docs/dev-ui.md) 索引の該当 dev doc に原因・再発防止を追記する
3. 座標系・JSON・保存フローは spec と実装を必ず一致させる
4. `window.confirm` / `window.alert` は Tauri で使わない（[ui.md](./docs/spec/ui.md)）
5. **UI 共通化** — Web / Tauri で同じ画面・ダイアログは [`@xanki/ui`](./packages/ui/) に実装し、各アプリは import または認証などの薄い wrapper のみ（[ui.md](./docs/spec/ui.md) §デザイン SSoT）。新規 UI 前に [ui-components.md](./docs/spec/ui-components.md) を確認
6. **デザインシステム** — border / focus は [tokens.css](./packages/ui/src/styles/tokens.css) + [focus.css](./packages/ui/src/styles/focus.css)。UI CSS 変更後は `pnpm check:design`
7. **用語** — UI・会話では [glossary.md](./docs/spec/glossary.md) の UI 表示（正）を使う。実装は [`packages/ui/src/copy.ts`](./packages/ui/src/copy.ts)
8. **学習セッション hooks** — `useEffect` / `useCallback` の deps にカスタム hook の**戻りオブジェクト丸ごと**を入れない。load ループ・API 連打の再発防止は [dev-study-layout.md §学習セッションのデータ読み込み](./docs/dev-study-layout.md)
9. **jj change** — 作業着手前に今の `@` にこれからの作業を含めてよいか判断する。別文脈なら **編集前に** `jj describe`（ここまでの内容）→ `jj new`。詳細: [dev-jj.md](./docs/dev-jj.md)、[dev-jujutsu.mdc](./.cursor/rules/dev-jujutsu.mdc)

## アプリコード

メインアプリ: [`xanki/`](./xanki/)

```bash
cd xanki && pnpm install && pnpm build:ocr && pnpm tauri dev
```
