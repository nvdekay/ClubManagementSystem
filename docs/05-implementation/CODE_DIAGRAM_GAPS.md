# Code lệch so với diagram đã duyệt

Đối chiếu ngày 02/11/2026, commit `2f6f5dd`. Nguồn chuẩn là **use case diagram**
(`../03-diagrams/UCMS_UseCase_ByActor.drawio`) và **context diagram**
(`../03-diagrams/UCMS_Context_Diagram.drawio`, 46 luồng) đã được duyệt, cùng `../SRS.md`.
Chỗ nào code khác diagram thì **code sai** và phải sửa code, không sửa yêu cầu.

Mỗi khoảng trống dưới đây là một tính năng mới: trước khi code, lập
`.sdd/specs/feat-{name}/SPEC.md` + `TASKS.md` theo `.rules/README.md`.

## Lệch so với diagram

| # | Diagram đã duyệt | Code hiện tại | Chỗ trong code |
|---|---|---|---|
| G1 | **UC23** — Club Leader quản lý role và quyền CLB (tạo role, gán permission). Context có luồng *Club roles & permissions* | Hai role cố định: Club Leader (ghế Chủ nhiệm / Phó chủ nhiệm đã xác nhận) có cả 14 permission, Club Member không có permission nào. Không có role tự tạo, không có route hay màn hình quản lý role | `server/src/domain/access.ts` (`CLUB_LEADER_PERMISSIONS`, `resolveClubPermissions`) |
| G2 | **UC30, UC32, UC58** — Club Member quản lý waitlist, chốt điểm danh, xem phòng được cấp (trang *Club Member - Events & bookings*) | Cần `club.attendance.manage` / `club.booking.manage`, chỉ Club Leader có | `server/src/domain/access.ts`; `server/src/usecase/club-event.ts`; `server/src/usecase/room-allocation.ts` |
| G3 | **UC50, UC51, UC52** — Student gửi khiếu nại → ICPDP triage (bác bỏ / chuyển CLB / leo thang thành hồ sơ vi phạm) → CLB phản hồi. Context có *Complaint triage*, *Complaint outcome*, *Complaint response* | UC50 là góp ý một chiều gửi thẳng CLB hoặc ICPDP; không có triage, chuyển tiếp hay phản hồi. Schema `complaints` vẫn còn `triage`, `clubResponse`, `violationId`, `linkedComplaintId` và trạng thái `Under Triage`, `Forwarded`, `Escalated` nhưng không use case nào ghi | `server/src/usecase/student-feedback.ts`; `server/src/infra/db/mongo-student-feedback-repository.ts`; `server/src/infra/db/ucms-schema.generated.ts` |
| G4 | **UC05** — ICPDP cấu hình quy tắc định tuyến phê duyệt, duyệt nhiều cấp (`ICPDP_HEAD`) | Không có routing rule. System role chỉ có `ICPDP_OFFICER` và `ATTENDANCE_UNLOCK` | `server/src/domain/account-admin.ts` (`SYSTEM_ROLE_CODES`) |
| G5 | **Context** — UCMS gửi e-mail ra ngoài qua Google SMTP | Outbox và job gửi có chạy nhưng transport chỉ ghi người nhận và tiêu đề vào log | `server/src/main.ts` (`logMailTransport()`); `server/src/infra/mail/log-mail-transport.ts` |

G1 và G2 đi cùng nhau: khi có role cấu hình được (UC23), quyền điểm danh và xem phòng của
Club Member được cấp qua role thay vì gắn cứng vào ghế Chủ nhiệm / Phó chủ nhiệm.

## Lệch so với SRS (không thể hiện trên diagram)

| # | SRS | Code hiện tại | Chỗ trong code |
|---|---|---|---|
| S1 | **UC04** — ICPDP cấu hình domain e-mail được phép đăng nhập trong policy | Domain lấy từ biến môi trường `ALLOWED_DOMAIN`; `PolicySettings` không có trường domain | `server/src/domain/policy.ts`; `server/src/infra/config/index.ts` |
| S2 | **UC48, UC49** — feedback chấm theo nhiều tiêu chí | Một điểm tổng `overall` 1–5 kèm nhận xét | `server/src/domain/event-feedback.ts` |
| S3 | **SE-01 / AC17** — truy cập trái phép bị audit | Trả 403 nhưng không ghi audit | `server/src/usecase/access.ts`; `server/src/interface/http/middleware.ts` |

## Đã khớp

- UC08 duyệt hồ sơ tạo CLB ở `Active` cùng nhiệm kỳ sáng lập và ghế ban chủ nhiệm (state diagram
  *Club*, main workflow 1). Code còn giữ quy tắc tương thích cho CLB cũ đang `Pending Setup`
  (`server/src/domain/access.ts`), không CLB mới nào vào trạng thái này.

## Thứ tự đề xuất

1. **G2** — nhỏ nhất: cấp cho Club Member quyền điểm danh và xem phòng.
2. **G1** — role CLB cấu hình được (UC23); G2 chuyển sang dùng cơ chế này.
3. **G3** — luồng khiếu nại có triage (UC50–UC52); schema đã có sẵn trường.
4. **G4** — định tuyến phê duyệt và `ICPDP_HEAD` (UC05).
5. **G5** — nối transport SMTP thật.
6. **S1–S3** theo SRS.
