# SPEC: feat-annual-evaluation-report

> Mở rộng UC55 (nhánh A2) — Báo cáo tổng hợp đánh giá CLB theo năm học gửi nhà trường.

## Vấn đề
Cuối năm học ICPDP phải báo cáo nhà trường về hiệu quả hoạt động của toàn bộ CLB. Hệ thống đã
công bố đánh giá theo từng học kỳ (UC43) và xuất được bảng so sánh của **một** kỳ (UC55 A1),
nhưng để có bức tranh cả năm officer vẫn phải xuất từng kỳ rồi ghép tay, tự tính trung bình, tự
đếm xếp loại. Tính năng này sinh một bản báo cáo năm hoàn chỉnh từ các đánh giá đã công bố.

## Hiện trạng đã khảo sát
- Hệ thống chỉ có **học kỳ**, không có thực thể năm học: `AcademicSemester { code, startAt, endAt }`
  trong `academicCalendar` của policy (UC04).
- `code` là chuỗi tự do 1–50 ký tự, chỉ bị ràng buộc không trùng (không phân biệt hoa thường).
  Dữ liệu seed theo quy ước của Đại học FPT: `Spring 2027`, `Summer 2026`, `Fall 2026`
  (`seed.ts`: Spring tháng 1–4, Summer tháng 5–8, Fall tháng 9–12).
- Đánh giá lưu `periodCode` bằng đúng `code` của học kỳ; mỗi kỳ có scheme và bộ ngưỡng xếp loại
  riêng (`SchemeThresholds`).
- `academicCalendar` của policy đang hiệu lực không bảo đảm còn giữ các học kỳ đã qua, nên không
  dùng nó để liệt kê năm học.

## Giả định
- **ASM-AR-01** — Nhóm chưa có mẫu báo cáo chính thức của nhà trường. Spec giả định ICPDP nộp cho
  Ban Giám hiệu, mỗi năm một lần sau khi công bố đánh giá kỳ `FALL`, một văn bản "Báo cáo tổng kết
  hoạt động Câu lạc bộ năm học" gồm sáu phần: (I) Tổng quan phong trào, (II) Kết quả đánh giá và
  xếp loại, (III) Kết quả theo tám tiêu chí, (IV) Tài chính, (V) Tuân thủ và các CLB cần lưu ý,
  (VI) Thành tích nổi bật và kiến nghị của ICPDP.
- **ASM-AR-02** — Nhà trường đọc số liệu tổng hợp và danh sách xếp loại, không cần dữ liệu cá
  nhân; báo cáo không chứa tên, mã số hay email của sinh viên.
- **ASM-AR-03** — Mọi số liệu trong báo cáo phải là số ICPDP đã xác nhận: đánh giá `Published` và
  báo cáo định kỳ `Accepted`. Dữ liệu đang chờ duyệt không được đưa vào.
- Khi có mẫu thật, chỉ cần đổi thứ tự và tên các phần; nguồn dữ liệu bên dưới không đổi.

## Quyết định
- **Năm học** là ba học kỳ cùng một năm, theo thứ tự `SPRING → SUMMER → FALL` (quy ước Đại học
  FPT). Năm học không được lưu thành thực thể mới mà suy ra từ `periodCode`.
- **Nhận diện học kỳ**: `periodCode` khớp mẫu `<mùa> <năm>`, không phân biệt hoa thường, cho phép
  có hoặc không có khoảng trắng, với mùa là `SPRING`, `SUMMER` hoặc `FALL` và năm gồm 4 chữ số
  (`Fall 2026`, `FALL 2026`, `fall2026` đều là kỳ `FALL` của năm 2026). Hàm phân tích là hàm thuần
  trong `domain`.
- **Mã không khớp mẫu** không thuộc năm học nào và không vào báo cáo năm; vẫn xuất được theo kỳ
  qua UC55 A1. Tính năng này không siết lại quy tắc nhập `code` ở UC04.
- **Danh sách năm học** để chọn lấy từ `periodCode` của các đánh giá `Published`, không lấy từ
  `academicCalendar`.
- **Ba nguồn dữ liệu**, đều đã qua ICPDP xác nhận; báo cáo không tính lại điểm và không đọc dữ
  liệu vận hành thô:
  1. Đánh giá `Published` (BR30) — điểm, xếp loại, điểm tám tiêu chí D1–D8, chỉ số thô. Với mỗi
     CLB và mỗi kỳ, lấy bản `Published` có `revisionNo` lớn nhất.
  2. Báo cáo định kỳ `Accepted` (UC39) của các kỳ trong năm, lấy version được chấp nhận — số liệu
     tài chính trong `preloadedFigures.finance` và danh sách `achievements`.
  3. Danh sách CLB — trạng thái hiện tại và `createdAt`.
- **Chuẩn hoá giữa các CLB** dựa vào những gì đã có: mọi CLB điền cùng một mẫu báo cáo định kỳ của
  đợt (UC38), số liệu do hệ thống chụp chứ không do CLB tự khai, và mọi CLB được chấm theo cùng
  bảng điểm D1–D8 (BR60). Báo cáo năm không thêm bước chuẩn hoá nào.
- **Thành tích nổi bật do officer chọn**: màn xem trước liệt kê mọi thành tích trong các báo cáo
  định kỳ `Accepted`; officer tick tối đa 20 mục để in. Không chọn thì phần này bỏ trống.
- **Điểm năm** = trung bình cộng `totalScore` của các kỳ CLB có đánh giá `Published`, làm tròn một
  chữ số thập phân. Kỳ không có đánh giá không tính là 0.
- **Xếp loại năm** tính từ điểm năm theo ngưỡng của scheme thuộc kỳ muộn nhất trong năm có đánh giá
  `Published` (ưu tiên `FALL`, rồi `SUMMER`, rồi `SPRING`), để cả báo cáo dùng một bộ ngưỡng.
- **Xu hướng** so điểm kỳ đầu và kỳ cuối mà CLB có đánh giá trong năm: chênh từ +5 trở lên là
  `UP`, từ −5 trở xuống là `DOWN`, còn lại là `STABLE`; CLB chỉ có một kỳ thì để trống.
- **CLB thiếu kỳ** (thành lập giữa năm, tạm ngừng) vẫn được xếp loại trên các kỳ đã có, kèm cột
  "số kỳ có đánh giá" (`1/3`, `2/3`, `3/3`).
- **Năm chưa đủ ba kỳ** (ví dụ xuất khi `FALL` chưa công bố) vẫn xuất được; báo cáo ghi rõ "Báo cáo
  tạm tính" và liệt kê kỳ còn thiếu ngay ở đầu trang.
- **CLB không có đánh giá nào** trong năm vẫn nằm cuối bảng với ghi chú "Chưa có đánh giá" nếu đang
  `Active` hoặc `Suspended`; không tính vào các số thống kê.
- **Số liệu hoạt động** (sự kiện hoàn thành, lượt tham gia, vi phạm còn mở) lấy từ chỉ số thô
  trong `evidence` của chính các đánh giá đã công bố, nên luôn khớp với bảng điểm đã gửi cho CLB.
- **Số liệu tài chính** là tổng `approvedTotal` và `disbursedTotal` của các báo cáo định kỳ
  `Accepted`; CLB chưa có báo cáo được chấp nhận trong một kỳ thì kỳ đó không cộng và báo cáo ghi
  số CLB còn thiếu.
- **Biến động CLB**: số CLB theo trạng thái tại thời điểm xuất và số CLB có `createdAt` trong năm.
- **Định dạng**: `pdf` (bản gửi nhà trường) và `xlsx` (bản số liệu). Dùng `pdfkit` và `exceljs`
  đã cài; không thêm thư viện.
- **Nhận xét của ICPDP**: officer nhập tuỳ chọn một đoạn văn (tối đa 2000 ký tự) in ở cuối báo
  cáo. Đoạn này chỉ nằm trong file, không lưu vào cơ sở dữ liệu.

## Hành vi

### Nội dung báo cáo
- **Đầu trang**: "Báo cáo tổng kết hoạt động Câu lạc bộ năm học {năm}", các học kỳ có dữ liệu, kỳ
  còn thiếu (nếu có), thời điểm xuất, người xuất (FR-UC55-05).
- **I. Tổng quan phong trào**: số CLB theo trạng thái; số CLB thành lập trong năm; tổng thành viên
  active (theo kỳ muộn nhất), tổng sự kiện hoàn thành, tổng lượt tham gia.
- **II. Kết quả đánh giá và xếp loại**: số CLB được đánh giá; số CLB theo từng xếp loại năm; điểm
  năm trung bình toàn trường và của từng kỳ; bảng chi tiết mỗi dòng một CLB, giảm dần theo điểm
  năm: tên, lĩnh vực, trạng thái, điểm và xếp loại của `SPRING`, `SUMMER`, `FALL`, số kỳ có đánh
  giá, điểm năm, xếp loại năm, xu hướng; 5 CLB điểm năm cao nhất.
- **III. Kết quả theo tám tiêu chí**: điểm trung bình toàn trường của từng tiêu chí D1–D8 trong
  năm, tiêu chí cao nhất và thấp nhất. Tiêu chí `Insufficient data` không tính vào trung bình.
- **IV. Tài chính**: tổng ngân sách được duyệt, tổng đã giải ngân, tỉ lệ giải ngân; số CLB chưa có
  báo cáo định kỳ được chấp nhận.
- **V. Tuân thủ và các CLB cần lưu ý**: tổng vi phạm còn mở; các CLB xếp loại
  `NEEDS_IMPROVEMENT`; các CLB có xu hướng `DOWN`; các CLB `Suspended` hoặc `Dissolving`.
- **VI. Thành tích nổi bật và kiến nghị**: các thành tích officer đã chọn (tên CLB, tên thành
  tích, mô tả, học kỳ); nhận xét của ICPDP (nếu có).

Bản `xlsx` có ba sheet: "Tổng quan" (đầu trang, phần I, III, IV, V, VI), "Xếp loại" (bảng chi
tiết phần II) và "Tiêu chí" (mỗi dòng một CLB, cột là điểm trung bình năm của D1–D8).

### Endpoint
- `GET /admin/exports/options` hiện có trả thêm `annualYears`: mỗi phần tử gồm `year` và ba kỳ
  `SPRING`/`SUMMER`/`FALL` kèm `periodCode` và cờ đã có đánh giá `Published` hay chưa; năm mới
  nhất đứng trước.
- `POST /admin/exports/annual-report/preview` `{ year }` → toàn bộ nội dung báo cáo dạng JSON để
  hiển thị trên màn hình trước khi xuất, kèm danh sách thành tích có thể chọn, mỗi mục một `key`.
- `POST /admin/exports/annual-report` `{ year, format, remarks?, achievementKeys? }` → file tải về
  (`Content-Disposition: attachment`), tên file `bao-cao-danh-gia-clb-{năm}.{pdf|xlsx}`.

### Lỗi và trường hợp biên
- Không phải `ICPDP_OFFICER` → 403 (FR-UC55-10).
- `year` không phải số nguyên 4 chữ số, `format` ngoài `pdf`/`xlsx`, `remarks` quá 2000 ký tự,
  `achievementKeys` quá 20 mục hoặc có `key` không thuộc năm đó → 400.
- Năm không có đánh giá `Published` nào → 404, không tạo file (FR-UC55-09).
- Hai `periodCode` khác nhau cùng rơi vào một kỳ của một năm (ví dụ `Fall 2026` và `FALL2026`):
  gộp làm một kỳ; nếu một CLB có đánh giá ở cả hai mã thì lấy bản công bố muộn hơn.
- Mỗi lần xuất file ghi audit: người xuất, loại `ANNUAL_REPORT`, năm, số CLB (FR-UC55-07). Xem
  trước không ghi audit.
- Đánh giá `Draft`, `Data Ready`, `Under Review`, `Finalized` không bao giờ xuất hiện trong báo cáo.
- Báo cáo định kỳ chưa `Accepted` không đóng góp số liệu tài chính hay thành tích.
- Năm không có báo cáo định kỳ `Accepted` nào: phần IV ghi "Chưa có dữ liệu", các phần khác vẫn xuất.

### Giao diện
- Trang xuất dữ liệu của ICPDP có thêm mục "Báo cáo năm học": chọn năm → thấy ba kỳ và kỳ nào đã
  có dữ liệu → xem trước sáu phần → tick thành tích nổi bật → nhập nhận xét → tải `pdf` hoặc
  `xlsx`.
- Có trạng thái loading/error/empty, responsive, light/dark, i18n `en`/`vi`. Nội dung file luôn là
  tiếng Việt như các file xuất khác.

### Dữ liệu demo
- Seed demo hiện chỉ có scheme cho `Fall 2026` và chưa có đánh giá `Published` nào. Bổ sung đánh
  giá `Published` cho `Spring 2026`, `Summer 2026`, `Fall 2026` của các CLB demo, đủ để thấy cả ba
  xu hướng và một CLB thiếu kỳ; bổ sung báo cáo định kỳ `Accepted` có thành tích và số liệu tài
  chính cho cùng các kỳ.

## Tiêu chí nghiệm thu
- [ ] `Fall 2026`, `FALL 2026`, `fall2026` được nhận là kỳ `FALL` năm 2026; `Kỳ 1 2026` và
  `Winter 2026` không thuộc năm học nào.
- [ ] Thứ tự kỳ trong năm luôn là `SPRING`, `SUMMER`, `FALL`, không phụ thuộc thứ tự dữ liệu.
- [ ] Không phải ICPDP → 403; `year` sai → 400; năm không có đánh giá `Published` → 404.
- [ ] `annualYears` chỉ gồm các năm có ít nhất một đánh giá `Published`, kèm trạng thái ba kỳ.
- [ ] Điểm năm bằng trung bình các kỳ có đánh giá; kỳ thiếu không bị tính là 0.
- [ ] CLB có bản sửa sau công bố được tính theo bản `Published` có `revisionNo` lớn nhất.
- [ ] Xếp loại năm dùng ngưỡng của scheme thuộc kỳ muộn nhất có đánh giá `Published` trong năm.
- [ ] Xu hướng đúng ở ba trường hợp `UP`, `DOWN`, `STABLE` và để trống khi chỉ có một kỳ.
- [ ] Năm thiếu kỳ vẫn xuất được, đầu trang ghi "Báo cáo tạm tính" và tên kỳ còn thiếu.
- [ ] Đánh giá chưa `Published` và đánh giá của năm khác không ảnh hưởng tới bất kỳ con số nào.
- [ ] CLB `Active` không có đánh giá nằm cuối bảng với ghi chú và không tính vào thống kê.
- [ ] Số CLB theo xếp loại ở phần II cộng lại bằng số CLB được đánh giá.
- [ ] Điểm trung bình D1–D8 bỏ qua tiêu chí `Insufficient data` thay vì tính là 0.
- [ ] Tổng ngân sách và giải ngân chỉ cộng từ báo cáo định kỳ `Accepted`; báo cáo `Submitted` hay
  `Returned for correction` không được cộng.
- [ ] Chỉ thành tích có `key` được chọn mới vào file; không chọn thì phần thành tích trống.
- [ ] File và JSON xem trước không chứa tên, mã số hay email sinh viên.
- [ ] File `pdf` và `xlsx` hợp lệ, hiển thị đúng dấu tiếng Việt, có đầu trang và nhận xét.
- [ ] Mỗi lần xuất file có một bản ghi audit; xem trước thì không.
- [ ] `/docs` có hai endpoint mới và trường `annualYears`; `tests/unit/openapi.test.ts` xanh.
- [ ] Màn hình xem trước và tải file chạy được trên desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
- Thực thể năm học riêng, hoặc năm học vắt qua hai năm dương lịch.
- Bắt buộc `code` học kỳ ở UC04 phải theo mẫu `<mùa> <năm>`.
- Gửi báo cáo cho nhà trường qua email từ trong hệ thống; officer tải file rồi tự gửi.
- Nhận xét do AI sinh; biểu đồ trong file `pdf`.
- Lưu lại bản báo cáo đã xuất hoặc quy trình nhà trường phản hồi.
- Trọng số khác nhau giữa các học kỳ; cấu hình ngưỡng xu hướng trên giao diện.
- Lập lịch xuất tự động cuối năm.

## Changelog
- v1.0.0 (2026-11-12) — được người dùng duyệt.
- v0.3.0 (2026-11-12) — bản nháp, chưa duyệt. Thêm giả định về mẫu báo cáo sáu phần của nhà
  trường; bổ sung kết quả theo D1–D8, tài chính, biến động CLB và thành tích nổi bật do officer
  chọn; thêm nguồn báo cáo định kỳ `Accepted`.
- v0.2.0 (2026-11-12) — bản nháp, chưa duyệt. Đổi phạm vi từ "chọn 1–4 học kỳ" sang năm học
  Đại học FPT gồm `SPRING`, `SUMMER`, `FALL` cùng năm, suy ra từ `periodCode`.
- v0.1.0 (2026-11-12) — bản nháp đầu.
