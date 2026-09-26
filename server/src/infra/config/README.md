# infra/config/

Nơi DUY NHẤT đọc `process.env`. Validate bằng zod lúc khởi động thành một `Config` có kiểu;
env sai = `process.exit(1)`.
