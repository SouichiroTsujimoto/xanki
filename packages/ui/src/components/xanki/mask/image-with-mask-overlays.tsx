import { useRef } from "react";
import { maskColorVars } from "../../../lib/maskColors";
import {
  maskOverlayStyle,
  useImageOverlayLayout,
  type ImageRect,
} from "../../../lib/imageOverlay";

export interface ColoredImageRect extends ImageRect {
  color?: string;
}

interface Props {
  src: string;
  alt?: string;
  rects: ColoredImageRect[];
  rootClassName?: string;
  imageClassName?: string;
  getMaskClassName?: (index: number) => string;
  interactive?: boolean;
  onMaskClick?: (index: number) => void;
  onNaturalSize?: (width: number, height: number) => void;
}

export function ImageWithMaskOverlays({
  src,
  alt = "",
  rects,
  rootClassName = "image-overlay-root",
  imageClassName,
  getMaskClassName,
  interactive = false,
  onMaskClick,
  onNaturalSize,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const layout = useImageOverlayLayout(imgRef, src);

  return (
    <div className={rootClassName}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={imageClassName}
        draggable={false}
        onLoad={(event) => {
          onNaturalSize?.(
            event.currentTarget.naturalWidth,
            event.currentTarget.naturalHeight,
          );
        }}
      />
      <div className="image-overlay-layer" aria-hidden={rects.length === 0}>
        {rects.map((rect, index) => {
          const className = [
            "mask-block",
            getMaskClassName?.(index) ?? "",
            interactive ? "mask-interactive" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const style = {
            ...maskOverlayStyle(rect, layout),
            ...maskColorVars(rect.color),
          };

          if (interactive && onMaskClick) {
            return (
              <button
                key={`${rect.x}-${rect.y}-${rect.w}-${rect.h}-${index}`}
                type="button"
                className={className}
                style={style}
                onClick={() => onMaskClick(index)}
                aria-label="マスクを削除"
              />
            );
          }

          return (
            <div
              key={`${rect.x}-${rect.y}-${rect.w}-${rect.h}-${index}`}
              className={className}
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}
