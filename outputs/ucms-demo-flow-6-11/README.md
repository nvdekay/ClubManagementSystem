# Video tập demo flow 6 và 11

Thư mục chứa video quay giao diện UCMS và hướng dẫn tập trình bày cho Người 4 trong buổi bảo vệ.
Các đoạn có gợi ý lời nói ngay dưới màn hình, dấu trỏ ở chỗ thao tác và chuyển vai rõ ràng.

## Xem video

**[Bản đầy đủ — 4 phút 31 giây](UCMS-demo-flow-6-11.mp4)**, MP4 H.264,
1920 × 1080, 30 fps. Video có chữ gợi ý trình bày, không có thuyết minh âm thanh.
File đã gắn chapter; thời gian chờ giữa các lần chuẩn bị cảnh đã được cắt.

| Mốc trong bản đầy đủ | Nội dung | Video riêng |
|---|---|---|
| 00:00 | Cơ sở vật chất (UC44–UC47, UC58) | [Flow 6 — 2 phút 43 giây](06-co-so-vat-chat.mp4) |
| 02:43 | Sự kiện cấp trường (UC53, UC54) | [Flow 11 — 1 phút 48 giây](11-su-kien-cap-truong.mp4) |

## Phạm vi bản quay

- Flow 6, 4 cảnh: ICPDP xem danh mục và giai đoạn khoá của hội trường; Leader gửi yêu cầu
  hội trường (`Draft → Requested`) và huỷ một booking sân đã duyệt (`Approved → Cancelled`);
  ICPDP nhận thẩm định (`Under Review`), duyệt kèm lý do (`Approved`), rồi phân phòng BE-201
  thứ 5 slot 4 cho cả học kỳ trên lưới tuần; Member mở trang phòng được phân.
- Flow 11, 3 cảnh: ICPDP tạo "Ngày hội Câu lạc bộ FPTU 2026" và mời 3 CLB (sự kiện ở
  `Approved`, 3 lời mời `Pending`); Leader nhận lời kèm đại diện, số người, nội dung
  (`Accepted`); ICPDP tải lại màn theo dõi, công bố (`Approved → Upcoming`, có mã check-in) và
  mở trang công khai `/events/:id`.

Ứng dụng dùng giao diện và nghiệp vụ hiện tại của repo, chạy trên MongoDB replica set với
database riêng `ucms_video_p4`, nhân bản từ trạng thái cuối của video flow 1–3. Phiên đăng nhập
được cấp trước bằng session service của ứng dụng; video không thực hiện Google OAuth.

### Seed chuẩn bị và thao tác trên giao diện

`npm run seed:defense:p4` (`server/src/infra/db/seed-defense-p4.ts`) ghi qua repository thật,
chạy lại an toàn (khoá theo email, tên CLB, tên tài sản, mục đích booking):

| Seed chuẩn bị | Làm trực tiếp trên giao diện |
|---|---|
| Cast nếu thiếu: `officer.demo` (ICPDP_OFFICER), `an.demo` là Leader, `chi.demo` là thành viên `Active` của "CLB Sáng tạo Công nghệ FPTU" | — |
| 6 tài sản: HT-001 hội trường (khoá 1 ngày lễ tốt nghiệp), SN-001 sân, SK-001 sân khấu, TB-001 thiết bị, PH-001 BE-201 (khoá 1 thứ 5 bảo trì điều hoà), PH-002 BE-202 | Mở form sửa hội trường để chỉ giờ được đặt và giai đoạn khoá |
| Booking nháp hội trường, thứ 4 tuần tới slot 3, 120 người | Leader gửi thẩm định; ICPDP nhận và duyệt |
| Booking sân thứ 6 tuần tới slot 4, đã đi qua gửi → nhận → duyệt | Leader huỷ kèm lý do |
| FPTU Robotics Club đã được phân BE-201 thứ 3 slot 3 (ô "đang dùng" trên lưới) | ICPDP phân BE-201 thứ 5 slot 4 cho CLB demo |
| — | Toàn bộ flow 11: tạo sự kiện, mời CLB, phản hồi, công bố |

Mọi ngày được tính tương đối so với lúc chạy seed, nằm trong học kỳ `Fall 2026` của policy;
không bước nào chờ scheduler hay hạn chót.

## Trạng thái database đã kiểm tra

Đối chiếu `ucms_video_p4` ngày 14/11/2026 sau bản quay:

- Booking "Workshop Git và GitHub cho tân thành viên" (HT-001): `Approved`, lý do
  "Hội trường trống, CLB đang hoạt động, mục đích phù hợp."
- Booking "Giao lưu thể thao với CLB bạn" (SN-001): `Cancelled`, lý do "Hoạt động giao lưu đã
  dời sang học kỳ sau".
- 2 đợt phân phòng trên BE-201: Robotics thứ 3 slot 3 (7 buổi `Approved`); CLB demo thứ 5
  slot 4 (6 buổi `Approved`, `skipped` đúng ngày 03/12/2026 bị khoá bảo trì).
- Sự kiện "Ngày hội Câu lạc bộ FPTU 2026": `organizerType = ICPDP`, `Upcoming`, bắt đầu
  05/12/2026 08:00, đã có `publishedAt` và mã check-in.
- Lời mời: CLB Sáng tạo Công nghệ FPTU `Accepted` (đại diện Nguyễn Minh An, 5 người, nội dung
  "CLB nhận 1 gian hàng trải nghiệm lập trình."); FPTU English Club và FPTU Melody Club `Pending`.

## Chỗ bản quay khác kịch bản

- Thời lượng: flow 6 là 163 giây (kịch bản 150), flow 11 là 108 giây (kịch bản 90); tổng 4:31,
  trong khung 3–5,5 phút.
- Flow 6: việc Leader huỷ booking làm ngay trong cảnh Leader đầu tiên, trên một booking `Approved`
  riêng do seed tạo, trước khi ICPDP duyệt hồ sơ hội trường, để mỗi vai chỉ một lần ngồi. Kịch bản
  đặt phần huỷ sau bước duyệt.
- Flow 6: duyệt và phân phòng của ICPDP gộp vào một cảnh. Không quay hồ sơ "phát sinh xung đột
  sau khi nộp", `Revision Requested`, overbooking, thu hồi phân phòng hay chuyển
  `In Use/Completed` của scheduler; đây là nhánh để trả lời Q&A.
- Flow 11: hạn phản hồi để trống (mặc định 3 ngày trước giờ bắt đầu); không quay thu hồi lời mời
  hay lời mời `Declined/Expired`.
- Theo code: trang "Phòng được phân" mở cho mọi thành viên `Active` (`club.room.view` mặc định);
  thông báo từ chối truy cập `roomAllocations.clubDenied` trong i18n vẫn nói cần "quyền quản lý
  cơ sở vật chất", không xuất hiện trong video.

## Cách tập

Đọc dòng gợi ý dưới video rồi tập nói bằng lời của bạn. Dừng ở trạng thái đã hiển thị
thành công mới mô tả kết quả. Các điểm cần nhấn mạnh:

1. Hai nhánh cấp tài nguyên: hội trường/sân/sân khấu/thiết bị qua yêu cầu của Leader và UC46;
   phòng học do ICPDP phân cả học kỳ ở UC58, không có đơn xin phòng.
2. Lưới phân phòng chỉ ô đã có CLB dùng; ngày khoá được bỏ qua, một ngày trùng là từ chối cả đợt.
3. Sự kiện trường bắt đầu ở `Approved`; `Accepted` là cam kết của CLB, không tạo đăng ký cá nhân.

Quay lại hoặc chuẩn bị dữ liệu tập (dữ liệu trong bản quay đã đi tới kết quả cuối):

```bash
T=outputs/ucms-demo-tools
$T/stack.sh 4 reset && $T/stack.sh 4 up && eval "$($T/stack.sh 4 env)"
(cd server && MONGO_URI="$MONGO_URI" npm run seed:defense:p4)
node $T/record-p4.mjs   # tuỳ chọn: quay lại video
```

Trước buổi bảo vệ, chạy lại seed trên môi trường trình chiếu và kiểm tra học kỳ trong policy còn
ít nhất ba tuần. Kịch bản lời thoại chi tiết nằm ở
[`flow-06-facilities.md`](../../docs/08-defense-scripts/flow-06-facilities.md) và
[`flow-11-school-events.md`](../../docs/08-defense-scripts/flow-11-school-events.md).
