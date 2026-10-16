# Ma trận UC → code hiện hành

> Đối chiếu commit `60fc2db` ngày 15/10/2026; 56 mã; theo SRS trên `main` UC05 đã rút, còn 55 UC hiệu lực. Code không triển khai UC23, UC51, UC52.
> “Có” nghĩa route/UI đã tồn tại và nối trong app chính khi cấu hình Auth hợp lệ; không đồng nghĩa
> mọi nhánh đã qua nghiệm thu Mongo/Google/Cloudinary thật. `main.ts` là điểm kiểm tra mount.

## Ma trận

| UC | Chức năng | Route server | UI client | Trạng thái |
|---|---|---|---|---|
| UC01 | Xác thực qua Google OAuth và vào workspace theo vai trò | [auth-routes.ts](../../server/src/interface/http/auth-routes.ts) | [LoginPage.tsx](../../client/src/pages/auth/LoginPage.tsx) | Có; OAuth thật chưa nghiệm thu trong lượt này |
| UC02 | Mở dashboard theo vai trò của tôi | [dashboard-routes.ts](../../server/src/interface/http/dashboard-routes.ts) | [RoleDashboard.tsx](../../client/src/components/custom/RoleDashboard.tsx) | Có |
| UC03 | Quản lý tài khoản và gán vai trò | [account-admin-routes.ts](../../server/src/interface/http/account-admin-routes.ts) | [AccountsPage.tsx](../../client/src/pages/icpdp/AccountsPage.tsx) | Có |
| UC04 | Cấu hình chính sách và deadline của nhà trường | [policy-routes.ts](../../server/src/interface/http/policy-routes.ts) | [PolicyPage.tsx](../../client/src/pages/icpdp/PolicyPage.tsx) | Có; domain lấy ALLOWED_DOMAIN |
| UC05 | Đã rút: Cấu hình quy tắc định tuyến phê duyệt | — | — | Đã rút |
| UC06 | Khám phá CLB và hoạt động đang mở | [public-discovery-routes.ts](../../server/src/interface/http/public-discovery-routes.ts) | [ClubDirectory.tsx](../../client/src/pages/public/ClubDirectory.tsx) | Có; API mở, UI yêu cầu đăng nhập |
| UC07 | Nộp hồ sơ đề nghị thành lập CLB | [club-application-routes.ts](../../server/src/interface/http/club-application-routes.ts) | [ApplicationEditorPage.tsx](../../client/src/pages/student/ApplicationEditorPage.tsx) | Có; cần Cloudinary thật và dọn asset mồ côi |
| UC08 | Thẩm định và quyết định hồ sơ thành lập CLB | [club-application-review-routes.ts](../../server/src/interface/http/club-application-review-routes.ts) | [ApplicationReviewDetailPage.tsx](../../client/src/pages/icpdp/ApplicationReviewDetailPage.tsx) | Có; duyệt tạo Active ngay; job `application-expiry-job` chuyển hồ sơ quá hạn sửa sang `Expired` |
| UC09 | Cấu hình hồ sơ và cơ cấu tổ chức CLB | [club-profile-routes.ts](../../server/src/interface/http/club-profile-routes.ts) | [ClubSettingsPage.tsx](../../client/src/pages/club/ClubSettingsPage.tsx) | Có; UI Leader, GET server cho current member |
| UC10 | Đề xuất ban chủ nhiệm CLB | [board-nomination-routes.ts](../../server/src/interface/http/board-nomination-routes.ts) | [BoardNominationPage.tsx](../../client/src/pages/club/BoardNominationPage.tsx) | Có |
| UC11 | Xác nhận ban chủ nhiệm | [board-nomination-routes.ts](../../server/src/interface/http/board-nomination-routes.ts) | [BoardNominationDetailPage.tsx](../../client/src/pages/icpdp/BoardNominationDetailPage.tsx) | Có |
| UC12 | Lập kế hoạch chuyển giao nhiệm kỳ | [club-transition-plan-routes.ts](../../server/src/interface/http/club-transition-plan-routes.ts) | [ClubTransitionPlansPage.tsx](../../client/src/pages/club/ClubTransitionPlansPage.tsx) | Có |
| UC13 | Xác nhận chuyển giao nhiệm kỳ | [leadership-transition-routes.ts](../../server/src/interface/http/leadership-transition-routes.ts) | [LeadershipTransitionDetailPage.tsx](../../client/src/pages/icpdp/LeadershipTransitionDetailPage.tsx) | Có |
| UC14 | Yêu cầu tạm ngừng hoạt động CLB | [suspension-request-routes.ts](../../server/src/interface/http/suspension-request-routes.ts) | [ClubSuspensionRequestsPage.tsx](../../client/src/pages/club/ClubSuspensionRequestsPage.tsx) | Có; ICPDP duyệt tại [SuspensionRequestsPage.tsx](../../client/src/pages/icpdp/SuspensionRequestsPage.tsx) |
| UC15 | Tạm ngừng, kích hoạt lại hoặc giải thể CLB | [club-lifecycle-routes.ts](../../server/src/interface/http/club-lifecycle-routes.ts) | [IcpdpClubsPage.tsx](../../client/src/pages/icpdp/IcpdpClubsPage.tsx) | Có thao tác ICPDP và job lifecycle |
| UC16 | Tạo và công bố đợt tuyển thành viên | [recruitment-campaign-routes.ts](../../server/src/interface/http/recruitment-campaign-routes.ts) | [RecruitmentCampaignPage.tsx](../../client/src/pages/club/RecruitmentCampaignPage.tsx) | Có |
| UC17 | Nộp đơn ứng tuyển vào CLB | [recruitment-application-routes.ts](../../server/src/interface/http/recruitment-application-routes.ts) | [RecruitmentApplicationPage.tsx](../../client/src/pages/student/RecruitmentApplicationPage.tsx) | Có |
| UC18 | Sàng lọc và quyết định đơn ứng tuyển | [recruitment-application-routes.ts](../../server/src/interface/http/recruitment-application-routes.ts) | [RecruitmentReviewPage.tsx](../../client/src/pages/club/RecruitmentReviewPage.tsx) | Có |
| UC19 | Ghi nhận đánh giá ứng viên | [candidate-evaluation-routes.ts](../../server/src/interface/http/candidate-evaluation-routes.ts) | [CandidateEvaluationPanel.tsx](../../client/src/pages/club/CandidateEvaluationPanel.tsx) | Có |
| UC20 | Tiếp nhận ứng viên trúng tuyển | [recruitment-application-routes.ts](../../server/src/interface/http/recruitment-application-routes.ts) | [RecruitmentReviewPage.tsx](../../client/src/pages/club/RecruitmentReviewPage.tsx) | Có |
| UC21 | Quản lý trạng thái thành viên | [membership-routes.ts](../../server/src/interface/http/membership-routes.ts) | [ClubMembersPage.tsx](../../client/src/pages/club/ClubMembersPage.tsx) | Có; A2 qua [membership-reconfirmation-routes.ts](../../server/src/interface/http/membership-reconfirmation-routes.ts) và `membership-reconfirmation-job` |
| UC22 | Xin rời CLB | [membership-routes.ts](../../server/src/interface/http/membership-routes.ts) | [MyClubsPage.tsx](../../client/src/pages/student/MyClubsPage.tsx) | Có; Leader thi hành qua ClubMembersPage |
| UC23 | Quản lý vai trò CLB | — | — | Không triển khai: role CLB cố định (ADR-007), API/UI role động đã gỡ |
| UC24 | Sử dụng không gian thành viên của tôi | [member-space-routes.ts](../../server/src/interface/http/member-space-routes.ts) | [MemberSpacePage.tsx](../../client/src/pages/student/MemberSpacePage.tsx) | Có; Active/Inactive được đọc |
| UC25 | Nộp đề xuất tổ chức sự kiện | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC26 | Thẩm định và quyết định đề xuất sự kiện | [event-proposal-review-routes.ts](../../server/src/interface/http/event-proposal-review-routes.ts) | [EventProposalReviewPage.tsx](../../client/src/pages/icpdp/EventProposalReviewPage.tsx) | Có |
| UC27 | Công bố sự kiện và mở đăng ký | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC28 | Huỷ hoặc đổi lịch sự kiện | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC29 | Đăng ký tham gia sự kiện | [event-registration-routes.ts](../../server/src/interface/http/event-registration-routes.ts) | [MyEventRegistrationsPage.tsx](../../client/src/pages/student/MyEventRegistrationsPage.tsx) | Có |
| UC30 | Quản lý sức chứa và danh sách chờ | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC31 | Check-in vào sự kiện | [event-checkin-routes.ts](../../server/src/interface/http/event-checkin-routes.ts) | [EventCheckInForm.tsx](../../client/src/components/custom/EventCheckInForm.tsx) | Có; check-in thủ công qua club-event |
| UC32 | Chốt điểm danh sự kiện | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có |
| UC33 | Nộp báo cáo sau sự kiện | [post-event-report-routes.ts](../../server/src/interface/http/post-event-report-routes.ts) | [ClubReportsPage.tsx](../../client/src/pages/club/ClubReportsPage.tsx) | Có |
| UC34 | Thẩm định và đóng báo cáo sự kiện | [post-event-report-routes.ts](../../server/src/interface/http/post-event-report-routes.ts) | [EventReportsPage.tsx](../../client/src/pages/icpdp/EventReportsPage.tsx) | Có |
| UC35 | Ghi nhận giải ngân | [budget-disbursement-routes.ts](../../server/src/interface/http/budget-disbursement-routes.ts) | [BudgetsPage.tsx](../../client/src/pages/icpdp/BudgetsPage.tsx) | Có; Advance/TopUp/Refund theo trạng thái |
| UC36 | Ghi nhận khoản chi và nộp quyết toán | [event-finance-routes.ts](../../server/src/interface/http/event-finance-routes.ts) | [ClubBudgetsPage.tsx](../../client/src/pages/club/ClubBudgetsPage.tsx) | Có; đã nối vào app chính |
| UC37 | Đối soát ngân sách và chi tiêu | [event-finance-routes.ts](../../server/src/interface/http/event-finance-routes.ts) | [ReconciliationPage.tsx](../../client/src/pages/icpdp/ReconciliationPage.tsx) | Có; đã nối vào app chính |
| UC38 | Nộp báo cáo hoạt động định kỳ | [club-periodic-report-routes.ts](../../server/src/interface/http/club-periodic-report-routes.ts) | [ClubPeriodicReportsPage.tsx](../../client/src/pages/club/ClubPeriodicReportsPage.tsx) | Có |
| UC39 | Thẩm định báo cáo hoạt động định kỳ | [periodic-report-routes.ts](../../server/src/interface/http/periodic-report-routes.ts) | [PeriodicReportsPage.tsx](../../client/src/pages/icpdp/PeriodicReportsPage.tsx) | Có; nhận bài nộp và nộp lại từ UC38 |
| UC40 | Quản lý hồ sơ vi phạm và tuân thủ | [violation-routes.ts](../../server/src/interface/http/violation-routes.ts) | [ViolationsPage.tsx](../../client/src/pages/icpdp/ViolationsPage.tsx) | Có; CLB giải trình và khắc phục qua [club-violation-routes.ts](../../server/src/interface/http/club-violation-routes.ts), [ClubViolationsPage.tsx](../../client/src/pages/club/ClubViolationsPage.tsx) |
| UC41 | Cấu hình scheme đánh giá | [evaluation-scheme-routes.ts](../../server/src/interface/http/evaluation-scheme-routes.ts) | [EvaluationSchemesPage.tsx](../../client/src/pages/icpdp/EvaluationSchemesPage.tsx) | Có |
| UC42 | Sinh bản nháp đánh giá hiệu quả CLB | [evaluation-routes.ts](../../server/src/interface/http/evaluation-routes.ts) | [EvaluationsPage.tsx](../../client/src/pages/icpdp/EvaluationsPage.tsx) | Có |
| UC43 | Xem lại, chốt và công bố đánh giá | [evaluation-routes.ts](../../server/src/interface/http/evaluation-routes.ts) | [EvaluationsPage.tsx](../../client/src/pages/icpdp/EvaluationsPage.tsx) | Có; CLB xem kết quả đã công bố qua [club-evaluation-routes.ts](../../server/src/interface/http/club-evaluation-routes.ts), [ClubEvaluationsPage.tsx](../../client/src/pages/club/ClubEvaluationsPage.tsx) |
| UC44 | Quản lý danh mục cơ sở vật chất | [property-routes.ts](../../server/src/interface/http/property-routes.ts) | [PropertiesPage.tsx](../../client/src/pages/icpdp/PropertiesPage.tsx) | Có |
| UC45 | Gửi yêu cầu đặt cơ sở vật chất (hội trường, sân, sân khấu, thiết bị) | [facility-booking-routes.ts](../../server/src/interface/http/facility-booking-routes.ts) | [ClubBookingsPage.tsx](../../client/src/pages/club/ClubBookingsPage.tsx) | Có; không nhận ROOM |
| UC46 | Thẩm định yêu cầu cơ sở vật chất | [facility-booking-routes.ts](../../server/src/interface/http/facility-booking-routes.ts) | [BookingReviewPage.tsx](../../client/src/pages/icpdp/BookingReviewPage.tsx) | Có; ROOM do UC58 |
| UC47 | Theo dõi và huỷ / trả cơ sở vật chất đã đặt | [facility-booking-routes.ts](../../server/src/interface/http/facility-booking-routes.ts) | [ClubBookingsPage.tsx](../../client/src/pages/club/ClubBookingsPage.tsx) | Có; không huỷ ROOM qua luồng này |
| UC48 | Gửi phản hồi sau sự kiện | [event-feedback-routes.ts](../../server/src/interface/http/event-feedback-routes.ts) | [EventFeedbackForm.tsx](../../client/src/components/custom/EventFeedbackForm.tsx) | Có |
| UC49 | Xem phản hồi sự kiện | [club-event-routes.ts](../../server/src/interface/http/club-event-routes.ts) | [ClubEventsPage.tsx](../../client/src/pages/club/ClubEventsPage.tsx) | Có; mode feedback, ngưỡng ẩn danh |
| UC50 | Gửi góp ý cho CLB hoặc ICPDP | [student-feedback-routes.ts](../../server/src/interface/http/student-feedback-routes.ts) | [StudentFeedbackPage.tsx](../../client/src/pages/student/StudentFeedbackPage.tsx) | Có; một chiều, inbox CLB/ICPDP |
| UC51 | Phân loại khiếu nại | — | — | Chưa triển khai: UC50 là góp ý một chiều từ 09/10/2026 |
| UC52 | Trả lời khiếu nại được chuyển xuống | — | — | Chưa triển khai: UC50 là góp ý một chiều từ 09/10/2026 |
| UC53 | Tạo sự kiện cấp trường và mời câu lạc bộ tham gia | [school-event-routes.ts](../../server/src/interface/http/school-event-routes.ts) | [SchoolEventsPage.tsx](../../client/src/pages/icpdp/SchoolEventsPage.tsx) | Có gửi/thu hồi lời mời và publish |
| UC54 | Phản hồi lời mời tham gia sự kiện | [club-invitation-routes.ts](../../server/src/interface/http/club-invitation-routes.ts) | [ClubInvitationsPage.tsx](../../client/src/pages/club/ClubInvitationsPage.tsx) | Có |
| UC55 | Xuất dữ liệu và báo cáo | [export-routes.ts](../../server/src/interface/http/export-routes.ts) | [DataExportPage.tsx](../../client/src/pages/icpdp/DataExportPage.tsx) | Có; Leader còn có xuất roster riêng tại UI |
| UC58 | Phân phòng học cho CLB theo học kỳ | [room-allocation-routes.ts](../../server/src/interface/http/room-allocation-routes.ts) | [RoomAllocationsPage.tsx](../../client/src/pages/icpdp/RoomAllocationsPage.tsx) | Có; CLB xem qua ClubRoomsPage, chỉ Leader |

## Nguồn kiểm chứng xuyên suốt

- [main.ts](../../server/src/main.ts): dependency thực được truyền vào `buildApp`.
- [server.ts](../../server/src/interface/http/server.ts): điều kiện mount route theo dependency.
- [main.tsx](../../client/src/main.tsx): route UI thật.
- [access.ts](../../server/src/domain/access.ts): 14 permission cố định và resolver Leader/Member.
- [member-space.ts](../../server/src/usecase/member-space.ts): roster chỉ đọc cho Active/Inactive.
- [room-allocation.ts](../../server/src/usecase/room-allocation.ts): UC58 phía CLB yêu cầu `club.booking.manage`.
- [PublicLayout.tsx](../../client/src/components/layout/PublicLayout.tsx): UI danh bạ vẫn yêu cầu đăng nhập.
- [student-feedback.ts](../../server/src/usecase/student-feedback.ts): góp ý một chiều, đúng nơi nhận và bảo vệ danh tính.

## Giới hạn kiểm thử

`npm run check` ngày 15/10/2026 xanh. Chạy kèm `MONGO_URI` tới Mongo replica set riêng: 438 test
đều qua, không skip. Nghiệm thu trình duyệt các màn mới chạy trên database QA riêng, không đụng dữ liệu thật.
Danh sách test hiện có ở [server/tests](../../server/tests/); checklist mở ở `.sdd/specs/` được
giữ nguyên nếu chưa có bằng chứng nghiệm thu.
