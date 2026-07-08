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
| 学習（索引） | [study.md](./docs/spec/study.md) |
| デッキ学習 | [deck-study.md](./docs/spec/deck-study.md) |
| Leitner学習 | [leitner-study.md](./docs/spec/leitner-study.md) |
| UI / ダイアログ | [ui.md](./docs/spec/ui.md) |
| 用語・UI 文言 | [glossary.md](./docs/spec/glossary.md) |
| クラウド層 | [cloud.md](./docs/spec/cloud.md) |

## モノレポ

| パッケージ | 役割 |
|-----------|------|
| `xanki/` | Tauri デスクトップ（シェル + 取込 + 同期） |
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

**クラウド層のローカル動作確認**: [docs/dev-cloud.md](./docs/dev-cloud.md)

```bash
pnpm setup:cloud          # 初回のみ
pnpm dev:cloud            # Web API + SPA (8787)
pnpm dev:cloud -- --skip-setup  # wrangler のみ再起動
pnpm smoke:cloud          # API 自動テスト
pnpm dev:cloud:all        # + Tauri デスクトップ
pnpm dev:desktop          # Desktop のみ（Cloud は別途 dev:cloud）
```

コマンド体系の詳細: [`README.md`](./README.md)

## ルール

1. 挙動を変えたら **同じ変更で spec を更新**する
2. 座標系・JSON・保存フローは spec と実装を必ず一致させる
3. `window.confirm` / `window.alert` は Tauri で使わない（[ui.md](./docs/spec/ui.md)）
4. **UI 共通化** — Web / Tauri で同じ画面・ダイアログは [`@xanki/ui`](./packages/ui/) に実装し、各アプリは import または認証などの薄い wrapper のみ（[ui.md](./docs/spec/ui.md) §デザイン SSoT）
5. **用語** — UI・会話では [glossary.md](./docs/spec/glossary.md) の UI 表示（正）を使う。実装は [`packages/ui/src/copy.ts`](./packages/ui/src/copy.ts)

## アプリコード

メインアプリ: [`xanki/`](./xanki/)

```bash
cd xanki && pnpm install && pnpm build:ocr && pnpm tauri dev
```
