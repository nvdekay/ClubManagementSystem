# TASKS: feat-event-defense

- [ ] 1. Schema & Migration: Bổ sung collection `eventDefenseSessions` và enum `eventDefenseState`, cập nhật `eventState` thêm `Re-defense Pending`.
- [ ] 2. Domain & Rules: Triển khai các hàm validation lịch bảo vệ, kiểm tra xung đột phòng học (gộp UC58 và các buổi bảo vệ khác), kiểm tra thời hạn (48h đặt lịch, 24h confirm, 12h deadline sửa), kiểm tra quyền thao tác.
- [ ] 3. Repository & Data Access: Triển khai các phương thức tạo lịch, khóa phòng, xác nhận, xin dời lịch, hủy lịch, bắt đầu bảo vệ, auto-save note cá nhân, kết thúc bảo vệ, ghi nhận no-show và ra quyết định sau bảo vệ.
- [ ] 4. Usecase & Route ICPDP: Triển khai các API endpoint `/admin/event-proposals/:id/defense/*` kèm phân quyền và audit logs.
- [ ] 5. Usecase & Route CLB: Triển khai các API endpoint `/clubs/:clubId/events/:id/defense/*` cho Club Leader.
- [ ] 6. Background Job: Cập nhật `event-lifecycle-job` kiểm tra hủy lịch bảo vệ khi sự kiện chuyển `Expired`.
- [ ] 7. UI CLB: Bổ sung card hiển thị thông tin lịch bảo vệ, dialog xác nhận tham gia và dialog đề xuất xin dời lịch trên `ClubEventsPage.tsx`.
- [ ] 8. UI ICPDP (Chi tiết đề xuất): Bổ sung nút "Tạo lịch bảo vệ", card thông tin lịch bảo vệ, cảnh báo quá hạn confirm, và nút "Bắt đầu bảo vệ" trên `EventProposalReviewPage.tsx`.
- [ ] 9. UI ICPDP (Live Defense Room): Xây dựng màn hình riêng `/workspace/event-proposals/:id/defense` gồm 2 cột (thông tin đề án và trình soạn thảo Note Markdown với tab cá nhân), Polling đồng bộ 3s, nút "Kết thúc bảo vệ" và 4 nút quyết định sau bảo vệ.
- [ ] 10. Automated Tests: Unit test và integration test cho toàn bộ các ca kiểm thử và edge cases.
