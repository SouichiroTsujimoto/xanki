# Leitner学習 (Leitner Study)

Anki 型の **定着** トラック。`due_at <= now` のカードのみ。`review_state` を更新する。

- タブ: **Leitner学習**（`AppTab.leitner`）
- Tray **今日の復習: N件** → 本タブへ遷移
- 詳細索引: [study.md](./study.md)

## ハブ

- 今日の due **総数**（全デッキ横断）
- **ヒーローカード**（件数 + 「復習を始める」）→ 横断 due をランダム混合でセッション開始（独立した「出題」ボタンは置かない）
- 下部: due を含む **デッキ一覧**（件数付き）→ デッキ別 due セッション
- due 0: **今日の Leitner 学習は完了です** — 共有 [`LeitnerDueCompletePanel`](../../packages/ui/src/components/xanki/study/leitner-due-complete-panel.tsx)（Motion 登場 + パーティクル + ホログラム背景）。`prefers-reduced-motion` 時は即時表示
- デッキ別セッション完了で他デッキに due 残存: 控えめ完了 UI（残件数 + 「Leitner 学習に戻る」）

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
- Tray 件数・rail バッジは **Leitner学習タブのみ**

## Leitner 箱（間隔）

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

- [ ] 横断 due 総数とヒーローカードからのセッション開始
- [ ] デッキ別 due 一覧からセッション開始
- [ ] 4 段階評価で review_state 更新、Tray 件数減少
- [ ] due 0 で完了表示（ハブ・セッション共通の派手演出）
- [ ] デッキ別完了で他 due 残存時は控えめ完了 UI
- [ ] Tray クリックで Leitner学習タブを開く
