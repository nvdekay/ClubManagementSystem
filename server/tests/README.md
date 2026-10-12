# tests/

`unit/` chạy mà không cần DB và không cần mạng; `integration/` cần một Mongo thật (bị bỏ qua
khi không có `MONGO_URI`, biến này được nạp tự động từ `.env`).

Mỗi file integration dùng database riêng `ucms-<tên>-test-<pid>` và xoá nó trong `afterAll`. Nếu một
lượt test bị ngắt giữa chừng, `global-setup.ts` sẽ xoá các database test của tiến trình đã chết ở lần
chạy kế tiếp (database của lượt test đang chạy song song được giữ nguyên).
