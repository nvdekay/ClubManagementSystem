# Tài liệu

Phân tích nghiệp vụ và thiết kế cho Hệ thống Quản lý Câu lạc bộ Đại học (UCMS).
Quy tắc viết code nằm ở [`../.rules/`](../.rules/README.md) — thư mục này giữ phần *cái gì*,
không giữ phần *làm thế nào*.

## Bắt đầu từ đây

**[`SRS.md`](SRS.md) — Đặc tả yêu cầu phần mềm.** Một baseline hợp nhất duy nhất: phạm vi,
actor, toàn bộ 54 use case dưới dạng yêu cầu chức năng được đánh số, 45 quy tắc nghiệp vụ, 11
vòng đời thực thể, mô hình dữ liệu, thiết kế xuyên suốt cho workflow / thông báo / audit, mô
hình đánh giá, dashboard, yêu cầu phi chức năng và bảo mật, tiêu chí nghiệm thu và các ma trận
truy vết. Thiết kế, code, test và review đều trỏ về nó. Khi SRS và một tài liệu nguồn nói khác
nhau về một yêu cầu, **lấy theo SRS**.

## Bản đồ thư mục

| Thư mục | Bên trong có gì | Đọc khi nào |
|---|---|---|
| [`01-business-analysis/`](01-business-analysis/) | Bản phân tích nghiệp vụ và hệ thống gốc: vấn đề, các bên liên quan, luồng nghiệp vụ, user story, domain model, mô hình đánh giá, các feature nổi bật | Bạn cần hiểu *vì sao* có một yêu cầu, hoặc cần phần nền mà SRS đã tóm tắt lại |
| [`02-use-cases/`](02-use-cases/) | Use case model v2 và đặc tả chi tiết **hiện hành** của cả 54 use case, bản xuất Word, và nhật ký review I01–I30 | Bạn cần bản kể đầy đủ của một use case, bảng ánh xạ v1 → v2, hoặc lịch sử của một lần sửa |
| [`03-diagrams/`](03-diagrams/) | Nguồn draw.io và bản xuất PNG: context diagram v1 và v2, use case diagram theo actor, state diagram | Bạn cần một sơ đồ, hoặc bạn đang sửa sơ đồ |
| [`04-design/`](04-design/) | Thiết kế mức cao và bộ quy tắc giao diện | Bạn chuẩn bị viết code hoặc dựng một màn hình |
| [`05-implementation/`](05-implementation/) | Danh sách công việc triển khai (database, backend, frontend) và thiết kế cơ sở dữ liệu dạng DBML cho dbdiagram.io | Bạn đang lập kế hoạch sprint, hoặc cần thiết kế collection, index, enum trạng thái |

## Thứ tự đọc cho người mới

1. [`SRS.md`](SRS.md) §1–§2 — sản phẩm là gì, ai dùng, cái gì nằm ngoài phạm vi.
2. [`03-diagrams/img/UCMS_Context_Diagram_v2_01_Context-diagram-v2.png`](03-diagrams/img/UCMS_Context_Diagram_v2_01_Context-diagram-v2.png) — biên hệ thống trong một hình.
3. [`SRS.md`](SRS.md) §4 — use case bạn sắp làm, rồi §5 và §6 cho quy tắc và trạng thái của nó.
4. [`04-design/UCMS_High_Level_Design.md`](04-design/UCMS_High_Level_Design.md) — code đặt ở đâu.
5. [`05-implementation/TASKS.md`](05-implementation/TASKS.md) — xây cái gì, theo thứ tự nào, cái gì đang bị chặn.
6. [`../.rules/README.md`](../.rules/README.md) — code phải trông như thế nào. Definition of Done: `npm run check` xanh.

## Quy ước

- **Tài liệu viết bằng tiếng Việt**; code, comment, commit, config, thông báo lỗi và test viết
  bằng tiếng Anh — xem [`../.rules/README.md`](../.rules/README.md) §5. Các định danh kỹ thuật
  (mã UC/FR/BR, tên trạng thái, tên collection và trường, đường dẫn, endpoint) giữ nguyên tiếng
  Anh vì chúng xuất hiện nguyên văn trong code.
- Một use case được định danh bằng số **v2** (UC01–UC54) ở mọi nơi trừ bên trong tài liệu v1.
  Dùng §5 của use case model để chuyển đổi giữa v1 và v2.
- Quy tắc nghiệp vụ dùng chung một dãy số trên mọi tài liệu: **BR01–BR46**, trong đó BR43 đã
  được rút. Danh sách hợp nhất, đã áp dụng mọi sửa đổi, nằm ở `SRS.md` §5.
- Không xoá gì cả. Tài liệu đã bị thay thế vẫn để đọc được, để một quyết định luôn truy ngược
  được về mô hình mà nó được đưa ra; khi v1 và v2 nói khác nhau, **lấy theo v2**.
- Sơ đồ sửa ở dạng `.drawio` rồi xuất lại PNG vào `03-diagrams/img/` trong cùng một commit.
