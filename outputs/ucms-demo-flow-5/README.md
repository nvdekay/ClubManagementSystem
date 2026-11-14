# Video tập demo flow 5 — Sự kiện CLB

Video quay giao diện UCMS cho phần của người trình bày 3: tổ chức, tham gia và tổng kết sự kiện CLB
(UC25–UC34, UC48–UC49). Mỗi đoạn có gợi ý lời nói dưới màn hình, vòng trỏ ở chỗ thao tác và thẻ
chuyển vai giữa các cảnh.

## Xem video

**[Bản đầy đủ — 4 phút 28 giây](UCMS-demo-flow-5.mp4)**, MP4 H.264, 1920 × 1080, 30 fps, không có
âm thanh. File đã gắn chapter; thời gian chờ giữa các lần chuẩn bị cảnh đã được cắt.

| Mốc trong bản đầy đủ | Nội dung | Video riêng |
|---|---|---|
| 00:00 | Đề xuất, phê duyệt và công bố | [Chương 1 — 1 phút 26 giây](01-de-xuat-va-phe-duyet.mp4) |
| 01:25 | Đăng ký, check-in và phản hồi | [Chương 2 — 1 phút 19 giây](02-dang-ky-check-in-phan-hoi.mp4) |
| 02:44 | Chốt điểm danh và báo cáo sau sự kiện | [Chương 3 — 1 phút 44 giây](03-chot-diem-danh-va-bao-cao.mp4) |

## Phạm vi bản quay

Chín cảnh, mỗi cảnh một vai ngồi một lượt:

1. **Club Leader** (Nguyễn Minh An) nộp lại đề xuất "Workshop Git & GitHub cho người mới bắt đầu"
   đã bị trả sửa → `Pending Approval`, bản 2 nằm cạnh bản 1.
2. **ICPDP Officer** mở hồ sơ từ hàng đợi (nhận thẩm định → `Under Review`), xem phần thay đổi so
   với bản 1, chọn quyết định tài trợ cho khoản kinh phí, ghi điều kiện kèm theo, phê duyệt → `Approved`.
3. **Club Leader** công bố với khung đăng ký và check-in mặc định, bật danh sách chờ → `Upcoming`,
   có mã check-in.
4. **Student** (Phạm Hoàng Duy) đăng ký sự kiện vừa công bố → `Confirmed`, xem trang đăng ký của mình.
5. **Club Member** (Lê Ngọc Chi, thành viên `Active` không giữ chức) xem buổi mentoring đã đủ 4/4 với
   danh sách chờ #1, #2, rồi mở talkshow đang diễn ra để lấy mã check-in.
6. **Student** nhập mã check-in talkshow (ghi nhận có mặt), sau đó gửi phản hồi 5 sao kèm nhận xét.
7. **Club Member** mở "Workshop Docker cơ bản" đã kết thúc, xác nhận vắng mặt cho Trịnh Yến Nhi kèm
   lý do, rồi chốt điểm danh.
8. **Club Leader** chọn Workshop Docker ở báo cáo sau sự kiện (số liệu nạp sẵn 6 đăng ký / 5 có mặt /
   1 vắng, điểm phản hồi 4,5/5), ghi kết quả thực tế, lưu nháp và nộp; sau đó so sánh phản hồi: Workshop
   Docker đủ ngưỡng (4 phản hồi) hiện điểm và nhận xét, talkshow 1 phản hồi bị ẩn.
9. **ICPDP Officer** chọn báo cáo, nhận thẩm định, ghi lý do và chấp nhận → sự kiện `Closed`.

Chạy trên stack riêng của người 3: server `:3103`, client `:5183`, database `ucms_video_p3` (bản
sao trạng thái cuối của video flow 1–3). Không đổi mã nguồn ứng dụng, không đụng database `ucms`.
Phiên đăng nhập cấp sẵn qua session service; không quay Google OAuth.

## Seed chuẩn bị gì, giao diện làm gì

Seed: `server/src/infra/db/seed-defense-p3.ts` (`npm run seed:defense:p3`). Ghi qua repository và
use case thật (tạo/nộp/lưu đề xuất, nhận và quyết định thẩm định, công bố, đăng ký, check-in, phản hồi,
job vòng đời sự kiện). Chạy lại an toàn: mỗi sự kiện được bỏ qua nếu CLB đã có sự kiện cùng tên; nếu
database chưa có cast hoặc CLB thì seed tự tạo.

| Sự kiện của CLB Sáng tạo Công nghệ FPTU | Seed để ở trạng thái | Làm live trong video |
|---|---|---|
| Workshop Git & GitHub cho người mới bắt đầu (sau 10 ngày, 60 chỗ, xin 1.800.000đ) | Bản 1 đã nộp, ICPDP yêu cầu sửa phần nội dung và kinh phí; CLB đã lưu bản sửa (thêm thực hành, còn 1.200.000đ) — `Revision Requested` | Nộp lại, ICPDP nhận và phê duyệt, Leader công bố, Duy đăng ký |
| Mentoring 1-1 cùng kỹ sư phần mềm (sau 8 ngày, 4 chỗ) | `Upcoming`, đang mở đăng ký, 4 `Confirmed` + 2 `Waitlisted` (#1 Ngô Quang Minh, #2 Trịnh Yến Nhi) | Chỉ xem thứ tự danh sách chờ |
| Talkshow: AI trong học tập và nghiên cứu (bắt đầu 30 phút trước khi seed, dài 2,5 giờ) | `Ongoing`, khung check-in đang mở, 5 đăng ký trong đó Duy, 3 người đã tự check-in | Duy check-in và gửi phản hồi |
| Workshop Docker cơ bản (kết thúc 2 ngày trước) | `Completed`, 6 đăng ký, 5 tự check-in, Nhi không check-in, chưa chốt điểm danh, 4 phản hồi (5, 4, 5, 4) | Xác nhận vắng, chốt điểm danh, nộp báo cáo, ICPDP chấp nhận |

Thêm vào cast chung 7 sinh viên `@fpt.edu.vn` (giang, hai, khanh, linh, minh, nhi, phuc `.demo`) làm
người đăng ký và người phản hồi.

Hai điểm seed phải làm khác cách thông thường:

- **Hạn báo cáo sau sự kiện.** Policy gốc không có hạn `POST_EVENT` và chỉ có hiệu lực từ hôm nay, nên
  sự kiện đã kết thúc không có hạn báo cáo (trang báo cáo báo "chưa cấu hình"). Seed thêm một bản sao
  policy hiện hành có hạn `POST_EVENT` (7 ngày sau khi kết thúc), hiệu lực từ 01/01/2000, giống
  `seed-guide.ts`. Hệ quả: trên `/workspace/event-reports`, 21 sự kiện công khai cũ cũng có hạn và hiện
  là quá hạn trong danh sách chọn.
- **Sự kiện đã diễn ra.** Ghế Chủ nhiệm của An chỉ có hiệu lực từ hôm nay (CLB được duyệt ở flow 2), nên
  không thể đề xuất một sự kiện với thời điểm trong quá khứ. Talkshow và Workshop Docker được đề xuất,
  duyệt và công bố với lịch trong tương lai, rồi toàn bộ hồ sơ (sự kiện, các bản nộp, task, quyết định,
  audit, thông báo) được dời về quá khứ trước khi có người đăng ký. Vì vậy lịch sử đề xuất của hai sự kiện
  này nằm trước ngày CLB được thành lập; video không mở các màn đó.

## Trạng thái cuối đã kiểm tra trong database

Đối chiếu `ucms_video_p3` sau lần quay cuối (14/11/2026), từ `reset` + seed + chạy cả kịch bản:

| Sự kiện | Trạng thái | Đăng ký | Điểm danh | Phản hồi | Khác |
|---|---|---|---|---|---|
| Workshop Git & GitHub | `Upcoming` (bản 2) | 1 `Confirmed` (Duy) | — | — | Ngân sách `Approved` 1.200.000đ; quyết định: Request revision rồi Approve |
| Mentoring 1-1 | `Upcoming` | 4 `Confirmed`, 2 `Waitlisted` | — | — | |
| Talkshow AI | `Ongoing` | 5 `Confirmed` | 4 có mặt (thêm Duy) | 1 (ẩn, dưới ngưỡng 3) | |
| Workshop Docker | `Closed` | 6 `Confirmed` | 5 có mặt, 1 `no-show` có lý do, đã chốt | 4, trung bình 4,5 | Báo cáo bản 1 `Accepted` |

## Chỗ bản quay khác kịch bản trong tài liệu

Tài liệu: [`flow-05-club-events.md`](../../docs/08-defense-scripts/flow-05-club-events.md).

- Dùng **một** hồ sơ đi liền từ nộp lại → duyệt → công bố → sinh viên đăng ký, thay vì một hồ sơ nháp
  và một hồ sơ `Approved` riêng. Hồ sơ này cũng là "hồ sơ có lịch sử trả sửa".
- Danh sách chờ chỉ được **chỉ ra**, không bấm đẩy người đầu hàng (sự kiện đang đủ chỗ nên không có
  suất trống); thao tác đổi sức chứa để lại cho Q&A.
- Không bấm check-in lần hai để minh hoạ "không tạo bản ghi thứ hai"; chỉ nói trong lời gợi ý.
- Hiệu chỉnh và chốt điểm danh do **Club Member** làm (đúng quyền mặc định), không phải Leader.
- Báo cáo: Leader soạn và nộp **live** trên sự kiện vừa chốt điểm danh, rồi ICPDP chấp nhận; tài liệu
  gợi ý dùng báo cáo nộp sẵn. Bản quay chỉ điền ô "Kết quả thực tế", không thêm minh chứng.
- Phần lịch bảo vệ (Live Defense Room) và các nhánh trả sửa/từ chối/huỷ/đổi lịch không có trong video;
  để dành cho Q&A.
- Workshop Docker không có ngân sách nên số liệu báo cáo hiện "Không có ngân sách".
- Ghi nhận khi đối chiếu code: trạng thái `Report Submitted` chưa có nhãn tiếng Việt ở bảng sự kiện CLB
  (`clubEvents`), nên video tránh hiện bảng đó khi có sự kiện ở trạng thái này. Đây là lỗ hổng i18n của
  ứng dụng, không sửa trong phạm vi bản quay.

## Cách tập

Đọc dòng gợi ý dưới video rồi nói lại bằng lời của bạn; chỉ mô tả kết quả khi trạng thái mới đã hiện
trên màn hình. Điểm cần nhấn:

1. Một cấp duyệt ICPDP; số được duyệt lưu riêng với số xin; điều kiện duyệt được đối chiếu khi báo cáo.
2. Duyệt, công bố, đăng ký, check-in, chốt điểm danh là các bước riêng, mỗi bước xác nhận một việc.
3. Mọi thành viên `Active` có quyền điểm danh; Leader mới quản lý đề xuất, báo cáo và xem phản hồi.
4. Phản hồi dưới ngưỡng tối thiểu bị ẩn; bản tổng hợp không kèm danh tính người gửi.

Dựng lại và quay lại (mỗi lần quay làm thay đổi dữ liệu, nên luôn bắt đầu từ `reset`):

```bash
T=outputs/ucms-demo-tools
$T/stack.sh 3 reset && $T/stack.sh 3 up && eval "$($T/stack.sh 3 env)"
(cd server && MONGO_URI="$MONGO_URI" npm run seed:defense:p3)
node $T/record-p3.mjs
```

Talkshow chỉ mở check-in trong khoảng 2,5 giờ kể từ 30 phút trước lúc seed, nên hãy quay ngay sau khi
seed. Trước buổi bảo vệ, kiểm tra lại đăng nhập Google và khung giờ trên môi trường trình chiếu.
