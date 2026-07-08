import { copy } from "../../copy";
import { Button } from "../ui/button";

export interface LoginViewProps {
  busy?: boolean;
  error: string | null;
  initialNotice?: string | null;
  onGoogleSignIn: () => void | Promise<void>;
  brandDescription?: string;
}

export function LoginView({
  busy = false,
  error,
  initialNotice = null,
  onGoogleSignIn,
  brandDescription = copy.login.brandDescription,
}: LoginViewProps) {
  return (
    <div className="onboarding-frame">
      <aside className="onboarding-brand">
        <div className="brand-mark large" aria-hidden>
          x
        </div>
        <h1>xanki</h1>
        <p>{brandDescription}</p>
      </aside>
      <section className="onboarding-panel">
        <div className="onboarding-card">
          <p className="eyebrow">{copy.login.eyebrow}</p>
          <h2>{copy.login.title}</h2>
          {initialNotice && <p className="settings-note">{initialNotice}</p>}
          <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
            <Button
              type="button"
              variant="accent"
              disabled={busy}
              onClick={() => void onGoogleSignIn()}
            >
              {copy.login.googleButton}
            </Button>
            {error && <p className="confirm-dialog-error">{error}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
