# SPEC: feat-approval-routing

## Vấn đề
UC05 (diagram, context) cho ICPDP cấu hình rule định tuyến phê duyệt đánh phiên bản: hồ sơ UC08,
UC26, UC46 khớp rule phải qua cấp duyệt thứ hai (`ICPDP_HEAD`) trước khi quyết định có hiệu lực. Code
chỉ có `ICPDP_OFFICER`, mỗi task một quyết định (khoảng lệch G4).

## Truy vết
UC05 (FR-01…07, E1, A1); BR16 (đã sửa), BR31; WF-05; UC08, UC26, UC46; D1 (chốt 07/11/2026).

## Quyết định D1
`ICPDP_HEAD` là system role cấp kèm `ICPDP_OFFICER`, không phải actor thứ năm:
- UC03 chỉ cấp `ICPDP_HEAD` cho người đang giữ `ICPDP_OFFICER`; thu hồi `ICPDP_OFFICER` thì
  `ICPDP_HEAD` mất theo (cùng transaction, có audit). Thay đổi role thu hồi mọi phiên của người đó.
- Workspace ICPDP vẫn đến từ `ICPDP_OFFICER`.
- Chỉ Head tạo/sửa/kích hoạt rule; mọi officer đọc và mô phỏng.
- Chỉ Head nhận (claim) và quyết định cấp 2; người đã duyệt cấp 1 không được quyết định cấp 2 (bốn mắt).

## Hành vi

### `RoutingRuleSet` (`routingRuleSets`)
- `versionNo` tăng, `Draft → Active → Superseded`; chỉ một bộ `Active`; bộ `Active` không bao giờ sửa
  tại chỗ (sửa = tạo nháp mới).
- Rule: `requestType ∈ CLUB_APPLICATION | EVENT_PROPOSAL | PROPERTY_BOOKING`; điều kiện tuỳ chọn:
  ngân sách sự kiện `[minAmount, maxAmount)`, mức rủi ro sự kiện, loại cơ sở vật chất
  (`HALL|OUTDOOR|STAGE|EQUIPMENT`), số hồ sơ UC40 đang mở của CLB `[min, max)`; đầu ra
  `requiredLevel ∈ {1,2}`, `slaHours`.
- Hai rule chồng nhau (có một hồ sơ khớp cả hai) → 400 kèm các cặp chồng nhau (E1), cả khi lưu
  nháp lẫn khi kích hoạt. Không bắt buộc phủ mọi trường hợp: không khớp → một cấp (BR16).
- Kích hoạt: transaction, bộ cũ `Superseded`, audit `ROUTING_RULES_ACTIVATED`.
- A1: `GET …/simulation?limit=N` (1–200) chạy bộ rule trên N task đã quyết định gần nhất, **chỉ đọc**.
  Ghi chú: lịch sử tuân thủ dùng số hồ sơ mở hiện tại của CLB.

### Áp dụng cho UC08 / UC26 / UC46
- Lúc mở task (nộp hồ sơ), `routedTaskFields` tra bộ `Active` một lần và đóng băng
  `routingRuleSetId`, `routingRuleId`, `requiredLevel`, `currentLevel = 1`, `slaDueAt` trên
  `approvalTasks`. Kích hoạt bộ mới không đổi task đang mở.
- Quyết định (`approvalDecisionStep`, trong transaction của từng luồng):
  - Cấp 1 **duyệt** hồ sơ cần hai cấp → ghi `approvalDecisions` cấp 1, task lên `currentLevel = 2`,
    bỏ người nhận, đặt lại SLA, audit `APPROVAL_LEVEL1_APPROVED`, thông báo
    `APPROVAL_LEVEL2_REQUIRED` cho Head. **Không** có hiệu lực cuối: hồ sơ giữ `Under Review`, không
    tạo CLB (UC08), không `Approved`/`EventBudget` (UC26), không booking `Approved` (UC46).
  - Cấp 1 **từ chối / yêu cầu sửa** → kết quả cuối ngay (không cần cấp 2).
  - Cấp 2 (Head) → kết quả cuối với mọi outcome, áp dụng chuyển trạng thái và tác dụng phụ trong
    cùng transaction như luồng một cấp.
- `approvalDecisions` có `level`; index unique `(approvalTaskId, level)` thay `uq_decision_task`
  (khởi động tự đổi index cũ) — cùng cấp không thể có hai quyết định; hai người đua chỉ một thắng.
- DTO task của ba luồng trả `requiredLevel`, `currentLevel`; UI hiện "Cấp x/2".

### API
| Endpoint | Quyền |
|---|---|
| `GET /admin/routing-rules` | `ICPDP_OFFICER` |
| `POST /admin/routing-rules`, `PUT /admin/routing-rules/:id`, `POST …/:id/activate` | `ICPDP_HEAD` (+ Officer), CSRF |
| `GET /admin/routing-rules/:id/simulation?limit=` | `ICPDP_OFFICER` |

## Tiêu chí nghiệm thu
- [x] Rule chồng nhau bị từ chối; không khớp rule → một cấp.
- [x] Bộ mới chỉ áp dụng cho hồ sơ mới (task đóng băng route).
- [x] Mô phỏng không ghi dữ liệu.
- [x] UC08, UC26, UC46: một cấp như cũ; hai cấp → cấp 1 không có tác dụng phụ cuối, Head quyết định cấp 2.
- [x] Officer thường không nhận/quyết định cấp 2; Head làm được; người duyệt cấp 1 không quyết định cấp 2.
- [x] Từ chối ở cấp 1 là kết quả cuối.
- [x] Chỉ cấp `ICPDP_HEAD` cho Officer; thu hồi Officer kéo theo Head.
- [x] OpenAPI, route coverage, client role selector xanh.

## Ngoài phạm vi
Định tuyến cho loại hồ sơ khác (UC11, UC13, UC15…); hơn hai cấp; tự động leo thang khi quá SLA (SLA
hiện hiển thị qua `slaDueAt`).

## Changelog
- v1.0.0 (2026-11-07) — người dùng duyệt theo prompt sửa lệch code/diagram; D1 chốt theo hướng RBAC.
- v1.1.0 (2026-11-07) — sửa sau review: index unique một phần `uq_routing_active` (người dùng duyệt) bảo đảm đúng một bộ `Active`, kích hoạt đồng thời → 409; mô phỏng dùng revision và số hồ sơ vi phạm mở tại lúc mở task.
