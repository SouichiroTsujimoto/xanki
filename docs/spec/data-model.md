# データモデル

## SQLite

WAL モード。App Data 配下 `xanki.db`。

### decks

| 列 | 型 | 説明 |
|----|-----|------|
| id | TEXT PK | UUID v7 |
| name | TEXT | デッキ名 |
| created_at / updated_at | INTEGER | unix ms |
| deleted_at | INTEGER | 論理削除 |

### cards

| 列 | 型 | 説明 |
|----|-----|------|
| id | TEXT PK | UUID v7 |
| deck_id | TEXT FK | |
| kind | TEXT | `text` \| `image` |
| content | TEXT | kind=text の原文 |
| image_path | TEXT | kind=image、App Data からの相対パス（**クロップ後**） |
| ocr_text | TEXT | 検索用 OCR 全文 |
| ocr_data | TEXT | OCR JSON（words + bbox） |
| masks | TEXT | マスク JSON（必須） |
| note | TEXT | 任意メモ |
| source_hint | TEXT | 取込元ヒント |
| starred | INTEGER | 0/1（migration 002） |
| created_at / updated_at / deleted_at | | |

### review_state

| 列 | 型 | 説明 |
|----|-----|------|
| card_id | TEXT PK | |
| box | INTEGER | Leitner 箱 1..5 |
| due_at | INTEGER | 次回復習 unix ms |
| last_result | INTEGER | 0=不可 / 1=可 |

### review_logs

復習履歴（`id`, `card_id`, `result`, `reviewed_at`）。

## masks JSON

### テキスト

```json
[{ "type": "range", "start": 12, "end": 18 }]
```

### 画像（クロップ後画像基準）

```json
[
  { "type": "rect", "x": 120, "y": 88, "w": 210, "h": 32 },
  { "type": "ocr", "wordIds": [4, 5, 6] }
]
```

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

- パス例: `images/{uuid}.png`
- 解決: `resolve_image_url` → 絶対パス → フロント `convertFileSrc`

## 受け入れ条件

- [ ] 新規カード作成時に `review_state`（box=1）が必ず作成される
- [ ] 削除したカード/デッキが一覧・due 件数に出ない
- [ ] 画像カードの `image_path` と `masks` が同一座標系（クロップ後）である
