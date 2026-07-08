import {
  createAppApi,
  mapApiCard,
} from "@xanki/shared";
import type { AppApi, Card, DeckExport, ReviewCard } from "@xanki/shared";
import { resolveAuthenticatedBlobUrl } from "./blob-url";
import { cloudApi } from "./client";
import {
  getLastUsedDeckIdPref,
  setLastUsedDeckIdPref,
} from "./session";

function mapCard(raw: Parameters<typeof mapApiCard>[0]): Card {
  return mapApiCard(raw, { imagePath: raw.imageHash ?? undefined }) as Card;
}

async function toReviewCards(cards: Card[]): Promise<ReviewCard[]> {
  const out: ReviewCard[] = [];
  for (const card of cards) {
    let imageUrl: string | undefined;
    const imageKey = card.imagePath ?? card.imageHash;
    if (card.kind === "image" && imageKey) {
      try {
        imageUrl = await resolveAuthenticatedBlobUrl(imageKey);
      } catch {
        imageUrl = undefined;
      }
    }
    out.push({ card, imageUrl });
  }
  return out;
}

export function createCloudAppApi(onRevision?: () => void): AppApi {
  return createAppApi({
    cloud: cloudApi,
    mapCard,
    toReviewCards,
    notifyRevision: () => onRevision?.(),
    resolveImageUrl: resolveAuthenticatedBlobUrl,
    platform: {
      getLastUsedDeckId: getLastUsedDeckIdPref,
      setLastUsedDeckId: (deckId) => {
        void setLastUsedDeckIdPref(deckId);
      },
    },
  });
}

export type { DeckExport };
