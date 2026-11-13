# Tài liệu

Phân tích nghiệp vụ và thiết kế cho Hệ thống Quản lý Câu lạc bộ Đại học (UCMS).
Quy tắc viết code nằm ở [`../.rules/`](../.rules/README.md) — thư mục này giữ phần *cái gì*,
không giữ phần *làm thế nào*.

## Bắt đầu từ đây

Tiếp tục công việc ở session mới: đọc [`CURRENT_IMPLEMENTATION.md`](CURRENT_IMPLEMENTATION.md)
trước khi sửa code hoặc tài liệu.

**[`CURRENT_IMPLEMENTATION.md`](CURRENT_IMPLEMENTATION.md) — ánh xạ code hiện tại.** Đọc file
này trước khi hỏi chức năng nào đã có, actor nào được phép làm gì, hoặc còn thiếu UC nào.

**[`SRS.md`](SRS.md) — Đặc tả yêu cầu phần mềm.** Một baseline hợp nhất duy nhất: phạm vi,
actor, 56 mã use case, 55 trong phạm vi (UC05, UC51, UC52 được khôi phục; UC23 bị rút vì role CLB
cố định) dưới dạng yêu cầu chức năng được đánh số, danh mục quy tắc nghiệp vụ và
vòng đời thực thể, mô hình dữ liệu, thiết kế xuyên suốt cho workflow / thông báo / audit, mô
hình đánh giá, dashboard, yêu cầu phi chức năng và bảo mật, tiêu chí nghiệm thu và các ma trận
truy vết. Thiết kế, code, test và review đều trỏ về nó. Khi SRS và một tài liệu nguồn nói khác
nhau về một yêu cầu, **lấy theo SRS**.

**Report final hiện hành:** báo cáo Google Doc của nhóm (bản final, 13–14/11/2026), dùng bộ sơ đồ
trong `03-diagrams/img/`. Các bản `.docx` cũ trong repo (`Group1_SE1939-NJ_Report_Final.docx` dựng 19/10/2026 và
`03-diagrams/UCMS_Diagrams.docx`) đã lỗi thời nên được xoá ngày 14/11/2026; `v2.docx`, DOCX đặc tả, các file
thuyết trình và review rời đã được xoá từ 19/10/2026. Nguồn Markdown, draw.io và PNG vẫn được giữ để chỉnh sửa và
đối chiếu.

## Bản đồ thư mục

| Thư mục | Bên trong có gì | Đọc khi nào |
|---|---|---|
| [`01-business-analysis/`](01-business-analysis/) | Bản phân tích nghiệp vụ và hệ thống gốc: vấn đề, các bên liên quan, luồng nghiệp vụ, user story, domain model, mô hình đánh giá, các feature nổi bật | Bạn cần hiểu *vì sao* có một yêu cầu, hoặc cần phần nền mà SRS đã tóm tắt lại |
| [`02-use-cases/`](02-use-cases/) | Use case model v2, đặc tả chi tiết và nhật ký review — bản lịch sử, đã được `SRS.md` thay thế (UC23 đã rút, phê duyệt một cấp) | Bạn cần bản kể đầy đủ của một use case hoặc lịch sử của một lần sửa |
| [`03-diagrams/`](03-diagrams/) | Nguồn draw.io và bản xuất PNG: context diagram hiện hành [`UCMS_Context_Diagram.drawio`](03-diagrams/UCMS_Context_Diagram.drawio) (ảnh v1, v2, v2.1 là lịch sử), use case diagram theo actor, state diagram, ERD, package diagram, screen flow, swimlane các luồng nghiệp vụ chính (main workflow) | Bạn cần một sơ đồ, hoặc bạn đang sửa sơ đồ |
| [`04-design/`](04-design/) | Thiết kế mức cao và bộ quy tắc giao diện | Bạn chuẩn bị viết code hoặc dựng một màn hình |
| [`05-implementation/`](05-implementation/) | Ma trận UC → code, các chỗ code lệch sơ đồ, thiết lập Auth/SMTP và thiết kế cơ sở dữ liệu dạng DBML (54 bảng) cho dbdiagram.io | Bạn đang lập kế hoạch sprint, hoặc cần thiết kế collection, index, enum trạng thái |
| [`06-user-guide/`](06-user-guide/) | Guide book PDF/HTML/Markdown và ảnh chụp các luồng chính với dữ liệu đã seed (ảnh chụp trước đợt làm lại giao diện 11/2026) | Bạn cần hướng dẫn thao tác theo vai trò hoặc chuẩn bị demo app |
| [`07-demo-videos/`](07-demo-videos/) | 18 video demo các luồng nghiệp vụ chính | Bạn chuẩn bị demo hoặc cần xem một luồng chạy thật |

## Thứ tự đọc cho người mới

1. [`CURRENT_IMPLEMENTATION.md`](CURRENT_IMPLEMENTATION.md) — code đã có gì và còn thiếu gì.
2. [`SRS.md`](SRS.md) §1–§2 — sản phẩm là gì, ai dùng, cái gì nằm ngoài phạm vi.
3. [`03-diagrams/img/UCMS_Context_Diagram_01_Context-diagram.png`](03-diagrams/img/UCMS_Context_Diagram_01_Context-diagram.png) — biên hệ thống trong một hình.
4. [`SRS.md`](SRS.md) §4 — use case bạn sắp làm, rồi §5 và §6 cho quy tắc và trạng thái của nó.
5. [`04-design/UCMS_High_Level_Design.md`](04-design/UCMS_High_Level_Design.md) — code đặt ở đâu.
6. [`../.rules/README.md`](../.rules/README.md) — code phải trông như thế nào. Definition of Done: `npm run check` xanh.

Use case diagram [`03-diagrams/UCMS_UseCase_ByActor.drawio`](03-diagrams/UCMS_UseCase_ByActor.drawio)
đã bỏ các oval CRUD role của UC23 và xuất lại ảnh ngày 13/11/2026, khớp quyết định role cố định trong
`UCMS_Organization_and_Flows.drawio` và SRS hiện hành.

## Quy ước

- **Tài liệu viết bằng tiếng Việt**; code, comment, commit, config, thông báo lỗi và test viết
  bằng tiếng Anh — xem [`../.rules/README.md`](../.rules/README.md) §5. Các định danh kỹ thuật
  (mã UC/FR/BR, tên trạng thái, tên collection và trường, đường dẫn, endpoint) giữ nguyên tiếng
  Anh vì chúng xuất hiện nguyên văn trong code.
- Một use case được định danh bằng số **v2** (UC01–UC55, UC58) ở mọi nơi trừ bên trong tài liệu v1.
  Dùng §5 của use case model để chuyển đổi giữa v1 và v2.
- Quy tắc nghiệp vụ dùng chung một dãy số trên mọi tài liệu: **BR01–BR63** (62 quy tắc còn hiệu lực), trong đó BR43 đã
  được rút. Danh sách hợp nhất, đã áp dụng mọi sửa đổi, nằm ở `SRS.md` §5.
- Tài liệu nguồn đã bị thay thế được giữ làm lịch sử; các DOCX cũ đã được xoá theo yêu cầu.
  Khi v1 và v2 nói khác nhau, **lấy theo v2**.
- Sơ đồ sửa ở dạng `.drawio` rồi xuất lại PNG vào `03-diagrams/img/` trong cùng một commit.
