import type { ReactNode } from "react";
import { useAppApi } from "../../context/app-api-context";
import { copy, studyModeList } from "../../copy";
import type { PermissionStatus } from "../../types";
import { Button } from "../ui/button";

interface Props {
  permissions: PermissionStatus;
  onRefresh: () => void;
  cloudSection?: ReactNode;
  billingSection?: ReactNode;
}

export function SettingsView({
  permissions,
  onRefresh,
  cloudSection,
  billingSection,
}: Props) {
  const api = useAppApi();

  return (
    <div className="settings-page">
      <div className="settings-grid">
        {cloudSection && (
          <section className="settings-card settings-card-wide">
            {cloudSection}
          </section>
        )}

        {billingSection && (
          <section className="settings-card settings-card-wide">
            {billingSection}
          </section>
        )}

        <section className="settings-card">
          <p className="eyebrow">{copy.settings.shortcutsEyebrow}</p>
          <h2>{copy.settings.shortcutsTitle}</h2>
          <div className="settings-shortcuts">
            <div className="shortcut-row">
              <kbd>⌥⌘M</kbd>
              <div>
                <strong>{copy.capture.text}</strong>
                <p>選択中の文字列をマスクエディタへ送ります。</p>
              </div>
            </div>
            <div className="shortcut-row">
              <kbd>⌥⌘S</kbd>
              <div>
                <strong>{copy.capture.screenshot}</strong>
                <p>範囲キャプチャ後、マスクを配置して 1 枚のカードとして保存します。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <p className="eyebrow">{copy.settings.permissionsEyebrow}</p>
          <h2>{copy.settings.permissionsTitle}</h2>

          <div className="permission-card">
            <div className="permission-copy">
              <strong>アクセシビリティ</strong>
              <p>テキスト取込の ⌘C 送出にのみ使用します。入力の監視は行いません。</p>
            </div>
            <span className={`status-pill ${permissions.accessibility ? "ok" : "ng"}`}>
              {permissions.accessibility ? copy.settings.granted : copy.settings.denied}
            </span>
            {!permissions.accessibility && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void api.openAccessibilitySettings()}
              >
                {copy.settings.openSettings}
              </Button>
            )}
          </div>

          <div className="permission-card">
            <div className="permission-copy">
              <strong>画面収録</strong>
              <p>スクショ取込時のみ使用します。常時録画はしません。</p>
            </div>
            <span className={`status-pill ${permissions.screenRecording ? "ok" : "ng"}`}>
              {permissions.screenRecording ? copy.settings.granted : copy.settings.denied}
            </span>
            {!permissions.screenRecording && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void api.openScreenRecordingSettings()}
              >
                {copy.settings.openSettings}
              </Button>
            )}
          </div>

          <Button type="button" variant="text" onClick={onRefresh}>
            {copy.settings.refreshPermissions}
          </Button>
        </section>

        <section className="settings-card settings-card-wide">
          <p className="eyebrow">{copy.settings.studyEyebrow}</p>
          <h2>{copy.settings.studyTitle}</h2>
          <ul className="settings-mode-list">
            {studyModeList.map((mode) => (
              <li key={mode.id}>
                <strong>{mode.label}</strong>
                <span>{mode.desc}</span>
              </li>
            ))}
          </ul>
          <p className="settings-note">{copy.settings.studyNote}</p>
        </section>

        <section className="settings-card">
          <p className="eyebrow">{copy.settings.maskEyebrow}</p>
          <h2>{copy.settings.maskTitle}</h2>
          <p className="settings-note">{copy.settings.maskNote}</p>
        </section>
      </div>
    </div>
  );
}
