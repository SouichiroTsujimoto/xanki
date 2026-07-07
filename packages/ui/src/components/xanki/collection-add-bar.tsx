import { useAppApi } from "../../context/app-api-context";
import { copy } from "../../copy";

interface Props {
  deckId: string | null;
}

export function CollectionAddBar({ deckId }: Props) {
  const api = useAppApi();
  const hasCapture =
    api.triggerTextCapture != null && api.triggerScreenshotCapture != null;
  const hasManual = api.openNewCardEditor != null;

  if (!hasCapture && !hasManual) {
    return null;
  }

  const disabled = !deckId;

  return (
    <section className="collection-add-bar" aria-label={copy.cards.addSection}>
      {disabled && (
        <p className="add-bar-hint">{copy.cards.addHint}</p>
      )}
      <div className="add-bar-actions">
        {hasCapture && (
          <>
            <button
              type="button"
              className="ghost-button"
              disabled={disabled}
              onClick={() => void api.triggerTextCapture?.(deckId ?? undefined)}
            >
              {copy.cards.textCapture}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={disabled}
              onClick={() => void api.triggerScreenshotCapture?.(deckId ?? undefined)}
            >
              {copy.cards.screenshotCapture}
            </button>
          </>
        )}
        {hasCapture && hasManual && <span className="add-bar-divider" aria-hidden />}
        {hasManual && (
          <>
            <button
              type="button"
              className="ghost-button"
              disabled={disabled}
              onClick={() =>
                deckId &&
                void api.openNewCardEditor?.({ deckId, mode: "text" })
              }
            >
              {copy.cards.kindText}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={disabled}
              onClick={() =>
                deckId && void api.openNewCardEditor?.({ deckId, mode: "qa" })
              }
            >
              {copy.cards.kindQa}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={disabled}
              onClick={() =>
                deckId && void api.openNewCardEditor?.({ deckId, mode: "image" })
              }
            >
              {copy.cards.kindImage}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
