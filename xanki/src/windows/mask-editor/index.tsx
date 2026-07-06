import { useLayoutEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api, parseImageMasks, parseTextMasks } from "../../lib/tauri/api";
import { TextMaskEditor } from "../../components/TextMaskEditor";
import { ImageMaskEditor } from "../../components/ImageMaskEditor";
import type { EditorInitPayload, OcrResult } from "../../types";

function resolveWindowLabel(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("label") ?? getCurrentWindow().label;
}

async function revealEditorWindow() {
  const window = getCurrentWindow();
  await window.setTheme("light");
  await window.show();
  await window.setFocus();
}

export function MaskEditorApp() {
  const [payload, setPayload] = useState<EditorInitPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    let active = true;
    const windowLabel = resolveWindowLabel();

    async function loadInit() {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const init = await api.getEditorInit(windowLabel);
          if (!active) return;

          if (init) {
            setPayload(init);
            setError(null);
            await revealEditorWindow();
            return;
          }
        } catch (cause) {
          if (!active) return;
          setError(
            cause instanceof Error
              ? cause.message
              : "取込データの読み込みに失敗しました。",
          );
          await revealEditorWindow();
          return;
        }

        if (attempt < 7) {
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }

      if (active) {
        setError(
          "取込データが見つかりませんでした。もう一度ショートカットを押してください。",
        );
        await revealEditorWindow();
      }
    }

    void loadInit();

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="editor-shell editor-loading-state">
        <p className="eyebrow">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!payload) {
    return <div className="editor-shell editor-loading-state" aria-busy="true" />;
  }

  if (payload.mode === "text" && payload.content) {
    return (
      <TextMaskEditor
        initialContent={payload.content}
        cardId={payload.cardId}
        initialDeckId={payload.deckId}
        initialMasks={payload.masks ? parseTextMasks(payload.masks) : []}
        initialNote={payload.note ?? ""}
      />
    );
  }

  if (payload.mode === "image" && payload.imagePath) {
    const initialOcr: OcrResult | null = payload.ocrData
      ? (JSON.parse(payload.ocrData) as OcrResult)
      : null;
    return (
      <ImageMaskEditor
        imagePath={payload.imagePath}
        cardId={payload.cardId}
        initialDeckId={payload.deckId}
        initialMasks={payload.masks ? parseImageMasks(payload.masks) : []}
        initialNote={payload.note ?? ""}
        initialOcr={initialOcr}
      />
    );
  }

  return (
    <div className="editor-shell editor-loading-state">
      <p>取込データを待っています...</p>
    </div>
  );
}
