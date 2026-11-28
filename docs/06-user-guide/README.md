# 06 — Hướng dẫn sử dụng

Guide book cho người dùng UCMS, theo ba không gian Student, CLB và ICPDP.

- [GUIDE_BOOK.md](GUIDE_BOOK.md): nguồn hướng dẫn, từng bước thao tác và kết quả cần kiểm tra.
- [images/](images/README.md): ảnh chụp app và [manifest.json](images/manifest.json) ghi màn hình,
  vai và thao tác trước khi chụp của từng ảnh.
- `build-guide.py`: dựng `GUIDE_BOOK.html` (một file, ảnh nhúng sẵn, đọc được khi offline, có mục
  lục, hỗ trợ màn hình điện thoại) bằng Python standard library.
- `shrink-images.py`: giảm PNG xuống bảng 256 màu sau khi chụp lại (cần Pillow).

`GUIDE_BOOK.md` đối chiếu code ngày 27/11/2026. Ảnh chụp tự động ngày 27–28/11/2026 từ giao diện hiện tại.
`GUIDE_BOOK.html` và `GUIDE_BOOK.pdf` là bản dựng, **không lưu trong repo** (có trong `.gitignore`);
dựng lại theo các bước dưới đây mỗi khi cần gửi cho người dùng. Đối chiếu phạm vi với
[`../CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md).

## Chụp lại ảnh

Ảnh được chụp bằng Playwright từ app thật, dùng lại hạ tầng e2e ở
[`client/e2e/`](../../client/e2e/README.md) (script ở `client/e2e/guide/`):

```bash
docker compose up -d --wait                  # Mongo replica set
npx playwright install chromium              # một lần cho mỗi máy, trong client/
npm run guide:screenshots                    # từ thư mục gốc, khoảng 5 phút
python3 docs/06-user-guide/shrink-images.py  # giảm dung lượng ảnh
```

Lệnh tự dựng database riêng `ucms-e2e-guide` (xoá rồi seed lại, xoá khi xong), API ở cổng 3400 và
client ở 5400, nên không đụng database `ucms` hay stack dev. Dữ liệu là các seed có sẵn cộng
`client/e2e/guide/prepare-guide.ts`; phiên đăng nhập được cấp thật cho từng tài khoản mẫu, không
qua Google OAuth. Ảnh ghi đè đúng tên file trong `images/`, nên link trong `GUIDE_BOOK.md` giữ nguyên.
Thêm hoặc đổi một ảnh: sửa `client/e2e/guide/screens.guide.ts`, rồi cập nhật `images/manifest.json`
và `GUIDE_BOOK.md`.

## Dựng HTML và PDF

```bash
python3 docs/06-user-guide/build-guide.py    # → docs/06-user-guide/GUIDE_BOOK.html
```

Script dừng với lỗi nếu `GUIDE_BOOK.md` trỏ tới ảnh không có hoặc ảnh không có trong manifest. Mở
HTML bằng trình duyệt, chọn In → Lưu thành PDF, khổ A4 ngang, bật hình nền, lưu thành
`GUIDE_BOOK.pdf` cạnh file HTML. Gửi bản HTML/PDF vừa dựng cho người dùng; không commit chúng.
