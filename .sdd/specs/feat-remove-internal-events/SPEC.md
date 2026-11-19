# SPEC: Bỏ sự kiện nội bộ và mức rủi ro

## Hành vi
- Chỉ giữ luồng đề xuất sự kiện công khai qua ICPDP; gỡ API và trang sự kiện nội bộ.
- Ngân sách đề xuất được bỏ trống; dòng đã nhập phải đầy đủ và có số tiền dương.
- Bỏ mức rủi ro khỏi đề xuất và giao diện thẩm định.
- Không xoá dữ liệu lịch sử trong database.

## Tiêu chí nghiệm thu
- API sự kiện nội bộ không còn được đăng ký hoặc tài liệu hoá.
- Đề xuất không ngân sách và không mức rủi ro được chấp nhận.
- Giao diện không có trang nội bộ hay mức rủi ro.
