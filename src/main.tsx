import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import OverlayBubble from "./windows/overlay/OverlayBubble";
import Onboarding from "./windows/onboarding/Onboarding";
import "./styles/tokens.css";
import "./styles/globals.css";
import "./App.css";

// Phase 5 main window pages (lazy to keep initial bundle small)
const Dashboard    = React.lazy(() => import("./windows/main/Dashboard"));
const ContactList  = React.lazy(() => import("./windows/main/ContactList"));
const ContactDetail = React.lazy(() => import("./windows/main/ContactDetail"));
const UserProfile  = React.lazy(() => import("./windows/main/UserProfile"));
const CapturePage  = React.lazy(() => import("./windows/main/CapturePage"));
const Settings     = React.lazy(() => import("./windows/main/Settings"));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <React.Suspense fallback={<div className="app-loading"><div className="app-loading-spinner" /></div>}>
        <Routes>
          {/* App shell — persona check, redirects to /dashboard or /onboarding */}
          <Route path="/" element={<App />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Overlay window */}
          <Route path="/overlay" element={<OverlayBubble />} />

          {/* Main window pages (Phase 5) */}
          <Route path="/dashboard"        element={<Dashboard />} />
          <Route path="/contacts"         element={<ContactList />} />
          <Route path="/contacts/:name"   element={<ContactDetail />} />
          <Route path="/profile"          element={<UserProfile />} />
          <Route path="/capture"          element={<CapturePage />} />
          <Route path="/settings"         element={<Settings />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);
