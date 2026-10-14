# ADR-007 — Mọi việc vận hành CLB thuộc riêng Club Leader; role CLB không mang permission

Ngày: 2026-10-13. Trạng thái: áp dụng, được product owner duyệt (review issue I66). Thay mô hình
uỷ quyền theo role của I58 (BR54 cũ: Club Member làm việc vận hành khi role có permission).

## Bối cảnh
Hai commit sửa use case diagram ngày 2026-10-12 — `107ea77` và `3f1c580` — chuyển mười use case
vận hành CLB (Manage club profile, Manage members, Manage recruitment campaigns, Manage
applications, Manage events, Manage facility bookings, Manage reports, Record expense & submit
settlement, Respond to complaint, Review event feedback) từ Club Member sang Club Leader, bỏ các
khung permission trên sơ đồ, và gộp các trang phía CLB thành: Club Member - Events & bookings,
Club Leader, Club Leader - Club & recruitment, Club Leader - Events, bookings & finance. Trang Club
Member chỉ còn Manage my membership, Manage attendance và Manage allocated rooms.

Trong khi đó code và đặc tả vẫn cho Club Leader cấp 11 permission cho role (seed cho Phó chủ
nhiệm, Thủ quỹ, Truyền thông quyền `club.event.manage`, `club.expense.record`, …), nên sơ đồ lệch
với đặc tả và code.

## Quyết định
- Club Leader đã được xác nhận giữ **mọi** permission CLB. Mười bốn quyền thuộc riêng Club Leader:
  `club.profile.manage`, `club.recruitment.manage`, `club.application.review`,
  `club.member.manage`, `club.event.manage`, `club.report.submit`, `club.expense.record`,
  `club.booking.manage`, `club.feedback.view`, `club.complaint.respond`, `club.role.manage`,
  `club.board.nominate`, `club.transition.plan`, `club.suspension.request`.
- Role CLB chỉ là chức danh, không cấp permission nào. Nhánh "Configure role permissions" của UC23
  bị bỏ; API role từ chối mọi `permissionCodes`.
- Mọi thành viên `Active` tự có hai permission mặc định: `club.attendance.manage` (UC30, UC32,
  check-in hộ ở UC31) và `club.room.view` (mới, tách khỏi `club.booking.manage`, để xem phòng học
  được phân ở UC58).
- Danh bạ role hiển thị: role Chủ nhiệm → mọi permission, role Members → hai permission mặc định,
  role khác → không có.
- Người đứng đơn ở `Pending Setup` giữ nguyên phạm vi tạm thời của BR47 (b).

## Các phương án đã cân nhắc
- **Club Leader + uỷ quyền:** sơ đồ vẽ Club Leader, đặc tả ghi "Club Leader hoặc thành viên được cấp
  permission X". Khớp code hiện có, chỉ sửa tài liệu — nhưng sơ đồ không còn thể hiện đúng ai làm
  được gì. Bị từ chối.
- **Chỉ Leader, chỉ sửa tài liệu:** để code vẫn cho uỷ quyền, chấp nhận lệch. Bị từ chối vì tài liệu
  và hệ thống mâu thuẫn.
- **Điểm danh và xem phòng cũng qua uỷ quyền (`club.room.view` cấp được):** giữ UC23 có ý nghĩa,
  nhưng trái với sơ đồ (Club Member là actor trực tiếp của hai use case này). Bị từ chối.
- **Giữ UC "Configure role permissions" với danh mục rỗng:** diff nhỏ hơn nhưng để lại một màn hình
  không làm gì. Bị từ chối.

## Hệ quả
- Không đổi schema: trường `permissionCodes` của `clubPositions` / cơ cấu vẫn còn nhưng luôn rỗng
  với role thường; resolver bỏ qua giá trị cũ còn sót trong dữ liệu.
- Phó chủ nhiệm, Thủ quỹ, Trưởng ban mất các quyền vận hành từng được cấp; chủ nhiệm phải tự làm
  mọi việc vận hành. Đây là đánh đổi đã chấp nhận để mô hình quyền đơn giản và khớp sơ đồ.
- BR47 (c), BR54, BR55 được viết lại; BR56 giữ nguyên nghĩa (đánh phiên bản cơ cấu, role Chủ nhiệm
  cố định, role Members mặc định).
- Nếu sau này cần uỷ quyền lại, phải có ADR mới và vẽ lại các trang phía CLB.
