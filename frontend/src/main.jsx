import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "@fontsource/sarabun/300.css";
import "@fontsource/sarabun/400.css";
import "@fontsource/sarabun/500.css";
import "@fontsource/sarabun/600.css";
import "@fontsource/sarabun/700.css";
import "@fontsource/bai-jamjuree/400.css";
import "@fontsource/bai-jamjuree/500.css";
import "@fontsource/bai-jamjuree/600.css";
import "@fontsource/bai-jamjuree/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ติดตั้งเป็นแอปบนมือถือ/เดสก์ท็อป (PWA) — ข้ามในแอป Electron
if ("serviceWorker" in navigator && import.meta.env.PROD && !navigator.userAgent.includes("Electron")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
