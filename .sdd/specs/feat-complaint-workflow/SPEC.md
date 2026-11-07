# SPEC: feat-complaint-workflow

## Vấn đề
Diagram và context đã duyệt có luồng khiếu nại chính thức UC50 → UC51 → UC52 (*Complaint triage*,
*Complaint outcome*, *Complaint response*). Code là góp ý một chiều sinh viên tự chọn gửi CLB hoặc
ICPDP, không có triage, chuyển xuống hay trả lời (khoảng lệch G3). Gửi thẳng CLB vi phạm BR38.
SPEC này thay `feat-student-feedback`.

## Truy vết
UC50 (FR-01…06, A1, E1), UC51 (FR-01…08, A1, E1), UC52 (FR-01…07, E1); BR38, BR39, BR54, BR28 (liên kết
hồ sơ vi phạm); SEC-09; AC19; D5 (chốt 07/11/2026: CLB không thấy danh tính người khiếu nại).

## Hành vi

### Vòng đời `Complaint`
`Submitted → Under Triage → {Dismissed, Forwarded, Escalated}`; `Forwarded → Club Responded → {Closed, Escalated}`;
`Submitted | Under Triage → Withdrawn` (người gửi).

### UC50 — Student (`/api/v1/complaints`)
- `POST /complaints`: `clubId` bắt buộc (CLB tồn tại, không `Dissolved`), `eventId` tuỳ chọn và phải thuộc CLB,
  `type ∈ CONDUCT|EVENT|FINANCE|SAFETY|OTHER`, `description` 1–4.000 ký tự, `evidence` tối đa 5 liên kết http(s).
  Một transaction: tạo `Complaint` `Submitted`, `approvalTasks` `COMPLAINT` `Open`, audit
  `COMPLAINT_SUBMITTED` (không chứa nội dung), thông báo `COMPLAINT_SUBMITTED` cho ICPDP. Không thông báo CLB.
- E1 (sửa v1.3.0): hệ thống không tự đoán "cùng sự việc". ICPDP gộp tay ở UC51
  (`POST /admin/complaints/:id/link { targetId, reason }`): chỉ giữa hai khiếu nại chưa có quyết định của cùng
  sinh viên về cùng CLB; khiếu nại được gộp mang `linkedComplaintId`, đóng task, rời hàng đợi, và theo kết quả
  của khiếu nại gốc (triage, trả lời của CLB, đóng / leo thang).
- `GET /complaints/mine`; `POST /complaints/:id/withdraw` chỉ cho khiếu nại của mình ở `Submitted`/`Under
  Triage` → `Withdrawn`, đóng task (409 nếu không còn rút được).

### UC51 — ICPDP (`/api/v1/admin/complaints`, cần `ICPDP_OFFICER`)
- `GET` hàng đợi (lọc trạng thái) và chi tiết, kèm danh tính người khiếu nại và khiếu nại trùng.
- `POST :id/open`: `Submitted → Under Triage`, gán task cho officer.
- `POST :id/triage` `{ outcome, severity, validity, reason, responseDueAt? }` — lý do bắt buộc:
  - `Dismissed`: đóng task, báo sinh viên (`COMPLAINT_TRIAGED`).
  - `Forwarded`: `forwardedAt`, `responseDueAt` (mặc định +7 ngày), báo người có `club.complaint.respond`
    của đúng CLB (`COMPLAINT_FORWARDED`, không kèm danh tính).
  - `Escalated`: tạo `Violation` (`originType = COMPLAINT`, `originRefId` = khiếu nại) và ghi
    `complaint.violationId` trong cùng transaction; đóng task.
- `POST :id/close` / `POST :id/escalate`: chỉ từ `Club Responded`, lý do bắt buộc.
- E1: CLB `Dissolved` chỉ được `Dismissed` (giữ lịch sử).
- Mọi bước ghi audit có lý do; mọi cập nhật có điều kiện theo trạng thái vừa đọc → hai officer đua
  nhau chỉ một người thắng (409).
- UC42: khiếu nại leo thang thành hồ sơ vi phạm, nên đi vào chiều D8 của đánh giá như mọi hồ sơ UC40.

### UC52 — Club (`/api/v1/clubs/:clubId/complaints`, cần `club.complaint.respond`)
- `GET`: chỉ khiếu nại đã chuyển xuống (`Forwarded`, `Club Responded`, `Closed`, `Escalated` có
  `forwardedAt`) của đúng CLB. Payload chỉ gồm loại, mô tả, chứng cứ, tên sự kiện, ghi chú của ICPDP,
  hạn trả lời và phần trả lời — **không có** `complainantId`, tên hay email (D5).
- `POST :id/response` `{ text, action, evidence? }`: một lần, `Forwarded → Club Responded`, báo officer
  phụ trách. CLB không sửa, bác bỏ, leo thang hay đóng được.
- E1: job `complaint-response-job` mỗi giờ ghi một tín hiệu tuân thủ cho khiếu nại `Forwarded` quá hạn
  (audit `COMPLAINT_RESPONSE_OVERDUE` + thông báo ICPDP), đúng một lần mỗi khiếu nại.

### Dữ liệu cũ
Bản ghi góp ý một chiều trước 07/11/2026 giữ nguyên (không xoá), hiện trong hàng đợi ICPDP như
khiếu nại `Submitted` để ICPDP bác bỏ có lý do; route `/student-feedback*` cũ bị gỡ để không còn đường
vòng gửi thẳng CLB. Schema: bỏ `recipient` và `ix_complaint_inbox`, thêm `forwardedAt`, `respondedAt`,
`closure`, `clubResponse.action`.

### Ma trận quyền
| Thao tác | Student (người gửi) | ICPDP Officer | `club.complaint.respond` của CLB | Khác |
|---|---|---|---|---|
| Gửi, xem của mình, rút | ✓ | – | – | – |
| Hàng đợi, mở, triage, đóng, leo thang | – | ✓ | 403 | 403 |
| Xem khiếu nại đã chuyển xuống, trả lời | – | – | ✓ (đúng CLB) | 403 |

## Tiêu chí nghiệm thu
- [x] AC19: khiếu nại mới chỉ ICPDP thấy; CLB không nhận gì cho tới `Forwarded`; `Escalated` tạo `Violation` trỏ ngược về khiếu nại.
- [x] CLB không thấy khiếu nại `Submitted`/`Under Triage`/`Dismissed`; CLB khác và người thiếu quyền nhận 403.
- [x] Payload và thông báo cho CLB không chứa danh tính người khiếu nại (D5).
- [x] Mỗi chuyển trạng thái hợp lệ/không hợp lệ có test; lý do bắt buộc cho mọi kết quả.
- [x] Trả lời chỉ một lần; rút chỉ khi chưa có quyết định; hai lần mở đồng thời chỉ một thành công.
- [x] Khiếu nại trùng được liên kết và phân loại chung.
- [x] Tín hiệu quá hạn trả lời chỉ ghi một lần.

## Ngoài phạm vi
Tải file chứng cứ (chỉ liên kết); tự động mở hồ sơ UC40 khi quá hạn (ICPDP quyết định từ tín hiệu).

## Changelog
- v1.0.0 (2026-11-07) — người dùng duyệt theo prompt sửa lệch code/diagram; D5 chốt: CLB không thấy danh tính.
- v1.1.0 (2026-11-07) — sửa sau review: khiếu nại trùng = cùng sinh viên, CLB, sự kiện (hoặc cùng không có), loại, và khiếu nại gốc còn chưa có quyết định; khoá theo sinh viên để nộp đồng thời chỉ có một gốc; khiếu nại trùng theo gốc qua trả lời/đóng/leo thang và chỉ gốc hiện cho CLB; audit dùng trạng thái riêng của từng khiếu nại; CLB đính kèm liên kết chứng cứ khi trả lời; tín hiệu quá hạn chống trùng giữa nhiều instance.
- v1.2.0 (2026-11-07) — review lần hai: khiếu nại đi theo không có task, không vào hàng đợi ICPDP, mọi bước xử lý trực tiếp → 409; rút khiếu nại gốc thì khiếu nại đi theo cũ nhất thành gốc mới (có task); khiếu nại đi theo được audit khi CLB trả lời.
- v1.3.0 (2026-11-07) — người dùng chọn: bỏ tự gộp lúc nộp, ICPDP gộp tay (`link`) vì chỉ người đọc nội dung mới biết có cùng sự việc.
