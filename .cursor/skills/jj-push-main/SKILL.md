---
name: jj-push-main
description: Publishes the current jujutsu change to origin/main for personal direct-to-main development. Fetches, rebases onto main, moves the main bookmark, and pushes. Before push, ensures @ contains one coherent context; if mixed, split or describe then jj new first. Use when the user invokes @jj-push-main, asks to push to main with jj, or when Visual JJ push does nothing because no bookmark is ahead of origin.
disable-model-invocation: true
---

# jj main へ push（個人開発）

feature branch / PR ではなく、**`origin/main` に直接 push** する。

## いつ使うか

- `@jj-push-main`
- Visual JJ の Push が何もしない（bookmark が `main` より進んでいない）
- 作業が完了し、リモート `main` に載せたいとき

## 前提

- **default workspace** で実行（`pnpm dev:*` / `smoke:*` は push 前の確認用）
- push 対象は **`@`**（または `--revision` で指定した 1 本の change 系統）
- 並列の別 change（`xz` / `zz` 等）は **含まれない**。載せたいものは先に rebase / close で `@` 系統に統合する
- `@` に別文脈が混在している場合は、push 前に `jj split` するか、文脈ごとに `describe` → `new` して分離する（[dev-jj.md §作業着手前](../../docs/dev-jj.md)）

## 手順

```
Task Progress:
- [ ] 0. `@` が 1 文脈か確認（混在なら split または describe → new）
- [ ] 1. jj describe でメッセージ確定
- [ ] 2. jj st で conflict なし確認
- [ ] 3. 必要なら default で pnpm dev:cloud / smoke:cloud
- [ ] 4. push スクリプト実行
- [ ] 5. conflict なら解消して再実行
```

```bash
# 確認
jj describe -m "feat: ..."
jj st

# dry-run（送る範囲の確認）
bash scripts/push-jj-main.sh --dry-run

# 本番 push
bash scripts/push-jj-main.sh
```

または:

```bash
pnpm push:main
```

## スクリプトの動作

`scripts/push-jj-main.sh` は次を順に行う。

1. `jj git fetch --remote origin`
2. `jj rebase -s <stack-root> -d main`（`@` から main までの系統をまとめて載せ直す）
3. `jj bookmark set main -r @`
4. `jj git push --bookmark main`
5. `jj new main`（次の作業用に main 上で空 change を開始。`--no-new` で省略可）

## なぜ Visual JJ の Push が効かないか

`jj git push` のデフォルトは **`main@origin` より進んだ tracking bookmark だけ** を送る。`@` に bookmark が無いと `Nothing changed` になる。本スキルは **`main` bookmark を `@` に移してから push** する。

## 手動（スクリプトと同等）

```bash
jj git fetch --remote origin
jj bookmark track main --remote=origin
STACK_ROOT="$(jj log -r 'roots(::@ ~ ::main)' --no-graph -T change_id --limit 1)"
jj rebase -s "$STACK_ROOT" -d main
jj bookmark set main -r @
jj git push --bookmark main
jj new main
```

## トラブルシュート

| 症状 | 対応 |
|------|------|
| rebase で conflict | 作業ツリーで解消 → `jj describe` → 再実行 |
| `Aborted push` / bookmark が古い | `jj git fetch` 後に再度 rebase → push |
| 載せたい変更が別 change にある | `@jj-workspace-close` や `jj rebase` で `@` に統合してから push |
| D1 migration を入れた | push 前に default で `pnpm setup:cloud` |

## 呼び出し例

```
@jj-push-main
@jj-push-main --dry-run で確認してから push
```
