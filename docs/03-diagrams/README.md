# 03 — Sơ đồ

Nguồn draw.io kèm bản xuất PNG. Mở file `.drawio` bằng draw.io / diagrams.net hoặc extension
tương ứng của VS Code.

| File | Thể hiện điều gì |
|---|---|
| [`UCMS_Context_Diagram_v2.1.drawio`](UCMS_Context_Diagram_v2.1.drawio) | **Context diagram hiện hành** — biên hệ thống và 46 luồng dữ liệu giữa UCMS và 7 thực thể: 4 actor (Student, Club Member, Club Leader, ICPDP Officer) và 3 hệ thống ngoài (Google OAuth, Google SMTP, Cloudinary). Mỗi luồng là một nhóm dữ liệu, mỗi luồng một mũi tên thẳng; bảng ánh xạ luồng → use case ở `../SRS.md` §14.4 (review issue I56, I57, I58, I61, I64) |
| [`UCMS_UseCase_ByActor.drawio`](UCMS_UseCase_ByActor.drawio) | **Use case diagram hiện hành**, phủ UC01–UC55 và UC58 (phân phòng học theo học kỳ, thêm 2026-10-11) — mỗi trang một nhóm actor: 9 trang: All users (kèm generalization User ◁ Student ◁ Club Member ◁ Club Leader), Student, Club Member - Events & bookings, Club Leader, Club Leader - Club & recruitment, Club Leader - Events, bookings & finance, ICPDP 1–3 (bộ trang từ commit `107ea77`, `3f1c580`; review issue I66) |
| [`UCMS_State_Diagrams.drawio`](UCMS_State_Diagrams.drawio) | **Máy trạng thái hiện hành** — Club Application, Club, Membership, Recruitment Campaign, Recruitment Application, Event, Event Budget (ngân sách của sự kiện đã duyệt), Property Booking (buổi phòng học `ROOM` do UC58 sinh thẳng ở `Approved`) |
| [`UCMS_ERD.drawio`](UCMS_ERD.drawio) | **ERD hiện hành** (16/10/2026) — mô hình **khái niệm** theo **ký pháp Chen**: 48 thực thể (hình chữ nhật), 349 thuộc tính (elip), 102 quan hệ (hình thoi). 11 trang: trang 1 *ERD general* là ERD tổng quát liền mạch (đủ 47 thực thể, các quan hệ chính, mỗi thực thể ba thuộc tính tiêu biểu), trang 2–11 là từng module M01–M12 với đủ thuộc tính và quan hệ. Không còn Role / Permission vì role đã cố định. Không ghi kiểu dữ liệu, khoá hay ràng buộc; có ghi bản số `1` / `N` trên từng quan hệ. Đối chiếu từ [`../05-implementation/UCMS_Database_Design.dbml`](../05-implementation/UCMS_Database_Design.dbml); xem mục *Ký hiệu ERD* bên dưới |
| [`UCMS_Database_Schema.drawio`](UCMS_Database_Schema.drawio) | **Database schema hiện hành** (16/10/2026) — mô hình **vật lý** MongoDB theo ký pháp Crow's Foot, sinh từ `docs/05-implementation/UCMS_Database_Design.dbml` (nguồn mà server dùng để tạo collection và index) cộng `authSessions` (khai báo riêng trong `server/src/infra/db/mongo-auth-session-repository.ts`): 53 collection, mỗi trường ghi tên, kiểu BSON (`ObjectId`, `String`, `Int (Number)`, `Decimal128`, `Boolean`, `Date`, `Object (embedded)`, `String[]`, `String · enum X`) và ràng buộc `PK`/`FK`/`UQ`/`NN`/giá trị mặc định; unique ghép ghi ở dòng vàng cuối bảng. 12 trang: tổng quan (chỉ khoá và tham chiếu), 10 trang theo module, trang *Enums* liệt kê 28 enum và trường dùng chúng. Khác ERD, schema vẫn có `roles`, `permissions`, `userRoleAssignments`, `clubRoleStructureVersions` vì các collection này còn trong database và code. Ảnh `img/UCMS_Database_Schema_*.png` |
| [`UCMS_Package_Diagrams.drawio`](UCMS_Package_Diagrams.drawio) | **Package diagram hiện hành** (13/10/2026) — Front-end (`client/src`) và Back-end (`server/src`), vẽ theo đúng thư mục và quan hệ import đang có trong code (`interface/http`, `interface/jobs`, `usecase`, `domain`, `infra/db`·`auth`·`files`·`config`, `main.ts`) |
| [`UCMS_Screen_Flow.drawio`](UCMS_Screen_Flow.drawio) | **Screen flow gộp một trang** cho mọi role: đăng nhập → Workspace picker → Public area, Student, Club và ICPDP workspace; đối chiếu router `client/src/main.tsx` ngày 13/10/2026 |
| [`UCMS_Organization_and_Flows.drawio`](UCMS_Organization_and_Flows.drawio) | **Cơ cấu tổ chức và luồng nghiệp vụ chính** — trang Organization structure (SRS §2.4) và Main business flows F1–F10 (SRS §2.5) |
| [`UCMS_Main_Workflow.drawio`](UCMS_Main_Workflow.drawio) | **Main workflow hiện hành** (13/10/2026) — đúng **hai** swimlane tổng quát, làn dọc theo actor (Student, Club Leader, ICPDP Officer, UCMS), luồng chạy từ trên xuống theo giai đoạn nghiệp vụ: trang 1 *Club and membership governance* (thành lập → thiết lập CLB → tuyển và quản lý thành viên → ban chủ nhiệm và nhiệm kỳ → giám sát, đánh giá, vòng đời), trang 2 *Event management and supporting operations* (đề xuất → xét duyệt → nguồn lực khi cần → công bố và đăng ký → tổ chức và điểm danh → báo cáo, quyết toán, phản hồi, đánh giá). Không vẽ chi tiết từng use case |
| [`UCMS_Swimlane_Flows.drawio`](UCMS_Swimlane_Flows.drawio) | **Swimlane chi tiết từng luồng** (tiếng Anh, 14 trang) — tài liệu tham khảo sâu cho SRS §2.5, **không còn là main workflow của report**: Club Founding, Leadership Transition, Member Recruitment, Event Proposal, Event Execution, Event Finance, Room Allocation (UC58), Facility Request, Complaint Handling, Periodic Report, Violation Case, Club Evaluation, Suspension and Dissolution, Club Leader and Club Member. Phía CLB chỉ có hai role cố định: `Club Leader` thao tác, `Club Member` chỉ xem và tham gia |
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
| ERD | `UCMS_ERD.drawio` | 11 ảnh `UCMS_ERD_01…11_*.png` (tổng quát + 10 trang module), kèm bản `.svg` cùng tên |
| Mainwork flow | `UCMS_Main_Workflow.drawio` | 2 ảnh `UCMS_Main_Workflow_01_*.png`, `…_02_*.png`, kèm bản `.svg` cùng tên |

Main workflow của report là **đúng hai swimlane tổng quát** trong `UCMS_Main_Workflow.drawio`. Bộ 14 swimlane
chi tiết (`UCMS_Swimlane_Flows.drawio`) chỉ còn là tài liệu tham khảo; bản flowchart không chia làn
(`UCMS_Main_Workflows.drawio`) đã bị loại ngày 13/10/2026 và xoá khỏi repo.

Trên Google Drive của nhóm, mỗi loại sơ đồ nằm trong một thư mục con của `Diagrams`
(`Context Diagram`, `Usecase Diagram`, `State Diagram`, `Package Diagram`, `Screen Flow`, `ERD`,
`Main flow`), mỗi thư mục giữ đúng file `.drawio` hiện hành cùng tên với file ở đây. Sửa sơ đồ thì
sửa ở repo trước, rồi tải đè file tương ứng lên Drive.

## Ký hiệu ERD

`UCMS_ERD.drawio` là **mô hình khái niệm theo ký pháp Chen**, không phải schema vật lý.

- **Hình chữ nhật** là thực thể, **elip** là thuộc tính nối vào thực thể của nó, **hình thoi** là quan
  hệ mang tên nghiệp vụ nối các thực thể. Hình chữ nhật **nét đứt, chữ nghiêng** là một thực thể được
  lặp lại từ chỗ khác (ví dụ `User`, `Club`) để đường nối không phải chạy xuyên trang; nó vẫn là cùng
  một thực thể.
- Sơ đồ **không ghi** kiểu dữ liệu, `PK`/`FK`/`UQ`, `NOT NULL`, giá trị mặc định hay index; thuộc tính
  khoá không gạch chân.
- **Bản số (cardinality)** ghi bằng chữ đỏ `1` / `N` trên mỗi đường nối thực thể với hình thoi, sát
  hình thoi. Số trên đường của thực thể E là số E tham gia vào một lần quan hệ với phía bên kia, ví dụ
  `Club 1 — organises — N Event`: một CLB tổ chức nhiều sự kiện, mỗi sự kiện thuộc một CLB. Bản số
  suy ra từ schema: phía được tham chiếu là `1`, phía giữ tham chiếu là `N`, hoặc `1` nếu tham chiếu
  là duy nhất (ví dụ `Event 1 — is funded by — 1 Event Budget`). Có 91 quan hệ 1:N, 8 quan hệ 1:1
  và 3 quan hệ N:1; không có quan hệ N:M. Hai quan hệ 1:1 suy từ unique ghép theo
  `(eventId, studentId)`: `Event Registration — Attendance` và `Attendance — Event Feedback`.
- Mỗi trường tham chiếu trong DBML được thay bằng **một quan hệ có tên** (ví dụ `Club organises
  Event`, `User files Complaint`), không vẽ thành thuộc tính. Các trường `…By` cùng trỏ về `User`
  trên một thực thể được gộp thành một quan hệ (ví dụ `submits / decides`).
- Ba quan hệ không có trường tham chiếu nhưng có căn cứ trong schema và code: `Club Field
  classifies Club` và `Club Field classifies Club Application` (trường `field` lấy từ danh mục
  `clubFields`), `Evaluation Dimension is scored in Dimension Result` (`dimensionCode`).
- **Không có RBAC.** Từ 13/10/2026 phía CLB chỉ còn hai role cố định (`Club Leader`, `Club Member`),
  bộ quyền của Club Leader là hằng số trong code (`server/src/domain/access.ts`). Vì vậy mô hình
  khái niệm bỏ bốn collection `roles`, `permissions`, `userRoleAssignments`,
  `clubRoleStructureVersions`; vai trò hệ thống của tài khoản (Student, ICPDP Officer) là thuộc
  tính `System role` của `User`. `Club Position` vẫn còn vì ghế Chủ nhiệm / Phó chủ nhiệm quyết
  định ai là Club Leader, nhưng không mang danh sách quyền. Các collection này vẫn nằm trong DBML
  và database; ERD chỉ không vẽ chúng.
- Trang *ERD general* chỉ vẽ quan hệ giữa các thực thể nghiệp vụ và 13 quan hệ chính của `User`
  (sở hữu, nộp, đăng ký, nhận…); các quan hệ `User` đóng vai người xử lý (`submits / decides`,
  `records`, `verifies`…) nằm ở trang module.
- **Lược bỏ có chủ ý:** `id`, `createdAt`, `updatedAt`; 12 tham chiếu là bản sao suy ra được qua
  quan hệ khác (ví dụ `attendances.clubId` suy ra qua `Event`); và các thuộc tính thuần kỹ thuật
  như `googleSubject`, `normalizedName`, `sortOrder`, bộ đếm (`confirmedRegistrationCount`,
  `nextWaitlistPosition`, `currentVersionNo`), bản sao tên (`clubName`), `payload`/`attempts` của
  thông báo, `before`/`after`/`correlationId` của audit log. Ba tham chiếu đa hình (`entityId`,
  `sourceRefId`, `originRefId`) không thành quan hệ vì không trỏ tới một thực thể cố định.
- 48 trong 52 collection có mặt dưới dạng thực thể; không gộp thực thể nào, chỉ bỏ bốn collection
  RBAC nêu trên. 16/10/2026 gỡ `clubSuspensionRequests` (bản thiết kế cũ, code không dùng);
  `Suspension Request` nay lấy từ `suspensionRequests`, collection mà UC14 thực sự ghi.
- Sửa 16/10/2026: thêm thực thể `Membership Reconfirmation` (UC21 A2). `complaints` vẽ thành
  `Student Feedback` (UC50 góp ý một chiều); bỏ quan hệ leo thang sang `Violation`, liên kết khiếu nại
  trùng và các thuộc tính ticket (`triage`, `clubResponse`, `responseDueAt`, `withdrawnAt`,
  `closedAt`, `evidence`) vì UC51/UC52 đã rút.
- Nguồn đối chiếu là [`../05-implementation/UCMS_Database_Design.dbml`](../05-implementation/UCMS_Database_Design.dbml).
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

**Phân chia actor phía CLB (2026-10-13, I66):** sơ đồ không còn vẽ khung permission. Trang
Club Member - Events & bookings chứa các use case mọi thành viên `Active` đều làm được:
`Manage my membership`, `Manage attendance` (`club.attendance.manage` mặc định) và
`Manage allocated rooms` (`club.room.view` mặc định). Ba trang Club Leader chứa mọi use case vận
hành CLB còn lại — hồ sơ, thành viên, tuyển, đơn ứng tuyển, sự kiện, booking CSVC, báo cáo, khoản
chi, phản hồi, khiếu nại, role CLB, ban chủ nhiệm, chuyển giao, tạm ngừng (BR54, BR55). Oval
`Configure role permissions` của `Manage club roles` đã bị bỏ vì role không mang permission.

**Xem danh sách thành viên (2026-10-14):** `Club membership` của Club Member
include `View member list` (UC24), dành cho thành viên `Active`/`Inactive` trong
CLB đang chọn. Club Leader kế thừa quyền xem; `Manage members` chỉ include
`Update membership status` (UC21).

**Xem hồ sơ CLB (2026-10-14):** hồ sơ CLB được xem qua `Browse clubs` (UC06)
của Student; Club Member và Club Leader kế thừa chức năng này. Không vẽ riêng oval
`View club profile` ở hai actor phía CLB; `Manage club profile` của Leader chỉ
include `Update club information` và `Define club structure` (UC09).

**Kế thừa actor trên từng trang (2026-10-12):** mỗi trang nghiệp vụ chỉ vẽ một quan hệ
generalization tới actor cha trực tiếp bên ngoài biên `UCMS`: Student → User; Club Member → Student;
Club Leader → Club Member; ICPDP Officer → User. Mũi tên dùng nét liền,
tam giác rỗng hướng về actor cha. Trang All users giữ cây kế thừa tổng thể. Các use case được
kế thừa tham chiếu sang trang của actor cha, không cần lặp lại oval trên trang của actor con.
Ảnh PNG theo bộ 9 trang mới: `UCMS_UseCase_ByActor_01_All-users.png`, `02_Student`,
`03_Club-Member-Events-bookings`, `04_Club-Leader`, `05_Club-Leader-Club-recruitment`,
`06_Club-Leader-Events-bookings-finance`, `07_ICPDP-1-Access-club-lifecycle`,
`08_ICPDP-2-Events-bookings-finance`, `09_ICPDP-3-Compliance-evaluation`. Bản Word tổng hợp ở
[`../UCMS_UseCase_ByActor.docx`](../UCMS_UseCase_ByActor.docx) dùng đúng bộ ảnh này (cập nhật
2026-10-13, I66).

**Luồng phòng học và CSVC (đối chiếu code ngày 2026-10-12):** ICPDP cấp phòng học `ROOM`
theo học kỳ qua `Manage room allocations` (UC58), gồm cấp, xem và thu hồi. CLB xem qua
`Manage allocated rooms «include» View allocated rooms` ở trang Club Member - Events & bookings.
Mọi thành viên `Active` đều xem được lịch (`club.room.view`, từ I66) để xuất trình cho bảo vệ
khi nhận chìa khoá; CLB không đặt, xin duyệt hay tự huỷ phòng học. Nhóm
`Manage facility bookings` chỉ áp dụng cho `HALL`/`OUTDOOR`/`STAGE`/`EQUIPMENT`: CLB gửi
`Request non-room facility booking` (UC45), ICPDP xử lý `Decide non-room facility request`
(UC46), Club Leader huỷ/trả qua `Cancel / release facility booking` (UC47).

**PNG state diagram Property Booking** đã xuất lại ngày 13/10/2026 (UC58 tạo buổi `Approved`, thu hồi → `Released`).
