# 05 — Triển khai

Cách biến baseline yêu cầu thành code: phân rã công việc và thiết kế cơ sở dữ liệu.

| File | Là gì |
|---|---|
| [`TASKS.md`](TASKS.md) | Danh sách công việc triển khai cho database, backend và frontend, nhóm theo các vòng lặp bàn giao ở `../SRS.md` §15. Mỗi task đều trích dẫn use case, yêu cầu chức năng hoặc quy tắc nghiệp vụ mà nó thoả mãn, và các task đang bị chặn được liệt kê kèm quyết định cần chốt để gỡ chặn |
| [`UCMS_Database_Design.dbml`](UCMS_Database_Design.dbml) | Thiết kế cơ sở dữ liệu dạng DBML: 50 collection MongoDB, 22 enum trạng thái, 92 quan hệ, 81 index, nhóm theo module. Import vào [dbdiagram.io](https://dbdiagram.io) để render ERD |

## Dùng file DBML

1. Mở <https://dbdiagram.io> rồi chọn **Import → From DBML** (hoặc dán thẳng nội dung file).
2. Sơ đồ hiện ra với mỗi module một nhóm bảng (M01 … M12).
3. Xuất PNG hoặc PDF để đưa vào báo cáo, hoặc xuất SQL nếu có lúc cần một bản tham chiếu quan hệ.

File này là thiết kế của một **cơ sở dữ liệu tài liệu**: một bảng là một collection, một cột
`objectId` là tham chiếu được lưu chứ không phải khoá ngoại, và một cột `json` là sub-document
nhúng luôn được đọc kèm với cha của nó. Khối chú thích ở đầu file giải thích khi nào một
sub-document được nhúng và khi nào nó thành một collection riêng.

## Giữ đồng bộ với yêu cầu

`../SRS.md` là nguồn chân lý. Khi một yêu cầu thay đổi: sửa SRS trước, rồi tới DBML, rồi tới
danh sách công việc. Mọi giá trị trạng thái trong các enum của DBML đều lấy từ SRS §6, và mọi
khoá duy nhất cùng index lấy từ SRS §7.4 — nếu một trong hai thứ đó đổi thì enum hoặc index ở
đây đổi theo.
