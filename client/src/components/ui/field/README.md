# field/

Mảnh ghép cho form có trường bắt buộc, dùng cùng hook `useFieldValidation` (`hooks/`).

- `AppRequiredMark` — dấu `*` đỏ đặt ngay sau chữ của label. Control vẫn phải có `required`
  (AppSelect: prop `required`) để trình đọc màn hình biết.
- `AppFieldError` — dòng lỗi đỏ dưới control; không render gì khi `message` rỗng.

Control báo lỗi bằng `aria-invalid` (AppInput, AppTextarea) hoặc prop `invalid` (AppSelect): viền đỏ.

Quy ước: lỗi của một trường hiện ngay khi người dùng rời trường đó (blur) hoặc đổi lựa chọn, và
hiện cho mọi trường khi bấm nút gửi — không đợi server trả lỗi mới báo.
