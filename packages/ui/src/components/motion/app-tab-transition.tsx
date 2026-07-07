import { type ReactNode } from "react";
import type { AppTab } from "../xanki/app-shell";

export function AppTabTransition({
  tab,
  children,
}: {
  tab: AppTab;
  children: ReactNode;
}) {
  return <div className={`app-tab-panel app-tab-panel-${tab}`}>{children}</div>;
}
