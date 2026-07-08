import type { ReactNode } from "react";
import { copy } from "../../copy";
import { Button } from "../ui/button";

export interface CloudAccountSectionProps {
  email?: string | null;
  statusNote?: string | null;
  error?: string | null;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
  onLogout: () => void;
  children?: ReactNode;
}

export function CloudAccountSection({
  email,
  statusNote,
  error,
  showUpgrade = true,
  onUpgrade,
  onLogout,
  children,
}: CloudAccountSectionProps) {
  return (
    <>
      <p className="eyebrow">Cloud</p>
      <h2>{copy.account.title}</h2>
      {email && <p className="settings-note">{copy.account.loggedInAs(email)}</p>}
      {statusNote && <p className="settings-note">{statusNote}</p>}
      <div className="settings-inline-actions">
        {showUpgrade && onUpgrade && (
          <Button type="button" variant="ghost" onClick={onUpgrade}>
            {copy.billing.upgradePro}
          </Button>
        )}
        <Button type="button" variant="text" onClick={onLogout}>
          ログアウト
        </Button>
      </div>
      {error && <p className="settings-note">{error}</p>}
      {children}
    </>
  );
}

export interface BillingSectionProps {
  plan: string;
  extraNote?: string | null;
}

export function BillingSection({ plan, extraNote }: BillingSectionProps) {
  return (
    <>
      <p className="eyebrow">{copy.billing.eyebrow}</p>
      <h2>{copy.billing.title}</h2>
      <p className="settings-note">{copy.billing.currentPlan(plan)}</p>
      {extraNote && <p className="settings-note">{extraNote}</p>}
    </>
  );
}
