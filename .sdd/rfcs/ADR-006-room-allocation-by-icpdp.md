# ADR-006 — ICPDP phân phòng học theo học kỳ, lưu bằng booking đã sinh

Ngày: 2026-10-11. Trạng thái: áp dụng cho UC58, được product owner duyệt. Thay luồng phòng học của
commit `8ac5428` (CLB đặt `ROOM` trực tiếp, ICPDP đặt trùng phòng học).

## Bối cảnh
Nhà trường cấp phòng học cho CLB theo lịch tuần cố định trong cả học kỳ và giao chìa khoá dựa trên
lịch đó. Luồng trước để CLB tự giữ từng buổi phòng còn trống (`Approved` ngay) và cho ICPDP đặt
trùng có lý do. Kết quả là phòng bị chiếm lẻ tẻ, ICPDP không kiểm soát được việc cấp phòng, và
ngoại lệ đặt trùng làm hai CLB cùng giữ một phòng. Phần còn lại của hệ thống — BR15, job vòng đời
booking, cascade UC15/UC28, lưới availability — đều đọc `propertyBookings`.

## Quyết định
- Phòng học chỉ do ICPDP phân ở UC58: một đợt phân = học kỳ + CLB + phòng `ROOM` + thứ + một slot
  campus + ghi chú. CLB không đặt, huỷ hay xin phòng học; UC45–47 chỉ còn cho `HALL`, `OUTDOOR`,
  `STAGE`, `EQUIPMENT`.
- Đợt phân được hiện thực hoá bằng một `propertyBookings` `Approved` cho mỗi ngày khớp còn ở tương
  lai trong học kỳ (`purpose = "ICPDP room allocation"`, `currentVersionNo = 0`), bỏ qua ngày
  blackout. Bản thân đợt phân là một bản ghi `auditLogs` (`entityType = RoomAllocation`,
  `ROOM_ALLOCATED`, `after` chứa tham số và `bookingIds`); thu hồi là `ROOM_ALLOCATION_REVOKED`.
- Không overbooking cho phòng học: một ngày xung đột là từ chối cả đợt. `allowOverbooking` chỉ còn
  áp dụng cho UC46.
- Không đổi schema, không thêm collection.

## Các phương án đã cân nhắc
- **CLB tự đặt phòng học (luồng trước, commit `8ac5428`)** — đơn giản cho CLB nhưng không khớp cách
  nhà trường cấp phòng theo học kỳ và cần ngoại lệ đặt trùng. Bị bỏ.
- **Collection mới `roomAllocations`** giữ mẫu tuần, các buổi tính khi đọc hoặc sinh kèm — mô hình
  sạch hơn, nhưng phải đổi DBML/schema đã chốt, thêm migration, và mọi nơi đang đọc
  `propertyBookings` (BR15, job, cascade, availability) phải đọc thêm nguồn thứ hai. Bị từ chối để
  tránh đổi schema.
- **Một booking dài cả học kỳ** — phá giả định booking nằm trong một slot của một ngày, làm sai BR15
  và job vòng đời. Bị từ chối.

## Hệ quả
- Kiểm tra xung đột, job `Approved → In Use → Completed`, cascade tạm ngừng/giải thể và lưới
  availability hoạt động với phòng đã phân mà không cần sửa.
- Danh sách đợt phân phải dựng từ audit log và booking; không sửa đợt phân tại chỗ — đổi là thu hồi
  rồi phân lại, nên lịch sử luôn đầy đủ.
- Buổi bị cascade UC15 giải phóng không được khôi phục khi CLB kích hoạt lại; ICPDP phải phân lại.
- Mỗi học kỳ phải phân lại từ đầu; không có cơ chế sao chép.
- Dữ liệu ROOM của luồng cũ bị `npm run seed:demo` xoá hẳn; không có migration chuyển dữ liệu cũ.
- Nếu sau này cần sửa đợt phân hay truy vấn mẫu tuần nhiều, có thể tách collection riêng bằng một
  ADR mới.
