# TASKS: feat-club-applications

- [x] Đối chiếu UC07, BR02/03/04/55/56, DBML và mockup; ghi SPEC trước khi code.
- [x] Domain validator hồ sơ nộp và use case đọc yêu cầu từ policy hiệu lực; unit test các nhánh từ chối cơ bản.
- [x] Thêm `draftPayload` vào DBML/schema theo chấp thuận; tạo port Cloudinary và biến trống trong `.env.example` theo B6.
- [x] Mongo repository và use case tạo/sửa/nộp/nộp lại/rút với version bất biến, owner check, review task, audit và thông báo; Mongo integration test đã viết.
- [x] HTTP route, Zod, OpenAPI, auth/CSRF, preview trùng tên và giới hạn tệp; unit test use case và route contract.
- [x] Client Student form/trạng thái, service/hook, i18n en/vi và layout responsive; production build xanh.
- [x] Giữ đúng một review task cho mỗi lần nộp; không thêm routing snapshot vì UC05 đã rút và BR16 chỉ cho một quyết định ICPDP.
- [ ] Bổ sung bù/xoá Cloudinary asset mồ côi và chính sách retention khi upload thành công nhưng ghi metadata Mongo lỗi.
- [x] `npm run check` với Mongo replica set thật (`rs0` một node): 90/90 test xanh, gồm 10 integration test (2026-10-04). Test repository được sửa để kiểm đúng hậu điều kiện: nộp lại đóng review task cũ và mở đúng một task `Open` mới.
- [x] Thêm thành viên sáng lập bằng email đăng nhập (`GET /applications/founder-lookup`, khớp chính xác, chỉ tài khoản Active) và hiển thị tên/email thay cho ID; sinh viên thấy lý do, phần cần sửa và hạn chỉnh sửa khi ICPDP yêu cầu sửa hoặc từ chối, không lộ ghi chú nội bộ (2026-10-09).
- [ ] Kiểm tra trực quan và Cloudinary upload/download với credentials thật.
