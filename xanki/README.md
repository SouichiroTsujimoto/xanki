# xanki

macOS 向けマスキング暗記カードアプリ (MVP)

**仕様 (SSoT): [`../docs/spec/`](../docs/spec/README.md)**

## 開発

```bash
cd xanki
pnpm install
pnpm build:ocr    # Vision OCR サイドカーをビルド
pnpm tauri dev
```

## ショートカット

| ショートカット | 機能 |
|--------------|------|
| ⌥⌘M | 選択テキスト取込 → マスクエディタ |
| ⌥⌘S | スクショ取込 → マスクエディタ |

## 配布用ビルド (dmg)

```bash
pnpm build:ocr
pnpm tauri build
```

生成物: `src-tauri/target/release/bundle/dmg/`

署名・notarize は Apple Developer 証明書設定後に `codesign` / `notarytool` で実施してください。

## 権限

- **アクセシビリティ**: テキスト取込 (⌘C 送出)
- **画面収録**: スクショ取込

初回起動時のオンボーディング、または設定画面から付与できます。
