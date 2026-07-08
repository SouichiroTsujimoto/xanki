import { useMemo } from "react";
import {
  dialogBackdropVariants,
  dialogPanelVariants,
  instantTransition,
  tweenFast,
  transitionForReduced,
} from "./motion-presets";
import { useReducedMotion } from "./use-reduced-motion";

let supportsTopLayerCss: boolean | null = null;

export function supportsNativeDialogAnimation(): boolean {
  if (supportsTopLayerCss !== null) return supportsTopLayerCss;
  if (typeof window === "undefined" || !window.CSS) {
    supportsTopLayerCss = false;
    return false;
  }
  supportsTopLayerCss =
    CSS.supports("transition-behavior", "allow-discrete") &&
    CSS.supports("@starting-style", "opacity: 0");
  return supportsTopLayerCss;
}

export function useDialogMotion() {
  const reduced = useReducedMotion();
  const useNativeAnimation = supportsNativeDialogAnimation();

  return useMemo(
    () => ({
      reduced,
      useNativeAnimation,
      backdropVariants: useNativeAnimation ? undefined : dialogBackdropVariants,
      panelVariants: useNativeAnimation ? undefined : dialogPanelVariants,
      transition: transitionForReduced(reduced, tweenFast),
      instantTransition: transitionForReduced(reduced, instantTransition),
    }),
    [reduced, useNativeAnimation],
  );
}
