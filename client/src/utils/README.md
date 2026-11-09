# utils/

Các helper thuần, nhỏ: `cn()` (gộp className theo mẫu ghi đè CSS), `formatDate`, `formatDay` và các helper ngày theo giờ Việt Nam (`vnDateInput`, `vnDayBoundary`, `vnTomorrowInput`), `formatMoney` (số tiền VND).
`roomSchedule` — nhãn thứ trong tuần và slot dùng chung cho trang phân phòng (ICPDP) và phòng được phân (CLB).
`notificationLink` — ánh xạ `eventCode` của thông báo sang trang đích thuộc đúng workspace của người nhận (sinh viên / ICPDP / CLB, khớp danh sách audience ở `server/src/domain/notification.ts`), nhóm chủ đề (tiêu đề dự phòng) và chủ thể hiển thị lấy từ payload.
`validation` — `isEmail`, `isHttpUrl`: cùng quy tắc với server, dùng cho kiểm tra trường ngay khi nhập (`useFieldValidation`).
`workspaceIcon` — icon của từng loại workspace, dùng chung cho màn chọn workspace và sidebar.
`revisionDiff` — `diffFields`: so hai phiên bản hồ sơ theo danh sách trường có nhãn, trả các trường có nội dung khác nhau.
