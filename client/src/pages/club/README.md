# pages/club/

Các trang nghiệp vụ theo ngữ cảnh một CLB. Route luôn mang `clubId`; page chỉ hiển thị sau khi
đối chiếu workspace và quyền hiện hành từ `/auth/me`.

`ClubSettingsPage` triển khai UC09: chỉ workspace có `club.profile.manage` mới đọc/sửa hồ sơ
vận hành và cơ cấu ban/bộ phận; các trường định danh do ICPDP quản lý chỉ được hiển thị.

`BoardNominationPage` triển khai UC10: Club Leader hoặc founder sáng lập có quyền tạm từ UC08
đề cử thành viên `Active` vào ghế ban điều hành còn trống của nhiệm kỳ hiện tại.

`RecruitmentCampaignPage` triển khai UC16: Club Member có `club.recruitment.manage` tạo/chỉnh
draft, công bố trong một kỳ học đã cấu hình và xử lý cảnh báo campaign chồng lấn.

`RecruitmentReviewPage` nối UC18 và UC20: reviewer có `club.application.review` sàng lọc/quyết
định đơn, xử lý danh sách chờ và tiếp nhận ứng viên trúng tuyển thành thành viên role `Members`.
Trang này cũng hiển thị UC19 qua `CandidateEvaluationPanel` (chỉ trang này dùng): mỗi reviewer chấm
rubric/nhận xét của riêng mình cho đơn `Shortlisted`, kèm điểm trung bình và độ phân tán.

`ClubHomePage` triển khai dashboard UC02 theo `clubId`; panel nhạy cảm chỉ được trả về khi
membership hiện hành có đúng permission tương ứng, còn Leader nhận toàn bộ panel quản trị.

`ClubFeedbackInboxPage` (UC50) là hộp thư góp ý sinh viên gửi cho CLB, cần `club.feedback.view`;
người gửi ẩn danh không bao giờ được hiển thị.

`ClubMembersPage` (UC21) liệt kê thành viên và yêu cầu rời CLB đang chờ cho người có `club.member.manage`:
thi hành yêu cầu rời (A1), đổi Active ⇄ Inactive, cấm có lý do, xem lịch sử trạng thái.
