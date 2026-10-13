# Ảnh hướng dẫn

64 ảnh PNG chụp từ giao diện React của UCMS ngày 13/10/2026, tiếng Việt, theme sáng, viewport
1440 × 1000. Một số ảnh cuộn tới phần thao tác hoặc mở sẵn hộp thoại.

`manifest.json` ghi file, URL, tài khoản mẫu, nguồn dữ liệu và thao tác trước khi chụp:

- `local-api`: màn đăng nhập, chưa có phiên.
- `seeded-demo-api`: API thật với database `ucms_guide_demo` riêng (bản sao database local sau
  seed, thêm dữ liệu Wave 4 demo), có nối API khoản chi và đối soát.

Ảnh không dùng route interception. Phiên local của tài khoản mẫu cấp qua SessionService trong
database demo; Google OAuth không được dùng khi chụp. Ảnh không chứa cookie, CSRF token hay
credential. Mọi tên và email `@demo.ucms.edu.vn` là nhân vật hư cấu; hai tài khoản thật của
database local được đổi sang tên mẫu trong database demo trước khi chụp. Chứng từ `example.org`
là placeholder demo. PNG được giảm xuống bảng 256 màu để HTML/PDF nhẹ hơn.
