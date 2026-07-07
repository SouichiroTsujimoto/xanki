import { convertFileSrc } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import {
  createAppApi,
  mapApiCardWithImagePath,
  mapApiDeck,
} from "@xanki/shared";
import type { AppApi, Card, DeckExport, EditorInitPayload } from "@xanki/shared";
import { cloud, ensureLocalImage, readLocalImageBytes } from "./client";
import { nativeApi } from "../tauri/native-api";

const LAST_DECK_KEY = "xanki:lastUsedDeckId";
const dataChangedListeners = new Set<() => void>();

function mapCard(raw: Parameters<typeof mapApiCardWithImagePath>[0]) {
  return mapApiCardWithImagePath(raw, (hash) => `images/${hash}.webp`) as Card;
}

async function toReviewCards(cards: Card[]) {
  const out: Awaited<ReturnType<AppApi["getDueCards"]>> = [];
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

export function createCloudAppApi(onDataChanged?: () => void): AppApi {
  const notifyRevision = () => {
    onDataChanged?.();
    for (const listener of dataChangedListeners) {
      listener();
    }
    void emit("xanki:data-changed", {}).catch(() => {});
  };

  return createAppApi({
    cloud,
    mapCard,
    toReviewCards,
    notifyRevision,
    resolveImageUrl: async (imagePath) =>
      convertFileSrc(await nativeApi.resolveImageUrl(imagePath)),
    platform: {
      getLastUsedDeckId: async () => localStorage.getItem(LAST_DECK_KEY),
      setLastUsedDeckId: (deckId) => localStorage.setItem(LAST_DECK_KEY, deckId),
      exportDeck: async (deckId) => {
        const deck = mapApiDeck(
          (await cloud.listDecks()).find((d) => d.id === deckId) ?? { id: deckId, name: "" },
        );
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
      },
      openCardEditor: async (_cardId, card) => {
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
      saveImageCards: async (request) => {
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
          saved.push(
            mapCard(
              await cloud.createCard({
                deckId: request.deckId,
                kind: "image",
                imageHash: hash,
                ocrText: item.ocrText ?? request.ocrText ?? undefined,
                ocrData: item.ocrData ?? request.ocrData ?? undefined,
                masks: item.masks,
                note: item.note ?? undefined,
                sourceHint: request.sourceHint ?? undefined,
              }),
            ),
          );
        }
        return saved;
      },
      updateImageCard: async (request) =>
        mapCard(
          await cloud.updateCard(request.cardId, {
            deckId: request.deckId,
            masks: JSON.stringify(request.masks),
            note: request.note,
            ocrText: request.ocrText,
            ocrData: request.ocrData,
          }),
        ),
      runOcr: (imagePath) => nativeApi.runOcr(imagePath),
      getEditorInit: (windowLabel) => nativeApi.getEditorInit(windowLabel),
      openAccessibilitySettings: () => nativeApi.openAccessibilitySettings(),
      openScreenRecordingSettings: () => nativeApi.openScreenRecordingSettings(),
      triggerTextCapture: (deckId) => nativeApi.triggerTextCapture(deckId),
      triggerScreenshotCapture: (deckId) => nativeApi.triggerScreenshotCapture(deckId),
      openNewCardEditor: (request) => nativeApi.openNewCardEditor(request),
      subscribeDataChanged: (listener) => {
        dataChangedListeners.add(listener);
        return () => dataChangedListeners.delete(listener);
      },
    },
  });
}
