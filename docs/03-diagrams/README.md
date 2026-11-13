# 03 — Sơ đồ

Nguồn draw.io kèm bản xuất PNG. Mở file `.drawio` bằng draw.io / diagrams.net hoặc extension
tương ứng của VS Code.

| File | Thể hiện điều gì |
|---|---|
| [`UCMS_Context_Diagram.drawio`](UCMS_Context_Diagram.drawio) | **Context diagram hiện hành** (nội dung v2.1; file `UCMS_Context_Diagram_v2.1.drawio` cũ đã gộp vào đây và bị xoá ngày 14/10/2026, commit `402dafa`) — biên hệ thống và 46 luồng dữ liệu giữa UCMS và 7 thực thể: 4 actor (Student, Club Member, Club Leader, ICPDP Officer) và 3 hệ thống ngoài (Google OAuth, Google SMTP, Cloudinary). Mỗi luồng là một nhóm dữ liệu, mỗi luồng một mũi tên thẳng; bảng ánh xạ luồng → use case ở `../SRS.md` §14.4 (review issue I56, I57, I58, I61, I64). Ảnh `img/UCMS_Context_Diagram_01_Context-diagram.png` (xuất lại 13/11/2026: luồng role CLB của UC23 đã rút được thay bằng luồng xác nhận/xin dời lịch bảo vệ sự kiện BR63, lịch bảo vệ gộp vào luồng quyết định thẩm định, Cloudinary ghi `Uploaded file`/`File URL`; các ảnh `_v2`, `_v2.1` là lịch sử) |
| [`UCMS_UseCase_ByActor.drawio`](UCMS_UseCase_ByActor.drawio) | Use case diagram phủ UC01–UC55 và UC58 (bản 19/10/2026, sửa 13/11/2026). Các oval `Manage club roles` / CRUD role của UC23 đã bỏ và ảnh đã xuất lại ngày 13/11/2026, khớp quyết định hai role cố định trong `UCMS_Organization_and_Flows.drawio` và SRS hiện hành (không có custom role) |
| [`UCMS_State_Diagrams.drawio`](UCMS_State_Diagrams.drawio) | **Máy trạng thái hiện hành** — Club Application, Club, Membership, Recruitment Campaign, Recruitment Application, Event (bổ sung trạng thái `Re-defense Pending` theo BR63), Event Budget (ngân sách của sự kiện đã duyệt), Property Booking (buổi phòng học `ROOM` do UC58 sinh thẳng ở `Approved`), Event Defense Session (phiên bảo vệ đề xuất sự kiện giữa CLB và ICPDP: `SCHEDULED`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `IN_PROGRESS`, `DEFENDED`, `CANCELLED`, `NO_SHOW` theo BR63). Trang Club theo SRS §6.2 sửa 2026-11-01: CLB mới tạo thẳng ở `Active` khi UC08 duyệt, không còn `Pending Setup` (sửa sơ đồ và xuất lại `img/UCMS_State_Diagrams_02_Club.png` ngày 02/11/2026) |
| [`UCMS_ERD.drawio`](UCMS_ERD.drawio) | **ERD hiện hành** (19/10/2026) — mô hình **khái niệm**, 33 thực thể (màu theo module), 188 thuộc tính nghiệp vụ (183 của thực thể + 5 của hai quan hệ N:M), **mỗi ký pháp đúng một hình**: trang 1 *ERD Chen* theo **ký pháp Chen chuẩn** (hình chữ nhật, elip thuộc tính, elip đôi là đa trị, hình thoi quan hệ, mỗi thực thể có **thuộc tính khoá gạch chân** — thêm elip `ID` cho 28 thực thể không có khoá tự nhiên nên trang này có 216 thuộc tính), bản số ghi bằng nhãn `1` / `N` / `M` cạnh thực thể, **nét đôi** là tham gia toàn phần, 53 quan hệ; trang 2 *ERD Crow's Foot* theo **ký pháp Crow's Foot** thuần (bảng thực thể liệt kê thuộc tính, đường nối thẳng giữa hai bảng, tên quan hệ ghi trên đường, hai quan hệ N:M vẽ thành thực thể liên kết `Candidate Evaluation` / `Dimension Result`), 55 đường nối; trang 3–4 *(no legend)* là chính hai hình đó bỏ tiêu đề / chú giải / dải màu module, để dán vào report. Không có Role / Permission, không có bảng kỹ thuật (approval, notification, audit). Không ghi kiểu dữ liệu hay ràng buộc; khoá chỉ vẽ ở trang Chen. Đối chiếu từ [`../05-implementation/UCMS_Database_Design.dbml`](../05-implementation/UCMS_Database_Design.dbml); xem mục *Ký hiệu ERD* bên dưới. Ảnh `img/UCMS_ERD_01_ERD-Chen.png`, `img/UCMS_ERD_02_ERD-Crow-s-Foot.png` (có chú giải, để đọc), `img/UCMS_ERD_03_ERD-Chen-no-legend.png`, `img/UCMS_ERD_04_ERD-Crow-s-Foot-no-legend.png` (không chú giải, để dán vào report) và `.svg` cùng tên |
| [`UCMS_Database_Schema.drawio`](UCMS_Database_Schema.drawio) | **Database schema hiện hành** — mô hình **vật lý** MongoDB theo ký pháp Crow's Foot, sinh từ `docs/05-implementation/UCMS_Database_Design.dbml` (nguồn mà server dùng để tạo collection và index) cộng `authSessions`: 55 collection (54 bảng của DBML, gồm `routingRuleSets` ở M01 và `eventDefenseSessions` ở M05/M06, cộng `authSessions`; sinh lại 13/11/2026), mỗi trường ghi tên, kiểu BSON (`ObjectId`, `String`, `Int (Number)`, `Decimal128`, `Boolean`, `Date`, `Object (embedded)`, `String[]`, `String · enum X`) và ràng buộc `PK`/`FK`/`UQ`/`NN`/giá trị mặc định; unique ghép ghi ở dòng vàng cuối bảng. 12 trang: tổng quan (chỉ khoá và tham chiếu), 10 trang theo module, trang *Enums* liệt kê đúng 28 enum của DBML (bổ sung `eventDefenseState`, cập nhật `eventState` và `reviewOutcome`, bỏ `feedbackRecipient`) và trường dùng chúng. Ảnh `img/UCMS_Database_Schema_*.png` |
| [`UCMS_Package_Diagrams.drawio`](UCMS_Package_Diagrams.drawio) | **Package diagram hiện hành** (13/10/2026) — Front-end (`client/src`) và Back-end (`server/src`), vẽ theo đúng thư mục và quan hệ import đang có trong code (`interface/http`, `interface/jobs`, `usecase`, `domain`, `infra/db`·`auth`·`files`·`config`, `main.ts`). Ảnh `img/UCMS_Package_Diagrams_01_Front-end-packages.png`, `img/UCMS_Package_Diagrams_02_Back-end-packages.png` (xuất lại 02/11/2026) |
| [`UCMS_Screen_Flow.drawio`](UCMS_Screen_Flow.drawio) | **Screen flow hiện hành**, một trang gộp cho mọi role, đối chiếu từ router `client/src/main.tsx`, sidebar trong `WorkspaceShell.tsx`, top bar trong `PublicLayout.tsx` và các `Link`/`navigate` trong `pages/`: 75 màn hình (sửa 13/11/2026: bổ sung `Event defense room` và `Approval routing` trong ICPDP workspace; `Registration & attendance`, `Allocated rooms` tô màu Club Member vì mọi thành viên `Active` có hai quyền mặc định; nhãn khiếu nại đổi thành `Complaints`; màn public tô màu mọi user). Ảnh `.svg` cùng tên chưa xuất lại, dùng bản `.png`, 5 khung theo layout — Entry (Login, Workspace picker), Public area, Student workspace, Club workspace, ICPDP workspace. Màu hộp theo actor của use case model (xem *Màu trong screen flow* bên dưới); **không có Guest**, mọi màn hình đều sau UC01. Các màn hình trên sidebar/top bar xếp dọc cột trái mỗi khung và mở được từ mọi màn hình cùng khung nên không vẽ mũi tên menu; mũi tên chỉ vẽ cho màn hình mở từ màn hình khác (list → detail, form). Hộp nét đứt chữ nghiêng là màn hình của khung khác lặp lại. Ảnh `img/UCMS_Screen_Flow_01_Screen-flow.png` và `.svg` cùng tên. |
| [`UCMS_Organization_and_Flows.drawio`](UCMS_Organization_and_Flows.drawio) | **Cơ cấu tổ chức và luồng nghiệp vụ chính mới nhất** (02/11/2026) — nguồn quyết định cho mô hình role cố định: chỉ `Club Leader` / `Club Member`, chức danh không cấp permission, UC23 bị rút. Trang Main business flows F1–F10 cũng phản ánh CLB `Active` ngay khi UC08 duyệt |
| [`UCMS_Main_Workflow.drawio`](UCMS_Main_Workflow.drawio) | **Main workflow hiện hành** — **bảy** swimlane tổng quát, mỗi trang một luồng chính, làn dọc theo actor (Student, Club Leader, ICPDP Officer, UCMS), luồng chạy từ trên xuống: *01 Club establishment*, *02 Member recruitment*, *03 Periodic reports submission*, *04 Term transition*, *05 Club suspension*, *06 Facilities request*, *07 Event management* (bổ sung nhánh hoạt động bảo vệ đề xuất sự kiện `Event Defense Session` BR63). Ảnh `img/UCMS_Main_Workflow_01…07_*.png`. Không vẽ chi tiết từng use case |
| [`UCMS_Swimlane_Flows.drawio`](UCMS_Swimlane_Flows.drawio) | **Swimlane chi tiết từng luồng** (tiếng Anh, 14 trang) — tài liệu tham khảo sâu cho SRS §2.5, **không còn là main workflow của report**: Club Founding, Leadership Transition, Member Recruitment, Event Proposal (bổ sung lập lịch bảo vệ, xác nhận/dời lịch, phòng Live Room và 4 nhánh quyết định hậu bảo vệ theo BR63), Event Execution, Event Finance, Room Allocation (UC58), Facility Request, Complaint Handling, Periodic Report, Violation Case, Club Evaluation, Suspension and Dissolution, Club Leader and Club Member. Phía CLB chỉ có hai role cố định: `Club Leader` thao tác, `Club Member` chỉ xem và tham gia |
| [`UCMS_System_Architecture.drawio`](UCMS_System_Architecture.drawio) | Sơ đồ kiến trúc hệ thống tổng quan, một trang (02/10/2026). Ảnh `img/UCMS_System_Architecture_01_System-architecture.png` (xuất 19/10/2026); thiết kế chi tiết xem [`../04-design/UCMS_High_Level_Design.md`](../04-design/UCMS_High_Level_Design.md) |
| [`UCMS_Class_Diagrams.drawio`](UCMS_Class_Diagrams.drawio) | **Class diagram theo use case** (report IV.3 Detailed Design), 18 trang: `00 Notation` và `01`…`17` cho 3.3.1–3.5.2 (UC25–UC34, UC38–UC40, UC42–UC43). Sửa 13/11/2026: `Re-defense` trong `EventReviewOutcome`; `activeDefenseSession` và `defenseHistory` trong `EventProposalDetail`; trang 10 (reschedule) và 13–14 (campaign báo cáo định kỳ, 9 return section) theo code hiện hành. Vẽ từ code thật trong `server/src`, mỗi trang chia 4 khung tầng `interface/http`, `usecase`, `domain`, `infra/db`. Ảnh `img/UCMS_Class_00…17_*.png`, xuất bằng `drawio -x -f png -p <trang> --width 2400` |
| [`UCMS_Security_Architecture.drawio`](UCMS_Security_Architecture.drawio) | **Kiến trúc bảo mật** (một trang): các lớp phòng thủ của một request `/api/v1` từ trên xuống — Browser (cookie httpOnly/SameSite, header CSRF) → transport/header → parse và route → `authGuard` (session, khoá, CSRF) → zod → phân quyền trong usecase (vai trò ICPDP / phạm vi CLB + nhiệm kỳ + ghế / chủ sở hữu) → transaction + audit → `errorHandler`; bên phải là Google OIDC và MongoDB (`authSessions`, `auditLogs`), bên trái là mã lỗi trả về ở từng lớp. Ảnh `img/UCMS_Security_01_Request-pipeline.png` |
| [`UCMS_Sequence_Diagrams.drawio`](UCMS_Sequence_Diagrams.drawio) | **Sequence diagram tiêu biểu**, 20 trang: 8 hình, mỗi hình chia 2–3 trang theo pha để vừa trang A4 dọc (cao/rộng ≤ 1,35). Hình **06** mở rộng thành 3 trang: `06 Decide event proposal (1/3)`, `(2/3)` (bổ sung nhánh Re-defense), và `(3/3)` (`06 Event defense session (3/3)`: lập lịch, xác nhận, phòng bảo vệ trực tiếp, lưu note Markdown và phân nhánh quyết định theo BR63). Ảnh `img/UCMS_Sequence_<NN>_<Slug>_p<k>.png` |
| [`img/`](img/) | Bản xuất PNG, đặt tên theo `<tên-file-nguồn>_<số-trang>_<tên-trang>.png` |

## Bộ sơ đồ dùng trong report final

Report final hiện hành là báo cáo Google Doc của nhóm (bản final, 13–14/11/2026). Các bản `.docx` cũ trong
repo (`../Group1_SE1939-NJ_Report_Final.docx` dựng 19/10/2026 và `UCMS_Diagrams.docx`) đã lỗi thời nên được xoá
ngày 14/11/2026. Bảng dưới cho biết mục nào của report dùng sơ đồ nào. Ảnh chèn vào report là các PNG
trong [`img/`](img/); report viết bằng tiếng Anh theo mẫu môn học, tên trạng thái, collection, trường và role
giữ nguyên như trong code.

| Mục trong report | File nguồn | Ảnh dùng |
|---|---|---|
| Project schedule (II.7) | sinh từ lịch sử Git (số file đổi mỗi tuần theo luồng việc, 5 sprint 07/09–13/11/2026) | `UCMS_Project_Schedule.png` |
| Context diagram (III.1) | `UCMS_Context_Diagram.drawio` | `UCMS_Context_Diagram_01_Context-diagram.png` |
| Organization structure, Main business flows (III.1.1, III.3.1.1) | `UCMS_Organization_and_Flows.drawio` | `UCMS_Organization_and_Flows_01_*.png`, `…_02_*.png` |
| Use case diagram (III.2.2.1) | `UCMS_UseCase_ByActor.drawio` | `UCMS_UseCase_ByActor_*.png` |
| State Diagram (III.5.3) | `UCMS_State_Diagrams.drawio` | 9 ảnh `UCMS_State_Diagrams_01…09_*.png` |
| Package Diagram (IV.1.2) | `UCMS_Package_Diagrams.drawio` | `UCMS_Package_Diagrams_01_Front-end-packages.png`, `…_02_Back-end-packages.png` |
| Screen flow (III.3.1.2) | `UCMS_Screen_Flow.drawio` | `UCMS_Screen_Flow_01_Screen-flow.png` — một sơ đồ gộp, 5 khung theo layout, tách actor bằng màu |
| ERD (IV.2) | `UCMS_ERD.drawio` | 4 ảnh, mỗi ký pháp một hình: `UCMS_ERD_01_ERD-Chen.png` (Chen chuẩn: khoá gạch chân, bản số `1`/`N`/`M`, nét đôi là tham gia toàn phần) và `UCMS_ERD_02_ERD-Crow-s-Foot.png` (Crow's Foot) có chú giải để đọc; `UCMS_ERD_03_ERD-Chen-no-legend.png` và `UCMS_ERD_04_ERD-Crow-s-Foot-no-legend.png` không chú giải để dán vào report; kèm bản `.svg` cùng tên |
| Main workflow (III.3.1.1) | `UCMS_Main_Workflow.drawio` | 7 ảnh `UCMS_Main_Workflow_01…07_*.png` |
| Database schema (IV.2) | `UCMS_Database_Schema.drawio` | `UCMS_Database_Schema_01_Schema-overview.png` (10 trang module và trang Enums để tra cứu, không chèn) |
| System architecture (IV.1.1) | `UCMS_System_Architecture.drawio` | `UCMS_System_Architecture_01_System-architecture.png` |
| Sequence diagram tiêu biểu (UC01/02, UC07, UC08, UC17/18/20, UC25, UC26, UC29/30, UC45/46) | `UCMS_Sequence_Diagrams.drawio` | 20 ảnh `UCMS_Sequence_01…08_*_p<k>.png`, mỗi hình 2–3 trang theo pha (mỗi trang draw.io một ảnh) |
| Security mechanism — defence in depth | `UCMS_Security_Architecture.drawio` | `UCMS_Security_01_Request-pipeline.png` (xuất bằng draw.io CLI, `--width 2000`) |
| Class diagram (IV.3, mục 3.3.1–3.5.2) | `UCMS_Class_Diagrams.drawio` | 17 ảnh `UCMS_Class_01…17_*.png`, mỗi use case một trang, cộng `UCMS_Class_00_Notation.png` (trang ký hiệu, thay Figure IV.7) |

Main workflow của report là **bảy swimlane tổng quát** trong `UCMS_Main_Workflow.drawio`. Bộ 14 swimlane
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

> **Lưu ý 07/11/2026:** bảng trên mô tả đúng nội dung file `UCMS_Screen_Flow.drawio` hiện có, vẽ trước khi
> code đổi. App hiện tại đã thay `Feedback` / `Student feedback inbox` bằng `Complaints` (Student, ICPDP) và
> thêm `Complaints` (Club) và `Approval routing` (ICPDP); màn `Roles & permissions` đang có trong code
> là lệch cần gỡ, không phải màn cần bổ sung vào diagram — xem
> `../05-implementation/CODE_DIAGRAM_GAPS.md`.

Không có màu cho Guest: Guest không phải actor (use case model §3), khu public là UC06 của Student và mọi màn hình
đều đứng sau UC01. Hộp nét đứt chữ nghiêng (`Clubs`, `Events`, `Club detail`, `Event detail`, `Join this club`,
`Found a club`) là màn hình của khung khác được lặp lại để khung đang xem tự đủ; mũi tên vào hộp đó vẽ nét đứt.
Từ mọi màn hình trong workspace còn có: thẻ workspace → `Workspace picker`, logo → `Home`, Sign out → `Login`,
chuông thông báo mở hộp thư (dialog) mà từng mục dẫn thẳng tới màn hình tương ứng (`utils/notificationLink.ts`).

## Ký hiệu ERD

`UCMS_ERD.drawio` là **mô hình khái niệm**, vẽ cùng một nội dung theo hai ký pháp, **mỗi ký pháp đúng một
hình** (yêu cầu 19/10/2026: ERD trong report chỉ được là một hình, không chia trang theo module): trang
*ERD Chen* theo **ký pháp Chen chuẩn** (khoá gạch chân, bản số `1` / `N` / `M`, nét đôi là tham gia toàn phần), trang *ERD
Crow's Foot* theo **ký pháp Crow's Foot** thuần; trang 3–4 *(no legend)* lặp lại đúng hai hình đó, bỏ tiêu
đề, chú giải và dải màu module để dán vào report. Không phải schema vật lý (schema vật lý ở
`UCMS_Database_Schema.drawio`). Bản vẽ lại ngày 19/10/2026 thay bản Chen 48 thực thể / 349 thuộc tính (quá
rậm, bản số chỉ ghi chữ `1` / `N`) và bản 10 trang (tổng quát + 9 trang module). Ngày 02/11/2026, theo góp ý của
giảng viên ("Chen entity ellipse"), trang Chen bỏ chân quạ và chuyển sang Chen chuẩn: thêm thuộc tính khoá gạch chân
cho mọi thực thể, bản số ghi bằng nhãn, tham gia toàn phần vẽ nét đôi; trang Crow's Foot giữ nguyên.

- **Trang Chen.** **Hình chữ nhật** là thực thể (màu nền theo module), **elip** là thuộc tính nối vào thực
  thể của nó, **elip đôi** là thuộc tính đa trị (ví dụ `Founding members`, `Seats`, `Evidences`), **hình
  thoi** là quan hệ mang tên nghiệp vụ nối các thực thể. Quan hệ N:M có thể mang thuộc tính riêng nối vào
  hình thoi (`evaluates`: Scores, Total score, Comment; `scores`: Score, Justification).
  - **Thuộc tính khoá** là elip có tên **gạch chân**, mỗi thực thể một khoá. Thực thể có khoá tự nhiên duy nhất
    toàn cục trong DBML gạch chân luôn thuộc tính đó: `User` → `Email`, `Club` → `Code`, `Property` → `Code`,
    `Club Field` → `Name` (`normalizedName` unique), `Evaluation Scheme` → khoá ghép `Period code` + `Version`
    (`uq_scheme`). 28 thực thể còn lại có thêm elip `ID` gạch chân (định danh `id` của document). Không vẽ thực thể
    yếu: mọi collection đều có `id` riêng, các unique ghép theo cha (ví dụ `(clubId, code)` của `Club Position`)
    là ràng buộc nghiệp vụ, không phải khoá bộ phận.
  - **Bản số** ghi bằng nhãn cạnh thực thể ở mỗi đầu đường nối từ hình thoi: `Club 1 — organises — N Event`
    nghĩa là một CLB tổ chức nhiều sự kiện, mỗi sự kiện thuộc một CLB. 1:1 ghi `1` — `1`, N:M ghi `M` — `N`
    (`evaluates`, `scores`).
  - **Tham gia toàn phần** (mọi thực thể đều phải tham gia quan hệ) vẽ **nét đôi** giữa thực thể và hình thoi;
    nét đơn là tham gia bộ phận. Suy ra từ DBML: phía giữ tham chiếu `not null` là toàn phần (ví dụ mọi
    `Event Budget` thuộc một `Event`); phía được tham chiếu luôn là bộ phận. Nét đơn ở cả hai đầu cho 12 quan hệ
    có tham chiếu nullable hoặc N:M / 1:1 tuỳ chọn: `establishes`, `evaluates`, `groups` (`departmentId`),
    `results in` (`sourceApplicationId`), `organises` (`events.clubId`, null với sự kiện cấp trường), `hosts`
    (`propertyId`), `is raised by` (`findingViolationId`), `is contested in` (`contestViolationId`), `scores`,
    `needs` (`propertyBookings.eventId`), hai quan hệ `is subject of` của `Student Feedback` (`clubId`,
    `eventId`).
- **Trang Crow's Foot.** Mỗi thực thể là một **bảng** (tên + cùng bộ thuộc tính với trang Chen, trừ elip `ID`; dòng *in
  nghiêng* là thuộc tính đa trị). Quan hệ là **đường thẳng nối hai bảng**, tên quan hệ ghi trên đường, chân
  quạ ở hai đầu. Hai quan hệ N:M có thuộc tính vẽ thành **thực thể liên kết** (bảng bo góc): `User —writes—
  Candidate Evaluation —assesses— Recruitment Application` (Scores, Total score, Comment) và `Evaluation
  —consists of— Dimension Result —scores— Evaluation Dimension` (Score, Justification); vì vậy trang này có
  35 bảng và 55 đường nối cho 53 quan hệ của trang Chen.
- Sơ đồ **không ghi** kiểu dữ liệu, `PK`/`FK`/`UQ`, `NOT NULL`, giá trị mặc định hay index. Trang Crow's Foot
  không vẽ `id` nên không có thuộc tính khoá; khoá chỉ có ở trang Chen.
- **Bản số (cardinality) trên trang Crow's Foot** ghi bằng chân quạ ở đầu đường nối sát thực thể: `||` đúng một, `o|` không hoặc
  một, `o<` không hoặc nhiều. Ký hiệu sát thực thể E cho biết số E ứng với một thực thể phía bên kia:
  `Club ||— organises —o< Event` nghĩa là mỗi sự kiện thuộc đúng một CLB, một CLB có không hoặc nhiều sự
  kiện. Bản số suy ra từ schema: phía được tham chiếu là `||`, phía giữ tham chiếu là `o<`, hoặc `o|` nếu
  tham chiếu là duy nhất (`Event ||— is funded by —o| Event Budget`). Khi tham chiếu trong DBML được phép null
  thì phía được tham chiếu là `o|` thay cho `||` (02/11/2026, khớp với nét đơn trên trang Chen): `groups`, `results in`,
  `organises`, `hosts`, `is raised by`, `is contested in`, `needs` và hai quan hệ `is subject of`
  (`Club Department o|— groups —o< Club Membership`: thành viên có thể chưa thuộc ban nào). Mô hình có 74 quan hệ: 69 một-nhiều,
  3 một-một (`establishes`, `is funded by`, `entitles`), 2 nhiều-nhiều (`evaluates`, `scores`); hình vẽ 53
  trong số đó (xem *Quan hệ vẽ trong hình* bên dưới). **Không vẽ quan hệ đệ quy**: `previousTermId` của `clubTerms` suy ra từ thứ tự nhiệm kỳ trong cùng CLB, `lockedBy` của
  `users` là chi tiết audit; cả hai vẫn nằm trong DBML.
- **33 thực thể** từ 52 collection của DBML lúc quyết định 19/10/2026 (DBML nay có 54 bảng, thêm `routingRuleSets` và `eventDefenseSessions`; tổng 55 collection kể cả `authSessions`):
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
    collection RBAC `roles`, `permissions`, `userRoleAssignments`, `clubRoleStructureVersions`. Phía CLB
    dùng hai role cố định `Club Leader` / `Club Member`; chức danh không mang permission (code UC23 động
    thêm tạm ngày 07/11/2026 đã gỡ); vai trò hệ thống của tài khoản là thuộc tính `System role` của
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

**Bổ sung quản lý đề xuất sự kiện (2026-10-19):** `Manage event oversight` gồm `Decide event proposal`, `Update event proposal report status`, `Request event proposal supplement`, `Provide revision feedback` (UC26) và `Close event report` (UC34). Yêu cầu bổ sung phải ghi rõ phần thiếu, nhận xét hướng dẫn, hạn bổ sung và phiên bản hồ sơ; chuyển `Revision Requested` và thông báo cho Club Leader. `Manage events` phía Leader có thêm `View proposal status and review comments` và `Supplement and resubmit event proposal` (UC25 A2). Nộp lại tạo phiên bản mới → `Pending Approval`, ICPDP thẩm định lại; giữ lịch sử nhận xét. Không tạo mã UC mới; báo cáo đề xuất trước khi duyệt khác báo cáo sau sự kiện. Hai trang 06/08, ảnh PNG và hai DOCX được đồng bộ.

**Phân chia actor phía CLB (2026-10-13, I66):** sơ đồ không còn vẽ khung permission. Trang
Club Member - Events & bookings chứa các use case mọi thành viên `Active` đều làm được:
`Manage my membership`, `Manage attendance` (`club.attendance.manage` mặc định) và
`Manage allocated rooms` (`club.room.view` mặc định). Ba trang Club Leader chứa mọi use case vận
hành CLB còn lại — hồ sơ, thành viên, tuyển, đơn ứng tuyển, sự kiện, booking CSVC, báo cáo, khoản
chi, phản hồi, khiếu nại, ban chủ nhiệm, chuyển giao, tạm ngừng (BR54, BR55). Toàn bộ nhóm
`Manage club roles` của UC23 (không chỉ oval `Configure role permissions`) đã bỏ khỏi sơ đồ ngày 13/11/2026 vì UC23 đã rút.
> **Cập nhật 2026-11-07:** code đã khớp sơ đồ: mọi thành viên `Active` có `club.attendance.manage`
> và `club.room.view` mặc định (BR54), nên dùng được `Manage attendance` (UC30/UC32) và
> `View allocated rooms` (UC58). Ghi chú 2026-10-17 (chỉ Club Leader) không còn đúng.

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
(báo cáo Google Doc của nhóm, mục III.2.2.1) dùng bộ ảnh này (xuất lại 13/11/2026 sau khi bỏ UC23).

**Luồng phòng học và CSVC (đối chiếu code ngày 2026-10-12):** ICPDP cấp phòng học `ROOM`
theo học kỳ qua `Manage room allocations` (UC58), gồm cấp, xem và thu hồi. CLB xem qua
`Manage allocated rooms «include» View allocated rooms` ở trang Club Member - Events & bookings.
Theo code hiện hành (từ 07/11/2026) mọi thành viên `Active` xem được lịch (`club.room.view` mặc định, xem cập nhật 2026-11-07 ở trên) để xuất trình cho bảo vệ
khi nhận chìa khoá; CLB không đặt, xin duyệt hay tự huỷ phòng học. Nhóm
`Manage facility bookings` chỉ áp dụng cho `HALL`/`OUTDOOR`/`STAGE`/`EQUIPMENT`: CLB gửi
`Request non-room facility booking` (UC45), ICPDP xử lý `Decide non-room facility request`
(UC46), Club Leader huỷ/trả qua `Cancel / release facility booking` (UC47).

**PNG state diagram Property Booking** đã xuất lại ngày 13/10/2026 (UC58 tạo buổi `Approved`, thu hồi → `Released`).
