# SPEC: feat-auth-access

## Vấn đề
UCMS đang có database nhưng API demo cho tạo User công khai và chưa có danh tính, phiên hay kiểm tra quyền. UC01 và UC03 phải bảo đảm chỉ tài khoản Google thuộc domain được phép mới vào hệ thống; quyền hệ thống và quyền CLB phải được kiểm tra lại từ dữ liệu hiện hành ở server.

## Hành vi
- `GET /api/v1/auth/login` bắt đầu Google Authorization Code, lưu `state`/nonce một lần dùng, chỉ chấp nhận đường quay lại nội bộ đã kiểm tra. `GET /api/v1/auth/callback` xác thực kết quả với Google; chỉ sau khi email đã verified và thuộc `PolicyVersion.allowedEmailDomains` mới được đọc/tạo User.
- Lần đăng nhập đầu tạo đúng một `users` và `studentProfiles` trong cùng transaction; lần sau đồng bộ profile và giữ các role. Tài khoản `Locked` bị từ chối cùng lý do; mọi lần thử được audit.
- Phiên dùng cookie ký `httpOnly`, `SameSite=Lax`, `Secure` ở production; có hạn dùng, logout và thu hồi tức thì. `GET /api/v1/auth/me` trả danh tính, vai trò hệ thống và mọi ngữ cảnh CLB còn hiệu lực. Client chọn workspace từ dữ liệu này, không tự suy quyền từ localStorage.
- `POST /api/v1/auth/logout` yêu cầu phiên và CSRF token; route khác làm thay đổi dữ liệu cũng yêu cầu phiên và CSRF. Chỉ các route auth bắt buộc để khởi động OAuth nằm trong danh sách public tường minh. `GET /api/v1/health` giữ hợp đồng hiện hành.
- `GET /api/v1/admin/users`, `POST /api/v1/admin/users/:id/roles`, `DELETE /api/v1/admin/users/:id/roles/:roleCode`, `POST /api/v1/admin/users/:id/lock`, `POST /api/v1/admin/users/:id/unlock` yêu cầu quyền ICPDP. Cấp/thu hồi chỉ role hệ thống (`ICPDP_OFFICER`, `ICPDP_HEAD`, `ATTENDANCE_UNLOCK`); lý do bắt buộc khi thu hồi/khoá/mở; audit và thu hồi phiên liên quan. Cấm tự bỏ role quản trị cuối.
- `GET /api/v1/users` và `POST /api/v1/users` của template rời khỏi app nghiệp vụ trước khi bật SEC-02; dữ liệu `demoUsers` vẫn được giữ nguyên.
- Quyền CLB chỉ lấy từ membership `Active`, `ClubPositionAssignment` đang hiệu lực, `ClubTerm` `Active` còn trong thời gian hiệu lực, `ClubPosition` đang hoạt động và cùng `clubId`. `UserRoleAssignment` chỉ dùng cho system role. Club Leader có 15 quyền CLB; role khác chỉ nhận 11 quyền được cấp; `Members` mặc định rỗng. Founder của Club `Pending Setup` chỉ nhận quyền UC09, UC10, UC23 cho đến khi xác nhận UC11.
- Mọi use case xử lý dữ liệu CLB kiểm tra lại quyền và `clubId` tại thời điểm request. Thiếu phiên → 401; thiếu quyền/sai CLB → 403; bị khoá → 423. API luôn dùng response envelope hiện hành.

## Ma trận endpoint và quyền

| Endpoint | Quyền truy cập | Điều kiện thêm |
|---|---|---|
| `GET /api/v1/health`, `GET /docs`, `GET /docs/openapi.json` | Public | Health trả 503 khi DB chưa sẵn sàng |
| `GET /api/v1/auth/login`, `GET /api/v1/auth/callback`, `GET /api/v1/auth/error` | Public | `state`/nonce/PKCE và domain được kiểm tra trong callback; đường quay lại chỉ là path nội bộ |
| `GET /api/v1/auth/me` | Phiên hợp lệ | Đọc lại trạng thái, system role và ngữ cảnh CLB hiện hành |
| `POST /api/v1/auth/logout` | Phiên hợp lệ | Bắt buộc `X-CSRF-Token` |
| `GET /api/v1/admin/users` | `ICPDP_OFFICER` hoặc `ICPDP_HEAD` | Tìm kiếm user |
| `POST /api/v1/admin/users/:id/roles`, `DELETE /api/v1/admin/users/:id/roles/:roleCode` | `ICPDP_OFFICER` hoặc `ICPDP_HEAD` | CSRF; chỉ system role; lý do bắt buộc khi thu hồi |
| `POST /api/v1/admin/users/:id/lock`, `POST /api/v1/admin/users/:id/unlock` | `ICPDP_OFFICER` hoặc `ICPDP_HEAD` | CSRF và lý do |
| Endpoint đọc công khai UC06 (đợt C) | Public | Chỉ dữ liệu được SRS cho phép công khai; chưa triển khai |
| Endpoint CLB thuộc UC09–UC52 (các đợt sau) | Thành viên/leader/founder theo từng use case | Kiểm tra `clubId`, permission, membership, assignment và nhiệm kỳ tại use case; mutation cần CSRF |

Không có phiên trả 401; phiên của User `Locked` trả 423 với lý do; có phiên nhưng thiếu
system role, permission hoặc sai CLB trả 403. Phiên hết hạn, logout hoặc bị thu hồi được xem
như không có phiên. Quyền CLB mất ngay khi membership/assignment/nhiệm kỳ hết hiệu lực;
ngữ cảnh CLB đã rời không hiện trong `/auth/me`. Cookie phiên sống tối đa 7 ngày,
cookie OAuth tối đa 10 phút (ADR-003).

Callback thành công quay lại path nội bộ đã yêu cầu (mặc định `/`). Callback lỗi
quay về `/login?error=oauth|domain|locked`; màn login hiển thị lỗi tương ứng.
Client cho phép chọn và đổi giữa Student, ICPDP và nhiều CLB từ `/auth/me`.

## Tiêu chí nghiệm thu
- [x] Email chưa verified, sai domain, OAuth lỗi hoặc `state`/nonce sai không tạo User/phiên; trường hợp sai domain được audit.
- [x] Hai callback đồng thời cho cùng email tạo đúng một User và một StudentProfile; lần đăng nhập sau chỉ đồng bộ profile.
- [x] Cookie có chữ ký, `httpOnly`, `SameSite=Lax`, hạn dùng; logout, lock và thu hồi role làm phiên mất hiệu lực tức thì; request đổi dữ liệu thiếu CSRF bị chặn.
- [x] Actor bị khoá nhận 423; không có phiên nhận 401; đủ phiên nhưng sai quyền hoặc CLB nhận 403.
- [x] Resolver quyền không nhận assignment của membership khác, CLB khác, nhiệm kỳ đóng/hết hạn hoặc position đã tắt; quyền reserved không được cấp qua role thường.
- [x] UC03 chỉ quản lý system role, ghi audit before/after/reason và ngăn người quản trị tự bỏ role cuối.
- [x] Route ghi dữ liệu đều có auth/CSRF hoặc nằm trong allowlist tường minh; OpenAPI khớp route; `npm run check` xanh.
- [ ] Client đăng nhập, chọn/đổi workspace nhiều CLB, logout và hiển thị trạng thái lỗi bằng cả `en`/`vi` trên màn hình sáng/tối.

## Ngoài phạm vi
Đăng nhập bằng mật khẩu, quyền CLB cấp từ UC03, dashboard nghiệp vụ UC02, luồng CLB UC06–UC23 và các use case tiếp theo. Những module đó sẽ dùng cùng actor/permission resolver khi được cài.

## Điểm cần cấu hình
Người dùng đã có Google OAuth credentials và sẽ tự điền; chưa cung cấp domain, nên giá trị `ALLOWED_DOMAIN`, `BOOTSTRAP_ICPDP_EMAIL`, Google credentials và `SESSION_SECRET` phải để trống trong mẫu, không ghi giá trị thật vào repo. `APP_BASE_URL`/callback URL phải khớp Google Console và cổng backend thực tế (cổng 3000 hiện bị tiến trình khác chiếm). Bootstrap policy và ICPDP không chạy khi cấu hình còn trống.

## Changelog
- v0.1.0 (2026-10-02) — bản triển khai theo SRS UC01, UC03, UC04, BR32, BR47, BR54–BR56; chờ nghiệm thu chức năng.
