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
| created_at / updated_at | INTEGER | unix ms |
| deleted_at | INTEGER | 論理削除 |

### cards

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT | |
| id | TEXT | UUID v7 |
| deck_id | TEXT | |
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
| box | INTEGER | Leitner 箱 1..5 |
| due_at | INTEGER | 次回復習 unix ms |
| last_result | INTEGER | 0=不可 / 1=可 |
| updated_at | INTEGER | unix ms |

### review_logs

| 列 | 型 | 説明 |
|----|-----|------|
| user_id | TEXT | |
| id | TEXT | UUID |
| card_id | TEXT | |
| result | INTEGER | 0/1 |
| reviewed_at | INTEGER | unix ms |

## ローカル（Desktop のみ）

### 画像キャッシュ

- App Data 配下 `images/{hash}.webp`
- `image_path` は TS 側の表示用。D1 には保存しない
- 表示: ローカルファイルがあれば `convertFileSrc`、なければ `GET /api/blobs/{hash}` で取得してキャッシュ

### 廃止予定（SQLite app data）

以下は旧 push/pull 同期モデルの残骸。**削除済み / 削除予定**:

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

## 論理削除

`deleted_at IS NULL` が一覧・検索・復習件数・due 取得の共通条件。

## 画像ファイル

- 新規保存: **WebP**（長辺 3000px 上限）
- Desktop: Rust が WebP 保存 → TS が blob upload → REST createCard
- Web: クライアント WebP 化 → blob upload → REST createCard

## 受け入れ条件

- [ ] 新規カード作成時に `review_state`（box=1）が必ず作成される
- [ ] 削除したカード/デッキが一覧・due 件数に出ない
- [ ] 画像カードのローカルキャッシュと `masks` が同一座標系（クロップ後）である
