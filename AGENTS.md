# xanki — Agent 向けガイド

## 仕様 (SSoT)

**正本は [`docs/spec/`](./docs/spec/README.md) です。**

| 変更対象 | 読む spec |
|---------|-----------|
| 取込・ショートカット | [capture.md](./docs/spec/capture.md) |
| テキストマスク | [text-masks.md](./docs/spec/text-masks.md) |
| 画像マスク・座標 | [image-masks.md](./docs/spec/image-masks.md) |
| DB / JSON | [data-model.md](./docs/spec/data-model.md) |
| ライブラリ | [library.md](./docs/spec/library.md) |
| 学習 | [study.md](./docs/spec/study.md) |
| UI / ダイアログ | [ui.md](./docs/spec/ui.md) |

## ルール

1. 挙動を変えたら **同じ変更で spec を更新**する
2. 座標系・JSON・保存フローは spec と実装を必ず一致させる
3. `window.confirm` / `window.alert` は Tauri で使わない（[ui.md](./docs/spec/ui.md)）

## アプリコード

メインアプリ: [`xanki/`](./xanki/)

```bash
cd xanki && pnpm install && pnpm build:ocr && pnpm tauri dev
```
