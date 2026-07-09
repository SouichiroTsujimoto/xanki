# xanki iOS（Capacitor）

学習専用 MVP: ログイン、ライブラリ、全学習モード、テキスト/QA カード作成。

## 開発

```bash
# ターミナル 1: Cloud API
pnpm dev:cloud

# ターミナル 2: Vite（ブラウザ確認）
pnpm dev:mobile

# シミュレータ（build + cap sync + AuthSession プラグイン登録込み）
cd mobile && pnpm cap:ios
```

環境変数: iOS シミュレータの dev 既定は `VITE_CLOUD_URL=http://localhost:8787`。Cloud REST は native `NativeHttpPlugin`（URLSession）経由で実行する。`pnpm dev:cloud` は IPv4 でも listen する。`pnpm dev:cloud` 再起動だけでは iOS アプリ内の `dist` は更新されないため、認証周りを変えた後は `pnpm cap:ios` または `pnpm build:mobile:ios` を実行する。

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
