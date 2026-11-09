# ui/money-input/

`AppMoneyInput` — ô nhập số tiền VND nguyên. Hiện dấu chấm phân cách hàng nghìn khi gõ
(`5.000.000`), bỏ số 0 thừa ở đầu, giữ vị trí con trỏ. Giá trị trả ra qua `onValueChange` là chuỗi
chữ số thuần (`"5000000"`, `""` khi để trống).
