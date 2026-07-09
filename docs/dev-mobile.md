# Mobile（iOS）— レイアウト・実装メモ

Capacitor + `@xanki/ui` の iPhone / iPad クライアント。仕様の正本は [ui.md](./spec/ui.md)、[cloud.md](./spec/cloud.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| Capacitor アプリ | `mobile/src/` |
| iOS ネイティブ | `mobile/ios/` |
| Safe Area / タッチ CSS | `mobile/src/index.css` |
| 認証（Bearer + deep link） | `mobile/src/lib/cloud/auth.ts`, `session.ts` |
| Native HTTP（Cloud REST） | `mobile/src/lib/cloud/native-http.ts`, `mobile/ios/App/App/NativeHttpPlugin.swift` |
| プラットフォーム機能フラグ | `packages/ui/src/context/platform-capabilities-context.tsx` |

## DOM / レイアウト構造

Web / Desktop と同一の `AppShell` + `responsive.css`（900px ドロワー）。`body.platform-mobile` でモバイル専用 CSS を上書き。

## 不変条件

1. **Safe Area** — `viewport-fit=cover` + `.platform-mobile .app-frame` の `env(safe-area-inset-*)` を維持する
2. **タッチターゲット** — `@media (pointer: coarse)` で主要ボタン最小 44px
3. **未対応機能は UI 非表示** — `PlatformCapabilities` で import/export・カード編集を隠す（throw 防止）
4. **Cloud REST** — iOS native は `NativeHttpPlugin`（URLSession）+ Bearer。WebView fetch は dev の localhost / preflight に依存しない

## 症状 → 原因

| 症状 | 原因 | 対応 |
|------|------|------|
| ノッチとヘッダーが重なる | Safe Area 未適用 | `index.css` の `.platform-mobile .app-frame` を確認 |
| ログイン後アプリに戻らない | URL scheme 未登録 | `Info.plist` の `CFBundleURLSchemes` = `xanki` |
| API 接続失敗（dev） | API origin 不一致、dev server が IPv6 localhost のみで listen、または WKWebView fetch が Capacitor の `http://localhost` 資産ホスト / preflight に衝突 | シミュレータは `VITE_CLOUD_URL=http://localhost:8787`。Cloud REST は `NativeHttpPlugin` で URLSession 経由。`pnpm dev:cloud` は `--host 0.0.0.0` で IPv4 も listen。OAuth canonical origin は `APP_URL=http://localhost:8787` |
| ログイン後 `/api/me` 接続失敗 | dev server が custom scheme `capacitor://localhost` の preflight を Worker 前段で落とす | iOS dev は `server.iosScheme = "http"` で WKWebView origin を `http://localhost` に寄せ、`/api/*` CORS も preflight を明示許可 |
| ログイン後 `Load failed` | WKWebView fetch が Cloudflare/Vite dev 前段の `OPTIONS` / private network preflight / Capacitor localhost 資産ホストに阻まれる | Cloud REST は `NativeHttpPlugin`（URLSession）で実行し、WebView fetch を使わない |
| 画像カードが表示されない | blob URL に Bearer を付けられない | `resolveAuthenticatedBlobUrl` で fetch → object URL |
| OAuth 後ログイン画面のまま | コールドスタートで launch URL を未処理 | `App.getLaunchUrl()` を登録時に処理 |
| `cap run ios` で scheme "xanki" not found | `ios.scheme` は Xcode スキーム名（URL ではない） | `capacitor.config.ts` から `scheme` を外すか `--scheme App`。deep link は `Info.plist` |
| Google ログイン後ログイン画面のまま | `AuthSessionPlugin` が `saveCall` せず OAuth 完了後に JS へ URL を返せない | `bridge.saveCall` + `getSavedCall` で非同期 resolve |
| Google ログイン後 ASWebAuthenticationSession が閉じない / ログイン画面のまま | `/auth/desktop-callback` が `Accept: text/html` で HTML を返し、302 の `xanki://` を拾えない | 深リンクは常に 302。HTML は `?format=html` のみ |
| Google アカウント選択後に戻らない | OAuth 開始 host と `APP_URL` の host が不一致で better-auth state cookie が Google callback に送られない | `/auth/desktop-sign-in` で `APP_URL` origin へ canonical redirect してから OAuth 開始 |
| `cap sync` の Found 3 plugins に AuthSession が無い | npm プラグインのみ列挙。ローカル Swift は `packageClassList` + `MainBridgeViewController` で登録 | `ensure-auth-session-plugin.mjs` + `registerPluginInstance` |
| OAuth 失敗も無言でログイン画面 | 401 HTML を ASWebAuthenticationSession が拾えずキャンセル扱い | 深リンク失敗も `xanki://auth/callback?error=...` で 302 |
| 修正後もシミュレータで同じ症状 | `pnpm dev:cloud` だけ再起動し、iOS アプリ内の stale `dist` / native 登録が残っている | `pnpm --filter @xanki/mobile cap:ios` は build + cap sync + plugin 登録を必ず実行 |
| インポート/編集でクラッシュ | platform hook 未実装 | `PlatformCapabilities` が false か確認 |

## 手動 QA

- [ ] iPhone シミュレータ（390px）でログイン → ホーム → デッキ学習 Coverflow
- [ ] iPad 横画面でサイドバー常時表示（900px 以上）
- [ ] テキスト/QA カード作成（キーボード表示時にフォームが隠れない）
- [ ] 別端末でデッキ変更 → SSE で反映
- [ ] `prefers-reduced-motion: reduce` でフリップ即時

## 履歴メモ

| 日付 | 症状 | 原因 | 対応 |
|------|------|------|------|
| 2026-07 | iOS MVP 初回 | — | Capacitor `mobile/` 追加、Safe Area CSS、`PlatformCapabilities` |
| 2026-07 | OAuth コールドスタートでトークン消失 | `appUrlOpen` のみ | `getLaunchUrl()` + `browserFinished` で busy 解除 |
| 2026-07 | 画像カード非表示 | blob に Bearer 不可 | `resolveAuthenticatedBlobUrl`（fetch → object URL） |
| 2026-07 | Google ログイン後画面遷移なし | `desktop-callback` が HTML を返し ASWebAuthenticationSession が `xanki://` を拾えない | 深リンクは常に HTTP 302（`?format=html` のみ HTML） |
| 2026-07 | Google ログイン後も無反応・無言 | ローカル `AuthSessionPlugin` 未登録 + OAuth 失敗が HTML 401 | `MainBridgeViewController` で明示登録、失敗も `xanki://?error=` |
| 2026-07 | Google アカウント選択後に画面遷移なし | `127.0.0.1` / LAN IP で OAuth を開始し、Google callback は `APP_URL` (`localhost`) に戻るため state cookie host が不一致 | OAuth 開始前に `APP_URL` origin へ canonical redirect |
| 2026-07 | Cloud 再起動後も iOS 側の挙動が変わらない | simulator app が古い `dist` / native 登録を保持 | `cap:ios` に build + sync を含める |
| 2026-07 | ログイン後 `/api/me` 接続失敗 | `capacitor://localhost` の CORS preflight に `Access-Control-Allow-Origin` が無い。Vite dev では Worker 前段で `OPTIONS` が返る | iOS dev origin を `http://localhost` に変更し、API CORS middleware も明示実装 |
| 2026-07 | ログイン後 `Load failed` | `pnpm dev:cloud` が `[::1]:8787` のみ listen、`127.0.0.1` への cross-origin fetch、`http://localhost:8787` への fetch が Capacitor localhost 資産ホスト / Cloudflare Vite dev preflight に衝突 | dev server を `--host 0.0.0.0`。iOS Cloud REST / blob は `NativeHttpPlugin`（URLSession）経由に変更し、WebView fetch 依存を除去 |
