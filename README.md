# xanki

マスキング暗記カード — Tauri デスクトップ + Cloud（Workers / D1）。

**仕様 (SSoT): [`docs/spec/`](docs/spec/README.md)**

## モノレポ構成

| パス | 役割 |
|------|------|
| `xanki/` | Tauri デスクトップ（取込・OCR・同期） |
| `web/` | Cloud SPA + Workers API |
| `packages/ui/` | 共有 UI（`@xanki/ui`） |
| `shared/` | 型・スキーマ（`@xanki/shared`） |

## コマンド体系

開発用コマンドは **リポジトリルート** の `package.json` に集約しています。各パッケージ直下の `pnpm dev` 等は内部実装用で、日常の起動はルートコマンドを使ってください。

### 命名規則

| プレフィックス | 意味 |
|---------------|------|
| `setup:*` | 初回・環境リセット時のセットアップ |
| `dev:cloud*` | Cloud API + Web UI（`http://localhost:8787`） |
| `dev:desktop` | Tauri デスクトップのみ |
| `smoke:*` / `test:*` | 自動テスト |

### よく使うコマンド

```bash
# 初回セットアップ（install / shared build / D1 migrate）
pnpm setup:cloud

# 1Password CLI（Cloud dev secrets — worktree でも web/.dev.vars.op をそのまま利用）
brew install 1password-cli && op signin   # 初回のみ。詳細は docs/dev-cloud.md

# Cloud API + Web UI（Vite HMR + workerd）
pnpm dev:cloud

# セットアップ済みで dev サーバーだけ再起動したいとき
pnpm dev:cloud -- --skip-setup

# Cloud + Desktop を 1 コマンドで
pnpm dev:cloud:all

# Desktop のみ（Cloud は別ターミナルで dev:cloud を先に起動）
pnpm dev:desktop
```

### 一覧

| コマンド | 内容 |
|---------|------|
| `pnpm setup:cloud` | 依存関係・D1 の初回セットアップ |
| `pnpm check:secrets` | 1Password dev secrets の参照解決確認 |
| `pnpm check:design` | border/focus デザイントークン準拠チェック |
| `pnpm dev:cloud` | setup 込みで vite dev（8787、HMR） |
| `pnpm dev:cloud -- --skip-setup` | setup 省略で vite dev のみ |
| `pnpm dev:cloud:all` | vite dev + Tauri デスクトップ |
| `pnpm dev:desktop` | Tauri デスクトップのみ |
| `pnpm smoke:cloud` | Cloud API 統合テスト（Vitest） |
| `pnpm smoke:cloud:full` | setup 省略 + smoke 一括 |
| `pnpm test:auth` | 認証まわりの Vitest |
| `pnpm build:shared` | `@xanki/shared` ビルド |
| `pnpm build:ui` | `@xanki/ui` 型チェック |
| `pnpm build:web` | Web SPA ビルド |

### 典型的な起動パターン

**Cloud + Desktop（ターミナル 2 枚）**

```bash
# ターミナル 1
pnpm dev:cloud

# ターミナル 2
pnpm dev:desktop
```

Desktop が Cloud API に接続するには `xanki/.env.development` に次を設定します（初回のみ）:

```bash
cp xanki/.env.development.example xanki/.env.development
# VITE_CLOUD_URL=http://localhost:8787
```

**Desktop 単体（ローカル DB のみ、Cloud 不要）**

```bash
cd xanki
pnpm build:ocr   # 初回のみ（Vision OCR サイドカー）
pnpm tauri dev
```

## 詳細ドキュメント

| 内容 | 参照 |
|------|------|
| Cloud ローカル開発（OAuth・トラブルシュート） | [`docs/dev-cloud.md`](docs/dev-cloud.md) |
| Agent 向けガイド | [`AGENTS.md`](AGENTS.md) |
| デスクトップ固有（ショートカット・配布） | [`xanki/README.md`](xanki/README.md) |
