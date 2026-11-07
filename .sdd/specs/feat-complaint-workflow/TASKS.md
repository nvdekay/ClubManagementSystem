# TASKS: feat-complaint-workflow

- [x] DBML `complaints`: bỏ `recipient`/`ix_complaint_inbox`/enum `feedbackRecipient`, thêm `forwardedAt`, `respondedAt`, `closure`; sinh lại schema, cập nhật guard số enum.
- [x] Domain `complaint.ts`: loại, trạng thái, quy tắc quyết định (BR39, E1 CLB giải thể), chứng cứ.
- [x] Usecase `complaint.ts`: UC50 gửi/rút, UC51 hàng đợi/quyết định, UC52 hộp thư/trả lời, job quá hạn.
- [x] Repository Mongo: transaction, task `COMPLAINT`, audit, thông báo theo audience, leo thang tạo `Violation` liên kết hai chiều, khiếu nại trùng, cập nhật có điều kiện.
- [x] Route + OpenAPI; gỡ `/student-feedback*`; nối `server.ts`/`main.ts`; job `complaint-response-job`.
- [x] Thông báo: mã theo audience (`COMPLAINT_SUBMITTED|CLUB_RESPONDED|RESPONSE_OVERDUE` → ICPDP, `COMPLAINT_FORWARDED` → CLB, `COMPLAINT_TRIAGED|CLOSED|ESCALATED` → sinh viên).
- [x] Unit + integration test (AC19, D5, trùng, rút, đua, quá hạn); test xuất dữ liệu cho bản ghi cũ.
- [x] Client: `ComplaintsPage`, `ComplaintReviewPage`, `ClubComplaintsPage`, `ComplaintCard`, service/hook, i18n en/vi, menu.
- [x] Tài liệu: CURRENT_IMPLEMENTATION, UC_CODE_MAPPING, CODE_DIAGRAM_GAPS, HLD, SRS (D5, SEC-09, FR-UC52-01), README.
- [x] `npm run check` xanh.
