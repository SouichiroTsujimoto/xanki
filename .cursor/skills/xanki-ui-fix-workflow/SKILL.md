---
name: xanki-ui-fix-workflow
description: Fixes xanki on-screen UI and layout issues using frontend-design and modern-web-guidance, verifies in the browser via MCP, and records prevention notes in dev docs. Use when the user reports visual bugs, layout overflow, misalignment, responsive breakage, or asks to fix and document screen UI problems in this repo.
---

# xanki UI 修正ワークフロー

画面上の問題（見切れ・重なり・配置・狭幅崩れ・見た目の不整合）を、**設計スキル → 実装 → ブラウザ確認 → dev doc 記録**まで一気通貫で行う。

## いつ使うか

- ユーザーが画面・レイアウト・見た目の不具合を報告したとき
- 「直して」「確認して」「再発防止まで」がセットで求められているとき
- `@xanki-ui-fix-workflow` または本スキルを明示的に添付されたとき

## 前提スキル（先に読む）

| スキル | 役割 |
|--------|------|
| **frontend-design** | 意図的な美学・タイポ・余白・モーション。汎用 AI スロップを避ける |
| **modern-web-guidance** | CSS レイアウト・overflow・scroll・flex/grid の現代的パターン（`.agents/skills/modern-web-guidance/SKILL.md`） |

症状に合う guide があれば `modern-web-guidance/guides/` を追加で読む（例: `css-layout`, `overflow-clipping-control`）。

## ワークフロー

```
Task Progress:
- [ ] 1. 再現条件と正本を特定
- [ ] 2. 原因を切り分け（DOM / CSS / 計測）
- [ ] 3. @xanki/ui で最小修正
- [ ] 4. ブラウザで before/after 確認
- [ ] 5. dev doc + 必要なら spec を更新
```

### 1. 再現条件と正本を特定

1. **WHAT** — 関連 [`docs/spec/`](../../../docs/spec/README.md) を読む（UI は [ui.md](../../../docs/spec/ui.md)、画面別は [dev-ui.md](../../../docs/dev-ui.md) 索引）
2. **WHY / 罠** — 索引から該当 [`docs/dev-*.md`](../../../docs/dev-ui.md) を開く。既存の §不変条件・§症状→原因 を先に確認
3. **実装** — 修正は [`packages/ui/`](../../../packages/ui/)（`@xanki/ui`）。`web/` と `xanki/` に同等 UI をコピーしない（[ui-shared-components.mdc](../../../.cursor/rules/ui-shared-components.mdc)）
4. **再現手順** — 画面 URL・viewport・操作列をメモ（後のブラウザ確認に使う）

### 2. 原因を切り分け

- DevTools 的に見る順序は該当 dev doc の §デバッグ手順 に従う
- レイアウト系は典型原因: 祖先 `overflow`、flex/grid の shrink/grow、`position` + 高さ鎖、JS 計測タイミング、`preserve-3d` と overflow の衝突
- **frontend-design**: 修正方針（最小変更 vs 意図的な再設計）を決める
- **modern-web-guidance**: 採用する CSS/API パターンを選ぶ（safe center、scroll container、container queries 等）

### 3. 実装（最小 diff）

- 既存 hook / トークン / CSS 変数を優先（`packages/ui/src/styles/tokens.css`）
- 非自明な制約はコードに 1 行コメント + dev doc 参照
- Tauri: `window.confirm` / `window.alert` 禁止 → 共有ダイアログ
- 挙動がユーザー向けに変わる場合のみ `docs/spec/` を同 PR で更新

### 4. ブラウザで自動確認（必須）

**dev サーバ**

| 確認対象 | コマンド | URL / 備考 |
|----------|----------|------------|
| Web（HMR） | `pnpm dev:cloud` | `http://localhost:8787` |
| Desktop | `pnpm dev:desktop` | Cloud API は別途 `dev:cloud` |
| 両方 | `pnpm dev:cloud:all` | Web + Tauri |

**MCP `cursor-ide-browser` を使う**（利用不可なら [control-ui](https://github.com/cursor/plugins) 相当の手動スモークにフォールバックし、理由を報告）:

1. `browser_tabs` list → 未起動なら dev サーバー起動を確認
2. `browser_navigate` で対象画面へ
3. **修正前** — `browser_snapshot` + `browser_take_screenshot`（可能なら）
4. 再現操作（クリック・フリップ・リサイズ・スクロール）
5. **修正後** — 同操作で snapshot / screenshot
6. レイアウト問題なら **複数 viewport**（例: 1280×800、390×844、900px 境界でドロワー）
7. 学習 UI なら [AGENTS.md](../../../AGENTS.md) の手動スモーク項目も踏む

**合格条件**: 報告された症状が消え、既知の §不変条件 を壊していない。

### 5. ドキュメント（再発防止・必須）

[ui-layout-dev-docs.mdc](../../../.cursor/rules/ui-layout-dev-docs.mdc) に従い **コードと同じ変更** で記録:

1. [dev-ui.md](../../../docs/dev-ui.md) 索引から該当 dev doc を更新
2. **履歴メモ** に 1 行: `| YYYY-MM | 症状 | 原因 | 対応 |`
3. 新しい **不変条件** → §不変条件、**症状パターン** → §症状→原因
4. ユーザー向け挙動変更時のみ `docs/spec/`
5. 複数画面にまたがる場合は主因 doc + 索引から相互リンク

詳細テンプレート: [reference.md](reference.md)

## 完了チェックリスト

- [ ] 症状がブラウザ確認で解消（証拠: snapshot または screenshot の所見）
- [ ] 修正は `@xanki/ui`（または spec で許された薄い wrapper のみ）
- [ ] 該当 `docs/dev-*.md` に履歴メモ追記
- [ ] spec 更新が必要なら同 PR に含めた
- [ ] Web / Tauri 両方に効く共有 CSS であることを確認（片方だけのローカル CSS を増やしていない）

## 対象外（別ワークフロー）

| 種別 | 行き先 |
|------|--------|
| 純ロジック・API バグ（画面レイアウト無関係） | 通常デバッグ / [dev-cloud.md](../../../docs/dev-cloud.md) |
| masks 座標・JSON | [text-masks.md](../../../docs/spec/text-masks.md) / [image-masks.md](../../../docs/spec/image-masks.md) |
| クラウド D1・認証インフラ | [dev-cloud.md](../../../docs/dev-cloud.md) |

## 呼び出し例

```
@xanki-ui-fix-workflow 学習カードのテキストがボタンと重なる。直してブラウザ確認と dev doc まで。
```

```
@xanki-ui-fix-workflow @frontend-design @modern-web-guidance サイドバーの ghost ボタンが chartreuse になる
```
