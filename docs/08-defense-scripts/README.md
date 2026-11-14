# Kịch bản thuyết trình và Q&A theo 11 flow

Mỗi file gồm nghiệp vụ chính, điều kiện chuẩn bị demo, lời thoại có thể tập nói, nhánh xử
lý cần giải thích và câu hỏi bảo vệ kèm câu trả lời. Số flow theo
[bản phân công cho 6 người](../UC_FLOW_GROUPS.md), không phải mã F1–F11 trong SRS.

## Danh sách kịch bản

| Flow | Nội dung | Người phụ trách | File | Thời lượng gợi ý |
|---|---|---|---|---|
| 1 | Đăng nhập và chọn workspace | Người 1 | [flow-01-auth-workspace.md](flow-01-auth-workspace.md) | 45 giây |
| 2 | Thành lập CLB | Người 1 | [flow-02-club-founding.md](flow-02-club-founding.md) | 90 giây |
| 3 | Tuyển và quản lý thành viên | Người 1 | [flow-03-recruitment-membership.md](flow-03-recruitment-membership.md) | 105 giây |
| 4 | Ban chủ nhiệm và chuyển giao nhiệm kỳ | Người 2 | [flow-04-leadership-transition.md](flow-04-leadership-transition.md) | 150 giây |
| 5 | Tổ chức và tham gia sự kiện | Người 3 | [flow-05-club-events.md](flow-05-club-events.md) | 240 giây |
| 6 | Cơ sở vật chất | Người 4 | [flow-06-facilities.md](flow-06-facilities.md) | 150 giây |
| 7 | Kinh phí và quyết toán | Người 5 | [flow-07-event-finance.md](flow-07-event-finance.md) | 150 giây |
| 8 | Báo cáo định kỳ và đánh giá CLB | Người 5 | [flow-08-reporting-evaluation.md](flow-08-reporting-evaluation.md) | 90 giây |
| 9 | Khiếu nại và xử lý vi phạm | Người 6 | [flow-09-complaints-violations.md](flow-09-complaints-violations.md) | 240 giây |
| 10 | Tạm ngừng, kích hoạt lại và giải thể | Người 2 | [flow-10-club-lifecycle.md](flow-10-club-lifecycle.md) | 90 giây |
| 11 | Sự kiện cấp trường | Người 4 | [flow-11-school-events.md](flow-11-school-events.md) | 90 giây |

Các mốc trên minh hoạ phương án **24 phút trình bày, mỗi người 4 phút**, chưa gồm phần hội
đồng hỏi đáp. Điều chỉnh theo thời lượng được giao; không cần đọc toàn bộ phần Q&A khi demo.
Thứ tự trình bày theo người: **1–2–3 / 4–10 / 5 / 6–11 / 7–8 / 9**.

## Cách dùng

- Tập lời thoại trong phần “Kịch bản thuyết trình”; phần “Thao tác demo” là chỉ dẫn cho
  người trình bày, không phải câu đọc trước hội đồng.
- Chuẩn bị trước các hồ sơ ở từng trạng thái để không phải chờ ngày sự kiện, hạn xử lý hoặc
  scheduler. Tên CLB, sự kiện và số tiền minh hoạ trong kịch bản không khẳng định dữ liệu đã có sẵn.
- Người phụ trách trình bày cả phía gửi yêu cầu và phía ra quyết định bằng các tài khoản
  có quyền tương ứng. Không đưa mật khẩu, token hoặc thông tin tài khoản thật vào tài liệu.
- UC40 được giải thích chi tiết tại flow 9. Flow 8 chỉ dùng kết quả tuân thủ làm đầu vào
  đánh giá. Quyết định ngân sách ở flow 5 và đối soát ở flow 7 là hai giai đoạn khác nhau.
- UC03/UC05 là nội dung bổ trợ của Người 6; UC04 của Người 2; UC06 của Người 1; UC55 của
  Người 5. Đưa các câu hỏi liên quan vào flow tương ứng, không tạo flow thứ 12.

## Quy ước biên soạn

Viết tiếng Việt tự nhiên để nói trước giảng viên, giữ mã UC, tên trạng thái và định danh
code nguyên bản. Mỗi file chỉ mô tả flow được giao; các điểm nối dẫn sang file liên quan.
Nguồn nghiệp vụ là [SRS](../SRS.md), phạm vi code hiện tại là
[CURRENT_IMPLEMENTATION.md](../CURRENT_IMPLEMENTATION.md); dùng
[ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md) để tìm nơi kiểm chứng.

Mỗi script cần có: phạm vi/người phụ trách, nghiệp vụ chính, chuẩn bị demo, lời thoại,
nhánh ngoại lệ, Q&A có câu trả lời, điểm bàn giao và nguồn đối chiếu cụ thể. Khi SRS và code
chưa khớp, ghi rõ khác biệt có liên quan trong phần chuẩn bị/Q&A; không nói một tính năng
chưa có như đã triển khai. Không sửa code ứng dụng để khớp kịch bản.
