---
name: Q&A editor fixes
overview: Q ボタンをツールバー（メモ横）へ移し、全文を問題文にする操作に変更。選択ポップアップから Q を削除し、問題/解答エリアのレイアウト崩れと text→qa 更新失敗を修正する。
todos:
  - id: qa-toolbar
    content: "TextMaskEditor: Q をツールバーへ移動、enterQaMode(全文)、選択 popup から Q 削除"
    status: completed
  - id: qa-layout
    content: 問題/解答エリアの DOM + App.css 整理（qa-field-box 統一）
    status: completed
  - id: qa-update-backend
    content: "update_qa_card: kind IN (text, qa) + SET kind=qa で text→qa 変換対応"
    status: completed
  - id: qa-spec
    content: docs/spec/qa-cards.md, text-masks.md を新 UX に更新
    status: completed
  - id: qa-verify
    content: tsc + cargo check、text→qa 更新の手動確認
    status: completed
isProject: false
---

# Q&A エディタ修正

## 問題の整理

| 症状 | 原因 |
|------|------|
| 一問一答への更新が失敗 | 既存 `text` カードを Q&A 化して保存すると `updateQaCard` が呼ばれるが、[`update_qa_card`](xanki/src-tauri/src/db/repos.rs) は `WHERE kind = 'qa'` のみ。0 行更新 → NotFound |
| Q が選択時に出る | [`TextMaskEditor.tsx`](xanki/src/components/TextMaskEditor.tsx) の selection popup に Q ボタンが残っている |
| 問題/解答エリアの崩れ | `.qa-editor-layout` に padding なし、問題文は `text-surface` 枠内、解答だけ `qa-answer-input` に独立 border → ラベル重なり・見た目不一致 |

## 1. Q ボタンの UX 変更

対象: [`TextMaskEditor.tsx`](xanki/src/components/TextMaskEditor.tsx)

- **ツールバー**（Deck / メモ の横）に **「Q」** ボタンを追加
  - `qaMode === false` のときのみ表示
  - 押下で `enterQaMode()` を実行
- **`enterQaMode()`** の挙動:
  - 現在の `content` **全文** を問題文として維持（選択範囲は使わない）
  - `setQaMode(true)`、選択/popup をクリア
  - 既存マスクはそのまま維持（全文が問題文になるため range は有効）
  - `answer` は空のまま（新規 Q&A 化時）
- **選択ポップアップ**から Q ボタンを **削除**（`+ マスク` のみ）
- `setQuestionFromSelection()` を削除

```tsx
// toolbar イメージ
<label>メモ</label>
{!qaMode && (
  <button type="button" className="qa-toolbar-button" onClick={enterQaMode}>
    Q
  </button>
)}
```

## 2. 問題/解答レイアウト修正

対象: [`TextMaskEditor.tsx`](xanki/src/components/TextMaskEditor.tsx) + [`App.css`](xanki/src/App.css)

DOM を整理:

```tsx
<div className="text-surface qa-editor-layout">
  <section className="qa-question-section">
    <p className="qa-section-label">問題文</p>
    <div className="qa-field-box">
      <div className="text-edit-stack">...</div>
    </div>
  </section>
  <label className="qa-answer-field">
    <span className="qa-section-label">解答</span>
    <textarea className="qa-answer-input" />
  </label>
</div>
```

CSS 要点:

- `.qa-editor-layout`: `padding: 1rem`、`gap: 1.25rem`
- `.qa-field-box`: 問題文・解答で **同じ** 枠スタイル（border / radius / background）
- `.qa-field-box .text-edit-stack` 内 textarea: `min-height: 6rem`、枠線は box 側に集約（二重 border 回避）
- `.qa-toolbar-button`: メモ横のコンパクトボタン（`.step-switch button` 程度のサイズ）

## 3. text → qa 更新失敗の修正

対象: [`repos.rs`](xanki/src-tauri/src/db/repos.rs) `update_qa_card`

```sql
UPDATE cards
SET kind = 'qa',
    content = ?1,
    answer = ?2,
    masks = ?3,
    note = ?4,
    deck_id = ?5,
    updated_at = ?6
WHERE id = ?7 AND deleted_at IS NULL AND kind IN ('text', 'qa')
```

- 既存 `qa` カードの更新も従来どおり動作
- 既存 `text` カードをエディタで Q 化して保存 → `kind` が `qa` に昇格

フロント側の分岐（`qaMode ? updateQaCard : updateTextCard`）はそのままで OK。

## 4. Spec 更新

| ファイル | 変更 |
|---------|------|
| [`docs/spec/qa-cards.md`](docs/spec/qa-cards.md) | Q はツールバー（メモ横）。全文が問題文。選択ポップアップに Q なし |
| [`docs/spec/text-masks.md`](docs/spec/text-masks.md) | 選択時は「+ マスク」のみ。Q は qa-cards 参照 |

## 受け入れ条件

- [ ] メモ横の Q → 全文が問題文、解答欄表示、選択時に Q は出ない
- [ ] 問題文/解答エリアが同型の枠で縦並び、ラベル重なりなし
- [ ] 既存 text カード → Q 化 → 解答入力 → 更新成功（kind=qa）
- [ ] 既存 qa カードの再編集・更新も成功
- [ ] 通常 text カード（Q 未使用）の保存に回帰なし
