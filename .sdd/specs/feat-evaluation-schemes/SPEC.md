# SPEC: feat-evaluation-schemes

> UC41 — Cấu hình scheme đánh giá. Người dùng duyệt các quyết định (2026-10-10).

## Vấn đề
ICPDP cần định nghĩa cách chấm điểm CLB cho mỗi học kỳ (UC42/UC43 dùng sau), theo bảng điểm chung D1–D8
(BR60), mà không phải hiểu công thức hay field kỹ thuật.

## Quyết định
- **Kỳ đánh giá** chọn từ mã học kỳ trong `academicCalendar` của policy đang hiệu lực.
- **Danh mục D1–D8** cố định trong code (tên + mô tả "đo bằng gì", SRS §9); ICPDP không sửa cách tính.
  D1–D3 luôn có, trọng số > 0; D4–D8 bật/tắt.
- **Trọng số** là số nguyên %, tổng phải đúng 100 để kích hoạt (BR29). UI có "Chia đều".
- **Chấm tay** (`allowsManual`) bật/tắt theo tiêu chí; mặc định bật cho D4–D8.
- **Ngưỡng xếp loại** 4 mức cố định tên: Xuất sắc ≥ 85, Tốt ≥ 70, Khá ≥ 50, Cần cải thiện (< Khá); ICPDP
  sửa số, phải giảm dần và > 0.
- **Vòng đời** `Draft → Active → Superseded`: nháp sửa/xoá được; kích hoạt kiểm tra BR29/BR60; mỗi kỳ đúng
  một `Active`, kích hoạt bản mới thì bản cũ thành `Superseded`. `Active`/`Superseded` không sửa được —
  "Tạo bản sửa" chép thành nháp version mới (BR51). Tạo mới có thể sao chép từ một scheme bất kỳ (A1).
- Mọi thay đổi ghi audit `EvaluationScheme`. Chỉ `ICPDP_OFFICER`. Không đổi schema.

## Hành vi
- `GET /admin/evaluation-schemes` → `{ schemes, periods, dimensions }`.
- `POST /admin/evaluation-schemes` `{ periodCode, copyFromId? }` → nháp mới (version tăng theo kỳ).
- `PATCH /admin/evaluation-schemes/:id` `{ dimensions, thresholds }` → chỉ khi `Draft`.
- `POST /admin/evaluation-schemes/:id/activate` → 400 kèm `issues` khi chưa hợp lệ.
- `DELETE /admin/evaluation-schemes/:id` → chỉ xoá nháp.

## Tiêu chí nghiệm thu
- [x] Không phải ICPDP → 403; kỳ không có trong lịch học kỳ → 400.
- [x] Nháp mặc định đủ D1–D8, tổng 100, D4–D8 cho chấm tay; sao chép giữ nguyên cấu hình nguồn.
- [x] Từ chối lưu: thiếu D1–D3, mã lạ/trùng, trọng số âm/không nguyên/> 100, ngưỡng không giảm dần.
- [x] Kích hoạt bị từ chối khi tổng ≠ 100 hoặc D1–D3 = 0; kích hoạt bản mới làm bản cũ `Superseded`.
- [x] Không sửa/xoá scheme đã kích hoạt; "tạo bản sửa" ra version mới.

## Ngoài phạm vi
UC42/UC43 (sinh, chốt, công bố đánh giá).

## Changelog
- v1.0.0 (2026-10-10) — được người dùng duyệt.
