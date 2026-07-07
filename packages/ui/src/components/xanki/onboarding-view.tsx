import { useMemo, useState } from "react";
import { useAppApi } from "../../context/app-api-context";
import type { PermissionStatus } from "../../types";

interface Props {
  permissions: PermissionStatus;
  onComplete: () => void;
  onRefreshPermissions: () => void;
}

export function OnboardingView({
  permissions,
  onComplete,
  onRefreshPermissions,
}: Props) {
  const api = useAppApi();
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => [
      {
        title: "アクセシビリティ",
        body: "テキスト取込に ⌘C 送出を使います。文字入力の監視は行いません。",
        action: () => api.openAccessibilitySettings(),
        check: (p: PermissionStatus) => p.accessibility,
      },
      {
        title: "画面収録",
        body: "スクショ取込は、ショートカットを押した瞬間だけ画面をキャプチャします。",
        action: () => api.openScreenRecordingSettings(),
        check: (p: PermissionStatus) => p.screenRecording,
      },
      {
        title: "ショートカット",
        body: "⌥⌘M でテキスト、⌥⌘S でスクショ取込。この画面の文字を選択して ⌥⌘M を試してください。",
        action: undefined,
        check: () => true,
      },
    ],
    [api],
  );

  const current = steps[step];
  const done = current.check(permissions);

  return (
    <div className="onboarding-frame">
      <aside className="onboarding-brand">
        <div className="brand-mark large" aria-hidden>
          x
        </div>
        <h1>xanki</h1>
        <p>教材の上で隠して、必要なときだけ思い出す。</p>
        <div className="onboarding-shortcuts">
          <div className="shortcut-chip inverted">
            <kbd>⌥⌘M</kbd>
            <span>Text</span>
          </div>
          <div className="shortcut-chip inverted">
            <kbd>⌥⌘S</kbd>
            <span>Shot</span>
          </div>
        </div>
      </aside>

      <section className="onboarding-panel">
        <p className="step-indicator">
          Step {step + 1} / {steps.length}
        </p>
        <div className="onboarding-card">
          <p className="eyebrow">Setup</p>
          <h2>{current.title}</h2>
          <p>{current.body}</p>
          {current.action && (
            <button type="button" className="accent-button" onClick={() => void current.action?.()}>
              システム設定を開く
            </button>
          )}
          <button type="button" className="text-button" onClick={onRefreshPermissions}>
            権限を再確認
          </button>
          <p className={`setup-status ${done ? "ok" : ""}`}>
            {done ? "準備OK" : "権限の付与をお願いします（スキップ可）"}
          </p>
        </div>

        <div className="onboarding-actions">
          {step > 0 && (
            <button type="button" className="ghost-button" onClick={() => setStep((s) => s - 1)}>
              戻る
            </button>
          )}
          {step < steps.length - 1 ? (
            <button type="button" className="accent-button" onClick={() => setStep((s) => s + 1)}>
              次へ
            </button>
          ) : (
            <button type="button" className="accent-button" onClick={onComplete}>
              はじめる
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
