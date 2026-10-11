# TASKS: feat-room-allocation

| Công việc | Người phụ trách | Trạng thái |
|-----------|-----------------|------------|
| Docs: SPEC + TASKS, ADR-006 | agent | xong |
| Docs: SRS, đặc tả/mô hình UC (UC58, BR33/BR35/BR62), BR issues, diagram drawio, presentation, guide book, DBML notes, DOCX | agent | xong (PNG và ảnh DOCX chưa xuất lại) |
| Domain: input, sinh ngày theo thứ/slot/học kỳ, blackout, khung giờ được đặt, BR45 | agent | xong |
| Usecase: options, list, allocate, revoke, club view; quyền ICPDP / thành viên Active | agent | xong |
| Infra: repository Mongo — khoá property, kiểm tra xung đột booking/sự kiện, ghi booking + audit + notification cùng transaction | agent | xong |
| HTTP: 5 route + Zod + CSRF + OpenAPI | agent | xong |
| Gỡ luồng phòng học cũ: đặt ROOM trực tiếp, overbook, `booking-responsible`, `RoomOverbookingForm`, ROOM legacy review | agent | xong |
| Client ICPDP: `/workspace/room-allocations` (sidebar "Sự kiện & cơ sở vật chất"), lưới chiếm dụng, tạo/thu hồi | agent | xong |
| Client CLB: `/club/:clubId/rooms` chỉ đọc; `/club/:clubId/bookings` bỏ ROOM; i18n en/vi | agent | xong |
| Seed demo: xoá dữ liệu ROOM cũ (kèm task/decision/notification/audit), seed vài đợt phân, idempotent | agent | xong |
| Test: unit (sinh ngày, blackout, giữa kỳ, BR45), integration (xung đột cả đợt, đồng thời, thu hồi, cascade UC15) | agent | xong |
| `npm run check`, build client, kiểm tra UI en/vi sáng/tối 390/1440 px | agent | check + build xong; QA trực quan chưa làm (cần OAuth) |
