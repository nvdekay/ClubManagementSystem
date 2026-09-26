# 02 — Use case model và đặc tả (v2, hiện hành)

Tài liệu use case có thẩm quyền: **54 use case (UC01–UC54)**, 3 actor, 2 hệ thống ngoài, 12
module. Mọi mã số trong thư mục này là v2; cách đánh số v1 (UC01–UC57) chỉ còn tồn tại trong
[`../01-business-analysis/`](../01-business-analysis/).

| File | Là gì |
|---|---|
| [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md) | Mô hình: vì sao có v2, danh sách use case, ánh xạ v1 → v2, bản đồ quan hệ, ma trận actor, các vòng đời thực thể, phần sửa đổi quy tắc nghiệp vụ (BR40–BR46), phạm vi phát hành, truy vết và ánh xạ luồng context |
| [`UCMS_UseCase_Specification_v2.md`](UCMS_UseCase_Specification_v2.md) | Đặc tả chi tiết cả 54 use case — actor, mục tiêu, điều kiện kích hoạt, tiền điều kiện, dữ liệu vào, luồng chính, luồng thay thế, ngoại lệ, hậu điều kiện, quy tắc nghiệp vụ, đầu ra, use case liên quan, pain point |
| [`UCMS_UseCase_Specifications_v2.docx`](UCMS_UseCase_Specifications_v2.docx) | Cùng nội dung đặc tả ở định dạng bảng Word mà môn học yêu cầu nộp. **Được sinh ra từ file Markdown — sửa Markdown trước, rồi xuất lại.** Phần bìa hiện vẫn là bản v1 và file ra đời trước các review issue I04–I07, I23–I30 |
| [`UCMS_Review_Issues.md`](UCMS_Review_Issues.md) | Nhật ký review chéo I01–I30: những chỗ mô hình, đặc tả và sơ đồ mâu thuẫn nhau, và cách xử lý từng mục. I21 và I22 vẫn còn mở |

Sơ đồ của phần này nằm ở [`../03-diagrams/`](../03-diagrams/); baseline yêu cầu hợp nhất là
[`../SRS.md`](../SRS.md).
