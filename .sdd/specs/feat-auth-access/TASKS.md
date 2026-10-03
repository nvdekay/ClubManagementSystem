# TASKS: feat-auth-access

## Đã hoàn thành

- [x] Đối chiếu SRS/DBML/mockup, viết SPEC và ma trận endpoint/quyền/trạng thái/redirect.
- [x] Bỏ mount API User demo, cập nhật OpenAPI và bật route walk SEC-02.
- [x] Cài resolver 11 permission cấp được + 4 quyền riêng Leader, quyền founder tạm; unit test chéo CLB, membership, nhiệm kỳ và position.
- [x] Cài test lớp HTTP cho callback sai state, Google không khả dụng, thuộc tính cookie, 401/403/423 và CSRF.
- [x] Lọc workspace CLB đã rời hoặc sai clubId khỏi `/auth/me`; giữ workspace founder `Pending Setup`.

## Đã code, còn bước nghiệm thu

- [ ] Mongo adapter đọc actor/role/membership/term/assignment/position; integration test đã viết nhưng chưa chạy với Mongo thật trong sandbox.
- [ ] ADR phiên/CSRF, cấu hình mẫu và bootstrap ICPDP/permission đã có; policy UC04 còn chờ giá trị khởi tạo hợp lệ.
- [ ] Google OAuth callback, transaction User/Profile, session, audit, middleware, OpenAPI đã code và có unit test; cần thử Google và Mongo replica set thật.
- [ ] UC03 API role/lock/unlock, audit, revoke session và màn quản trị ICPDP bản đầu đã code; cần integration Mongo thật.
- [ ] Client login, `/me`, chọn workspace, logout, i18n/theme đã build; cần kiểm tra UI bằng trình duyệt và trạng thái nhiều CLB.
- [ ] Chạy gate A đầy đủ: integration Mongo, callback thật, e2e UI và `npm run check` khi kết nối Mongo được. Hiện có 51 unit test; các integration Mongo bị skip khi `MONGO_URI` trống.

## Cấu hình còn chờ
Người dùng sẽ tự điền Google credentials và domain. Không kiểm thử Google thật trước khi có cấu hình đó.
`policyVersions` chưa seed vì tám giá trị khởi tạo ngoài domain chưa có trong SRS; đang chờ
quyết định của người dùng. Mongo local hiện chưa được xác nhận là replica set để chạy transaction.
Lệnh cài `openid-client` bị DNS của npm registry chặn, nên adapter OIDC dùng Node crypto và
Google discovery/JWKS, đã có test chữ ký/audience/nonce với khóa RSA giả lập.
