# xanki 仕様 (SSoT)

**このディレクトリが xanki の唯一の正本（Single Source of Truth）です。**

実装・UI・データ形式に矛盾がある場合は、**コードを直す前にここを更新するか、ここに合わせて実装する**。

## 索引

| ファイル | 内容 |
|---------|------|
| [product.md](./product.md) | コンセプト、MVP スコープ、非目標 |
| [architecture.md](./architecture.md) | 技術スタック、ウィンドウ、イベント、拡張フック |
| [capture.md](./capture.md) | ⌥⌘M / ⌥⌘S、権限、クリップボード |
| [text-masks.md](./text-masks.md) | テキストマスクエディタ、座標、保存 |
| [image-masks.md](./image-masks.md) | 画像マスク、crop、OCR、座標系 |
| [data-model.md](./data-model.md) | SQLite スキーマ、JSON 形式 |
| [library.md](./library.md) | デッキ、カード一覧、削除、インポート |
| [study.md](./study.md) | 学習モード、SRS、キーボード操作 |
| [ui.md](./ui.md) | デザイン原則、ダイアログ、ショートカット表 |

## 更新ルール

1. **挙動を変えたら、同じ PR で該当 spec を更新する**
2. 「当初の MVP 構想」と「現行仕様」を混ぜない。履歴は Git に任せる
3. 座標・JSON・保存パイプラインは **データ契約** として最優先で正確に書く
4. 各 spec 末尾の **受け入れ条件** を手動 QA のチェックリストとして使う

## 旧ドキュメント

`masking-flashcard-mvp-design.md`（ルート）は廃止済み。内容は本ディレクトリに移行・改訂した。
