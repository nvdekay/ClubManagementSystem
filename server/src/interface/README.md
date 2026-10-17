# interface/

Các adapter đi vào. Dịch qua lại giữa giao vận và lời gọi usecase.

- `http/` — Express: route, validation, OpenAPI.
- `jobs/` — job chạy theo lịch, khởi động từ `main.ts`; chỉ hẹn giờ và gọi usecase idempotent.
