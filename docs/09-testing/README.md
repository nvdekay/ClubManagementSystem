# 09-testing

`group1-se1939-nj-unit-test-case.xlsx` là bảng Unit Test Case của UCMS theo mẫu FPT: tab
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

## Kiểm thử tự động

Bảng trên là tài liệu nộp bài; test chạy được nằm trong code (số liệu ngày 27/11/2026):

| Bộ test | Lệnh | Quy mô |
|---|---|---|
| Server unit + integration (vitest) | `npm test -w server` (integration cần Mongo và `MONGO_URI`) | 140 file, 1040 test |
| Client unit (vitest, logic thuần) | `npm test -w client` | 10 file, 110 test |
| Giao diện end-to-end (Playwright) | `npm run test:e2e` | 5 file, 20 test |

`npm run check` chạy hai bộ vitest; Playwright chạy riêng (job `e2e` trên CI). Cách tổ chức test
server: [`server/tests/README.md`](../../server/tests/README.md); Playwright:
[`client/e2e/README.md`](../../client/e2e/README.md).
