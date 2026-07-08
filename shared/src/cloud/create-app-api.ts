import type { ApiCard } from "../library/api-types.js";
import {
  countDueCards,
  filterStudyCards,
  mapApiDeck,
  parseImageMasksJson,
  parseTextMasksJson,
} from "../library/cloud-mappers.js";
import type { CloudClient } from "./cloud-client.js";
import { getTzOffsetMinutes } from "../study/tz.js";
import type {
  AppApi,
  Card,
  DeckExport,
  EditorInitPayload,
  ImageRegion,
  OcrResult,
  ReviewCard,
} from "../library/app-api-types.js";

const unsupported = (feature: string) => () => {
  throw new Error(`${feature} はこのプラットフォームでは未対応です`);
};

export interface AppApiPlatform {
  getLastUsedDeckId?: () => Promise<string | null>;
  setLastUsedDeckId?: (deckId: string) => void;
  exportDeck?: (deckId: string) => Promise<DeckExport>;
  importDeck?: (data: DeckExport) => Promise<void>;
  openCardEditor?: (cardId: string, card: Card) => Promise<void>;
  saveImageCards?: (request: {
    deckId: string;
    imagePath: string;
    ocrText?: string;
    ocrData?: string;
    regions: ImageRegion[];
    sourceHint?: string;
  }) => Promise<Card[]>;
  updateImageCard?: AppApi["updateImageCard"];
  runOcr?: (imagePath: string) => Promise<OcrResult>;
  getEditorInit?: (windowLabel: string) => Promise<EditorInitPayload | null>;
  openAccessibilitySettings?: () => Promise<void>;
  openScreenRecordingSettings?: () => Promise<void>;
  triggerTextCapture?: (deckId?: string) => Promise<void>;
  triggerScreenshotCapture?: (deckId?: string) => Promise<void>;
  openNewCardEditor?: AppApi["openNewCardEditor"];
  subscribeDataChanged?: (listener: () => void) => () => void;
}

export interface CreateAppApiDeps {
  cloud: CloudClient;
  mapCard: (raw: ApiCard) => Card;
  toReviewCards: (cards: Card[]) => Promise<ReviewCard[]>;
  notifyRevision: () => void;
  resolveImageUrl: (imagePath: string) => Promise<string>;
  platform?: AppApiPlatform;
}

export function createAppApi(deps: CreateAppApiDeps): AppApi {
  const { cloud, mapCard, toReviewCards, notifyRevision, resolveImageUrl, platform = {} } = deps;
  const notify = () => notifyRevision();

  const mapDeck = (raw: Parameters<typeof mapApiDeck>[0]) => mapApiDeck(raw);

  return {
    listDecks: async () => (await cloud.listDecks()).map(mapDeck),
    createDeck: async (name) => {
      const deck = mapDeck(await cloud.createDeck(name));
      notify();
      return deck;
    },
    updateDeck: async (deckId, name) => {
      const deck = mapDeck(await cloud.updateDeck(deckId, name));
      notify();
      return deck;
    },
    deleteDeck: async (deckId) => {
      await cloud.deleteDeck(deckId);
      notify();
    },
    getLastUsedDeckId: platform.getLastUsedDeckId ?? (async () => null),
    exportDeck:
      platform.exportDeck ??
      unsupported("デッキエクスポート"),
    importDeck:
      platform.importDeck ??
      unsupported("デッキインポート"),
    listCards: async (deckId, query) =>
      (await cloud.listCards(deckId, query)).map(mapCard),
    getCard: async (cardId) => mapCard(await cloud.getCard(cardId)),
    deleteCard: async (cardId) => {
      await cloud.deleteCard(cardId);
      notify();
    },
    openCardEditor:
      platform.openCardEditor
        ? async (cardId) => platform.openCardEditor!(cardId, mapCard(await cloud.getCard(cardId)))
        : unsupported("カードエディタ"),
    submitReview: async (cardId, result) => {
      await cloud.submitReview({
        cardId,
        result,
        tzOffsetMinutes: getTzOffsetMinutes(),
      });
      notify();
    },
    getStudyMetrics: (deckId, tzOffsetMinutes) =>
      cloud.getStudyMetrics(deckId, tzOffsetMinutes ?? getTzOffsetMinutes()),
    startStudySession: (request) => cloud.startStudySession(request),
    recordStudyEvents: async (sessionId, payload) => {
      await cloud.recordStudyEvents(sessionId, payload);
    },
    completeStudySession: async (sessionId, payload) => {
      await cloud.completeStudySession(sessionId, payload);
    },
    getDueCount: async () => countDueCards(await cloud.listCards()),
    getDueCards: async (deckId, limit) => {
      const cards = (await cloud.listCards(deckId)).map(mapCard);
      const filtered = filterStudyCards(cards, "due", deckId).slice(0, limit ?? 50);
      return toReviewCards(filtered);
    },
    getStudyCards: async (filter, deckId, limit) => {
      const cards = (await cloud.listCards(deckId)).map(mapCard);
      const filtered = filterStudyCards(cards, filter, deckId).slice(0, limit ?? 200);
      return toReviewCards(filtered);
    },
    subscribeLibraryChanged: platform.subscribeDataChanged,
    resolveImageUrl,
    parseTextMasks: parseTextMasksJson,
    parseImageMasks: parseImageMasksJson,
    saveTextCard: async (request) => {
      platform.setLastUsedDeckId?.(request.deckId);
      const card = mapCard(
        await cloud.createCard({
          deckId: request.deckId,
          kind: "text",
          content: request.content,
          masks: JSON.stringify(request.masks),
          note: request.note,
          sourceHint: request.sourceHint,
        }),
      );
      notify();
      return card;
    },
    saveQaCard: async (request) => {
      platform.setLastUsedDeckId?.(request.deckId);
      const card = mapCard(
        await cloud.createCard({
          deckId: request.deckId,
          kind: "qa",
          content: request.content,
          answer: request.answer,
          masks: JSON.stringify(request.masks),
          note: request.note,
          sourceHint: request.sourceHint,
        }),
      );
      notify();
      return card;
    },
    updateTextCard: async (request) => {
      const card = mapCard(
        await cloud.updateCard(request.cardId, {
          deckId: request.deckId,
          content: request.content,
          masks: JSON.stringify(request.masks),
          note: request.note,
        }),
      );
      notify();
      return card;
    },
    updateQaCard: async (request) => {
      const card = mapCard(
        await cloud.updateCard(request.cardId, {
          deckId: request.deckId,
          content: request.content,
          answer: request.answer,
          masks: JSON.stringify(request.masks),
          note: request.note,
        }),
      );
      notify();
      return card;
    },
    saveImageCards: platform.saveImageCards
      ? async (request) => {
          platform.setLastUsedDeckId?.(request.deckId);
          const cards = await platform.saveImageCards!(request);
          notify();
          return cards;
        }
      : unsupported("画像カード保存"),
    updateImageCard: platform.updateImageCard
      ? async (request) => {
          const card = await platform.updateImageCard!(request);
          notify();
          return card;
        }
      : unsupported("画像カード更新"),
    runOcr: platform.runOcr ?? unsupported("OCR"),
    getEditorInit: platform.getEditorInit ?? (async () => null),
    openAccessibilitySettings:
      platform.openAccessibilitySettings ?? (async () => {}),
    openScreenRecordingSettings:
      platform.openScreenRecordingSettings ?? (async () => {}),
    triggerTextCapture: platform.triggerTextCapture,
    triggerScreenshotCapture: platform.triggerScreenshotCapture,
    openNewCardEditor: platform.openNewCardEditor,
    qaGenerate: (text, kind, count) => cloud.qaGenerate(text, kind, count),
    askAi: (cardContext, question, signal) => cloud.askAi(cardContext, question, signal),
  };
}
