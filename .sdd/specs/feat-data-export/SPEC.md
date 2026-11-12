# SPEC: feat-data-export

> UC55 — Xuất dữ liệu và báo cáo. Người dùng duyệt xuất `xlsx` + `pdf` và cài thư viện (2026-10-10).

## Vấn đề
ICPDP cần lấy dữ liệu ra file để báo cáo nhà trường mà không tổng hợp tay.

## Quyết định
- **Loại dữ liệu cố định** (FR-01): `CLUBS` (CLB và trạng thái), `MEMBERS` (thành viên theo CLB), `EVENTS`
  (sự kiện kèm đăng ký và điểm danh), `FINANCE` (ngân sách, giải ngân, đối soát), `COMPLIANCE` (vi phạm và
  góp ý/khiếu nại), `EVALUATIONS` (kết quả đánh giá đã công bố, mỗi dòng một CLB, cột D1–D8 + tổng + xếp
  loại — cũng là bảng so sánh A1).
- **Bộ lọc** (FR-02): học kỳ (theo lịch năm học của policy) **hoặc** khoảng ngày, CLB, trạng thái. Xem trước số
  dòng trước khi xuất.
- **Định dạng**: `xlsx`, `csv` cho mọi loại; `pdf` cũng mở cho mọi loại (SRS chỉ bắt buộc cho đánh giá).
  Thư viện: `exceljs`, `pdfkit` + font `dejavu-fonts-ttf` (đủ dấu tiếng Việt).
- **Đầu file** (FR-05): thời điểm xuất, người xuất, bộ lọc.
- **Hiển thị như màn hình** (FR-04/06): điểm danh chỉ tính khi sự kiện đã chốt; góp ý ẩn danh không xuất
  danh tính; đánh giá chỉ bản `Published`.
- **Không có dữ liệu** → 404, không tạo file (E1). Chỉ `ICPDP_OFFICER` (E2). Mỗi lần xuất ghi audit (FR-07).
- Loại chưa có dữ liệu trong hệ thống (tài chính, vi phạm, đánh giá) vẫn chạy và trả "không có dữ liệu".

## Hành vi
- `GET /admin/exports/options` → loại dữ liệu, học kỳ, CLB, trạng thái theo loại.
- `POST /admin/exports/preview` `{ type, filter }` → `{ rowCount }`.
- `POST /admin/exports` `{ type, filter, format }` → file tải về (`Content-Disposition: attachment`).

## Tiêu chí nghiệm thu
- [x] Không phải ICPDP → 403; bộ lọc sai → 400; không có dòng → 404.
- [x] Mỗi loại trả đúng cột; lọc theo học kỳ/khoảng ngày, CLB, trạng thái.
- [x] Điểm danh chưa chốt không ra số; góp ý ẩn danh không có tên/email; chỉ đánh giá `Published`.
- [x] File xlsx/csv/pdf hợp lệ, có dòng đầu thời điểm/người xuất/bộ lọc; mỗi lần xuất có audit.

## Bổ sung v1.1.0 — Báo cáo tổng hợp nhiều loại dữ liệu trong một file
Yêu cầu của người dùng (2026-11-12): ICPDP xuất được một bản báo cáo đầy đủ gồm kết quả hoạt động
các CLB, các sự kiện diễn ra trong năm và ngân sách chi cho từng CLB hàng năm.

- **Chọn nhiều loại**: form xuất cho tick nhiều loại dữ liệu và có nút "Chọn tất cả". Request đổi
  từ `type` sang `types` (mảng, ít nhất 1, không trùng).
- **Một file `xlsx`, mỗi loại một sheet**, đứng trước là sheet "Thông tin" ghi thời điểm xuất, người
  xuất, bộ lọc và danh sách sheet kèm số dòng (FR-05). Chọn từ hai loại trở lên thì chỉ được xuất
  `xlsx`; `csv`/`pdf` vẫn dành cho một loại.
- **Bộ lọc** kỳ / khoảng ngày / CLB áp dụng chung cho mọi loại đã chọn. Lọc theo trạng thái chỉ
  dùng được khi chọn đúng một loại, vì mỗi loại có danh sách trạng thái riêng.
- **Loại mới `CLUB_BUDGETS` — "Ngân sách theo CLB"**: mỗi dòng một CLB trong phạm vi lọc, gồm số
  ngân sách, tổng được duyệt, tổng đã giải ngân, tổng chi thực tế đã quyết toán, số phải hoàn/đã
  hoàn và số ngân sách chưa đối soát. CLB không có ngân sách trong phạm vi vẫn có dòng với số 0.
  Số liệu lấy từ cùng nguồn với loại `FINANCE` nên tổng của hai sheet khớp nhau.
- **Xem trước** trả số dòng của từng loại đã chọn: `{ rowCount, types: [{ type, rowCount }] }`.
- **Tên file** nhiều loại: `bao-cao-tong-hop-<yyyy-mm-dd>.xlsx`; một loại giữ tên cũ. Mỗi loại có tên sheet ngắn
  riêng (`EXPORT_SHEET_NAMES`) vì Excel giới hạn 31 ký tự và cấm `[]:*?/\`.
- **`CLUB_BUDGETS` khi không có ngân sách nào trong phạm vi** (kể cả khi lọc một CLB không có ngân sách): loại này
  rỗng như mọi loại khác (404 nếu xuất riêng, sheet "Không có dữ liệu" nếu xuất chung), không sinh bảng toàn số 0.
  "Chưa đối soát" = ngân sách ở trạng thái `Approved`, `Disbursed`, `Settlement Submitted`, `Reconciliation Pending`.
  Không có bộ lọc trạng thái cho loại này.
- **Không có dữ liệu**: 404 khi mọi loại đã chọn đều rỗng. Khi chỉ một số loại rỗng, sheet của loại
  đó vẫn có tiêu đề cột và một dòng "Không có dữ liệu khớp bộ lọc".
- **Audit**: mỗi loại trong lần xuất ghi một bản ghi như cũ (FR-07).
- Giữ nguyên: chỉ `ICPDP_OFFICER`; đánh giá chỉ bản `Published`; điểm danh chỉ khi đã chốt; không
  xuất danh tính người gửi góp ý ẩn danh.

Tiêu chí nghiệm thu bổ sung:
- [x] Chọn `EVALUATIONS` + `EVENTS` + `CLUB_BUDGETS` với khoảng ngày cả năm → một file `xlsx` có sheet
  "Thông tin" và ba sheet dữ liệu đúng cột.
- [x] Hai loại trở lên với `csv`/`pdf`, hoặc kèm bộ lọc trạng thái → 400.
- [x] Mọi loại rỗng → 404; một loại rỗng → sheet đó có dòng "Không có dữ liệu khớp bộ lọc".
- [x] Tổng được duyệt và tổng giải ngân của `CLUB_BUDGETS` bằng tổng tương ứng của `FINANCE` cùng bộ lọc.
- [x] Mỗi loại trong một lần xuất có một bản ghi audit.
- [x] Xuất một loại vẫn hoạt động như trước với cả ba định dạng.

## Ngoài phạm vi
Lập lịch xuất định kỳ, gửi file qua email.

## Changelog
- v1.1.0 (2026-11-12) — người dùng yêu cầu: xuất nhiều loại trong một file `xlsx`, thêm loại `CLUB_BUDGETS`.
- v1.0.0 (2026-10-10) — được người dùng duyệt.
