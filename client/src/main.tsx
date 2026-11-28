import './index.css'
import { i18nReady } from './i18n'
import { applyInitialTheme } from './hooks/useTheme.js'
import { markSignedOut } from './hooks/useAuth.js'
import { isUnauthorized, shouldRetryQuery } from './utils/queryRetry.js'
import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { App } from './App.js'
import { AppConfirmProvider } from './components/ui/dialog/AppConfirmProvider.js'
import { PublicLayout } from './components/layout/PublicLayout.js'
import { WorkspaceShell } from './components/layout/WorkspaceShell.js'

// Every page is its own chunk, so the first load ships only the shell and the opened page.
const BoardNominationPage = lazy(() =>
  import('@/pages/club/BoardNominationPage').then((m) => ({ default: m.BoardNominationPage })),
)
const ClubBoardHistoryPage = lazy(() =>
  import('@/pages/club/ClubBoardHistoryPage').then((m) => ({ default: m.ClubBoardHistoryPage })),
)
const ClubBookingsPage = lazy(() =>
  import('@/pages/club/ClubBookingsPage').then((m) => ({ default: m.ClubBookingsPage })),
)
const ClubBudgetsPage = lazy(() =>
  import('@/pages/club/ClubBudgetsPage').then((m) => ({ default: m.ClubBudgetsPage })),
)
const ClubComplaintsPage = lazy(() =>
  import('@/pages/club/ClubComplaintsPage').then((m) => ({ default: m.ClubComplaintsPage })),
)
const ClubEvaluationsPage = lazy(() =>
  import('@/pages/club/ClubEvaluationsPage').then((m) => ({ default: m.ClubEvaluationsPage })),
)
const ClubEventProposalPage = lazy(() =>
  import('@/pages/club/ClubEventProposalPage').then((m) => ({ default: m.ClubEventProposalPage })),
)
const ClubEventsPage = lazy(() =>
  import('@/pages/club/ClubEventsPage').then((m) => ({ default: m.ClubEventsPage })),
)
const ClubHomePage = lazy(() =>
  import('@/pages/club/ClubHomePage').then((m) => ({ default: m.ClubHomePage })),
)
const ClubInvitationsPage = lazy(() =>
  import('@/pages/club/ClubInvitationsPage').then((m) => ({ default: m.ClubInvitationsPage })),
)
const ClubMembersPage = lazy(() =>
  import('@/pages/club/ClubMembersPage').then((m) => ({ default: m.ClubMembersPage })),
)
const ClubPeriodicReportsPage = lazy(() =>
  import('@/pages/club/ClubPeriodicReportsPage').then((m) => ({
    default: m.ClubPeriodicReportsPage,
  })),
)
const ClubReportsPage = lazy(() =>
  import('@/pages/club/ClubReportsPage').then((m) => ({ default: m.ClubReportsPage })),
)
const ClubRoomsPage = lazy(() =>
  import('@/pages/club/ClubRoomsPage').then((m) => ({ default: m.ClubRoomsPage })),
)
const ClubSettingsPage = lazy(() =>
  import('@/pages/club/ClubSettingsPage').then((m) => ({ default: m.ClubSettingsPage })),
)
const ClubSuspensionRequestsPage = lazy(() =>
  import('@/pages/club/ClubSuspensionRequestsPage').then((m) => ({
    default: m.ClubSuspensionRequestsPage,
  })),
)
const ClubTransitionPlansPage = lazy(() =>
  import('@/pages/club/ClubTransitionPlansPage').then((m) => ({
    default: m.ClubTransitionPlansPage,
  })),
)
const ClubViolationsPage = lazy(() =>
  import('@/pages/club/ClubViolationsPage').then((m) => ({ default: m.ClubViolationsPage })),
)
const RecruitmentCampaignPage = lazy(() =>
  import('@/pages/club/RecruitmentCampaignPage').then((m) => ({
    default: m.RecruitmentCampaignPage,
  })),
)
const RecruitmentReviewPage = lazy(() =>
  import('@/pages/club/RecruitmentReviewPage').then((m) => ({ default: m.RecruitmentReviewPage })),
)
const AccountsPage = lazy(() =>
  import('@/pages/icpdp/AccountsPage').then((m) => ({ default: m.AccountsPage })),
)
const ApplicationReviewDetailPage = lazy(() =>
  import('@/pages/icpdp/ApplicationReviewDetailPage').then((m) => ({
    default: m.ApplicationReviewDetailPage,
  })),
)
const ApplicationReviewQueuePage = lazy(() =>
  import('@/pages/icpdp/ApplicationReviewQueuePage').then((m) => ({
    default: m.ApplicationReviewQueuePage,
  })),
)
const BoardNominationDetailPage = lazy(() =>
  import('@/pages/icpdp/BoardNominationDetailPage').then((m) => ({
    default: m.BoardNominationDetailPage,
  })),
)
const BoardNominationQueuePage = lazy(() =>
  import('@/pages/icpdp/BoardNominationQueuePage').then((m) => ({
    default: m.BoardNominationQueuePage,
  })),
)
const BookingReviewPage = lazy(() =>
  import('@/pages/icpdp/BookingReviewPage').then((m) => ({ default: m.BookingReviewPage })),
)
const BudgetDetailPage = lazy(() =>
  import('@/pages/icpdp/BudgetsPage').then((m) => ({ default: m.BudgetDetailPage })),
)
const BudgetsPage = lazy(() =>
  import('@/pages/icpdp/BudgetsPage').then((m) => ({ default: m.BudgetsPage })),
)
const ClubFieldsPage = lazy(() =>
  import('@/pages/icpdp/ClubFieldsPage').then((m) => ({ default: m.ClubFieldsPage })),
)
const ComplaintReviewPage = lazy(() =>
  import('@/pages/icpdp/ComplaintReviewPage').then((m) => ({ default: m.ComplaintReviewPage })),
)
const DataExportPage = lazy(() =>
  import('@/pages/icpdp/DataExportPage').then((m) => ({ default: m.DataExportPage })),
)
const EvaluationSchemesPage = lazy(() =>
  import('@/pages/icpdp/EvaluationSchemesPage').then((m) => ({ default: m.EvaluationSchemesPage })),
)
const EvaluationDetailPage = lazy(() =>
  import('@/pages/icpdp/EvaluationsPage').then((m) => ({ default: m.EvaluationDetailPage })),
)
const EvaluationsPage = lazy(() =>
  import('@/pages/icpdp/EvaluationsPage').then((m) => ({ default: m.EvaluationsPage })),
)
const EventProposalQueuePage = lazy(() =>
  import('@/pages/icpdp/EventProposalQueuePage').then((m) => ({
    default: m.EventProposalQueuePage,
  })),
)
const EventProposalReviewPage = lazy(() =>
  import('@/pages/icpdp/EventProposalReviewPage').then((m) => ({
    default: m.EventProposalReviewPage,
  })),
)
const EventReportsPage = lazy(() =>
  import('@/pages/icpdp/EventReportsPage').then((m) => ({ default: m.EventReportsPage })),
)
const IcpdpClubsPage = lazy(() =>
  import('@/pages/icpdp/IcpdpClubsPage').then((m) => ({ default: m.IcpdpClubsPage })),
)
const IcpdpHomePage = lazy(() =>
  import('@/pages/icpdp/IcpdpHomePage').then((m) => ({ default: m.IcpdpHomePage })),
)
const LeadershipTransitionDetailPage = lazy(() =>
  import('@/pages/icpdp/LeadershipTransitionDetailPage').then((m) => ({
    default: m.LeadershipTransitionDetailPage,
  })),
)
const LeadershipTransitionQueuePage = lazy(() =>
  import('@/pages/icpdp/LeadershipTransitionQueuePage').then((m) => ({
    default: m.LeadershipTransitionQueuePage,
  })),
)
const LiveDefenseRoomPage = lazy(() =>
  import('@/pages/icpdp/LiveDefenseRoomPage').then((m) => ({ default: m.LiveDefenseRoomPage })),
)
const PeriodicReportReviewPage = lazy(() =>
  import('@/pages/icpdp/PeriodicReportsPage').then((m) => ({
    default: m.PeriodicReportReviewPage,
  })),
)
const PeriodicReportsPage = lazy(() =>
  import('@/pages/icpdp/PeriodicReportsPage').then((m) => ({ default: m.PeriodicReportsPage })),
)
const PolicyPage = lazy(() =>
  import('@/pages/icpdp/PolicyPage').then((m) => ({ default: m.PolicyPage })),
)
const PropertiesPage = lazy(() =>
  import('@/pages/icpdp/PropertiesPage').then((m) => ({ default: m.PropertiesPage })),
)
const ReconciliationPage = lazy(() =>
  import('@/pages/icpdp/ReconciliationPage').then((m) => ({ default: m.ReconciliationPage })),
)
const RoomAllocationsPage = lazy(() =>
  import('@/pages/icpdp/RoomAllocationsPage').then((m) => ({ default: m.RoomAllocationsPage })),
)
const RoutingRulesPage = lazy(() =>
  import('@/pages/icpdp/RoutingRulesPage').then((m) => ({ default: m.RoutingRulesPage })),
)
const SchoolEventDetailPage = lazy(() =>
  import('@/pages/icpdp/SchoolEventsPage').then((m) => ({ default: m.SchoolEventDetailPage })),
)
const SchoolEventsPage = lazy(() =>
  import('@/pages/icpdp/SchoolEventsPage').then((m) => ({ default: m.SchoolEventsPage })),
)
const SuspensionRequestsPage = lazy(() =>
  import('@/pages/icpdp/SuspensionRequestsPage').then((m) => ({
    default: m.SuspensionRequestsPage,
  })),
)
const ViolationDetailPage = lazy(() =>
  import('@/pages/icpdp/ViolationsPage').then((m) => ({ default: m.ViolationDetailPage })),
)
const ViolationsPage = lazy(() =>
  import('@/pages/icpdp/ViolationsPage').then((m) => ({ default: m.ViolationsPage })),
)
const ClubDetail = lazy(() =>
  import('@/pages/public/ClubDetail').then((m) => ({ default: m.ClubDetail })),
)
const ClubDirectory = lazy(() =>
  import('@/pages/public/ClubDirectory').then((m) => ({ default: m.ClubDirectory })),
)
const EventDetail = lazy(() =>
  import('@/pages/public/EventDetail').then((m) => ({ default: m.EventDetail })),
)
const EventDirectory = lazy(() =>
  import('@/pages/public/EventDirectory').then((m) => ({ default: m.EventDirectory })),
)
const PublicHome = lazy(() =>
  import('@/pages/public/PublicHome').then((m) => ({ default: m.PublicHome })),
)
const PublicNotFound = lazy(() =>
  import('@/pages/public/PublicNotFound').then((m) => ({ default: m.PublicNotFound })),
)
const ApplicationEditorPage = lazy(() =>
  import('@/pages/student/ApplicationEditorPage').then((m) => ({
    default: m.ApplicationEditorPage,
  })),
)
const ApplicationsPage = lazy(() =>
  import('@/pages/student/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })),
)
const ComplaintsPage = lazy(() =>
  import('@/pages/student/ComplaintsPage').then((m) => ({ default: m.ComplaintsPage })),
)
const MemberSpacePage = lazy(() =>
  import('@/pages/student/MemberSpacePage').then((m) => ({ default: m.MemberSpacePage })),
)
const MyClubsPage = lazy(() =>
  import('@/pages/student/MyClubsPage').then((m) => ({ default: m.MyClubsPage })),
)
const MyEventRegistrationsPage = lazy(() =>
  import('@/pages/student/MyEventRegistrationsPage').then((m) => ({
    default: m.MyEventRegistrationsPage,
  })),
)
const RecruitmentApplicationPage = lazy(() =>
  import('@/pages/student/RecruitmentApplicationPage').then((m) => ({
    default: m.RecruitmentApplicationPage,
  })),
)
const RecruitmentApplicationsPage = lazy(() =>
  import('@/pages/student/RecruitmentApplicationsPage').then((m) => ({
    default: m.RecruitmentApplicationsPage,
  })),
)
const StudentHomePage = lazy(() =>
  import('@/pages/student/StudentHomePage').then((m) => ({ default: m.StudentHomePage })),
)

// Any request answered 401 means the session is gone: drop it so the shell redirects to /login.
function handleUnauthorized(error: unknown) {
  if (isUnauthorized(error)) {
    markSignedOut(queryClient)
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    // Dữ liệu trang được coi là mới trong 30 giây — quay lại trang trong khoảng này sẽ dùng cache, không tải lại.
    // 4xx never retries; 5xx and network failures retry at most twice (utils/queryRetry).
    queries: { staleTime: 30_000, retry: shouldRetryQuery },
  },
})

applyInitialTheme()

// A data router is used only so pages can block navigation (useBlocker); there are no loaders or actions.
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
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
        <Route path="icpdp/clubs" element={<IcpdpClubsPage />} />
        <Route path="icpdp/accounts" element={<AccountsPage />} />
        <Route path="club/:clubId" element={<ClubHomePage />} />
        <Route path="workspace/policy" element={<PolicyPage />} />
        <Route path="workspace/club-fields" element={<ClubFieldsPage />} />
        <Route path="club/:clubId/event-reports" element={<ClubReportsPage />} />
        <Route path="club/:clubId/transition-plans" element={<ClubTransitionPlansPage />} />
        <Route path="club/:clubId/suspension-requests" element={<ClubSuspensionRequestsPage />} />
        <Route path="workspace/suspension-requests" element={<SuspensionRequestsPage />} />
        <Route path="club/:clubId/violations" element={<ClubViolationsPage />} />
        <Route path="club/:clubId/evaluations" element={<ClubEvaluationsPage />} />
        <Route path="club/:clubId/periodic-reports" element={<ClubPeriodicReportsPage />} />
        <Route path="club/:clubId/invitations" element={<ClubInvitationsPage />} />
        <Route path="club/:clubId/budgets" element={<ClubBudgetsPage />} />
        <Route path="workspace/event-reports" element={<EventReportsPage />} />
        <Route path="workspace/budgets/:id/reconciliation" element={<ReconciliationPage />} />
        <Route path="club/:clubId/events" element={<ClubEventsPage />} />
        <Route path="club/:clubId/events/new" element={<ClubEventProposalPage />} />
        <Route path="club/:clubId/events/:eventId/edit" element={<ClubEventProposalPage />} />
        <Route
          path="club/:clubId/event-attendance"
          element={<ClubEventsPage mode="attendance" />}
        />
        <Route path="club/:clubId/event-feedback" element={<ClubEventsPage mode="feedback" />} />
        <Route path="club/:clubId/bookings" element={<ClubBookingsPage />} />
        <Route path="workspace/bookings" element={<BookingReviewPage />} />
        <Route path="workspace/room-allocations" element={<RoomAllocationsPage />} />
        <Route path="club/:clubId/rooms" element={<ClubRoomsPage />} />
        <Route path="workspace/properties" element={<PropertiesPage />} />
        <Route path="workspace/evaluation-schemes" element={<EvaluationSchemesPage />} />
        <Route path="workspace/exports" element={<DataExportPage />} />
        <Route path="workspace/applications" element={<ApplicationsPage />} />
        <Route path="workspace/applications/new" element={<ApplicationEditorPage />} />
        <Route path="workspace/applications/:id" element={<ApplicationEditorPage />} />
        <Route path="workspace/recruitment" element={<RecruitmentApplicationsPage />} />
        <Route path="workspace/recruitment/:campaignId" element={<RecruitmentApplicationPage />} />
        <Route path="workspace/event-registrations" element={<MyEventRegistrationsPage />} />
        <Route path="workspace/complaints" element={<ComplaintsPage />} />
        <Route path="workspace/clubs" element={<MyClubsPage />} />
        <Route path="workspace/clubs/:clubId" element={<MemberSpacePage />} />
        <Route path="club/:clubId/members" element={<ClubMembersPage />} />
        <Route path="workspace/complaint-review" element={<ComplaintReviewPage />} />
        <Route path="workspace/routing-rules" element={<RoutingRulesPage />} />
        <Route path="club/:clubId/complaints" element={<ClubComplaintsPage />} />
        <Route path="workspace/reviews" element={<ApplicationReviewQueuePage />} />
        <Route path="workspace/reviews/:id" element={<ApplicationReviewDetailPage />} />
        <Route path="workspace/event-proposals" element={<EventProposalQueuePage />} />
        <Route path="club/:clubId/board-history" element={<ClubBoardHistoryPage />} />
        <Route path="workspace/event-proposals/:id" element={<EventProposalReviewPage />} />
        <Route path="workspace/event-proposals/:id/defense" element={<LiveDefenseRoomPage />} />
        <Route path="workspace/budgets" element={<BudgetsPage />} />
        <Route path="workspace/budgets/:id" element={<BudgetDetailPage />} />
        <Route path="workspace/periodic-reports" element={<PeriodicReportsPage />} />
        <Route path="workspace/periodic-reports/:id" element={<PeriodicReportReviewPage />} />
        <Route path="workspace/violations" element={<ViolationsPage />} />
        <Route path="workspace/violations/:id" element={<ViolationDetailPage />} />
        <Route path="workspace/school-events" element={<SchoolEventsPage />} />
        <Route path="workspace/school-events/:id" element={<SchoolEventDetailPage />} />
        <Route path="workspace/evaluations" element={<EvaluationsPage />} />
        <Route path="workspace/evaluations/:id" element={<EvaluationDetailPage />} />
        <Route path="workspace/board-nominations" element={<BoardNominationQueuePage />} />
        <Route path="workspace/board-nominations/:id" element={<BoardNominationDetailPage />} />
        <Route
          path="workspace/leadership-transitions"
          element={<LeadershipTransitionQueuePage />}
        />
        <Route
          path="workspace/leadership-transitions/:id"
          element={<LeadershipTransitionDetailPage />}
        />
        <Route path="club/:clubId/settings" element={<ClubSettingsPage />} />
        <Route path="club/:clubId/board" element={<BoardNominationPage />} />
        <Route path="club/:clubId/recruitment" element={<RecruitmentCampaignPage />} />
        <Route
          path="club/:clubId/recruitment/:campaignId/review"
          element={<RecruitmentReviewPage />}
        />
      </Route>
      <Route path="login" element={<App />} />
      <Route path="workspace" element={<App />} />
    </>,
  ),
)

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppConfirmProvider>
          <RouterProvider router={router} />
        </AppConfirmProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

// Render only after the active locale chunk has loaded, so no raw i18n key is ever shown.
// A failed locale load still renders the app rather than leaving a blank page.
void i18nReady.then(renderApp, renderApp)
