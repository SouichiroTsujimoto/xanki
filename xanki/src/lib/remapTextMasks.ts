import type { TextMask } from "../types";

function findEditRegion(oldText: string, newText: string) {
  let prefix = 0;
  while (
    prefix < oldText.length &&
    prefix < newText.length &&
    oldText[prefix] === newText[prefix]
  ) {
    prefix += 1;
  }

  let oldEnd = oldText.length;
  let newEnd = newText.length;
  while (
    oldEnd > prefix &&
    newEnd > prefix &&
    oldText[oldEnd - 1] === newText[newEnd - 1]
  ) {
    oldEnd -= 1;
    newEnd -= 1;
  }

  return {
    editOldStart: prefix,
    editOldEnd: oldEnd,
    editNewEnd: newEnd,
    delta: newEnd - prefix - (oldEnd - prefix),
  };
}

function remapRange(
  start: number,
  end: number,
  editOldStart: number,
  editOldEnd: number,
  editNewEnd: number,
  delta: number,
): { start: number; end: number } | null {
  if (end <= editOldStart) {
    return { start, end };
  }
  if (start >= editOldEnd) {
    return { start: start + delta, end: end + delta };
  }

  let newStart = start;
  let newEnd = end;

  if (start >= editOldStart) {
    newStart = editOldStart;
  }

  if (end <= editOldEnd) {
    newEnd = editNewEnd;
  } else if (end > editOldEnd) {
    newEnd = end + delta;
  }

  if (newStart >= newEnd) {
    return null;
  }

  return { start: newStart, end: newEnd };
}

export function remapTextMasks(
  oldText: string,
  newText: string,
  masks: TextMask[],
): TextMask[] {
  if (oldText === newText) {
    return masks;
  }

  const { editOldStart, editOldEnd, editNewEnd, delta } = findEditRegion(
    oldText,
    newText,
  );

  const remapped: TextMask[] = [];

  for (const mask of masks) {
    if (mask.type !== "range") continue;
    const next = remapRange(
      mask.start,
      mask.end,
      editOldStart,
      editOldEnd,
      editNewEnd,
      delta,
    );
    if (!next) continue;
    if (next.start < 0 || next.end > newText.length || next.start >= next.end) {
      continue;
    }
    remapped.push({ type: "range", start: next.start, end: next.end });
  }

  return remapped;
}
