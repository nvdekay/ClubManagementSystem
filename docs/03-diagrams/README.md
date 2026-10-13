# 03 — Sơ đồ

Nguồn draw.io kèm bản xuất PNG. Mở file `.drawio` bằng draw.io / diagrams.net hoặc extension
tương ứng của VS Code.

| File | Thể hiện điều gì |
|---|---|
| [`UCMS_Context_Diagram_v2.1.drawio`](UCMS_Context_Diagram_v2.1.drawio) | **Context diagram hiện hành** — biên hệ thống và 46 luồng dữ liệu giữa UCMS và 7 thực thể: 4 actor (Student, Club Member, Club Leader, ICPDP Officer) và 3 hệ thống ngoài (Google OAuth, Google SMTP, Cloudinary). Mỗi luồng là một nhóm dữ liệu, mỗi luồng một mũi tên thẳng; bảng ánh xạ luồng → use case ở `../SRS.md` §14.4 (review issue I56, I57, I58, I61, I64) |
| [`UCMS_Context_Diagram_v2.drawio`](UCMS_Context_Diagram_v2.drawio) | Context diagram v2 (57 luồng, gần như mỗi use case một luồng). **Đã bị thay thế** bởi v2.1; giữ lại làm lịch sử |
| [`UCMS_UseCase_ByActor.drawio`](UCMS_UseCase_ByActor.drawio) | **Use case diagram hiện hành**, phủ UC01–UC55 và UC58 (phân phòng học theo học kỳ, thêm 2026-10-11) — 9 trang, mỗi trang một nhóm actor: All users (kèm generalization User ◁ Student ◁ Club Member ◁ Club Leader), Student, Club Member - Events & bookings, Club Leader, Club Leader - Club & recruitment, Club Leader - Events, bookings & finance, ICPDP 1–3 |
| [`UCMS_State_Diagrams.drawio`](UCMS_State_Diagrams.drawio) | **Máy trạng thái hiện hành** — Club Application, Club, Membership, Recruitment Campaign, Recruitment Application, Event, Event Budget (ngân sách của sự kiện đã duyệt), Property Booking (buổi phòng học `ROOM` do UC58 sinh thẳng ở `Approved`) |
| [`UCMS_ERD.drawio`](UCMS_ERD.drawio) | **ERD hiện hành** (13/10/2026), sinh từ [`../05-implementation/UCMS_Database_Design.dbml`](../05-implementation/UCMS_Database_Design.dbml) — 11 trang: trang 1 là tổng quan 51 collection (chỉ khoá và quan hệ), trang 2–11 là ERD chi tiết từng module M01–M12 với đủ thuộc tính, kiểu dữ liệu và ràng buộc (`PK`, `FK`, `UQ`, `NN`, giá trị mặc định, unique index ghép). Ký hiệu Crow's Foot (Information Engineering), mức vật lý. Quan hệ gồm 94 `Ref` của DBML, hai tham chiếu `eventInvitations` → `events`/`clubs`, và các trường `…By` trỏ về `users`. Ba trường đa hình (`entityId`, `sourceRefId`, `originRefId`) không vẽ quan hệ |
| [`UCMS_Package_Diagrams.drawio`](UCMS_Package_Diagrams.drawio) | **Package diagram hiện hành** (13/10/2026) — Front-end (`client/src`) và Back-end (`server/src`), vẽ theo đúng thư mục và quan hệ import đang có trong code (`interface/http`, `interface/jobs`, `usecase`, `domain`, `infra/db`·`auth`·`files`·`config`, `main.ts`) |
| [`UCMS_Screen_Flow.drawio`](UCMS_Screen_Flow.drawio) | **Screen flow gộp một trang** cho mọi role: đăng nhập → Workspace picker → Public area, Student, Club và ICPDP workspace; đối chiếu router `client/src/main.tsx` ngày 13/10/2026 |
| [`UCMS_Organization_and_Flows.drawio`](UCMS_Organization_and_Flows.drawio) | **Cơ cấu tổ chức và luồng nghiệp vụ chính** — trang Organization structure (SRS §2.4) và Main business flows F1–F10 (SRS §2.5) |
| [`UCMS_Swimlane_Flows.drawio`](UCMS_Swimlane_Flows.drawio) | **Main workflow hiện hành** — swimlane của các luồng nghiệp vụ chính (tiếng Anh), 14 trang: Club Founding, Leadership Transition, Member Recruitment, Event Proposal, Event Execution, Event Finance, Room Allocation (UC58), Facility Request, Complaint Handling, Periodic Report, Violation Case, Club Evaluation, Suspension and Dissolution, Club Leader and Club Member. Phía CLB chỉ có hai role cố định (13/10/2026): mọi làn thao tác của CLB là `Club Leader` (Chủ nhiệm hoặc Phó chủ nhiệm đã được ICPDP xác nhận); `Club Member` chỉ xem và tham gia. Trang 14 thay bằng **Club Leader and Club Member** (đề cử ghế → ICPDP xác nhận → thành Club Leader → hết ghế thì về Club Member). Màu theo bảng chung: hành động xanh dương, quyết định vàng, kết quả tốt xanh lá, tham chiếu sang luồng khác nét đứt. Đã xuất đủ 14 ảnh PNG vào [`img/`](img/), tỉ lệ 2×, nền trắng |
| [`UCMS_System_Architecture.drawio`](UCMS_System_Architecture.drawio) | Sơ đồ kiến trúc hệ thống tổng quan, một trang (02/10/2026). Chưa có bản PNG trong `img/`; thiết kế chi tiết xem [`../04-design/UCMS_High_Level_Design.md`](../04-design/UCMS_High_Level_Design.md) |
| [`UCMS_Context_Diagram.drawio`](UCMS_Context_Diagram.drawio) | Context diagram đầu tiên của nhóm (40 luồng). **Đã bị thay thế**; giữ lại làm lịch sử |
| [`img/`](img/) | Bản xuất PNG, đặt tên theo `<tên-file-nguồn>_<số-trang>_<tên-trang>.png` |

## Bộ sơ đồ dùng trong report v2

Mỗi tab trong nhóm *Diagram* của report lấy đúng một file nguồn ở thư mục này. Ảnh chèn vào report
là các PNG trong [`img/`](img/); phần giải thích trong report viết bằng tiếng Việt, tên trạng thái,
collection, trường và role giữ nguyên tiếng Anh.

| Tab trong report | File nguồn | Ảnh dùng |
|---|---|---|
| Context diagram | `UCMS_Context_Diagram_v2.1.drawio` | `UCMS_Context_Diagram_v2.1_01_*.png` |
| Use case diagram | `UCMS_UseCase_ByActor.drawio` | `UCMS_UseCase_ByActor_*.png` |
| State Diagram | `UCMS_State_Diagrams.drawio` | 8 ảnh `UCMS_State_Diagrams_01…08_*.png` |
| Package Diagram | `UCMS_Package_Diagrams.drawio` | `UCMS_Package_Diagrams_01_Front-end-packages.png`, `…_02_Back-end-packages.png` |
| Screen flow | `UCMS_Screen_Flow.drawio` | `UCMS_Screen_Flow_01_Screen-flow.png` — một sơ đồ gộp, không tách theo role |
| ERD | `UCMS_ERD.drawio` | 11 ảnh `UCMS_ERD_01…11_*.png` (tổng quan + 10 trang module) |
| Mainwork flow | `UCMS_Swimlane_Flows.drawio` | 14 ảnh `UCMS_Swimlane_Flows_01…14_*.png` |

Main workflow của report **là bộ swimlane**. Bản flowchart không chia làn
(`UCMS_Main_Workflows.drawio`) đã bị loại ngày 13/10/2026 và xoá khỏi repo.

Trên Google Drive của nhóm, mỗi loại sơ đồ nằm trong một thư mục con của `Diagrams`
(`Context Diagram`, `Usecase Diagram`, `State Diagram`, `Package Diagram`, `Screen Flow`, `ERD`,
`Main flow`), mỗi thư mục giữ đúng file `.drawio` hiện hành cùng tên với file ở đây. Sửa sơ đồ thì
sửa ở repo trước, rồi tải đè file tương ứng lên Drive.

## Ký hiệu ERD

`UCMS_ERD.drawio` vẽ theo **Crow's Foot (Information Engineering)** ở **mức vật lý**: mỗi hình chữ
nhật là một collection MongoDB, mỗi dòng là một trường với tên, kiểu dữ liệu và ràng buộc.

- Ràng buộc ghi tắt: `PK` khoá chính, `FK` khoá ngoại, `UQ` duy nhất, `NN` bắt buộc; giá trị mặc
  định và unique index ghép ghi ngay trong bảng.
- Đầu mút quan hệ: một gạch là "một", chân quạ là "nhiều", vòng tròn là "không bắt buộc".
- Trang 1 chỉ vẽ khoá và quan hệ của cả 51 collection để nhìn toàn cảnh; trang 2–11 mới có đủ
  thuộc tính, chia theo module M01–M12.
- Nguồn dữ liệu duy nhất là [`../05-implementation/UCMS_Database_Design.dbml`](../05-implementation/UCMS_Database_Design.dbml).
  Schema đổi thì sửa DBML trước rồi sinh lại ERD, không sửa tay trên sơ đồ.

## Quy ước chung

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

**Hai role cố định phía CLB (13/10/2026):** sơ đồ không còn khung permission nét đứt. Phía CLB có
bốn trang: `Club Member - Events & bookings` (việc một thành viên thường làm được: điểm danh,
waitlist, xem phòng được cấp, quản lý tư cách thành viên của mình), `Club Leader` (role, quyền của
role, ban chủ nhiệm), `Club Leader - Club & recruitment` và `Club Leader - Events, bookings &
finance`. Club Leader kế thừa Club Member nên không lặp lại các oval của trang Club Member.

**Kế thừa actor trên từng trang (2026-10-12):** mỗi trang nghiệp vụ chỉ vẽ một quan hệ
generalization tới actor cha trực tiếp bên ngoài biên `UCMS`: Student → User; Club Member → Student;
Club Leader → Club Member; ICPDP Officer → User. Mũi tên dùng nét liền,
tam giác rỗng hướng về actor cha. Trang All users giữ cây kế thừa tổng thể. Các use case được
kế thừa tham chiếu sang trang của actor cha, không cần lặp lại oval trên trang của actor con.
Cả chín trang đã được xuất lại PNG ngày 13/10/2026 từ nguồn `.drawio` hiện hành; ảnh đặt tên theo
đúng số và tên trang. Bản Word tổng hợp ở [`../UCMS_UseCase_ByActor.docx`](../UCMS_UseCase_ByActor.docx)
cần xuất lại khi bộ ảnh đổi.

**Luồng phòng học và CSVC (đối chiếu code ngày 2026-10-12):** ICPDP cấp phòng học `ROOM`
theo học kỳ qua `Manage room allocations` (UC58), gồm cấp, xem và thu hồi. CLB xem qua
`Manage allocated rooms «include» View allocated rooms` ở trang `Club Member - Events & bookings`,
để thành viên xem lịch và xuất trình cho bảo vệ khi nhận chìa khoá; CLB không đặt, xin duyệt hay tự huỷ phòng học. Nhóm
`Manage facility bookings` chỉ áp dụng cho `HALL`/`OUTDOOR`/`STAGE`/`EQUIPMENT`: CLB gửi
`Request non-room facility booking` (UC45), ICPDP xử lý `Decide non-room facility request`
(UC46), CLB huỷ/trả qua `Cancel / release facility booking` (UC47).

**PNG state diagram Property Booking** đã xuất lại ngày 13/10/2026 (UC58 tạo buổi `Approved`, thu hồi → `Released`).
