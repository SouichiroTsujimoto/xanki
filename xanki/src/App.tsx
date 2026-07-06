import { BrowserRouter, Route, Routes } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { MainApp } from "./windows/main";
import { MaskEditorApp } from "./windows/mask-editor";
import "./App.css";

function AppRouter() {
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    const label = getCurrentWindow().label;
    setIsEditor(label.startsWith("mask-editor") || window.location.pathname.startsWith("/editor"));
  }, []);

  if (isEditor || window.location.pathname.startsWith("/editor")) {
    return <MaskEditorApp />;
  }

  return <MainApp />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/editor" element={<MaskEditorApp />} />
        <Route path="*" element={<AppRouter />} />
      </Routes>
    </BrowserRouter>
  );
}
