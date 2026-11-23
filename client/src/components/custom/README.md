# components/custom/

`BookingWorkspace` dùng chung cho UC45/UC47 phía CLB và UC46 phía ICPDP; hai ngữ cảnh dùng
cùng API booking, lịch sử version và quyết định.

Component dùng ở nhiều trang, có hiểu biết nghiệp vụ (không nguyên tử). Không có tiền tố `App`.
Chỉ chuyển một component vào đây khi nó đã được render bởi từ 2 trang trở lên.

`EventProposalDocument`, `EventProposalPreview`, `EventProposalContent` dùng chung cho trang import
đề án của CLB và trang xét duyệt ICPDP: bản xem tài liệu đầy đủ cùng hồ sơ trích xuất chỉ đọc.
ICPDP tải file của đúng phiên bản đã nộp, không đọc file bản nháp đang chỉnh sửa.

`SubmittedEventProposal` dùng chung cho xét duyệt và phòng bảo vệ, nhận phiên bản cụ thể rồi tải tài liệu
và hiển thị hai bản xem. `ProposalSectionComments` là ô nhận xét theo mục: bản nháp, hủy, trạng thái gửi
và lỗi giữ nguyên nội dung; nơi gọi cung cấp dữ liệu và thao tác lưu theo quyền đã được chốt.
Nút nhận xét nằm trên dòng tiêu đề mục; ô nhập là khung nổi, không dành sẵn cột làm hẹp bảng.
Mỗi thẻ nháp có Sửa/Xóa. Hook giữ vị trí đoạn nhận xét trong Lý do để cập nhật đúng thẻ,
kể cả khi nhiều nhận xét có cùng nội dung; chỉ lưu chính thức khi gửi quyết định.

`SuspensionRequestWorkspace` dùng chung cho UC14 phía CLB (có `clubId`: form gửi yêu cầu kèm xác nhận ảnh
hưởng) và UC15 phía ICPDP (không có `clubId`: hàng đợi duyệt).

Các component còn lại (đối chiếu 17/10/2026):

- `FinanceWorkspace` — chọn ngân sách sự kiện của CLB (`ClubBudgetsPage`) hoặc ICPDP (`ReconciliationPage`) và hiển thị `SponsoredItems`.
- `SponsoredItems` — giải ngân theo hạng mục (trả trước qua cán bộ ICPDP, trả sau dưới 5 triệu tự chi hoặc hợp đồng, trả sau từ 5 triệu trở lên bắt buộc hợp đồng & thông tin chuyển khoản nhà cung cấp), tối đa 5 tệp JPG/PNG/PDF mỗi hạng mục và hỗ trợ cán bộ tải xuống chứng từ; hiển thị tại `FinanceWorkspace` và `BudgetDetailPage`.
- `ReportWorkspace` — UC33 phía CLB (`ClubReportsPage`) và UC34 phía ICPDP (`EventReportsPage`).
- `RoleDashboard`, `WorkspaceHome` — dashboard UC02 của ba trang chủ Student / CLB / ICPDP. Khi server
  trả `icpdpCharts`/`clubCharts`, `RoleDashboard` hiển thị `IcpdpDashboard` hoặc `ClubDashboard`
  (hàng KPI + chart từ `ui/chart/`); Student và Club Member giữ các thẻ số liệu.
- `DashboardTaskList` — danh sách việc quá hạn/còn nợ có icon trạng thái, dùng ở cả hai dashboard; biến thể
  `neutral` liệt kê số liệu thường dẫn tới bản ghi (khối "Hoạt động của CLB", "Hồ sơ CLB").
- `ClubBoardHistory` — phiên bản cơ cấu và ban chủ nhiệm theo nhiệm kỳ của một CLB (UC02, BR56), dùng trong
  hộp quản lý CLB của ICPDP và trang lịch sử ban chủ nhiệm của Club Leader.
- `EventRegistrationPanel`, `EventCheckInForm` — đăng ký và check-in sự kiện (UC29, UC31).
- `EventFeedbackPanel`, `EventFeedbackForm` — gửi phản hồi sự kiện (UC48).
- `ComplaintCard` — một khiếu nại UC50–UC52 (trang Student, hàng đợi ICPDP, hộp thư CLB); nơi gọi tự chọn trường được hiện (CLB không bao giờ có danh tính người khiếu nại).
- `SimilarClubHints` — gợi ý CLB tương tự cho hồ sơ thành lập: bước xem lại/kết quả nộp của sinh viên (UC07, không hiện gì khi rỗng) và trang thẩm định ICPDP (UC08, báo "không có" khi rỗng).
- `RevisionChanges` — khung "Thay đổi so với bản N" trên trang duyệt ICPDP (UC08, UC26): các phần đã yêu cầu sửa và từng trường đổi giữa hai phiên bản (dùng `utils/revisionDiff`).
- `PublicEventCard`, `ClubLogo`, `ClubCover`, `UniversityLogo`, `MembershipStateBadge` — hiển thị dùng chung.
