# xanki iOS（Capacitor）

学習専用 MVP: ログイン、ライブラリ、全学習モード、テキスト/QA カード作成。

日常の起動は **リポジトリルート** の pnpm コマンドを使います（Desktop / Cloud と同じ体系）。

## 開発

```bash
# 1 コマンド: Cloud + Mobile Vite + iOS シミュレータ（live reload）
pnpm dev:cloud:mobile

# またはターミナル 2 枚
pnpm dev:cloud          # ターミナル 1: Cloud API (:8787)
pnpm dev:mobile:ios     # ターミナル 2: Vite (:5174) + シミュレータ

# ブラウザだけで Mobile UI を見る（ネイティブなし）
pnpm dev:mobile
```

| コマンド | 内容 |
|---------|------|
| `pnpm dev:cloud:mobile` | Cloud + live reload iOS |
| `pnpm dev:mobile:ios` | Mobile Vite + シミュレータ（Cloud は別途） |
| `pnpm dev:mobile` | Mobile Vite のみ（:5174） |
| `pnpm build:mobile:ios` | dist 同梱 + `cap sync`（Xcode / TestFlight） |
| `pnpm dev:mobile:ios -- --bundled` | live reload なし（dist 同梱で `cap run`） |
| `pnpm dev:mobile:ios -- --no-run` | sync のみ（Xcode から開く） |

環境変数: iOS シミュレータの dev 既定は `VITE_CLOUD_URL=http://localhost:8787`。Cloud REST は native `NativeHttpPlugin`（URLSession）経由。`pnpm dev:cloud` は IPv4 でも listen する。

### Live reload

`dev:mobile:ios` / `dev:cloud:mobile` は Capacitor `server.url` を `http://localhost:5174` に向けます。JS/UI の変更は Vite HMR で反映されます。

- **Swift / プラグイン変更後**は `pnpm build:mobile:ios` または `pnpm dev:mobile:ios -- --bundled` で再 sync
- **TestFlight / 本番**は live reload を使わず `pnpm build:mobile:ios`（`CAPACITOR_LIVE_RELOAD` 未設定 → dist 同梱）

実機で LAN から Vite を見る場合:

```bash
CAPACITOR_DEV_SERVER_URL=http://<MacのLAN-IP>:5174 pnpm dev:mobile:ios
```

## TestFlight / App Store ビルド

1. `mobile/.env.production` に本番 `VITE_CLOUD_URL=https://app.<domain>` を設定
2. `pnpm build:mobile:ios` — `dist` ビルド + `cap sync ios`
3. Xcode で `mobile/ios/App/App.xcworkspace` を開く
4. Signing & Capabilities — Team / Bundle ID `app.xanki.mobile`
5. Product → Archive → Distribute App → TestFlight

### 審査準備チェックリスト

- [ ] Apple Developer Program
- [ ] App Privacy（Google アカウント、学習データ、クラウド同期）
- [ ] スクリーンショット（6.7" / 12.9"）
- [ ] 審査用 Google テストアカウント
- [ ] Sign in with Apple 要否の確認（Google のみログイン時）

## アーキテクチャ

- UI: `@xanki/ui`（Web/Desktop と共有）
- API: `@xanki/shared` CloudClient + Bearer
- 認証: `/auth/desktop-sign-in` → `xanki://auth/callback?token=...`
- 実装メモ: [`docs/dev-mobile.md`](../docs/dev-mobile.md)
