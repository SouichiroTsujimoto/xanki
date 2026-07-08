# データモデル

## D1（クラウド SSoT）

Cloudflare D1。全テーブルに `user_id` を持ち `(user_id, id)` 複合 PK。詳細は [cloud.md](./cloud.md) §7。

### user_revisions

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT PK | better-auth user.id |
| rev | INTEGER | SSE 通知用単調増加カウンタ |

### decks

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT | |
| id | TEXT | UUID v7 |
| name | TEXT | デッキ名 |
| scheduler_config | TEXT | スマート学習間隔 JSON v2（省略時デフォルト。v1 `boxIntervalDays` は parse 時マイグレート） |
| created_at / updated_at | INTEGER | unix ms |
| deleted_at | INTEGER | 論理削除 |

### cards

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT | |
| id | TEXT | UUID v7 |
| deck_id | TEXT | **FK**: `(user_id, deck_id)` → `decks(user_id, id)`（migration 0003） |
| kind | TEXT | `text` \| `image` \| `qa` |
| content | TEXT | kind=text/qa の問題文（qa）または原文（text） |
| answer | TEXT | kind=qa の解答 |
| image_hash | TEXT | kind=image、SHA-256 hex（R2 キー用） |
| ocr_text | TEXT | 検索用 OCR 全文 |
| ocr_data | TEXT | OCR JSON（words + bbox） |
| masks | TEXT | マスク JSON（必須） |
| note | TEXT | 任意メモ |
| source_hint | TEXT | 取込元ヒント |
| starred | INTEGER | 0/1 |
| created_at / updated_at / deleted_at | | |

### review_state

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT | |
| card_id | TEXT | |
| box | INTEGER | 復習箱（review では 2..5。learning / relearning では 1） |
| phase | TEXT | `learning` / `review` / `relearning`（migration 0007。既存行は `review`） |
| step | INTEGER | 学習・再学習ステップ（0 始まり。既存行は 0） |
| due_at | INTEGER | 次回復習 unix ms |
| last_result | INTEGER | 直近採点 0..3（もう一度 / 難しい / 正解 / 簡単） |
| updated_at | INTEGER | unix ms |

### review_logs

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT | |
| id | TEXT | UUID |
| card_id | TEXT | |
| result | INTEGER | 0..3（もう一度 / 難しい / 正解 / 簡単） |
| reviewed_at | INTEGER | unix ms |

### study_sessions

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT | |
| id | TEXT | UUID |
| track | TEXT | `deck` \| `leitner` |
| deck_id | TEXT NULL | |
| mode | TEXT NULL | 学習手段 |
| started_at / ended_at | INTEGER | unix ms |
| cards_total | INTEGER | |
| cards_completed | INTEGER | |

### study_events

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT | |
| id | TEXT | UUID |
| session_id | TEXT NULL | |
| event_type | TEXT | `leitner_review` 等 |
| deck_id / card_id | TEXT NULL | |
| grade | INTEGER NULL | Leitner 0–3 |
| occurred_at | INTEGER | unix ms |
| local_date | TEXT | `YYYY-MM-DD` |

### study_daily_stats

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT | |
| local_date | TEXT | PK 一部 |
| leitner_count | INTEGER | |
| deck_study_count | INTEGER | |
| total_count | INTEGER | |
| updated_at | INTEGER | |

詳細: [study-metrics.md](./study-metrics.md)

## ローカル（Desktop のみ）

### 画像キャッシュ

- App Data 配下 `images/{hash}.webp`
- `image_path` は TS 側の表示用。D1 には保存しない
- 表示: ローカルファイルがあれば `convertFileSrc`、なければ `GET /api/blobs/{hash}` で取得してキャッシュ

### 削除済み（SQLite app data）

以下は旧 push/pull 同期モデルの残骸。**Rust 側は削除済み**（`xanki/src-tauri/src/db/`、`scheduler/`、`migrations/001–005`）。

- `xanki.db` の decks / cards / review_state / review_logs
- `sync_meta`（last_seq, device_id）
- `pending_uploads`（オフライン blob 再送キュー — 後続フェーズ）

Rust は capture / OCR / WebP 保存 / エディタウィンドウ / Keychain のみ担当。

## masks JSON

### テキスト

```json
[{ "type": "range", "start": 12, "end": 18 }]
```

### 画像（クロップ後画像基準）

```json
[
  { "type": "rect", "x": 120, "y": 88, "w": 210, "h": 32, "color": "chartreuse" },
  { "type": "ocr", "wordIds": [4, 5, 6], "color": "pink" }
]
```

- `rect` / `ocr` の `color` は任意（`chartreuse` | `yellow` | `pink` | `cyan` | `orange`）。省略時は `chartreuse`

クライアント側の masks JSON パースは `@xanki/shared` の Zod スキーマ（`parseTextMasksJson` / `parseImageMasksJson`）を正とする。不正 JSON は空配列にフォールバックする。

### ocr_data JSON

```json
{
  "fullText": "...",
  "words": [
    { "id": 0, "text": "単語", "x": 10, "y": 20, "w": 40, "h": 12 }
  ]
}
```

crop 後は word 座標もクロップ画像基準。

## scheduler_config JSON（v2）

`decks.scheduler_config` に保存。省略時は [`defaultDeckSchedulerConfig`](../../shared/src/study/scheduler.ts) と同値。

```json
{
  "learningSteps": [{ "amount": 1, "unit": "minute" }, { "amount": 10, "unit": "minute" }],
  "relearningSteps": [{ "amount": 10, "unit": "minute" }],
  "reviewIntervals": [
    { "amount": 1, "unit": "day" },
    { "amount": 3, "unit": "day" },
    { "amount": 7, "unit": "day" },
    { "amount": 21, "unit": "day" }
  ],
  "hardInterval": { "amount": 1, "unit": "day" },
  "graduatingInterval": { "amount": 1, "unit": "day" },
  "easyInterval": { "amount": 4, "unit": "day" }
}
```

- `amount`: 0 = 今すぐ（`due_at = now`）
- `unit`: `minute` | `hour` | `day`
- v1 `{ "boxIntervalDays": [0, 1, 3, 7, 21] }` は `parseDeckSchedulerConfig` で v2 へ自動変換

## 論理削除

`deleted_at IS NULL` が一覧・検索・復習件数・due 取得の共通条件。

## 画像ファイル

- 新規保存: **WebP**（長辺 3000px 上限）
- Desktop: Rust が WebP 保存 → TS が blob upload → REST createCard
- Web: クライアント WebP 化 → blob upload → REST createCard

## 参照整合性

- `cards(user_id, deck_id)` は `decks(user_id, id)` を参照（SQLite FK、migration `0003_cards_deck_fk.sql`）
- `entitlements.stripe_customer_id` / `stripe_subscription_id` — Stripe 紐付け（migration `0004_entitlements_stripe.sql`）
- アプリ層でも作成・更新時に `requireDeckOwnedByUser` で検証

## 受け入れ条件

- [ ] 新規カード作成時に `review_state`（`phase=learning`, `step=0`, `box=1`, `due_at=now`）が必ず作成される
- [ ] 削除したカード/デッキが一覧・due 件数に出ない
- [ ] デッキ削除時、配下カードも論理削除される
- [ ] 画像カードのローカルキャッシュと `masks` が同一座標系（クロップ後）である
