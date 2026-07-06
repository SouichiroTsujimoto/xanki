import { useEffect, useState, type CSSProperties, type RefObject } from "react";

export interface ImageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ImageOverlayLayout {
  naturalW: number;
  naturalH: number;
  displayW: number;
  displayH: number;
}

export function pointerToImageCoords(
  clientX: number,
  clientY: number,
  img: HTMLImageElement,
): ImageRect | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * img.naturalWidth,
    y: ((clientY - rect.top) / rect.height) * img.naturalHeight,
    w: 0,
    h: 0,
  };
}

export function maskOverlayStyle(
  rect: ImageRect,
  layout: ImageOverlayLayout,
): CSSProperties {
  if (!layout.naturalW || !layout.naturalH || !layout.displayW || !layout.displayH) {
    return { display: "none" };
  }
  const scaleX = layout.displayW / layout.naturalW;
  const scaleY = layout.displayH / layout.naturalH;
  return {
    position: "absolute",
    left: `${rect.x * scaleX}px`,
    top: `${rect.y * scaleY}px`,
    width: `${rect.w * scaleX}px`,
    height: `${rect.h * scaleY}px`,
  };
}

export function useImageOverlayLayout(
  imgRef: RefObject<HTMLImageElement | null>,
  imageSrc: string,
): ImageOverlayLayout {
  const [layout, setLayout] = useState<ImageOverlayLayout>({
    naturalW: 0,
    naturalH: 0,
    displayW: 0,
    displayH: 0,
  });

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const update = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      setLayout({
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        displayW: img.clientWidth,
        displayH: img.clientHeight,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(img);
    img.addEventListener("load", update);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      img.removeEventListener("load", update);
      window.removeEventListener("resize", update);
    };
  }, [imgRef, imageSrc]);

  return layout;
}
