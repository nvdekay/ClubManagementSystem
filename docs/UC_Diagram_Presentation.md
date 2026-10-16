# Thuyết trình Use Case Diagram — baseline hiện hành

> Cập nhật 15/10/2026 theo code `origin/main` commit `60fc2db`. Chi tiết trạng thái xem
> [`CURRENT_IMPLEMENTATION.md`](CURRENT_IMPLEMENTATION.md).

## Actor và nguyên tắc quyền

Hệ thống có bốn actor người: Student, Club Member, Club Leader và ICPDP Officer. Quan hệ kế
thừa là User ◁ Student ◁ Club Member ◁ Club Leader; ICPDP Officer cũng kế thừa User.

Phía CLB chỉ có hai role cố định. Club Leader là Chủ nhiệm hoặc Phó chủ nhiệm đã được ICPDP xác
nhận trong nhiệm kỳ hiện hành và có toàn bộ permission quản lý. Club Member không có permission
quản lý, chỉ xem và tham gia. UC23 và role tự tạo đã rút.

## Student

Student đăng nhập Google (UC01), xem dashboard (UC02), khám phá CLB/sự kiện (UC06), nộp hồ sơ
thành lập CLB (UC07), ứng tuyển thành viên (UC17), đăng ký sự kiện (UC29), check-in (UC31), gửi
feedback sự kiện (UC48) và gửi góp ý một chiều cho CLB hoặc ICPDP (UC50). UC50 hiện không phải
complaint workflow; UC51–UC52 đã rút theo scope code.

## Club Member

Club Member dùng member space (UC24), xin rời CLB (UC22), xem danh sách thành viên ở chế độ chỉ đọc, đồng thời kế thừa mọi chức năng Student. Thành viên thường không tạo đợt
tuyển, duyệt đơn, quản lý thành viên, sự kiện, booking, báo cáo hay tài chính.

## Club Leader

Xem phòng được phân UC58 cũng yêu cầu Leader; Club Member hiện không được truy cập.

Club Leader vận hành toàn bộ phía CLB: hồ sơ/cơ cấu (UC09), đề cử board (UC10), kế hoạch chuyển
giao (UC12), yêu cầu tạm ngừng (UC14), tuyển và quản lý thành viên (UC16, UC18–UC21), sự kiện
(UC25, UC27, UC28, UC30, UC32), báo cáo (UC33, UC38), tài chính (UC36), booking ngoài `ROOM`
(UC45, UC47), xem feedback tổng hợp (UC49) và phản hồi lời mời sự kiện cấp trường (UC54).

Từ 15/10/2026, UC12, UC14, UC38 và UC54 đã có phía CLB; UC36/UC37 đã nối vào app chính.

## ICPDP Officer

ICPDP quản lý tài khoản/chính sách (UC03–UC04), thẩm định hồ sơ và board/chuyển giao/vòng đời CLB
(UC08, UC11, UC13, UC15), duyệt sự kiện và báo cáo (UC26, UC34, UC39), tài chính (UC35, UC37),
vi phạm và đánh giá (UC40–UC43), property/booking/phòng học (UC44, UC46, UC58), sự kiện cấp
trường (UC53) và xuất dữ liệu (UC55). UC05 đã rút.

## Câu hỏi thường gặp

**Club Member có thể được giao một permission lẻ không?** Không. Permission không được cấu hình
hay gán theo role nữa.

**Phó chủ nhiệm có ít quyền hơn Chủ nhiệm không?** Không. Cả hai là Club Leader và nhận cùng bộ
14 permission.

**Tại sao schema vẫn có `permissionCodes` và `clubRoleStructureVersions`?** Để tương thích dữ
liệu/lịch sử; resolver hiện hành bỏ qua chúng khi cấp quyền.

**Complaint ở đâu?** Code hiện tại chỉ có góp ý một chiều (`StudentFeedback`). UC51–UC52 đã ngoài phạm vi theo quyết định 09/10/2026.
