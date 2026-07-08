import { TextMaskComposerEmbedded } from "./mask/text-mask-composer";

interface Props {
  deckId: string | null;
  onAiCardsSaved?: () => void;
}

/** デッキ学習タブ内のインラインカード作成エリア（マスクエディタ UI 再利用） */
export function CollectionAddBar({ deckId, onAiCardsSaved }: Props) {
  return <TextMaskComposerEmbedded deckId={deckId} onAiCardsSaved={onAiCardsSaved} />;
}
