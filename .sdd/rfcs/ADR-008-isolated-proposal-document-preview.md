# ADR-008: Bản xem toàn văn đề án trong frame riêng

**Ngày:** 2026-11-17 · **Trạng thái:** Áp dụng cho bản xem đề án UC25

## Bối cảnh

Người dùng yêu cầu xem đề án theo trang như PDF: font, tiêu đề, bảng, hình ảnh và toàn bộ nội dung.
Danh sách field trích xuất không đáp ứng mục đích đọc tài liệu. Hai DOCX nguồn không lưu dấu ngắt trang.
Style của Word và bộ phân trang không được tác động tới Tailwind/theme/layout ứng dụng.

## Quyết định

- Dùng `docx-preview` dựng toàn bộ DOCX; dùng `pagedjs` để phân trang theo kích thước/lề trong tài liệu.
- Đóng gói entry `client/proposal-preview.html` riêng. React chỉ điều khiển file, trạng thái và toolbar;
  renderer chạy trong document riêng qua iframe và giao tiếp bằng postMessage có kiểm tra origin/source/ID.
- Vô hiệu hoá altChunk/script/điều hướng trong tài liệu. CSP chặn tải nội dung ngoài; ảnh/font nhúng
  được chuyển thành data URL. Giấy giữ nền sáng và màu nguồn; canvas theo theme ứng dụng.
- Trích xuất field và validation vẫn độc lập với bản xem; không chuyển file cho dịch vụ bên thứ ba.
- Bản sửa lấy file gốc qua service/hook. Không dựng tài liệu giả từ các field đã lưu.
- Dùng hộp thoại in của trình duyệt cho In/Lưu PDF, không thêm converter phụ thuộc hệ điều hành ở server.

## Hệ quả

Cần ship cả hai HTML entry trong build frontend. CSS frame thuộc riêng document renderer,
không import vào ứng dụng React. Renderer/phân trang chỉ được tải khi mở bản xem.
Phân trang/font có thể khác Word khi thiếu font gốc; không cam kết tái tạo PDF chính xác từng pixel.
File Word dài cần thêm thời gian dựng trang; có trạng thái tải/lỗi và giới hạn chờ.
