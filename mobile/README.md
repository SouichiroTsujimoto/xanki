# xanki iOS（Capacitor）

学習専用 MVP: ログイン、ライブラリ、全学習モード、テキスト/QA カード作成。

## 開発

```bash
# ターミナル 1: Cloud API
pnpm dev:cloud

# ターミナル 2: Vite（ブラウザ確認）
pnpm dev:mobile

# シミュレータ / 実機
cd mobile && pnpm build && npx cap run ios
```

環境変数: `mobile/.env.example` を `mobile/.env.local` にコピーし `VITE_CLOUD_URL` を設定（dev 既定: `http://localhost:8787`）。

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
