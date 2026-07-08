import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from "motion/react";
import { useMemo, useRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../lib/use-reduced-motion";

export interface DockItemData {
  id: string;
  label: string;
  onClick: () => void;
  content: ReactNode;
  className?: string;
  baseWidth?: number;
  baseHeight?: number;
  magnifiedWidth?: number;
  magnifiedHeight?: number;
}

export interface DockProps {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  dockHeight?: number;
  baseItemWidth?: number;
  baseItemHeight?: number;
  magnifiedWidth?: number;
  magnifiedHeight?: number;
  spring?: SpringOptions;
}

const defaultSpring: SpringOptions = { mass: 0.1, stiffness: 150, damping: 12 };

interface DockItemProps {
  item: DockItemData;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemWidth: number;
  baseItemHeight: number;
  magnifiedWidth: number;
  magnifiedHeight: number;
  reduced: boolean;
}

function DockItem({
  item,
  mouseX,
  spring,
  distance,
  baseItemWidth,
  baseItemHeight,
  magnifiedWidth,
  magnifiedHeight,
  reduced,
}: DockItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const widthBase = item.baseWidth ?? baseItemWidth;
  const heightBase = item.baseHeight ?? baseItemHeight;
  const widthMagnified = item.magnifiedWidth ?? magnifiedWidth;
  const heightMagnified = item.magnifiedHeight ?? magnifiedHeight;

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: widthBase,
    };
    return val - rect.x - widthBase / 2;
  });

  const targetWidth = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    reduced ? [widthBase, widthBase, widthBase] : [widthBase, widthMagnified, widthBase],
  );
  const targetHeight = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    reduced ? [heightBase, heightBase, heightBase] : [heightBase, heightMagnified, heightBase],
  );
  const width = useSpring(targetWidth, spring);
  const height = useSpring(targetHeight, spring);

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ width, height }}
      onClick={item.onClick}
      className={cn("dock-item", item.className)}
      aria-label={item.label}
      whileTap={reduced ? undefined : { scale: 0.97 }}
    >
      <span className="dock-item-content">{item.content}</span>
    </motion.button>
  );
}

export function Dock({
  items,
  className,
  spring = defaultSpring,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemWidth = 50,
  baseItemHeight = 50,
  magnifiedWidth = 70,
  magnifiedHeight = 70,
}: DockProps) {
  const reduced = useReducedMotion();
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnifiedHeight + magnifiedHeight / 2 + 4),
    [dockHeight, magnifiedHeight],
  );
  const heightRow = useTransform(
    isHovered,
    [0, 1],
    reduced ? [panelHeight, panelHeight] : [panelHeight, maxHeight],
  );
  const height = useSpring(heightRow, spring);

  return (
    <motion.div
      style={{ height, scrollbarWidth: "none" }}
      className={cn("dock-outer", className)}
    >
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Number.POSITIVE_INFINITY);
        }}
        className="dock-panel"
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="操作"
      >
        {items.map((item) => (
          <DockItem
            key={item.id}
            item={item}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            baseItemWidth={baseItemWidth}
            baseItemHeight={baseItemHeight}
            magnifiedWidth={magnifiedWidth}
            magnifiedHeight={magnifiedHeight}
            reduced={reduced}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
