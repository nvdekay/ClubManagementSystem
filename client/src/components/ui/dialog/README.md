# dialog/

`AppDialog` — modal dựng trên thẻ `<dialog>` gốc của trình duyệt (`showModal()`), nên focus trap,
phím Esc và lớp phủ đều do trình duyệt lo. Component cha giữ state `open`; nội dung chỉ được render
khi mở, nên form bên trong tự reset mỗi lần đóng.

`AppConfirmDialog` — câu hỏi có/không dựng trên `AppDialog`, dùng thay `window.confirm` để hộp xác nhận
theo theme và ngôn ngữ của app. Component cha giữ thao tác đang chờ xác nhận.
