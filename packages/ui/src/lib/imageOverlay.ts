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
  offsetX: number;
  offsetY: number;
}

const EMPTY_LAYOUT: ImageOverlayLayout = {
  naturalW: 0,
  naturalH: 0,
  displayW: 0,
  displayH: 0,
  offsetX: 0,
  offsetY: 0,
};

function resolveObjectPositionAxis(
  value: string,
  containerSize: number,
  contentSize: number,
): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const pct = Number.parseFloat(trimmed) / 100;
    if (!Number.isFinite(pct)) return (containerSize - contentSize) / 2;
    return (containerSize - contentSize) * pct;
  }

  switch (trimmed) {
    case "left":
    case "top":
      return 0;
    case "right":
    case "bottom":
      return containerSize - contentSize;
    case "center":
    default:
      return (containerSize - contentSize) / 2;
  }
}

function parseObjectPosition(
  value: string,
  containerW: number,
  containerH: number,
  contentW: number,
  contentH: number,
): { offsetX: number; offsetY: number } {
  const parts = value.trim().split(/\s+/);
  const horizontal = parts[0] ?? "50%";
  const vertical = parts[1] ?? parts[0] ?? "50%";

  return {
    offsetX: resolveObjectPositionAxis(horizontal, containerW, contentW),
    offsetY: resolveObjectPositionAxis(vertical, containerH, contentH),
  };
}

export function computeImageOverlayLayout(img: HTMLImageElement): ImageOverlayLayout {
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const containerW = img.clientWidth;
  const containerH = img.clientHeight;

  if (!naturalW || !naturalH || !containerW || !containerH) {
    return EMPTY_LAYOUT;
  }

  const style = window.getComputedStyle(img);
  const objectFit = style.objectFit || "fill";

  if (objectFit === "fill") {
    return {
      naturalW,
      naturalH,
      displayW: containerW,
      displayH: containerH,
      offsetX: 0,
      offsetY: 0,
    };
  }

  let scale: number;
  switch (objectFit) {
    case "contain":
      scale = Math.min(containerW / naturalW, containerH / naturalH);
      break;
    case "cover":
      scale = Math.max(containerW / naturalW, containerH / naturalH);
      break;
    case "none":
      scale = 1;
      break;
    case "scale-down": {
      const containScale = Math.min(containerW / naturalW, containerH / naturalH);
      scale = Math.min(1, containScale);
      break;
    }
    default:
      return {
        naturalW,
        naturalH,
        displayW: containerW,
        displayH: containerH,
        offsetX: 0,
        offsetY: 0,
      };
  }

  const displayW = naturalW * scale;
  const displayH = naturalH * scale;
  const { offsetX, offsetY } = parseObjectPosition(
    style.objectPosition || "50% 50%",
    containerW,
    containerH,
    displayW,
    displayH,
  );

  return {
    naturalW,
    naturalH,
    displayW,
    displayH,
    offsetX,
    offsetY,
  };
}

export function pointerToImageCoords(
  clientX: number,
  clientY: number,
  img: HTMLImageElement,
): ImageRect | null {
  const layout = computeImageOverlayLayout(img);
  if (!layout.naturalW || !layout.naturalH || !layout.displayW || !layout.displayH) {
    return null;
  }

  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const scaleX = layout.displayW / layout.naturalW;
  const scaleY = layout.displayH / layout.naturalH;

  return {
    x: (clientX - rect.left - layout.offsetX) / scaleX,
    y: (clientY - rect.top - layout.offsetY) / scaleY,
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
    left: `${layout.offsetX + rect.x * scaleX}px`,
    top: `${layout.offsetY + rect.y * scaleY}px`,
    width: `${rect.w * scaleX}px`,
    height: `${rect.h * scaleY}px`,
  };
}

export function useImageOverlayLayout(
  imgRef: RefObject<HTMLImageElement | null>,
  imageSrc: string,
): ImageOverlayLayout {
  const [layout, setLayout] = useState<ImageOverlayLayout>(EMPTY_LAYOUT);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const update = () => {
      setLayout(computeImageOverlayLayout(img));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(img);
    if (img.parentElement) {
      observer.observe(img.parentElement);
    }
    img.addEventListener("load", update);
    window.addEventListener("resize", update);
    if (img.complete) {
      requestAnimationFrame(update);
    }

    return () => {
      observer.disconnect();
      img.removeEventListener("load", update);
      window.removeEventListener("resize", update);
    };
  }, [imgRef, imageSrc]);

  return layout;
}
