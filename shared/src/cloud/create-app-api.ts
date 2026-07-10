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

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function uploadImageBlob(cloud: CloudClient, data: ArrayBuffer, mime: string): Promise<string> {
  const hash = await sha256Hex(data);
  const prepare = await cloud.prepareBlob(hash, data.byteLength, mime);
  if (prepare.status === "upload") {
    await cloud.uploadBlob(hash, data, mime);
  }
  await cloud.commitBlob(hash);
  return hash;
}

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
    updateDeck: async (deckId, patch) => {
      const deck = mapDeck(await cloud.updateDeck(deckId, patch));
      notify();
      return deck;
    },
    getSchedulerConfig: async () =>
      (await cloud.getSchedulerConfig()).schedulerConfig,
    updateSchedulerConfig: async (config) => {
      const saved = await cloud.updateSchedulerConfig(config);
      notify();
      return saved.schedulerConfig;
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
    reorderCards: async (deckId, cardIds) => {
      await cloud.reorderCards(deckId, { cardIds });
      notify();
    },
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
    saveQaCards: async (request) => {
      platform.setLastUsedDeckId?.(request.deckId);
      const cards: Card[] = [];
      for (const card of request.cards) {
        cards.push(
          mapCard(
            await cloud.createCard({
              deckId: request.deckId,
              kind: "qa",
              content: card.content,
              answer: card.answer,
              masks: JSON.stringify(card.masks),
              note: card.note,
              sourceHint: card.sourceHint,
            }),
          ),
        );
      }
      notify();
      return cards;
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
    cardsGenerate: (request) => cloud.cardsGenerate(request),
    getAccount: () =>
      cloud.me().then((me) => ({
        plan: me.plan,
        aiCreditsRemaining: me.aiCreditsRemaining,
      })),
    uploadImageBlob: (data, mime) => uploadImageBlob(cloud, data, mime),
    askAi: (cardContext, question, signal) => cloud.askAi(cardContext, question, signal),
  };
}
