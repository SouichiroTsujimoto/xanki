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
# 初回セットアップ（install / shared build / D1 migrate / SPA build）
pnpm setup:cloud

# Cloud API + Web UI
pnpm dev:cloud

# セットアップ済みで wrangler だけ再起動したいとき
pnpm dev:cloud -- --skip-setup

# Cloud + Desktop を 1 コマンドで
pnpm dev:cloud:all

# Desktop のみ（Cloud は別ターミナルで dev:cloud を先に起動）
pnpm dev:desktop
```

### 一覧

| コマンド | 内容 |
|---------|------|
| `pnpm setup:cloud` | 依存関係・D1・Web SPA の初回セットアップ |
| `pnpm dev:cloud` | setup 込みで wrangler dev（8787） |
| `pnpm dev:cloud -- --skip-setup` | setup 省略で wrangler のみ |
| `pnpm dev:cloud:all` | wrangler + Tauri デスクトップ |
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
