# SPEC: feat-property-catalog

> UC44 — Quản lý danh mục cơ sở vật chất. Người dùng duyệt các quyết định (2026-10-10).

## Vấn đề
ICPDP cần khai báo những phòng, hội trường, thiết bị nhà trường mở cho CLB đặt (UC45/UC46 sau này),
với khung giờ được đặt và các giai đoạn khoá, mà không phải hiểu các field kỹ thuật.

## Quyết định
- **Mã tự sinh** theo loại khi tạo: Phòng `PH-001`, Hội trường `HT-001`, Thiết bị `TB-001`. Loại không đổi
  được sau khi tạo (mã gắn với loại).
- **Sức chứa** bắt buộc với Phòng/Hội trường; không có với Thiết bị.
- **Thiết bị đi kèm**: danh sách thẻ, tối đa 30, không trùng (không phân biệt hoa thường).
- **Khung giờ được đặt** (`bookableHours`): `[{ day: 1–7 (Thứ 2 → Chủ nhật), open: "HH:MM", close: "HH:MM" }]`;
  ngày không có trong danh sách = không cho đặt. UI mặc định "giống nhau mọi ngày 07:00–21:00", có
  "Tuỳ chỉnh từng ngày".
- **Giai đoạn khoá** (`blackouts`): `[{ startAt, endAt, reason }]`, `startAt < endAt`, tối đa 50.
- `propertyClass` không dùng (trùng nghĩa với loại).
- **Ngừng sử dụng / kích hoạt lại** (`isActive`); booking đã duyệt giữ nguyên (FR-04).
- **Xoá** chỉ khi property chưa từng có booking nào; có booking thì từ chối và gợi ý ngừng sử dụng (BR41).
- Đổi khung giờ/khoá không làm vô hiệu quyết định đã ra (FR-07) — chưa có booking nên chỉ là ràng
  buộc cho UC45/46.
- FR-05 (hiển thị yêu cầu xung đột với giai đoạn khoá): chưa có UC45 → để trống, nối sau.
- Mọi thay đổi ghi audit `Property`. Chỉ `ICPDP_OFFICER`.

## Hành vi
- `GET /admin/properties` → danh sách (hoạt động trước, rồi theo mã).
- `POST /admin/properties` → tạo, trả property có mã mới (201).
- `PATCH /admin/properties/:id` → sửa tên, vị trí, sức chứa, thiết bị, khung giờ, khoá.
- `POST /admin/properties/:id/activation` `{ isActive }` → bật/tắt.
- `DELETE /admin/properties/:id` → 200 khi xoá được; 409 khi đã có booking.

## Tiêu chí nghiệm thu
- [x] Sinh viên/không phải ICPDP bị 403.
- [x] Mã tự sinh tăng dần theo loại và không trùng khi tạo đồng thời.
- [x] Từ chối: thiếu tên/vị trí, phòng thiếu sức chứa, thiết bị có sức chứa, thiết bị trùng, giờ sai
      định dạng hoặc mở ≥ đóng, ngày lặp, không có ngày nào, khoá có bắt đầu ≥ kết thúc.
- [x] Ngừng/kích hoạt lại được; xoá bị từ chối khi đã có booking, xoá được khi chưa.
- [x] Mỗi thay đổi có audit.

## Ngoài phạm vi
UC45/UC46/UC47 (đặt, duyệt, huỷ booking) và FR-05.

## Changelog
- v1.0.0 (2026-10-10) — được người dùng duyệt.
