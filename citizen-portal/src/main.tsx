import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { ReportPage } from "@/pages/ReportPage";
import { TrackPage } from "@/pages/TrackPage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="report/:projectId" element={<ReportPage />} />
          <Route path="track" element={<TrackPage />} />
          <Route path="track/:code" element={<TrackPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
