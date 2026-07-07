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
- eyebrow（小見出し）も原則日本語（固有名 `Coverflow` 等は例外）

---

## A. 画面・ナビゲーション

| 概念 | コード / API | UI 表示（正） | 旧称・禁止 | 参照 |
|------|-------------|--------------|-----------|------|
| ホームタブ | `AppTab.home`, `navigate: "home"` | サイドバー **ホーム** / トップバー **ホーム** | Home, デッキ管理（旧トップバー） | [library.md](./library.md), [ui.md](./ui.md) |
| 学習タブ | `AppTab.study`, `navigate: "study"` | サイドバー **学習** / トップバー 選択デッキ名 | Study | [study.md](./study.md) |
| 設定タブ | `AppTab.settings` | **設定** | Settings | [ui.md](./ui.md) |
| 学習ハブ | `phase === "hub"` | （専用ラベルなし） | — | [study.md](./study.md) §学習ハブ |
| 学習セッション | `studySessionActive`, `phase !== "hub"` | モード名 + **戻る** | — | [study.md](./study.md) §学習セッション |
| サイドバー | `sidebarOpen` | **サイドバー** | — | [ui.md](./ui.md) |
| メインウィンドウ | Tauri label `main` | **メインウィンドウ** | — | [architecture.md](./architecture.md) |
| マスクエディタ | `mask-editor-{uuid}` | **マスクエディタ**（種別: テキスト / 画像） | — | [text-masks.md](./text-masks.md), [image-masks.md](./image-masks.md) |

---

## B. Tray・ショートカット

| 概念 | コード / API | UI 表示（正） | 旧称・禁止 | 参照 |
|------|-------------|--------------|-----------|------|
| Tray 復習件数 | `dueCount`, `update_tray_due_count` | **今日の復習: N件** | review（navigate 互換のみ） | [study.md](./study.md) |
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
| カード追加バー | `CollectionAddBar` | **カードの追加** | — | [library.md](./library.md) |
| Coverflow | `StudyCardCoverflow` | **Coverflow**（固有名） | — | [study.md](./study.md) |
| 変更通知 refetch | `libraryRevision`, `library-sync` | （UI 非表示） | library-changed | [architecture.md](./architecture.md) |
| 検索 | `searchQuery` | placeholder **カードを検索...** | — | [ui.md](./ui.md) |
| 復習待ちバナー | `dueCount` | **N 件が復習待ち** | due（コード） | [study.md](./study.md) |

---

## D. 学習モード（StudyMode）

| 概念 | コード | UI 表示（正） | 旧称・禁止 | 参照 |
|------|--------|--------------|-----------|------|
| フラッシュカード | `flashcards` | **フラッシュカード** | Flashcards | [study.md](./study.md) |
| SRS 復習 | `learn` | **復習** | **学習**（モード名として） | [study.md](./study.md) |
| 書く | `write` | **書く** | Write | [study.md](./study.md) |
| テスト | `test` | **テスト** | Test | [study.md](./study.md) |
| マッチ | `match` | **マッチ** | Match | [study.md](./study.md) |
| カードプレビュー | `singleCard` + flashcards | **カードプレビュー** | — | [study.md](./study.md) |
| モード起動 | `study-hub-toolbar` | **学習を始める** / 見出し **学習モード** | Study Modes | [study.md](./study.md) |
| シャッフル | `shuffle` | **シャッフル** | — | [study.md](./study.md) |
| 戻る | `exitSession` | **戻る** | — | [study.md](./study.md) |

---

## E. カード種別（Card.kind）

| 概念 | コード | UI 表示（正） | 参照 |
|------|--------|--------------|------|
| テキストカード | `kind: "text"` | **テキスト** | [text-masks.md](./text-masks.md) |
| Q&A カード | `kind: "qa"` | **Q&A** | [qa-cards.md](./qa-cards.md) |
| 画像カード | `kind: "image"` | **画像** | [image-masks.md](./image-masks.md) |
| マスク | `masks` JSON | **マスク** | [data-model.md](./data-model.md) |
| スター | `starred` | **スター** | [library.md](./library.md) |
| Leitner 箱 | `boxNum`, `review_state.box` | **Box**（一覧表示） | [study.md](./study.md) |

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

---

## G. 復習・SRS

| 概念 | コード | UI / 説明（正） | 備考 |
|------|--------|----------------|------|
| 復習予定 | `dueAt`, `StudyFilter.due` | **復習予定**（説明） | コード `due` 維持 |
| 復習待ち | `dueCount` | **N 件が復習待ち** | Tray「今日の復習」と連動 |
| 復習結果 | `submitReview(0\|1)` | **不可 / 可**（1/2 キー） | |
| 復習完了 | `LearnMode` empty | **今日の復習は完了です** | |
| Leitner | `LeitnerScheduler` | （UI 非表示） | spec・開発用 |

---

## H. 認証・課金

| 概念 | UI 表示（正） | 参照 |
|------|--------------|------|
| ログイン | **ログイン** | [cloud.md](./cloud.md) |
| メール OTP | **メール OTP でログイン** / **コードを送信** | [cloud.md](./cloud.md) |
| 確認コード | **6桁コード** / **コードを再送** | [cloud.md](./cloud.md) |
| アカウント | **アカウント** | [cloud.md](./cloud.md) |
| プラン | **プラン** | [cloud.md](./cloud.md) |
| Pro / Free | **Pro** / **Free**（英字） | [cloud.md](./cloud.md) |
| アップグレード | **Pro にアップグレード** | [cloud.md](./cloud.md) |

---

## I. 旧称・非推奨（使用禁止）

| 旧称 | 正しい概念 | 残存場所（内部名のみ） |
|------|-----------|----------------------|
| **ライブラリ**（タブ・画面名） | 学習タブ内カード一覧 / 会話上の総称 | `library.md` ファイル名, `libraryRevision`, `LibraryCardPreview` |
| **library** (`navigate`) | `home` タブ | `resolveTab`, Tray menu id |
| **review** (`navigate`) | `study` タブ | Tray menu id `review` |
| **Home**（ナビ英語） | **ホーム** | — |
| **Collection** | カード一覧見出し **カード** | — |
| **学習**（StudyMode `learn`） | **復習** | — |
| **デッキ管理**（トップバー） | **ホーム** | — |

---

## 受け入れ条件

- [ ] 新規 UI 文言は `copy.ts` 経由で追加される
- [ ] spec・会話で旧称（I 節）を使わない
- [ ] 学習タブと `learn` モード（UI「復習」）が homonym にならない
