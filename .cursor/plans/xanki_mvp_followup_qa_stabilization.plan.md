---
name: xanki MVP Follow-up QA/Stabilization Plan
overview: 既存MVP実装計画の完了後に、実機QA、UX摩擦の除去、データ整合性、権限/配布まわりを固めるフォローアップ計画です。別エージェントによるMVP実装と競合しないよう、機能追加より検証・磨き込み・リリース判定を優先します。
todos:
  - id: sync-current-state
    content: "実装完了後の現状同期: 既存計画との差分、未完了機能、既知の暫定実装を棚卸し"
    status: pending
  - id: acceptance-qa
    content: "MVP受け入れQA: テキスト取込、スクショ取込、画像/テキスト保存、復習、検索、削除を実機で通し確認"
    status: pending
  - id: editor-ux-polish
    content: "マスクエディタUX補正: 画像範囲選択、OCR選択、保存/破棄、キーボード操作の摩擦を減らす"
    status: pending
  - id: data-integrity
    content: "データ整合性確認: SQLite WAL、論理削除、review_state、画像パス、OCR JSON、crop保存の破損ケースを確認"
    status: pending
  - id: native-permission-release
    content: "macOS権限/配布確認: Accessibility、Screen Recording、sidecar同梱、dmg生成、初回起動導線を検証"
    status: pending
  - id: perf-and-no-network
    content: "非機能検証: 取込レイテンシ、保存→閉じる速度、常駐メモリ、外部通信ゼロを測定"
    status: pending
isProject: false
---

# xanki MVP Follow-up QA/Stabilization Plan

## Current Assumption

- 先行の `xanki_mvp_開発計画_3957b397.plan.md` は実装担当エージェントが進行中または完了直前。
- このfollow-upでは大きな機能追加を避け、MVPが「毎日使える状態」かを検証し、不足分だけを小さく補正する。
- 既存MVPの設計原則は維持する: ローカルファースト、外部通信ゼロ、ショートカット起点、macOS 14+。

## (人間による追記)最初の開発プランの実装後、感じたこと

- 文字選択/スクショのショートカットで、ウィンドウが正しく立ち上がるようにはなっている
- 文字選択
  - 「メモ」はいらない
  - 「マスクを追加」は、今選択しているマスク範囲の右下あたりにボタンとして出てくると嬉しい
    - 現在のウィンドウは 参考1.png を参照
  - 保存ボタンももっと工夫できると思う
  - すでに選択したマスク範囲を取り消す方法がない
- スクリーンショット
  - 要件としては、カードにする範囲を選択した上で、その範囲内の一部をマスキングするという操作を想定
  - 今は、スクショ範囲がそのままカードになっていて、複数箇所のマスキングしかできていない
  - 半透明の色で塗りつぶすので、隠せていない
- あと全体的にデザインが古すぎる、破綻している部分も見受けられるので、白と黒とグレーを基調にしたモダンなデザインにしてください

## Follow-up Priorities

1. **受け入れQAを先に行う**
  - ⌥⌘M: 選択テキスト取得、クリップボード復元、MaskEditor表示、保存、一覧表示、復習表示。
  - ⌥⌘S: `screencapture -i -x` 起動、画像保存、矩形マスク、範囲ごとカード生成、復習表示。
  - OCR: Swift sidecar起動、bbox表示、OCRマスク保存、検索対象化、復習時の再描画。
  - Tray: 起動時常駐、メインウィンドウ表示、閉じても常駐、今日の復習件数更新。
2. **MVP UXの詰まりを直す**
  - 画像の「範囲」指定が数値入力だけなら、実使用で許容できるか確認し、必要ならドラッグ指定に寄せる。
  - OCR文字マスクは「なぞる」実装が重い場合、クリック/複数選択をMVP仕様として明文化する。
  - MaskEditorは保存後すぐ閉じる方針を維持し、保存失敗時の復旧導線を確認する。
  - ライブラリの「編集」が未実装なら、MVP必須か削除だけでよいかを決め、表示文言を実装に合わせる。
3. **データと復習の正しさを確認する**
  - 新規カード作成時に `review_state` が必ず作成されること。
  - `deleted_at IS NULL` が一覧、検索、復習件数、due取得に一貫して効くこと。
  - 画像crop後のマスク座標が復習画面でずれないこと。
  - `ocr_data.words[id]` と `masks.wordIds` の参照が保存/読込後も壊れないこと。
  - App Data配下の画像パスが相対保存され、`assetProtocol` 経由で表示できること。
4. **macOS実機リリース前チェックを行う**
  - Accessibility未許可時はテキスト取込が失敗し、スクショ誘導が出ること。
  - Screen Recording未許可時はスクショ取込が失敗し、設定誘導が出ること。
  - Swift OCR sidecarがdev/build/bundleで同じコマンド経路から起動できること。
  - `pnpm build`、`cargo check`、`pnpm build:ocr`、`pnpm tauri build` を通す。
  - 生成された `.dmg` または `.app` を別ユーザー視点で初回起動確認する。

## Public API / Interface Changes

- 原則として新規API追加はしない。
- 既存commandsの戻り値やDBスキーマを変える場合は、既存カードを壊さない後方互換を必須にする。
- UI文言は実装済み挙動に合わせる。実装していない機能を「できる」と表示しない。
- `masks` JSON形式は既存の `range` / `rect` / `ocr` を維持する。

## Test Plan

- `pnpm build`
- `cargo check` under `src-tauri`
- `pnpm build:ocr`
- `pnpm tauri build`
- 実機手動QA:
  - SafariまたはChromeの選択テキストからカード作成。
  - PDF/スライドのスクショから画像カード作成。
  - OCR文字選択カードを作成し、検索と復習で表示。
  - できた/できないを送信し、Leitner箱とdue件数が更新。
  - 権限未許可状態でオンボーディングと設定導線を確認。
  - アプリ終了/再起動後、カード、画像、復習状態が保持される。

## Acceptance Criteria

- 自分の学習素材で、テキストカードと画像カードをそれぞれ3枚以上、ストレスなく作成できる。
- 作成したカードを復習し、自己評価後にTrayの今日の復習件数が更新される。
- 主要失敗ケースでデータ消失やクリップボード破壊が起きない。
- 外部通信コードを含まず、OCRもローカルsidecarで完結する。
- 初回ユーザーが5分以内に権限設定から1枚目のカード作成まで到達できる。

