# Công việc: feat-periodic-report-evidence-upload

- [x] Spec + task.
- [x] Server: port lưu ảnh minh chứng ở domain, adapter Cloudinary, usecase upload (quyền, MIME,
      magic bytes, giới hạn 5 MiB), route raw sau `authGuard`, OpenAPI, stub trong `openapi.test.ts`, nối ở `main.ts`.
- [x] Server: báo cáo lưu tham chiếu thay cho `data:` URL, đọc báo cáo trả `evidenceUrls` (CLB + ICPDP), siết zod.
- [x] Server: hạ parser JSON toàn cục xuống `100kb`, parser riêng sau `authGuard` cho route cần body lớn.
- [x] Client: trình soạn upload ảnh lên endpoint mới (đang tải/lỗi, en/vi), trang ICPDP hiển thị ảnh qua signed URL.
- [x] `npm run check` + `npm run build --workspaces` xanh.
