import { useLayoutEffect, useRef, useState } from "react";

/** テキストカード: 収まるときは縦中央、スクロールが必要なときは上揃え。 */
export function useReviewCardTextOverflow(
  enabled: boolean,
  remeasureKey: string,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setScrollable(false);
      return;
    }

    const measure = () => {
      const body = el.querySelector(".study-text-body");
      if (!(body instanceof HTMLElement)) {
        setScrollable(false);
        return;
      }

      const style = getComputedStyle(el);
      const paddingBlock =
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom);
      const available = el.clientHeight - paddingBlock;
      const next = body.scrollHeight > available + 1;
      setScrollable((prev) => (prev === next ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const body = el.querySelector(".study-text-body");
    if (body instanceof HTMLElement) observer.observe(body);

    return () => observer.disconnect();
  }, [enabled, remeasureKey]);

  return { ref, scrollable };
}
