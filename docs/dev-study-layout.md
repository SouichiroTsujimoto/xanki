# 学習カードレイアウト — 実装メモ

学習セッション（デッキ学習・スマート学習）の **フリップカード周りのレイアウト** と **テキスト縦配置** の実装メモ。  
索引: [dev-ui.md](./dev-ui.md)。ユーザー向け挙動の正本は [spec/study.md](./spec/study.md)。

## 関連ファイル

| 種別 | パス |
|------|------|
| 仕様（WHAT） | [`docs/spec/study.md`](./spec/study.md) |
| スタイル | [`packages/ui/src/styles/components/review.css`](../packages/ui/src/styles/components/review.css) |
| 高さトークン | [`packages/ui/src/styles/tokens.css`](../packages/ui/src/styles/tokens.css)（`--study-flip-*`） |
| フリップ UI | [`packages/ui/src/components/xanki/study/study-flip-scene.tsx`](../packages/ui/src/components/xanki/study/study-flip-scene.tsx) |
| カード表示 | [`packages/ui/src/components/xanki/study/study-card-display.tsx`](../packages/ui/src/components/xanki/study/study-card-display.tsx) |
| 高さ計測 hook | [`packages/ui/src/hooks/use-flip-height.ts`](../packages/ui/src/hooks/use-flip-height.ts) |
| 高さ計測ロジック | [`packages/ui/src/lib/flip-metrics.ts`](../packages/ui/src/lib/flip-metrics.ts) |
| テキスト縦配置 hook | [`packages/ui/src/hooks/use-review-card-text-overflow.ts`](../packages/ui/src/hooks/use-review-card-text-overflow.ts) |
| デッキ学習セッション load | [`use-deck-study-session.ts`](../packages/ui/src/components/xanki/study/use-deck-study-session.ts) |
| study metrics recorder | [`use-study-session-recorder.ts`](../packages/ui/src/hooks/use-study-session-recorder.ts) |
| スマート学習キュー | [`study-progress.tsx`](../packages/ui/src/components/xanki/study/study-progress.tsx)（`useStudyQueue`） |

## DOM とスクロールの分担

```
.review-stage (grid: progress / meta / hint / slot / actions)
  └── .study-flip-slot          ← stage 内 flex 中央、overflow: visible
        └── .study-flip-scene   ← perspective
              └── .study-flip-inner   ← 高さロック (JS)、preserve-3d
                    ├── .study-flip-front
                    │     └── .review-card   ← 長文スクロールはここ (overflow-y: auto)
                    └── .study-flip-back
                          └── .review-card
  └── .review-actions           ← 操作ボタン（slot の外・grid row 5）
```

| レイヤ | スクロール | 備考 |
|--------|------------|------|
| `.study-session-body` / `.review-stage` | 原則なし（flip モード） | 長文はカード内へ閉じ込める |
| `.review-card`（表示中の面） | `overflow-y: auto` | スクロールバーは非表示（CSS） |
| 非表示面の `.review-card` | `overflow: hidden` | 静止時は `visibility: hidden` で隠す |

## 不変条件（変更前に確認）

1. **3D フリップと overflow**
   - `.study-flip-inner` に `overflow: hidden` を付けない（`preserve-3d` が壊れる）
   - 学習セッションの `.study-flip-slot` は **`overflow: visible`**（カード枠・影の見切れ防止）
   - フリップ中は祖先（`.study-session` 等）も `overflow: visible` に広げる（`.is-flipping-scene`）

2. **face の積み方**
   - `.study-flip-face` は **grid stack**（`grid-area: stack`）。`position: absolute` + `height: 100%` に戻さない（高さ計測と見切れの原因になる）

3. **高さ上限**
   - カード自然高さの上限 = `min(viewport トークン, slot / stage 残り高さ)`
   - viewport トークン: `--study-flip-max-vh`（0.58）、`--study-flip-max-h`（520px）
   - **`.review-actions` など slot 外の兄弟の高さ** を `resolveFlipMaxHeight()` が差し引く。viewport のみで clamp するとボタンと重なる

4. **テキスト縦配置**
   - 収まる → `justify-content: safe center`
   - スクロール必要 → `data-text-scrollable` で `flex-start`
   - `safe center` だけでは **`overflow-y: auto` の scroll 容器では不十分** なことがある（下記）

5. **Web / Tauri 共通**
   - 上記 CSS・hook はすべて `@xanki/ui`。`web/` と `xanki/` に別実装を増やさない

---

## 問題 1: カード・操作ボタンの見切れ / 重なり

### 症状

- ウィンドウ高さによって `.review-card` の上下が切れる
- 「AI に聞く」「答えを見る」等の `.review-actions` が半分隠れる、またはカードと重なる
- フリップ時に影や border が親でクリップされる

### よくある原因

| 原因 | 説明 |
|------|------|
| slot / stage に `overflow: hidden` | パディング外の shadow・outline が切れる |
| face を `position: absolute` で固定高 | 計測高さと表示高さがずれ、flex 残り領域を使えない |
| 高さ上限が viewport のみ | `58vh` 等だけ見て `.review-actions` 分を無視 |
| `.study-flip-inner` に `overflow: hidden` | 3D 変形の見た目が崩れる／クリップ |

### 修正の要点（現行）

- **CSS**: slot `overflow: visible`、face を grid stack、`.review-card` は `max-height: 100%` + 内部 `overflow-y: auto`
- **JS**: `flip-metrics.resolveFlipMaxHeight()` が `.study-flip-slot` と `.review-stage` の兄弟（actions 等）から残り高さを算出
- **JS**: `use-flip-height` が slot の `ResizeObserver` も監視し、ウィンドウリサイズで再計測

### デバッグ手順

1. DevTools で `.study-flip-slot` → `.review-card` の `max-height` / `clientHeight` を確認
2. `.review-stage` 内で slot より下にある兄弟（`.review-actions`、Leitner なら `.leitner-grade-actions`）の `offsetHeight` を足し合わせ、stage からはみ出していないか見る
3. 祖先に `overflow: hidden` がないか、`preserve-3d` の途中で clip されていないかを辿る
4. `use-flip-height` の `stackHeight` がフリップ前後で期待どおり更新されているか（`transitionend` 後に再計測）

---

## 問題 2: テキストの縦位置（中央 vs 上揃え）

### 期待挙動

| 条件 | 縦配置 |
|------|--------|
| 本文がカード内に収まる | カード高さの中央 |
| スクロールが必要 | 上揃え（先頭から読める） |

### なぜ CSS だけでは足りないか

- `justify-content: center` + `overflow-y: auto` だと、溢れた内容が **中央基準のまま** になり、上端までスクロールできないことがある
- `justify-content: safe center` は **clip される overflow** 向けの fallback で、`overflow: auto` では scroll で届くと判断され、中央のまま残る場合がある

### 現行実装

1. **CSS デフォルト**: `.review-card:has(.study-text-body)` → `justify-content: safe center`
2. **JS 計測**（[`use-review-card-text-overflow`](../packages/ui/src/hooks/use-review-card-text-overflow.ts)）:
   - `.study-text-body` の `scrollHeight` と、`.review-card` の `clientHeight − padding-block` を比較
   - 溢れれば `data-text-scrollable` を付与 → CSS で `justify-content: flex-start`
3. **再計測トリガ**: カード id、revealed、本文・解答、`ResizeObserver`（カード + body）

`StudyCardDisplay` はテキスト / Q&A のみ hook を有効化。画像カードは従来どおり（中央寄せ flex は `.image-card` 側）。

### デバッグ手順

1. `.review-card` に `data-text-scrollable` が付いているか
2. `body.scrollHeight` vs `card.clientHeight - padding` の関係
3. Q&A で **答え表示後**（`revealed`）に再計測されているか（`textOverflowKey` に answer を含む）
4. フリップで表裏の `scrollTop` が同期されているか（`use-flip-height` 内）

---

## 手動 QA チェックリスト

フリップ・レイアウト変更の PR では最低限以下を確認する。

### 見切れ・重なり

- [ ] ブラウザ / Tauri ウィンドウ高さを **大・中・小** に変えてもカード全体と `.review-actions` が見える
- [ ] デッキ学習（フラッシュカード）とスマート学習の **両方**
- [ ] フリップ中にカード shadow が切れない
- [ ] `prefers-reduced-motion: reduce` で即時切替してもレイアウトが崩れない

### テキスト縦配置

- [ ] **短い** テキスト / Q&A → カード内で縦中央
- [ ] **長い** テキスト → 上揃え、カード内スクロールで先頭から読める
- [ ] Q&A で答え表示後、必要なら上揃えに切り替わる
- [ ] フリップ後も表裏でスクロール位置が自然（長文時）

### 起動

```bash
pnpm dev:cloud      # Web
pnpm dev:desktop    # Tauri（Cloud API は別途 dev:cloud）
```

---

## 変更時のガイド

### CSS を触るとき

- `review.css` の `.study-session` ブロックと `@media (prefers-reduced-motion)` ブロックを **セットで** 確認
- スマート学習用 `.leitner-study-session` の flex レイアウトはデッキ学習と **別経路**（slot の `overflow` 等が分岐している）

### 高さロジックを触るとき

- 定数は `flip-metrics.ts` と `tokens.css` の **両方** と整合させる
- `measureReviewCard()` は一時的に `overflow: visible` で自然高さを測る。永久 style を残さない

### テキスト配置を触るとき

- hook の計測式（body vs padding 込み available）を変えたら、短い／長い／Q&A 答え表示の 3 パターンを再確認
- spec の [study.md §Q&A / テキスト](./spec/study.md) と矛盾しないこと

---

## 学習セッションのデータ読み込み（React hooks）

レイアウト以外の **学習キュー fetch・空表示・API 連打** に関する再発防止メモ。ユーザー向け WHAT は [study.md](./spec/study.md)。

### 典型パターン（罠）

```tsx
// ❌ hook が毎 render で新しいオブジェクトを返すと identity が毎回変わる
const recorder = useStudySessionRecorder();
const loadSession = useCallback(async () => { ... }, [recorder]);
useEffect(() => { void loadSession(); }, [loadSession]);
// → loadSession が毎 render 再生成 → useEffect が毎 render 実行 → setState → 無限ループ
```

Network では `GET /api/cards?deck_id=...` 等が **秒間数千〜万回**、コンソールは `Maximum update depth exceeded`。

### 不変条件（変更前に確認）

1. **`useEffect` / `useCallback` の deps に hook の戻りオブジェクトを丸ごと入れない**  
   必要なのは `beginDeckSession` 等の **関数** か、プリミティブ state だけ。
2. **カスタム hook がオブジェクトを返すとき**は `useMemo` で安定化する（[`use-study-session-recorder.ts`](../packages/ui/src/hooks/use-study-session-recorder.ts) 参照）。
3. **load 系 effect** は `ready`（または同等）を持ち、**空 UI は `ready === true` のあと**にだけ出す（読み込み中はローディング文言）。
4. **`try/finally`** で `ready` を必ず立てる。API 失敗時は `loadError` を表示し、空タイトルと混同しない。
5. **`startStudySession`（metrics）失敗は学習本体を止めない** — カード fetch が成功すればセッションは続行（metrics は任意）。

### 同様のリスクがある箇所

| ファイル | パターン | 備考 |
|----------|----------|------|
| [`use-deck-study-session.ts`](../packages/ui/src/components/xanki/study/use-deck-study-session.ts) | `loadSession` + `useEffect` | **今回の本番障害**。フラッシュカード |
| [`write-mode.tsx`](../packages/ui/src/components/xanki/study/write-mode.tsx) | `useEffect` 内 inline load + `recorder` deps | 修正済み（関数分解） |
| [`test-mode.tsx`](../packages/ui/src/components/xanki/study/test-mode.tsx) | 同上 | 同上 |
| [`match-mode.tsx`](../packages/ui/src/components/xanki/study/match-mode.tsx) | `loadSession` + `useEffect([loadSession])` | 同上 |
| [`learn-mode.tsx`](../packages/ui/src/components/xanki/study/learn-mode.tsx) | `useEffect` + `recorder` | `sessionStartedRef` で再入は抑止されていたが deps は関数分解推奨 |
| [`study-progress.tsx`](../packages/ui/src/components/xanki/study/study-progress.tsx) | `useStudyQueue` → `loadQueue` in deps | `loadQueue` は `useCallback([api, …])`。**現状 OK** |
| [`use-study-ai-ask.ts`](../packages/ui/src/hooks/use-study-ai-ask.ts) | 戻りオブジェクト | `useMemo` 化済み。deps に丸ごと入れない |
| [`use-main-app-state.ts`](../packages/ui/src/hooks/use-main-app-state.ts) | 戻りオブジェクト | App 側は分解利用。**丸ごと deps に入れない** |

新規 hook を足すときは上表を更新する。

### 症状 → 原因

| 症状 | 原因 |
|------|------|
| Network で同一 API が連打、Provisional headers | load effect の deps が毎 render 変化 → 無限 fetch |
| コンソール `Maximum update depth exceeded` | 上記 + load 内の `setState` |
| カードがあるのに「カードがありません」 | load ループで `current` が常に undefined、または `ready` 未確認で空 UI |
| 一覧には見えるが学習モードだけ空 | 学習だけ `getStudyCards` + `startStudySession` 経路。metrics 失敗で `ready` 未設定（旧実装） |

### デバッグ手順

1. DevTools **Network** — `/api/cards` 等の件数（正常は初回 + 明示的再読み込みのみ）
2. **Console** — `Maximum update depth exceeded` の有無
3. React **useEffect 依存** — hook 戻り値オブジェクトが deps に入っていないか
4. auth 401 等 — 単発失敗ならエラー UI、連打なら hooks ループを疑う

### 変更時ガイド

- `useStudySessionRecorder` を触ったら **戻り値の `useMemo` を維持**
- デッキ学習モードを新設するときは **`useDeckStudySession` を再利用**するか、同じ `ready` / `loadError` 契約に揃える
- PR では Network タブで API 件数が増えないことを確認

---

## 履歴メモ（2026-07）

| 事象 | 対応 |
|------|------|
| フラッシュカードで `/api/cards` 連打・「カードがありません」 | `useStudySessionRecorder` 戻り値を `useMemo` 化、`useDeckStudySession` で deps 分解 + `ready`/`loadError`。§学習セッションのデータ読み込み 参照 |
| 画面高さ依存でカード・操作ボタンが見切れ | slot `overflow: visible`、face grid 化、`resolveFlipMaxHeight` で stage 残り高さ、slot ResizeObserver |
| 長文テキストが中央のまま上までスクロールできない | `use-review-card-text-overflow` + `data-text-scrollable` |
