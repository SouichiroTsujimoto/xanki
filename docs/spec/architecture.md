# アーキテクチャ

## 技術スタック

| レイヤ | 選定 |
|--------|------|
| フレームワーク | Tauri 2.x |
| フロント | React 19 + TypeScript + Vite |
| 状態管理 | Zustand（メインウィンドウ） |
| ネイティブ | Rust（capture, OCR, 画像 I/O, エディタ, Keychain） |
| OCR | Swift サイドカー `xanki-ocr`（Vision） |
| データ SSoT | Cloudflare D1（REST API） |
| ローカル | App Data 画像キャッシュ（`images/{hash}.webp`） |
| リアルタイム | SSE（`UserSyncHub` Durable Object） |

## ウィンドウ構成

| ウィンドウ | 役割 |
|-----------|------|
| Tray | 常駐。今日の復習件数、Home/設定/終了 |
| main | Home・学習・設定。左サイドレール（折りたたみ可）。初期 1280×840 |
| mask-editor-{uuid} | 取込のたび生成。白背景・通常デコレーション・`alwaysOnTop` |

### マスクエディタ初期化

- Rust `AppState.pending_editors` に `EditorInitPayload` を格納
- フロントは `get_editor_init(windowLabel)` で取得（**取得時に削除しない**）
- ウィンドウ `Destroyed` 時に Rust 側でクリーンアップ（React StrictMode 二重マウント対策）

## 主要イベント

| イベント | 用途 |
|---------|------|
| `data-changed` | カード/デッキ変更後、一覧 refetch（旧 `library-changed`） |
| `review-count-changed` | Tray 復習件数更新 |
| `navigate` | main ウィンドウのタブ切替（`home` / `study` / `settings`。旧 `library` / `review` も互換） |
| SSE `revision` | 他端末 / Web からの変更通知 → REST refetch |

## モジュール境界

| 抽象 | 実装 |
|------|------|
| `AppApi` | `@xanki/ui` インターフェース。Web / Desktop 共通 |
| データ CRUD | `@xanki/shared` Cloud API クライアント → D1 REST |
| `CaptureProvider` | Rust `screencapture -i -x` |
| `OcrProvider` | Swift サイドカー |
| `Scheduler` | `LeitnerScheduler`（shared） |
| `MaskSuggester` | 現行: `NoOpMaskSuggester`（未実装）。将来: `CloudMaskSuggester`（Pro + ログイン必須） |

## クラウド層

D1 SSoT + REST + SSE。詳細は [cloud.md](./cloud.md)。`@xanki/shared` が TS 側 API 契約正本。

## 非機能要件（目標）

| 項目 | 目標 |
|------|------|
| ⌥⌘M → エディタ表示 | 300ms 以内（体感） |
| ⌥⌘S → キャプチャ UI | 500ms 以内 |
| 保存 → エディタ閉じる | 200ms 以内（ネットワーク含む） |
| 常駐メモリ | 150MB 以下（アイドル） |
| ネットワーク | **ログイン必須**。REST + SSE + blob 転送 |

## 背景・制約

- Tauri WebView では `window.confirm` / `window.alert` が信頼できない → アプリ内ダイアログを使う（[ui.md](./ui.md)）
- 画像表示: ローカルキャッシュ → `convertFileSrc`、なければ blob URL
