export type {
  ApiCard,
  ApiDeck,
  AppApi,
  Card,
  Deck,
  DeckExport,
  DeckStudyMode,
  EditorInitPayload,
  ImageMask,
  ImageRegion,
  MaskAnswer,
  OcrMask,
  OcrResult,
  OcrWord,
  PermissionStatus,
  RectMask,
  ReviewCard,
  ReviewGrade,
  StudyFilter,
  StudyMode,
  TextMask,
  CreateCardRequest,
  CreateDeckRequest,
  UpdateCardRequest,
  UpdateDeckRequest,
} from "@xanki/shared";
import type { TextMask } from "@xanki/shared";

export interface MaskSuggester {
  suggest(_content: string): Promise<TextMask[]>;
}

export class NoOpMaskSuggester implements MaskSuggester {
  async suggest(): Promise<TextMask[]> {
    return [];
  }
}
