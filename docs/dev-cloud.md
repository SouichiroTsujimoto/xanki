# クラウド層 — ローカル総合動作確認

## 最短手順

```bash
# 1. 初回セットアップ（依存関係・D1・Web SPA ビルド）
pnpm setup:cloud

# 2. API + Web UI を起動（http://localhost:8787）
pnpm dev:cloud

# 3. 別ターミナル — API 自動テスト（OTP メール不要、better-auth testUtils）
pnpm smoke:cloud
```

デスクトップも同時に試す場合:

```bash
pnpm dev:cloud:all
```

## D1 スキーマ変更後のリセット

破壊的 migration（`0001_cloud_data.sql` squash 等）後はローカル D1 をリセットする:

```bash
rm -rf web/.wrangler/state
pnpm setup:cloud
```

## コマンド一覧

| コマンド | 内容 |
|---------|------|
| `pnpm setup:cloud` | install + shared build + D1 migrate + Web SPA build |
| `pnpm dev:cloud` | wrangler dev（8787） |
| `pnpm dev:cloud:all` | wrangler + Tauri デスクトップ |
| `pnpm dev:cloud:desktop` | デスクトップのみ（API は別途起動） |
| `pnpm test:auth` | better-auth OTP フロー（Vitest + testUtils） |
| `pnpm smoke:cloud` | 認証→CRUD→storage→AI の Vitest 統合テスト |

## ログイン（開発）

1. Web / Desktop: メール OTP でログイン（**ログイン必須**）
2. **wrangler ターミナルの `[dev OTP] email: code` を 6 桁入力**（`RESEND_API_KEY` 未設定時）
3. Desktop: Bearer は Keychain に保存

## SSE 確認

1. Web または Desktop でログイン
2. 別端末 / 別タブで同アカウントにログイン
3. 片方でカード作成 → もう片方が数秒以内に refetch される（`GET /api/events`）

## 手動チェックリスト

- [ ] Web でテキストカード作成 → Desktop に SSE 経由で表示
- [ ] Desktop で画像カード → Web で一覧表示
- [ ] 未 Pro で AI → 402
- [ ] `POST /api/dev/promote-pro`（Bearer）後 AI 成功

## トラブルシュート

| 症状 | 対処 |
|------|------|
| `pnpm install` が esbuild で失敗 | ルート `.npmrc` で onlyBuiltDependencies 済み。再実行 |
| Web が真っ白 | `pnpm --filter @xanki/web build:client` |
| D1 `SQLITE_BUSY` / wrangler 落ち | 8787 の wrangler をすべて停止し `pnpm dev:cloud` を 1 本だけ起動 |
| auth / data スキーマ不整合 | `rm -rf web/.wrangler/state` → `pnpm setup:cloud` |
| デスクトップが API に届かない | `xanki/.env.development` の `VITE_CLOUD_URL=http://localhost:8787` |

## 本番向け secrets

`web/.dev.vars.example` を `.dev.vars` にコピーして `BETTER_AUTH_SECRET` / Resend / Stripe / AI Gateway を設定。
