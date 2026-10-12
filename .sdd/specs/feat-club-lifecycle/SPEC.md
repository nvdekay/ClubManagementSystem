# SPEC: feat-club-lifecycle

> UC15 — Tạm ngừng, kích hoạt lại hoặc giải thể CLB. Người dùng duyệt quyết định và field `clubs.suspension`
> (2026-10-10).

## Vấn đề
ICPDP cần kiểm soát vòng đời CLB ở một chỗ, có lý do, và để hệ thống tự làm các bước theo lịch.

## Quyết định
- Trang ICPDP "Quản lý CLB": danh sách CLB kèm trạng thái, khối **"Sắp hết hạn tạm ngừng"**, chi tiết từng CLB
  (thành viên, đợt tuyển đang mở, sự kiện sắp tới, nhiệm kỳ, lịch sử vòng đời) và đúng 3 hành động có lý do.
- **Tạm ngừng** (chỉ khi `Active`): lý do + **đến ngày** hoặc **không thời hạn**. CLB → `Suspended`, lưu
  `clubs.suspension { reason, suspendedAt, suspendedBy, until, reminderSentAt }`.
  - Đợt tuyển đang mở **không bị đóng**: trang đợt tuyển vẫn hiện nhưng báo "CLB đang tạm ngừng" và không
    cho tạo/nộp đơn; đơn đã có giữ nguyên. Đợt tuyển mới bị chặn (BR09, đã có).
  - Huỷ sự kiện sắp diễn ra (`Approved`/`Upcoming`, chưa bắt đầu) và booking tương lai đã duyệt (cascade hệ
    thống, `cancelSourceType/releasedBy = SUSPENSION`); đăng ký của sinh viên bị huỷ kèm thông báo.
  - Thông báo cho thành viên CLB.
- **Kích hoạt lại** (khi `Suspended`): → `Active`, xoá `suspension`, lịch sử ở audit. Hệ thống **tự kích hoạt
  lại** khi tới `until`; **trước 3 ngày** báo ICPDP một lần (`reminderSentAt`).
- **Giải thể** (khi `Active`/`Suspended`, chưa có quyết định): hiệu lực từ **học kỳ kế tiếp** trong lịch năm học
  (`clubs.dissolution { decidedAt, decidedBy, reason, effectiveSemester, effectiveFrom, effectiveTo }`), không đổi
  trạng thái ngay; huỷ ngay sự kiện/booking kết thúc sau `effectiveTo` (BR45). Không có học kỳ kế tiếp → 400.
  - Job: tới `effectiveFrom` → `Dissolving` (chặn việc mới vì không còn `Active`); tới `effectiveTo` →
    `Dissolved`: đóng nhiệm kỳ đang chạy, kết thúc mọi bản gán chức vụ (thu hồi quyền), huỷ booking chưa quyết
    định, đóng đợt tuyển đang mở. Không còn hiện ở trang công khai.
- **Job vòng đời** chạy lúc server khởi động và mỗi giờ; idempotent.
- Mọi bước ghi audit `Club` (actor = null khi do job) và thông báo.

## Hành vi
- `GET /admin/clubs` → danh sách + `expiringSuspensions`.
- `GET /admin/clubs/:id` → chi tiết + `nextSemester` (cho giải thể) + lịch sử.
- `POST /admin/clubs/:id/suspend` `{ reason, until? }` · `/reactivate` `{ reason }` · `/dissolve` `{ reason }`.

## Tiêu chí nghiệm thu
- [x] Không phải ICPDP → 403; thiếu lý do → 400; sai trạng thái nguồn → 409; `until` trong quá khứ → 400.
- [x] Tạm ngừng huỷ sự kiện sắp tới + đăng ký + booking tương lai, không đóng đợt tuyển; sinh viên không nộp đơn
      được và thấy lý do; đơn cũ giữ nguyên.
- [x] Job tự kích hoạt lại khi hết hạn và báo ICPDP trước 3 ngày đúng một lần.
- [x] Giải thể ghi học kỳ kế tiếp, huỷ việc kết thúc sau học kỳ đó; job chuyển `Dissolving` rồi `Dissolved`
      và thu hồi quyền.

## Ngoài phạm vi
UC14 (CLB tự xin tạm ngừng), liên kết hồ sơ vi phạm UC40 (A1), cảnh báo ngân sách chưa đối soát (E1).

## Changelog
- v1.0.0 (2026-10-10) — được người dùng duyệt.
