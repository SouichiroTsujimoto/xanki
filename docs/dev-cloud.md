# クラウド層 — ローカル総合動作確認

## 最短手順

```bash
# 1. 初回セットアップ（依存関係・D1・Web SPA ビルド）
pnpm setup:cloud

# 2. Google OAuth 設定（初回のみ）
#    web/.dev.vars.example を .dev.vars にコピーし GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET を設定
#    Google Cloud Console で redirect URI:
#      http://localhost:8787/api/auth/callback/google

# 3. API + Web UI を起動（http://localhost:8787）
pnpm dev:cloud

# 4. 別ターミナル — API 自動テスト（Google OAuth 不要）
pnpm smoke:cloud
```

デスクトップも同時に試す場合:

```bash
pnpm dev:cloud:all
```

## D1 スキーマ変更後のリセット

破壊的 migration（`0001_cloud_data.sql` squash、`0003_cards_deck_fk.sql` の table rebuild、`0004_entitlements_stripe.sql` 等）後はローカル D1 をリセットする:

```bash
rm -rf web/.wrangler/state
pnpm setup:cloud
```

## コマンド一覧

| コマンド | 内容 |
|---------|------|
| `pnpm setup:cloud` | install + shared build + D1 migrate + Web SPA build |
| `pnpm dev:cloud` | setup 込みで wrangler dev（8787） |
| `pnpm dev:cloud -- --skip-setup` | setup を省略して wrangler のみ再起動 |
| `pnpm dev:cloud:all` | wrangler + Tauri デスクトップ |
| `pnpm dev:desktop` | デスクトップのみ（API は別途起動） |
| `pnpm test:auth` | テスト用セッション + `/api/me`（Vitest） |
| `pnpm smoke:cloud` | 認証→CRUD→storage→AI の Vitest 統合テスト |

## ログイン（開発）

1. **Google Cloud Console** で OAuth クライアントを作成し、`web/.dev.vars` に ID/Secret を設定
2. Web: **Google で続ける** → Cookie セッション
3. Desktop: **Google で続ける** → loopback 待受 → システムブラウザ → Google → `127.0.0.1` コールバック → Keychain

## SSE 確認

1. Web または Desktop でログイン
2. 別端末 / 別タブで同アカウントにログイン
3. 片方でカード作成 → もう片方が数秒以内に refetch される（`GET /api/events`）

## 手動チェックリスト

- [ ] Web で Google ログイン → テキストカード作成
- [ ] Desktop で Google ログイン → 画像カード → Web で一覧表示
- [ ] 未 Pro で AI → 402（本番相当。dev localhost ではバイパス）
- [ ] `POST /api/dev/promote-pro`（Bearer）後 AI 成功（Gateway 設定時）
- [ ] カード追加 → **AI で生成** → Q&A 保存
- [ ] デッキ学習 / Leitner → **AI に聞く** → SSE 応答

## AI Gateway（dev）

`web/.dev.vars` に以下を設定すると実 LLM が動作する:

```bash
CF_ACCOUNT_ID=<Cloudflare アカウント ID>
AI_GATEWAY_ID=default
AI_GATEWAY_TOKEN=<Settings → Create authentication token で発行>
AI_MODEL=google-ai-studio/gemini-2.5-flash
```

### セットアップ手順（Cloudflare 公式フロー）

1. **Build → AI → AI Gateway** で Gateway（例: `default`）を作成
2. Gateway **Settings** で **Authenticated Gateway** を有効化し、**Create authentication token** でトークン発行 → `AI_GATEWAY_TOKEN`
3. **Credits Available → Manage → Top-up credits** で AI Gateway クレジットをチャージ（支払い方法登録だけでは不足）
4. `pnpm dev:cloud` を再起動（`.dev.vars` 変更時は必須）

### モデルと課金方式

| `AI_MODEL` | 課金 | 追加要件 |
|------------|------|----------|
| `google-ai-studio/gemini-2.5-flash` | **Unified Billing**（推奨・既定） | クレジットチャージ + `cf-aig-authorization` トークン |
| `openai/gpt-4.1-mini` 等 | Unified Billing | 同上 |
| `workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast` | **Workers AI 課金** | トークンのみ（AI Gateway クレジット不要） |
| `deepseek/deepseek-chat` | **Unified Billing 非対応** | Gateway に DeepSeek API キーを **BYOK** 登録が必要 |

**DeepSeek に戻さない理由:** クレジットチャージ後も `deepseek/deepseek-chat` は `Authentication Fails (governor)` のまま。Unified Billing の対象は OpenAI / Anthropic / Google AI Studio / Google Vertex AI / xAI / Groq のみ（[公式ドキュメント](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)）。DeepSeek を使う場合は [プロバイダドキュメント](https://developers.cloudflare.com/ai-gateway/usage/providers/deepseek/) のとおり BYOK が必要。

未設定時は API が 503 `ai_unavailable` を返す。

## dev ユーザー削除

OTP 移行などで不要になったローカルアカウントを消す:

```bash
curl -s -X POST http://localhost:8787/api/dev/purge-user \
  -H 'Content-Type: application/json' \
  -d '{"email":"hoge@example.com"}'
```

`localhost` 以外では 404。D1 の decks / cards / review_* / blobs / entitlements / better-auth 行をまとめて削除する。

## トラブルシュート

| 症状 | 対処 |
|------|------|
| `redirect_uri_mismatch` | Google Console の redirect URI と `APP_URL` を一致させる |
| `pnpm install` が esbuild で失敗 | ルート `.npmrc` で onlyBuiltDependencies 済み。再実行 |
| Web が真っ白 | `pnpm --filter @xanki/web build:client` |
| Web UI が Desktop と違う（古い UI） | `@xanki/ui` 変更後に `pnpm --filter @xanki/web build:client` を再実行し wrangler を再起動 |
| D1 `SQLITE_BUSY` / wrangler 落ち | 8787 の wrangler をすべて停止し `pnpm dev:cloud` を 1 本だけ起動 |
| AI `Authentication Fails (governor)` | DeepSeek 等は Unified Billing 非対応。BYOK 登録するか `AI_MODEL` を対応モデルに変更 |
| AI `ai_auth_failed` | Gateway Settings → **Create authentication token** で再発行 |
| AI が動かない（OpenAI/Google） | **Top-up credits** でクレジット残高を確認（支払い方法だけでは不足） |
| auth / data スキーマ不整合 | `rm -rf web/.wrangler/state` → `pnpm setup:cloud` |
| デスクトップが API に届かない | `xanki/.env.development` の `VITE_CLOUD_URL=http://localhost:8787` |
| Desktop ログイン後アプリに戻らない | `xanki://` 深リンクが macOS に登録されているか確認（アプリ再起動） |

## 本番向け secrets

`web/.dev.vars.example` を `.dev.vars` にコピーして `BETTER_AUTH_SECRET` / `GOOGLE_CLIENT_*` / Stripe / AI Gateway（`CF_ACCOUNT_ID`, `AI_GATEWAY_TOKEN` 等）を設定。
