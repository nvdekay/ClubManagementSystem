# Ảnh hướng dẫn

73 ảnh PNG chụp tự động ngày 27/11/2026 (ảnh 14, 15, 54, 72, 73 chụp lại ngày 28/11/2026) từ giao
diện React hiện tại của UCMS, tiếng Việt, theme sáng, khung nhìn 1440 × 1000. Một số ảnh cuộn tới phần thao tác hoặc mở sẵn hộp thoại.

Ảnh do `npm run guide:screenshots` sinh ra (script ở `client/e2e/guide/`, cách chạy ở
[`../README.md`](../README.md)); tên file cố định để `guide-book.md` giữ nguyên link.

`manifest.json` ghi cho từng ảnh: URL, tài khoản mẫu, thao tác trước khi chụp; phần `notes` ghi
nguồn dữ liệu. Ảnh dùng API thật trên database riêng `ucms-e2e-guide`, không chặn hay giả lập
request; phiên đăng nhập được cấp qua session service của server, không qua Google OAuth. Ảnh không
chứa cookie, CSRF token hay credential. Tên người và email trong ảnh là dữ liệu mẫu của seed; tài
khoản cán bộ mẫu `e2e.officer@fpt.edu.vn` hiển thị tên "Lê Thu Hằng". PNG được giảm xuống bảng 256
màu (`../shrink-images.py`) để HTML/PDF nhẹ hơn.
