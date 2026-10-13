# 03 — Sơ đồ

Nguồn draw.io kèm bản xuất PNG. Mở file `.drawio` bằng draw.io / diagrams.net hoặc extension
tương ứng của VS Code.

| File | Thể hiện điều gì |
|---|---|
| [`UCMS_Context_Diagram_v2.1.drawio`](UCMS_Context_Diagram_v2.1.drawio) | **Context diagram hiện hành** — biên hệ thống và 46 luồng dữ liệu giữa UCMS và 7 thực thể: 4 actor (Student, Club Member, Club Leader, ICPDP Officer) và 3 hệ thống ngoài (Google OAuth, Google SMTP, Cloudinary). Mỗi luồng là một nhóm dữ liệu, mỗi luồng một mũi tên thẳng; bảng ánh xạ luồng → use case ở `../SRS.md` §14.4 (review issue I56, I57, I58, I61, I64) |
| [`UCMS_Context_Diagram_v2.drawio`](UCMS_Context_Diagram_v2.drawio) | Context diagram v2 (57 luồng, gần như mỗi use case một luồng). **Đã bị thay thế** bởi v2.1; giữ lại làm lịch sử |
| [`UCMS_UseCase_ByActor.drawio`](UCMS_UseCase_ByActor.drawio) | **Use case diagram hiện hành**, phủ UC01–UC55 và UC58 (phân phòng học theo học kỳ, thêm 2026-10-11) — mỗi trang một nhóm actor: All users (kèm generalization User ◁ Student ◁ Club Member ◁ Club Leader), Student, Club Leader, Club Member 1–3, ICPDP 1–3 |
| [`UCMS_State_Diagrams.drawio`](UCMS_State_Diagrams.drawio) | **Máy trạng thái hiện hành** — Club Application, Club, Membership, Recruitment Campaign, Recruitment Application, Event, Event Budget (ngân sách của sự kiện đã duyệt), Property Booking (buổi phòng học `ROOM` do UC58 sinh thẳng ở `Approved`) |
| [`UCMS_ERD.drawio`](UCMS_ERD.drawio) | **ERD hiện hành** (13/10/2026), sinh từ [`../05-implementation/UCMS_Database_Design.dbml`](../05-implementation/UCMS_Database_Design.dbml) — 11 trang: trang 1 là tổng quan 51 collection (chỉ khoá và quan hệ), trang 2–11 là ERD chi tiết từng module M01–M12 với đủ thuộc tính, kiểu dữ liệu và ràng buộc (`PK`, `FK`, `UQ`, `NN`, giá trị mặc định, unique index ghép). Ký hiệu Crow's Foot (Information Engineering), mức vật lý. Quan hệ gồm 94 `Ref` của DBML, hai tham chiếu `eventInvitations` → `events`/`clubs`, và các trường `…By` trỏ về `users`. Ba trường đa hình (`entityId`, `sourceRefId`, `originRefId`) không vẽ quan hệ |
| [`UCMS_Package_Diagrams.drawio`](UCMS_Package_Diagrams.drawio) | **Package diagram hiện hành** (13/10/2026) — Front-end (`client/src`) và Back-end (`server/src`), vẽ theo đúng thư mục và quan hệ import đang có trong code (`interface/http`, `interface/jobs`, `usecase`, `domain`, `infra/db`·`auth`·`files`·`config`, `main.ts`) |
| [`UCMS_Screen_Flow.drawio`](UCMS_Screen_Flow.drawio) | **Screen flow gộp một trang** cho mọi role: đăng nhập → Workspace picker → Public area, Student, Club và ICPDP workspace; đối chiếu router `client/src/main.tsx` ngày 13/10/2026 |
| [`UCMS_Main_Workflows.drawio`](UCMS_Main_Workflows.drawio) | **Main workflow** — bốn luồng chính dạng flowchart không chia làn actor: Club establishment, Member recruitment, Event lifecycle, Event finance |
| [`UCMS_Organization_and_Flows.drawio`](UCMS_Organization_and_Flows.drawio) | **Cơ cấu tổ chức và luồng nghiệp vụ chính** — trang Organization structure (SRS §2.4) và Main business flows F1–F10 (SRS §2.5) |
| [`UCMS_Swimlane_Flows.drawio`](UCMS_Swimlane_Flows.drawio) | **Swimlane của các luồng nghiệp vụ chính** (tiếng Anh) — 14 trang: Club Founding, Leadership Transition, Member Recruitment, Event Proposal, Event Execution, Event Finance, Room Allocation (UC58), Facility Request, Complaint Handling, Periodic Report, Violation Case, Club Evaluation, Suspension and Dissolution, Club Leader and Club Member. Phía CLB chỉ có hai role cố định (13/10/2026): mọi làn thao tác của CLB là `Club Leader` (Chủ nhiệm hoặc Phó chủ nhiệm đã được ICPDP xác nhận); `Club Member` chỉ xem và tham gia. Trang 14 thay bằng **Club Leader and Club Member** (đề cử ghế → ICPDP xác nhận → thành Club Leader → hết ghế thì về Club Member). Màu theo bảng chung: hành động xanh dương, quyết định vàng, kết quả tốt xanh lá, tham chiếu sang luồng khác nét đứt. Đã xuất đủ 14 ảnh PNG vào [`img/`](img/), tỉ lệ 2×, nền trắng |
| [`UCMS_Context_Diagram.drawio`](UCMS_Context_Diagram.drawio) | Context diagram đầu tiên của nhóm (40 luồng). **Đã bị thay thế**; giữ lại làm lịch sử |
| [`img/`](img/) | Bản xuất PNG, đặt tên theo `<tên-file-nguồn>_<số-trang>_<tên-trang>.png` |

**Khi một sơ đồ thay đổi:** sửa file `.drawio` nguồn, xuất lại mọi trang bị ảnh hưởng vào `img/`
giữ đúng quy ước tên ở trên, và cập nhật `../SRS.md` cùng tài liệu liên quan trong
[`../02-use-cases/`](../02-use-cases/) trong cùng một commit.

**Quy ước ký hiệu đang áp dụng** (review issue I09–I13, I27–I30, I55): mỗi trang actor chỉ nối
actor tới các use case nhóm `Manage …`; mỗi use case nhóm `«include»` các chức năng con của nó (với
use case quản lý danh mục thì tách theo CRUD, ví dụ `Manage properties «include» Add / View / Update /
Deactivate property`). Oval chỉ ghi tên, không ghi mã UC. Không vẽ `«extend»`: hai quan hệ
UC45→UC25 và UC47→UC28 chỉ ghi trong Spec (luồng thay thế, Related UC); điều hướng màn hình và
cascade hệ thống cũng không vẽ thành quan hệ. Actor phụ nối bằng association nét liền; đăng nhập là *tiền điều kiện* của
dashboard. Nguồn sinh file `.drawio` là cấu trúc trang trong I55; thay đổi nhóm chức năng báo cáo
định kỳ theo I65: `Request periodic report revision` và `Approve periodic report` thuộc
`Manage evaluation`, còn `Assess periodic report` thuộc `Manage compliance`. Hai oval
quyết định vẫn là các nhánh UC39; `Revise and resubmit periodic report` là UC38 A2 trong
`Manage reports` phía CLB. Vòng sửa–nộp lại–thẩm định lặp đến khi được chấp nhận được mô tả
trong SRS và đặc tả, không biến thành chuỗi `include` giữa các bước quyết định.

**RBAC trên các trang Club Member 1–3:** mỗi khung nét đứt trong boundary là **một** permission
CLB (danh mục ở `../SRS.md` §2.3, BR54), nhãn khung là đúng mã permission (`club.event.manage`, …).
Mỗi nhóm `Manage …` chỉ nằm trong một khung, nên không được gộp chức năng của hai permission vào
cùng một nhóm. Khung `No permission required` chứa UC22, UC24. Bốn quyền giữ riêng của Club Leader
(BR55) chỉ vẽ ở trang Club Leader.

**Kế thừa actor trên từng trang (2026-10-12):** mỗi trang nghiệp vụ chỉ vẽ một quan hệ
generalization tới actor cha trực tiếp bên ngoài biên `UCMS`: Student → User; Club Member → Student;
Club Leader → Club Member; ICPDP Officer → User. Mũi tên dùng nét liền,
tam giác rỗng hướng về actor cha. Trang All users giữ cây kế thừa tổng thể. Các use case được
kế thừa tham chiếu sang trang của actor cha, không cần lặp lại oval trên trang của actor con.
Tám trang nghiệp vụ đã được xuất lại PNG; bản Word tổng hợp ở
[`../UCMS_UseCase_ByActor.docx`](../UCMS_UseCase_ByActor.docx) dùng bộ ảnh đã cập nhật.

**Luồng phòng học và CSVC (đối chiếu code ngày 2026-10-12):** ICPDP cấp phòng học `ROOM`
theo học kỳ qua `Manage room allocations` (UC58), gồm cấp, xem và thu hồi. CLB xem qua
`Manage allocated rooms «include» View allocated rooms` trong khung `club.booking.manage` ở
trang Club Member 2. Chỉ thành viên có quyền CSVC này mới xem lịch để xuất trình cho bảo vệ
khi nhận chìa khoá; CLB không đặt, xin duyệt hay tự huỷ phòng học. Nhóm
`Manage facility bookings` chỉ áp dụng cho `HALL`/`OUTDOOR`/`STAGE`/`EQUIPMENT`: CLB gửi
`Request non-room facility booking` (UC45), ICPDP xử lý `Decide non-room facility request`
(UC46), CLB huỷ/trả qua `Cancel / release facility booking` (UC47).
Đã xuất lại PNG các trang Club Member 1, Club Member 2 và ICPDP 2 từ nguồn `.drawio` hiện hành.

**PNG state diagram Property Booking** đã xuất lại ngày 13/10/2026 (UC58 tạo buổi `Approved`, thu hồi → `Released`).
