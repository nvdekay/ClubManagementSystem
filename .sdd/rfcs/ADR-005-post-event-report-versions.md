# ADR-005 — Version bất biến cho báo cáo sau sự kiện

Ngày: 2026-10-11. Trạng thái: áp dụng cho triển khai Wave 4 được người dùng yêu cầu.

## Bối cảnh
FR-UC33-06 và WF-04 yêu cầu nộp lại tạo document version mới. DBML trước Wave 4 đặt unique
`postEventReports.eventId`, khiến một sự kiện chỉ có một document và buộc ghi đè lịch sử.

## Quyết định
Mỗi version là một document `postEventReports`, unique `(eventId, versionNo)`.
Draft được sửa trước nộp; Submitted khoá nội dung và `preloadedFigures`. Quyết định chỉ cập
nhật metadata thẩm định. Sau trả sửa, lần lưu kế tiếp tạo Draft version mới.
ApprovalTask trỏ tới đúng report document, không chỉ tới Event. Mỗi task có một quyết định.

Migration tạo composite index thành công trước khi bỏ unique legacy trên `eventId`;
không xoá report và không thay version đã có. `npm run db:init` hoặc khởi động server áp dụng
migration idempotent. Consumer nghĩa vụ và evaluation chọn bản mới nhất theo `versionNo`.

## Hệ quả
Lịch sử snapshot/decision đối chiếu được chính xác; các truy vấn trước đây giả định một report
mỗi event cần chọn version hoặc gom theo event. Không mở khoá điểm danh khi đã có lịch sử nộp
báo cáo, để giữ nguồn chính thức phù hợp với snapshot đã thẩm định.
