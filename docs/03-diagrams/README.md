# 03 — Sơ đồ

Nguồn draw.io kèm bản xuất PNG. Mở file `.drawio` bằng draw.io / diagrams.net hoặc extension
tương ứng của VS Code.

| File | Thể hiện điều gì |
|---|---|
| [`UCMS_Context_Diagram.drawio`](UCMS_Context_Diagram.drawio) | **Context diagram hiện hành** (nội dung v2.1; file `UCMS_Context_Diagram_v2.1.drawio` cũ đã gộp vào đây và bị xoá ngày 14/10/2026, commit `402dafa`) — biên hệ thống và 46 luồng dữ liệu giữa UCMS và 7 thực thể: 4 actor (Student, Club Member, Club Leader, ICPDP Officer) và 3 hệ thống ngoài (Google OAuth, Google SMTP, Cloudinary). Mỗi luồng là một nhóm dữ liệu, mỗi luồng một mũi tên thẳng; bảng ánh xạ luồng → use case ở `../SRS.md` §14.4 (review issue I56, I57, I58, I61, I64). Ảnh `img/UCMS_Context_Diagram_01_Context-diagram.png` (xuất lại 19/10/2026 từ file này; các ảnh `_v2`, `_v2.1` là lịch sử) |
| [`UCMS_UseCase_ByActor.drawio`](UCMS_UseCase_ByActor.drawio) | **Use case diagram hiện hành**, phủ UC01–UC55 và UC58 (phân phòng học theo học kỳ, thêm 2026-10-11) — mỗi trang một nhóm actor: 9 trang: User (chỉ UC01, UC02; không vẽ kế thừa — 2026-10-19), Student, Club Member - Events & bookings, Club Leader, Club Leader - Club & recruitment, Club Leader - Events, bookings & finance, ICPDP 1–3 (bộ trang từ commit `107ea77`, `3f1c580`; review issue I66) |
| [`UCMS_State_Diagrams.drawio`](UCMS_State_Diagrams.drawio) | **Máy trạng thái hiện hành** — Club Application, Club, Membership, Recruitment Campaign, Recruitment Application, Event, Event Budget (ngân sách của sự kiện đã duyệt), Property Booking (buổi phòng học `ROOM` do UC58 sinh thẳng ở `Approved`) |
| [`UCMS_ERD.drawio`](UCMS_ERD.drawio) | **ERD hiện hành** (19/10/2026) — mô hình **khái niệm**, 33 thực thể (màu theo module), 188 thuộc tính (183 của thực thể + 5 của hai quan hệ N:M), **mỗi ký pháp đúng một hình**: trang 1 *ERD Chen* theo **ký pháp Chen** (hình chữ nhật, elip thuộc tính, elip đôi là đa trị, hình thoi quan hệ), bản số ghi bằng **chân quạ** (Crow's Foot) ở đầu đường nối, 53 quan hệ; trang 2 *ERD Crow's Foot* theo **ký pháp Crow's Foot** thuần (bảng thực thể liệt kê thuộc tính, đường nối thẳng giữa hai bảng, tên quan hệ ghi trên đường, hai quan hệ N:M vẽ thành thực thể liên kết `Candidate Evaluation` / `Dimension Result`), 55 đường nối; trang 3–4 *(no legend)* là chính hai hình đó bỏ tiêu đề / chú giải / dải màu module, để dán vào report. Không có Role / Permission, không có bảng kỹ thuật (approval, notification, audit). Không ghi kiểu dữ liệu, khoá hay ràng buộc. Đối chiếu từ [`../05-implementation/UCMS_Database_Design.dbml`](../05-implementation/UCMS_Database_Design.dbml); xem mục *Ký hiệu ERD* bên dưới. Ảnh `img/UCMS_ERD_01_ERD-Chen.png`, `img/UCMS_ERD_02_ERD-Crow-s-Foot.png` (có chú giải, để đọc), `img/UCMS_ERD_03_ERD-Chen-no-legend.png`, `img/UCMS_ERD_04_ERD-Crow-s-Foot-no-legend.png` (không chú giải, để dán vào report) và `.svg` cùng tên |
| [`UCMS_Database_Schema.drawio`](UCMS_Database_Schema.drawio) | **Database schema hiện hành** (16/10/2026) — mô hình **vật lý** MongoDB theo ký pháp Crow's Foot, sinh từ `docs/05-implementation/UCMS_Database_Design.dbml` (nguồn mà server dùng để tạo collection và index) cộng `authSessions` (khai báo riêng trong `server/src/infra/db/mongo-auth-session-repository.ts`): 53 collection, mỗi trường ghi tên, kiểu BSON (`ObjectId`, `String`, `Int (Number)`, `Decimal128`, `Boolean`, `Date`, `Object (embedded)`, `String[]`, `String · enum X`) và ràng buộc `PK`/`FK`/`UQ`/`NN`/giá trị mặc định; unique ghép ghi ở dòng vàng cuối bảng. 12 trang: tổng quan (chỉ khoá và tham chiếu), 10 trang theo module, trang *Enums* liệt kê 28 enum và trường dùng chúng. Khác ERD, schema vẫn có `roles`, `permissions`, `userRoleAssignments`, `clubRoleStructureVersions` vì các collection này còn trong database và code. Ảnh `img/UCMS_Database_Schema_*.png` |
| [`UCMS_Package_Diagrams.drawio`](UCMS_Package_Diagrams.drawio) | **Package diagram hiện hành** (13/10/2026) — Front-end (`client/src`) và Back-end (`server/src`), vẽ theo đúng thư mục và quan hệ import đang có trong code (`interface/http`, `interface/jobs`, `usecase`, `domain`, `infra/db`·`auth`·`files`·`config`, `main.ts`) |
| [`UCMS_Screen_Flow.drawio`](UCMS_Screen_Flow.drawio) | **Screen flow hiện hành** (19/10/2026), một trang gộp cho mọi role, đối chiếu từ router `client/src/main.tsx`, sidebar trong `WorkspaceShell.tsx`, top bar trong `PublicLayout.tsx` và các `Link`/`navigate` trong `pages/`: 73 màn hình (mỗi hộp một route, chỉ ghi tên màn hình), 5 khung theo layout — Entry (Login, Workspace picker), Public area, Student workspace, Club workspace, ICPDP workspace. Màu hộp theo actor của use case model (xem *Màu trong screen flow* bên dưới); **không có Guest**, mọi màn hình đều sau UC01. Các màn hình trên sidebar/top bar xếp dọc cột trái mỗi khung và mở được từ mọi màn hình cùng khung nên không vẽ mũi tên menu; mũi tên chỉ vẽ cho màn hình mở từ màn hình khác (list → detail, form). Hộp nét đứt chữ nghiêng là màn hình của khung khác lặp lại. Tên hộp là nhãn sidebar tiếng Anh trong `client/src/i18n/common.ts`; nhãn nhóm chỉ vẽ cho nhóm có thật trong sidebar, mục đứng ngoài nhóm cách ra một khoảng. Dialog/panel trong trang (đăng ký, check-in, góp ý, rút khỏi CLB, onboard thành viên, editor chính sách…) không vẽ; các link phụ cũng không vẽ: `Clubs` → `Join this club` (nút *Recruiting now* trên thẻ CLB) và các link sang `Compliance case` từ `Periodic reports`, `Post-event reports`, `Budget reconciliation`. Nét từ `Workspace picker` đi theo rãnh giữa các khung và vào `Overview` từ bên trái để không đè tiêu đề khung; khu public xếp `Clubs` / `Home` / `Events` (khác thứ tự top bar) để `Home` toả lên `Club detail` và xuống `Event detail` mà không nét nào cắt nhau. Ảnh `img/UCMS_Screen_Flow_01_Screen-flow.png` và `.svg` cùng tên. Bản cũ (13/10/2026, file nguồn xoá 14/10/2026) đã bị thay thế |
| [`UCMS_Organization_and_Flows.drawio`](UCMS_Organization_and_Flows.drawio) | **Cơ cấu tổ chức và luồng nghiệp vụ chính** — trang Organization structure (SRS §2.4) và Main business flows F1–F10 (SRS §2.5) |
| [`UCMS_Main_Workflow.drawio`](UCMS_Main_Workflow.drawio) | **Main workflow hiện hành** (13/10/2026) — đúng **hai** swimlane tổng quát, làn dọc theo actor (Student, Club Leader, ICPDP Officer, UCMS), luồng chạy từ trên xuống theo giai đoạn nghiệp vụ: trang 1 *Club and membership governance* (thành lập → thiết lập CLB → tuyển và quản lý thành viên → ban chủ nhiệm và nhiệm kỳ → giám sát, đánh giá, vòng đời), trang 2 *Event management and supporting operations* (đề xuất → xét duyệt → nguồn lực khi cần → công bố và đăng ký → tổ chức và điểm danh → báo cáo, quyết toán, phản hồi, đánh giá). Không vẽ chi tiết từng use case |
| [`UCMS_Swimlane_Flows.drawio`](UCMS_Swimlane_Flows.drawio) | **Swimlane chi tiết từng luồng** (tiếng Anh, 14 trang) — tài liệu tham khảo sâu cho SRS §2.5, **không còn là main workflow của report**: Club Founding, Leadership Transition, Member Recruitment, Event Proposal, Event Execution, Event Finance, Room Allocation (UC58), Facility Request, Complaint Handling, Periodic Report, Violation Case, Club Evaluation, Suspension and Dissolution, Club Leader and Club Member. Phía CLB chỉ có hai role cố định: `Club Leader` thao tác, `Club Member` chỉ xem và tham gia |
| [`UCMS_System_Architecture.drawio`](UCMS_System_Architecture.drawio) | Sơ đồ kiến trúc hệ thống tổng quan, một trang (02/10/2026). Ảnh `img/UCMS_System_Architecture_01_System-architecture.png` (xuất 19/10/2026); thiết kế chi tiết xem [`../04-design/UCMS_High_Level_Design.md`](../04-design/UCMS_High_Level_Design.md) |
| [`img/`](img/) | Bản xuất PNG, đặt tên theo `<tên-file-nguồn>_<số-trang>_<tên-trang>.png` |

## Bộ sơ đồ dùng trong report final

Report final hiện hành là [`../Group1_SE1939-NJ_Report_Final.docx`](../Group1_SE1939-NJ_Report_Final.docx)
(dựng lại 19/10/2026); bảng dưới cho biết mục nào của report dùng sơ đồ nào. Ảnh chèn vào report là các PNG
trong [`img/`](img/); report viết bằng tiếng Anh theo mẫu môn học, tên trạng thái, collection, trường và role
giữ nguyên như trong code.

| Mục trong report | File nguồn | Ảnh dùng |
|---|---|---|
| Context diagram (III.1) | `UCMS_Context_Diagram.drawio` | `UCMS_Context_Diagram_01_Context-diagram.png` |
| Organization structure, Main business flows (III.1.1, III.3.1.1) | `UCMS_Organization_and_Flows.drawio` | `UCMS_Organization_and_Flows_01_*.png`, `…_02_*.png` |
| Use case diagram (III.2.2.1) | `UCMS_UseCase_ByActor.drawio` | `UCMS_UseCase_ByActor_*.png` |
| State Diagram (III.5.3) | `UCMS_State_Diagrams.drawio` | 8 ảnh `UCMS_State_Diagrams_01…08_*.png` |
| Package Diagram (IV.1.2) | `UCMS_Package_Diagrams.drawio` | `UCMS_Package_Diagrams_01_Front-end-packages.png`, `…_02_Back-end-packages.png` |
| Screen flow (III.3.1.2) | `UCMS_Screen_Flow.drawio` | `UCMS_Screen_Flow_01_Screen-flow.png` — một sơ đồ gộp, 5 khung theo layout, tách actor bằng màu |
| ERD (IV.2) | `UCMS_ERD.drawio` | 4 ảnh, mỗi ký pháp một hình: `UCMS_ERD_01_ERD-Chen.png` (Chen, bản số chân quạ) và `UCMS_ERD_02_ERD-Crow-s-Foot.png` (Crow's Foot) có chú giải để đọc; `UCMS_ERD_03_ERD-Chen-no-legend.png` và `UCMS_ERD_04_ERD-Crow-s-Foot-no-legend.png` không chú giải để dán vào report; kèm bản `.svg` cùng tên |
| Main workflow (III.3.1.1) | `UCMS_Main_Workflow.drawio` | 2 ảnh `UCMS_Main_Workflow_01_*.png`, `…_02_*.png`, kèm bản `.svg` cùng tên |
| Database schema (IV.2) | `UCMS_Database_Schema.drawio` | `UCMS_Database_Schema_01_Schema-overview.png` (10 trang module và trang Enums để tra cứu, không chèn) |
| System architecture (IV.1.1) | `UCMS_System_Architecture.drawio` | `UCMS_System_Architecture_01_System-architecture.png` |

Main workflow của report là **đúng hai swimlane tổng quát** trong `UCMS_Main_Workflow.drawio`. Bộ 14 swimlane
chi tiết (`UCMS_Swimlane_Flows.drawio`) chỉ còn là tài liệu tham khảo; bản flowchart không chia làn
(`UCMS_Main_Workflows.drawio`) đã bị loại ngày 13/10/2026 và xoá khỏi repo.

Trên Google Drive của nhóm, mỗi loại sơ đồ nằm trong một thư mục con của `Diagrams`
(`Context Diagram`, `Usecase Diagram`, `State Diagram`, `Package Diagram`, `Screen Flow`, `ERD`,
`Main flow`), mỗi thư mục giữ đúng file `.drawio` hiện hành cùng tên với file ở đây. Sửa sơ đồ thì
sửa ở repo trước, rồi tải đè file tương ứng lên Drive.

## Màu trong screen flow

`UCMS_Screen_Flow.drawio` tô màu mỗi hộp theo actor dùng màn hình đó, theo đúng chuỗi kế thừa của use case model
(User ◁ Student ◁ Club Member ◁ Club Leader; User ◁ ICPDP Officer). Legend nằm ở góc trên, cạnh khung Entry; sơ đồ không ghi đường dẫn hay chú thích, bảng dưới đây là nơi tra cứu.

| Màu | Mã màu | Actor | Màn hình |
|---|---|---|---|
| Xám | `#F5F5F5` | **User** — mọi actor trước khi chọn workspace | `Login` (UC01, Google OAuth, banner lỗi domain / khoá), `Workspace picker` (UC02; mỗi workspace một thẻ, tự bỏ qua khi tài khoản chỉ có một) |
| Vàng | `#FFF9C4` | **Student** (Club Member và Club Leader kế thừa) | Khu public UC06 — `Home`, `Clubs`, `Club detail`, `Events`, `Event detail` (panel đăng ký / check-in / góp ý), `Not found`; Student workspace — `Overview`, `My clubs`, `Join a club` → `Join this club`, `Found a club` → `New club application` → `Club application`, `My events`, `Feedback` |
| Cam | `#FFE0B2` | **Club Member** — Student có membership `Active` | `Member space` (`/workspace/clubs/:clubId`), và trong Club workspace: `Overview`, `Members` (chỉ đọc) |
| Hồng | `#FFCDD2` | **Club Leader** | Mọi màn hình còn lại của Club workspace: `Recruitment` → `Application screening`, `Leadership handover`, `Suspension requests`, `Board`, `Board history`, `Club settings`, `School event invitations`, `Club events`, `Registration & attendance`, `Event feedback`, `Periodic reports`, `Post-event reports`, `Expenses & settlement`, `Allocated rooms`, `Facility requests`, `Compliance and explanations`, `Published evaluations`, `Student feedback` |
| Xanh lá | `#C8F7C5` | **ICPDP Officer** | ICPDP workspace: `Overview`; nhóm Clubs (`Manage clubs`, `Founding applications` → `Application snapshot`, `Suspension requests`, `Board confirmations` → `Board nomination`, `Leadership handovers` → `Leadership transition`, `Club fields`); nhóm Events & facilities (`Event proposals` → `Event proposal`, `Internal events` → `Internal event`, `Post-event reports`, `Event budgets` → `Event budget` → `Budget reconciliation`, `School events` → `School event`, `Events` của khu public — nhãn sidebar *Event calendar*, `Room allocation`, `Facility requests`, `Rooms & equipment`); nhóm Evaluation & reports (`Evaluation criteria`, `Periodic reports` → `Periodic report`, `Club evaluations` → `Club evaluation`, `Compliance cases` → `Compliance case`, `Export reports`); `Student feedback inbox` (ngoài nhóm); nhóm System settings (`School policy`, `Accounts & roles`) |

Không có màu cho Guest: Guest không phải actor (use case model §3), khu public là UC06 của Student và mọi màn hình
đều đứng sau UC01. Hộp nét đứt chữ nghiêng (`Clubs`, `Events`, `Club detail`, `Event detail`, `Join this club`,
`Found a club`) là màn hình của khung khác được lặp lại để khung đang xem tự đủ; mũi tên vào hộp đó vẽ nét đứt.
Từ mọi màn hình trong workspace còn có: thẻ workspace → `Workspace picker`, logo → `Home`, Sign out → `Login`,
chuông thông báo mở hộp thư (dialog) mà từng mục dẫn thẳng tới màn hình tương ứng (`utils/notificationLink.ts`).

## Ký hiệu ERD

`UCMS_ERD.drawio` là **mô hình khái niệm**, vẽ cùng một nội dung theo hai ký pháp, **mỗi ký pháp đúng một
hình** (yêu cầu 19/10/2026: ERD trong report chỉ được là một hình, không chia trang theo module): trang
*ERD Chen* theo **ký pháp Chen** với bản số ghi bằng **chân quạ** (Crow's Foot) ở đầu đường nối, trang *ERD
Crow's Foot* theo **ký pháp Crow's Foot** thuần; trang 3–4 *(no legend)* lặp lại đúng hai hình đó, bỏ tiêu
đề, chú giải và dải màu module để dán vào report. Không phải schema vật lý (schema vật lý ở
`UCMS_Database_Schema.drawio`). Bản vẽ lại ngày 19/10/2026 thay bản Chen 48 thực thể / 349 thuộc tính (quá
rậm, bản số chỉ ghi chữ `1` / `N`) và bản 10 trang (tổng quát + 9 trang module).

- **Trang Chen.** **Hình chữ nhật** là thực thể (màu nền theo module), **elip** là thuộc tính nối vào thực
  thể của nó, **elip đôi** là thuộc tính đa trị (ví dụ `Founding members`, `Seats`, `Evidences`), **hình
  thoi** là quan hệ mang tên nghiệp vụ nối các thực thể. Quan hệ N:M có thể mang thuộc tính riêng nối vào
  hình thoi (`evaluates`: Scores, Total score, Comment; `scores`: Score, Justification).
- **Trang Crow's Foot.** Mỗi thực thể là một **bảng** (tên + cùng bộ thuộc tính với trang Chen; dòng *in
  nghiêng* là thuộc tính đa trị). Quan hệ là **đường thẳng nối hai bảng**, tên quan hệ ghi trên đường, chân
  quạ ở hai đầu. Hai quan hệ N:M có thuộc tính vẽ thành **thực thể liên kết** (bảng bo góc): `User —writes—
  Candidate Evaluation —assesses— Recruitment Application` (Scores, Total score, Comment) và `Evaluation
  —consists of— Dimension Result —scores— Evaluation Dimension` (Score, Justification); vì vậy trang này có
  35 bảng và 55 đường nối cho 53 quan hệ của trang Chen.
- Sơ đồ **không ghi** kiểu dữ liệu, `PK`/`FK`/`UQ`, `NOT NULL`, giá trị mặc định hay index; không vẽ `id`
  nên không có thuộc tính khoá gạch chân.
- **Bản số (cardinality)** ghi bằng chân quạ ở đầu đường nối sát thực thể: `||` đúng một, `o|` không hoặc
  một, `o<` không hoặc nhiều. Ký hiệu sát thực thể E cho biết số E ứng với một thực thể phía bên kia:
  `Club ||— organises —o< Event` nghĩa là mỗi sự kiện thuộc đúng một CLB, một CLB có không hoặc nhiều sự
  kiện. Bản số suy ra từ schema: phía được tham chiếu là `||`, phía giữ tham chiếu là `o<`, hoặc `o|` nếu
  tham chiếu là duy nhất (`Event ||— is funded by —o| Event Budget`). Mô hình có 74 quan hệ: 69 một-nhiều,
  3 một-một (`establishes`, `is funded by`, `entitles`), 2 nhiều-nhiều (`evaluates`, `scores`); hình vẽ 53
  trong số đó (xem *Quan hệ vẽ trong hình* bên dưới). **Không vẽ quan hệ đệ quy**: `previousTermId` của `clubTerms` suy ra từ thứ tự nhiệm kỳ trong cùng CLB, `lockedBy` của
  `users` là chi tiết audit; cả hai vẫn nằm trong DBML.
- **33 thực thể** từ 52 collection của DBML (quyết định 19/10/2026):
  - gộp vào thực thể cha vì là mở rộng 1:1 hoặc phiên bản: `studentProfiles` → `User`,
    `financialReconciliations` → `Event Budget`, `clubApplicationVersions` → `Club Application`,
    `eventProposalVersions` → `Event`, `attendances` → `Event Registration` (nên `Event Feedback` nối với
    `Event Registration` qua `entitles`);
  - thành thuộc tính đa trị: `boardNominationSeats` → `Seats` của `Board Nomination`,
    `financialEvidences` → `Evidences` của `Expense`, `membershipReconfirmations` → `Reconfirmations`
    của `Club Membership`;
  - thành quan hệ N:M có thuộc tính: `candidateEvaluations` → `User evaluates Recruitment Application`,
    `evaluationDimensionResults` → `Evaluation scores Evaluation Dimension`;
  - bỏ vì là hạ tầng kỹ thuật, không phải khái niệm nghiệp vụ: `approvalTasks`, `approvalDecisions`,
    `notifications`, `emailDeliveryLogs`, `auditLogs` (vì vậy module M10 không có trang), và bốn
    collection RBAC `roles`, `permissions`, `userRoleAssignments`, `clubRoleStructureVersions` (từ
    13/10/2026 phía CLB chỉ còn hai role cố định `Club Leader` / `Club Member`, bộ quyền là hằng số
    trong `server/src/domain/access.ts`; vai trò hệ thống của tài khoản là thuộc tính `System role` của
    `User`). `Club Position` vẫn còn vì ghế Chủ nhiệm / Phó chủ nhiệm quyết định ai là Club Leader.
    Mọi collection trên vẫn nằm trong DBML và database; ERD chỉ không vẽ chúng.
- Mỗi trường tham chiếu trong DBML được thay bằng **một quan hệ có tên** (ví dụ `Club organises Event`,
  `User sends Student Feedback`), không vẽ thành thuộc tính. Các trường `…By` cùng trỏ về `User` trên một
  thực thể được gộp thành một quan hệ (ví dụ `submits / decides`).
- Ba quan hệ không có trường tham chiếu nhưng có căn cứ trong schema và code: `Club Field classifies
  Club` và `Club Field classifies Club Application` (trường `field` lấy từ danh mục `clubFields`),
  `Evaluation scores Evaluation Dimension` (`dimensionCode`).
- **Thuộc tính:** mỗi thực thể chỉ vẽ thuộc tính nghiệp vụ chính (2–7: định danh, tên, trạng thái, các mốc
  thời gian và số liệu quan trọng); bỏ `id`, `createdAt`, `updatedAt`, cờ kỹ thuật, bộ đếm, bản sao tên,
  `payload`, và ba tham chiếu đa hình (`entityId`, `sourceRefId`, `originRefId`).
- **Quan hệ vẽ trong hình:** 53 = 45 quan hệ giữa các thực thể nghiệp vụ + 7 quan hệ `User` sở hữu / nộp /
  đăng ký (`issues`, `founds`, `holds`, `applies with`, `registers with`, `gives`, `sends`) + quan hệ N:M
  `User evaluates Recruitment Application`. 21 quan hệ `User` đóng vai **người xử lý** không vẽ để một hình
  còn đọc được: `files / decides` (Suspension Request), `confirms` (Club Term), `assigns / confirms`
  (Position Assignment), `submits / decides` (Board Nomination, Transition Plan, Post-event Report, Periodic
  Report), `publishes` (Recruitment Campaign), `decides` (Recruitment Application, Property Booking),
  `executes` (Withdrawal Request), `cancels` (Event), `checks in / finalises` (Event Registration),
  `invites / responds` (Event Invitation), `settles / closes` (Event Budget), `records` (Budget
  Disbursement, Expense), `opens / decides` (Violation), `verifies` (Corrective Action), `activates`
  (Evaluation Scheme), `finalises` (Evaluation). Chúng là các trường `…By` trong DBML và có đủ trong
  `UCMS_Database_Schema.drawio`.
- `complaints` vẽ thành `Student Feedback` (UC50 góp ý một chiều, không có leo thang sang `Violation`);
  `Suspension Request` lấy từ `suspensionRequests`, collection mà UC14 thực sự ghi.
- Nguồn đối chiếu là [`../05-implementation/UCMS_Database_Design.dbml`](../05-implementation/UCMS_Database_Design.dbml).
  Schema đổi thì sửa DBML trước rồi cập nhật ERD. Bố cục xếp lúc sinh file: trang Chen bằng graphviz `dot`,
  trang Crow's Foot bằng ELK (draw.io CLI); sửa nhỏ thì kéo tay trên draw.io.

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
> **Cập nhật 2026-10-17:** theo quyết định Club Member không có permission quản lý, code chỉ cho
> Club Leader dùng `Manage attendance` (UC30/UC32) và `View allocated rooms` (UC58, cần
> `club.booking.manage`). Trang Club Member - Events & bookings trong `.drawio` vẫn vẽ các oval
> này, cần chuyển sang trang Club Leader.

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
tam giác rỗng hướng về actor cha. Trang User chỉ vẽ actor User với UC01, UC02, không vẽ cây kế thừa
(đổi tên từ All users ngày 2026-10-19). Các use case được
kế thừa tham chiếu sang trang của actor cha, không cần lặp lại oval trên trang của actor con.
Ảnh PNG theo bộ 9 trang mới: `UCMS_UseCase_ByActor_01_User.png`, `02_Student`,
`03_Club-Member-Events-bookings`, `04_Club-Leader`, `05_Club-Leader-Club-recruitment`,
`06_Club-Leader-Events-bookings-finance`, `07_ICPDP-1-Access-club-lifecycle`,
`08_ICPDP-2-Events-bookings-finance`, `09_ICPDP-3-Compliance-evaluation`. Report final
(`../Group1_SE1939-NJ_Report_Final.docx`, mục III.2.2.1) dùng đúng bộ ảnh này (cập nhật 2026-10-19).

**Luồng phòng học và CSVC (đối chiếu code ngày 2026-10-12):** ICPDP cấp phòng học `ROOM`
theo học kỳ qua `Manage room allocations` (UC58), gồm cấp, xem và thu hồi. CLB xem qua
`Manage allocated rooms «include» View allocated rooms` ở trang Club Member - Events & bookings.
Theo code hiện hành chỉ Club Leader xem được lịch (cần `club.booking.manage`; xem ghi chú 2026-10-17 ở trên) để xuất trình cho bảo vệ
khi nhận chìa khoá; CLB không đặt, xin duyệt hay tự huỷ phòng học. Nhóm
`Manage facility bookings` chỉ áp dụng cho `HALL`/`OUTDOOR`/`STAGE`/`EQUIPMENT`: CLB gửi
`Request non-room facility booking` (UC45), ICPDP xử lý `Decide non-room facility request`
(UC46), Club Leader huỷ/trả qua `Cancel / release facility booking` (UC47).

**PNG state diagram Property Booking** đã xuất lại ngày 13/10/2026 (UC58 tạo buổi `Approved`, thu hồi → `Released`).
