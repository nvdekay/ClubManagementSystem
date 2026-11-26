# Video tập demo flow 1, 2, 3

> **Lưu ý:** từ 26/11/2026 các file MP4 không còn nằm trong repo (để giảm dung lượng clone). Link bên dưới chỉ chạy khi bạn đặt file video vào đúng thư mục này; bản gốc do nhóm lưu ngoài repo.

Thư mục chứa video quay giao diện UCMS và hướng dẫn tập trình bày cho buổi bảo vệ.
Các đoạn có gợi ý lời nói ngay dưới màn hình, dấu trỏ ở chỗ thao tác và chuyển vai rõ ràng.

## Xem video

**[Bản đầy đủ — 4 phút 32 giây](UCMS-demo-flow-1-2-3.mp4)**, MP4 H.264,
1920 × 1080, 30 fps. Video có chữ gợi ý trình bày, không có thuyết minh âm thanh.
File đã gắn chapter; thời gian chờ giữa các lần chuẩn bị cảnh đã được cắt.

| Mốc trong bản đầy đủ | Nội dung | Video riêng |
|---|---|---|
| 00:00 | Đăng nhập và workspace | [Flow 1 — 23 giây](01-dang-nhap-workspace.mp4) |
| 00:23 | Thành lập CLB | [Flow 2 — 1 phút 39 giây](02-thanh-lap-clb.mp4) |
| 02:02 | Tuyển và tiếp nhận thành viên | [Flow 3 — 2 phút 29 giây](03-tuyen-va-tiep-nhan.mp4) |

## Phạm vi bản quay

- Flow 1: màn đăng nhập, phiên demo đã chuẩn bị, dashboard và workspace theo quyền.
- Flow 2: hồ sơ nháp, founder, tài liệu, nộp, nhận thẩm định, phê duyệt và workspace Leader.
- Flow 3: bản nháp đợt tuyển, công bố, sinh viên nộp đơn, sàng lọc, đánh giá, quyết định và tiếp nhận.

Ứng dụng dùng giao diện và nghiệp vụ hiện tại của repo, chạy trên MongoDB replica set với
database riêng `ucms_video_demo_20261114`. Các thao tác quyết định trong video được thực hiện
qua giao diện và API thật. Không thay đổi mã nguồn ứng dụng hoặc dữ liệu `ucms` hiện có.

Phiên demo được cấp trước bằng session service của ứng dụng cho các tài khoản mẫu;
video không thực hiện Google OAuth trực tiếp. Đề án và logo là tệp mẫu lưu cục bộ bằng
adapter phục vụ bản quay; video không kiểm thử Cloudinary. Hồ sơ thành lập và đợt tuyển
được điền sẵn để tập trung vào nghiệp vụ. Bản nháp đợt tuyển được chuẩn bị giữa hai cảnh,
sau khi CLB mới được phê duyệt.

Đã đối chiếu kết quả trong database ngày 14/11/2026: hồ sơ thành lập `Approved`, CLB
`Active`, đơn của Phạm Hoàng Duy `Onboarded`, membership của ứng viên `Active`, tổng cộng
4 thành viên (3 founder và 1 người vừa tiếp nhận). Trước bước tiếp nhận, ứng viên chưa có
workspace của CLB; sau đó có workspace với role `member`.

## Cách tập

Đọc dòng gợi ý dưới video rồi tập nói bằng lời của bạn. Dừng ở trạng thái đã hiển thị
thành công mới mô tả kết quả. Các điểm cần nhấn mạnh:

1. Workspace phục vụ điều hướng; quyền nghiệp vụ được kiểm tra ở server.
2. Nhận thẩm định chuyển hồ sơ sang `Under Review`; phê duyệt tạo CLB và cơ cấu sáng lập.
3. `Accepted` giữ kết quả trúng tuyển; `Onboarded` mới tạo membership `Active`.

Trước buổi bảo vệ, chuẩn bị lại bản nháp và ứng viên mới: hồ sơ/đơn trong bản quay đã đi
đến kết quả cuối. Kiểm tra đăng nhập Google, tài liệu và khung nhận đơn trên môi trường
bạn sẽ trình chiếu. Kịch bản lời thoại chi tiết nằm tại
[`script-noi-flow-01-02-03.md`](../../docs/08-defense-scripts/script-noi-flow-01-02-03.md).
