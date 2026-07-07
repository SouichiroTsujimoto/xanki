import { BrowserRouter, Route, Routes } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useState } from "react";
import { AppApiProvider } from "@xanki/ui";
import { createCloudAppApi } from "./lib/cloud/app-api";
import { useAuthGate } from "./lib/cloud/useCloudAccount";
import { MainApp } from "./windows/main";
import { LoginPage } from "./windows/main/LoginPage";
import { MaskEditorApp } from "./windows/mask-editor";
import "./index.css";

function EditorRoute() {
  const auth = useAuthGate();
  const appApi = useMemo(() => createCloudAppApi(), []);

  if (!auth.ready) {
    return <div className="editor-shell editor-loading-state">読み込み中…</div>;
  }

  if (!auth.loggedIn) {
    return (
      <div className="editor-shell editor-loading-state">
        <LoginPage onLoggedIn={() => void auth.syncFromSession()} />
      </div>
    );
  }

  return (
    <AppApiProvider api={appApi}>
      <MaskEditorApp />
    </AppApiProvider>
  );
}

function AppRouter() {
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    const label = getCurrentWindow().label;
    setIsEditor(label.startsWith("mask-editor") || window.location.pathname.startsWith("/editor"));
  }, []);

  if (isEditor || window.location.pathname.startsWith("/editor")) {
    return <EditorRoute />;
  }

  return <MainApp />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/editor" element={<EditorRoute />} />
        <Route path="*" element={<AppRouter />} />
      </Routes>
    </BrowserRouter>
  );
}
