# ADR-001: Clean architecture 4 tầng trong server/src

Ngày: 2026-08-08 · Trạng thái: đã chấp nhận

## Quyết định
Chia `server/src` thành `domain/`, `usecase/`, `interface/`, `infra/`. Mũi tên phụ thuộc hướng
về domain. Interface của repository (port) nằm ở domain; bản cài Mongo nằm ở infra.

## Vì sao
- Nhóm 5 người cộng các AI agent làm song song cần những ranh giới cứng mà grep kiểm tra được.
- Domain và usecase test được không cần mock (dùng repo in-memory) → vòng lặp unit test nhanh.
- Đổi Mongo, thêm gRPC… mỗi việc chỉ đụng vào một tầng.

## Đánh đổi
- Nhiều file hơn một app Express phẳng kiểu `routes/ + models/`. Chấp nhận: chính các ràng buộc
  ranh giới này giữ cho việc làm song song không rối vào nhau.
- Không dùng DI container — phụ thuộc truyền qua tham số hàm. Chỉ xem xét lại khi phần nối dây
  trong main.ts dài quá một màn hình.
