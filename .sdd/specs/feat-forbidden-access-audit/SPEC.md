# SPEC: feat-forbidden-access-audit

## Vấn đề
SEC-08 và AC17 yêu cầu mọi lần một người dùng đã đăng nhập cố làm việc ngoài quyền bị từ chối **và
được ghi audit bền vững**. Code hiện trả 403 nhưng không ghi gì vào `auditLogs` (khoảng lệch S3 trong
`docs/05-implementation/CODE_DIAGRAM_GAPS.md`). Ví dụ của AC17: người không phải ICPDP cố quyết định
một booking.

## Truy vết
- SEC-08, AC17; AUD-03 (audit mạnh cho quyết định và lần bị từ chối); SEC-12 (`auditLogs` chỉ ghi thêm).

## Hành vi
- **Một chỗ ghi duy nhất.** Middleware lỗi `accessDenialAuditor` đặt ngay trước `errorHandler` trong
  `interface/http/server.ts`. Khi lỗi là `DomainError` kind `forbidden` **và** `res.locals.actor` đã
  được `authGuard` đặt (người dùng đã xác thực, tài khoản không khoá, CSRF hợp lệ), nó gọi usecase
  `recordAccessDenial` rồi chuyển lỗi cho `errorHandler` trả 403 như cũ. Use case nghiệp vụ không tự
  ghi denial, nên một lần từ chối chỉ có một dòng audit.
- **Ngữ cảnh lấy từ dữ liệu đã chuẩn hoá, không từ `req.body`.** `authGuard` lưu vào `res.locals`:
  method, mẫu route (`req.baseUrl + req.route.path`, ví dụ
  `/api/v1/admin/bookings/:id/decision`) và các tham số đường dẫn. Use case chỉ nhận tham số là
  ObjectId hợp lệ (24 hex).
- **Đối tượng bị nhắm tới:** tham số ObjectId cuối cùng trên mẫu route; `entityType` là đoạn tĩnh
  đứng ngay trước nó, viết hoa, `-` → `_` (ví dụ `BOOKINGS`). Không có tham số nào → `entityType =
  "USER"`, `entityId` = người gọi. Nếu route có `:clubId`, ghi kèm làm phạm vi.
- **Bản ghi `auditLogs`:** `action = "ACCESS_DENIED"`, `actorId`, `entityType`, `entityId`, `reason`
  (thông điệp của `DomainError`), `after = { method, route, clubId?, requiredPermission? }`,
  `correlationId` (UUID mỗi request), `at`. Không bao giờ ghi body, cookie, CSRF token, header hay
  stack trace.
- `requireClubPermission` gắn `details.requiredPermission` vào lỗi 403 để audit (và client) biết quyền
  còn thiếu.
- **Không đổi thực thể đích.** Audit chạy sau khi use case đã ném lỗi, ngoài mọi transaction nghiệp vụ.
- **Lỗi khi ghi audit** không đổi response: vẫn trả 403, lỗi ghi được log phía server (không kèm dữ
  liệu nhạy cảm).

### Phân biệt mã lỗi
| Tình huống | Status | Ghi denial? |
|---|---|---|
| Không có phiên | 401 | Không |
| Tài khoản khoá | 423 | Không |
| CSRF sai | 403 | Không (chưa xác định được actor theo `authGuard`) |
| Dữ liệu vào sai | 400 | Không |
| Đã xác thực nhưng thiếu quyền / sai CLB | 403 | **Có, đúng một dòng** |

## Tiêu chí nghiệm thu
- [x] **Cho** người dùng đã đăng nhập không phải ICPDP Officer, **khi** gọi
      `POST /api/v1/admin/bookings/:id/decision`, **thì** nhận 403, booking giữ nguyên, và có đúng một
      dòng audit `ACCESS_DENIED` với actor, `entityId` = id booking, route và method.
- [x] Officer hợp lệ quyết định booking không sinh dòng denial.
- [x] Request không có phiên nhận 401 và không sinh dòng denial.
- [x] Thành viên CLB A gọi API cần quyền của CLB B → 403 và dòng denial có `clubId` của CLB B và
      `requiredPermission`.
- [x] Dòng audit không chứa body, cookie hay CSRF token.

## Ngoài phạm vi
Màn hình tra cứu denial cho ICPDP (đọc qua audit hiện có); cảnh báo realtime.

## Changelog
- v1.0.0 (2026-11-07) — người dùng duyệt theo prompt sửa lệch code/diagram.
