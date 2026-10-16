# Thuật ngữ Context Diagram — baseline hiện hành

| Thuật ngữ | Nghĩa trong UCMS hiện tại |
|---|---|
| Student | Sinh viên đã đăng nhập |
| Club Member | Thành viên CLB không có permission quản lý; xem và tham gia |
| Club Leader | Chủ nhiệm hoặc Phó chủ nhiệm đã xác nhận; có toàn bộ permission CLB |
| ICPDP Officer | Cán bộ nhà trường, system role `ICPDP_OFFICER` |
| Member workspace | Không gian thành viên, lịch sử membership và dữ liệu tham gia |
| Club operations | Hồ sơ, tuyển, thành viên, sự kiện, báo cáo, tài chính và booking do Club Leader vận hành |
| Student feedback | Góp ý một chiều gửi tới CLB hoặc ICPDP, có thể ẩn danh |
| Event feedback | Đánh giá của người đã check-in; Club Leader chỉ xem tổng hợp đủ ngưỡng |
| Room allocation | ICPDP phân `ROOM` theo học kỳ; CLB chỉ xem |
| Facility booking | Club Leader xin `HALL`, `OUTDOOR`, `STAGE` hoặc `EQUIPMENT`; ICPDP duyệt |
| Approval task | Việc chờ một ICPDP Officer claim và quyết định |
| Club position assignment | Bản gán ghế theo nhiệm kỳ; dùng xác định Club Leader |
| UC23 | Mã đã rút; không còn role tự tạo/API/UI |
| UC50 | Góp ý một chiều trong code hiện hành |
| UC51–UC52 | Complaint triage/response đã rút khỏi runtime hiện hành |

Các field `permissionCodes` và `clubRoleStructureVersions` là dữ liệu tương thích/lịch sử, không
cấp quyền runtime. Danh sách endpoint và trạng thái chi tiết xem
[`CURRENT_IMPLEMENTATION.md`](CURRENT_IMPLEMENTATION.md).
