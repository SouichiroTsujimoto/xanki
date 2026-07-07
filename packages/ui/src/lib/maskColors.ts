import type { CSSProperties } from "react";

export const MASK_COLORS = [
  { id: "chartreuse", fill: "rgb(205, 255, 26)", border: "#1d1d1f" },
  { id: "yellow", fill: "rgb(255, 229, 102)", border: "#1d1d1f" },
  { id: "pink", fill: "rgb(255, 179, 217)", border: "#1d1d1f" },
  { id: "cyan", fill: "rgb(125, 211, 252)", border: "#1d1d1f" },
  { id: "orange", fill: "rgb(255, 179, 102)", border: "#1d1d1f" },
] as const;

export type MaskColorId = (typeof MASK_COLORS)[number]["id"];

export const DEFAULT_MASK_COLOR_ID: MaskColorId = "chartreuse";

export function resolveMaskColor(colorId?: string) {
  return MASK_COLORS.find((color) => color.id === colorId) ?? MASK_COLORS[0];
}

export function maskColorVars(colorId?: string): CSSProperties {
  const color = resolveMaskColor(colorId);
  return {
    ["--mask-fill" as string]: color.fill,
    ["--mask-border" as string]: color.border,
  };
}

export function maskPaintStyle(colorId?: string): CSSProperties {
  const color = resolveMaskColor(colorId);
  return {
    ...maskColorVars(colorId),
    background: color.fill,
    borderColor: color.border,
  };
}
