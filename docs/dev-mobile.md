# Mobile（iOS）— レイアウト・実装メモ

Capacitor + `@xanki/ui` の iPhone / iPad クライアント。仕様の正本は [ui.md](./spec/ui.md)、[cloud.md](./spec/cloud.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| Capacitor アプリ | `mobile/src/` |
| iOS ネイティブ | `mobile/ios/` |
| Safe Area / タッチ CSS | `mobile/src/index.css` |
| 認証（Bearer + deep link） | `mobile/src/lib/cloud/auth.ts`, `session.ts` |
| プラットフォーム機能フラグ | `packages/ui/src/context/platform-capabilities-context.tsx` |

## DOM / レイアウト構造

Web / Desktop と同一の `AppShell` + `responsive.css`（900px ドロワー）。`body.platform-mobile` でモバイル専用 CSS を上書き。

## 不変条件

1. **Safe Area** — `viewport-fit=cover` + `.platform-mobile .app-frame` の `env(safe-area-inset-*)` を維持する
2. **タッチターゲット** — `@media (pointer: coarse)` で主要ボタン最小 44px
3. **未対応機能は UI 非表示** — `PlatformCapabilities` で import/export・カード編集を隠す（throw 防止）
4. **CORS** — API は `credentials: "omit"` + Bearer（Tauri と同型）

## 症状 → 原因

| 症状 | 原因 | 対応 |
|------|------|------|
| ノッチとヘッダーが重なる | Safe Area 未適用 | `index.css` の `.platform-mobile .app-frame` を確認 |
| ログイン後アプリに戻らない | URL scheme 未登録 | `Info.plist` の `CFBundleURLSchemes` = `xanki` |
| API 接続失敗（dev） | シミュレータから localhost 不可 | `VITE_CLOUD_URL` を Mac の IP または `127.0.0.1:8787`（シミュレータは localhost 可） |
| 画像カードが表示されない | blob URL に Bearer を付けられない | `resolveAuthenticatedBlobUrl` で fetch → object URL |
| OAuth 後ログイン画面のまま | コールドスタートで launch URL を未処理 | `App.getLaunchUrl()` を登録時に処理 |
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
