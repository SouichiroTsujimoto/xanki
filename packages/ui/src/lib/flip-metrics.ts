const FLIP_DRAG_THRESHOLD_PX = 6;
export const FLIP_MIN_HEIGHT_PX = 240;
export const FLIP_MAX_HEIGHT_PX = 520;
export const FLIP_MAX_HEIGHT_VH = 0.58;

export function clampFlipHeight(natural: number): number {
  const max = Math.min(window.innerHeight * FLIP_MAX_HEIGHT_VH, FLIP_MAX_HEIGHT_PX);
  return Math.min(max, Math.max(FLIP_MIN_HEIGHT_PX, natural));
}

export function activeFaceCardSelector(revealed: boolean): string {
  return revealed
    ? ".study-flip-back .review-card"
    : ".study-flip-front .review-card";
}

export function measureReviewCard(card: HTMLElement): number {
  const previous = {
    height: card.style.height,
    maxHeight: card.style.maxHeight,
    overflow: card.style.overflow,
  };

  card.style.height = "auto";
  card.style.maxHeight = "none";
  card.style.overflow = "visible";

  const measured = card.offsetHeight;
  const width = card.clientWidth || card.offsetWidth;
  const minAspectHeight =
    width > 0 ? Math.round((width * 3) / 4) : FLIP_MIN_HEIGHT_PX;

  card.style.height = previous.height;
  card.style.maxHeight = previous.maxHeight;
  card.style.overflow = previous.overflow;

  return clampFlipHeight(Math.max(measured, minAspectHeight));
}

export function isDragPointerGesture(
  start: { x: number; y: number } | null,
  event: { clientX: number; clientY: number },
): boolean {
  if (!start) return false;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  return Math.hypot(dx, dy) > FLIP_DRAG_THRESHOLD_PX;
}

export function hasActiveTextSelection(): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return false;
  return selection.toString().trim().length > 0;
}
