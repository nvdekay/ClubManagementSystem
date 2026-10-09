# SPEC: feat-recruitment-applications

## Vấn đề
UC16 đã tạo campaign có form; Student cần nộp đơn gắn với campaign và theo dõi trạng thái thay
vì đi qua form rời. Mỗi Student chỉ có một application cho mỗi campaign; application được giữ
lại làm đầu vào cho UC18 và hồ sơ membership UC20.

## Hành vi
- UC06 cho mở form campaign công khai khi Club `Active` và thời điểm hiện tại nằm trong cửa sổ
  nhận đơn; campaign tương lai/đã đóng không nhận đơn.
- Student xem campaign/form, chọn một position, lưu answers và attachments ở `Draft`, sửa draft
  trong cửa sổ, submit thành `Submitted`, theo dõi danh sách/detail của mình ở Student workspace.
- Campaign form hỗ trợ `text`, `textarea`, `url`, `select`, `multiselect`, `file`; file bắt buộc
  dùng Cloudinary config đã có. Không thêm provider/dependency.
- Submit kiểm tra đúng cửa sổ, required fields/options, position có trong campaign, một application
  duy nhất/campaign, không membership `Active` ở Club và không membership `Banned` trước đó.
- Unique index hiện có là hàng rào cuối chống submit đồng thời. Không cho tạo application thứ hai
  kể cả application cũ đã `Withdrawn`.
- Student được rút `Submitted`, `Screening`, `Shortlisted` trước khi có quyết định; chuyển
  `Withdrawn`, lưu lịch sử và thông báo CLB để UC18 biết đóng mà không ra quyết định.
- File đính kèm chỉ metadata nằm trong `attachments`; asset private được tải qua endpoint có
  kiểm tra quyền sở hữu. Huỷ/rút đơn không xoá lịch sử hoặc asset âm thầm.
- Không thay đổi DBML/dependency; dùng các collection/index đã có.
- UI mở được từ CTA campaign trên trang CLB sau đăng nhập, cùng URL trực tiếp trong Student
  workspace; có trạng thái đơn, loading/error/empty và i18n/theme hiện hành.

## Tiêu chí nghiệm thu
- [ ] Campaign form công khai chỉ đọc được cho campaign đang mở thuộc Club `Active`.
- [ ] Draft tạo/sửa, submit và rút đơn tuân theo trạng thái; Student chỉ đọc/sửa đơn của mình.
- [ ] Required fields/file, select options, position, campaign window được validate server-side.
- [ ] Duplicate, Active membership, Banned membership, hết hạn và race qua unique index bị từ chối.
- [ ] Submit tạo audit/notification để CLB xem đơn; withdraw thông báo CLB; UC02 hiển thị trạng thái.
- [ ] Attachment private; unauthorized user không lấy được download URL; upload xác minh MIME,
  chữ ký tệp và giới hạn dung lượng.
- [ ] OpenAPI/route guard, unit/integration tests, `npm run check`, builds xanh.
- [ ] UI nghiệm thu trực quan desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
UC18 sàng lọc/quyết định, UC19 đánh giá, UC20 tiếp nhận thành viên; sơ đồ và đổi schema.

## Changelog
- v0.1.0 (2026-10-08) — đặc tả UC17 dựa trên UC16 và DBML hiện hành.
