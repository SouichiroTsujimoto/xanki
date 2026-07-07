# アーキテクチャ

## 技術スタック

| レイヤ | 選定 |
|--------|------|
| フレームワーク | Tauri 2.x |
| フロント | React 19 + TypeScript + Vite |
| 状態管理 | Zustand（メインウィンドウ） |
| ネイティブ | Rust（commands, DB, キャプチャ, ショートカット） |
| OCR | Swift サイドカー `xanki-ocr`（Vision） |
| DB | SQLite（rusqlite, WAL） |
| 画像 | App Data 配下ファイル、DB には相対パス |

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
| `library-changed` | カード/デッキ変更後、ライブラリ再読込 |
| `review-count-changed` | Tray 復習件数更新 |
| `navigate` | main ウィンドウのタブ切替（`home` / `study` / `settings`。旧 `library` / `review` も互換） |

## モジュール境界（将来拡張用）

| 抽象 | 現行実装 |
|------|---------|
| `CaptureProvider` | `screencapture -i -x` |
| `OcrProvider` | Swift サイドカー |
| `Scheduler` | `LeitnerScheduler` |
| `MaskSuggester` | `NoOpMaskSuggester`（フロント） |

## 非機能要件（目標）

| 項目 | 目標 |
|------|------|
| ⌥⌘M → エディタ表示 | 300ms 以内（体感） |
| ⌥⌘S → キャプチャ UI | 500ms 以内 |
| 保存 → エディタ閉じる | 200ms 以内 |
| 常駐メモリ | 150MB 以下（アイドル） |
| ネットワーク | ゼロ |

## 背景・制約

- Tauri WebView では `window.confirm` / `window.alert` が信頼できない → アプリ内ダイアログを使う（[ui.md](./ui.md)）
- 画像表示は Tauri `assetProtocol` + `convertFileSrc` 経由
