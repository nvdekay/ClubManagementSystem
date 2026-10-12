# TASKS: feat-policy-resolution

- [x] Đối chiếu UC04, UC07, BR02/03/32/42 và DBML; chốt phạm vi bộ phân giải.
- [x] Tạo port và use case đọc policy snapshot tại thời điểm D; xử lý trường hợp chưa cấu hình.
- [x] Adapter Mongo đọc `policyVersions` với thứ tự xác định; UC01 dùng cùng cách chọn và giữ fallback bootstrap.
- [x] Unit test và integration test cho phiên bản tương lai, lịch sử và đồng ngày; lint, typecheck và `MONGO_URI= npm run check` xanh (80 unit test, 10 integration test bỏ qua sau phần UC04/UC07).
- [ ] Nghiệm thu với Mongo local thật và chạy `npm run check` cùng `MONGO_URI` hợp lệ. Sandbox hiện không nối được Mongo local.
