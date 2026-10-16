# Tài liệu

Phân tích nghiệp vụ và thiết kế cho Hệ thống Quản lý Câu lạc bộ Đại học (UCMS).
Quy tắc viết code nằm ở [`../.rules/`](../.rules/README.md) — thư mục này giữ phần *cái gì*,
không giữ phần *làm thế nào*.

## Bắt đầu từ đây

Tiếp tục công việc ở session mới: đọc [bàn giao 15/10/2026](05-implementation/SESSION_HANDOFF_2026-10-15.md)
trước khi sửa hoặc commit các thay đổi tài liệu đang có.

**[`CURRENT_IMPLEMENTATION.md`](CURRENT_IMPLEMENTATION.md) — ánh xạ code hiện tại.** Đọc file
này trước khi hỏi chức năng nào đã có, actor nào được phép làm gì, hoặc còn thiếu UC nào.

**[`SRS.md`](SRS.md) — Đặc tả yêu cầu phần mềm.** Một baseline hợp nhất duy nhất: phạm vi,
actor, 56 mã UC (52 trong phạm vi; UC05, UC23, UC51, UC52 đã rút) dưới dạng yêu cầu chức năng được đánh số, danh mục quy tắc nghiệp vụ và
vòng đời thực thể, mô hình dữ liệu, thiết kế xuyên suốt cho workflow / thông báo / audit, mô
hình đánh giá, dashboard, yêu cầu phi chức năng và bảo mật, tiêu chí nghiệm thu và các ma trận
truy vết. Thiết kế, code, test và review đều trỏ về nó. Khi SRS và một tài liệu nguồn nói khác
nhau về một yêu cầu, **lấy theo SRS**.

Bản Word sử dụng hiện tại: [Group1_SE1939-NJ_Report_Final_v2.docx](Group1_SE1939-NJ_Report_Final_v2.docx).
Các DOCX report, đặc tả và sơ đồ cũ đã được xoá theo yêu cầu; nguồn Markdown, draw.io và PNG
vẫn được giữ để chỉnh sửa và đối chiếu. Bản Word tổng hợp sơ đồ theo actor hiện hành:
[UCMS_UseCase_ByActor.docx](UCMS_UseCase_ByActor.docx).

## Bản đồ thư mục

| Thư mục | Bên trong có gì | Đọc khi nào |
|---|---|---|
| [`01-business-analysis/`](01-business-analysis/) | Bản phân tích nghiệp vụ và hệ thống gốc: vấn đề, các bên liên quan, luồng nghiệp vụ, user story, domain model, mô hình đánh giá, các feature nổi bật | Bạn cần hiểu *vì sao* có một yêu cầu, hoặc cần phần nền mà SRS đã tóm tắt lại |
| [`02-use-cases/`](02-use-cases/) | Use case model v2, đặc tả chi tiết và nhật ký review; UC23/RBAC động là lịch sử đã bị mô hình hai role cố định thay thế | Bạn cần bản kể đầy đủ của một use case hoặc lịch sử của một lần sửa |
| [`03-diagrams/`](03-diagrams/) | Nguồn draw.io và bản xuất PNG: context diagram v1, v2 và v2.1 (hiện hành), use case diagram theo actor, state diagram, ERD, package diagram, screen flow, swimlane các luồng nghiệp vụ chính (main workflow) | Bạn cần một sơ đồ, hoặc bạn đang sửa sơ đồ |
| [`04-design/`](04-design/) | Thiết kế mức cao và bộ quy tắc giao diện | Bạn chuẩn bị viết code hoặc dựng một màn hình |
| [`05-implementation/`](05-implementation/) | Danh sách công việc triển khai (database, backend, frontend) và thiết kế cơ sở dữ liệu dạng DBML cho dbdiagram.io | Bạn đang lập kế hoạch sprint, hoặc cần thiết kế collection, index, enum trạng thái |
| [`06-user-guide/`](06-user-guide/) | Guide book PDF/HTML/Markdown và ảnh chụp các luồng chính với dữ liệu đã seed | Bạn cần hướng dẫn thao tác theo vai trò hoặc chuẩn bị demo app |

## Thứ tự đọc cho người mới

1. [`CURRENT_IMPLEMENTATION.md`](CURRENT_IMPLEMENTATION.md) — code đã có gì và còn thiếu gì.
2. [`SRS.md`](SRS.md) §1–§2 — sản phẩm là gì, ai dùng, cái gì nằm ngoài phạm vi.
3. [`03-diagrams/img/UCMS_Context_Diagram_v2.1_01_Context-diagram-v2.1.png`](03-diagrams/img/UCMS_Context_Diagram_v2.1_01_Context-diagram-v2.1.png) — biên hệ thống trong một hình.
4. [`SRS.md`](SRS.md) §4 — use case bạn sắp làm, rồi §5 và §6 cho quy tắc và trạng thái của nó.
5. [`04-design/UCMS_High_Level_Design.md`](04-design/UCMS_High_Level_Design.md) — code đặt ở đâu.
6. [`05-implementation/TASKS.md`](05-implementation/TASKS.md) — lịch sử phân rã; trạng thái hiện hành lấy từ `CURRENT_IMPLEMENTATION.md` và SPEC/TASKS của feature.
7. [`../.rules/README.md`](../.rules/README.md) — code phải trông như thế nào. Definition of Done: `npm run check` xanh.

Use case diagram chuẩn là [`03-diagrams/UCMS_UseCase_ByActor.drawio`](03-diagrams/UCMS_UseCase_ByActor.drawio)
và chín ảnh `03-diagrams/img/UCMS_UseCase_ByActor_*.png`. Các hình use case trong report v2
dùng bộ ảnh này. [UCMS_UseCase_ByActor.docx](UCMS_UseCase_ByActor.docx) tổng hợp đủ chín ảnh
hiện hành, mỗi ảnh một trang; cần xuất lại bản Word khi cập nhật bộ ảnh nguồn.

## Quy ước

- **Tài liệu viết bằng tiếng Việt**; code, comment, commit, config, thông báo lỗi và test viết
  bằng tiếng Anh — xem [`../.rules/README.md`](../.rules/README.md) §5. Các định danh kỹ thuật
  (mã UC/FR/BR, tên trạng thái, tên collection và trường, đường dẫn, endpoint) giữ nguyên tiếng
  Anh vì chúng xuất hiện nguyên văn trong code.
- Một use case được định danh bằng số **v2** (UC01–UC55) ở mọi nơi trừ bên trong tài liệu v1.
  Dùng §5 của use case model để chuyển đổi giữa v1 và v2.
- Quy tắc nghiệp vụ dùng chung một dãy số trên mọi tài liệu: **BR01–BR61** (60 quy tắc còn hiệu lực), trong đó BR43 đã
  được rút. Danh sách hợp nhất, đã áp dụng mọi sửa đổi, nằm ở `SRS.md` §5.
- Tài liệu nguồn đã bị thay thế được giữ làm lịch sử; các DOCX cũ đã được xoá theo yêu cầu,
  chỉ dùng report v2. Khi v1 và v2 nói khác nhau, **lấy theo v2**.
- Sơ đồ sửa ở dạng `.drawio` rồi xuất lại PNG vào `03-diagrams/img/` trong cùng một commit.
