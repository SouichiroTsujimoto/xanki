# スマート学習 (Smart Study)

> 内部参照: `leitner-study` / `AppTab.leitner` / `LeitnerStudyView`

復習予定カード + 4 段階評価の **SRS トラック**。`due_at <= now` のカードのみ。`review_state` を更新する。

- タブ: **スマート学習**（`AppTab.leitner`）
- Tray **今日の復習: N件** → 本タブへ遷移
- 詳細索引: [study.md](./study.md) §スマート学習のアルゴリズム定義

## ハブ

- 今日の復習予定 **総数**（全デッキ横断）
- **ヒーローカード**（件数 + 「復習を始める」）→ 横断復習予定をランダム混合でセッション開始（独立した「出題」ボタンは置かない）
- 下部: 復習予定を含む **デッキ一覧**（件数付き）→ デッキ別セッション
- 復習予定 0: **今日のスマート学習は完了です** — 共有 [`LeitnerDueCompletePanel`](../../packages/ui/src/components/xanki/study/leitner-due-complete-panel.tsx)（Motion 登場 + パーティクル + ホログラム背景）。`prefers-reduced-motion` 時は即時表示
- デッキ別セッション完了で他デッキに復習予定残存: 控えめ完了 UI（残件数 + 「スマート学習に戻る」）

## セッション

- Space / クリック: 答え toggle
- 評価: **4 段階**（キー `1`–`4`）

| result | UI | フェーズ別の挙動（概要） |
|--------|-----|------------------------|
| `0` | もう一度 | **learning**: ステップ 0 へ、学習ステップ[0] まで / **review**: **relearning** へ、再学習ステップ[0] まで / **relearning**: ステップ 0 へ |
| `1` | 難しい | **learning / relearning**: 現ステップ維持、現在〜次ステップの中間（最終ステップは `hardInterval`） / **review**: 箱据置、`hardInterval` |
| `2` | 正解 | **learning**: 次ステップ、最終後 **卒業** → review 箱 2 + `graduatingInterval` / **review**: 箱 +1（max 5）、該当復習間隔 / **relearning**: 次ステップ、完了後 review に復帰（同箱） |
| `3` | 簡単 | **learning**: **卒業** → review 箱 2 + `easyInterval` / **review**: 箱 +2（max 5）、該当復習間隔 / **relearning**: review に復帰 + `easyInterval` |

- 各採点ボタンに **次回までの間隔**（例: `今すぐ` / `10分後` / `1日後`）を表示する（Anki 風）
- 表示値は `reviewPhase` / `reviewStep` / `boxNum` とデッキの **スマート学習の間隔** 設定から [`previewReviewGrade`](../../shared/src/study/scheduler.ts) で算出

- 横断セッション: `deckId` なし、`getDueCards()` 全件からランダム
- デッキ別: `getDueCards(deckId)` + ランダム
- 評価後 `submitReview(cardId, result)` — `result` は `0 | 1 | 2 | 3`
- Tray 件数・rail バッジは **スマート学習タブのみ**

## 復習状態（phase / step / box）

開発者向け用語 **Box**（`review_state.box`）。UI では非表示。

| フィールド | 説明 |
|-----------|------|
| `phase` | `learning`（新規学習） / `review`（復習中） / `relearning`（復習中に Again） |
| `step` | 学習・再学習ステップの 0 始まりインデックス |
| `box` | **review** では 2..5（復習箱）。**learning / relearning** では 1（内部識別子） |
| `due_at` | 次回復習 unix ms |

### デッキ別間隔（`decks.scheduler_config` v2）

ホームの **スマート学習の間隔** でデッキごとに設定:

| 設定 | デフォルト | 単位 |
|------|-----------|------|
| 学習ステップ | 1 分, 10 分 | 分 / 時間 / 日 |
| 再学習ステップ | 10 分 | 同上 |
| 復習間隔（箱 2〜5） | 1, 3, 7, 21 日 | 同上 |
| 難しい | 1 日 | 同上 |
| 卒業（正解で学習完了） | 1 日 | 同上 |
| 簡単 | 4 日 | 同上 |

- **新規カード**: `phase=learning`, `step=0`, `box=1`, `due_at=now`（今すぐ）
- **既存カード**（migration 前）: `phase=review`, `step=0`（`box` / `due_at` は維持）
- 変更は **次回採点以降** に反映（既存 `due_at` は再計算しない）
- v1 `boxIntervalDays`（日数のみ 5 要素）は読み取り時に v2 へ自動マイグレート

## 表示

- フリップ / peek: デッキ学習と同一（[study.md](./study.md) §表示）

## 受け入れ条件

- [ ] 横断復習予定総数とヒーローカードからのセッション開始
- [ ] デッキ別復習予定一覧からセッション開始
- [ ] 4 段階評価で review_state（phase / step / box / due_at）更新、Tray 件数減少
- [ ] 4 段階ボタンに次回までの間隔（`今すぐ` / `N分後` / `N日後` 等）を表示
- [ ] ホームでデッキ別スマート学習の間隔（学習 / 再学習 / 復習 / Hard 等）を設定・保存できる
- [ ] 設定保存直後に LearnMode のプレビューが更新される
- [ ] 復習予定 0 で完了表示（ハブ・セッション共通の派手演出）
- [ ] デッキ別完了で他復習予定残存時は控えめ完了 UI
- [ ] Tray クリックでスマート学習タブを開く
