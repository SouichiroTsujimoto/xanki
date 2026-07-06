# 画像マスク

## 概要

スクショ取込後、**範囲 (crop) → マスク → 保存** の 2 段階フロー。

- **範囲ごとに 1 カード**（複数範囲 = 複数カード）
- 保存時に範囲で **物理クロップ** し、クロップ済み PNG + **クロップ相対座標** のマスクを DB に保存

## エディタフロー（新規）

1. **1 · 範囲** — キャプチャ全体上でドラッグ → カード領域（crop 矩形）
2. **2 · マスク** — crop 内で矩形マスクを複数配置
3. **文字 (OCR)** — 任意。Swift サイドカーで単語 bbox を取得し、クリックで OCR マスク

### 再編集（既存カード）

- 表示画像 = **保存済みクロップ PNG**（`card.image_path`）
- マスク = DB の crop 相対座標をそのまま使用
- crop 矩形は `(0, 0, imageWidth, imageHeight)` として扱う

## 座標系（重要）

### エディタ内（保存前）

- 基準: **元キャプチャ PNG** の natural ピクセル（左上原点）
- マウス座標: `img.getBoundingClientRect()` と `naturalWidth/Height` から変換（`pointerToImageCoords`）
- オーバーレイ: `maskOverlayStyle` — 表示サイズと natural の比率で px 配置（`ResizeObserver` 追従）

### 保存時（Rust）

`save_image_cards`  per region:

1. `adjust_region_for_crop` — マスク/OCR を crop 原点基準に変換（座標は `round()`）
2. `crop_image` — 物理クロップ（`round()` した x,y,w,h）
3. DB へ: **クロップ後 `image_path`** + **調整済み `masks`**

```text
保存前マスク (x, y)  on 元画像
保存後マスク (x - cropX, y - cropY)  on クロップ PNG
```

### 表示時（ライブラリ・学習・再編集）

- 基準: **クロップ PNG** の natural ピクセル
- 実装: `ImageWithMaskOverlays` + `useImageOverlayLayout`

## マスク JSON

```json
[
  { "type": "rect", "x": 55.8, "y": 65.8, "w": 475.4, "h": 118.1 },
  { "type": "ocr", "wordIds": [0, 1, 2] }
]
```

- `rect`: クロップ画像内のピクセル矩形（float 可）
- `ocr`: `ocr_data.words[id]` の bbox を参照

## OCR データ

- `cards.ocr_text` — 検索用全文
- `cards.ocr_data` — JSON（words 配列 + fullText）
- crop 保存時: crop 内の word のみ残し、**id を 0 から再採番**（`wordIds` と整合）

## UI

- マスク色: Chartreuse 塗り + 黒枠（`--accent` / `--accent-outline`）
- ズーム: 50%〜300%
- crop 外は半透明ディム
- 矩形マスククリックで削除

## キーボード（新規）

| キー | 動作 |
|------|------|
| Enter | 保存 |
| Esc | キャンセル |

## 受け入れ条件

- [ ] 範囲指定 → マスク → 保存後、ライブラリでマスク位置がエディタと一致する
- [ ] 再編集を開いてもマスク位置が一致する
- [ ] 複数範囲で複数カードが生成される
- [ ] OCR マスク保存後、検索・復習で bbox がずれない
