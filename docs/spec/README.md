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
| [qa-cards.md](./qa-cards.md) | 一問一答カード（Q ボタン、問題文/解答） |
| [image-masks.md](./image-masks.md) | 画像マスク、OCR、座標系、マスクカラー |
| [data-model.md](./data-model.md) | D1 / データ契約、JSON 形式 |
| [glossary.md](./glossary.md) | ユビキタス言語（UI 表示名・コード対応） |
| [library.md](./library.md) | デッキとカード一覧（旧称: ライブラリ） |
| [study.md](./study.md) | 学習 2 トラック索引 |
| [deck-study.md](./deck-study.md) | デッキ学習（Quizlet 型・セッションキュー） |
| [leitner-study.md](./leitner-study.md) | Leitner学習（横断 due・4 段階評価） |
| [ui.md](./ui.md) | デザイン原則、ダイアログ、ショートカット表 |
| [cloud.md](./cloud.md) | 認証・同期・Web UI・課金・AI(クラウド層) |
| [dev-cloud.md](../dev-cloud.md) | クラウド層ローカル動作確認 |
| [dev-ui.md](../dev-ui.md) | UI レイアウト実装メモ（索引） |
| [dev-study-layout.md](../dev-study-layout.md) | 学習セッション・フリップ（dev-ui 配下） |

## 更新ルール

1. **挙動を変えたら、同じ PR で該当 spec を更新する**
2. 「当初の MVP 構想」と「現行仕様」を混ぜない。履歴は Git に任せる
3. 座標・JSON・保存パイプラインは **データ契約** として最優先で正確に書く
4. 各 spec 末尾の **受け入れ条件** を手動 QA のチェックリストとして使う
5. UI 文言・会話用語を変えたら **[glossary.md](./glossary.md)** と [`copy.ts`](../../packages/ui/src/copy.ts) も同じ PR で更新する

## 旧ドキュメント

`masking-flashcard-mvp-design.md`（ルート）は廃止済み。内容は本ディレクトリに移行・改訂した。
