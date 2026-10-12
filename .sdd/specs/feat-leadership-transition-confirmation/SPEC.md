# SPEC: feat-leadership-transition-confirmation

## Vấn đề
Kế hoạch chuyển giao từ UC12 cần một quyết định ICPDP có thể thực thi atomically: nhiệm kỳ cũ
đóng, nhiệm kỳ mới mở, quyền cũ hết hiệu lực, quyền mới chỉ phát sinh sau xác nhận, trong khi
nghĩa vụ và lịch sử ban điều hành không bị mất.

## Hành vi
- ICPDP Officer đọc queue/detail của `transitionPlans` ở `Pending Confirmation`, claim đúng một
  `approvalTask` loại `TRANSITION_PLAN`, rồi phê duyệt hoặc trả lại kèm lý do.
- `candidates` dùng dạng `{ positionCode, membershipId }`. `outstandingObligations` dùng dạng
  `{ id, type, entityId?, description, assigneeMembershipId }`. `handoverItems` có thể chứa
  `{ items, proposedBoardRoles }`; khi `proposedBoardRoles` có mặt, đó là ảnh cơ cấu ban điều hành
  dự kiến và chỉ có hiệu lực khi UC13 được phê duyệt.
- Phê duyệt kiểm tra lại membership `Active`, nhiệm kỳ nguồn `Active`, nhiệm kỳ đích `Planned`,
  mỗi role ban điều hành có đúng một ứng viên, và luôn giữ role Chủ nhiệm. Bốn permission giữ
  riêng của leader không được gán vào role.
- Trong một transaction, phê duyệt đóng nhiệm kỳ cũ và assignment cũ, kích hoạt nhiệm kỳ mới,
  áp dụng thay đổi role ban điều hành nếu có, tạo assignment mới, lưu decision/audit và notification
  cho cả ban cũ lẫn ban mới. Khi cơ cấu thay đổi, tạo `ClubRoleStructureVersion` nguồn
  `TRANSITION`; không sửa phiên bản lịch sử.
- Officer có thể chọn các `obligationIds` để phê duyệt có điều kiện. Các mục được chép vào
  `followUpConditions` và panel dashboard CLB của ban mới.
- Nếu CLB `Suspended`, thao tác phê duyệt trả conflict và plan/task vẫn mở để xử lý sau UC15.
- Trả lại đặt plan thành `Returned`, đóng task, lưu decision/audit và thông báo; không đổi term,
  role hay assignment.
- UI có queue/detail ICPDP, claim, approve/return, chọn nghĩa vụ theo dõi, trạng thái loading/error/
  empty, responsive và i18n `en`/`vi`.

## Tiêu chí nghiệm thu
- [x] Chỉ `ICPDP_OFFICER` đọc, claim và quyết định được UC13; phải claim task trước khi quyết định.
- [x] Detail hiển thị hai nhiệm kỳ, ứng viên, nghĩa vụ và nội dung bàn giao.
- [x] Trả lại bắt buộc lý do và không thay đổi term/assignment.
- [x] Phê duyệt atomically đóng term/assignment cũ, mở term và tạo assignment mới.
- [x] Không cấp quyền trước quyết định; membership hoặc role không hợp lệ bị từ chối tại thời điểm duyệt.
- [x] CLB `Suspended` giữ nguyên plan/task ở trạng thái chờ.
- [x] Phê duyệt có điều kiện lưu đúng nghĩa vụ và dashboard ban mới hiển thị số mục theo dõi.
- [x] Thay đổi role ban điều hành tạo phiên bản cơ cấu mới và giữ role Chủ nhiệm/Members theo BR56.
- [x] Audit, decision và notification cho hai ban được ghi cùng transaction.
- [x] Automated checks và production build xanh.
- [ ] Visual QA thủ công trên desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
- Giao diện tạo kế hoạch UC12; UC13 tiêu thụ các plan/task do UC12 tạo.
- UC15 kích hoạt lại CLB đang `Suspended`.
- Tự động hoàn tất các nghĩa vụ nghiệp vụ ở M05/M07/M08; UC13 chỉ giữ liên kết và cờ theo dõi.

## Changelog
- v0.2.0 (2026-10-09) — hoàn tất vertical slice, Mongo integration, full check và build; còn visual QA.
- v0.1.0 (2026-10-09) — chốt vertical slice UC13 và hợp đồng JSON trên schema hiện hữu.
