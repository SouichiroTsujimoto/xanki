# クラウド (認証・データ・Web UI・課金・AI)

> 配置想定: `docs/spec/cloud.md`。README の索引に追記すること。
> 本フェーズの正本。デスクトップ側の既存仕様は各 spec を正とし、本書はサーバー・Web・Desktop 共通 API の**データ契約**を定義する。

- **状態**: 実装中
- **前提**: MVP(ローカル完結)は実装済み。本書は D1 SSoT + REST + SSE モデルを定義する

---

## 1. スコープ

### 目標

| ID | 機能 | 概要 |
|----|------|------|
| C1 | 認証 | better-auth によるアカウント(メール OTP)。デスクトップ/Web 共通。**ログイン必須** |
| C2 | カードデータ | D1 正規化テーブルが SSoT。Web / Desktop とも REST で読み書き。画像は R2 ブロブ |
| C3 | Web UI | 学習(全モード)+ ライブラリ + 手動カード作成(テキスト入力/画像アップロード→マスク) |
| C4 | 課金 | プラン管理・entitlement。決済プロバイダ webhook → D1 |
| C5 | AI | Q&A 自動生成・AI 質問。**必ずサーバー経由**(API キー非配布) |

### 非目標(本フェーズ外)

モバイルアプリ、カード共有・公開デッキ、リアルタイム共同編集、E2E 暗号化、Web / Desktop のオフライン CRUD、未ログイン利用、ショートカット取込の Web 版、通知、Windows。

### 設計原則

1. **D1 が SSoT** — decks / cards / review_state / review_logs は D1 正規化テーブル。クライアントは REST で読み書き
2. **Web / Desktop 同一 API** — Desktop 専用 push/pull 同期は廃止。両方 `@xanki/shared` の Cloud API クライアントを使用
3. **変更通知は SSE** — mutation 時に `user_revisions.rev` を increment → Durable Object `UserSyncHub` が fan-out → 各クライアント refetch
4. **信頼設計** — 画像は非公開バケット+短寿命署名 URL のみ。AI へ送るデータは明示操作時のみ

### 将来(後続フェーズ)

- 未ログインでの Desktop ローカル完結
- オフライン CRUD + 復帰時マージ
- `pending_uploads` 永続キュー

---

## 2. モノレポ構成

```
/                     # リポジトリルート (pnpm workspace)
  xanki/              # Tauri デスクトップ (capture/OCR/画像 I/O + Cloud REST)
  web/                # Cloudflare Workers 1 プロジェクト
    src/server/       #   Hono API (認証・REST・SSE・ブロブ・課金・AI)
    src/client/       #   React SPA (Vite)。Static Assets として同 Worker から配信
  shared/             # @xanki/shared
                      #   マスク JSON 型 / API 型 / Zod / Cloud API クライアント
  docs/spec/          # SSoT
```

- `shared` は **xanki(TS 側)・web の双方から参照**する
- SPA と API は同一オリジン(`app.<domain>/api/*` を Hono にルーティング)。CORS 不要
- マーケティング/SEO サイトは別プロジェクト(本書のスコープ外)

## 3. 技術スタック(クラウド層)

| レイヤ | 選定 | 備考 |
|--------|------|------|
| API | Hono on Cloudflare Workers | Workers Paid ($5/月) |
| 認証 | better-auth (D1 + Drizzle) | メール OTP を主経路。メール送信は Resend |
| DB | D1 | 正規化 decks/cards/review + blobs + entitlements |
| リアルタイム | Durable Objects + SSE | `UserSyncHub` |
| ブロブ | R2 (非公開バケット) | エグレス無料。S3 互換署名 URL |
| AI | AI Gateway → 外部 LLM API | プロバイダはサーバー設定で差し替え可能に |
| 決済 | Stripe または MoR(未決 §12) | webhook → entitlements |
| ORM | Drizzle | D1 用。スキーマは `web/src/server/db/` |
| 定期実行 | Cron Triggers | ブロブ GC(§5.5) |

## 4. 認証 (C1)

- **better-auth** + **emailOTP** プラグイン。D1 + Drizzle adapter
- **主経路: メール OTP**(メールアドレス入力 → 6 桁コード → セッション)
- better-auth 標準 API（`/api/auth/*`）:
  - `POST /api/auth/email-otp/send-verification-otp` — body: `{ email, type: "sign-in" }`
  - `POST /api/auth/sign-in/email-otp` — body: `{ email, otp }`
- xanki 固有（better-auth 外）:
  - `GET /api/me` — ログインユーザー + entitlement
  - `POST /api/dev/promote-pro` — ローカル dev のみ（Stripe なし Pro 試用）
- Web: Cookie セッション(better-auth 標準)
- デスクトップ: OTP 完了後 `POST /api/auth/sign-in/email-otp` の JSON `{ token }`（ヘッダ `set-auth-token` は同一オリジン Web 用フォールバック）→ **macOS Keychain**（Rust `keyring` + `apple-native` feature、`com.souic.xanki.cloud` / `session`）→ `Authorization: Bearer`
- ローカル dev: `RESEND_API_KEY` 未設定時は wrangler ログ `[dev OTP]`。自動テストは better-auth **testUtils** (`captureOTP`)
- **ログイン必須** — Web / Desktop とも未認証ではアプリ本体に入れない（後続で未ログイン緩和可）
- ソーシャルログインは後追い可(better-auth プラグイン追加のみ)

## 5. データ API (C2)

### 5.1 対象テーブル

| テーブル | 方式 |
|---------|------|
| decks / cards / review_state | REST CRUD。論理削除(`deleted_at`) |
| review_logs | 復習 submit 時に追記(id 冪等) |

- サーバーが authoritative。競合マージ(LWW)は不要（単一 SSoT）
- 新規 card 作成時に `review_state`(box=1) を同一 TX で insert

### 5.2 REST API（Web / Desktop 共通）

```
GET    /api/decks
POST   /api/decks                    { name }
PATCH  /api/decks/:id                { name }
DELETE /api/decks/:id                → 論理削除

GET    /api/cards?deck_id=&q=
GET    /api/cards/:id
POST   /api/cards                    → テキスト/qa/画像(画像は blob 先行)
PATCH  /api/cards/:id
DELETE /api/cards/:id
POST   /api/cards/:id/star           → starred トグル

GET    /api/review-state?deck_id=
POST   /api/review/submit            { cardId, result: 0|1 }

GET    /api/account/storage          { rev, storageUsed, storageLimit, plan, aiCreditsRemaining }
```

- レスポンス型は `@xanki/shared` の `api-types.ts` が正本
- SRS の due 計算はクライアント JS(`shared` の `LeitnerScheduler`)。submit 時にサーバーが `review_state` を更新

### 5.3 画像のコンテンツアドレス化

- D1 `cards.image_hash` — SHA-256 hex。R2 キーは `blobs/{user_id}/{hash}`
- Desktop の `image_path` は **ローカルキャッシュ専用**（D1 に保存しない）
- 新規保存: **WebP**（長辺 3000px 上限）。パス例: `images/{hash}.webp`
- **Web 画像アップロード**もクライアント側で WebP 化 → hash 計算 → blob prepare/commit
- 画像は不変(マスクは JSON、クロップは新ファイル)

### 5.4 ブロブ転送

```
POST /api/blobs/prepare   { hash, size, mime }
  → { status: "exists" }                        // 既に保有
  → { status: "upload", url, expires_at }       // R2 署名 PUT URL (TTL 10min)

POST /api/blobs/commit    { hash }               // R2 HEAD 確認 → 台帳登録
GET  /api/blobs/{hash}                           // 302 → 署名 GET URL (TTL 10min)
```

- **順序保証: blob 先行 commit。** 画像カード作成は commit 完了後
- Web = 表示時遅延取得。Desktop = ローカルキャッシュ優先、なければ GET で取得

### 5.5 ブロブ GC

- D1 `blobs`: `{ user_id, hash, size, mime, created_at, last_referenced_at }`
- 夜間 Cron: 生きている `cards.image_hash` から参照されない blob が **30 日**続いたら R2 削除
- 容量計測: 台帳 `SUM(size)`

### 5.6 SSE（変更通知）

```
GET /api/events
  Accept: text/event-stream
  Authorization: Bearer (Desktop) / Cookie (Web)

event: revision
data: {"rev":42}

```

- mutation 成功後: `user_revisions.rev += 1` → `UserSyncHub` DO に notify
- クライアント: `rev` 変化を受信 → REST refetch（全テーブルまたは差分は将来）
- Desktop は `fetch` + `ReadableStream`（Bearer ヘッダ付き）。Web は `EventSource`（Cookie）
- 再接続: `Last-Event-ID` または `?since=` で gap 検知 → full refetch

## 6. Web UI (C3)

- Web / Desktop とも §5.2 REST を使用
- 学習: 5 モード(フラッシュカード / 学習 SRS / 書く / テスト / マッチ)。`@xanki/ui` 共有
- ライブラリ: 一覧・検索・編集・削除
- カード作成: (a) テキスト手入力 → マスク、(b) 画像アップロード → 矩形マスク(OCR は当面 Desktop のみ。§12)
- **ショートカット取込は Web 非提供**(Desktop の差別化)

## 7. D1 スキーマ(サーバー)

詳細列定義は [data-model.md](./data-model.md) §D1。要点:

```sql
-- better-auth: user / session / account / verification (Drizzle auth-schema)

CREATE TABLE user_revisions (
  user_id TEXT PRIMARY KEY,
  rev INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE decks ( user_id, id, name, created_at, updated_at, deleted_at, PRIMARY KEY (user_id, id) );
CREATE TABLE cards ( user_id, id, deck_id, kind, content, answer, image_hash, ocr_text, ocr_data,
                     masks, note, source_hint, starred, created_at, updated_at, deleted_at,
                     PRIMARY KEY (user_id, id) );
CREATE TABLE review_state ( user_id, card_id, box, due_at, last_result, updated_at,
                            PRIMARY KEY (user_id, card_id) );
CREATE TABLE review_logs ( user_id, id, card_id, result, reviewed_at, PRIMARY KEY (user_id, id) );

CREATE TABLE blobs ( ... );
CREATE TABLE entitlements ( ... );
```

- **廃止**: `sync_rows`, `seq_counters`, JSON blob `review_logs`

## 8. 課金 (C4)

### プラン(初期案。価格は §12)

| | Free | Pro |
|---|------|-----|
| カード・学習 | ○ | ○ |
| 同期ストレージ | 1 GB | 10 GB |
| Web UI | ○ | ○ |
| AI 機能 | なし(402) | 月次 100 クレジット(暫定) |

- webhook → `entitlements` 更新。**ゲート判定はサーバー側**(blob commit 時の容量、AI 呼び出し時のクレジット)
- 容量超過: blob commit / 画像カード作成を 402

## 9. AI (C5)

```
POST /api/ai/qa-generate   { text, count?, kind: 'qa' | 'choice' }   → { items: [...] }
POST /api/ai/ask           { card_context, question }                → SSE ストリーム
```

- 実行前: 認証 → entitlement → レート制限(KV)
- Worker → AI Gateway → LLM。API キーはクライアント非配布
- 送信データは明示操作のみ

## 10. 非機能要件

| 項目 | 目標 |
|------|------|
| REST mutation p95 | 500ms 以内(ブロブ除く) |
| SSE 通知レイテンシ | mutation 後 1 秒以内に fan-out |
| 署名 URL TTL | PUT/GET とも 10 分 |
| R2 バケット | 非公開 |
| 固定インフラ費 | Workers Paid $5/月 + ドメイン |

## 11. 受け入れ条件

- [ ] Web / Desktop 同一アカウントで、片方で作ったカードがもう片方で SSE 経由で表示される
- [ ] Web UI でテキストカード作成 → Desktop に反映
- [ ] Desktop で画像カード → Web で一覧表示
- [ ] 未 Pro で AI → 402
- [ ] R2 URL 直接アクセス → 403
- [ ] 全端末削除 + 30 日 GC → R2 オブジェクト削除
- [ ] バイナリ / SPA に LLM API キーなし

## 12. 未決事項

- 決済: Stripe Checkout + webhook（MoR は後続）
- 価格(Pro 月額)と AI クレジット単位
- Web OCR
- 未ログイン / オフライン CRUD の再導入タイミング
- 正式名称・ドメイン
