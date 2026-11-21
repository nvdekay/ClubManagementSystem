# Kịch bản demo UCMS — 20 phút

Demo đi theo **vòng đời của một CLB**: một nhóm sinh viên lập CLB → CLB tuyển người → CLB tổ chức sự kiện
→ ICPDP kiểm soát tiền, đánh giá và báo cáo. Mỗi bước có một việc phía CLB/sinh viên và một quyết định phía
ICPDP, để thầy thấy được thông điệp chính của hệ thống: **mọi việc của CLB đi qua một luồng duyệt có trạng
thái, có lý do và có lịch sử**.

Mã UC dưới đây theo SRS và Final Report (UC01–UC55, UC58).

## 1. Phân bổ thời gian

| Phút | Phần | UC | Tài khoản |
|---|---|---|---|
| 0:00–1:30 | Đăng nhập, chọn workspace, dashboard ICPDP | UC01, UC02 | ICPDP |
| 1:30–5:00 | Thành lập CLB: nộp hồ sơ → ICPDP duyệt → CLB Active | UC07, UC08 | Sinh viên D, ICPDP |
| 5:00–8:30 | Tuyển thành viên: tạo đợt → ứng tuyển → nhận → tiếp nhận | UC16, UC17, UC18, UC20 | Chủ nhiệm B, Sinh viên D |
| 8:30–12:30 | Sự kiện mới: import đề án → ICPDP duyệt → công bố → đăng ký | UC25, UC26, UC27, UC29 | Chủ nhiệm B, ICPDP, Sinh viên D |
| 12:30–15:30 | Sự kiện đang chạy và đã xong: check-in → phản hồi → chốt điểm danh | UC31, UC48, UC32, UC49 | Thành viên C, Chủ nhiệm B |
| 15:30–17:30 | Kinh phí: CLB nộp chứng từ → ICPDP đối soát | UC36, UC37 | Chủ nhiệm B, ICPDP |
| 17:30–19:00 | Đánh giá CLB và xuất báo cáo | UC43, UC55 | ICPDP |
| 19:00–20:00 | Tổng kết, mở hỏi đáp | — | — |

Nếu chậm giờ, bỏ theo thứ tự: phần kinh phí (15:30) → xuất báo cáo → UC16 tạo đợt tuyển (dùng đợt đã công
bố sẵn). Không bỏ phần sự kiện vì đó là luồng lớn nhất.

