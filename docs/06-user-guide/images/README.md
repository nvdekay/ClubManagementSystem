# Ảnh hướng dẫn

Ảnh PNG chụp từ giao diện React của UCMS ngày 11/10/2026, tiếng Việt, theme sáng,
viewport 1440 × 1000. Một số ảnh cuộn tới phần thao tác để hiện nút lưu/nộp/quyết định.

`manifest.json` ghi file, URL, nguồn dữ liệu và thao tác trước khi chụp:

- `local-api`: màn công khai trên app local.
- `seeded-local-api`: API thật với database nguồn sau seed.
- `seeded-demo-api`: API thật với database `ucms_guide_demo` riêng, policy mẫu cho wave 4.

Các ảnh cuối không dùng route interception. Phiên local cấp qua SessionService;
Google OAuth chưa được kiểm thử lại. Không chứa cookie, CSRF token hoặc credential.
Tên/email `@demo.ucms.edu.vn` là nhân vật hư cấu; email ở profile thanh bên được che khi chụp.
Chứng từ `example.org` là placeholder demo.
