import { convertFileSrc } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import type { ApiCard } from "@xanki/shared";
import type {
  AppApi,
  Card,
  Deck,
  DeckExport,
  EditorInitPayload,
  ReviewCard,
  StudyFilter,
} from "@xanki/ui";
import { cloud, ensureLocalImage, readLocalImageBytes } from "./client";
import { nativeApi, parseImageMasks, parseTextMasks } from "../tauri/native-api";

const LAST_DECK_KEY = "xanki:lastUsedDeckId";

function mapDeck(raw: {
  id: string;
  name: string;
  cardCount?: number;
  createdAt?: number;
  updatedAt?: number;
}): Deck {
  return {
    id: raw.id,
    name: raw.name,
    cardCount: raw.cardCount ?? 0,
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? Date.now(),
  };
}

function mapCard(raw: ApiCard): Card {
  return {
    id: raw.id,
    deckId: raw.deckId,
    kind: raw.kind,
    content: raw.content ?? undefined,
    answer: raw.answer ?? undefined,
    imageHash: raw.imageHash ?? undefined,
    imagePath: raw.imageHash ? `images/${raw.imageHash}.webp` : undefined,
    ocrText: raw.ocrText ?? undefined,
    ocrData: raw.ocrData ?? undefined,
    masks: raw.masks,
    note: raw.note ?? undefined,
    sourceHint: raw.sourceHint ?? undefined,
    starred: Boolean(raw.starred),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    boxNum: raw.boxNum,
    dueAt: raw.dueAt,
  };
}

function filterStudyCards(cards: Card[], filter: StudyFilter, deckId?: string): Card[] {
  const now = Date.now();
  let filtered = cards;
  if (deckId) filtered = filtered.filter((c) => c.deckId === deckId);
  switch (filter) {
    case "due":
      return filtered.filter((c) => (c.dueAt ?? 0) <= now);
    case "starred":
      return filtered.filter((c) => c.starred);
    default:
      return filtered;
  }
}

async function toReviewCards(cards: Card[]): Promise<ReviewCard[]> {
  const out: ReviewCard[] = [];
  for (const card of cards) {
    let imageUrl: string | undefined;
    if (card.imageHash) {
      try {
        const path = await ensureLocalImage(card.imageHash);
        imageUrl = convertFileSrc(await nativeApi.resolveImageUrl(path));
      } catch {
        imageUrl = `${import.meta.env.VITE_CLOUD_URL ?? "http://localhost:8787"}/api/blobs/${card.imageHash}`;
      }
    }
    out.push({ card, imageUrl });
  }
  return out;
}

async function uploadImageHash(relativePath: string): Promise<string> {
  const bytes = await readLocalImageBytes(relativePath);
  const hash = relativePath.match(/images\/([a-f0-9]{64})\.webp/)?.[1];
  if (!hash) throw new Error("invalid_image_path");
  const prepare = await cloud.prepareBlob(hash, bytes.byteLength, "image/webp");
  if (prepare.status === "upload") {
    await cloud.uploadBlob(hash, bytes.slice().buffer, "image/webp");
  }
  await cloud.commitBlob(hash);
  return hash;
}

export function createCloudAppApi(onLibraryChanged?: () => void): AppApi {
  const notify = () => {
    onLibraryChanged?.();
  };

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
    getLastUsedDeckId: async () => localStorage.getItem(LAST_DECK_KEY),
    exportDeck: async (deckId) => {
      const deck = mapDeck((await cloud.listDecks()).find((d) => d.id === deckId) ?? {
        id: deckId,
        name: "",
      });
      const cards = (await cloud.listCards(deckId)).map(mapCard);
      return { deck, cards };
    },
    importDeck: async (data: DeckExport) => {
      let deckId = data.deck.id;
      try {
        await cloud.createDeck(data.deck.name);
        const decks = await cloud.listDecks();
        deckId = decks.find((d) => d.name === data.deck.name)?.id ?? deckId;
      } catch {
        deckId = (await cloud.createDeck(data.deck.name)).id;
      }
      for (const card of data.cards) {
        await cloud.createCard({
          deckId,
          kind: card.kind,
          content: card.content ?? undefined,
          answer: card.answer ?? undefined,
          imageHash: card.imageHash ?? undefined,
          ocrText: card.ocrText ?? undefined,
          ocrData: card.ocrData ?? undefined,
          masks: card.masks,
          note: card.note ?? undefined,
          sourceHint: card.sourceHint ?? undefined,
        });
      }
      notify();
    },
    listCards: async (deckId, query) =>
      (await cloud.listCards(deckId, query)).map(mapCard),
    getCard: async (cardId) => mapCard(await cloud.getCard(cardId)),
    deleteCard: async (cardId) => {
      await cloud.deleteCard(cardId);
      notify();
    },
    toggleStar: async (cardId) => mapCard(await cloud.toggleStar(cardId)),
    openCardEditor: async (cardId) => {
      const card = mapCard(await cloud.getCard(cardId));
      let imagePath: string | undefined;
      if (card.imageHash) {
        imagePath = await ensureLocalImage(card.imageHash);
      }
      const payload: EditorInitPayload = {
        mode: card.kind === "qa" ? "qa" : card.kind === "image" ? "image" : "text",
        content: card.content ?? undefined,
        answer: card.answer ?? undefined,
        imagePath,
        cardId: card.id,
        deckId: card.deckId,
        masks: card.masks,
        note: card.note ?? undefined,
        ocrText: card.ocrText ?? undefined,
        ocrData: card.ocrData ?? undefined,
      };
      await invoke("open_editor_with_payload", { payload });
    },
    submitReview: async (cardId, result) => {
      await cloud.submitReview({ cardId, result });
      notify();
    },
    getDueCount: async () => {
      const cards = await cloud.listCards();
      const now = Date.now();
      return cards.filter((c) => Number(c.dueAt ?? 0) <= now).length;
    },
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
    resolveImageUrl: async (imagePath) =>
      convertFileSrc(await nativeApi.resolveImageUrl(imagePath)),
    parseTextMasks,
    parseImageMasks,
    saveTextCard: async (request) => {
      localStorage.setItem(LAST_DECK_KEY, request.deckId);
      const card = await cloud.createCard({
        deckId: request.deckId,
        kind: "text",
        content: request.content,
        masks: JSON.stringify(request.masks),
        note: request.note,
        sourceHint: request.sourceHint,
      });
      notify();
      return mapCard(card);
    },
    saveQaCard: async (request) => {
      localStorage.setItem(LAST_DECK_KEY, request.deckId);
      const card = await cloud.createCard({
        deckId: request.deckId,
        kind: "qa",
        content: request.content,
        answer: request.answer,
        masks: JSON.stringify(request.masks),
        note: request.note,
        sourceHint: request.sourceHint,
      });
      notify();
      return mapCard(card);
    },
    updateTextCard: async (request) => {
      const card = await cloud.updateCard(request.cardId, {
        deckId: request.deckId,
        content: request.content,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    updateQaCard: async (request) => {
      const card = await cloud.updateCard(request.cardId, {
        deckId: request.deckId,
        content: request.content,
        answer: request.answer,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    saveImageCards: async (request) => {
      localStorage.setItem(LAST_DECK_KEY, request.deckId);
      const processed = await invoke<
        Array<{
          relativePath: string;
          hash: string;
          masks: string;
          note?: string;
          ocrText?: string;
          ocrData?: string;
        }>
      >("process_image_cards", { request });
      const saved: Card[] = [];
      for (const item of processed) {
        const hash = await uploadImageHash(item.relativePath);
        const card = await cloud.createCard({
          deckId: request.deckId,
          kind: "image",
          imageHash: hash,
          ocrText: item.ocrText ?? request.ocrText ?? undefined,
          ocrData: item.ocrData ?? request.ocrData ?? undefined,
          masks: item.masks,
          note: item.note ?? undefined,
          sourceHint: request.sourceHint ?? undefined,
        });
        saved.push(mapCard(card));
      }
      notify();
      return saved;
    },
    updateImageCard: async (request) => {
      const card = await cloud.updateCard(request.cardId, {
        deckId: request.deckId,
        masks: JSON.stringify(request.masks),
        note: request.note,
        ocrText: request.ocrText,
        ocrData: request.ocrData,
      });
      notify();
      return mapCard(card);
    },
    runOcr: (imagePath) => nativeApi.runOcr(imagePath),
    getEditorInit: (windowLabel) => nativeApi.getEditorInit(windowLabel),
    openAccessibilitySettings: () => nativeApi.openAccessibilitySettings(),
    openScreenRecordingSettings: () => nativeApi.openScreenRecordingSettings(),
    triggerTextCapture: (deckId) => nativeApi.triggerTextCapture(deckId),
    triggerScreenshotCapture: (deckId) => nativeApi.triggerScreenshotCapture(deckId),
    openNewCardEditor: (request) => nativeApi.openNewCardEditor(request),
    subscribeLibraryChanged: () => () => {},
  };
}
