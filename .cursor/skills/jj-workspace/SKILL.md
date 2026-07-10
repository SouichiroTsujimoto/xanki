---
name: jj-workspace
description: Creates a jujutsu secondary workspace for isolated agent work in xanki. Names the workspace automatically when omitted. Runs lite bootstrap only. Use when the user invokes @jj-workspace, asks to create a jj workspace, or wants parallel agent work without touching default workspace.
disable-model-invocation: true
---

# jj workspace 作成

secondary workspace を明示的に作成し、lite bootstrap 後にそこで実装する。

## いつ使うか

- `@jj-workspace` または workspace 作成の明示指示
- default に無関係な WIP があり、別作業を始めたいとき

## workspace 名（Agent が決定）

未指定時は作業内容から kebab-case で命名。`@jj-workspace my-feature` ならそれを優先。

作成前に `jj workspace list` と `ls ../xanki-ws/` で衝突確認。重複時は `-2` 等を付与。名前と理由を 1 行報告する。

## 作成

```bash
NAME=<kebab-case>
jj workspace add --name "$NAME" "../xanki-ws/$NAME"
pnpm setup:jj-workspace:lite "../xanki-ws/$NAME"
```

以降 cwd は `../xanki-ws/$NAME`。

## secondary で禁止

`pnpm setup:*` / `pnpm dev:*` / `pnpm smoke:*` / `pnpm materialize:dev-vars`

## 許可

`pnpm build:ui` / `pnpm check:design` / D1 不要なテスト / `jj describe` 等

## 閉じる

[`jj-workspace-close`](../jj-workspace-close/SKILL.md) — default の WIP へ **rebase 統合**して handoff

## 呼び出し例

```
@jj-workspace
@jj-workspace feat-flashcard-round
```
