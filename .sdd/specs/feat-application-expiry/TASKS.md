# Công việc UC07/08 hết hạn

- [x] Port/usecase/repository/job (`application-expiry-job.ts` nối trong `main.ts`).
- [x] Chặn nộp lại quá hạn tại commit (kiểm tra `revisionDeadlineAt` trong transaction nộp).
- [x] Kiểm thử Mongo đúng deadline/idempotency và check (xác minh 15/10/2026: `npm run check` xanh, 438 test gồm integration Mongo thật đều qua, build client qua).
