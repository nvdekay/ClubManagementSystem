import "./index.css";
import "./i18n"; // initializes i18next before first render
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { App } from "./App.js";
import { PublicLayout } from "./components/layout/PublicLayout.js";
import { WorkspaceShell } from "./components/layout/WorkspaceShell.js";
import { ClubDetail } from "./pages/public/ClubDetail.js";
import { ClubDirectory } from "./pages/public/ClubDirectory.js";
import { EventDetail } from "./pages/public/EventDetail.js";
import { EventDirectory } from "./pages/public/EventDirectory.js";
import { PublicHome } from "./pages/public/PublicHome.js";
import { PublicNotFound } from "./pages/public/PublicNotFound.js";
import { PolicyPage } from "./pages/icpdp/PolicyPage.js";
import { IcpdpHomePage } from "./pages/icpdp/IcpdpHomePage.js";
import { AccountsPage } from "./pages/icpdp/AccountsPage.js";
import { ApplicationsPage } from "./pages/student/ApplicationsPage.js";
import { ApplicationEditorPage } from "./pages/student/ApplicationEditorPage.js";
import { StudentHomePage } from "./pages/student/StudentHomePage.js";
import { ClubHomePage } from "./pages/club/ClubHomePage.js";
import { ApplicationReviewQueuePage } from "./pages/icpdp/ApplicationReviewQueuePage.js";
import { ApplicationReviewDetailPage } from "./pages/icpdp/ApplicationReviewDetailPage.js";
import { ClubSettingsPage } from "./pages/club/ClubSettingsPage.js";
import { BoardNominationPage } from "./pages/club/BoardNominationPage.js";
import { BoardNominationQueuePage } from "./pages/icpdp/BoardNominationQueuePage.js";
import { BoardNominationDetailPage } from "./pages/icpdp/BoardNominationDetailPage.js";
import { LeadershipTransitionQueuePage } from "./pages/icpdp/LeadershipTransitionQueuePage.js";
import { LeadershipTransitionDetailPage } from "./pages/icpdp/LeadershipTransitionDetailPage.js";
import { RecruitmentCampaignPage } from "./pages/club/RecruitmentCampaignPage.js";
import { RecruitmentReviewPage } from "./pages/club/RecruitmentReviewPage.js";
import { RecruitmentApplicationPage } from "./pages/student/RecruitmentApplicationPage.js";
import { RecruitmentApplicationsPage } from "./pages/student/RecruitmentApplicationsPage.js";
import { MyEventRegistrationsPage } from "./pages/student/MyEventRegistrationsPage.js";
import { StudentFeedbackPage } from "./pages/student/StudentFeedbackPage.js";
import { ClubFeedbackInboxPage } from "./pages/club/ClubFeedbackInboxPage.js";
import { StudentFeedbackInboxPage } from "./pages/icpdp/StudentFeedbackInboxPage.js";

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
            <Route path="*" element={<PublicNotFound />} />
          </Route>
          <Route element={<WorkspaceShell />}>
            <Route path="student" element={<StudentHomePage />} />
            <Route path="icpdp" element={<IcpdpHomePage />} />
            <Route path="icpdp/accounts" element={<AccountsPage />} />
            <Route path="club/:clubId" element={<ClubHomePage />} />
            <Route path="workspace/policy" element={<PolicyPage />} />
            <Route path="workspace/applications" element={<ApplicationsPage />} />
            <Route path="workspace/applications/new" element={<ApplicationEditorPage />} />
            <Route path="workspace/applications/:id" element={<ApplicationEditorPage />} />
            <Route path="workspace/recruitment" element={<RecruitmentApplicationsPage />} />
            <Route path="workspace/recruitment/:campaignId" element={<RecruitmentApplicationPage />} />
            <Route path="workspace/event-registrations" element={<MyEventRegistrationsPage />} />
            <Route path="workspace/feedback" element={<StudentFeedbackPage />} />
            <Route path="workspace/student-feedback" element={<StudentFeedbackInboxPage />} />
            <Route path="club/:clubId/feedback" element={<ClubFeedbackInboxPage />} />
            <Route path="workspace/reviews" element={<ApplicationReviewQueuePage />} />
            <Route path="workspace/reviews/:id" element={<ApplicationReviewDetailPage />} />
            <Route path="workspace/board-nominations" element={<BoardNominationQueuePage />} />
            <Route path="workspace/board-nominations/:id" element={<BoardNominationDetailPage />} />
            <Route path="workspace/leadership-transitions" element={<LeadershipTransitionQueuePage />} />
            <Route path="workspace/leadership-transitions/:id" element={<LeadershipTransitionDetailPage />} />
            <Route path="club/:clubId/settings" element={<ClubSettingsPage />} />
            <Route path="club/:clubId/board" element={<BoardNominationPage />} />
            <Route path="club/:clubId/recruitment" element={<RecruitmentCampaignPage />} />
            <Route path="club/:clubId/recruitment/:campaignId/review" element={<RecruitmentReviewPage />} />
          </Route>
          <Route path="login" element={<App />} />
          <Route path="workspace" element={<App />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
