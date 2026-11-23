# pages/club/

`ClubBookingsPage` dùng `BookingWorkspace` cho UC45–47: chỉ gửi yêu cầu `HALL`/`OUTDOOR`/`STAGE`/`EQUIPMENT`
(Draft/sửa/nộp lại, ICPDP duyệt), xem lịch sử và huỷ. Cần `club.booking.manage`. CLB không đặt phòng học.

`ClubRoomsPage` — trang "Phòng được phân" (route `/club/:clubId/rooms`, UC58) chỉ đọc, cho mọi thành viên
`Active` (`club.room.view`, quyền mặc định — BR54) trong đúng CLB để xuất trình lịch cho bảo vệ khi nhận chìa khoá:
lịch tuần học kỳ hiện tại/sắp tới (thứ, slot, giờ, phòng, toà, ghi chú) và các buổi sắp tới do ICPDP phân.

Các trang nghiệp vụ theo ngữ cảnh một CLB. Route luôn mang `clubId`; page chỉ hiển thị sau khi
đối chiếu workspace và quyền hiện hành từ `/auth/me`.

Quyền phía CLB theo BR47/BR54/BR55: **Club Leader** (ghế Chủ nhiệm / Phó chủ nhiệm đã được ICPDP
xác nhận) có mọi permission CLB; mọi thành viên `Active` có `club.attendance.manage` và
`club.room.view`; chức danh khác không cấp quyền. Không có trang quản lý role (UC23 đã rút). Mỗi trang
gate theo permission.

`ClubSettingsPage` triển khai UC09: chỉ workspace có `club.profile.manage` (Club Leader) mới mở màn
hồ sơ vận hành và cơ cấu ban/bộ phận; các trường định danh do ICPDP quản lý chỉ được hiển thị.

`ClubMembersPage`: Club Leader (`club.member.manage`) quản lý danh sách, đổi trạng thái, xử lý
yêu cầu rời và xuất Excel; Club Member chỉ thấy danh sách thành viên (đọc từ member space).

`ClubBoardHistoryPage` (UC02 FR-UC02-03, route `/club/:clubId/board-history`) cho Club Leader xem các phiên
bản cơ cấu và ban chủ nhiệm theo nhiệm kỳ của CLB mình (dùng chung `ClubBoardHistory` với ICPDP).

`BoardNominationPage` triển khai UC10: Club Leader hoặc founder sáng lập có quyền tạm từ UC08
đề cử thành viên `Active` vào ghế ban điều hành còn trống của nhiệm kỳ hiện tại.

`RecruitmentCampaignPage` triển khai UC16: Club Leader (`club.recruitment.manage`) tạo/chỉnh
draft, công bố trong một kỳ học đã cấu hình và xử lý cảnh báo campaign chồng lấn.

`RecruitmentReviewPage` nối UC18 và UC20: Club Leader (`club.application.review`) sàng lọc/quyết
định đơn, xử lý danh sách chờ và tiếp nhận ứng viên trúng tuyển thành Club Member.
Đơn hiển thị dạng bảng (lọc trạng thái, tìm tên, sắp xếp theo điểm trung bình); mở một dòng là
`ApplicationReviewDialog` với câu trả lời, thao tác sàng lọc và UC19 qua `CandidateEvaluationPanel`
(tổng hợp + thanh trung bình theo tiêu chí + từng bản đánh giá) và `CandidateEvaluationForm` (form
chấm rubric/nhận xét của chính reviewer, chỉ khi đơn `Shortlisted`). Các file này cùng helper
`recruitmentReviewFormat.ts` chỉ trang này dùng.

`ClubHomePage` triển khai dashboard UC02 theo `clubId`; panel nhạy cảm chỉ được trả về khi
membership hiện hành có đúng permission tương ứng, còn Leader nhận toàn bộ panel quản trị.

`ClubComplaintsPage` (UC52, `/club/:clubId/complaints`) chỉ mở với `club.complaint.respond`: khiếu nại ICPDP
đã chuyển xuống, không có danh tính người khiếu nại (D5); trả lời một lần kèm hành động cụ thể.

`ClubMembersPage` mở cho workspace CLB; `ClubRosterReadOnly` dùng member space để hiển thị
danh sách tên/trạng thái/vị trí cho Club Member, không chia sẻ email. Chỉ người có
`club.member.manage` thấy bảng quản trị:
 các yêu cầu rời CLB (UC22) đang chờ nằm
ở đầu trang (chỉ hiện khi có), bên dưới là bảng thành viên (AppTable) có tìm kiếm, lọc theo trạng
thái/chức vụ, sắp xếp, phân trang và xuất Excel. Đổi Active ⇄ Inactive/cấm (có lý do) nằm trong
`ClubMemberStateDialog`; nút "Thêm thành viên" mở `ClubMemberOnboardDialog` (UC20 A1: email + lý do,
không qua đợt tuyển); lịch sử trạng thái mở trong một AppDialog. `exportClubMembers.ts` ghi các
dòng đang lọc ra `.xlsx` bằng `write-excel-file` (nạp động, không vào bundle chính) — chỉ trang này dùng.

Thiết lập CLB bị gate theo permission ở cả UI và server: `getClubSettings` (GET) và mọi mutation đều
yêu cầu `club.profile.manage` (Club Leader). API xem phòng UC58 cũng chỉ dành cho Leader.

Các trang thêm ngày 15/10/2026, đều chỉ dành cho Club Leader:
`ClubTransitionPlansPage` + `ClubTransitionPlanEditor` (UC12: ban mới, người nhận từng nghĩa vụ còn mở, nộp lại
sau khi bị trả), `ClubSuspensionRequestsPage` (UC14, dùng `SuspensionRequestWorkspace`), `ClubPeriodicReportsPage`
+ `ClubPeriodicReportEditor` (UC38: nháp, nộp, nộp lại, lịch sử các lần nộp), `ClubInvitationsPage` (UC54: nhận
hoặc từ chối kèm lý do), `ClubViolationsPage` (UC40: giải trình, nộp minh chứng khắc phục) và
`ClubEvaluationsPage` (UC43: chỉ kết quả `Published`).

Các trang khác (đối chiếu 17/10/2026), chủ yếu dành cho Club Leader:
`ClubEventsPage` (UC25, UC27, UC28, UC30; cùng component với `mode="attendance"` cho UC32 tại
`/club/:clubId/event-attendance` — thành viên `Active` có `club.attendance.manage` xem được danh sách tham dự/mã check-in và điểm danh hộ trong khung giờ check-in, còn đổi sức chứa, đẩy waitlist, sửa/chốt điểm danh và check-in ngoài giờ chỉ Club Leader mới thực hiện được — và `mode="feedback"` cho UC49 tại `/club/:clubId/event-feedback`),
`ClubEventProposalPage` (UC25: trang riêng cho tạo và chỉnh sửa đề xuất sự kiện tại `/club/:clubId/events/new`
và `/club/:clubId/events/:eventId/edit`, dùng chung `ClubEventErrorMessage` và `clubEventFormat.ts` với `ClubEventsPage`),
Tạo/sửa đề xuất qua import DOCX (tối đa 20 MB). `EventProposalDocument` hiển thị toàn bộ tài liệu
theo trang giấy trong frame riêng (chuyển trang, thu/phóng, vừa chiều rộng, in/lưu PDF);
`EventProposalPreview` hiển thị hồ sơ trích xuất chỉ đọc bên dưới bản xem toàn văn: tổng quan,
trạng thái thiếu, lịch trình, ngân sách và điều hướng từng mục hoặc toàn bộ. `EventProposalContent`
hiển thị đầy đủ đoạn văn và bảng theo thứ tự nguồn, giữ ô gộp, không giới hạn số dòng;
Link trong Word hoặc URL viết trực tiếp đều bấm được ở bản xem và phần trích xuất, mở tab mới.
Hyperlink có tên hiển thị được giữ đúng đích từng lần xuất hiện; dùng primitive `AppLinkedText`.
sửa Word rồi import lại để đổi thông tin. Thiếu field hoặc dữ liệu không hợp lệ thì chặn lưu/nộp;
không hỗ trợ trích xuất PDF/scan. Xem `docs/05-implementation/EVENT_PROPOSAL_IMPORT.md`.
Giao diện tạo mới chỉ có nút "Tạo đề xuất sự kiện"; không còn nút, liên kết hay route `/club/:clubId/events/internal/new`.
`InternalClubEventPage` chỉ còn route sửa sự kiện nội bộ đã có ở `DRAFT`/`CREATED`
tại `/club/:clubId/events/:eventId/internal-edit`; báo trước 24 giờ,
`ClubBookingsPage` (UC45–47, xem trên), `ClubReportsPage` (UC33, dùng `ReportWorkspace`, route
`/club/:clubId/event-reports`) và `ClubBudgetsPage` (UC36, dùng `FinanceWorkspace`, route `/club/:clubId/budgets`).

`ClubBudgetsPage` chứa phần khoản chi và ảnh chứng từ của ngân sách tài trợ theo hạng mục
(`SponsoredItems`), gồm nút xác nhận đã nhận tiền cho hạng mục `Accepted` (chuyển sang `Paid`), hỗ trợ chọn đúng ngân sách bằng `?budget=...`; thông báo cũ có thể dùng `?event=...`.
Ngân sách legacy vẫn dùng form quyết toán cũ. Trang sự kiện chỉ giữ liên kết dẫn tới ngân sách.
