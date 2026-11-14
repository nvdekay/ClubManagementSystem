# TASKS: feat-event-proposal-document

- [x] Đối chiếu plan với code, tạo SPEC (ghi các điều chỉnh so với plan).
- [x] DBML: cập nhật ghi chú `eventProposalVersions.payload` (không đổi số bảng/enum; generator không đọc note nên không cần sinh lại).
- [x] Domain: `EventProposalDocument`, `EventProposalFileStorage`, `validateEventProposalFile`, `assertProposalDocumentPresent`, ẩn `assetId`.
- [x] Usecase: thông tin/tải template, upload/truy cập file đề án (CLB), upload template + truy cập file theo revision (ICPDP).
- [x] Infra: adapter Cloudinary, template mặc định đọc từ đĩa, action `attach-document`, giữ file khi `save`, chặn `submit`, đóng băng khi `submit`/`reschedule`, template trong `auditLogs`.
- [x] Route, OpenAPI, stub trong `openapi.test.ts`, nối dây `main.ts`.
- [x] Seed demo: đề xuất mẫu có `proposalDocument`; đề xuất Wave 3 gắn file trước khi nộp.
- [x] Unit test + integration test 7 bước; sửa test cũ để gắn file trước khi nộp.
- [x] Client: khu vực template + upload trên `ClubEventProposalPage`, tải file ở `ClubEventsPage`, thẻ template ở `EventProposalQueuePage`, file theo revision ở `EventProposalReviewPage`, i18n.
- [x] Tài liệu `docs/` và sơ đồ `.drawio` (Phần 1 của plan).
- [x] `npm run check` và `npm run build --workspaces` toàn repo.
