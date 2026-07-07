import { TextMaskComposerEmbedded } from "./mask/text-mask-composer";

interface Props {
  deckId: string | null;
}

/** デッキ学習タブ内のインラインカード作成エリア（マスクエディタ UI 再利用） */
export function CollectionAddBar({ deckId }: Props) {
  return <TextMaskComposerEmbedded deckId={deckId} />;
}
