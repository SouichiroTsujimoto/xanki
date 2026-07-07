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
): { x: number; y: number } | null {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return null;

  const style = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(style.lineHeight) || 24;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const textBefore = textarea.value.slice(0, end);
  const lines = textBefore.split("\n");
  const lineIndex = lines.length - 1;
  const column = lines[lineIndex]?.length ?? 0;
  const charWidth = 7.5;

  return {
    x: Math.min(
      paddingLeft + column * charWidth + 8,
      textarea.clientWidth - paddingLeft - 48,
    ),
    y: paddingTop + lineIndex * lineHeight + lineHeight + 6 - textarea.scrollTop,
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
