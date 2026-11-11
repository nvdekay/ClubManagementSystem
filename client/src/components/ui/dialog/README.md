# dialog/

`AppDialog` — modal dựng trên thẻ `<dialog>` gốc của trình duyệt (`showModal()`), nên focus trap,
phím Esc và lớp phủ đều do trình duyệt lo. Component cha giữ state `open`; nội dung chỉ được render
khi mở, nên form bên trong tự reset mỗi lần đóng.
Tiêu đề và nút đóng dính ở trên khi nội dung dài cuộn; truyền hàng nút thao tác qua prop `footer` để
chúng dính ở đáy dialog (form dài không bao giờ giấu mất nút gửi). Dialog mở ra có hiệu ứng mờ-phóng nhẹ.

`AppConfirmDialog` — câu hỏi có/không dựng trên `AppDialog`, dùng thay `window.confirm` để hộp xác nhận
theo theme và ngôn ngữ của app. Component cha giữ thao tác đang chờ xác nhận.

`AppConfirmProvider` — bọc toàn app trong `main.tsx`, giữ một `AppConfirmDialog` duy nhất cho hook
`useConfirm()`: `if (!(await askConfirm(t("..."))) return;`. Đừng dùng `window.confirm` — hộp thoại
của trình duyệt không theo theme, ngôn ngữ và hiện tên miền `localhost:5173`.
