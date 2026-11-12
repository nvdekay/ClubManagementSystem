# ui/empty-state/

`AppEmptyState` — phần giữ chỗ cho danh sách hoặc trang không có dữ liệu. Hai kiểu:
`variant="inline"` (mặc định) là một dòng chữ xám, dùng trong ô bảng hoặc trong card đã có khung;
`variant="boxed"` là khung viền nét đứt kèm icon, dùng khi cả một mục/danh sách trống.
Kiểu `boxed` nhận thêm `title` (tiêu đề h2 cho hàng đợi trống cả trang), `icon` (mặc định `inbox`) và
`action` (nút/link kêu gọi hành động, vd. "Khám phá CLB") — đừng tự vẽ lại khung nét đứt ở trang.
