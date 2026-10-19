# 05 — Triển khai

Trạng thái hiện hành: [`../CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md).
Các backlog/wave và handoff 09/10 là snapshot lịch sử, UC23 đã huỷ.
[Bàn giao 15/10/2026](SESSION_HANDOFF_2026-10-15.md) cũng là snapshot lịch sử; trạng thái code và kiểm chứng mới nhất nằm ở `CURRENT_IMPLEMENTATION.md`.

Cách biến baseline yêu cầu thành code: phân rã công việc và thiết kế cơ sở dữ liệu.

| File | Là gì |
|---|---|
| [`UC_CODE_MAPPING.md`](UC_CODE_MAPPING.md) | Ma trận 56 mã UC (52 trong phạm vi) → route server, UI client, mount và khoảng trống triển khai (đối chiếu `655cad3`, 17/10/2026) |
| [`TASKS.md`](TASKS.md) | Danh sách công việc triển khai cho database, backend và frontend, nhóm theo các vòng lặp bàn giao ở `../SRS.md` §15. Mỗi task đều trích dẫn use case, yêu cầu chức năng hoặc quy tắc nghiệp vụ mà nó thoả mãn, và các task đang bị chặn được liệt kê kèm quyết định cần chốt để gỡ chặn |
| [`IMPLEMENTATION_BACKLOG.md`](IMPLEMENTATION_BACKLOG.md) | Backlog thực thi đã đối chiếu SRS, mockup HTML và source hiện tại; ưu tiên Auth/Authz trước, kèm MongoDB, mapping màn hình và gate nghiệm thu |
| [`AUTH_SETUP.md`](AUTH_SETUP.md) | Cấu hình Google OAuth, cookie phiên và MongoDB local cho Auth |
| [`SESSION_HANDOFF_2026-10-15.md`](SESSION_HANDOFF_2026-10-15.md) | Bàn giao lịch sử 15/10/2026: cập nhật tài liệu, kết luận audit, giới hạn kiểm thử tại thời điểm đó |
| [`SESSION_HANDOFF_2026-10-09.md`](SESSION_HANDOFF_2026-10-09.md) | Handoff lịch sử: quyết định đã chốt, tình trạng từng luồng, fixture local, kiểm chứng gần nhất và ưu tiên tiếp theo cho session mới |
| [`REMAINING_UC_PLAN.md`](REMAINING_UC_PLAN.md) | Kế hoạch sau review Wave 1 (2026-10-10): trạng thái triển khai/nghiệm thu, 6 wave, phân công phía CLB và các quyết định cần chốt |
| [`WAVE_2_BOOKING.md`](WAVE_2_BOOKING.md) | Bàn giao Wave 2: slot và hạn gửi, UI CLB/ICPDP, dữ liệu mẫu, cách test và kiểm chứng; ghi chú 2026-10-11 phòng học chuyển sang UC58 |
| [`WAVE_3_EVENTS_PLAN.md`](WAVE_3_EVENTS_PLAN.md) | Kế hoạch Wave 3: hiện trạng source, thứ tự bàn giao sự kiện CLB, quyết định D4 và chính sách đã áp dụng |
| [`WAVE_3_EVENTS.md`](WAVE_3_EVENTS.md) | Bàn giao Wave 3: API/UI, chính sách, dữ liệu demo, cách thử và phạm vi kiểm chứng |
| [`WAVE_4_REPORTS_FINANCE_PLAN.md`](WAVE_4_REPORTS_FINANCE_PLAN.md) | Kế hoạch Wave 4: UC33–UC37, hiện trạng source, thứ tự bàn giao, hợp đồng phối hợp và quyết định cần chốt |
| [`WAVE_4_REPORTS_FINANCE.md`](WAVE_4_REPORTS_FINANCE.md) | Bàn giao tạm Wave 4: phần đã viết, kiểm chứng và BR25/BR58 cần chốt trước khi bật API tài chính |
| [`UCMS_Database_Design.dbml`](UCMS_Database_Design.dbml) | Thiết kế cơ sở dữ liệu dạng DBML: 52 bảng (collection MongoDB), 28 enum, nhóm theo module; code có thêm `authSessions` (tổng 53 collection). Import vào [dbdiagram.io](https://dbdiagram.io) để render ERD |

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
`npm run db:init` từ thư mục gốc để tạo 52 collection UCMS và toàn bộ index từ DBML. Sau đó chạy
`npm run db:verify` để kiểm tra cùng kết nối. Dùng cùng URI này trong MongoDB Compass; database
được in ra bởi lệnh verify sẽ chứa các collection. Lệnh init có thể chạy lại, không xoá dữ liệu
và không seed bản ghi nghiệp vụ. Schema Mongoose được sinh bằng
`python3 server/src/infra/db/generate-ucms-schema.py` khi DBML thay đổi. Dữ liệu `User` demo
của template nằm tạm ở `demoUsers` nhưng API demo đã được gỡ khỏi app nghiệp vụ;
collection `users` dành cho schema UCMS dùng ObjectId. Auth tạo thêm collection vận hành
`authSessions` khi server khởi động.

Để đối chiếu end-to-end: mở Compass bằng cùng `MONGO_URI`, refresh danh sách database, mở tên
database do `db:verify` in ra và kiểm tra 52 collection UCMS (cộng `authSessions` của Auth là 53). Chạy `npm run seed` để upsert
ảnh chụp dữ liệu công khai của pdp.fpt.edu.vn (Hà Nội, 2026-10-04) với ID cố định: 48 CLB và
21 sự kiện do CLB tổ chức (đều đã kết thúc, nên chỉ hiện trong lịch sử của từng CLB). Lệnh chạy
lại được, không nhân đôi; nó chỉ xoá bộ demo hư cấu cũ theo ID cố định của chính seed, không
đụng dữ liệu khác. Dữ liệu demo nghiệp vụ được nạp riêng bằng
`npm run seed:demo -- --owner=<email>`; từ `655cad3` lệnh này cũng tạo hội trường, sân, sân khấu và bộ
thiết bị (HALL/OUTDOOR/STAGE/EQUIPMENT) để thử UC45. Chi tiết và giới hạn ở `server/src/infra/db/README.md`. Sau khi cấu hình Auth theo
[`AUTH_SETUP.md`](AUTH_SETUP.md), chạy backend bằng `npm run dev -w server`;
`GET <APP_BASE_URL>/api/v1/health` phải trả `200` với
`{"ok":true}`. Nếu Compass dùng MongoDB Atlas, backend cũng cần chính URI Atlas đó (không đưa
credential vào source hoặc commit `.env`).

## Giữ đồng bộ với yêu cầu

`../SRS.md` là nguồn chân lý. Khi một yêu cầu thay đổi: sửa SRS trước, rồi tới DBML, rồi tới
danh sách công việc. Mọi giá trị trạng thái trong các enum của DBML đều lấy từ SRS §6, và mọi
khoá duy nhất cùng index lấy từ SRS §7.4 — nếu một trong hai thứ đó đổi thì enum hoặc index ở
đây đổi theo.
