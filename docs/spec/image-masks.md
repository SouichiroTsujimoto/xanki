# 画像マスク

## 概要

⌥⌘S で OS が範囲選択したスクショに、**直接マスクして 1 枚のカードとして保存**する。

- **1 スクショ = 1 カード**
- 範囲選択は **OS の `screencapture` のみ**（エディタ内 crop なし）
- 保存時はキャプチャ PNG をそのまま使用（full-image 時は再 crop しない）

## エディタフロー（新規）

1. ⌥⌘S → OS 範囲選択 → キャプチャ PNG 保存
2. 画像マスクエディタ起動 → **即マスクモード**
3. 矩形マスクを複数配置（任意）
4. ~~**文字 (OCR)** — 任意。単語 bbox をクリックで OCR マスク~~ **（当面 UI 非表示）**
5. Enter で保存 → 1 カード

### 再編集（既存カード）

- 表示画像 = `card.image_path`（旧 crop 済み PNG もそのまま表示）
- マスク = DB の座標をそのまま使用
- 挙動変更なし

## 座標系

### 新規カード

- 基準: **キャプチャ PNG** の natural ピクセル（左上原点）
- マウス: `pointerToImageCoords`（`img.getBoundingClientRect()` 基準）
- オーバーレイ: `maskOverlayStyle` + `ResizeObserver`

### 保存時（Rust）

`save_image_cards` per region:

1. `adjust_region_for_crop` — full-image region では座標不変（no-op）
2. full-image の場合 `crop_image` **スキップ**、元 `image_path` を DB に保存
3. 部分 crop region（旧データ互換・将来用）のみ物理 crop

### 表示時

- 基準: 保存 PNG の natural ピクセル
- 実装: `ImageWithMaskOverlays` + `useImageOverlayLayout`
- プレビュー等で `object-fit: cover` / `contain` を使う場合も、`computeImageOverlayLayout` が object-position 込みで表示領域を算出する

## マスク JSON

```json
[
  { "type": "rect", "x": 55.8, "y": 65.8, "w": 475.4, "h": 118.1, "color": "yellow" },
  { "type": "ocr", "wordIds": [0, 1, 2], "color": "pink" }
]
```

- `rect`: 画像内ピクセル矩形（float 可）。`color` は任意（省略時 `chartreuse`）
- `ocr`: `ocr_data.words[id]` の bbox を参照。`color` は OCR マスク全体に適用

## マスクカラー

| ID | 用途 |
|----|------|
| `chartreuse` | デフォルト |
| `yellow` / `pink` / `cyan` / `orange` | ユーザー選択 |

- エディタでカラーを選んでから矩形を描く → **その矩形に色が保存**される
- マスクごとに色を変えられる
- ライブラリ・復習でも保存色を表示（`--mask-fill` / `--mask-border`）

## OCR データ

> **当面の UI**: エディタの OCR モードは `IMAGE_EDITOR_OCR_ENABLED = false` で非表示。Rust サイドカー・DB 列・既存カードの OCR マスク表示（復習）は維持。再有効化は `packages/ui/src/lib/imageEditorFeatures.ts` を `true` に変更。

- `cards.ocr_text` — 検索用全文
- `cards.ocr_data` — JSON（words 配列 + fullText）
- 新規保存: キャプチャ全体に対する OCR（crop フィルタなし）

## UI

### ヘッダー（二段）

1. **上段**: タイトル · Deck · メモ（横並び）
2. **下段**: ズーム（− 100% +）· **カラー** · ~~**マスク / 文字**~~ **（OCR 非表示時はカラーのみ）**

### その他

- ズーム: 50%〜300%
- 矩形マスククリックで削除
- 範囲ステップ（エディタ内 crop）は **なし**

## キーボード

| キー | 動作 |
|------|------|
| Enter | 保存 |
| Esc | キャンセル |

## 受け入れ条件

- [ ] ⌥⌘S → エディタ起動直後からマスク矩形を置ける
- [ ] マスク → 保存後、ライブラリ/再編集で位置・色が一致
- [ ] ~~OCR マスクが動作する~~ OCR UI 再有効化時に再確認
- [ ] 旧 crop 済みカードの再編集に問題ない
