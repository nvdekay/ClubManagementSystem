# 01 — Phân tích nghiệp vụ

Bản phân tích nghiệp vụ và hệ thống gốc: vấn đề, các bên liên quan, actor, phạm vi, module,
luồng nghiệp vụ, user story, tiêu chí nghiệm thu, domain model, mô hình đánh giá, dashboard,
thông báo, audit và các feature nổi bật.

| File | Là gì |
|---|---|
| [`UCMS_Business_System_Analysis.md`](UCMS_Business_System_Analysis.md) | Bản phân tích đầy đủ. Bản song ngữ tiếng Anh đã bị xoá ở commit `56cdd4f` |

**Trạng thái.** §1–§7, §12–§13, §16–§20 và §23–§24 vẫn là phần nền còn hiệu lực.
§8–§11, §14–§15 và §21–§22 (57 use case, đánh số `UC01–UC57`, `BR01–BR39`) **đã bị thay thế**
bởi [`../02-use-cases/`](../02-use-cases/) và [`../SRS.md`](../SRS.md). Khi hai bên nói khác
nhau, lấy theo SRS. Không xoá gì cả, để một quyết định luôn truy ngược được về mô hình mà nó
được đưa ra.

**Các điểm đã lỗi thời ngay trong phần còn hiệu lực** (đối chiếu code 02/11/2026; lấy theo SRS):
- Email "gửi qua Google SMTP" (§5, §19) — đã đúng từ 07/11/2026: email gửi qua Google SMTP khi đủ cấu hình
  (bắt buộc ở production); môi trường phát triển không cấu hình SMTP thì chỉ ghi log.
- CLB mới vào `Pending Setup` — nay UC08 tạo CLB `Active` với ban chủ nhiệm sáng lập đã xác nhận,
  không còn quyền sáng lập tạm thời.
- Domain email được phép là giá trị chính sách — nay lấy từ biến môi trường `ALLOWED_DOMAIN`.
