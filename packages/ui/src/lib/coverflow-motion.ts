export const COVERFLOW_VISIBLE_RANGE = 3;
export const COVERFLOW_SLIDE_WIDTH = 272;
export const COVERFLOW_DRAG_INDEX_PER_PX = 1 / (COVERFLOW_SLIDE_WIDTH * 0.62);
export const COVERFLOW_DRAG_CLICK_THRESHOLD_PX = 6;

export function clampCoverflowIndex(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(max, Math.max(0, value));
}

export function coverflowMotion(offset: number, reduced: boolean) {
  const abs = Math.abs(offset);
  if (abs > COVERFLOW_VISIBLE_RANGE) {
    return {
      x: offset * COVERFLOW_SLIDE_WIDTH * 0.35,
      rotateY: 0,
      scale: 0.7,
      opacity: 0,
      zIndex: 0,
    };
  }

  if (reduced) {
    return {
      x: offset * COVERFLOW_SLIDE_WIDTH * 0.55,
      rotateY: 0,
      scale: offset === 0 ? 1 : 0.88,
      opacity: Math.abs(offset) < 0.5 ? 1 : Math.max(0.2, 1 - abs * 0.45),
      zIndex: 10 - Math.round(abs),
    };
  }

  return {
    x: offset * COVERFLOW_SLIDE_WIDTH * 0.62,
    rotateY: offset * -42,
    scale: Math.max(0.72, 1 - abs * 0.11),
    opacity: Math.max(0.25, 1 - abs * 0.22),
    zIndex: 10 - Math.round(abs),
  };
}
