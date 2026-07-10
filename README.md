# xanki

マスキング暗記カード — Tauri デスクトップ + Cloud（Workers / D1）+ Capacitor iOS。

**仕様 (SSoT): [`docs/spec/`](docs/spec/README.md)**

## モノレポ構成

| パス | 役割 |
|------|------|
| `xanki/` | Tauri デスクトップ（取込・OCR・同期） |
| `mobile/` | Capacitor iOS（学習専用 MVP + Cloud REST） |
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
| `dev:mobile*` | Mobile Vite / iOS シミュレータ |
| `smoke:*` / `test:*` | 自動テスト |

### よく使うコマンド

```bash
# 初回セットアップ（install / shared build / D1 migrate）
pnpm setup:cloud

# 1Password CLI（Cloud dev secrets — 各 workspace で web/.dev.vars.op をそのまま利用）
brew install 1password-cli && op signin   # 初回のみ。詳細は docs/dev-cloud.md

# Cloud API + Web UI（Vite HMR + workerd）
pnpm dev:cloud

# セットアップ済みで dev サーバーだけ再起動したいとき
pnpm dev:cloud -- --skip-setup

# Cloud + Desktop を 1 コマンドで
pnpm dev:cloud:all

# Cloud + Mobile iOS（live reload）を 1 コマンドで
pnpm dev:cloud:mobile

# Desktop のみ（Cloud は別ターミナルで dev:cloud を先に起動）
pnpm dev:desktop

# Mobile Vite のみ（ブラウザ確認、:5174）
pnpm dev:mobile

# iOS シミュレータ（live reload。Cloud は別ターミナルで dev:cloud）
pnpm dev:mobile:ios
```

### 一覧

| コマンド | 内容 |
|---------|------|
| `pnpm setup:cloud` | 依存関係・D1 の初回セットアップ |
| `pnpm setup:jj-workspace` | jj workspace ブートストラップ（install / secrets / cloud） |
| `pnpm check:secrets` | 1Password dev secrets の参照解決確認 |
| `pnpm check:design` | border/focus デザイントークン準拠チェック |
| `pnpm dev:cloud` | setup 込みで vite dev（8787、HMR） |
| `pnpm dev:cloud -- --skip-setup` | setup 省略で vite dev のみ |
| `pnpm dev:cloud:all` | vite dev + Tauri デスクトップ |
| `pnpm dev:cloud:mobile` | vite dev + Mobile Vite + iOS シミュレータ（live reload） |
| `pnpm dev:desktop` | Tauri デスクトップのみ |
| `pnpm dev:mobile` | Mobile Vite のみ（5174、ブラウザ確認） |
| `pnpm dev:mobile:ios` | Mobile Vite + iOS シミュレータ（live reload） |
| `pnpm build:mobile:ios` | dist ビルド + cap sync（Xcode / TestFlight 用・同梱） |
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

**Cloud + Mobile iOS（1 コマンド）**

```bash
pnpm dev:cloud:mobile
```

またはターミナル 2 枚:

```bash
# ターミナル 1
pnpm dev:cloud

# ターミナル 2
pnpm dev:mobile:ios
```

iOS 開発は macOS + Xcode が必要です。JS/UI は live reload（Mobile Vite :5174）。Swift / ネイティブ変更後は `pnpm build:mobile:ios` または `pnpm dev:mobile:ios -- --bundled` で再 sync してください。

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
| Mobile / iOS | [`docs/dev-mobile.md`](docs/dev-mobile.md)、[`mobile/README.md`](mobile/README.md) |
| Agent 向けガイド | [`AGENTS.md`](AGENTS.md) |
| デスクトップ固有（ショートカット・配布） | [`xanki/README.md`](xanki/README.md) |
