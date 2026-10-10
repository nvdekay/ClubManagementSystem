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

## Ngoài phạm vi
Lập lịch xuất định kỳ, gửi file qua email.

## Changelog
- v1.0.0 (2026-10-10) — được người dùng duyệt.
