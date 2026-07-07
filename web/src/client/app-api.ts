import {
  createAppApi,
  mapApiCard,
  mapApiCardWithImagePath,
  mapApiDeck,
} from "@xanki/shared";
import type { AppApi, Card, DeckExport, ReviewCard } from "@xanki/shared";
import { cloudApi } from "./api";

function mapCard(raw: Parameters<typeof mapApiCard>[0]): Card {
  return mapApiCard(raw, { imagePath: raw.imageHash ?? undefined }) as Card;
}

async function toReviewCards(cards: Card[]): Promise<ReviewCard[]> {
  return cards.map((card) => ({
    card,
    imageUrl: card.imageHash ? cloudApi.blobUrl(card.imageHash) : undefined,
  }));
}

export function createCloudAppApi(onRevision?: () => void): AppApi {
  return createAppApi({
    cloud: cloudApi,
    mapCard,
    toReviewCards,
    notifyRevision: () => onRevision?.(),
    resolveImageUrl: (imagePath) => Promise.resolve(cloudApi.blobUrl(imagePath)),
    platform: {
      getLastUsedDeckId: async () => localStorage.getItem("xanki:lastUsedDeckId"),
      setLastUsedDeckId: (deckId) => {
        localStorage.setItem("xanki:lastUsedDeckId", deckId);
      },
    },
  });
}
