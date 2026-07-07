const TEXTAREA_MIRROR_PROPS = [
  "boxSizing",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
] as const;

function applyTextareaMirrorStyles(
  textarea: HTMLTextAreaElement,
  mirror: HTMLDivElement,
): void {
  const computed = window.getComputedStyle(textarea);
  const rect = textarea.getBoundingClientRect();

  mirror.style.position = "fixed";
  mirror.style.top = `${rect.top}px`;
  mirror.style.left = `${rect.left}px`;
  mirror.style.width = `${rect.width}px`;
  mirror.style.height = "auto";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.zIndex = "-1";

  for (const prop of TEXTAREA_MIRROR_PROPS) {
    mirror.style[prop] = computed[prop];
  }
}

export function getTextareaSelectionOffsets(
  textarea: HTMLTextAreaElement,
): { start: number; end: number } | null {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return null;
  if (end <= start) return null;
  return { start, end };
}

export function getTextareaPopupPosition(
  textarea: HTMLTextAreaElement,
  anchor: HTMLElement,
): { x: number; y: number } | null {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return null;

  const mirror = document.createElement("div");
  applyTextareaMirrorStyles(textarea, mirror);

  const value = textarea.value;
  mirror.textContent = value.slice(0, end);
  const marker = document.createElement("span");
  marker.textContent = value.slice(end, end + 1) || " ";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const markerRect = marker.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  document.body.removeChild(mirror);

  return {
    x: Math.min(
      markerRect.right - anchorRect.left + 8,
      Math.max(8, anchor.clientWidth - 48),
    ),
    y: markerRect.bottom - anchorRect.top + 6,
  };
}

export function getTextOffset(root: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let count = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) {
      return count + offset;
    }
    count += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  return count;
}

export function getSelectionOffsets(
  root: HTMLElement,
): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const start = getTextOffset(root, range.startContainer, range.startOffset);
  const end = getTextOffset(root, range.endContainer, range.endOffset);
  if (end <= start) return null;
  return { start, end };
}

export function getSelectionPopupPosition(
  root: HTMLElement,
): { x: number; y: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const rect = range.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  return {
    x: rect.right - rootRect.left + 8,
    y: rect.bottom - rootRect.top + 6,
  };
}
