# TASKS: feat-public-discovery

- [x] Domain port và use case lọc/public projection, phân trang, điều kiện trạng thái và thời gian; unit test các nhánh từ chối.
- [x] Mongo repository đọc collections DBML có sẵn; integration test đã viết, chưa chạy được với Mongo thật trong sandbox.
- [x] Route public, zod validation, OpenAPI và route contract test.
- [x] Client services/hooks, các trang public với URL mở trực tiếp, i18n en/vi, trạng thái tải/lỗi/rỗng; build và typecheck xanh.
- [x] Server public-only khi toàn bộ cấu hình Auth còn trống; cấu hình Auth một phần vẫn fail-fast.
- [ ] Chạy integration Mongo thật và kiểm tra giao diện bằng trình duyệt ở desktop/mobile, light/dark, en/vi. Sandbox hiện không kết nối được Mongo và không mở được cổng Vite.
- [ ] Hoàn tất CTA ứng tuyển/đăng ký khi UC17/UC29 được triển khai; hiện trang thông báo trạng thái chưa mở, không giả lập thao tác.
