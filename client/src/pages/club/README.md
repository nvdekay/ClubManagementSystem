# pages/club/

`ClubBookingsPage` dùng `BookingWorkspace` cho UC45–47: chỉ gửi yêu cầu `HALL`/`OUTDOOR`/`STAGE`/`EQUIPMENT`
(Draft/sửa/nộp lại, ICPDP duyệt), xem lịch sử và huỷ. Cần `club.booking.manage`. CLB không đặt phòng học.

Trang "Phòng được phân" (route `/club/:clubId/rooms`, UC58) chỉ đọc, cần membership `Active`
và `club.booking.manage` trong đúng CLB để xuất trình lịch cho bảo vệ khi nhận chìa khoá:
lịch tuần học kỳ hiện tại/sắp tới (thứ, slot, giờ, phòng, toà, ghi chú) và các buổi sắp tới do ICPDP phân.

Các trang nghiệp vụ theo ngữ cảnh một CLB. Route luôn mang `clubId`; page chỉ hiển thị sau khi
đối chiếu workspace và quyền hiện hành từ `/auth/me`.

Phía CLB chỉ có hai role cố định (từ 13/10/2026, UC23 đã rút): **Club Leader** là người giữ ghế
Chủ nhiệm hoặc Phó chủ nhiệm đã được ICPDP xác nhận và có mọi permission CLB; **Club Member** là
thành viên `Active` còn lại, không có permission quản lý nào. Permission vẫn dùng để gate từng
trang, nhưng không còn role tự tạo hay màn phân quyền.

`ClubSettingsPage` triển khai UC09: chỉ workspace có `club.profile.manage` (Club Leader) mới mở màn
hồ sơ vận hành và cơ cấu ban/bộ phận; các trường định danh do ICPDP quản lý chỉ được hiển thị.

`ClubMembersPage`: Club Leader (`club.member.manage`) quản lý danh sách, đổi trạng thái, xử lý
yêu cầu rời và xuất Excel; Club Member chỉ thấy danh sách thành viên (đọc từ member space).

`BoardNominationPage` triển khai UC10: Club Leader hoặc founder sáng lập có quyền tạm từ UC08
đề cử thành viên `Active` vào ghế ban điều hành còn trống của nhiệm kỳ hiện tại.

`RecruitmentCampaignPage` triển khai UC16: Club Leader (`club.recruitment.manage`) tạo/chỉnh
draft, công bố trong một kỳ học đã cấu hình và xử lý cảnh báo campaign chồng lấn.

`RecruitmentReviewPage` nối UC18 và UC20: Club Leader (`club.application.review`) sàng lọc/quyết
định đơn, xử lý danh sách chờ và tiếp nhận ứng viên trúng tuyển thành thành viên role `Members`.
Đơn hiển thị dạng bảng (lọc trạng thái, tìm tên, sắp xếp theo điểm trung bình); mở một dòng là
`ApplicationReviewDialog` với câu trả lời, thao tác sàng lọc và UC19 qua `CandidateEvaluationPanel`
(tổng hợp + thanh trung bình theo tiêu chí + từng bản đánh giá) và `CandidateEvaluationForm` (form
chấm rubric/nhận xét của chính reviewer, chỉ khi đơn `Shortlisted`). Các file này cùng helper
`recruitmentReviewFormat.ts` chỉ trang này dùng.

`ClubHomePage` triển khai dashboard UC02 theo `clubId`; panel nhạy cảm chỉ được trả về khi
membership hiện hành có đúng permission tương ứng, còn Leader nhận toàn bộ panel quản trị.

`ClubFeedbackInboxPage` (UC50) là hộp thư góp ý sinh viên gửi cho CLB, cần `club.feedback.view`;
người gửi ẩn danh không bao giờ được hiển thị.

`ClubMembersPage` mở cho workspace CLB; `ClubRosterReadOnly` dùng member space để hiển thị
danh sách tên/trạng thái/vị trí cho Club Member, không chia sẻ email. Không còn tab role hay
`ClubMemberRoles`, API role-directory hoặc hook/service role. Chỉ Leader có `club.member.manage` thấy bảng quản trị:
 các yêu cầu rời CLB (UC22) đang chờ nằm
ở đầu trang (chỉ hiện khi có), bên dưới là bảng thành viên (AppTable) có tìm kiếm, lọc theo trạng
thái/chức vụ, sắp xếp, phân trang và xuất Excel. Đổi Active ⇄ Inactive/cấm (có lý do) nằm trong
`ClubMemberStateDialog`; lịch sử trạng thái mở trong một AppDialog. `exportClubMembers.ts` ghi các
dòng đang lọc ra `.xlsx` bằng `write-excel-file` (nạp động, không vào bundle chính) — chỉ trang này dùng.

Thiết lập CLB bị gate theo permission ở UI; GET profile/departments phía server vẫn cho current
member đọc, mutation luôn yêu cầu Leader. API xem phòng UC58 yêu cầu Leader.

Các trang thêm ngày 15/10/2026, đều chỉ dành cho Club Leader:
`ClubTransitionPlansPage` + `ClubTransitionPlanEditor` (UC12: ban mới, người nhận từng nghĩa vụ còn mở, nộp lại
sau khi bị trả), `ClubSuspensionRequestsPage` (UC14, dùng `SuspensionRequestWorkspace`), `ClubPeriodicReportsPage`
+ `ClubPeriodicReportEditor` (UC38: nháp, nộp, nộp lại, lịch sử các lần nộp), `ClubInvitationsPage` (UC54: nhận
hoặc từ chối kèm lý do), `ClubViolationsPage` (UC40: giải trình, nộp minh chứng khắc phục) và
`ClubEvaluationsPage` (UC43: chỉ kết quả `Published`).
