# pages/icpdp/

Các trang nghiệp vụ chỉ dành cho `ICPDP_OFFICER`. Mỗi trang tự kiểm tra phiên đăng nhập và vai
trò để hiển thị trạng thái phù hợp; API và use case vẫn kiểm tra quyền ở server.

`ApplicationReviewQueuePage` và `ApplicationReviewDetailPage` triển khai UC08 một cấp duyệt:
hàng đợi, nhận task, đọc snapshot bất biến và ghi đúng một quyết định.

`BoardNominationQueuePage` và `BoardNominationDetailPage` triển khai UC11: một ICPDP Officer nhận
task và ghi đúng một quyết định xác nhận toàn phần hoặc một phần cho các ghế ban điều hành.

`IcpdpHomePage` triển khai dashboard UC02: hàng đợi, SLA, trạng thái CLB, báo cáo, tài chính,
vi phạm, lịch đặt, sự kiện nội bộ và lịch sử cơ cấu/ban điều hành.

`StudentFeedbackInboxPage` (UC50) là hộp thư góp ý sinh viên gửi cho ICPDP; chỉ ICPDP Officer đọc.

`PolicyPage` + `PolicyEditor` (UC04) chia chính sách theo luồng nghiệp vụ (Thành lập CLB, Hồ sơ CLB,
Sự kiện, Năm học, Báo cáo); ICPDP bật/tắt field bắt buộc của form cố định, mỗi lần lưu tạo phiên bản mới.

`ClubFieldsPage` quản lý danh mục lĩnh vực CLB sinh viên chọn khi lập hồ sơ: thêm, đổi tên/thứ tự,
xoá (chưa ai dùng thì xoá hẳn, đang dùng thì ẩn khỏi danh sách chọn).

`PropertiesPage` + `PropertyEditor` (UC44) quản lý danh mục cơ sở vật chất: mã tự sinh theo loại, sức
chứa, thiết bị đi kèm, khung giờ được đặt (chung hoặc từng ngày), giai đoạn khoá; ngừng sử dụng/dùng lại;
chỉ xoá được khi chưa từng có booking.

`EvaluationSchemesPage` + `SchemeEditor` (UC41) cấu hình scheme đánh giá theo học kỳ của lịch năm học: bật
D4–D8 (D1–D3 luôn có), trọng số % (tổng 100, có "Chia đều"), cho phép chấm tay, 3 mốc xếp loại; nháp sửa/xoá
được, kích hoạt thay thế scheme đang áp dụng của kỳ, scheme đã kích hoạt chỉ "tạo bản sửa".

`DataExportPage` (UC55) xuất dữ liệu ra `xlsx`/`csv`/`pdf`: chọn loại dữ liệu, thời gian (toàn bộ, học kỳ,
khoảng ngày), CLB, trạng thái; đếm số dòng trước khi tải; không có dòng nào thì không tạo file.
