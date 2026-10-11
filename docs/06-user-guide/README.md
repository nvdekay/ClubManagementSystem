# 06 — Hướng dẫn sử dụng

Guide book cho người dùng UCMS, theo ba không gian Student, CLB và ICPDP.

- [GUIDE_BOOK.pdf](GUIDE_BOOK.pdf): bản để in hoặc gửi cho người dùng, khổ A4 ngang.
- [GUIDE_BOOK.html](GUIDE_BOOK.html): bản đọc trên trình duyệt, có mục lục và ảnh nhúng,
  dùng được khi offline; hỗ trợ màn hình điện thoại.
- [GUIDE_BOOK.md](GUIDE_BOOK.md): nguồn hướng dẫn, từng bước thao tác và kết quả cần kiểm tra.
- [images/](images/README.md): ảnh chụp app và [manifest.json](images/manifest.json) ghi nguồn.
- `build-guide.py`: dựng lại HTML từ Markdown và PNG bằng Python standard library,
  không cần cài thêm dependency.

Ảnh cuối dùng API thật với MongoDB đã seed, không dùng API fixture trong trình duyệt.
Các màn wave 4 dùng database `ucms_guide_demo` riêng với policy mẫu; không thay policy ở database
nguồn. Google OAuth chưa được kiểm thử lại: phiên local cấp qua SessionService, quyền và
CSRF vẫn được kiểm tra bình thường. UC36/UC37 chưa được nối ở server chính.

## Tạo dữ liệu

1. Chạy `npm run seed` để có CLB/sự kiện công khai.
2. Chạy `npm run seed:demo -- --owner=<email-owner-hiện-có>`; giữ owner đang làm chủ nhiệm
   bộ demo để không đổi cơ cấu đang được dùng.
3. Chạy `node --env-file=.env --import tsx server/src/infra/db/seed-guide.ts` từ gốc repo.
   Script tạo/cập nhật database riêng `ucms_guide_demo`, không chuyển app chính sang database đó.

Seed guide copy các collection nghiệp vụ một lần, giữ liên kết và lịch sử, không copy phiên
đăng nhập. Chạy lại không reset thao tác của người dùng trong database demo. Policy POST_EVENT
7 ngày, chứng từ mẫu và hạn hoàn trả 14 ngày chỉ phục vụ demo; bản chính cần chốt BR25/BR58.
Link `example.org` là placeholder, không phải chứng từ thanh toán thật.

Dữ liệu wave 4 có sự kiện Completed/Cancelled, điểm danh, phản hồi, báo cáo nháp/đã nộp/trả sửa,
version mới, khoản chi có/thiếu chứng từ, task, đối soát chờ cấp bù và hoàn trả. Các ảnh ghi lại
trạng thái tại lúc thao tác; database sau demo có thể đã chuyển sang bước tiếp theo.

## Cập nhật guide

Sửa `GUIDE_BOOK.md`, cập nhật PNG và manifest, rồi chạy:

```sh
python3 docs/06-user-guide/build-guide.py
```

Mở HTML, chọn In → lưu PDF, khổ A4 ngang, bật hình nền. PDF bàn giao đã được xuất và kiểm tra
font tiếng Việt, ảnh, số trang và khả năng đọc trên trình duyệt.

Review Wave 4: [WAVE_4_REVIEW_2026-10-11.md](../05-implementation/WAVE_4_REVIEW_2026-10-11.md).
