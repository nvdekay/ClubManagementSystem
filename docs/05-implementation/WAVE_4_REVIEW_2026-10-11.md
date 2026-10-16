# Review Wave 4 — 11/10/2026

> **Tài liệu lịch sử.** Nội dung bên dưới ghi lại quyết định tại thời điểm lập tài liệu;
> checkbox và mô tả RBAC/UC23 cũ không phải trạng thái release hiện hành.
> Trạng thái API/UI và khoảng trống triển khai: [CURRENT_IMPLEMENTATION.md](../CURRENT_IMPLEMENTATION.md).


## Kết luận

Wave 4 chưa đạt nghiệm thu. Có hai lỗi nghiệp vụ đã tái hiện với repository và MongoDB thật;
API UC36/UC37 chưa được nối ở server chính, còn UC33/UC34 cần policy POST_EVENT hợp lệ.
Guide book và ảnh chụp được bàn giao riêng tại [06-user-guide](../06-user-guide/README.md).

Review không thay các quyết định BR25/BR58 đang chờ xác nhận, không thay schema hoặc `.env`.

## Phát hiện

### W4-01 · P1 · API tài chính chưa hoạt động ở server chính

**Vị trí:** `server/src/main.ts` phần dependency của `buildApp` (khoảng dòng 89–103);
`server/src/interface/http/server.ts` phần gắn `eventFinanceRoutes`.

`main.ts` truyền `budgetDisbursementRepo` và `postEventReportRepo` nhưng không truyền
`eventFinanceRepo`. Route chỉ được gắn khi dependency này tồn tại. CLB vẫn có liên kết
“Khoản chi và quyết toán”, và màn UC35 vẫn có liên kết “Đối soát quyết toán”, nhưng API
UC36/UC37 tương ứng chưa hoạt động ở server thật.

Đây là blocker đã ghi trong bàn giao, không phải regression mới. Cần chốt BR25/BR58 rồi nối
repository, chạy seed và nghiệm thu cả UI/API thật. Không dùng kết quả test fixture để
đánh dấu phần này hoàn tất.

### W4-02 · P2 · Đối soát A2 quá hạn có thể sinh khoản cấp bù

**Vị trí:** `server/src/infra/db/mongo-event-finance-repository.ts:392` và lời gọi
`reconcileExpenses` ở dòng 405; `server/src/domain/event-finance.ts`.
**Đối chiếu:** FR-UC37-10, BR57/BR58; SRS mô tả A2 kết thúc ở `Recovery Pending`.

Tái hiện với MongoDB trong database test riêng:

1. Ngân sách duyệt 200 VND, đã tạm ứng 100 VND; hạn quyết toán đã qua 6 ngày, chưa nộp.
2. Ghi khoản chi 150 VND có RECEIPT.
3. Officer gọi `finalize` với `overdue: true`, chấp nhận khoản chi.
4. Kết quả thực tế: `Reconciled`, `settlementBalance = 50`, `recoveryAmount = 0`.
5. UC35 sau đó cho cấp bù 50 VND dù hồ sơ đi theo nhánh xử lý CLB không nộp quyết toán.

Nhánh A2 chỉ kiểm tra hạn và trạng thái, rồi dùng công thức của quyết toán thông thường.
Cần chốt cách xử lý chi có chứng từ vượt tạm ứng trong A2, tách quy tắc A2 khỏi nhánh thường
và thêm regression test cho chênh lệch âm, bằng 0, dương. Chưa tự chọn công thức mới vì
SPEC chưa phủ trường hợp này.

### W4-03 · P2 · Báo cáo bị trả sửa có thể bị ghi thành hoàn toàn chưa nộp

**Vị trí:** `server/src/infra/db/mongo-post-event-report-repository.ts` phần tính
`obligation.overdue` và action `overdue` (khoảng dòng 237 và 379).
**Đối chiếu:** FR-UC34-04: ghi nhận việc **hoàn toàn không nộp báo cáo**.

Tái hiện với MongoDB thật:

1. Sự kiện đã kết thúc 20 ngày; CLB lưu và nộp báo cáo.
2. Officer claim rồi trả báo cáo về sửa.
3. Latest version là `Returned for correction`, vẫn có `submittedAt` và snapshot đã nộp.
4. `obligation.overdue` trở lại `true` vì latest state không phải Submitted/Accepted.
5. Officer gọi action `overdue`: transaction thành công và tạo audit `REPORT_OVERDUE`.

Không thể coi lịch sử có báo cáo đã nộp là hoàn toàn chưa nộp. Cần tách “chậm bổ sung” với
“chưa từng nộp”, kiểm tra lịch sử version tại commit và cập nhật điều kiện hiển thị nút ở UI.
Báo cáo nộp trễ vẫn phải giữ `lateFlag` để phục vụ đánh giá.

### W4-04 · P2 · Một sự kiện thiếu policy deadline làm lỗi cả danh sách báo cáo

**Vị trí:** `mongo-post-event-report-repository.ts` phần `list` dùng `Promise.all` trên
mọi sự kiện; `post-event-report-deadlines.ts:27` chọn policy tại `event.endAt`.

Database local có policy hiệu lực từ 10/10/2026 chỉ chứa PERIODIC. API danh sách báo cáo
trả `503 post-event report deadline is not configured`. Trong database demo riêng, thêm
policy POST_EVENT ở thời điểm hiện tại vẫn chưa đủ: các sự kiện cũ kết thúc trước policy đó
làm `detail` ném lỗi, khiến cả danh sách gồm các sự kiện mới có policy hợp lệ cũng trả 503.

Cần hiển thị lỗi cấu hình theo từng nghĩa vụ hoặc cung cấp quy trình migration policy cho
sự kiện lịch sử. Không âm thầm lấy policy mới để thay hạn thật. Database guide dùng policy
lịch sử mẫu riêng để chụp; database nguồn giữ nguyên.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `npm run check` trước khi sửa seed | Constitution, lint, typecheck và 425 test / 87 file xanh, gồm integration Mongo |
| `npm run build -w client` | Thành công; còn cảnh báo bundle lớn hiện có |
| Playwright wave 4 | 32 trường hợp: en/vi × sáng/tối × 390/1440 px × 4 màn; không lỗi JS, không tràn ngang |
| Hai reproduction W4-02/W4-03 | Repository + Mongo thật, database test riêng; kết quả đúng như mô tả trên |
| API trên database nguồn | Auth và các module đã nối hoạt động; danh sách báo cáo trả 503 vì policy |
| API trên `ucms_guide_demo` | Báo cáo, khoản chi, thẩm định, đối soát, cấp bù và hoàn trả đọc dữ liệu Mongo thật |

Google OAuth không được kiểm thử lại: browser dùng phiên local do SessionService cấp cho
actor đã seed. Không sửa middleware hoặc bỏ kiểm tra quyền/CSRF để chụp ảnh.

## Seed và ảnh hướng dẫn

- Đã chạy seed công khai và seed demo trên database nguồn.
- Phát hiện và sửa lỗi chạy lại seed khi đổi owner: bộ đăng ký sự kiện festival trước đây
  kiểm tra mỗi owner rồi tạo cả nhóm, gây E11000 nếu các thành viên nhóm đã có đăng ký.
  Nay từng cặp event/student dùng `$setOnInsert`, và số confirmed được tính từ dữ liệu thật.
- Thêm `server/src/infra/db/seed-guide.ts`, tạo riêng `ucms_guide_demo`; không ghi policy vào
  database nguồn. Copy dữ liệu nghiệp vụ một lần, không copy `authSessions`.
- Seed wave 4 tạo đủ 4 sự kiện mẫu, 4 khoản chi, 3 chứng từ; có điểm danh đã chốt, phản hồi,
  báo cáo Draft/Submitted/Returned, lịch sử version, task và ngân sách chờ cấp bù/hoàn trả.
- Chứng từ `example.org` là placeholder demo; không phải chứng từ thanh toán thật.
- Guide ghi nguồn từng ảnh trong `images/manifest.json`; ảnh cuối dùng API thật và dữ liệu
  seed, không dùng route interception. Chính sách 7 ngày báo cáo/14 ngày hoàn trong database
  này chỉ là policy mẫu cho demo.

## Thứ tự xử lý tiếp

1. Chốt BR25/BR58 và trường hợp biên A2 của W4-02.
2. Sửa W4-03, xử lý lỗi cấu hình theo từng nghĩa vụ ở W4-04 và thêm regression test.
3. Nối API tài chính vào server chính với policy đã chốt, cấu hình POST_EVENT đúng nghiệp vụ.
4. Seed, demo Google OAuth và các nhánh accept/return/finding, đối soát 0/dương/âm, hoàn một
   phần/hoàn đủ; chỉ khi đó đánh dấu Wave 4 nghiệm thu.
