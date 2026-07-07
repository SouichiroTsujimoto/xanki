import type { FormEvent } from "react";
import { copy } from "../../copy";

export interface LoginViewProps {
  email: string;
  onEmailChange: (email: string) => void;
  code: string;
  onCodeChange: (code: string) => void;
  sent: boolean;
  error: string | null;
  busy?: boolean;
  onSend: () => void | Promise<void>;
  onVerify: () => void | Promise<void>;
  brandDescription?: string;
}

export function LoginView({
  email,
  onEmailChange,
  code,
  onCodeChange,
  sent,
  error,
  busy = false,
  onSend,
  onVerify,
  brandDescription = copy.login.brandDescription,
}: LoginViewProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!sent) {
      if (email) void onSend();
      return;
    }
    if (code.length >= 6) void onVerify();
  }

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
          <form style={{ display: "grid", gap: 12, maxWidth: 420 }} onSubmit={handleSubmit}>
            <input
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder={copy.login.emailPlaceholder}
              disabled={busy || sent}
              autoComplete="email"
            />
            {!sent ? (
              <button
                type="submit"
                className="accent-button"
                disabled={busy || !email}
              >
                {copy.login.sendCode}
              </button>
            ) : (
              <>
                <input
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  placeholder={copy.login.codePlaceholder}
                  disabled={busy}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <p className="settings-note">{copy.login.devOtpHint}</p>
                <button
                  type="submit"
                  className="accent-button"
                  disabled={busy || code.length < 6}
                >
                  {copy.login.submit}
                </button>
              </>
            )}
            {error && <p className="confirm-dialog-error">{error}</p>}
          </form>
        </div>
      </section>
    </div>
  );
}
