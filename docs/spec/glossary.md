# ユビキタス言語（用語集）

> **正本**: ユーザー向け UI 文言・仕様・エージェント会話で使う名称の SSOT。  
> 実装値: [`packages/ui/src/copy.ts`](../../packages/ui/src/copy.ts)

## 使い方

| 対象 | ルール |
|------|--------|
| UI 表示 | 本書 **UI 表示（正）** 列、または `copy.ts` |
| コード・API | **コード / API** 列（英語。リネームは別 PR） |
| spec・会話・エージェント | **UI 表示（正）** を優先。旧称は使わない |
| 仕様変更 | **同じ PR で本書と `copy.ts` を更新** |

### UI コピー方針（要約）

- ユーザー向け本文は **日本語**
- コード・型・REST パスは **英語**（変更しない）
- **homonym 禁止**: タブ名と学習モード名を同一日本語にしない（例: タブ「学習」≠ モード `learn` → UI「復習」）
- **デッキ学習** と **スマート学習** は接頭辞で区別（両方に「学習」が入る）
- eyebrow（小見出し）も原則日本語（固有名 `Coverflow` 等は例外）

---

## A. 画面・ナビゲーション

| 概念 | コード / API | UI 表示（正） | 旧称・禁止 | 参照 |
|------|-------------|--------------|-----------|------|
| ホームタブ | `AppTab.home`, `navigate: "home"` | サイドバー **ホーム** / トップバー **ホーム** | Home, デッキ管理（旧トップバー） | [library.md](./library.md), [ui.md](./ui.md) |
| デッキ学習タブ | `AppTab.deckStudy`, `navigate: "deckStudy"` / `"study"` | サイドバー **デッキ学習** | 学習（旧タブ名） | [deck-study.md](./deck-study.md) |
| スマート学習タブ | `AppTab.leitner`, `navigate: "leitner"` / `"review"` | サイドバー **スマート学習** | Leitner学習, 復習タブ | [leitner-study.md](./leitner-study.md) |
| 設定タブ | `AppTab.settings` | **設定** | Settings | [ui.md](./ui.md) |
| デッキ学習ハブ | `DeckStudyView`, `phase === "hub"` | （専用ラベルなし） | 学習ハブ | [deck-study.md](./deck-study.md) |
| スマート学習ハブ | `LeitnerStudyView`, `phase === "hub"` | **スマート学習** | Leitner学習 | [leitner-study.md](./leitner-study.md) |
| 学習セッション | `studySessionActive`, `phase !== "hub"` | 手段名 / 復習中 + **戻る** | — | [deck-study.md](./deck-study.md), [leitner-study.md](./leitner-study.md) |
| サイドバー | `sidebarOpen` | **サイドバー** | — | [ui.md](./ui.md) |
| メインウィンドウ | Tauri label `main` | **メインウィンドウ** | — | [architecture.md](./architecture.md) |
| マスクエディタ | `mask-editor-{uuid}` | **マスクエディタ**（種別: テキスト / 画像） | — | [text-masks.md](./text-masks.md), [image-masks.md](./image-masks.md) |

---

## B. Tray・ショートカット

| 概念 | コード / API | UI 表示（正） | 旧称・禁止 | 参照 |
|------|-------------|--------------|-----------|------|
| Tray 復習件数 | `dueCount`, `update_tray_due_count` | **今日の復習: N件** | — | [leitner-study.md](./leitner-study.md) |
| Tray ホーム | menu id `library` | **ホームを開く** | Home を開く | [architecture.md](./architecture.md) |
| テキスト取込 | `triggerTextCapture`, ⌥⌘M | **テキスト取込** | Capture | [capture.md](./capture.md) |
| スクショ取込 | `triggerScreenshotCapture`, ⌥⌘S | **スクショ取込** | — | [capture.md](./capture.md) |
| 取込（サイドバー見出し） | — | **取込** | Capture | [ui.md](./ui.md) |

---

## C. デッキ・カード一覧

| 概念 | コード / API | UI 表示（正） | 旧称・禁止 | 参照 |
|------|-------------|--------------|-----------|------|
| デッキ | `Deck`, `/api/decks` | **デッキ** | Deck（UI） | [library.md](./library.md) |
| デッキ一覧（画面） | `HomeView`, `listDecks` | ホームタブ内 | Home 画面 | [library.md](./library.md) |
| カード | `Card`, `/api/cards` | **カード** | — | [library.md](./library.md) |
| カード一覧 | `CardCollection`, `library-main` | 見出し **カード** | Collection, **ライブラリ**（タブ名意味） | [library.md](./library.md) |
| カード追加 | `TextMaskComposerEmbedded` / `CollectionAddBar` | **カードの追加**（インライン） | — | [library.md](./library.md) |
| Coverflow | `StudyCardCoverflow` | **Coverflow**（固有名） | — | [deck-study.md](./deck-study.md) |
| 変更通知 refetch | `collectionRevision`, `collection-sync` | （UI 非表示） | `libraryRevision`, `library-changed` | [architecture.md](./architecture.md) |
| カードタイル | `CardTilePreview` | （プレビュー） | `LibraryCardPreview` | [library.md](./library.md) |
| 検索 | `searchQuery` | placeholder **カードを検索...** | — | [ui.md](./ui.md) |
| 復習待ちバナー | `dueCount` | **N 件が復習待ち** | due（コード） | [leitner-study.md](./leitner-study.md) |

---

## D. 学習手段（StudyMode / DeckStudyMode）

| 概念 | コード | UI 表示（正） | タブ | 参照 |
|------|--------|--------------|------|------|
| フラッシュカード | `flashcards` | **フラッシュカード** | デッキ学習 | [deck-study.md](./deck-study.md) |
| スマート学習出題 | `learn` | （スマート学習セッション内） | スマート学習 | [leitner-study.md](./leitner-study.md) |
| 書く | `write` | **書く** | デッキ学習 | [deck-study.md](./deck-study.md) |
| テスト | `test` | **テスト** | デッキ学習 | [deck-study.md](./deck-study.md) |
| マッチ | `match` | **マッチ** | デッキ学習 | [deck-study.md](./deck-study.md) |
| 覚えた / まだ | セッション操作 | **覚えた** / **まだ** | デッキ学習 | [deck-study.md](./deck-study.md) |
| 復習を始める | `LeitnerStudyView` ヒーローカード | **復習を始める** | スマート学習 | [leitner-study.md](./leitner-study.md) |
| カードプレビュー | `singleCard` + flashcards | **カードプレビュー** | デッキ学習 | [deck-study.md](./deck-study.md) |
| 手段起動 | `study-hub-toolbar` | **学習を始める** / **学習モード** | デッキ学習 | [deck-study.md](./deck-study.md) |
| シャッフル | `shuffle` | **シャッフル** | デッキ学習 | [deck-study.md](./deck-study.md) |
| 戻る | `exitSession` | **戻る** | 両方 | [study.md](./study.md) |

---

## E. カード種別（Card.kind）

| 概念 | コード | UI 表示（正） | 参照 |
|------|--------|--------------|------|
| テキストカード | `kind: "text"` | **テキスト** | [text-masks.md](./text-masks.md) |
| Q&A カード | `kind: "qa"` | **Q&A** | [qa-cards.md](./qa-cards.md) |
| 画像カード | `kind: "image"` | **画像** | [image-masks.md](./image-masks.md) |
| マスク | `masks` JSON | **マスク** | [data-model.md](./data-model.md) |
| 復習箱 | `boxNum`, `review_state.box` | **Box**（開発者向け。UI 非表示） | [study.md](./study.md) |
| 学習フェーズ | `reviewPhase`, `review_state.phase` | （UI 非表示） | [leitner-study.md](./leitner-study.md) |
| スマート学習の間隔 | `schedulerConfig`, `scheduler_config` | **スマート学習の間隔** | [leitner-study.md](./leitner-study.md), [library.md](./library.md) |
| 学習ステップ | `learningSteps` | **学習ステップ**（設定 UI） | [leitner-study.md](./leitner-study.md) |
| 再学習ステップ | `relearningSteps` | **再学習ステップ**（設定 UI） | [leitner-study.md](./leitner-study.md) |
| 復習間隔 | `reviewIntervals` | **復習間隔（箱 2〜5）**（設定 UI） | [leitner-study.md](./leitner-study.md) |

---

## F. マスクエディタ

| 概念 | UI 表示（正） | 参照 |
|------|--------------|------|
| 新規（テキスト） | **暗記カード作成** | [text-masks.md](./text-masks.md) |
| 編集（テキスト） | **テキストを編集** | [text-masks.md](./text-masks.md) |
| 編集（Q&A） | **Q&A を編集** | [qa-cards.md](./qa-cards.md) |
| 新規（画像） | **暗記カード作成 ✦** | [image-masks.md](./image-masks.md) |
| 編集（画像） | **スクショ編集 ✦** | [image-masks.md](./image-masks.md) |
| デッキ選択ラベル | **デッキ** | [text-masks.md](./text-masks.md) |
| 一問一答化 | **一問一答形式にする** | [qa-cards.md](./qa-cards.md) |
| AI で生成 | `qaGenerate`, **AI で生成** | [library.md](./library.md), [cloud.md](./cloud.md) |

---

## G. AI

| 概念 | コード / API | UI 表示（正） | 参照 |
|------|-------------|--------------|------|
| 学習中 AI 質問 | `askAi`, `POST /api/ai/ask` | **AI に聞く** | [study.md](./study.md), [cloud.md](./cloud.md) |
| Q&A 自動生成 | `qaGenerate`, `POST /api/ai/qa-generate` | **AI で生成** | [library.md](./library.md), [cloud.md](./cloud.md) |

---

## H. スマート学習・SRS

| 概念 | コード | UI / 説明（正） | 備考 |
|------|--------|----------------|------|
| 復習予定 | `dueAt`, `StudyFilter.due` | **復習予定**（説明） | コード `due` 維持 |
| 復習待ち | `dueCount` | **N 件が復習待ち** / Tray **今日の復習** | スマート学習タブ |
| 評価 4 段階 | `submitReview(0\|1\|2\|3)` | **再度 / 難しい / 良好 / 簡単**（1–4 キー） | |
| スマート学習完了 | `LearnMode` empty | **今日のスマート学習は完了です** | |
| 復習箱 | `LeitnerScheduler`, `review_state.box` | **Box**（開発者向け。UI 非表示） | spec・開発用 |
| 習熟度 | `masteryPercent` | **習熟度**（Box 加重平均 %） | [study-metrics.md](./study-metrics.md) |
| 連続日数 | `streakDays` | **N 日**（ホーム） | [study-metrics.md](./study-metrics.md) |
| 今日の学習 | `todayStudyCount` | **N 回**（スマート学習 + デッキ学習） | [study-metrics.md](./study-metrics.md) |
| 学習フェーズ | `reviewPhase`, `review_state.phase` | （UI 非表示） | `learning` / `review` / `relearning` |
| 次回まで | `formatStudyIntervalFromNow` | **今すぐ** / **N分後** / **N時間後** / **N日後** | 採点ボタンプレビュー |

### アルゴリズム用語（開発者向け）

- **Leitner 方式**: 物理箱 + 2 値評価の古典的手法。xanki の UI 名ではない
- **SRS**: 間隔反復。xanki スマート学習は **Anki 型フェーズ（learning / review / relearning）+ 4 段階評価の簡略 SRS**（[`study.md`](./study.md) §スマート学習のアルゴリズム定義）
- **DeckSchedulerConfig v2**: 学習ステップ・再学習ステップ・復習間隔・Hard / 卒業 / 簡単を分離したデッキ設定 JSON
- UI 名 **スマート学習** は暫定。内部識別子 `leitner` / `LeitnerScheduler` は安定キー

---

## I. 認証・課金

| 概念 | UI 表示（正） | 参照 |
|------|--------------|------|
| ログイン | **ログイン** | [cloud.md](./cloud.md) |
| Google ログイン | **Google でログイン** / **Google で続ける** | [cloud.md](./cloud.md) |
| アカウント | **アカウント** | [cloud.md](./cloud.md) |
| プラン | **プラン** | [cloud.md](./cloud.md) |
| Pro / Free | **Pro** / **Free**（英字） | [cloud.md](./cloud.md) |
| アップグレード | **Pro にアップグレード** | [cloud.md](./cloud.md) |

---

## J. 旧称・非推奨（使用禁止）

| 旧称 | 正しい概念 | 正しい内部名 |
|------|-----------|-------------|
| **ライブラリ**（タブ・画面名） | 学習タブ内カード一覧 / 会話上の総称 | `collectionRevision`, `CardTilePreview`（`library.md` はファイル名として残す） |
| **`libraryRevision`** | データ変更で UI refetch を促す revision カウンタ | **`collectionRevision`** |
| **`library-changed`** | Tauri イベント名 | **`data-changed`**（`xanki:data-changed`） |
| **`LibraryCardPreview`** | カードタイルプレビュー | **`CardTilePreview`** |
| **library** (`navigate`) | `home` タブ | Tray menu id **`home`** |
| **review** (`navigate`) | **スマート学習**タブ | Tray menu id `review` |
| **study** (`navigate`) | **デッキ学習**タブ | 後方互換 |
| **学習**（旧タブ名） | **デッキ学習** / **スマート学習** | — |
| **Leitner学習**（UI タブ名） | **スマート学習** | `AppTab.leitner`（コードは維持） |
| **学習**（StudyMode `learn`） | スマート学習セッション（コード `learn`） | — |
| **デッキ管理**（トップバー） | **ホーム** | — |
| **定着** / **仕上げ**（プロダクト説明） | 2 トラックの用途メタファー | 使用禁止。機能記述で説明する |

---

## 受け入れ条件

- [ ] 新規 UI 文言は `copy.ts` 経由で追加される
- [ ] spec・会話で旧称（J 節）を使わない
- [ ] 学習タブと `learn` モード（UI「復習」）が homonym にならない
