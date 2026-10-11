# Bàn giao tạm Wave 4 — báo cáo và tài chính

Cập nhật 2026-10-11. Wave 4 **chưa hoàn tất**: BR25 và thời hạn BR58 đang chờ người dùng chốt.
Kế hoạch: [WAVE_4_REPORTS_FINANCE_PLAN.md](WAVE_4_REPORTS_FINANCE_PLAN.md).

## Phần đã viết và kiểm chứng

- UC33/UC34: domain/usecase, repository transaction, Draft/nộp/nộp lại, snapshot, claim/decision,
  nhận nộp trễ, ghi nhận không nộp; API/OpenAPI và UI CLB/ICPDP en/vi.
- Unique báo cáo chuyển sang `(eventId, versionNo)`. Migration tạo index mới trước khi bỏ index
  legacy; không xoá document. Version đã nộp giữ nguyên nội dung/snapshot; quyết định chỉ đổi
  metadata. ADR-005 ghi lý do. Server startup/db:init áp dụng migration.
- UC36/UC37: domain/usecase, repository có tham số policy, khoản chi/chứng từ, submit/return,
  đối soát 0/dương/âm, A2 quá hạn; API/OpenAPI và UI đã viết. **Chưa nối eventFinanceRepo vào
  main.ts**, nên API finance mới chưa hoạt động ở server thật; kiểm chứng repository dùng
  policy fixture, giao diện dùng API fixture.
- UC35: kiểm tra lại vai trò/account trong transaction, tăng revision khi ghi dòng tiền,
  cập nhật thời điểm đóng reconciliation khi cấp bù/hoàn đủ.
- Deadline báo cáo lấy policy tại endAt và giữ deadline/policy trong snapshot version đầu.
  Các consumer nghĩa vụ/dashboard/booking dùng cùng helper; evaluation chọn version mới nhất.
- Huỷ ngân sách đã ứng tính hạn quyết toán từ mốc huỷ + 14 ngày; audit giữ hạn cũ.
- Nhắc hạn báo cáo/quyết toán/hoàn trả dùng job mỗi giờ, idempotent theo entity/deadline/action.
  Quá hạn không tự tạo quyết định/đối soát hoặc hồ sơ vi phạm.
- Không mở khoá attendance khi đã có báo cáo Submitted/Accepted/Returned for correction.
- Phát hiện UC34: officer mở hồ sơ qua usecase UC40 hiện có, chọn mức độ, rồi chấp nhận báo cáo
  kèm liên kết hồ sơ; server kiểm tra nguồn REPORT_FINDING/cùng event/CLB. Hai thao tác này
  chưa được gộp thành một transaction xuyên module. UI UC37 có lối mở FINANCIAL_EXCEPTION
  khi khoản hoàn trả quá hạn.

## Đường dẫn

| Phía | UI | API dưới `/api/v1` |
|---|---|---|
| CLB báo cáo | `/club/:clubId/event-reports` | `/clubs/:clubId/event-reports[/:eventId[/actions]]` |
| ICPDP báo cáo | `/workspace/event-reports` | `/admin/event-reports[/:eventId[/actions]]` |
| CLB tài chính (chờ bật API) | `/club/:clubId/budgets` | `/clubs/:clubId/budgets[/:budgetId[/actions]]` |
| ICPDP đối soát (chờ bật API) | `/workspace/budgets/:id/reconciliation` | `/admin/budgets/:id/reconciliation[/actions]` |

Mọi action có `revision` để từ chối thao tác từ màn hình cũ; quyền kiểm tra tại usecase và commit.
Báo cáo cần `club.report.submit`, khoản chi cần `club.expense.record`, ICPDP cần system role.

## Kiểm chứng

- `npm run check`: constitution/lint/typecheck và **425 test / 87 file xanh**, gồm Mongo thật.
- `npm run build -w client`: thành công; cảnh báo chunk lớn hiện có vẫn còn.
- Test mới: domain/access, OpenAPI và 7 integration Mongo cho submit kép, correction,
  reconciliation/TopUp/Refund, A2 cạnh tranh submit, version/privacy, nguồn finding, reminder,
  permission/ownership và snapshot mâu thuẫn.
- Browser QA bằng Playwright/Chrome và API fixture: en/vi, sáng/tối, 390/1440 px; báo cáo CLB,
  báo cáo ICPDP, khoản chi CLB (gồm dialog), đối soát ICPDP. Chưa nghiệm thu bằng Google OAuth
  và production API thật; chưa hoàn tất mục UI UC35 đang mở.
- Helper `seed-wave4.ts` đã viết; chưa chạy seed. Nếu policy thiếu POST_EVENT thì bỏ qua có
  thông báo. Seed không sửa policy hiện hành; mặc định POST_EVENT 7 ngày chỉ thuộc bộ policy
  mẫu khi khởi tạo database demo mới. Link `example.org/demo-receipt` là placeholder demo,
  không dùng làm minh chứng nghiệm thu chứng từ thật.

## Phần còn lại sau khi chốt nghiệp vụ

1. BR25: người dùng xác nhận tập chứng từ tối thiểu theo hạng mục; đề xuất ít nhất một link
   HTTPS loại INVOICE/RECEIPT/PROOF_OF_PAYMENT cho mỗi khoản chi.
2. BR58: xác nhận số ngày hoàn trả; đề xuất 14 ngày kể từ lúc chốt đối soát.
3. Nối `mongoEventFinanceRepository` vào main với policy đã chốt; truyền repo vào seedWave4,
   chạy seed idempotent và kiểm chứng hai lần. Không seed trước khi bật repo để tránh tạo
   fixture tài chính thiếu khoản chi rồi bỏ qua ở lần seed sau.
4. Hoàn thiện các quy định deadline còn mở trong plan, nghiệp vụ BR25, consumer và nhánh finding
   nếu nhóm yêu cầu một thao tác nguyên tử; cập nhật SPEC/TASKS/SRS theo quyết định cuối.
5. Demo API thật trọn UC33–UC37, UI UC35 và cập nhật trạng thái nghiệm thu. Chưa tick Wave 4 hoàn tất.
