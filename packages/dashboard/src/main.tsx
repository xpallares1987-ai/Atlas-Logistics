import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardClient from "./app/DashboardClient";
import "./app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<DashboardClient />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
