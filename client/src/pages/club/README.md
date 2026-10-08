# pages/club/

Các trang nghiệp vụ theo ngữ cảnh một CLB. Route luôn mang `clubId`; page chỉ hiển thị sau khi
đối chiếu workspace và quyền hiện hành từ `/auth/me`.

`ClubSettingsPage` triển khai UC09: chỉ workspace có `club.profile.manage` mới đọc/sửa hồ sơ
vận hành và cơ cấu ban/bộ phận; các trường định danh do ICPDP quản lý chỉ được hiển thị.
