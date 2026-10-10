# SPEC: feat-club-evaluations

> UC42 — Sinh bản nháp đánh giá hiệu quả CLB; UC43 — Xem lại, chốt và công bố đánh giá. Người dùng duyệt
> các quyết định (2026-10-10).

## Vấn đề
Scheme đánh giá (UC41) đã có nhưng ICPDP vẫn phải tự tổng hợp số liệu từng CLB. UC42 biến dữ liệu vận hành
của một học kỳ thành điểm từng tiêu chí D1–D8 kèm nguồn dữ liệu; UC43 cho cán bộ xem lại, chấm tay chỗ được
phép, chốt và công bố một bảng điểm chung cho mọi CLB.

## Quyết định
- Màn `/workspace/evaluations` (chọn học kỳ, sinh nháp, công bố) và `/workspace/evaluations/:id` (chi tiết).
- **Phạm vi**: CLB `Active` / `Suspended` / `Dissolving`. Học kỳ lấy từ lịch học kỳ của policy; phải có
  scheme `Active` của học kỳ đó (UC41), không có → 409.
- **Sinh nháp** (UC42): một nút tạo `Data Ready` cho mọi CLB chưa có bản nào trong kỳ; "Sinh lại" từng CLB
  (A1) khi còn `Data Ready` / `Under Review`, **giữ điểm chấm tay**.
- **Công thức** do hệ thống định nghĩa (BR60), mỗi tiêu chí 0–100, làm tròn 1 chữ số; dữ liệu trong học kỳ:
  - D1 = 50 × (check-in / đăng ký của sự kiện đã hoàn thành) + 50 × (người tham dự không trùng / thành viên
    đang hoạt động, tối đa 1). Không có lượt đăng ký → thiếu dữ liệu.
  - D2 = 50 × tỉ lệ người tham dự ngoài CLB + min(30, 10 × (sự kiện công khai đã hoàn thành + sự kiện cấp
    trường đã nhận lời)) + min(20, số đơn ứng tuyển).
  - D3 = (điểm phản hồi trung bình − 1) / 4 × 100; ít hơn `feedbackMinRespondents` (BR40) → thiếu dữ liệu.
  - D4 = sự kiện hoàn thành / (hoàn thành + bị huỷ) × 100.
  - D5 = báo cáo đúng hạn / báo cáo đến hạn × 100 (báo cáo định kỳ đến hạn + báo cáo sau sự kiện đã nộp).
  - D6 = khoản kinh phí không quá hạn quyết toán/hoàn trả / tổng khoản × 100.
  - D7 = 50 nếu có Chủ nhiệm đương nhiệm + 50 × thành viên hoạt động / (hoạt động + rời CLB trong kỳ).
  - D8 = 100 − điểm trừ vi phạm đã kết luận (Nhẹ 10, Trung bình 25, Nghiêm trọng 50) − 5 × hồ sơ chưa xử lý.
  - Thiếu dữ liệu → `Insufficient data`, **không bao giờ chấm 0** (E1). Mỗi kết quả lưu lineage
    `{ metric, sourceEntity, sourceIds (≤ 50), sourcePeriod, value }` (EVL-02); điểm tính từ dữ liệu được
    giữ trong lineage (`metric: "computedScore"`) để bỏ chấm tay thì quay về được.
- **Tổng điểm**: trung bình có trọng số trên các tiêu chí đã có điểm (trọng số chia lại cho phần có dữ liệu);
  xếp loại theo ngưỡng của scheme (Xuất sắc / Tốt / Khá / Cần cải thiện).
- **Chấm tay** (UC43 FR-02): chỉ tiêu chí scheme cho phép, điểm 0–100 + lý giải bắt buộc; chuyển
  `Under Review`. Có thể bỏ chấm tay.
- **Chốt** từng CLB → `Finalized` (lưu tổng + xếp loại); "Mở lại" khi chưa công bố.
- **Công bố cả kỳ**: chỉ khi mọi CLB trong phạm vi có bản mới nhất `Finalized` hoặc `Published` (và ít nhất
  một bản `Finalized`) → các bản `Finalized` thành `Published`, báo ban điều hành từng CLB (BR60).
- **Sau công bố** (BR30, A1): "Tạo bản sửa" sinh `revisionNo + 1` ở `Data Ready`; bản đã công bố vẫn đọc
  được; kỳ phải được công bố lại khi bản sửa đã chốt. Chi tiết hiện các bản và xu hướng các kỳ trước (FR-07).
- Audit `Evaluation` (`EVALUATION_GENERATED|REGENERATED|REVISION_CREATED|MANUAL_SCORED|MANUAL_CLEARED|
  FINALIZED|REOPENED|PUBLISHED`). Chỉ `ICPDP_OFFICER`. Không đổi schema.

## Hành vi
- `GET /admin/evaluations?period=` · `POST /admin/evaluations/generate { periodCode }` ·
  `POST /admin/evaluations/publish { periodCode }`.
- `GET /admin/evaluations/:id` · `POST /admin/evaluations/:id/regenerate` (bản `Published` → bản sửa mới) ·
  `POST /admin/evaluations/:id/manual { dimensionCode, manual: { score, justification } | null }` ·
  `POST /admin/evaluations/:id/finalize` · `POST /admin/evaluations/:id/reopen`.

## Tiêu chí nghiệm thu
- [x] Không phải ICPDP → 403; học kỳ không có scheme `Active` → 409.
- [x] Sinh nháp cho mọi CLB trong phạm vi, mỗi tiêu chí có lineage; thiếu dữ liệu → `Insufficient data`.
- [x] Chấm tay chỉ ở tiêu chí cho phép, bắt buộc lý giải; sinh lại giữ điểm chấm tay.
- [x] Chốt tính tổng có trọng số trên phần có điểm và xếp loại theo ngưỡng.
- [x] Công bố chỉ khi mọi CLB đã chốt; báo ban điều hành CLB.
- [x] Bản sửa sau công bố là bản mới, bản cũ vẫn `Published`; kỳ cần công bố lại.
- [ ] Kiểm tra trực quan (desktop/mobile, `en`/`vi`, sáng/tối).

## Ngoài phạm vi
UC43 E1 (CLB phản biện kết quả → hồ sơ UC40), trang CLB xem kết quả của mình (phía CLB), xuất bảng điểm
(đã có loại xuất ở UC55 nếu cần mở rộng).

## Changelog
- v1.0.0 (2026-10-10) — được người dùng duyệt.
