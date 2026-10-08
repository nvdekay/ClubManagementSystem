# SPEC: feat-database-bootstrap

## Vấn đề
Thiết kế MongoDB ở `docs/05-implementation/UCMS_Database_Design.dbml` mới là tài liệu; ứng dụng chỉ có collection `users` của template và chưa tạo các collection, enum, index của UCMS. Cần dựng nền schema trước khi làm Auth và các use case.

## Hành vi
- Khai báo Mongoose schema cho toàn bộ collection, trường, kiểu, enum, giá trị mặc định và index được mô tả trong DBML; dùng `_id: ObjectId` làm định danh Mongo tương ứng cột `id objectId [pk]`.
- Có lệnh idempotent để tạo collection và index trên database được cấu hình, không xoá hoặc ghi đè dữ liệu hiện có.
- Có lệnh read-only để `ping` MongoDB và báo tên database, số collection/index còn thiếu nhằm đối chiếu cùng kết nối trên MongoDB Compass.
- Server khởi động bảo đảm index UCMS được tạo; nếu lỗi index thì fail-fast.
- Giữ demo User hiện tại tách trong `demoUsers` trong giai đoạn chuyển tiếp, vì schema của nó dùng UUID khác `users` của UCMS.
- Các trường `json` là giá trị BSON hỗn hợp; validate cấu trúc nghiệp vụ cụ thể sẽ được thêm ở các SPEC của từng use case.

## Tiêu chí nghiệm thu
- [x] Đúng 49 collection và 24 enum từ DBML được ánh xạ; mỗi field có kiểu và required/default tương ứng.
- [x] Các unique/index khai báo trong DBML tồn tại sau khi chạy khởi tạo, và chạy lại không làm mất dữ liệu.
- [x] `users` UCMS dùng `_id: ObjectId`; repository User demo tiếp tục hoạt động trên `demoUsers`.
- [x] Typecheck, lint, unit test và constitution check xanh; integration test với Mongo thật chạy khi có `MONGO_URI`.

## Ngoài phạm vi
Seed dữ liệu nghiệp vụ của 52 UC, repository/use case của từng module, session/auth, migration dữ liệu demo `users` cũ.

## Changelog
- v1.2.0 (2026-10-08) — UC09 thêm `clubDepartments`; baseline có 49 collection.
- v1.1.0 (2026-10-08) — rút UC05 và hai collection định tuyến; baseline còn 48 collection, workflow chỉ có một review task và một quyết định.
- v1.0.0 (2026-10-02) — khởi tạo theo yêu cầu của người dùng trên nhánh `khanhnvd`.
