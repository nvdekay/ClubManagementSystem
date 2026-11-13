# 02 — Use case model và đặc tả (v2, bản lịch sử)

> Các file trong thư mục này là bản lịch sử, đã được [`../SRS.md`](../SRS.md) thay thế. UC23 đã rút
> (07/11/2026), phê duyệt một cấp (09/11/2026), email gửi qua Google SMTP. Khi khác nhau, lấy theo SRS.

Thư mục này có **53 mã use case (UC01–UC52 và UC58 — phân phòng học theo học kỳ, thêm 2026-10-11)**;
cùng UC53–UC55 của SRS là 56 mã, trong đó **55 use case nằm trong phạm vi**. UC05, UC51, UC52 được
khôi phục; UC23 bị rút vì role/quyền CLB do hệ thống định nghĩa cố định. Các đoạn mô tả UC23 động
trong model/spec cũ là lịch sử và không có thẩm quyền cao hơn SRS hiện hành. Hệ thống có 4 actor
(Student, Club Member, Club Leader, ICPDP Officer), 3 hệ thống
ngoài, 12 module. Mọi mã số trong thư mục này là v2; cách đánh số v1 (UC01–UC57) chỉ còn tồn tại trong
[`../01-business-analysis/`](../01-business-analysis/).

| File | Là gì |
|---|---|
| [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md) | Mô hình: vì sao có v2, danh sách use case, ánh xạ v1 → v2, bản đồ quan hệ, ma trận actor, các vòng đời thực thể, phần sửa đổi quy tắc nghiệp vụ (BR40–BR46), phạm vi phát hành, truy vết và ánh xạ luồng context |
| [`UCMS_UseCase_Specification_v2.md`](UCMS_UseCase_Specification_v2.md) | Đặc tả chi tiết 53 mã use case — actor, mục tiêu, điều kiện kích hoạt, tiền điều kiện, dữ liệu vào, luồng chính, luồng thay thế, ngoại lệ, hậu điều kiện, quy tắc nghiệp vụ, đầu ra, use case liên quan, pain point |
| [`UCMS_Review_Issues.md`](UCMS_Review_Issues.md) | Nhật ký review chéo I01–I66: những chỗ mô hình, đặc tả, report và sơ đồ mâu thuẫn nhau, và cách xử lý từng mục. Chỉ I54 (thiếu MSSV/email trong report) còn chờ quyết định; I14, I21 được ghi "Không sửa" có lý do |

Report final hiện hành là báo cáo Google Doc của nhóm (bản final, 13–14/11/2026; mục III: use case diagram,
bảng use case và đặc tả). Các bản `.docx` cũ trong repo (`../Group1_SE1939-NJ_Report_Final.docx`,
`../03-diagrams/UCMS_Diagrams.docx`) đã lỗi thời nên được xoá ngày 14/11/2026; DOCX đặc tả riêng và `v2.docx`
đã xoá từ 19/10/2026.

Sơ đồ của phần này nằm ở [`../03-diagrams/`](../03-diagrams/); baseline yêu cầu hợp nhất là
[`../SRS.md`](../SRS.md).
