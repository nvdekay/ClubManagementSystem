# components/custom/

`BookingWorkspace` dùng chung cho UC45/UC47 phía CLB và UC46 phía ICPDP; hai ngữ cảnh dùng
cùng API booking, lịch sử version và quyết định.

Component dùng ở nhiều trang, có hiểu biết nghiệp vụ (không nguyên tử). Không có tiền tố `App`.
Chỉ chuyển một component vào đây khi nó đã được render bởi từ 2 trang trở lên.

`SuspensionRequestWorkspace` dùng chung cho UC14 phía CLB (có `clubId`: form gửi yêu cầu kèm xác nhận ảnh
hưởng) và UC15 phía ICPDP (không có `clubId`: hàng đợi duyệt).

Các component còn lại (đối chiếu 17/10/2026):

- `FinanceWorkspace` — UC36 phía CLB (`ClubBudgetsPage`) và UC37 phía ICPDP (`ReconciliationPage`).
- `ReportWorkspace` — UC33 phía CLB (`ClubReportsPage`) và UC34 phía ICPDP (`EventReportsPage`).
- `RoleDashboard`, `WorkspaceHome` — dashboard UC02 của ba trang chủ Student / CLB / ICPDP.
- `EventRegistrationPanel`, `EventCheckInForm` — đăng ký và check-in sự kiện (UC29, UC31).
- `EventFeedbackPanel`, `EventFeedbackForm` — gửi phản hồi sự kiện (UC48).
- `StudentFeedbackList` — danh sách góp ý UC50 (trang gửi của Student và hai hộp thư CLB/ICPDP).
- `PublicEventCard`, `ClubLogo`, `ClubCover`, `UniversityLogo`, `MembershipStateBadge` — hiển thị dùng chung.
