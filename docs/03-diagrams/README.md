# 03 — Sơ đồ

Nguồn draw.io kèm bản xuất PNG. Mở file `.drawio` bằng draw.io / diagrams.net hoặc extension
tương ứng của VS Code.

| File | Thể hiện điều gì |
|---|---|
| [`UCMS_Context_Diagram_v2.drawio`](UCMS_Context_Diagram_v2.drawio) | **Context diagram hiện hành** — biên hệ thống và 55 luồng dữ liệu giữa UCMS, 3 actor và 2 hệ thống ngoài. Mỗi luồng được ánh xạ tới use case ở `../SRS.md` §14.4 |
| [`UCMS_UseCase_ByActor.drawio`](UCMS_UseCase_ByActor.drawio) | **Use case diagram hiện hành**, phủ UC01–UC54 — mỗi trang một nhóm actor: All users, Student, CMB 1–4, ICPDP 1–3 |
| [`UCMS_State_Diagrams.drawio`](UCMS_State_Diagrams.drawio) | **Máy trạng thái hiện hành** — Club Application, Club, Membership, Recruitment Campaign, Recruitment Application, Event, Budget Request, Property Booking |
| [`UCMS_Context_Diagram.drawio`](UCMS_Context_Diagram.drawio) | Context diagram đầu tiên của nhóm (40 luồng). **Đã bị thay thế** bởi v2; giữ lại làm lịch sử |
| [`UCMS_Context_Diagram_Comparison.docx`](UCMS_Context_Diagram_Comparison.docx) | So sánh từng luồng giữa context diagram v1 và v2, kèm lý do của từng thay đổi |
| [`img/`](img/) | Bản xuất PNG, đặt tên theo `<tên-file-nguồn>_<số-trang>_<tên-trang>.png` |

**Khi một sơ đồ thay đổi:** sửa file `.drawio` nguồn, xuất lại mọi trang bị ảnh hưởng vào `img/`
giữ đúng quy ước tên ở trên, và cập nhật `../SRS.md` cùng tài liệu liên quan trong
[`../02-use-cases/`](../02-use-cases/) trong cùng một commit.

**Quy ước ký hiệu đang áp dụng** (review issue I09–I13, I27–I30): `«include»` và `«extend»` chỉ
dùng cho quan hệ use case thật — không bao giờ dùng cho điều hướng màn hình và không bao giờ
dùng cho cascade hệ thống; actor phụ nối bằng association nét liền, không phải nét đứt; đăng
nhập là *tiền điều kiện* của dashboard chứ không phải `«include»`. Chỉ còn đúng hai cạnh
`«extend»`: `UC47 «extend» UC25` và `UC49 «extend» UC28`.
