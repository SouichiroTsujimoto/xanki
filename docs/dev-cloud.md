# クラウド層 — ローカル総合動作確認

## 最短手順

```bash
# 1. 初回セットアップ（依存関係・D1 migrate）
pnpm setup:cloud

# 2. 1Password CLI（初回のみ — worktree でも web/.dev.vars.op がそのまま使える）
brew install 1password-cli   # 未導入なら
op signin
#    1Password に dev secrets アイテム（例: xanki-dev）を作成
#    web/.dev.vars.op の op:// 参照を実 vault に合わせて編集
#    Google Cloud Console redirect URI: http://localhost:8787/api/auth/callback/google
pnpm check:secrets             # 参照解決の確認

# 3. API + Web UI を起動（http://localhost:8787、Vite HMR + workerd）
pnpm dev:cloud

# 4. 別ターミナル — API 自動テスト（Google OAuth 不要）
pnpm smoke:cloud
```

**worktree:** `web/.dev.vars` の手コピーは不要。`web/.dev.vars.op`（git 管理）+ `op signin` だけで `pnpm dev:cloud` が動く。

**1Password なし（fallback）:** `cp web/.dev.vars.example web/.dev.vars` して平文を記入。

デスクトップも同時に試す場合:

```bash
pnpm dev:cloud:all
```

## 開発サーバー（HMR）

`pnpm dev:cloud` は [`web/vite.config.ts`](../web/vite.config.ts) の `cloudflare({ configPath, persistState })` 経由で Worker 設定と D1 永続化パスを読み込む。

- **configPath 必須**: `root: src/client` だけでは wrangler が見つからない
- **persistState 必須**: 省略すると state が `web/src/client/.wrangler` になり、`pnpm setup:cloud` の migrate（`web/.wrangler`）と別 DB になる → `no such table: session`

- **SPA**: Vite HMR（`@xanki/ui` 含む monorepo ソースを直接読む）
- **API**: workerd 上で Hono Worker（D1 / R2 / DO bindings 利用可）
- **オリジン**: `http://localhost:8787` 単一（OAuth / Cookie / Desktop `VITE_CLOUD_URL` と一致）

Tauri（`pnpm dev:desktop`）と同様、UI 変更は保存後すぐ反映される。手動 `build:client` は **本番ビルド・preview・deploy 時** のみ必要。

```bash
pnpm --filter @xanki/web build    # または build:web
pnpm --filter @xanki/web preview  # ビルド成果物を workerd で確認
pnpm --filter @xanki/web deploy   # vite build && wrangler deploy
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
| `pnpm setup:cloud` | install + shared build + D1 migrate |
| `pnpm check:secrets` | 1Password 参照解決の診断 |
| `pnpm dev:cloud` | setup 込みで vite dev（8787、HMR） |
| `pnpm dev:cloud -- --skip-setup` | setup を省略して vite dev のみ再起動 |
| `pnpm dev:cloud:all` | vite dev + Tauri デスクトップ |
| `pnpm dev:desktop` | デスクトップのみ（API は別途起動） |
| `pnpm test:auth` | テスト用セッション + `/api/me`（Vitest） |
| `pnpm smoke:cloud` | 認証→CRUD→storage→AI の Vitest 統合テスト |

## ログイン（開発）

1. **Google Cloud Console** で OAuth クライアントを作成し、dev secrets を 1Password + [`web/.dev.vars.op`](../web/.dev.vars.op) に設定（fallback: `web/.dev.vars`）
2. Web: **Google で続ける** → Cookie セッション
3. Desktop: **Google で続ける** → loopback 待受 → システムブラウザ → Google → `localhost` コールバック（302） → Keychain

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
- [ ] デッキ学習 / スマート学習 → **AI に聞く** → SSE 応答

## AI Gateway（dev）

[`web/.dev.vars.op`](../web/.dev.vars.op)（1Password 経由）または fallback の `web/.dev.vars` に以下を設定すると実 LLM が動作する:

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
4. `pnpm dev:cloud` を再起動（secrets 変更時は必須）

## Dev secrets（1Password）

| ファイル | 役割 |
|---------|------|
| [`web/.dev.vars.op`](../web/.dev.vars.op) | **正本** — `op://` 参照のみ（git 管理・worktree 共通） |
| `web/.dev.vars` | fallback — 平文（`.gitignore`、手コピー不要にするため非推奨） |
| [`scripts/with-dev-secrets.sh`](../scripts/with-dev-secrets.sh) | `pnpm dev:cloud` が vite 起動時に `op run` する |

### 初回セットアップ

1. `brew install 1password-cli && op signin`
2. 1Password に Login または Secure Note アイテム（例: `xanki-dev`）を作成し、各フィールドに dev secret を保存
3. 1Password UI で各フィールドの **Copy Secret Reference** → [`web/.dev.vars.op`](../web/.dev.vars.op) の `op://` を更新
4. `pnpm check:secrets` で解決確認
5. `pnpm dev:cloud`

既存の `web/.dev.vars` から移行する場合: 1Password に値を登録したうえで `.dev.vars.op` に参照を書く。移行後は `.dev.vars` を削除してよい。

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
| Web が真っ白 | `pnpm dev:cloud` を再起動。port 8787 が他プロセスに占有されていないか確認 |
| UI が更新されない | HMR 接続を確認（DevTools Console）。解決しない場合 `pnpm dev:cloud -- --skip-setup` で再起動 |
| D1 `no such table: session` / auth 500 | `vite.config.ts` の `persistState` が `web/.wrangler/state` を指しているか確認。古い `web/src/client/.wrangler` があれば削除 → `pnpm setup:cloud` |
| D1 `SQLITE_BUSY` / dev サーバー落ち | 8787 の vite dev をすべて停止し `pnpm dev:cloud` を 1 本だけ起動 |
| AI `Authentication Fails (governor)` | DeepSeek 等は Unified Billing 非対応。BYOK 登録するか `AI_MODEL` を対応モデルに変更 |
| AI `ai_auth_failed` | Gateway Settings → **Create authentication token** で再発行 |
| AI が動かない（OpenAI/Google） | **Top-up credits** でクレジット残高を確認（支払い方法だけでは不足） |
| auth / data スキーマ不整合 | `rm -rf web/.wrangler/state` → `pnpm setup:cloud` |
| デスクトップが API に届かない | `xanki/.env.development` の `VITE_CLOUD_URL=http://localhost:8787` |
| Desktop ログイン後アプリに戻らない | `pnpm dev:cloud` が起動しているか。ブラウザが `chrome-error` なら loopback 302 失敗（`dev:cloud` 再起動）。`xanki://` 深リンクが macOS に登録されているか確認（アプリ再起動） |
| Desktop: ブラウザは「ログインしました」なのにアプリがログイン画面のまま | dev では WebView(`1420`)→ API(`8787`) が別オリジン。Desktop は Cookie 不要（Bearer）のため `credentials: omit` 必須。`dev:cloud` 停止中に `/api/me` が落ちても Keychain を消さないよう `syncFromSession` はネットワーク失敗で logout しない |
| `pnpm dev:cloud` が secrets エラーで即終了 | `op signin` → `pnpm check:secrets`。`web/.dev.vars.op` の `op://` が 1Password の vault/item/field と一致するか確認 |
| `op: command not found` | `brew install 1password-cli`。または fallback: `cp web/.dev.vars.example web/.dev.vars` |

## Secrets 管理（dev / prod）

**dev:** [`web/.dev.vars.op`](../web/.dev.vars.op) + 1Password CLI（[`scripts/with-dev-secrets.sh`](../scripts/with-dev-secrets.sh)）。平文の `web/.dev.vars` は fallback のみ。

**prod:** `wrangler secret put BETTER_AUTH_SECRET` / `GOOGLE_CLIENT_*` / Stripe / AI Gateway 等。
