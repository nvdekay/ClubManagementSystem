# tests/

`unit/` chạy mà không cần DB và không cần mạng; `integration/` cần một Mongo thật (bị bỏ qua
khi không có `MONGO_URI`, biến này được nạp tự động từ `.env`).
