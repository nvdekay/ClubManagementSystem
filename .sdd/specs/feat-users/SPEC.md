# SPEC: feat-users

## Vấn đề
Template cần một ví dụ mẫu chạy được từ đầu tới cuối: đăng ký và liệt kê user.

## Hành vi
- `POST /api/v1/users` `{email, name}` → 201 + user. Email được chuẩn hoá (trim, chuyển thường), tối đa 254 ký tự.
- `GET /api/v1/users?limit=&search=` → 200, mới nhất trước, tối đa `limit` bản ghi (mặc định 20, tối đa 100); `search` (tuỳ chọn, đã trim, tối đa 100 ký tự) lọc theo chuỗi con không phân biệt hoa thường trên name hoặc email, khớp theo nghĩa đen (các ký tự đặc biệt của regex được escape).
- Email / name / limit không hợp lệ → 400 `{error}`; email trùng → 409 `{error}`.
- Lỗi ngoài dự kiến → 500 `{error: "internal server error"}`.

## Tiêu chí nghiệm thu
- [x] Đăng ký với dữ liệu hợp lệ tạo ra user với email đã chuẩn hoá
- [x] Email không hợp lệ bị từ chối bằng DomainError
- [x] Email trùng bị từ chối
- [x] Repository Mongo ghi và đọc lại được một user (integration)
- [x] `search` lọc không phân biệt hoa thường trên name/email; từ khoá quá dài bị từ chối

## Ngoài phạm vi
Xác thực, phân trang theo cursor (danh sách chỉ giới hạn bằng limit), cập nhật và xoá.

## Changelog
- v1.2.0 (2026-08-13) — danh sách nhận thêm `search` tuỳ chọn (chuỗi con của name/email); ô tìm kiếm phía client có debounce
- v1.1.0 (2026-08-09) — danh sách bị giới hạn bằng `limit` đã validate; email trùng → 409; giới hạn độ dài email
- v1.0.1 (2026-08-09) — cập nhật đường dẫn thành `/api/v1` (bị lệch khi commit 11ba482 dời các route)
- v1.0.0 (2026-08-08) — bản đầu tiên, đi kèm template
