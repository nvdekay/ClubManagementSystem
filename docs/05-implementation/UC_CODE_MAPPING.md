# Ma trận UC → code hiện hành

> Đối chiếu `main` tại `655cad3` (code) ngày 17/10/2026; 56 mã; 4 mã UC05, UC23, UC51, UC52 đã rút, còn 52 trong phạm vi.
> “Có” nghĩa route/UI đã tồn tại và nối trong app chính khi cấu hình Auth hợp lệ; không đồng nghĩa
> mọi nhánh đã qua nghiệm thu Mongo/Google/Cloudinary thật. Route server mount tại `server.ts` (dependency từ `main.ts`);
> route UI định nghĩa trong [client/src/main.tsx](../../client/src/main.tsx) (`App.tsx` chỉ render `AuthWorkspacePage`).
> “Một phần” = còn nhánh thiếu, chi tiết ở [CURRENT_IMPLEMENTATION.md §3](../CURRENT_IMPLEMENTATION.md#3-khoảng-trống-phải-xử-lý).

## Ma trận

| UC | Chức năng | Route server | UI client | Trạng thái |
|---|---|---|---|---|
| UC01 | Xác thực qua Google OAuth và vào workspace theo vai trò | [auth-routes.ts](../../server/src/interface/http/auth-routes.ts) | [LoginPage.tsx](../../client/src/pages/auth/LoginPage.tsx) | Có; OAuth thật chưa nghiệm thu trong lượt này |
| UC02 | Mở dashboard theo vai trò của tôi | [dashboard-routes.ts](../../server/src/interface/http/dashboard-routes.ts) | [RoleDashboard.tsx](../../client/src/components/custom/RoleDashboard.tsx) | Một phần; panel sự kiện nội bộ luôn 0, chưa có lịch sử cơ cấu theo CLB |
| UC03 | Quản lý tài khoản và gán vai trò | [account-admin-routes.ts](../../server/src/interface/http/account-admin-routes.ts) | [AccountsPage.tsx](../../client/src/pages/icpdp/AccountsPage.tsx) | Có; khoá tài khoản chưa nối UC40 |
| UC04 | Cấu hình chính sách và deadline của nhà trường | [policy-routes.ts](../../server/src/interface/http/policy-routes.ts) | [PolicyPage.tsx](../../client/src/pages/icpdp/PolicyPage.tsx) | Có; domain lấy ALLOWED_DOMAIN. Danh mục lĩnh vực CLB ([club-field-routes.ts](../../server/src/interface/http/club-field-routes.ts), [ClubFieldsPage.tsx](../../client/src/pages/icpdp/ClubFieldsPage.tsx), `/workspace/club-fields`) là dữ liệu hỗ trợ cho UC06/UC07, không thuộc FR nào của UC04 |
| UC05 | Đã rút: Cấu hình quy tắc định tuyến phê duyệt | — | — | Đã rút |
| UC06 | Khám phá CLB và hoạt động đang mở | [public-discovery-routes.ts](../../server/src/interface/http/public-discovery-routes.ts) | [ClubDirectory.tsx](../../client/src/pages/public/ClubDirectory.tsx), [ClubDetail.tsx](../../client/src/pages/public/ClubDetail.tsx), [EventDirectory.tsx](../../client/src/pages/public/EventDirectory.tsx), [EventDetail.tsx](../../client/src/pages/public/EventDetail.tsx) | Một phần; API mở, UI yêu cầu đăng nhập; E1 chưa gợi ý CLB mới |
| UC07 | Nộp hồ sơ đề nghị thành lập CLB | [club-application-routes.ts](../../server/src/interface/http/club-application-routes.ts) | [ApplicationsPage.tsx](../../client/src/pages/student/ApplicationsPage.tsx), [ApplicationEditorPage.tsx](../../client/src/pages/student/ApplicationEditorPage.tsx) | Có; E3 cảnh báo trùng tên chưa hiện cho ICPDP; cần Cloudinary thật và dọn asset mồ côi |
| UC08 | Thẩm định và quyết định hồ sơ thành lập CLB | [club-application-review-routes.ts](../../server/src/interface/http/club-application-review-routes.ts) | [ApplicationReviewQueuePage.tsx](../../client/src/pages/icpdp/ApplicationReviewQueuePage.tsx), [ApplicationReviewDetailPage.tsx](../../client/src/pages/icpdp/ApplicationReviewDetailPage.tsx) | Có; duyệt tạo Active ngay; job `application-expiry-job` chuyển hồ sơ quá hạn sửa sang `Expired` |
| UC09 | Cấu hình hồ sơ và cơ cấu tổ chức CLB | [club-profile-routes.ts](../../server/src/interface/http/club-profile-routes.ts) | [ClubSettingsPage.tsx](../../client/src/pages/club/ClubSettingsPage.tsx) | Có; GET và mutation đều yêu cầu `club.profile.manage` (Leader); `assertClubSettingsRead` không còn được gọi |
| UC10 | Đề xuất ban chủ nhiệm CLB | [board-nomination-routes.ts](../../server/src/interface/http/board-nomination-routes.ts) | [BoardNominationPage.tsx](../../client/src/pages/club/BoardNominationPage.tsx) | Một phần; trùng người hai ghế, CLB không thấy trạng thái/lý do trả lại |
| UC11 | Xác nhận ban chủ nhiệm | [board-nomination-routes.ts](../../server/src/interface/http/board-nomination-routes.ts) | [BoardNominationQueuePage.tsx](../../client/src/pages/icpdp/BoardNominationQueuePage.tsx), [BoardNominationDetailPage.tsx](../../client/src/pages/icpdp/BoardNominationDetailPage.tsx) | Có |
| UC12 | Lập kế hoạch chuyển giao nhiệm kỳ | [club-transition-plan-routes.ts](../../server/src/interface/http/club-transition-plan-routes.ts) | [ClubTransitionPlansPage.tsx](../../client/src/pages/club/ClubTransitionPlansPage.tsx) | Một phần; A2 chưa đổi được danh sách ghế |
| UC13 | Xác nhận chuyển giao nhiệm kỳ | [leadership-transition-routes.ts](../../server/src/interface/http/leadership-transition-routes.ts) | [LeadershipTransitionQueuePage.tsx](../../client/src/pages/icpdp/LeadershipTransitionQueuePage.tsx), [LeadershipTransitionDetailPage.tsx](../../client/src/pages/icpdp/LeadershipTransitionDetailPage.tsx) | Có |
| UC14 | Yêu cầu tạm ngừng hoạt động CLB | [suspension-request-routes.ts](../../server/src/interface/http/suspension-request-routes.ts) | [ClubSuspensionRequestsPage.tsx](../../client/src/pages/club/ClubSuspensionRequestsPage.tsx) | Có; ICPDP duyệt tại [SuspensionRequestsPage.tsx](../../client/src/pages/icpdp/SuspensionRequestsPage.tsx) |
| UC15 | Tạm ngừng, kích hoạt lại hoặc giải thể CLB | [club-lifecycle-routes.ts](../../server/src/interface/http/club-lifecycle-routes.ts) | [IcpdpClubsPage.tsx](../../client/src/pages/icpdp/IcpdpClubsPage.tsx) | Một phần; có thao tác ICPDP và job lifecycle, nhưng giải thể chưa dọn nghĩa vụ/cảnh báo đối soát, chưa nối UC40 |
| UC16 | Tạo và công bố đợt tuyển thành viên | [recruitment-campaign-routes.ts](../../server/src/interface/http/recruitment-campaign-routes.ts) | [RecruitmentCampaignPage.tsx](../../client/src/pages/club/RecruitmentCampaignPage.tsx) | Có |
| UC17 | Nộp đơn ứng tuyển vào CLB | [recruitment-application-routes.ts](../../server/src/interface/http/recruitment-application-routes.ts) | [RecruitmentApplicationsPage.tsx](../../client/src/pages/student/RecruitmentApplicationsPage.tsx), [RecruitmentApplicationPage.tsx](../../client/src/pages/student/RecruitmentApplicationPage.tsx) | Một phần; thành viên `Inactive` vẫn nộp được (E3) |
| UC18 | Sàng lọc và quyết định đơn ứng tuyển | [recruitment-application-routes.ts](../../server/src/interface/http/recruitment-application-routes.ts) | [RecruitmentReviewPage.tsx](../../client/src/pages/club/RecruitmentReviewPage.tsx) | Có |
| UC19 | Ghi nhận đánh giá ứng viên | [candidate-evaluation-routes.ts](../../server/src/interface/http/candidate-evaluation-routes.ts) | [CandidateEvaluationPanel.tsx](../../client/src/pages/club/CandidateEvaluationPanel.tsx) | Có |
| UC20 | Tiếp nhận ứng viên trúng tuyển | [recruitment-application-routes.ts](../../server/src/interface/http/recruitment-application-routes.ts) | [RecruitmentReviewPage.tsx](../../client/src/pages/club/RecruitmentReviewPage.tsx) | Một phần; chưa có tiếp nhận thủ công (A1) |
| UC21 | Quản lý trạng thái thành viên | [membership-routes.ts](../../server/src/interface/http/membership-routes.ts) | [ClubMembersPage.tsx](../../client/src/pages/club/ClubMembersPage.tsx) | Một phần; `Inactive` không tái xác nhận về `Active` được; A2 qua [membership-reconfirmation-routes.ts](../../server/src/interface/http/membership-reconfirmation-routes.ts) và `membership-reconfirmation-job` |
| UC22 | Xin rời CLB | [membership-routes.ts](../../server/src/interface/http/membership-routes.ts) | [MyClubsPage.tsx](../../client/src/pages/student/MyClubsPage.tsx) | Một phần; Leader thi hành qua ClubMembersPage; yêu cầu rời chưa hiện trên dashboard |
| UC23 | Đã rút: Quản lý vai trò CLB | — | — | Đã rút 13/10/2026: role CLB cố định, API/UI role động đã gỡ |
| UC24 | Sử dụng không gian thành viên của tôi | [member-space-routes.ts](../../server/src/interface/http/member-space-routes.ts) | [MemberSpacePage.tsx](../../client/src/pages/student/MemberSpacePage.tsx) | Có; Active/Inactive được đọc |
| UC25 | Nộp đề xuất tổ chức sự kiện | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC26 | Thẩm định và quyết định đề xuất sự kiện | [event-proposal-review-routes.ts](../../server/src/interface/http/event-proposal-review-routes.ts) | [EventProposalQueuePage.tsx](../../client/src/pages/icpdp/EventProposalQueuePage.tsx), [EventProposalReviewPage.tsx](../../client/src/pages/icpdp/EventProposalReviewPage.tsx) | Có |
| UC27 | Công bố sự kiện và mở đăng ký | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC28 | Huỷ hoặc đổi lịch sự kiện | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC29 | Đăng ký tham gia sự kiện | [event-registration-routes.ts](../../server/src/interface/http/event-registration-routes.ts) | [MyEventRegistrationsPage.tsx](../../client/src/pages/student/MyEventRegistrationsPage.tsx) | Có |
| UC30 | Quản lý sức chứa và danh sách chờ | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC31 | Check-in vào sự kiện | [event-checkin-routes.ts](../../server/src/interface/http/event-checkin-routes.ts) | [EventCheckInForm.tsx](../../client/src/components/custom/EventCheckInForm.tsx) | Có; check-in thủ công qua club-event |
| UC32 | Chốt điểm danh sự kiện | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC33 | Nộp báo cáo sau sự kiện | [post-event-report-routes.ts](../../server/src/interface/http/post-event-report-routes.ts) | [ClubReportsPage.tsx](../../client/src/pages/club/ClubReportsPage.tsx) | Có |
| UC34 | Thẩm định và đóng báo cáo sự kiện | [post-event-report-routes.ts](../../server/src/interface/http/post-event-report-routes.ts) | [EventReportsPage.tsx](../../client/src/pages/icpdp/EventReportsPage.tsx) | Có |
| UC35 | Ghi nhận giải ngân | [budget-disbursement-routes.ts](../../server/src/interface/http/budget-disbursement-routes.ts) | [BudgetsPage.tsx](../../client/src/pages/icpdp/BudgetsPage.tsx) (`BudgetsPage`, `BudgetDetailPage`) | Có; Advance/TopUp/Refund theo trạng thái; vẫn ghi tạm ứng được sau khi sự kiện kết thúc |
| UC36 | Ghi nhận khoản chi và nộp quyết toán | [event-finance-routes.ts](../../server/src/interface/http/event-finance-routes.ts) | [ClubBudgetsPage.tsx](../../client/src/pages/club/ClubBudgetsPage.tsx) | Có; đã nối vào app chính |
| UC37 | Đối soát ngân sách và chi tiêu | [event-finance-routes.ts](../../server/src/interface/http/event-finance-routes.ts) | [ReconciliationPage.tsx](../../client/src/pages/icpdp/ReconciliationPage.tsx) | Có; đã nối vào app chính |
| UC38 | Nộp báo cáo hoạt động định kỳ | [club-periodic-report-routes.ts](../../server/src/interface/http/club-periodic-report-routes.ts) | [ClubPeriodicReportsPage.tsx](../../client/src/pages/club/ClubPeriodicReportsPage.tsx) | Có |
| UC39 | Thẩm định báo cáo hoạt động định kỳ | [periodic-report-routes.ts](../../server/src/interface/http/periodic-report-routes.ts) | [PeriodicReportsPage.tsx](../../client/src/pages/icpdp/PeriodicReportsPage.tsx) (`PeriodicReportsPage`, `PeriodicReportReviewPage`) | Có; nhận bài nộp và nộp lại từ UC38 |
| UC40 | Quản lý hồ sơ vi phạm và tuân thủ | [violation-routes.ts](../../server/src/interface/http/violation-routes.ts) | [ViolationsPage.tsx](../../client/src/pages/icpdp/ViolationsPage.tsx) (`ViolationsPage`, `ViolationDetailPage`) | Có; CLB giải trình và khắc phục qua [club-violation-routes.ts](../../server/src/interface/http/club-violation-routes.ts), [ClubViolationsPage.tsx](../../client/src/pages/club/ClubViolationsPage.tsx) |
| UC41 | Cấu hình scheme đánh giá | [evaluation-scheme-routes.ts](../../server/src/interface/http/evaluation-scheme-routes.ts) | [EvaluationSchemesPage.tsx](../../client/src/pages/icpdp/EvaluationSchemesPage.tsx) | Có |
| UC42 | Sinh bản nháp đánh giá hiệu quả CLB | [evaluation-routes.ts](../../server/src/interface/http/evaluation-routes.ts) | [EvaluationsPage.tsx](../../client/src/pages/icpdp/EvaluationsPage.tsx) (`EvaluationsPage`, `EvaluationDetailPage`) | Một phần; bản nháp đếm cả báo cáo `Returned`, không đọc tuân thủ booking |
| UC43 | Xem lại, chốt và công bố đánh giá | [evaluation-routes.ts](../../server/src/interface/http/evaluation-routes.ts) | [EvaluationsPage.tsx](../../client/src/pages/icpdp/EvaluationsPage.tsx) (`EvaluationDetailPage`) | Một phần; CLB chưa khiếu nại được (E1); CLB xem kết quả đã công bố qua [club-evaluation-routes.ts](../../server/src/interface/http/club-evaluation-routes.ts), [ClubEvaluationsPage.tsx](../../client/src/pages/club/ClubEvaluationsPage.tsx) |
| UC44 | Quản lý danh mục cơ sở vật chất | [property-routes.ts](../../server/src/interface/http/property-routes.ts) | [PropertiesPage.tsx](../../client/src/pages/icpdp/PropertiesPage.tsx) | Có |
| UC45 | Gửi yêu cầu đặt cơ sở vật chất (hội trường, sân, sân khấu, thiết bị) | [facility-booking-routes.ts](../../server/src/interface/http/facility-booking-routes.ts) | [ClubBookingsPage.tsx](../../client/src/pages/club/ClubBookingsPage.tsx) | Có; không nhận ROOM |
| UC46 | Thẩm định yêu cầu cơ sở vật chất | [facility-booking-routes.ts](../../server/src/interface/http/facility-booking-routes.ts) | [BookingReviewPage.tsx](../../client/src/pages/icpdp/BookingReviewPage.tsx) | Có; ROOM do UC58 |
| UC47 | Theo dõi và huỷ / trả cơ sở vật chất đã đặt | [facility-booking-routes.ts](../../server/src/interface/http/facility-booking-routes.ts) | [ClubBookingsPage.tsx](../../client/src/pages/club/ClubBookingsPage.tsx) | Có; không huỷ ROOM qua luồng này |
| UC48 | Gửi phản hồi sau sự kiện | [event-feedback-routes.ts](../../server/src/interface/http/event-feedback-routes.ts) | [EventFeedbackForm.tsx](../../client/src/components/custom/EventFeedbackForm.tsx) | Một phần; chỉ điểm tổng, chưa theo tiêu chí |
| UC49 | Xem phản hồi sự kiện | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Một phần; mode feedback, ngưỡng ẩn danh; chỉ điểm tổng |
| UC50 | Gửi góp ý cho CLB hoặc ICPDP | [student-feedback-routes.ts](../../server/src/interface/http/student-feedback-routes.ts) | [StudentFeedbackPage.tsx](../../client/src/pages/student/StudentFeedbackPage.tsx) | Có; một chiều; inbox [ClubFeedbackInboxPage.tsx](../../client/src/pages/club/ClubFeedbackInboxPage.tsx) và [StudentFeedbackInboxPage.tsx](../../client/src/pages/icpdp/StudentFeedbackInboxPage.tsx) |
| UC51 | Đã rút: Phân loại khiếu nại | — | — | Đã rút 09/10/2026: UC50 là góp ý một chiều |
| UC52 | Đã rút: Trả lời khiếu nại được chuyển xuống | — | — | Đã rút 09/10/2026: UC50 là góp ý một chiều |
| UC53 | Tạo sự kiện cấp trường và mời câu lạc bộ tham gia | [school-event-routes.ts](../../server/src/interface/http/school-event-routes.ts) | [SchoolEventsPage.tsx](../../client/src/pages/icpdp/SchoolEventsPage.tsx) (`SchoolEventsPage`, `SchoolEventDetailPage`) | Có gửi/thu hồi lời mời và publish; publish chưa báo sinh viên |
| UC54 | Phản hồi lời mời tham gia sự kiện | [club-invitation-routes.ts](../../server/src/interface/http/club-invitation-routes.ts) | [ClubInvitationsPage.tsx](../../client/src/pages/club/ClubInvitationsPage.tsx) | Có |
| UC55 | Xuất dữ liệu và báo cáo | [export-routes.ts](../../server/src/interface/http/export-routes.ts) | [DataExportPage.tsx](../../client/src/pages/icpdp/DataExportPage.tsx) | Có; Leader còn có xuất roster riêng tại UI |
| UC58 | Phân phòng học cho CLB theo học kỳ | [room-allocation-routes.ts](../../server/src/interface/http/room-allocation-routes.ts) | [RoomAllocationsPage.tsx](../../client/src/pages/icpdp/RoomAllocationsPage.tsx) | Có; CLB xem qua [ClubRoomsPage.tsx](../../client/src/pages/club/ClubRoomsPage.tsx), chỉ Leader |

## Nguồn kiểm chứng xuyên suốt

- [main.ts](../../server/src/main.ts): dependency thực được truyền vào `buildApp`.
- [server.ts](../../server/src/interface/http/server.ts): điều kiện mount route theo dependency.
- [main.tsx](../../client/src/main.tsx): route UI thật (mọi route; `App.tsx` chỉ render `AuthWorkspacePage`).
- [user-routes.ts](../../server/src/interface/http/user-routes.ts): không được mount trong `server.ts` — code chết.
- [access.ts](../../server/src/domain/access.ts): 14 permission cố định và resolver Leader/Member.
- [member-space.ts](../../server/src/usecase/member-space.ts): roster chỉ đọc cho Active/Inactive.
- [room-allocation.ts](../../server/src/usecase/room-allocation.ts): UC58 phía CLB yêu cầu `club.booking.manage`.
- [PublicLayout.tsx](../../client/src/components/layout/PublicLayout.tsx): UI danh bạ vẫn yêu cầu đăng nhập.
- [student-feedback.ts](../../server/src/usecase/student-feedback.ts): góp ý một chiều, đúng nơi nhận và bảo vệ danh tính.

## Giới hạn kiểm thử

`npm run check` ngày 17/10/2026 xanh. Chạy kèm `MONGO_URI` tới Mongo replica set riêng: 442 test
đều qua, không skip. Nghiệm thu trình duyệt các màn mới chạy trên database QA riêng, không đụng dữ liệu thật.
Danh sách test hiện có ở [server/tests](../../server/tests/); checklist mở ở `.sdd/specs/` được
giữ nguyên nếu chưa có bằng chứng nghiệm thu.
