# 02 — Use case model và đặc tả (v2)

Danh mục hợp nhất có **56 mã UC01–UC55 và UC58**, 52 còn trong phạm vi. UC05, UC23, UC51 và UC52 đã rút khỏi
runtime hiện hành; UC50 đã đổi thành góp ý một chiều. Bốn actor là Student, Club Member, Club
Leader và ICPDP Officer. Phía CLB chỉ có hai role cố định: Club Leader vận hành, Club Member xem
và tham gia. Trạng thái code chi tiết xem [`../CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md).
Ba hệ thống
ngoài, 12 module. Mọi mã số trong thư mục này là v2; cách đánh số v1 (UC01–UC57) chỉ còn tồn tại trong
[`../01-business-analysis/`](../01-business-analysis/).

| File | Là gì |
|---|---|
| [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md) | Mô hình: vì sao có v2, danh sách use case, ánh xạ v1 → v2, bản đồ quan hệ, ma trận actor, các vòng đời thực thể, phần sửa đổi quy tắc nghiệp vụ (BR40–BR46), phạm vi phát hành, truy vết và ánh xạ luồng context |
| [`UCMS_UseCase_Specification_v2.md`](UCMS_UseCase_Specification_v2.md) | Đặc tả chi tiết; các UC đã rút được giữ mã và ghi rõ trạng thái để không đánh số lại |
| [`UCMS_Review_Issues.md`](UCMS_Review_Issues.md) | Nhật ký lịch sử review; mô tả RBAC/UC23 trong file này không phải baseline runtime hiện hành |

Bản Word sử dụng hiện tại là [report v2](../Group1_SE1939-NJ_Report_Final_v2.docx);
DOCX đặc tả riêng đã được xoá để tránh dùng bản cũ.

Sơ đồ của phần này nằm ở [`../03-diagrams/`](../03-diagrams/); baseline yêu cầu hợp nhất là
[`../SRS.md`](../SRS.md).
