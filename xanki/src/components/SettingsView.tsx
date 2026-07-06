import { api } from "../lib/tauri/api";
import type { PermissionStatus } from "../types";

interface Props {
  permissions: PermissionStatus;
  onRefresh: () => void;
}

const STUDY_MODES = [
  { name: "フラッシュカード", desc: "全カードをめくって確認" },
  { name: "学習", desc: "Leitner SRS で復習" },
  { name: "書く", desc: "マスク部分を入力" },
  { name: "テスト", desc: "4択問題" },
  { name: "マッチ", desc: "問題と答えのペア当て" },
];

export function SettingsView({ permissions, onRefresh }: Props) {
  return (
    <div className="settings-page">
      <div className="settings-grid">
        <section className="settings-card">
          <p className="eyebrow">Shortcuts</p>
          <h2>ショートカット</h2>
          <div className="settings-shortcuts">
            <div className="shortcut-row">
              <kbd>⌥⌘M</kbd>
              <div>
                <strong>テキスト取込</strong>
                <p>選択中の文字列をマスクエディタへ送ります。</p>
              </div>
            </div>
            <div className="shortcut-row">
              <kbd>⌥⌘S</kbd>
              <div>
                <strong>スクショ取込</strong>
                <p>範囲キャプチャ後、カード範囲とマスクを指定します。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <p className="eyebrow">Permissions</p>
          <h2>権限</h2>

          <div className="permission-card">
            <div className="permission-copy">
              <strong>アクセシビリティ</strong>
              <p>テキスト取込の ⌘C 送出にのみ使用します。入力の監視は行いません。</p>
            </div>
            <span className={`status-pill ${permissions.accessibility ? "ok" : "ng"}`}>
              {permissions.accessibility ? "許可済み" : "未許可"}
            </span>
            {!permissions.accessibility && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => void api.openAccessibilitySettings()}
              >
                設定を開く
              </button>
            )}
          </div>

          <div className="permission-card">
            <div className="permission-copy">
              <strong>画面収録</strong>
              <p>スクショ取込時のみ使用します。常時録画はしません。</p>
            </div>
            <span className={`status-pill ${permissions.screenRecording ? "ok" : "ng"}`}>
              {permissions.screenRecording ? "許可済み" : "未許可"}
            </span>
            {!permissions.screenRecording && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => void api.openScreenRecordingSettings()}
              >
                設定を開く
              </button>
            )}
          </div>

          <button type="button" className="text-button" onClick={onRefresh}>
            権限状態を再確認
          </button>
        </section>

        <section className="settings-card settings-card-wide">
          <p className="eyebrow">Study</p>
          <h2>学習モード</h2>
          <ul className="settings-mode-list">
            {STUDY_MODES.map((mode) => (
              <li key={mode.name}>
                <strong>{mode.name}</strong>
                <span>{mode.desc}</span>
              </li>
            ))}
          </ul>
          <p className="settings-note">
            「学習」タブから各モードを切り替えられます。ライブラリではカードの編集・複製・スター、デッキのエクスポート/インポートも利用できます。
          </p>
        </section>

        <section className="settings-card">
          <p className="eyebrow">Mask</p>
          <h2>マスク表示</h2>
          <p className="settings-note">
            復習時のマスクは Black で不透明表示されます。アクセントカラーは Chartreuse（#CEFF1A）です。
          </p>
        </section>
      </div>
    </div>
  );
}
