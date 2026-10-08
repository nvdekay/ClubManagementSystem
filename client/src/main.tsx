import "./index.css";
import "./i18n"; // initializes i18next before first render
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { App } from "./App.js";
import { PublicLayout } from "./components/layout/PublicLayout.js";
import { ClubDetail } from "./pages/public/ClubDetail.js";
import { ClubDirectory } from "./pages/public/ClubDirectory.js";
import { EventDetail } from "./pages/public/EventDetail.js";
import { EventDirectory } from "./pages/public/EventDirectory.js";
import { PublicHome } from "./pages/public/PublicHome.js";
import { PublicNotFound } from "./pages/public/PublicNotFound.js";
import { PolicyPage } from "./pages/icpdp/PolicyPage.js";
import { IcpdpHomePage } from "./pages/icpdp/IcpdpHomePage.js";
import { ApplicationsPage } from "./pages/student/ApplicationsPage.js";
import { ApplicationEditorPage } from "./pages/student/ApplicationEditorPage.js";
import { StudentHomePage } from "./pages/student/StudentHomePage.js";
import { ClubHomePage } from "./pages/club/ClubHomePage.js";

const queryClient = new QueryClient({
  // Pages stay fresh for 30s — revisiting a page within that window serves cache, no refetch.
  defaultOptions: { queries: { staleTime: 30_000 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<PublicHome />} />
            <Route path="clubs" element={<ClubDirectory />} />
            <Route path="clubs/:id" element={<ClubDetail />} />
            <Route path="events" element={<EventDirectory />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="workspace/policy" element={<PolicyPage />} />
            <Route path="workspace/applications" element={<ApplicationsPage />} />
            <Route path="workspace/applications/new" element={<ApplicationEditorPage />} />
            <Route path="workspace/applications/:id" element={<ApplicationEditorPage />} />
            <Route path="*" element={<PublicNotFound />} />
          </Route>
          <Route path="login" element={<App />} />
          <Route path="workspace" element={<App />} />
          <Route path="student" element={<StudentHomePage />} />
          <Route path="icpdp" element={<IcpdpHomePage />} />
          <Route path="club/:clubId" element={<ClubHomePage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
