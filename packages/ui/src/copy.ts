import type { DeckStudyMode, StudyMode } from "./types";

/** ユーザー向け UI 文言 SSOT — 正本: docs/spec/glossary.md */
export const copy = {
  nav: {
    home: "ホーム",
    deckStudy: "デッキ学習",
    leitner: "Leitner学習",
    settings: "設定",
    homeHint: "デッキ",
    deckStudyHint: "フラッシュカードで学習",
    leitnerHint: "今日の due",
    settingsHint: "設定",
  },
  topbar: {
    home: "ホーム",
    deckStudyDefault: "デッキ学習",
    leitnerDefault: "Leitner学習",
    settings: "設定",
    sessionLabel: "復習中",
  },
  sidebar: {
    captureSection: "取込",
    textCapture: "テキスト",
    screenshotCapture: "スクショ",
    open: "サイドバーを開く",
    close: "サイドバーを閉じる",
    closeScrim: "サイドバーを閉じる",
  },
  tray: {
    reviewCount: (count: number) => `今日の復習: ${count}件`,
    openHome: "ホームを開く",
  },
  home: {
    currentDeck: "現在のデッキ",
    getStarted: "はじめに",
    pickDeck: "デッキを選びましょう",
    newDeckPlaceholder: "新しいデッキの名前",
    noDecksTitle: "デッキがありません",
    noDecksCopy: "上のフォームから最初のデッキを作成してください。",
    decksSection: "デッキ一覧",
    goToDeckStudy: "デッキ学習へ",
  },
  deckStudy: {
    hubTitle: "学習を始める",
    modesEyebrow: "学習モード",
    modesAriaLabel: "学習モード",
    shuffle: "シャッフル",
    back: "戻る",
    searchPlaceholder: "カードを検索...",
    cardPreview: "カードプレビュー",
    coverflowAria: "デッキカード",
    selectDeckTitle: "デッキが選択されていません",
    selectDeckCopy: "ホームでデッキを選んでから学習を始めてください。",
    emptyEyebrow: "デッキ学習",
    sessionRemaining: (remaining: number, total: number) => `残り ${remaining} / ${total}`,
    known: "覚えた",
    still: "まだ",
    sessionCompleteTitle: "このデッキの仕上げが完了しました",
    sessionCompleteCopy: "すべてのカードを覚えました。",
    sessionRestart: "もう一度",
  },
  leitnerStudy: {
    hubTitle: "Leitner学習",
    hubEyebrow: "定着",
    dueToday: (count: number) => `今日 ${count} 件`,
    dueBannerSuffix: "件が復習待ち",
    startAllHero: "復習を始める",
    startAllHint: "全デッキの due をランダムに復習",
    goFromHome: "Leitner学習へ",
    sessionActiveLabel: "復習中",
    decksSection: "デッキ別",
    deckDue: (count: number) => `${count} 件`,
    back: "戻る",
    completeTitle: "今日の Leitner 学習は完了です",
    completeHint: "⌥⌘M / ⌥⌘S で新しいカードを追加できます。",
    deckSessionCompleteTitle: "このデッキの復習は完了しました",
    deckSessionCompleteCopy: (remaining: number) =>
      `他デッキにあと ${remaining} 件の復習があります。`,
    backToHub: "Leitner 学習に戻る",
    emptyEyebrow: "Leitner学習",
    hint: "Space / クリック 答え · 1 再度 · 2 難しい · 3 良好 · 4 簡単",
    gradeAgain: "再度",
    gradeHard: "難しい",
    gradeGood: "良好",
    gradeEasy: "簡単",
  },
  studyModes: {
    flashcards: {
      label: "フラッシュカード",
      desc: "答えを確認しながら全カードを巡る",
    },
    learn: {
      label: "Leitner",
      desc: "due カードを定着させる",
    },
    write: {
      label: "書く",
      desc: "マスク部分を入力して思い出す",
    },
    test: {
      label: "テスト",
      desc: "4 択で正解を選ぶ",
    },
    match: {
      label: "マッチ",
      desc: "問題と答えのペアを組み合わせる",
    },
  } satisfies Record<
    StudyMode,
    { label: string; desc: string }
  >,
  cards: {
    sectionEyebrow: "カード",
    addSection: "カードの追加",
    addHint: "ホームでデッキを選んでからカードを追加してください。",
    composerHint: "テキストを入力し、マスクしたい部分を選択して + マスク",
    composerPlaceholder: "暗記したいテキストを入力...",
    composerSave: "カードを追加",
    composerSaving: "追加中...",
    emptyTitle: "カードがまだありません",
    emptyCopy: "上の入力欄から最初のカードを追加してください。",
    textCapture: "テキスト取込",
    screenshotCapture: "スクショ取込",
    kindText: "テキスト",
    kindQa: "Q&A",
    kindImage: "画像",
    previewAria: (kind: string) => `${kind} カードをプレビュー`,
    deleteTitle: "カードを削除しますか？",
  },
  capture: {
    text: "テキスト取込",
    screenshot: "スクショ取込",
  },
  editor: {
    deck: "デッキ",
    note: "メモ",
    notePlaceholder: "任意",
    createText: "暗記カード作成",
    editText: "テキストを編集",
    editTextTitle: "テキスト編集 ✦",
    createQa: "一問一答作成 ✦",
    editQa: "一問一答編集 ✦",
    editQaEyebrow: "Q&A を編集",
    editTextEyebrow: "テキストを編集",
    createImage: "暗記カード作成 ✦",
    editImage: "スクショ編集 ✦",
    qaToggle: "一問一答形式にする",
    qaExit: "問題文と解答を連結してマスク編集に戻す",
    questionLabel: "問題文",
    answerLabel: "解答",
    answerPlaceholder: "解答を入力...",
    maskCount: (count: number) => `${count} マスク`,
    addMask: "+ マスク",
    saveHint: "⌘Enter 保存 · Esc キャンセル",
    maskMode: "マスク",
    ocrMode: "OCR",
    zoomOut: "縮小",
    zoomIn: "拡大",
    maskColor: "マスクの色",
    removeMask: "マスクを削除",
    removeMaskTitle: "クリックで削除",
  },
  login: {
    eyebrow: "ログイン",
    title: "Google でログイン",
    googleButton: "Google で続ける",
    sessionExpired: "セッションの有効期限が切れました。再度ログインしてください。",
    brandDescription: "クラウドでデッキを同期し、どこからでも学習できます。",
  },
  settings: {
    shortcutsEyebrow: "ショートカット",
    shortcutsTitle: "ショートカット",
    permissionsEyebrow: "権限",
    permissionsTitle: "権限",
    studyEyebrow: "学習",
    studyTitle: "学習",
    maskEyebrow: "マスク",
    maskTitle: "マスク表示",
    studyNote:
      "「デッキ学習」で試験前の仕上げ、「Leitner学習」で due カードの定着を行います。ホームではデッキ操作、デッキ学習タブではカードの編集・スター、デッキのエクスポート/インポートも利用できます。",
    maskNote:
      "復習時のマスクは Black で不透明表示されます。アクセントカラーは Chartreuse（#CEFF1A）です。",
    refreshPermissions: "権限状態を再確認",
    granted: "許可済み",
    denied: "未許可",
    openSettings: "設定を開く",
  },
  billing: {
    eyebrow: "課金",
    title: "プラン",
    currentPlan: (plan: string) => `現在のプラン: ${plan}`,
    upgradePro: "Pro にアップグレード",
    webOcrNote: "Web では OCR 取込は利用できません。",
  },
  account: {
    title: "アカウント",
    loggedInAs: (email: string) => `ログイン中: ${email}`,
  },
  writeMode: {
    emptyTitle: "書く問題がありません",
    emptyCopy: "テキストカードにマスクを追加すると、書くモードで出題されます。",
    completeEyebrow: "書く",
    promptEyebrow: "問題",
    answerPlaceholder: "答えを入力...",
    retry: "もう一度",
  },
  testMode: {
    emptyTitle: "テスト問題がありません",
    emptyCopy: "マスク付きカードが2枚以上あると、選択問題を生成できます。",
    completeEyebrow: "テスト",
    questionEyebrow: "問題",
    retry: "もう一度",
  },
  matchMode: {
    emptyTitle: "マッチ問題がありません",
    emptyCopy: "マスク付きカードが1枚以上必要です。",
    completeEyebrow: "マッチ",
    completeTitle: "すべて一致しました!",
    retry: "もう一度",
  },
  flashcardsMode: {
    emptyTitle: "カードがありません",
    emptyCopy: "カードを追加するか、別のデッキを選んでください。",
  },
  common: {
    answer: "解答",
    cancel: "キャンセル",
    search: "検索",
    deleteDeckTitle: "デッキを削除しますか？",
  },
  ai: {
    studyTitle: "AI に聞く",
    studyHint: "カードの内容について質問できます。",
    studyQuestionLabel: "質問",
    studyQuestionPlaceholder: "例: この用語をもっと詳しく教えて",
    studyPresetDetail: "もっと詳しく",
    studyPresetExample: "例を教えて",
    studySend: "送信",
    studySending: "送信中...",
    studyLoading: "回答を生成中...",
    studyAskButton: "AI に聞く",
    generateTitle: "AI で生成",
    generateHint: "ソーステキストから一問一答を自動生成します。",
    generateSourceLabel: "ソーステキスト",
    generateAction: "生成",
    generateLoading: "生成中...",
    generateApply: "この Q&A を使う",
    generateButton: "AI で生成",
    errorUnavailable:
      "AI が利用できません。Cloudflare AI Gateway の設定を確認してください。",
    errorAuthFailed:
      "AI Gateway の認証に失敗しました。Settings の Create authentication token で発行したトークンを AI_GATEWAY_TOKEN に設定してください。",
    errorProviderUnavailable:
      "選択した AI モデルが利用できません。Unified Billing 非対応のモデル（DeepSeek 等）は Gateway にプロバイダ API キー（BYOK）を登録するか、対応モデルに変更してください。",
    errorPaymentRequired: "AI 機能は Pro プランで利用できます。",
    errorRateLimited: "リクエストが多すぎます。しばらく待ってから再試行してください。",
    errorGeneric: "AI の応答を取得できませんでした。",
  },
} as const;

export const studyModeList = (
  Object.entries(copy.studyModes) as [StudyMode, (typeof copy.studyModes)[StudyMode]][]
).map(([id, mode]) => ({ id, ...mode }));

export const deckStudyModeList = studyModeList.filter(
  (mode): mode is (typeof studyModeList)[number] & { id: DeckStudyMode } =>
    mode.id !== "learn",
);

export function cardKindLabel(kind: string): string {
  switch (kind) {
    case "text":
      return copy.cards.kindText;
    case "qa":
      return copy.cards.kindQa;
    case "image":
      return copy.cards.kindImage;
    default:
      return kind;
  }
}
