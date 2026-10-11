# Kế hoạch Wave 4 — báo cáo sau sự kiện và tài chính

Lập ngày 2026-10-11 từ SRS §4.6–4.7, DBML, bàn giao Wave 3 và source hiện tại.
Trạng thái: kế hoạch triển khai; các đề xuất dưới đây chưa phải quyết định nghiệp vụ đã duyệt.

## Phạm vi và hiện trạng

Theo phân công hiện hành, phía CLB phụ trách UC33 và UC36. UC34/UC37 là phần phối hợp
ICPDP cần có để nghiệm thu trọn luồng; cần xác nhận người phụ trách trước khi nhận các task đó.
UC38/UC39 thuộc Wave 6.

| Phần | Đã có | Cần làm |
|---|---|---|
| UC33/UC34 | Schema `postEventReports`; điểm danh chính thức UC32; feedback riêng tư UC49; guard nghĩa vụ ở UC25 | Draft, snapshot khi nộp, version bất biến, task thẩm định, UI CLB/ICPDP và xử lý quá hạn |
| UC35 | Domain/usecase, repository, API `/admin/budgets`, UI `/workspace/budgets`, test và seed | Nối UC36/UC37, regression dòng tiền và nghiệm thu trực quan còn mở trong TASKS |
| UC36/UC37 | Schema `expenses`, `financialEvidences`, `financialReconciliations`; permission `club.expense.record` | Ghi/sửa khoản chi, chứng từ, khoá quyết toán, bổ sung/nộp lại, đối soát, thu hồi và UI |
| Deadline | Policy `reportDeadlines`, `enforceOverdueReportBlock`; UC35 đặt hạn quyết toán 14 ngày | Đồng bộ cách tính hạn ở report, dashboard, guard và huỷ/đổi lịch |
| Tích hợp | Dashboard/evaluation/export đọc các collection trên; route UC40 đã có | Giữ hợp đồng số liệu, nối phát hiện báo cáo/ngoại lệ tài chính qua usecase UC40 |

Không triển khai lại UC35. Các kết quả check/browser QA Wave 3 là dữ liệu bàn giao,
không thay cho kiểm chứng Wave 4.

## Quyết định cần chốt trước phần code phụ thuộc

| Vấn đề | Bằng chứng hiện tại | Phương án đề xuất |
|---|---|---|
| Version báo cáo | DBML unique `postEventReports.eventId`, nhưng FR-UC33-06 và BR04 cần version mới bất biến | Một document mỗi version; unique `(eventId, versionNo)`, đọc bản mới nhất rõ ràng. Cập nhật SRS/DBML, migration index và các consumer sau khi duyệt schema |
| Chứng từ | Backlog nói tái sử dụng upload; DBML `financialEvidences.externalLink` quy định liên kết ngoài cho bản phát hành này | Wave 4 dùng liên kết HTTPS + loại chứng từ; nếu chọn upload thì thêm port/adapter theo mẫu Cloudinary hiện có, thống nhất metadata và quyền tải trước khi code |
| BR25 | Chưa thấy danh mục loại chứng từ bắt buộc theo từng hạng mục trong policy code | Nhóm cung cấp bảng hạng mục → loại chứng từ hợp lệ; phân biệt “có liên kết” với “đủ chứng từ”. Chưa có bảng thì chưa chốt nghiệm thu BR25 |
| Hạn hoàn trả | BR58 yêu cầu thời hạn nhưng UC04 hiện chưa có trường tương ứng | Chốt số ngày và nơi cấu hình; chưa tự đặt giá trị mặc định |
| Hạn sau huỷ | UC35 đặt `endAt + 14 ngày`; helper huỷ giữ `settlementDueAt` cũ nếu đã tồn tại | Với ngân sách đã ứng, tính lại từ thời điểm huỷ + 14 ngày theo BR57; giữ lịch sử hạn cũ trong audit. Chốt cách xử lý Rejected/Expired sau duyệt lại và lưu mốc huỷ |
| Policy deadline | Guard UC25 đang dùng `POST_EVENT` và `dueDaysAfterPeriodEnd`; policy còn có `overdueAfterDays` | Chốt mốc nộp trễ, mốc chặn và hiệu lực policy khi đổi cấu hình; đề xuất lưu deadline/policy tại lúc phát sinh nghĩa vụ |
| Đóng sự kiện và ngân sách | UC34 đóng Event; UC37/UC35 đóng EventBudget theo BR26 | Hai vòng đời độc lập: cho đóng báo cáo khi ngân sách còn nghĩa vụ; hiển thị rõ nghĩa vụ tài chính còn lại |
| Quyết toán sau báo cáo | FR-UC36-10 chỉ ghi Completed/Cancelled; UC33/UC34 có thể chuyển Report Submitted/Closed | Đề xuất cho nộp ở Completed/Report Submitted/Closed/Cancelled nếu đã kết thúc hoặc bị huỷ; cập nhật yêu cầu trước khi hiện thực |

Thay schema cần người dùng duyệt theo `.rules/backend.md` §Chính sách AI Agent.
Plan này chỉ ghi phương án, chưa thay schema, dependency hoặc env.

## Thứ tự triển khai

### 1. Chốt hợp đồng và SPEC/TASKS

- Tạo `feat-post-event-report` (UC33/UC34) và `feat-event-finance` (UC36/UC37)
  từ `.sdd/specs/_template.md`; chia task CLB và ICPDP rõ ràng.
- Thống nhất trạng thái, permission, payload, concurrency token, lỗi, task claim/decision,
  deadline và các quyết định ở bảng trên. UC35 dùng SPEC hiện có.
- Đối chiếu index/schema và consumers dashboard/evaluation/export; ghi ADR nếu thay cách
  lưu version. Không ghi đè lịch sử các ADR đã có.

**Đầu ra:** SPEC có acceptance criteria theo FR/BR, hợp đồng API đủ để hai phía làm việc độc lập.

### 2. UC36 — khoản chi, chứng từ và quyết toán phía CLB

- Danh sách/chi tiết ngân sách cùng CLB, dòng duyệt và dòng tiền UC35; bảng khoản chi,
  tổng có/thiếu chứng từ, ngoại lệ và hạn quyết toán.
- Ghi/sửa khi Disbursed hoặc Reconciliation Pending; số nguyên VND dương, ngày hợp lệ,
  quyền `club.expense.record` kiểm tra trong usecase và tại lúc ghi.
- Khoản ngoài hạng mục hoặc vượt phần duyệt còn lại vẫn được ghi và gắn cờ; không âm thầm
  từ chối nghiệp vụ mà FR-UC36-03/07 cho phép. Tính lại cờ khi sửa, kiểm tra cạnh tranh.
- Chứng từ phải thuộc đúng expense/budget/CLB, lưu actor/thời điểm; không có bản ghi mồ côi.
- Preview quyết toán → xác nhận → Settlement Submitted: khoá bộ khoản chi/chứng từ,
  snapshot lần nộp, audit, notification và task trong cùng transaction.
- Reconciliation Pending cho bổ sung/nộp lại; giữ lịch sử từng lần nộp và quyết định.
  Chặn mọi đường sửa sau nộp/chốt, kể cả request từ màn hình cũ.
- Nhận nộp trễ, đặt `isSettlementLate`; kiểm tra lại deadline/trạng thái tại commit.

**Đầu ra:** CLB ghi chi và nộp quyết toán thật, ICPDP có đầu vào ổn định cho UC37.

### 3. UC33 — báo cáo sau sự kiện phía CLB

- Màn danh sách nghĩa vụ + Draft/chi tiết/lịch sử báo cáo; permission `club.report.submit`.
- Nạp đề xuất đã duyệt, điểm danh đã chốt (loại no-show), ngân sách/khoản chi và feedback
  đúng ngưỡng riêng tư UC49. Dưới ngưỡng không đưa điểm/nhận xét/danh tính vào snapshot.
- Nhập kết quả thực tế, sự cố, bài học và minh chứng; nguồn được đọc mới khi preview,
  đóng băng tại submit trong transaction nhất quán.
- Chỉ nộp khi Completed và attendanceFinalized; BR53 Internal không ngân sách không sinh nghĩa vụ.
- Nộp → Report Submitted + version bất biến + approval task + audit/notification;
  trả sửa → Draft mới → version mới khi nộp lại, không ghi đè bản đã nộp.
- Nhận nộp trễ và đánh dấu; báo cáo không lấy deadline cứng thay cho UC04.
- Khoá hoặc từ chối mở khoá điểm danh khi báo cáo đang thẩm định/đã đóng theo hợp đồng đã chốt;
  test đường API mở khoá để snapshot và nguồn không âm thầm lệch nhau.

**Đầu ra:** CLB nộp báo cáo có dữ liệu thật, lịch sử và deadline rõ ràng.

### 4. UC34/UC37 — phần phối hợp ICPDP

- UC34: claim task, đối chiếu kế hoạch/thực tế/điều kiện UC26; chấp nhận, trả sửa hoặc
  chấp nhận kèm phát hiện. Dữ liệu mâu thuẫn điểm danh bắt buộc trả sửa.
- Nối phát hiện qua usecase UC40, có nguồn REPORT_FINDING; không để module báo cáo tự ghi
  aggregate vi phạm. Có thao tác ghi nhận không nộp sau hạn, tránh tạo trùng.
- UC37: bảng khoản chi, accept/reject kèm lý do; thiếu chứng từ luôn loại. Yêu cầu bổ sung
  → Reconciliation Pending, đóng task cũ và nộp lại tạo task mới.
- Chốt acceptedTotal với trần approvedTotal; settlementBalance = acceptedTotal − tổng Advance
  tại lúc đối soát. Phân biệt tổng Advance với disbursedTotal có thể gồm TopUp sau tất toán.
- Chênh lệch 0 → Closed; dương → Reconciled chờ TopUp UC35; âm → Recovery Pending với
  recoveryAmount/recoveryDueAt. Hoàn một phần giữ nghĩa vụ, hoàn đủ mới Closed.
- A2 quá hạn chưa nộp: đối soát trên khoản có chứng từ, khoá dữ liệu cạnh tranh với submit;
  kiểm tra không tự chuyển Recovery Pending với số phải hoàn bằng 0 mà chưa chốt yêu cầu.
- A2/BR23: từ chối khi dòng tiền vượt số duyệt chưa có văn bản điều chỉnh; văn bản điều chỉnh
  không mở rộng thành feature mới trong wave này.

**Đầu ra:** báo cáo và ngân sách khép vòng; nhánh trả sửa, cấp bù và hoàn trả hoạt động qua UC35.

### 5. Nghĩa vụ, deadline và tích hợp

- Thống nhất truy vấn quá hạn giữa UC25, booking, dashboard và evaluation; không tạo bản sao
  số liệu dashboard. Đối chiếu cả trường hợp đã nộp nhưng bị trả sửa quá hạn.
- Nối reminder/overdue vào cơ chế job hiện có; kiểm tra idempotency và không nhân đôi
  notification/task/phát hiện. API tự kiểm tra thời gian, không phụ thuộc job chạy đúng phút.
- Regression UC28/UC15: chưa ứng → Cancelled; đã ứng → giữ khoản chi và nghĩa vụ,
  hạn theo quyết định đã chốt. Huỷ không tự giả định toàn bộ tiền ứng là số phải hoàn.
- UC40 chỉ nối nguồn/phát hiện cần cho UC34/UC37; toàn bộ vòng đời tuân thủ để Wave 6.
- Consumer báo cáo chọn đúng version; evaluation/export giữ lateFlag, acceptedTotal và
  lineage; snapshot đã nộp không đổi khi có feedback/khoản chi mới.

## Hợp đồng API/UI đề xuất

Đường dẫn dưới đây cần thống nhất trong SPEC trước khi code; đều dưới `/api/v1`.

| Luồng | API dự kiến | UI dự kiến |
|---|---|---|
| UC33 | `/clubs/:clubId/events/:eventId/reports` + draft/preview/submit/history | `/club/:clubId/event-reports` và chi tiết sự kiện |
| UC36 | `/clubs/:clubId/budgets/:budgetId` + expenses/evidences/settlement | `/club/:clubId/budgets` và chi tiết ngân sách |
| UC34 | `/admin/event-reports` + claim/decision/overdue | `/workspace/event-reports` |
| UC37 | `/admin/budgets/:id/reconciliation` + claim/return/finalize | Bổ sung trong `/workspace/budgets` hiện có |
| UC35 | Giữ `/admin/budgets/:id/flows` | Giữ màn ghi Advance/TopUp/Refund hiện có |

Service → hook → page, primitive UI hiện có, i18next en/vi; có loading/error/empty,
phân trang, xác nhận nộp/chốt và báo xung đột khi thao tác trên phiên bản cũ.

## Cổng nghiệm thu và dữ liệu demo

- Mỗi feature đủ domain/usecase/port/repository/route/OpenAPI/UI/i18n; cập nhật TASKS theo
  phần thực sự hoàn thành. Không tick nghiệm thu khi chỉ có API fixture.
- Unit test: quyền/ownership, trạng thái, deadline tại biên, version/snapshot, BR25,
  cờ ngoại lệ, ngưỡng feedback và công thức tất toán.
- Integration Mongo thật: submit kép; expense/evidence cạnh tranh submit; report cạnh tranh
  unlock; submit cạnh tranh đối soát A2; Advance cạnh tranh finalize; TopUp/Refund kép;
  rollback task/audit/notification và không tạo bản ghi mồ côi.
- `npm run check` xanh; `npm run build -w client` thành công; verify index/migration nếu đổi schema.
- Browser QA en/vi, sáng/tối, mobile/desktop, account đủ/thiếu quyền; hoàn tất mục UI đang mở
  của UC35. Phân biệt browser fixture với demo dùng API thật.
- Seed idempotent: Completed đã chốt attendance có feedback; report trả sửa/nộp trễ;
  ngân sách khớp tiền, thiếu tiền cần TopUp, dư tiền cần Refund; sự kiện huỷ đã ứng;
  khoản chi ngoài hạng mục/thiếu chứng từ; Internal không ngân sách.
- Demo báo cáo: Completed → Draft → Submitted → trả sửa → nộp lại → Closed,
  thêm nhánh phát hiện UC40 và quá hạn chặn UC25 khi policy bật.
- Demo tài chính: Approved → Advance → ghi chi/chứng từ → Settlement Submitted →
  bổ sung/nộp lại → đối soát → Closed/TopUp/Refund; thêm huỷ và chốt do quá hạn.

Wave 4 hoàn tất khi CLB nộp được báo cáo/quyết toán thật, ICPDP xử lý được các nhánh tương ứng,
snapshot/lịch sử bất biến và nghĩa vụ tồn đọng đủ để Wave 5 dùng cho chuyển giao CLB.
