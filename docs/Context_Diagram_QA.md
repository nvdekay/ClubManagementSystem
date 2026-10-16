# Hỏi đáp Context Diagram — baseline hiện hành

> Cập nhật 15/10/2026. Đối chiếu chi tiết: [`CURRENT_IMPLEMENTATION.md`](CURRENT_IMPLEMENTATION.md).

## Có bao nhiêu actor?

Bốn actor người: Student, Club Member, Club Leader và ICPDP Officer. Google OAuth, Google SMTP
và Cloudinary là hệ thống ngoài, không phải actor người.

## Club Member và Club Leader khác nhau thế nào?

Club Leader là Chủ nhiệm hoặc Phó chủ nhiệm đã xác nhận trong nhiệm kỳ hiện hành và nhận toàn bộ
permission quản lý CLB. Club Member không có permission quản lý; chỉ xem, tham gia và xin rời
CLB. Không còn role tự tạo hay UC23.

## Các luồng chính theo actor

| Actor | Gửi vào UCMS | Nhận từ UCMS |
|---|---|---|
| Student | Hồ sơ thành lập, đơn ứng tuyển, đăng ký/check-in/feedback sự kiện, góp ý CLB/ICPDP | Danh bạ CLB/sự kiện, trạng thái hồ sơ và đăng ký |
| Club Member | Yêu cầu rời CLB và thao tác tham gia kế thừa từ Student | Member space, danh sách thành viên chỉ đọc; phòng được phân chỉ Leader truy cập |
| Club Leader | Hồ sơ CLB, board/chuyển giao/tạm ngừng, tuyển, sự kiện, báo cáo, tài chính, booking | Quyết định duyệt, giải ngân, feedback tổng hợp và trạng thái CLB |
| ICPDP Officer | Cấu hình, quyết định duyệt, lifecycle, tài chính, vi phạm, đánh giá, phòng, sự kiện trường, export | Hàng đợi hồ sơ, thống kê, góp ý và dữ liệu xuất |

## Complaint workflow có còn không?

Không trong code hiện tại. UC50 là góp ý một chiều (`StudentFeedback`); UC51–UC52 không có
triage/forward/response. Nếu khôi phục, phải cập nhật lại SRS, schema, API, UI và sơ đồ.

## Vì sao schema còn field role cũ?

Để tương thích dữ liệu và lịch sử. Resolver quyền không đọc `permissionCodes` để cấp quyền.

## Luồng nào còn thiếu end-to-end?

Từ 15/10/2026 không còn luồng nghiệp vụ trong phạm vi bị thiếu một phía: UC12, UC14, UC38, UC54
đã có phía CLB, UC36/UC37 đã nối vào app chính và UC21 A2 có job tái xác nhận. Còn lại là phần hạ
tầng: mail delivery worker và nghiệm thu OAuth/Cloudinary thật.
