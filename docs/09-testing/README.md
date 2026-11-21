# 09-testing

`Group1_SE1939-NJ_Unit_Test_Case.xlsx` là bảng Unit Test Case của UCMS theo mẫu FPT: tab
`Guidleline`, `Cover`, `FunctionList`, `Test Report` và mỗi use case một sheet (ma trận
Condition / Confirm / Result, cột `UTCIDxx`). Bản Google Sheet cùng nội dung nằm trong thư mục nộp bài
WDP301 trên Drive: `Group1_SE1939-NJ_Unit_Test_Case`.

- 55 use case, 762 test case (175 Normal, 464 Abnormal, 123 Boundary).
- Điều kiện, giới hạn và thông báo lỗi lấy từ code `server/` (zod schema, usecase, `DomainError`).
- Cột Passed/Failed và Executed Date được điền sẵn, không sinh từ lần chạy test tự động.
- Excel giới hạn tên sheet 31 ký tự nên tên sheet trong file `.xlsx` bị cắt; bản Google Sheet có tên đầy đủ.

## Đánh số use case

Bảng này đánh số liền mạch `UC01–UC55`, khác với SRS và Final Report (bỏ trống UC23 đã rút, dùng UC58):

| Trong bảng này | Trong SRS / Final Report |
|---|---|
| UC01–UC22 | UC01–UC22 |
| UC23–UC54 | UC24–UC55 |
| UC55 | UC58 |
