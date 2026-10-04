# 05 — Triển khai

Cách biến baseline yêu cầu thành code: phân rã công việc và thiết kế cơ sở dữ liệu.

| File | Là gì |
|---|---|
| [`TASKS.md`](TASKS.md) | Danh sách công việc triển khai cho database, backend và frontend, nhóm theo các vòng lặp bàn giao ở `../SRS.md` §15. Mỗi task đều trích dẫn use case, yêu cầu chức năng hoặc quy tắc nghiệp vụ mà nó thoả mãn, và các task đang bị chặn được liệt kê kèm quyết định cần chốt để gỡ chặn |
| [`IMPLEMENTATION_BACKLOG.md`](IMPLEMENTATION_BACKLOG.md) | Backlog thực thi đã đối chiếu SRS, mockup HTML và source hiện tại; ưu tiên Auth/Authz trước, kèm MongoDB, mapping màn hình và gate nghiệm thu |
| [`AUTH_SETUP.md`](AUTH_SETUP.md) | Cấu hình Google OAuth, cookie phiên và MongoDB local cho Auth |
| [`UCMS_Database_Design.dbml`](UCMS_Database_Design.dbml) | Thiết kế cơ sở dữ liệu dạng DBML: 50 collection MongoDB, 24 enum, nhóm theo module. Import vào [dbdiagram.io](https://dbdiagram.io) để render ERD |

## Dùng file DBML

1. Mở <https://dbdiagram.io> rồi chọn **Import → From DBML** (hoặc dán thẳng nội dung file).
2. Sơ đồ hiện ra với mỗi module một nhóm bảng (M01 … M12).
3. Xuất PNG hoặc PDF để đưa vào báo cáo, hoặc xuất SQL nếu có lúc cần một bản tham chiếu quan hệ.

File này là thiết kế của một **cơ sở dữ liệu tài liệu**: một bảng là một collection, một cột
`objectId` là tham chiếu được lưu chứ không phải khoá ngoại, và một cột `json` là sub-document
nhúng luôn được đọc kèm với cha của nó. Khối chú thích ở đầu file giải thích khi nào một
sub-document được nhúng và khi nào nó thành một collection riêng.

## Khởi tạo MongoDB

Sau khi cấu hình `MONGO_URI` trong `.env` hoặc biến môi trường của shell cho server, chạy
`npm run db:init` từ thư mục gốc để tạo 50 collection UCMS và toàn bộ index từ DBML. Sau đó chạy
`npm run db:verify` để kiểm tra cùng kết nối. Dùng cùng URI này trong MongoDB Compass; database
được in ra bởi lệnh verify sẽ chứa các collection. Lệnh init có thể chạy lại, không xoá dữ liệu
và không seed bản ghi nghiệp vụ. Schema Mongoose được sinh bằng
`python3 server/src/infra/db/generate-ucms-schema.py` khi DBML thay đổi. Dữ liệu `User` demo
của template nằm tạm ở `demoUsers` nhưng API demo đã được gỡ khỏi app nghiệp vụ;
collection `users` dành cho schema UCMS dùng ObjectId. Auth tạo thêm collection vận hành
`authSessions` khi server khởi động.

Để đối chiếu end-to-end: mở Compass bằng cùng `MONGO_URI`, refresh danh sách database, mở tên
database do `db:verify` in ra và kiểm tra 50 collection UCMS. Chạy `npm run seed` để upsert
ảnh chụp dữ liệu công khai của pdp.fpt.edu.vn (Hà Nội, 2026-10-04) với ID cố định: 48 CLB và
21 sự kiện do CLB tổ chức (đều đã kết thúc, nên chỉ hiện trong lịch sử của từng CLB). Lệnh chạy
lại được, không nhân đôi; nó chỉ xoá bộ demo hư cấu cũ theo ID cố định của chính seed, không
đụng dữ liệu khác. Chi tiết và giới hạn ở `server/src/infra/db/README.md`. Sau khi cấu hình Auth theo
[`AUTH_SETUP.md`](AUTH_SETUP.md), chạy backend bằng `npm run dev -w server`;
`GET <APP_BASE_URL>/api/v1/health` phải trả `200` với
`{"ok":true}`. Nếu Compass dùng MongoDB Atlas, backend cũng cần chính URI Atlas đó (không đưa
credential vào source hoặc commit `.env`).

## Giữ đồng bộ với yêu cầu

`../SRS.md` là nguồn chân lý. Khi một yêu cầu thay đổi: sửa SRS trước, rồi tới DBML, rồi tới
danh sách công việc. Mọi giá trị trạng thái trong các enum của DBML đều lấy từ SRS §6, và mọi
khoá duy nhất cùng index lấy từ SRS §7.4 — nếu một trong hai thứ đó đổi thì enum hoặc index ở
đây đổi theo.
