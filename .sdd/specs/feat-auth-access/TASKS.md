# TASKS: feat-auth-access

## Đã hoàn thành

- [x] Đối chiếu SRS/DBML/mockup, viết SPEC và ma trận endpoint/quyền/trạng thái/redirect.
- [x] Bỏ mount API User demo, cập nhật OpenAPI và bật route walk SEC-02.
- [x] Cài resolver 11 permission cấp được + 4 quyền riêng Leader, quyền founder tạm; unit test chéo CLB, membership, nhiệm kỳ và position.
- [x] Cài test lớp HTTP cho callback sai state, Google không khả dụng, thuộc tính cookie, 401/403/423 và CSRF.
- [x] Lọc workspace CLB đã rời hoặc sai clubId khỏi `/auth/me`; giữ workspace founder `Pending Setup`.
- [x] Chạy Mongo integration cho actor/role/membership/term/assignment/position và session TTL/revoke trên replica set thật.
- [x] Chứng minh hai first login đồng thời chỉ tạo một User/StudentProfile; lần đăng nhập sau đồng bộ profile mà không nhân bản.
- [x] Chạy UC03 với Mongo thật: role/lock được ghi cùng audit và phiên của user chịu ảnh hưởng bị thu hồi.
- [x] `npm run check` xanh với Mongo replica set: 27 test file, 92/92 test (2026-10-08); production build server/client cũng xanh.

## Đã code, còn bước nghiệm thu

- [ ] ADR phiên/CSRF, cấu hình mẫu và bootstrap ICPDP/permission đã có; policy UC04 còn chờ giá trị khởi tạo hợp lệ.
- [ ] Google OAuth callback, transaction User/Profile, session, audit, middleware và OpenAPI đã qua unit/integration test; cần hoàn tất một callback Google thật bằng tài khoản thuộc domain.
- [ ] Client login, `/me`, chọn workspace, logout, i18n/theme đã build; cần kiểm tra UI bằng trình duyệt và trạng thái nhiều CLB.
- [ ] Đóng Gate A bằng callback Google thật và e2e UI; phần tự động đã xanh 92/92 test với Mongo thật.

## Cấu hình còn chờ
Người dùng sẽ tự điền Google credentials và domain. Không kiểm thử Google thật trước khi có cấu hình đó.
`policyVersions` chưa seed vì tám giá trị khởi tạo ngoài domain chưa có trong SRS; đang chờ
quyết định của người dùng. Mongo local đã chạy replica set `rs0` (xác minh lại 2026-10-08); transaction
chạy được, xem `docs/05-implementation/AUTH_SETUP.md`.
Lệnh cài `openid-client` bị DNS của npm registry chặn, nên adapter OIDC dùng Node crypto và
Google discovery/JWKS, đã có test chữ ký/audience/nonce với khóa RSA giả lập.
