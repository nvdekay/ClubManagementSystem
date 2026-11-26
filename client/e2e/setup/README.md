# client/e2e/setup/

Dựng stack cho e2e: `env.ts` (cổng, database, biến môi trường server, vai), `prepare-db.ts`
(xoá + seed database e2e), `mint-sessions.ts` (cấp phiên `ucms_session` cho từng vai),
`global-setup.ts` / `global-teardown.ts` (Playwright gọi) và `run-script.ts` (chạy hai script kia
bằng `tsx`, vì chúng import module của `server/`). Chỉ code phục vụ kiểm thử, không có gì ở đây
được nạp vào ứng dụng. Chi tiết: [`../README.md`](../README.md).
