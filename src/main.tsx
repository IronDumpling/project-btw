import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import OverlayBubble from "./windows/overlay/OverlayBubble";
import Onboarding from "./windows/onboarding/Onboarding";
import "./styles/tokens.css";
import "./styles/globals.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <React.Suspense fallback={<div className="app-loading"><div className="app-loading-spinner" /></div>}>
        <Routes>
          <Route path="/"           element={<App />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/overlay"    element={<OverlayBubble />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);
