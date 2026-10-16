# SPEC: feat-club-invitations

## Vấn đề
UC53 đã gửi lời mời nhưng Club Leader chưa có luồng UC54 nhận hoặc từ chối.

## Hành vi
- `GET /clubs/:clubId/invitations`: chỉ Leader có `club.event.manage`, chỉ trả lời mời của CLB và thông tin sự kiện cần phối hợp; không lộ lời mời CLB khác hoặc mã check-in.
- `POST /clubs/:clubId/invitations/:id/response`: `outcome` Accepted/Declined, `responseNote` tối đa 5000 ký tự; Declined bắt buộc lý do. Accepted có `responseDetails` phẳng gồm chuỗi/số.
- Chỉ CLB Active, sự kiện Approved/Upcoming chưa bắt đầu, lời mời Pending trước deadline được phản hồi. Kiểm tra lại trong transaction; hai phản hồi cạnh tranh chỉ một thành công.
- Ghi respondedBy/respondedAt, audit EventInvitation và notification cho invitedBy trong cùng transaction. Giữ luồng hết hạn UC53 hiện hành.
- UI `/club/:clubId/invitations`: danh sách, hạn, nội dung phối hợp, form phản hồi, lịch sử trạng thái; en/vi, loading/error/empty.

## Tiêu chí nghiệm thu
- [ ] Member/CLB khác không được đọc hoặc sửa lời mời.
- [ ] Declined thiếu lý do và responseDetails lồng nhau bị từ chối.
- [ ] Quá hạn, đã thu hồi, đã trả lời, sự kiện đã bắt đầu không được phản hồi.
- [ ] Phản hồi nguyên tử, notification/audit đúng một lần kể cả cạnh tranh.
- [ ] UI, route mount, OpenAPI, unit/integration và check xanh.

## Ngoài phạm vi
Thay đổi UC53 và cho sửa phản hồi đã gửi.

## Changelog
- 2026-10-15 — triển khai theo yêu cầu hoàn thiện UC của người dùng và hợp đồng UC54 trong feat-school-events.
