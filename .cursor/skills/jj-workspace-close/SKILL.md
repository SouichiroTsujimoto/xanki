---
name: jj-workspace-close
description: Hands off completed work from a jujutsu secondary workspace to default by rebasing onto default's WIP, then forgets and removes the workspace directory. Resolves workspace name automatically when omitted. Use when the user invokes @jj-workspace-close, finishes work in a secondary workspace, or asks to merge jj workspace changes back to default.
disable-model-invocation: true
---

# jj workspace 閉じる（rebase 統合）

secondary の変更を **default の `@` の上に rebase** して統合し、workspace を削除する。

## 統合の意味

```
close 前:  default @ = A（WIP）,  secondary @ = B
close 後:  jj rebase -r B -o A  →  default @ = B（A の上に載った B）
```

default の `@` にファイル変更がないときは rebase をスキップし、`jj edit B` のみ。

## workspace 名の特定

1. `@jj-workspace-close <name>` の `<name>`
2. 会話内の作成時の名前
3. cwd が `../xanki-ws/<name>`
4. `jj workspace list` で default 以外（複数ならユーザー確認）

## 閉じるワークフロー

```
Task Progress:
- [ ] 1. workspace 名を特定
- [ ] 2. secondary で jj describe 確定
- [ ] 3. secondary で jj st 確認
- [ ] 4. default で close スクリプト実行
- [ ] 5. conflict なら解消 → jj describe
- [ ] 6. default で dev:cloud / PR
```

**secondary（閉じる前）:**

```bash
cd "../xanki-ws/<name>"
jj describe -m "feat: ..."
jj st
```

**default（rebase 統合 + 閉じる）:**

```bash
bash scripts/close-jj-workspace.sh --name <name>
jj st
```

スクリプトは次を行う:

1. default の `@` change id（A）と secondary の `@`（B）を取得
2. `jj workspace forget` + ディレクトリ削除
3. default に WIP があれば `jj rebase -r B -o A`
4. `jj edit B` で default の作業コピーを統合後の B に切り替え

**コンフリクト時:** スクリプトは exit 1。作業ツリーの conflict を解消 → `jj describe` → 再度確認。

**検証・PR（default のみ）:**

```bash
pnpm dev:cloud
pnpm smoke:cloud        # 必要なら
jj bookmark set <name> -r @-
jj git push --bookmark <name>
gh pr create ...
```

D1 migration を追加した場合は先に `pnpm setup:cloud`。

## 呼び出し例

```
@jj-workspace-close
@jj-workspace-close feat-flashcard-round
```
