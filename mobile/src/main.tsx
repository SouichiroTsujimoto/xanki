import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "./App";
import { registerAuthDeepLinkListener } from "./lib/cloud/auth";
import "./index.css";

if (Capacitor.isNativePlatform()) {
  registerAuthDeepLinkListener();
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
