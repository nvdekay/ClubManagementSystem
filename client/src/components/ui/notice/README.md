# ui/notice/

`AppNotice` — thông báo phẳng trong trang (lỗi, trạng thái trống, gợi ý) với vạch màu bên trái,
thay cho việc bọc thông báo trong card. Truyền `role="alert"` cho lỗi cần chú ý ngay.

`AppErrorNotice` — `AppNotice` tone `danger` + `role="alert"` kèm nút thử lại (`onRetry`); nhãn nút mặc định
`common.retry`, `retryVariant` mặc định `secondary`. Dùng cho mọi khối "tải lỗi → Thử lại".
