# SPEC Danh sách đề án đã duyệt

## Vấn đề
Sau khi duyệt, đề án biến mất khỏi hàng đợi ICPDP khiến người dùng không tìm thấy kết quả ngay trên trang danh sách.

## Hành vi
- Trang đề xuất có Chờ xử lý và Đã duyệt; trạng thái tab nằm trong query `view`.
- GET `/admin/event-proposals?view=pending|approved`, mặc định pending và chỉ ICPDP được đọc.
- Đã duyệt chứa hồ sơ đã kết thúc thẩm định, có trạng thái Approved, Upcoming, Ongoing hoặc Completed; không trùng một sự kiện qua nhiều lần nộp.
- Hai danh sách đều mới nhất trước. Mở hồ sơ đã duyệt không gọi claim.
- Sau khi duyệt, trang chi tiết giữ nguyên kết quả và liên kết quay lại mở tab Đã duyệt.
- Không thay đổi schema hoặc quyền quyết định.

## Tiêu chí nghiệm thu
- [ ] Đề án duyệt thành công không nằm trong pending nhưng có trong approved.
- [ ] Hồ sơ đã duyệt vẫn mở được khi chuyển trạng thái Upcoming/Completed.
- [ ] Nhiều task của một sự kiện không tạo dòng trùng.
- [ ] API từ chối người không phải ICPDP và query view không hợp lệ.
- [ ] Trang có nhãn, trạng thái rỗng, mở chi tiết chỉ đọc phù hợp.

## Changelog
- 24/11/2026: khởi tạo theo yêu cầu hiển thị hồ sơ sau khi duyệt.
