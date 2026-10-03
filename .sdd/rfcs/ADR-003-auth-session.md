# ADR-003: Phiên đăng nhập và CSRF

Ngày: 2026-10-02. Trạng thái: áp dụng cho `feat-auth-access`.

## Bối cảnh
UC01 yêu cầu cookie có chữ ký, `httpOnly`, `SameSite=Lax`, logout và vô hiệu hoá phiên ngay khi UC03 khoá tài khoản hoặc thu hồi role. DBML 50 collection mô tả dữ liệu nghiệp vụ, chưa có nơi giữ phiên. Trình duyệt gửi cookie tự động nên các thao tác ghi cũng cần chống CSRF.

## Quyết định
- Thêm collection vận hành `authSessions` ngoài 50 collection nghiệp vụ DBML: `userId`, SHA-256 của token ngẫu nhiên, SHA-256 của CSRF token, `createdAt`, `expiresAt`, `revokedAt`. Unique `tokenHash`, index `userId`, TTL `expiresAt`. TTL chỉ dọn rác; truy vấn luôn tự kiểm tra `expiresAt` và `revokedAt` để hiệu lực tức thì.
- Cookie mang token ngẫu nhiên và chữ ký HMAC bằng `SESSION_SECRET`; chỉ hash được lưu tại Mongo. Cookie `httpOnly`, `SameSite=Lax`, `Secure` ở production, thời hạn 7 ngày. `GET /auth/me` trả CSRF token của phiên cho client; mọi mutation phải gửi `X-CSRF-Token`. Token chỉ có hiệu lực với đúng phiên, không chấp nhận cookie của site khác.
- Google Authorization Code dùng `state`, nonce và PKCE S256; cookie OAuth ngắn hạn (10 phút), ký HMAC, `httpOnly`, một lần dùng. Callback xác minh ID token Google bằng JWKS, issuer, audience, nonce, thời hạn và `email_verified` trước khi vào use case. Không lưu Google access/refresh token.
- Quyền và trạng thái User được đọc lại từ Mongo ở mỗi request; thu hồi session theo `userId` khi lock/role thay đổi. Quyền CLB luôn tính lại từ assignment và term, không cache trong cookie.

## Hệ quả
Tổng số collection sau Auth là 51 (50 nghiệp vụ + `authSessions`), ngoài `demoUsers` tạm của template. `db:verify` tiếp tục kiểm 50 collection nghiệp vụ; kiểm tra phiên có integration test riêng. Cần MongoDB replica set để transaction tạo User + StudentProfile; cấu hình local phải hỗ trợ replica set trước khi hoàn tất UC01. Không chạy Auth khi Google credentials/domain/secret chưa được điền.
