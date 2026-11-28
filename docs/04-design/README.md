# 04 — Thiết kế

Ánh xạ từ use case sang code hiện hành: [`../current-implementation.md`](../current-implementation.md).

Hệ thống có hình dạng thế nào, và giao diện phải trông ra sao. Những tài liệu này trả lời câu
hỏi *làm thế nào*; phần yêu cầu mà chúng hiện thực nằm ở [`../srs.md`](../srs.md).

| File | Là gì |
|---|---|
| [`high-level-design.md`](high-level-design.md) | Các container, bản đồ module → code, workflow phê duyệt, hàng đợi thông báo, audit, định danh và phân quyền, thiết kế dữ liệu MongoDB, bề mặt API, cấu trúc client, triển khai và các thuộc tính chất lượng |
| [`design-guidelines.md`](design-guidelines.md) | Quy tắc thị giác và giao diện cho client: token màu thương hiệu và ngữ nghĩa, typography, khoảng cách, bo góc, đổ bóng, công thức component, chuyển động, icon, checklist tiếp cận trước khi mở PR, và các anti-pattern |

Quy tắc kỹ thuật (code đặt ở đâu và phải viết thế nào) **không** nằm ở đây — chúng ở
[`../../.rules/`](../../.rules/README.md), còn các quyết định đã chốt ở
[`../../.sdd/rfcs/`](../../.sdd/rfcs/).
