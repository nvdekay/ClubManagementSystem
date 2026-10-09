# TASKS: feat-public-discovery

- [x] Domain port và use case lọc/public projection, phân trang, điều kiện trạng thái và thời gian; unit test các nhánh từ chối.
- [x] Mongo repository đọc collections DBML có sẵn; integration test đã viết, chưa chạy được với Mongo thật trong sandbox.
- [x] Route public, zod validation, OpenAPI và route contract test.
- [x] Client services/hooks, các trang public với URL mở trực tiếp, i18n en/vi, trạng thái tải/lỗi/rỗng; build và typecheck xanh.
- [x] Server public-only khi toàn bộ cấu hình Auth còn trống; cấu hình Auth một phần vẫn fail-fast.
- [x] Seed idempotent từ ảnh chụp công khai pdp.fpt.edu.vn (2026-10-04): 48 CLB (19 có tên công khai, 29 giữ mã PDP vì trang CLB của PDP cần đăng nhập) và 21 sự kiện do CLB tổ chức; bỏ 5 sự kiện do IC-PDP tổ chức vì `events.clubId` bắt buộc. API `/public/clubs` trả 48 CLB, lịch sử sự kiện hiện ở trang chi tiết CLB.
- [x] Chạy integration Mongo thật (replica set `rs0`): 90/90 test xanh (2026-10-04).
- [ ] Kiểm tra giao diện bằng trình duyệt ở desktop/mobile, light/dark, en/vi.
- [ ] Dữ liệu PDP còn thiếu: tên 29 CLB, logo/ảnh bìa (schema chưa có trường ảnh), sức chứa sự kiện (PDP không công bố, đang để 0) và sự kiện sắp diễn ra (hiện chưa có).
- [ ] Hoàn tất CTA ứng tuyển/đăng ký khi UC17/UC29 được triển khai; hiện trang thông báo trạng thái chưa mở, không giả lập thao tác.
