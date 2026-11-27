# tests/integration/

Test chạy với Mongo thật. Bị bỏ qua khi không đặt `MONGO_URI`.

- `mongo-*.test.ts` — từng repository Mongo, gọi thẳng hàm repository hoặc usecase.
- `http-harness.ts` — dựng app Express thật bằng `buildApp`, nối với repository Mongo thật như `main.ts`,
  phiên và CSRF thật; chỉ kho tệp Cloudinary được thay bằng bản giả trong bộ nhớ. Mỗi file test truyền tên
  riêng, có database `ucms-<tên>-test-<pid>` và xoá nó khi `close()`.
- `http-*.test.ts` — test toàn tuyến qua HTTP (cookie phiên, header `X-CSRF-Token`, mã lỗi) dùng harness trên.
- Các file còn lại (`club-founding-e2e`, `periodic-report-*`, `dashboard-*`, `annual-report`, …) kiểm tra
  một luồng nghiệp vụ trải qua nhiều repository.
