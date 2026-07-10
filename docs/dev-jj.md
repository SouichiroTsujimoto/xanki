# jujutsu（jj）— ローカル開発フロー

Agent 向け: [`.cursor/rules/dev-jujutsu.mdc`](../.cursor/rules/dev-jujutsu.mdc)

## スキル

| 操作 | スキル | コマンド例 |
|------|--------|-----------|
| 作成 | [`@jj-workspace`](../.cursor/skills/jj-workspace/SKILL.md) | `@jj-workspace` |
| 閉じる（rebase 統合） | [`@jj-workspace-close`](../.cursor/skills/jj-workspace-close/SKILL.md) | `@jj-workspace-close` |

## workspace 作成（secondary）

```bash
jj workspace add --name <name> ../xanki-ws/<name>
pnpm setup:jj-workspace:lite ../xanki-ws/<name>
```

- lite: `install` + `build:shared` + `.git` ポインタのみ
- `dev:cloud` / `setup:cloud` は **default のみ**

## workspace 閉じる（rebase 統合）

`scripts/close-jj-workspace.sh` は default の `@`（A）と secondary の `@`（B）を統合する。

| default の状態 | 動作 |
|----------------|------|
| `@` に WIP あり | `jj rebase -r B -o A` → `jj edit B` |
| `@` が空 | `jj edit B` のみ |

```bash
bash scripts/close-jj-workspace.sh --name <name>
```

rebase でコンフリクトした場合は解消してから `jj describe`。D1 migration 追加時は default で `pnpm setup:cloud` を再実行。

## secondary で禁止する pnpm

`pnpm setup:*` / `pnpm dev:*` / `pnpm smoke:*` / `pnpm materialize:dev-vars`

## 日常コマンド

| git | jj |
|-----|-----|
| `git commit` | `jj describe` |
| `git worktree add` | `jj workspace add` |

## 履歴メモ

| 日付 | 内容 |
|------|------|
| 2026-07 | close を rebase 統合に変更（`close-jj-workspace.sh`） |
