import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import CaptureUpload from "./pages/CaptureUpload";
import ContactDetail from "./pages/ContactDetail";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import "./styles/tokens.css";
import "./styles/globals.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/capture" element={<CaptureUpload />} />
        <Route path="/contacts/:id" element={<ContactDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
