# 06 — Hướng dẫn sử dụng

Guide book cho người dùng UCMS, theo ba không gian Student, CLB và ICPDP.

- [GUIDE_BOOK.pdf](GUIDE_BOOK.pdf): bản để in hoặc gửi cho người dùng, khổ A4 ngang.
- [GUIDE_BOOK.html](GUIDE_BOOK.html): bản đọc trên trình duyệt, có mục lục và ảnh nhúng,
  dùng được khi offline; hỗ trợ màn hình điện thoại.
- [GUIDE_BOOK.md](GUIDE_BOOK.md): nguồn hướng dẫn, từng bước thao tác và kết quả cần kiểm tra.
- [images/](images/README.md): ảnh chụp app và [manifest.json](images/manifest.json) ghi nguồn.
- `build-guide.py`: dựng lại HTML từ Markdown và PNG bằng Python standard library,
  không cần cài thêm dependency.

Nội dung đối chiếu 15/10/2026; ảnh chụp 13/10/2026. Bản ảnh phủ các màn hình đã chụp (23 chương, 64 ảnh). Client yêu cầu đăng nhập cho mọi
trang, kể cả trang chủ/danh bạ; API `/public/*` vẫn công khai. Toàn bộ ảnh được chụp lại ngày 13/10/2026 theo giao diện hiện tại (thanh
bên chia nhóm, phía CLB chỉ còn hai vai trò Club Leader / Club Member), trên database demo
`ucms_guide_demo`. Ảnh UC36 và UC37 chụp trên bản demo có nối API trước khi server chính được
nối ngày 15/10/2026. Các màn CLB thêm ngày 15/10/2026 (UC12, UC14, UC21 A2, UC38, UC40, UC43, UC54)
mới được nhắc tên mục, chưa có ảnh. Đối chiếu phạm vi với
[`../CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md).

## Tạo dữ liệu

1. Chạy `npm run seed` để có CLB/sự kiện công khai.
2. Chạy `npm run seed:demo -- --owner=<email-owner-hiện-có>`; giữ owner đang làm chủ nhiệm
   bộ demo để không đổi cơ cấu đang được dùng.
3. Chạy `node --env-file=.env --import tsx server/src/infra/db/seed-guide.ts` từ gốc repo.
   Script tạo/cập nhật database riêng `ucms_guide_demo`, không chuyển app chính sang database đó.

Seed guide copy các collection nghiệp vụ một lần, giữ liên kết và lịch sử, không copy phiên
đăng nhập. Chạy lại không reset thao tác của người dùng trong database demo. Policy POST_EVENT
7 ngày và chứng từ mẫu chỉ phục vụ demo. Hạn hoàn trả BR58 đã chốt 7 ngày (server chính dùng 7;
`seed-guide.ts` còn đặt 14 ngày cho bộ demo).
Link `example.org` là placeholder, không phải chứng từ thanh toán thật.

Dữ liệu wave 4 có sự kiện Completed/Cancelled, điểm danh, phản hồi, báo cáo nháp/đã nộp/trả sửa,
version mới, khoản chi có/thiếu chứng từ, task, đối soát còn số dư (`Reconciled`, UC37 A2 không có bước cấp bù) và chờ hoàn trả. Các ảnh ghi lại
trạng thái tại lúc thao tác; database sau demo có thể đã chuyển sang bước tiếp theo.

## Cập nhật guide

Sửa `GUIDE_BOOK.md`, cập nhật PNG và manifest, rồi chạy:

```sh
python3 docs/06-user-guide/build-guide.py
```

Mở HTML, chọn In → lưu PDF, khổ A4 ngang, bật hình nền. PDF bàn giao đã được xuất và kiểm tra
font tiếng Việt, ảnh, số trang và khả năng đọc trên trình duyệt.
