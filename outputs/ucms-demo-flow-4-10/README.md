# Video tập demo flow 4 và 10

Thư mục chứa video quay giao diện UCMS và hướng dẫn tập trình bày của Người 2 cho buổi bảo vệ.
Mỗi đoạn có gợi ý lời nói ngay dưới màn hình, dấu trỏ ở chỗ thao tác và thẻ chuyển vai rõ ràng.

## Xem video

**[Bản đầy đủ — 4 phút 52 giây](UCMS-demo-flow-4-10.mp4)**, MP4 H.264,
1920 × 1080, 30 fps. Video có chữ gợi ý trình bày, không có thuyết minh âm thanh.
File đã gắn chapter; thời gian chờ giữa các lần chuẩn bị cảnh đã được cắt.

| Mốc trong bản đầy đủ | Nội dung | Video riêng |
|---|---|---|
| 00:00 | Ban chủ nhiệm và chuyển giao nhiệm kỳ (UC10–UC13) | [Flow 4 — 2 phút 51 giây](04-ban-chu-nhiem-chuyen-giao.mp4) |
| 02:51 | Tạm ngừng, kích hoạt lại và giải thể (UC14–UC15) | [Flow 10 — 2 phút 1 giây](10-vong-doi-clb.mp4) |

Kịch bản gợi ý là 150 + 90 giây; bản quay dài hơn khoảng 50 giây vì mỗi quyết định được
thao tác thật trên giao diện và giữ màn hình kết quả đủ lâu để đọc. Tổng vẫn trong khung 3–5,5 phút.

## Phạm vi bản quay

- **Flow 4** (CLB Sáng tạo Công nghệ FPTU, nối tiếp video flow 1–3):
  1. Club Leader Nguyễn Minh An mở `/club/:clubId/board`, chỉ nhiệm kỳ `Active` hiện hành, đề cử
     Lê Ngọc Chi vào ghế Phó chủ nhiệm (ghế nhiều người giữ) và nộp — đề cử `Pending Confirmation`.
  2. Cán bộ ICPDP mở `/workspace/board-nominations`, nhận task, chỉ nút “Trả ghế” kèm ô lý do,
     rồi xác nhận ghế — ghế và đề cử `Confirmed`.
  3. Leader An mở kế hoạch chuyển giao đã lưu ở `/club/:clubId/transition-plans`: nhiệm kỳ mới,
     lý do chuyển giao sớm, ban mới (Bảo Chủ nhiệm; Chi và chính An Phó chủ nhiệm), ba nghĩa vụ tự nạp.
     Giao nghĩa vụ còn trống (Hackathon) cho Chi, lưu, rồi nộp — kế hoạch `Pending Confirmation`.
  4. Cán bộ ICPDP mở `/workspace/leadership-transitions`, nhận xử lý, đánh dấu ngân sách
     “Tiếp tục theo dõi sau khi duyệt”, phê duyệt — kế hoạch `Confirmed`.
  5. Club Leader mới Trần Gia Bảo mở `/club/:clubId/board-history`: nhiệm kỳ mới đang hiệu lực
     và nhiệm kỳ cũ đã kết thúc, giữ đủ người giữ ghế.
- **Flow 10** (cùng CLB, Leader là Bảo sau chuyển giao):
  1. Leader Bảo nộp UC14 ở `/club/:clubId/suspension-requests`: lý do, ngày kết thúc (+30 ngày),
     phương án nghĩa vụ, kế hoạch phục hồi; danh sách ảnh hưởng có Hackathon; tích xác nhận — `Pending`.
  2. Cán bộ ICPDP duyệt ở `/workspace/suspension-requests` kèm lý do — yêu cầu `Approved`, CLB `Suspended`.
  3. Cán bộ ICPDP mở `/icpdp/clubs` → “Quản lý”: thông báo tạm ngừng, đợt tuyển vẫn mở, không còn
     sự kiện sắp tới; “Kích hoạt lại” có lý do — CLB `Active`; “Giải thể”: cảnh báo ngân sách chưa
     đối soát và học kỳ Spring 2027, nhập lý do, xác nhận — lịch giải thể được ghi, CLB vẫn `Active`.

## Seed chuẩn bị gì, giao diện làm gì

Seed `server/src/infra/db/seed-defense-p2.ts` (`npm run seed:defense:p2`) chạy trên database
`ucms_video_p2` (bản sao trạng thái cuối của video flow 1–3). Chỉ thêm, chạy lại an toàn; nếu
thiếu dàn nhân vật, vai ICPDP hoặc CLB thì tự tạo, không sửa dữ liệu không do nó tạo.

| Seed chuẩn bị | Lý do |
|---|---|
| Phiên bản policy mới (qua usecase UC04) thêm học kỳ kế tiếp `Spring 2027` (01/01–30/04/2027) | Lịch gốc chỉ có Fall 2026; UC15 từ chối giải thể khi không có học kỳ sau |
| Sự kiện `Approved` “Hackathon Sáng tạo FPTU 2026” (12 ngày tới) | Để UC14 liệt kê ảnh hưởng và UC15 huỷ thật |
| Sự kiện `Completed` “Workshop Git & GitHub cho thành viên mới” kèm ngân sách `Disbursed` 1.500.000đ | Nghĩa vụ cho kế hoạch chuyển giao và cảnh báo ngân sách chưa đối soát khi giải thể |
| Bản nháp kế hoạch chuyển giao (qua usecase UC12, tác nhân là Chủ nhiệm hiện tại): “Nhiệm kỳ 2026–2027” từ ngày mai, lý do chuyển giao sớm, ban mới (vai `vice` làm Chủ nhiệm; `member` và `leader` làm Phó chủ nhiệm), 3 mục bàn giao, 2/3 nghĩa vụ đã giao | Form dài; trên video chỉ giao một nghĩa vụ rồi lưu và nộp. Leader cũ ở lại làm Phó chủ nhiệm nên vẫn là Club Leader cho flow 10 |

Mọi đề cử, xác nhận, nộp kế hoạch, phê duyệt chuyển giao, yêu cầu tạm ngừng, duyệt tạm ngừng,
kích hoạt lại và quyết định giải thể đều làm trên giao diện, qua API thật. Phiên đăng nhập
được cấp trước bằng session service (`mint-session.ts`), không qua Google OAuth. Không dùng
Cloudinary hay dịch vụ ngoài.

## Trạng thái database đã đối chiếu (14/11/2026, sau lần quay cuối)

- Đề cử bổ sung và ghế Phó chủ nhiệm của Lê Ngọc Chi: `Confirmed`.
- Kế hoạch chuyển giao: `Confirmed`; quyết định `Approve` có `followUpObligationIds` = ngân sách Workshop.
- `Founding term`: `Closed`, `endAt` = thời điểm phê duyệt; `Nhiệm kỳ 2026–2027`: `Active`, `startAt`
  = cùng thời điểm phê duyệt (không phải ngày 15/11 nhập trên form).
- Assignment cũ (An Chủ nhiệm; Bảo, Chi Phó chủ nhiệm) đã kết thúc; assignment hiện hành: Bảo Chủ
  nhiệm, Chi và An Phó chủ nhiệm. `/auth/me`: cả Bảo và An đều là `leader` với đủ 15 quyền
  (Phó chủ nhiệm hợp lệ cũng là Club Leader).
- Yêu cầu tạm ngừng: `Approved`. Hackathon: `Cancelled` (không khôi phục sau kích hoạt lại).
  Workshop vẫn `Completed`, ngân sách vẫn `Disbursed`. Đợt tuyển Gen 1 vẫn `Published`.
- CLB: `Active`, không còn `suspension`; `dissolution.effectiveSemester` = `Spring 2027`,
  `effectiveFrom` 01/01/2027 00:00, `effectiveTo` 30/04/2027 23:59:59 (giờ Việt Nam).
- Lịch sử vòng đời: `CLUB_SUSPENDED` → `CLUB_REACTIVATED` → `CLUB_DISSOLUTION_DECIDED`.

## Khác với kịch bản tài liệu

- Kịch bản flow 10 gợi ý mở một yêu cầu UC14 có sẵn và dùng CLB riêng cho kích hoạt lại và giải
  thể. Bản quay nộp UC14 trực tiếp và làm cả ba quyết định trên cùng một CLB để câu chuyện liền
  mạch; vì vậy giải thể được lên lịch ngay sau khi vừa kích hoạt lại (chỉ để minh hoạ).
- Booking cơ sở vật chất và buổi phòng học không có trong dữ liệu nên không minh hoạ phần huỷ
  booking của cascade; chỉ có sự kiện bị huỷ.
- Kịch bản flow 4 nói nhánh “trả ghế”: video chỉ mở lựa chọn trả ghế để thấy ô lý do rồi chọn lại xác nhận,
  không ghi một quyết định trả lại thật.
- Toast kết quả của màn quản lý CLB nằm dưới hộp thoại `<dialog>` nên không thấy trên video;
  kết quả được chỉ qua huy hiệu trạng thái, thông báo và lịch sử vòng đời.
- Một vài chữ tiếng Anh do server/dữ liệu sinh ra, không phải bản dịch UI: tên nhiệm kỳ
  `Founding term` và dòng `Default founding structure approved with application` (do luồng UC08
  tạo), mô tả nghĩa vụ ngân sách `Budget Fall 2026 (Disbursed)` (do `club-obligations.ts` ghép chuỗi).
  Không sửa code ứng dụng; có thể nói “nghĩa vụ ngân sách” khi chỉ vào dòng này.
- Khi CLB chưa có, seed tạo CLB với `--leader` ngồi ghế Chủ nhiệm bằng ghi trực tiếp (giống seed
  của các người khác). Nếu tài khoản này đang là Chủ nhiệm CLB khác thì việc ghi này bỏ qua kiểm tra
  BR06 (không làm Chủ nhiệm hai nhiệm kỳ chồng lấn) mà UC08/UC10/UC13 vẫn áp dụng.
- Thông báo xanh “Câu lạc bộ đã chuyển sang Active.” ở màn đề cử ICPDP hiện cho mọi CLB đang
  `Active`, không riêng hồ sơ sáng lập — đây là hành vi hiện tại của UI.

## Dùng tài khoản Google thật khi demo trực tiếp

Seed nhận tài khoản thật qua cờ dòng lệnh (`seed-defense-cast.ts`), mặc định là tài khoản demo:

```bash
cd server && npm run seed:defense:p2 -- --leader=<email> --officer=<email> --member=<email>
```

Tài khoản truyền vào phải đã đăng nhập ít nhất một lần; `--officer` phải đang có vai `ICPDP_OFFICER`.
Seed không đổi tên hiển thị, vai hệ thống hay membership ở CLB khác của các tài khoản này.
`vice` (Trần Gia Bảo) và `member2` (Phạm Hoàng Duy) vẫn là tài khoản demo.

| Bước | Ai đăng nhập | Làm gì |
|---|---|---|
| Flow 4 · UC10 | `--leader` | Đề cử `--member` vào ghế Phó chủ nhiệm |
| Flow 4 · UC11 | `--officer` | Nhận và xác nhận ghế |
| Flow 4 · UC12 | `--leader` | Giao nghĩa vụ Hackathon, lưu, nộp kế hoạch |
| Flow 4 · UC13 | `--officer` | Nhận, đánh dấu theo dõi ngân sách, phê duyệt |
| Flow 4 · lịch sử | `--leader` (nay là Phó chủ nhiệm) | Mở `/club/:clubId/board-history`; video dùng Bảo nhưng Bảo là tài khoản demo không đăng nhập Google được |
| Flow 10 · UC14 | `--leader` | Nộp yêu cầu tạm ngừng |
| Flow 10 · UC15 | `--officer` | Duyệt tạm ngừng, kích hoạt lại, lên lịch giải thể |

`--member` không cần đăng nhập trong hai flow này.

**Lưu ý trên database chung `ucms`:** duyệt tạm ngừng huỷ mọi sự kiện tương lai đã duyệt, đề xuất
đang chờ và booking tương lai đã duyệt của CLB; quyết định giải thể huỷ mọi việc kết thúc sau
học kỳ giải thể. Nếu flow 5, 6, 7… dùng cùng CLB thì hãy trình bày flow 10 sau cùng hoặc chuẩn bị
lại dữ liệu sau đó. Duyệt chuyển giao cũng đổi Chủ nhiệm sang `vice`; `--leader` vẫn giữ quyền
Club Leader với ghế Phó chủ nhiệm.

## Cách tập

Đọc dòng gợi ý dưới video rồi tập nói bằng lời của bạn. Dừng ở trạng thái đã hiển thị thành công
mới mô tả kết quả. Các điểm cần nhấn mạnh:

1. Đề cử chưa cho quyền; quyền Leader cần cùng lúc membership `Active`, ghế `Confirmed` và nhiệm kỳ còn hiệu lực.
2. UC10–UC11 bổ sung ghế trong nhiệm kỳ đang chạy; UC12–UC13 chuyển cả ban sang nhiệm kỳ mới,
   có hiệu lực ngay lúc duyệt, nghĩa vụ đi theo CLB.
3. Nộp UC14 chưa đổi trạng thái; duyệt mới `Suspended` và huỷ sự kiện tương lai; kích hoạt lại
   không khôi phục sự kiện; giải thể đi theo học kỳ và chỉ cảnh báo ngân sách, không chặn.

Quay lại hoặc chạy thử trên máy mình (stack riêng của Người 2: server `:3102`, client `:5182`):

```bash
T=outputs/ucms-demo-tools
$T/stack.sh 2 reset && $T/stack.sh 2 up && eval "$($T/stack.sh 2 env)"
(cd server && MONGO_URI="$MONGO_URI" npm run seed:defense:p2)
node $T/record-p2.mjs            # hoặc mở http://localhost:5182 và tự thao tác
```

Lần quay làm thay đổi dữ liệu, nên mỗi lần tập lại phải `reset` + seed. Trước buổi bảo vệ, kiểm
tra trên môi trường trình chiếu: lịch năm học có học kỳ kế tiếp, CLB có sự kiện tương lai, và
có sẵn phiên đăng nhập của Leader mới. Kịch bản chi tiết:
[flow 4](../../docs/08-defense-scripts/flow-04-leadership-transition.md),
[flow 10](../../docs/08-defense-scripts/flow-10-club-lifecycle.md).
