import type { ReactNode } from "react";

interface Props {
  active: boolean;
  children: ReactNode;
}

/** タブ切替でアンマウントせず表示だけ切り替える（学習ハブの再読み込みチラつき防止） */
export function AppTabLayer({ active, children }: Props) {
  return (
    <div className="app-tab-layer" hidden={!active} aria-hidden={!active}>
      {children}
    </div>
  );
}
