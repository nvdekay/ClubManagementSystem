# SPEC: feat-board-nomination-confirmation

## Vấn đề
Sau UC09, CLB `Pending Setup` cần đề cử các ghế ban điều hành, nhận đúng một quyết định từ ICPDP,
rồi chỉ khi xác nhận Chủ nhiệm sáng lập mới chuyển thành `Active`. Hiện UC10/UC11 chưa nối các
bản ghi role, membership, nhiệm kỳ, task, quyết định và quyền truy cập thành một luồng thực thi.

## Hành vi
- UC10 chỉ cho Club Leader có `club.board.nominate` đề cử các role `isBoardSeat` đang active
  thuộc cơ cấu hiện hành; ứng viên phải có membership `Active` trong cùng CLB. Với luồng sáng lập,
  người nộp đơn dùng quyền tạm từ UC08 khi CLB còn `Pending Setup`. Đề cử dùng nhiệm kỳ `Active`
  hiện tại; ngày bắt đầu/kết thúc phải đang có hiệu lực.
- Một đề cử chứa các ghế còn trống của một nhiệm kỳ và chuyển sang `Pending Confirmation`, đồng
  thời tạo đúng một `approvalTask` loại `BOARD_NOMINATION` cho ICPDP. Ghế đã được xác nhận không
  thể bị đề cử lại.
- BR06: không cho phép hai nhiệm kỳ Chủ nhiệm của cùng một người chồng lấn.
- BR07 theo xác nhận phạm vi: membership `Active` là điều kiện đủ về membership; không áp thêm
  tiêu chí học vụ hay tiêu chí ngoài hệ thống.
- UC11 chỉ dành cho `ICPDP_OFFICER`. Officer mở queue/detail và ghi đúng một quyết định cho task;
  quyết định có thể xác nhận mọi ghế, trả mọi ghế, hoặc xác nhận một phần và trả phần còn lại kèm
  lý do. Ghế trả về được đề cử lại bằng một đề cử/task mới.
- Khi xác nhận ghế, tạo assignment bất biến gắn với term và officer. Khi xác nhận Chủ nhiệm sáng
  lập, Club chuyển `Pending Setup → Active`; quyền founder tạm không còn được dùng, quyền CMB suy
  ra từ assignment đã xác nhận. Khi membership không còn `Active`, ghế được trả về thay vì cấp
  quyền.
- Task, decision, nomination/seat states, term, assignments, club state, audit và notification
  thay đổi trong transaction. Retry/cạnh tranh không thể tạo quyết định thứ hai hoặc assignment
  trùng.
- UI gồm màn đề cử ở workspace Club và queue/detail quyết định ICPDP, với loading/error/empty,
  responsive, light/dark, i18n `en`/`vi`.

## Tiêu chí nghiệm thu
- [x] Người không có quyền đề cử đúng CLB không thể tạo đề cử; không-ICPDP không thể đọc/ra quyết
  định UC11.
- [x] Chỉ role ban điều hành active thuộc cơ cấu và membership Active cùng CLB có thể đề cử.
- [x] Không thể đề cử ghế đang được giữ/xác nhận; Chủ nhiệm không được chồng lấn nhiệm kỳ.
- [x] Một lần nộp tạo một nomination và một task ICPDP; một task có tối đa một quyết định.
- [x] Xác nhận một phần tạo assignment chỉ cho ghế được xác nhận; các ghế còn lại về `Returned`.
- [x] Membership bị kết thúc trước lúc quyết định thì ghế không được xác nhận và được trả về.
- [x] Xác nhận Chủ nhiệm sáng lập atomically kích hoạt Club; quyền CMB phát sinh từ assignment đã
  xác nhận, không từ UC03.
- [x] Lịch sử nomination/task/decision/assignment/audit còn đọc được sau quyết định; ghi audit và
  notification cùng transaction.
- [x] Automated checks xanh; UI production build xanh.
- [ ] Visual QA thủ công trên desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
- Nhiệm kỳ kế tiếp và chuyển giao đầy đủ (UC12/UC13), cấu hình role/permission (UC23), sửa hoặc
  xuất lại sơ đồ.
- Định nghĩa tiêu chí học vụ BR07 ngoài membership `Active`; người dùng xác nhận phần đó không
  thuộc phạm vi hiện tại.
- Cho phép Chủ nhiệm trùng nhiệm kỳ; hiện quy tắc được chốt là không cho phép.

## Changelog
- v0.3.0 (2026-10-08) — hoàn tất vertical slice, automated tests và build; còn visual QA.
- v0.2.0 (2026-10-08) — ghi nhận BR06/BR07 theo xác nhận người dùng và dùng ngày của nhiệm kỳ hiện tại.
- v0.1.0 (2026-10-08) — chốt phạm vi UC10→UC11, một task/một quyết định, không đổi schema.
