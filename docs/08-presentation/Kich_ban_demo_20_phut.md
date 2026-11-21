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

## 2. Chuẩn bị trước buổi demo (làm trước ít nhất 1 ngày, kiểm tra lại 2 giờ trước)

### 2.1 Bốn tài khoản Google thật

Hệ thống chỉ đăng nhập bằng Google OAuth, không có đăng nhập giả. Mỗi tài khoản mở ở **một Chrome profile
riêng** đã đăng nhập sẵn, để chuyển vai chỉ bằng cách đổi cửa sổ.

| Ký hiệu | Vai | Ghi chú |
|---|---|---|
| ICPDP | ICPDP Officer | Email trong `BOOTSTRAP_ICPDP_EMAIL` (hoặc owner của `seed:demo`) |
| B | Chủ nhiệm "CLB Sáng tạo Công nghệ FPTU" | Truyền vào `--leader` của `seed:defense:p3/p5`; không được đang là Chủ nhiệm CLB khác |
| C | Thành viên Active của CLB đó | Truyền vào `--member`; dùng để check-in và gửi phản hồi |
| D | Sinh viên "mới" | Chưa từng là thành viên CLB của B; không đang làm Chủ nhiệm CLB nào |

- Domain của cả bốn email phải nằm trong `ALLOWED_DOMAIN`.
- Mỗi tài khoản đăng nhập vào app **một lần trước khi chạy seed**, vì seed cần tài khoản đã tồn tại.

### 2.2 Dữ liệu

1. `docker compose up -d --wait`, khởi động server một lần để tạo vai trò, rồi dừng.
2. Sao lưu DB: `mongodump --uri "mongodb://127.0.0.1:27017/ucms" --archive=ucms-truoc-demo.archive`.
3. `npm run seed:demo -w server -- --owner=<email ICPDP>`: policy học kỳ, 16 sinh viên demo (dùng làm
   đồng sáng lập ở UC07), các hồ sơ đang chờ cho hàng đợi của ICPDP.
4. `npm run seed:dashboard -w server`: dữ liệu 12 tháng cho biểu đồ dashboard.
5. `npm run seed:defense:p5 -w server -- --leader=<B> --officer=<ICPDP> --member=<C>`: kinh phí và đánh
   giá. Thêm `--report-submitted` nếu muốn có báo cáo định kỳ đang chờ duyệt.
6. **Trong vòng 2 giờ trước giờ demo**: `npm run seed:defense:p3 -w server -- --leader=<B> --officer=<ICPDP> --member=<C>`.
   Script tạo "Talkshow: AI trong học tập và nghiên cứu" **đang diễn ra** (bắt đầu khoảng 30 phút trước lúc
   chạy, kéo dài 2,5 giờ) và "Workshop Docker cơ bản" **đã kết thúc**. Ghi lại `checkInCode` mà script in ra.
   Chạy lại không làm mới sự kiện cũ; muốn đổi giờ thì khôi phục bản sao lưu rồi chạy lại.
7. Khởi động lại server ngay trước giờ demo để job vòng đời sự kiện cập nhật trạng thái (Ongoing/Completed).

### 2.3 File cần có trên máy

- **Logo CLB**: PNG hoặc JPG, dưới 2 MB (không nhận SVG).
- **Đề án thành lập CLB**: PDF hoặc DOCX, dưới 10 MB.
- **Đề án sự kiện** `.docx`: sửa từ `docs/Đề án sự kiện.docx`. Ngày diễn ra phải **cách ngày demo ít nhất
  7 ngày** và còn trong học kỳ; "Đối tượng" ghi "sinh viên"; thời gian dạng `dd/mm/yyyy HH:mm`. Import thử
  một lần trước để chắc file qua được bộ đọc.
- **1–2 ảnh hoá đơn** JPG/PNG dưới 5 MB cho phần kinh phí.

### 2.4 Kiểm tra cuối

- Cloudinary đã cấu hình (`CLOUDINARY_*`); thiếu thì mọi bước tải file báo "file storage is not configured".
- Mở sẵn các tab ở trang bắt đầu của mỗi phần (bảng ở mục 3).
- Có video dự phòng trong `docs/07-demo-videos/` nếu mạng hoặc Google login lỗi.
- Tắt thông báo hệ điều hành, phóng to trình duyệt 110–125% cho thầy dễ nhìn.

