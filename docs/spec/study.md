# 学習 (Study) — 索引

学習は **2 トラック** に分かれる。並列の学習手段として説明し、用途の押し付け（試験前 / 長期記憶など）は spec・UI に書かない。

| トラック | タブ | spec | 機能 |
|---------|------|------|------|
| デッキ学習 | `AppTab.deckStudy` | [deck-study.md](./deck-study.md) | 選択デッキ全件 + セッションキュー（DB 非更新） |
| スマート学習 | `AppTab.leitner` | [leitner-study.md](./leitner-study.md) | 復習予定 + 4 段階評価（`review_state` 更新） |

## 共通

### セッション UI

- サイドバー自動閉じ / 戻るでハブ復帰
- カード本体は進捗・ヒントと操作の間で **画面中央**
- セッション中スクロールバー非表示（長文はカード内スクロール）

### 3D フリップ

- 実装メモ（再発防止・デバッグ）: [dev-study-layout.md](../dev-study-layout.md)（索引: [dev-ui.md](../dev-ui.md)）
- 表示中の面の高さを計測してロック → フリップ完了後に裏面へ再計測（[`use-flip-height`](../../packages/ui/src/hooks/use-flip-height.ts) + [`flip-metrics`](../../packages/ui/src/lib/flip-metrics.ts)）。高さ上限は **ビューポート**（`--study-flip-max-vh` / `--study-flip-max-h`）と **`.study-flip-slot` の残り領域**（`.review-actions` 等を除いた stage 内）の小さい方
- 高さ制約トークン: `--study-flip-min-h`（240px）、`--study-flip-max-h`（520px）、`--study-flip-max-vh`（0.58）
- `.study-flip-slot` は `container: flip-card / inline-size`（コンポーネント幅ベースの sizing）
- `.study-flip-face` は grid stack（`position: absolute` は使わない）。`.study-flip-slot` は `overflow: visible`（影・枠の見切れ防止）
- フリップ中 `overflow: visible`（`.study-flip-inner` に `overflow: hidden` 不可）
- 静止時の非表示面は `visibility: hidden`
- カード枠・影: `.study-flip-slot` padding + フリップ中の祖先 `overflow: visible`
- `prefers-reduced-motion`: 切替のみ

### Q&A / テキスト / 画像カード

- [qa-cards.md](./qa-cards.md), [text-masks.md](./text-masks.md), [image-masks.md](./image-masks.md)
- テキスト / Q&A 本文: カード内に収まるとき **縦中央**（`justify-content: safe center`）。`scrollHeight > clientHeight` のとき **上揃え**（`data-text-scrollable` → `flex-start`）。計測は [`use-review-card-text-overflow`](../../packages/ui/src/hooks/use-review-card-text-overflow.ts) + `ResizeObserver`（詳細: [dev-study-layout.md](../dev-study-layout.md) §問題 2）
- マスク peek（インタラクティブ時）、flip 後 stagger reveal

### AI に聞く（学習中）

- **フラッシュカード**（デッキ学習）と **スマート学習出題**（`LearnMode`）の `.review-actions` に **AI に聞く** ボタン
- 現在カードの文脈（`buildStudyCardContext`）とユーザー質問を `POST /api/ai/ask` に送信
- 回答はオーバーレイ内に SSE ストリーム表示。Tauri では `window.alert` 禁止 → エラーはパネル内

## スマート学習のアルゴリズム定義

UI 名 **「スマート学習」** は暫定。内部識別子 `leitner` / `LeitnerScheduler` は安定キーとして維持する。

実装: [`shared/src/study/scheduler.ts`](../../shared/src/study/scheduler.ts)（`LeitnerScheduler`）

### 古典 Leitner 方式との差分

| 観点 | 古典 Leitner | xanki 実装 |
|------|-------------|-----------|
| 評価 | 正解 / 不正解（2 値） | **4 段階**（再度 / 難しい / 良好 / 簡単） |
| 箱の進み方 | 正解 → 次箱、不正解 → 箱 1 | 段階ごとに box +1 / +2 / 据置 / 箱 1 |
| 間隔 | 箱ごとに一括復習（物理箱） | **カード単位** `due_at` |
| 間隔値 | 指数増（例: 1, 2, 4, 8 日…） | 固定テーブル **0 / 1 / 3 / 7 / 21 日** |

厳密な Leitner 方式ではない。**箱 1–5 + 4 段階評価の簡略 SRS** として記述する。詳細は [leitner-study.md](./leitner-study.md)。

## 旧構成からの移行

| 旧 | 新 |
|----|-----|
| `AppTab.study` | `deckStudy` + `leitner` |
| 学習ハブ 5 モード | デッキ学習 4 手段 + スマート学習ハブ |
| `learn` + 1/2 | スマート学習 + 4 段階 |
| Tray → study | Tray → leitner |
| UI「Leitner学習」 | UI「スマート学習」 |

## 受け入れ条件（横断）

- [ ] サイドバー 4 項目（ホーム / デッキ学習 / スマート学習 / 設定）
- [ ] 両タブでフリップ・peek が一致
- [ ] glossary / copy と UI 表示が一致
