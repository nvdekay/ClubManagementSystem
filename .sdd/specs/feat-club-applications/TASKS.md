# TASKS: feat-club-applications

- [x] Đối chiếu UC07, BR02/03/04/55/56, DBML và mockup; ghi SPEC trước khi code.
- [x] Domain validator hồ sơ nộp và use case đọc yêu cầu từ policy hiệu lực; unit test các nhánh từ chối cơ bản.
- [x] Thêm `draftPayload` vào DBML/schema theo chấp thuận; tạo port Cloudinary và biến trống trong `.env.example` theo B6.
- [x] Mongo repository và use case tạo/sửa/nộp/nộp lại/rút với version bất biến, owner check, review task, audit và thông báo; Mongo integration test đã viết.
- [x] HTTP route, Zod, OpenAPI, auth/CSRF, preview trùng tên và giới hạn tệp; unit test use case và route contract.
- [x] Client Student form/trạng thái, service/hook, i18n en/vi và layout responsive; production build xanh.
- [ ] Khi UC05 sẵn sàng, thay tuyến ICPDP một cấp tạm thời bằng routing snapshot theo chính sách định tuyến và gửi thông báo tới reviewer được phân công.
- [ ] Bổ sung bù/xoá Cloudinary asset mồ côi và chính sách retention khi upload thành công nhưng ghi metadata Mongo lỗi.
- [ ] `npm run check` với Mongo replica set thật; kiểm tra trực quan và Cloudinary upload/download với credentials thật. Lần chạy cục bộ mới nhất: `MONGO_URI= npm run check` xanh (80 unit test pass, 10 integration test bỏ qua).
