# ADR-004: Chạy khu công khai trước khi cấu hình Google OAuth

Ngày: 2026-10-03. Trạng thái: áp dụng cho UC06.

## Bối cảnh
UC06 cho Guest đọc danh bạ CLB và sự kiện mà không cần đăng nhập. Người vận hành sẽ điền
Google credentials, domain và secret sau; trước đó server cũ fail-fast nên UC06 không thể
chạy dù MongoDB đã có.

## Quyết định
- `MONGO_URI` luôn bắt buộc. Nếu cả nhóm biến Auth còn trống, server khởi động ở chế độ
  public-only: chỉ gắn health, UC06 và tài liệu API tương ứng. Không dựng session, OAuth,
  bootstrap ICPDP hoặc route UC03.
- Nếu bất kỳ biến Auth cốt lõi nào được điền, toàn bộ cấu hình Auth phải hợp lệ; thiếu hoặc
  sai giá trị tiếp tục fail-fast. Khi cấu hình đầy đủ, server gắn lại toàn bộ route Auth/UC03.
- Tài liệu `/docs/openapi.json` phản ánh route thực sự được gắn ở chế độ đang chạy.

## Hệ quả
Guest có thể duyệt UC06 chỉ với MongoDB. Các thao tác cần danh tính vẫn không tồn tại cho tới
khi OAuth được cấu hình; không có đường bypass hay User được tạo từ khu công khai.
