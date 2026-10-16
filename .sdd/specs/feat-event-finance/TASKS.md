# TASKS: feat-event-finance

- [x] Đối chiếu UC35 và viết SPEC trước code.
- [x] Chốt BR25 và hạn hoàn trả BR58 (15/10/2026).
- [x] Domain + usecase + repository có tham số quy định chứng từ/hạn hoàn trả; kiểm thử bằng policy fixture.
- [x] Routes + OpenAPI.
- [x] Nối repository vào main.ts với chứng từ bắt buộc và hạn hoàn trả 7 ngày.
- [x] UI CLB/ICPDP, service/hook, i18n; browser QA dùng API fixture.
- [x] Regression hiện tại UC25/UC28/UC35 và consumer version; quy định deadline cuối còn chờ chốt.
- [x] Unit/integration tests Mongo thật.
- [x] Chạy seed demo với policy đã chốt (seed demo tạo 2 ngân sách HEBE: một Approved, một Disbursed đã tạm ứng 3.000.000).
- [x] Check/build + browser QA bằng API fixture, bàn giao tạm.
- [x] Kích hoạt API (`eventFinanceRepo` nối trong `main.ts`); màn CLB `/club/:clubId/budgets` và ICPDP `/workspace/budgets` tải được trên app chính với DB QA (15/10/2026).
- [x] Demo thật có dữ liệu ngân sách. Luồng trên trình duyệt 16/10/2026 (DB QA): CLB ghi 2 khoản chi (1 có chứng từ), nộp; ICPDP nhận, trả về; CLB nộp lại; ICPDP chốt: chấp nhận 2.500.000, từ chối 800.000 thiếu chứng từ; tạm ứng 3.000.000 nên phải hoàn 500.000, hạn hoàn 7 ngày, không cấp bù. Không lỗi console/API.
