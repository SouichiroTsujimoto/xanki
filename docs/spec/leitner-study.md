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

| result | UI | box / due |
|--------|-----|-----------|
| `0` | 再度 | box = 1, 当日 |
| `1` | 難しい | box 据え置き, due = now + 1 日 |
| `2` | 良好 | box = min(box + 1, 5) |
| `3` | 簡単 | box = min(box + 2, 5) |

- 横断セッション: `deckId` なし、`getDueCards()` 全件からランダム
- デッキ別: `getDueCards(deckId)` + ランダム
- 評価後 `submitReview(cardId, result)` — `result` は `0 | 1 | 2 | 3`
- Tray 件数・rail バッジは **スマート学習タブのみ**

## 復習箱（間隔）

開発者向け用語 **Box**（`review_state.box`、1..5）。UI では非表示。

| 箱 | 次回まで |
|----|---------|
| 1 | 当日（0 日） |
| 2 | 1 日 |
| 3 | 3 日 |
| 4 | 7 日 |
| 5 | 21 日 |

- 新規カード: box=1, `due_at=now`

## 表示

- フリップ / peek: デッキ学習と同一（[study.md](./study.md) §表示）

## 受け入れ条件

- [ ] 横断復習予定総数とヒーローカードからのセッション開始
- [ ] デッキ別復習予定一覧からセッション開始
- [ ] 4 段階評価で review_state 更新、Tray 件数減少
- [ ] 復習予定 0 で完了表示（ハブ・セッション共通の派手演出）
- [ ] デッキ別完了で他復習予定残存時は控えめ完了 UI
- [ ] Tray クリックでスマート学習タブを開く
