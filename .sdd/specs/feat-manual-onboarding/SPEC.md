# SPEC: feat-manual-onboarding

## Vấn đề
UC20 A1 / FR-UC20-03: CLB cần nhận một sinh viên ngoài đợt tuyển (chuyển từ CLB khác, thành viên
cũ quay lại…) mà vẫn giữ BR13 — mọi tư cách thành viên phải đến từ một đơn trúng tuyển hoặc một
lần tiếp nhận thủ công có thẩm quyền, kèm lý do được ghi lại.

## Hành vi
- `POST /api/v1/clubs/:clubId/memberships` body `{ email, reason }` (strict zod), cần phiên + CSRF và
  `club.application.review` (Club Leader, BR54). Trả `201` với membership mới.
- Email được trim + lowercase, so khớp không phân biệt hoa thường với `users.email`. Sinh viên phải
  từng đăng nhập (đã có user) và tài khoản `Active`.
- Lý do bắt buộc, tối đa 2000 ký tự. Ngày gia nhập là hôm nay; không chọn ban (quyết định 17/10/2026).
- Trong một transaction: CLB phải `Active`; tạo membership `Active` với `defaultRole` = role Members;
  ghi `statusHistory` kèm lý do, audit `CLUB_MEMBERSHIP_MANUALLY_ONBOARDED` (có `reason`) và
  notification `CLUB_MEMBERSHIP_ONBOARDED` cho sinh viên.
- Lỗi: không có user → `404`; tài khoản không Active hoặc đã có membership `Active`/`Inactive` (E1)
  → `409`; `Banned` (E2, BR46) → `403`; email/lý do sai → `400`.
- Sinh viên đã `Left` được tiếp nhận lại (membership mới; quyết định 17/10/2026).
- UI: nút "Thêm thành viên" trên `/club/:clubId/members` mở `ClubMemberOnboardDialog` (email + lý do).

## Tiêu chí nghiệm thu
- [x] Thiếu lý do hoặc email sai bị từ chối trước khi chạm repository.
- [x] Tạo được membership Active có role Members, audit có lý do.
- [x] Từ chối thành viên hiện tại (Active/Inactive), Banned, email chưa có tài khoản.
- [x] Sinh viên Left được tiếp nhận lại.
- [x] OpenAPI khai báo route; `npm run check` xanh.

## Ngoài phạm vi
Mời sinh viên chưa có tài khoản qua email; chọn ban hoặc ngày gia nhập khác hôm nay; tiếp nhận hàng loạt.

## Changelog
- v1.0.0 (2026-10-17) — người dùng chọn: nhập email FPT + lý do, ngày gia nhập hôm nay, cho phép nhận lại người đã Left.
