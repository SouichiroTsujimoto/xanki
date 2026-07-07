import { type ReactNode } from "react";
import type { AppTab } from "../xanki/app-shell";

export function AppTabTransition({
  children,
}: {
  tab: AppTab;
  children: ReactNode;
}) {
  return <div className="app-tab-panel">{children}</div>;
}
