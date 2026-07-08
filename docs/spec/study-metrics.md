# 学習メトリクス (Study Metrics)

ホーム画面および将来の分析 UI 向けの学習指標。**イベント永続化 + 日次集計 + derived 習熟度** が正本。

- 索引: [study.md](./study.md)
- データ契約: [data-model.md](./data-model.md) §study_*
- UI: [library.md](./library.md) §ホーム — 学習メトリクス

## 目的

- モチベーション向上（今日の学習・連続日数・習熟度）
- Leitner 学習とデッキ学習の **両トラック** を同一パイプラインで記録
- 週次グラフ・日次目標等への拡張点を確保

## 永続化

| テーブル | 役割 |
|---------|------|
| `study_sessions` | セッション開始・終了・手段・件数 |
| `study_events` | カウント可能な学習イベント（append-only） |
| `study_daily_stats` | ユーザー × ローカル日付の集計（streak / 今日の学習） |
| `review_state` | Leitner スケジュール（習熟度 derived の入力） |

`review_logs` は Leitner 監査用（既存）。**メトリクス集計は `study_events` / `study_daily_stats` を正本とする。**

### event_type

| 値 | トラック | 発火 |
|----|---------|------|
| `leitner_review` | Leitner | `POST /api/review/submit`（サーバー dual-write） |
| `deck_card_known` | デッキ学習 | クライアント「覚えた」 |
| `deck_card_still` | デッキ学習 | クライアント「まだ」 |
| `session_complete` | 両方 | セッション完了 |

デッキ学習は **SRS（`review_state`）を更新しない**。`study_events` のみ記録。

### タイムゾーン

- 書き込み・読み取りとも `tz_offset_minutes`（JS `getTimezoneOffset() * -1`）を使用
- `local_date` はイベント記録時に確定
- 将来 IANA タイムゾーン設定へ移行可能

## 習熟度（derived）

Box 1–5 を 0–100% に線形マップした加重平均:

```
score(card) = (boxNum - 1) / 4 × 100   // 未設定は 1
masteryPercent = round(sum(score) / cardCount)
```

永続化しない。`review_state.box` 変更時に自動整合。

## API

### Write

```
POST /api/study/sessions
POST /api/study/sessions/:id/events   // deck_card_known | deck_card_still のみ
POST /api/study/sessions/:id/complete
POST /api/review/submit               // tzOffsetMinutes 任意（dual-write）
```

### Read

```
GET /api/study/metrics?deck_id=&tz_offset_minutes=
```

Response: `StudyMetrics`（`@xanki/shared`）

## ホーム UI

スポットライト直下に **学習サマリー**（全体）+ **選択デッキ詳細**（習熟度・Box 分布・デッキ due）を表示。

| 指標 | ソース |
|------|--------|
| 今日の学習 | `study_daily_stats.total_count`（Leitner + デッキ学習） |
| 連続日数 | `study_daily_stats` の連続 `local_date` |
| 全体習熟度 | 全カード `review_state.box` |
| デッキ習熟度 / Box 分布 | 選択デッキのカード |

## 受け入れ条件

- [ ] migration 0005 適用 + `review_logs` backfill
- [ ] Leitner 復習が `study_events` + daily stats に記録
- [ ] デッキ学習（全 4 手段）が `study_events` に記録
- [ ] ホームにサマリー + デッキ詳細が表示
- [ ] Web / Tauri 同一 UI（`@xanki/ui`）
