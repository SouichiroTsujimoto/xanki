# 学習 (Study) — 索引

学習は **2 トラック** に分かれる。

| トラック | タブ | spec | 目的 |
|---------|------|------|------|
| デッキ学習 | `AppTab.deckStudy` | [deck-study.md](./deck-study.md) | Quizlet 型・仕上げ（セッションキューが減る） |
| Leitner学習 | `AppTab.leitner` | [leitner-study.md](./leitner-study.md) | Anki 型・定着（due + 4 段階評価） |

## 共通

### セッション UI

- サイドバー自動閉じ / 戻るでハブ復帰
- カード本体は進捗・ヒントと操作の間で **画面中央**
- セッション中スクロールバー非表示（長文はカード内スクロール）

### 3D フリップ

- 表示中の面の高さを計測してロック → フリップ完了後に裏面へ再計測
- フリップ中 `overflow: visible`（`.study-flip-inner` に `overflow: hidden` 不可）
- 静止時の非表示面は `visibility: hidden`
- カード枠・影: `.study-flip-slot` padding + フリップ中の祖先 `overflow: visible`
- `prefers-reduced-motion`: 切替のみ

### Q&A / テキスト / 画像カード

- [qa-cards.md](./qa-cards.md), [text-masks.md](./text-masks.md), [image-masks.md](./image-masks.md)
- マスク peek（インタラクティブ時）、flip 後 stagger reveal

### AI に聞く（学習中）

- **フラッシュカード**（デッキ学習）と **Leitner 出題**（`LearnMode`）の `.review-actions` に **AI に聞く** ボタン
- 現在カードの文脈（`buildStudyCardContext`）とユーザー質問を `POST /api/ai/ask` に送信
- 回答はオーバーレイ内に SSE ストリーム表示。Tauri では `window.alert` 禁止 → エラーはパネル内

## 旧構成からの移行

| 旧 | 新 |
|----|-----|
| `AppTab.study` | `deckStudy` + `leitner` |
| 学習ハブ 5 モード | デッキ学習 4 手段 + Leitner ハブ |
| `learn` + 1/2 | Leitner学習 + 4 段階 |
| Tray → study | Tray → leitner |

## 受け入れ条件（横断）

- [ ] サイドバー 4 項目（ホーム / デッキ学習 / Leitner学習 / 設定）
- [ ] 両タブでフリップ・peek が一致
- [ ] glossary / copy と UI 表示が一致
