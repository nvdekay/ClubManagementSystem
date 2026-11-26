# client/e2e/tests/

Spec Playwright, đuôi `*.e2e.ts`, mỗi file một khu vực của ứng dụng: `public` (khách),
`student`, `club-leader` (HEBE), `icpdp`, `session` (thành viên CLB và phiên hết hạn).
Luôn import `test`/`expect` từ `../fixtures`, không import thẳng từ `@playwright/test`.
Cách chạy và quy ước viết test: [`../README.md`](../README.md).
