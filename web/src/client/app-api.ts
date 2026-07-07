import {
  countDueCards,
  filterStudyCards,
  mapApiCard,
  mapApiDeck,
  parseImageMasksJson,
  parseTextMasksJson,
} from "@xanki/shared";
import type { AppApi, Card, DeckExport, ReviewCard } from "@xanki/ui";
import { cloudApi } from "./api";

function mapDeck(raw: Parameters<typeof mapApiDeck>[0]) {
  return mapApiDeck(raw);
}

function mapCard(raw: Parameters<typeof mapApiCard>[0]): Card {
  return mapApiCard(raw, { imagePath: raw.imageHash ?? undefined }) as Card;
}

function toReviewCards(cards: Card[]): ReviewCard[] {
  return cards.map((card) => ({
    card,
    imageUrl: card.imageHash ? cloudApi.blobUrl(card.imageHash) : undefined,
  }));
}

export function createCloudAppApi(onRevision?: () => void): AppApi {
  const notify = () => onRevision?.();

  return {
    listDecks: async () => (await cloudApi.listDecks()).map(mapDeck),
    createDeck: async (name) => {
      const deck = mapDeck(await cloudApi.createDeck(name));
      notify();
      return deck;
    },
    updateDeck: async (deckId, name) => {
      const deck = mapDeck(await cloudApi.updateDeck(deckId, name));
      notify();
      return deck;
    },
    deleteDeck: async (deckId) => {
      await cloudApi.deleteDeck(deckId);
      notify();
    },
    getLastUsedDeckId: async () => null,
    exportDeck: async () => {
      throw new Error("Web ではエクスポート未対応");
    },
    importDeck: async (_data: DeckExport) => {
      throw new Error("Web ではインポート未対応");
    },
    listCards: async (deckId, query) => (await cloudApi.listCards(deckId, query)).map(mapCard),
    getCard: async (cardId) => mapCard(await cloudApi.getCard(cardId)),
    deleteCard: async (cardId) => {
      await cloudApi.deleteCard(cardId);
      notify();
    },
    toggleStar: async (cardId) => mapCard(await cloudApi.toggleStar(cardId)),
    openCardEditor: async () => {
      throw new Error("Web ではエディタ未対応");
    },
    submitReview: async (cardId, result) => {
      await cloudApi.submitReview({ cardId, result });
      notify();
    },
    getDueCount: async () => {
      const cards = await cloudApi.listCards();
      return countDueCards(cards);
    },
    getDueCards: async (deckId) => {
      const cards = (await cloudApi.listCards(deckId)).map(mapCard);
      return toReviewCards(filterStudyCards(cards, "due", deckId));
    },
    getStudyCards: async (filter, deckId) => {
      const cards = (await cloudApi.listCards(deckId)).map(mapCard);
      return toReviewCards(filterStudyCards(cards, filter, deckId));
    },
    subscribeLibraryChanged: () => () => {},
    resolveImageUrl: (imagePath) => Promise.resolve(cloudApi.blobUrl(imagePath)),
    parseTextMasks: parseTextMasksJson,
    parseImageMasks: parseImageMasksJson,
    saveTextCard: async (request) => {
      const card = await cloudApi.createCard({
        deckId: request.deckId,
        kind: "text",
        content: request.content,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    saveQaCard: async (request) => {
      const card = await cloudApi.createCard({
        deckId: request.deckId,
        kind: "qa",
        content: request.content,
        answer: request.answer,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    updateTextCard: async (request) => {
      const card = await cloudApi.updateCard(request.cardId, {
        deckId: request.deckId,
        content: request.content,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    updateQaCard: async (request) => {
      const card = await cloudApi.updateCard(request.cardId, {
        deckId: request.deckId,
        content: request.content,
        answer: request.answer,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    saveImageCards: async () => {
      throw new Error("Web では画像取込未対応");
    },
    updateImageCard: async () => {
      throw new Error("Web では画像編集未対応");
    },
    runOcr: async () => {
      throw new Error("Web では OCR 未対応");
    },
    getEditorInit: async () => null,
    openAccessibilitySettings: async () => {},
    openScreenRecordingSettings: async () => {},
  };
}
