# jujutsu（jj）— ローカル開発フロー

Agent 向け: [`.cursor/rules/dev-jujutsu.mdc`](../.cursor/rules/dev-jujutsu.mdc)

## スキル

| 操作 | スキル | コマンド例 |
|------|--------|-----------|
| 作成 | [`@jj-workspace`](../.cursor/skills/jj-workspace/SKILL.md) | `@jj-workspace` |
| 閉じる（rebase 統合） | [`@jj-workspace-close`](../.cursor/skills/jj-workspace-close/SKILL.md) | `@jj-workspace-close` |
| main へ push | [`@jj-push-main`](../.cursor/skills/jj-push-main/SKILL.md) | `pnpm push:main` |

## 作業着手前（change の混在防止）

jj は編集を自動で `@` に積む。**作業開始前**に、今の change にこれからの作業を含めてよいか判断する。

| 同じ change でよい | 別 change（`describe` → `new`） |
|-------------------|--------------------------------|
| 同一機能・バグ修正の続き | 別機能・別スキル・別ドキュメント目的 |
| 同じ main push 単位 | Agent が別タスクに切り替わるとき |
| 直前 change の微調整 | 「ついでに」触る無関係な変更 |

```bash
jj describe -m "ここまでの要約"   # 未来の作業ではなく、現 change の内容
jj new
```

迷ったら別 change。並列は `@jj-workspace`。push 前は `pnpm push:main --dry-run` で系統を確認。

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
| `git push origin main` | `pnpm push:main`（`@jj-push-main`） |

## main へ push（個人開発）

PR ではなく **`origin/main` 直 push**。`jj git push` だけでは bookmark が無いと何も送られない。

```bash
bash scripts/push-jj-main.sh --dry-run   # 確認
pnpm push:main                           # fetch → rebase onto main → push
```

push 対象は `@` の 1 系統のみ。並列 change は先に `@` へ統合する。

## 履歴メモ

| 日付 | 内容 |
|------|------|
| 2026-07 | 作業着手前ルール — 文脈判断 → `describe` → `new` |
| 2026-07 | `@jj-push-main` / `push-jj-main.sh` — main 直 push（個人開発） |
| 2026-07 | close を rebase 統合に変更（`close-jj-workspace.sh`） |
