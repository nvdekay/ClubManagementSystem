# UCMS — Theo dõi các lỗi review Use Case

Đối chiếu 4 tài liệu:

- [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md) — gọi tắt **Model**
- [`UCMS_UseCase_Specification_v2.md`](UCMS_UseCase_Specification_v2.md) — gọi tắt **Spec**
- [`../03-diagrams/UCMS_UseCase_ByActor.drawio`](../03-diagrams/UCMS_UseCase_ByActor.drawio) — gọi tắt **UCD** (use case diagram)
- [`../03-diagrams/UCMS_Context_Diagram.drawio`](../03-diagrams/UCMS_Context_Diagram.drawio) — gọi tắt **CD** (context diagram).
  Từ I15–I20 trở đi, CD hiện hành là [`../03-diagrams/UCMS_Context_Diagram_v2.drawio`](../03-diagrams/UCMS_Context_Diagram_v2.drawio);
  từ I56 trở đi là [`../03-diagrams/UCMS_Context_Diagram_v2.1.drawio`](../03-diagrams/UCMS_Context_Diagram_v2.1.drawio)
- [`../Group1_SE1939-NJ_Report_Final_v2.docx`](../Group1_SE1939-NJ_Report_Final_v2.docx) — gọi tắt
  **Report** (từ I31 trở đi, review ngày 2026-09-26). Ký hiệu mục theo heading của report, ví dụ
  **Report §III.2.1** là mục *2.1 Actors* của chương III.

Ký hiệu `§N` là mục số N của tài liệu đó (heading `## N. ...`). Ví dụ: **Model §9** là mục
`## 9. Actor → use case matrix` trong `UCMS_UseCase_Model_v2.md`.

Ngày review: 2026-09-23.

> **Đánh số use case.** Các issue I01–I58 giữ nguyên số UC tại thời điểm chúng được viết (54 use case,
> UC01–UC54). Từ I59, UC35 và UC36 bị bỏ và UC37–UC54 được đánh số lại thành UC35–UC52 (52 use case);
> bảng ánh xạ số cũ → số mới nằm ở mục I59.

**Khi xử lý một issue, phải làm đủ 2 việc:**

1. Bảng tổng hợp: đổi cột **Trạng thái** và ghi tóm tắt một dòng vào cột **Cách xử lý**.
2. Phần chi tiết: điền mục **Xử lý** với đủ 4 ý: ngày, file đã sửa, thay đổi cụ thể (trước → sau),
   lý do chọn cách này. Với `Không sửa` hoặc `Cần quyết định`, ghi lý do hoặc câu hỏi cần chốt.

**Trạng thái:** `Chưa xử lý` · `Cần quyết định` · `Đã sửa` · `Không sửa`
**Mức độ:** 🔴 mâu thuẫn (tài liệu nói ngược nhau) · 🟡 thiếu sót / sai ký hiệu · 🟢 lỗi nhỏ

## Bảng tổng hợp

| ID | Mức | Vấn đề | Nằm ở đâu | Trạng thái | Cách xử lý |
|---|---|---|---|---|---|
| I01 | 🔴 | Tên actor "Club's admin" khác "CMB" | CD, Spec UC01 | Đã sửa | Đổi tên actor trong CD thành `Club Management Board (CMB)` |
| I02 | 🟡 | Bảng actor → UC thiếu UC32 của CMB | Model §9 | Đã sửa | Thêm UC32 vào dòng CMB ở Model §9 |
| I03 | 🔴 | Club mới (`Pending Setup`) không có ai giữ quyền CMB | Spec UC09, UC10, UC11, UC03 | Đã sửa | Người nộp đơn nhận quyền CMB tạm thời ở UC08, bị thay thế ở UC11 |
| I04 | 🔴 | UC28: Model nói "không mô hình hoá ICPDP huỷ event", Spec lại có luồng A1 | Model UC28, Spec UC28, UCD | Đã sửa | Giữ A1 của Spec: hệ thống tự huỷ event theo UC15/UC42, ICPDP không là actor; sửa câu ở Model cho khớp |
| I05 | 🔴 | Dissolve club: Model có huỷ event/booking, Spec thì không | Model UC15, Spec UC15 | Đã sửa | Giải thể có lịch: kỳ quyết định chạy bình thường → kỳ sau `Dissolving` → cuối kỳ đó `Dissolved`; BR44/BR45 bảo đảm không event nào còn chạy |
| I06 | 🔴 | Trạng thái sau khi resubmit không khớp precondition của UC duyệt | Spec UC07/08, UC25/26, UC35/36, UC47/48; Model §10 | Đã sửa | Nộp lại tạo phiên bản mới và quay về trạng thái chờ duyệt (`Submitted` / `Pending Approval` / `Requested`) |
| I07 | 🔴 | Spec dùng các trạng thái không có trong lifecycle | Spec UC08, UC17, UC26, UC36, UC39, UC52; Model §10 | Đã sửa | Thêm `Withdrawn`, `Expired`, `Exception` vào Model §10; "closed" trong Spec đổi thành `Cancelled`; cập nhật state diagram |
| I08 | 🔴 | BR40 (số người phản hồi tối thiểu) có trong UC04 của Spec, không có trong Model | Spec UC04, Model UC04 | Đã sửa | Thêm BR40 vào Model UC04 cho khớp Spec; D3 chỉ còn là giá trị mặc định |
| I09 | 🟡 | `UC15 «include» UC28/UC49` sai: chỉ xảy ra có điều kiện, lại khác actor | UCD ICPDP 1, CMB 3 | Đã sửa | ~~Đổi thành `UC28 «extend» UC15` và `UC49 «extend» UC15`~~ (huỷ ở I28: bỏ hẳn cạnh) |
| I10 | 🟡 | `UC30 «extend» UC29` sai: waitlist đã nằm trong UC29 A1 | UCD Student, CMB 3 | Đã sửa | Bỏ `UC30 «extend» UC29` và node mượn; UC30 chuyển sang Phase 1 |
| I11 | 🟡 | `UC02 «include» UC01` sai hướng: đăng nhập là điều kiện trước | UCD All users | Đã sửa | Bỏ `UC02 «include» UC01`; UC01 là precondition của UC02 |
| I12 | 🟡 | Thiếu quan hệ UC24 → UC29 / UC31 / UC50 | UCD Student | Đã sửa | ~~Thêm `UC29 / UC31 / UC50 «extend» UC24`~~ (huỷ ở I27); Model UC24 Related thêm UC22 |
| I13 | 🟡 | Tên rút gọn làm mất nghĩa (UC15 thiếu "reactivate", UC49 thiếu "cancel") | UCD | Đã sửa | "Suspend / reactivate / dissolve club", "Cancel / release booking" |
| I14 | 🟡 | Không phân biệt UC Phase 1 và Phase 2 | UCD | Không sửa | Đã bỏ chia phase; UCD không đánh dấu phase là đúng. Phần dọn phase còn lại thuộc I26 |
| I15 | 🟡 | Thiếu luồng dữ liệu ICPDP → hệ thống (chỉ vẽ 3) | CD | Đã sửa | Vẽ lại CD v2: ICPDP → HT có 8 luồng gộp, phủ UC03–05, 08, 11, 13, 15, 26, 34, 36, 37, 39, 41–43, 45, 46, 48, 53 |
| I16 | 🟡 | Thiếu luồng dữ liệu hệ thống → ICPDP | CD | Đã sửa | CD v2: HT → ICPDP có 11 luồng, mỗi hồ sơ nộp lên ICPDP (UC07, 10, 12, 14, 25, 33, 35, 38, 40, 47, 52) và UC44 |
| I17 | 🟡 | Thiếu luồng dữ liệu của CMB | CD | Đã sửa | CD v2: CMB → HT có 17 luồng, HT → CMB có 6 luồng; thêm UC10, 14, 28, 30/32, 35, 49, 54 và UC11, 17, 36, 53 |
| I18 | 🟡 | Thiếu luồng dữ liệu của Student | CD | Đã sửa | CD v2: thêm *Event check-in* (UC31) và *Application results & revision requests* (UC08, UC18) |
| I19 | 🟡 | Có luồng dữ liệu mà không UC nào tạo ra | CD | Đã sửa | Bỏ *Event registration list*, *Club recruitment result*, *Club and event feedback*; đổi *Club evaluation report* → *Evaluation draft* |
| I20 | 🟡 | "Expense & financial report" không khớp tên UC nào | CD | Đã sửa | Đổi thành *Expense & evidence* (UC38) |
| I21 | 🟡 | UC Phase 1 phụ thuộc UC23 (Phase 2), vi phạm BR43 | Model/Spec UC09, UC21; phụ lục Spec | Không sửa | Đã bỏ chia phase (I26) nên phụ thuộc UC23 hợp lệ; Report/SRS đã nêu cả đường UC10/UC11 và UC23 |
| I22 | 🟢 | UC06 tự mâu thuẫn: "chỉ liệt kê club Active" nhưng "club Suspended vẫn hiển thị" | Model/Spec UC06 | Đã sửa | Liệt kê `Active` + `Suspended` (đánh dấu, không hiện đợt tuyển); `Dissolved` không liệt kê. Sửa Spec (md + docx), Model, SRS |
| I23 | 🟡 | Trạng thái `Open for Registration` sai nghĩa khi đã hết hạn đăng ký hoặc event không cần đăng ký | Model §10.5, UC27; Spec UC27, UC28, UC29, UC30, UC15 | Đã sửa | Đổi thành `Upcoming`; trạng thái đăng ký tính từ registration window |
| I24 | 🟢 | Model §10.5 thiếu chuyển trạng thái khi UC34 trả báo cáo để sửa | Model §10.5, Spec UC34 | Đã sửa | Thêm `Report Submitted → Completed` (UC34); Spec UC34 ghi rõ event về `Completed` |
| I25 | 🟡 | Trạng thái membership `Ended` gộp chung tự rời và bị loại; `On Leave` trùng nghĩa `Inactive` | Model UC21, Spec UC21/UC22, sơ đồ trạng thái Membership | Đã sửa | Đổi thành `Active` ⇄ `Inactive` → `Left` (UC22 được chấp nhận) / `Banned` (CMB buộc rời); BR46 chặn `Banned` quay lại; UC21 A2 thành đăng ký lại thành viên mỗi kỳ |
| I26 | 🟡 | Khung Phase 1/2 lỗi thời: mọi UC ra cùng lúc nhưng tài liệu vẫn chia phase và dựa vào đó để hoãn hành vi | Model §4–§8, §10.7–10.11, BR16/BR42/BR43, §12, §13, D2; Spec phần đầu, bảng UC, UC04/UC08/UC26/UC36/UC37/UC49, cuối Spec | Đã sửa | Xóa mọi nhãn Phase; giữ duyệt đa cấp qua UC05 (BR16 có hiệu lực); BR43 rút lại; §12 thành Release scope; §13 coverage đầy đủ |
| I27 | 🟡 | `«extend»` trên trang Student vẽ điều hướng giao diện (UC17/UC29 → UC06; UC22/UC29/UC31/UC50 → UC24) | UCD Student, Spec UC24 | Đã sửa | Xoá 6 cạnh «extend»; Student chỉ còn association tới 9 UC; Spec UC24 bước 3 ghi rõ là điều hướng; huỷ cách sửa của I12 |
| I28 | 🟡 | `«extend»` vẽ cascade hệ thống: `UC28 / UC49 → UC15`, `UC42 → UC49`; UC của ICPDP mượn sang trang CMB 3 | UCD CMB 3, ICPDP 1, ICPDP 3; Spec UC15 | Đã sửa | Xoá 3 loại cạnh và các node mượn; cascade ghi ở Postconditions UC15 (Spec UC28 A1, UC49 A1 đã có); giữ `UC47 «extend» UC25`, `UC49 «extend» UC28` |
| I29 | 🟢 | Trang All users: nhãn Google OAuth hiện nguyên `<br>`; UC02 nằm trên UC01; nhãn actor CMB đè lên actor ICPDP | UCD All users | Đã sửa | Sửa escape nhãn; đảo vị trí UC01/UC02; giãn 3 actor. Giữ tên "Sign in with Google" và actor hình người |
| I30 | 🟡 | Trang CMB 4: cạnh nét đứt "supporting" CMB–UC31 không phải ký hiệu UML; `UC51 «extend» UC33` là luồng dữ liệu; thứ tự oval lộn xộn | UCD CMB 4 | Đã sửa | Đổi thành association nét liền; xoá cạnh «extend» (không đổi sang «include»); xếp lại theo luồng UC31→32→33→51, 35→38, 40, 54 |
| I31 | 🔴 | Guest: không có trong bảng actor, UC06 đòi session, nhưng có Guest flow, cột Guest trong ma trận phân quyền và mục User Manual cho Guest | Report §I.1.1, §I.4, §I.5, §III.2.1, UC06, Table III.4, §VI.3.2 | Đã sửa | Chốt "có": Guest là khách chưa đăng nhập, chỉ đọc khu công khai UC06, không phải business actor; UC06 bỏ precondition phiên |
| I32 | 🔴 | BR31 "no decision in the system is approved by another actor" trái với các quyết định do CMB đưa ra (UC18, UC21, UC23, UC32) | Report Table III.6 BR31, Glossary "ICPDP" | Đã sửa | Chốt giới hạn phạm vi: BR31 chỉ áp cho yêu cầu gửi lên nhà trường, quyết định nội bộ CLB thuộc CMB. Sửa Report v2 (BR31, Glossary, bảng actor), SRS, BSA |
| I33 | 🔴 | Quyền CMB đến từ đâu: UC01 nói từ position assignment, UC03 cấp thẳng CMB role, UC11 nói "not from UC03" | Report UC01, UC03, UC11, §VI.3.5 | Đã sửa | UC03 chỉ cấp role ICPDP / special role BR19 + lock/unlock; quyền CMB chỉ từ UC08, UC11, UC13, UC23. Thêm BR47; UC01, UC03, UC11 dùng BR47 |
| I34 | 🔴 | UC05 đòi rule set "total", refuse khi một request type không có rule; BR16 lại nói request không khớp rule nào thì duyệt một cấp | Report UC05, BR16 | Đã sửa | Giữ BR16; UC05 chỉ validate rule không chồng nhau, bỏ vế "request type has no rule" ở E409 |
| I35 | 🔴 | BR42 chỉ cho cấu hình 9 giá trị, nhưng BR06, BR07, BR25, BR27 và nhiều UC vẫn ghi "configurable / configured by ICPDP" mà không có màn hình nào | Report BR06/07/25/27/42, UC08, UC19, UC25, UC26, UC28, UC30, UC31, UC49, UC54 | Đã sửa | Chốt giữ 9 giá trị: các chỗ còn lại đổi thành "defined in the policy document", BR42 kèm danh sách hằng số. Sửa Report v2, Spec, Model, SRS, BSA |
| I36 | 🔴 | Deployment bị kẹt: UC01 chặn domain chưa cấu hình, UC03 cần sẵn admin mới cấp được role, nhưng hướng dẫn bảo cấu hình domain và cấp ICPDP "sau lần đăng nhập đầu" | Report §VI.2.2, UC01, UC03 | Đã sửa | Thêm seed `ALLOWED_DOMAIN` + `BOOTSTRAP_ICPDP_EMAIL` khi DB trống; sửa §VI.2.2, SRS, TASKS |
| I37 | 🟡 | BR43 đã rút (mọi UC ra một lần) nhưng report vẫn nói cắt scope theo priority/loop | Report §III.3.2 (đoạn đầu), Table II.4 Risk #4, UC42 priority | Đã sửa | Priority = thứ tự build/demo, không cắt UC; sửa Report §III.3.2, Risk #4, SRS §4/§15, Model §12. Giữ UC42 Low |
| I38 | 🟡 | Câu diễn giải BR trong 54 bảng UC không khớp định nghĩa ở catalogue (BR05, 07, 08, 09, 14, 17, 18, 23, 26, 29, 30, 31, 33) | Report §III.3.2, Table III.6 | Đã sửa | Sửa 30 dòng Rule lệch (nguyên văn catalogue / đổi mã / xoá); thêm BR48–BR52; ý bị bỏ đã có sẵn trong UC hoặc chuyển vào Postconditions (UC06, UC46) |
| I39 | 🟡 | BR14 "public only after Approved" lệch UC27: event Approved chưa public, phải publish (`Upcoming`) | Report BR14, UC26, UC27 | Đã sửa | Sửa chữ BR14: "public only once it is Approved and published (UC27)"; nghĩa không đổi, UC giữ nguyên |
| I40 | 🟡 | Tham chiếu tới mục không có trong report: "§8.2 of the SRS", "§V of the SRS" | Report UC04, Table II.4 Risk #4 | Đã sửa | UC04 BR20 → "§IV.3.2"; bỏ "(§V of the SRS)" ở Risk #4 (cùng I37) |
| I41 | 🟡 | "No screen exists without a requirement" nhưng screen 30 Notification và 113 Audit logs có UC là "—" | Report §III.3.1.3, Table III.3 | Đã sửa | Screen 30 Notification → UC02; 113 Audit logs → SE-03; câu §III.3.1.3 thêm "or a non-functional requirement" |
| I42 | 🟡 | ApprovalTask: §IV.3.2 nói "six business objects", thực tế ít nhất 10 luồng tạo ICPDP task; Table IV.3 thiếu ApprovalTask/AuditLog ở M03, M04, M07 | Report §IV.3.2, Table IV.3, UC10, UC12, UC33, UC40 | Đã sửa | §IV.3.2 liệt kê đủ 10 đối tượng dùng ApprovalTask; Table IV.3 thêm ApprovalTask (M03, M07, M12), AuditLog (M04, M07) |
| I43 | 🟡 | Module M10 không xuất hiện ở đâu dù Risk #2 nói M01–M12 | Report Table II.4, Table IV.3, cột Module của UC | Đã sửa | M10 = Workflow, Notification & Audit: ghi vào tiêu đề §IV.3.2 và thêm dòng M10 vào Table IV.3 |
| I44 | 🟡 | Objective #5 đòi mọi UC truy được tới một state machine, nhưng chỉ có 8 state diagram | Report Table II.2, §III.5.3 | Đã sửa | Sửa Objective #5: UC truy tới BR + test case; UC đổi trạng thái truy tới lifecycle của entity. Không vẽ thêm diagram |
| I45 | 🟡 | UC22 cho membership `Inactive` xin rời "from the member workspace", nhưng UC24 chỉ cho membership active vào workspace | Report UC22, UC24 | Đã sửa | UC24 nhận membership `Active` + `Inactive` (Inactive được đánh dấu, vẫn xin rời qua UC22); E1 chỉ áp cho `Left`/`Banned`. Sửa Report v2, Spec (md + docx), Model, SRS |
| I46 | 🟡 | Suspension: UC14 refuse request khi có event/booking đã duyệt, UC15 lại tự huỷ chúng; User Manual bỏ sót approved events | Report UC14, UC15, §VI.3.5 | Đã sửa | UC14 E1 đổi từ chặn sang cảnh báo `200 Warning` liệt kê event/booking sẽ bị huỷ; giữ cascade UC15; §VI.3.5 thêm approved future events. Sửa Report v2, Spec (md + docx), Model, SRS, TASKS |
| I47 | 🟡 | SE-03 audit cả sign-in bị từ chối, UC01 E403 lại "creates nothing" | Report SE-03, UC01 | Đã sửa | UC01 E403: "creates no User and no session, and writes an audit record". Sửa Report, Spec (md + docx), Model, SRS |
| I48 | 🟡 | UI-01 đòi Chrome/Firefox/Safari/Edge nhưng chỉ test trên Chrome | Report UI-01, §V.2.1, Table V.5 | Đã sửa | Giữ UI-01; thêm GUI smoke test trên Firefox/Safari/Edge vào §V.2.1, Table V.5, Table II.11 |
| I49 | 🟡 | UC20 có nhánh candidate accept/decline offer nhưng Student không có UC nào để làm việc đó | Report UC20, Table III.2 | Đã sửa | Chốt bỏ bước ứng viên xác nhận: trigger chỉ còn CMB xác nhận; A2 = CMB ghi nhận ứng viên từ chối → trạng thái mới `Declined`. Sửa Report v2, Spec (md + docx), Model, SRS, DBML, State diagram, TASKS |
| I50 | 🟢 | Precondition trái alt/exception của chính UC: UC32 (Completed vs event cancelled), UC34 (Report Submitted vs no report filed), UC49 (Requested/Approved vs release In Use) | Report UC32, UC34, UC49 | Đã sửa | UC32 bỏ ngoại lệ "event cancelled"; UC33/34 "The event is Report Submitted"; UC34 trigger/precondition thêm nhánh quá deadline; UC49 precondition thêm In Use (UC15/UC42) |
| I51 | 🟢 | Công cụ quản lý defect: GitHub (Table II.11) vs Google Sheets (§V.2.3); Excel không có trong bảng tool | Report Table II.11, §V.2.3 | Đã sửa | Defect quản lý ở Google Sheets (giữ §V.2.3 + hình V.3); Table II.11 bỏ "GitHub (defects)", thêm Microsoft Excel |
| I52 | 🟢 | Vai trò Trần Ngọc Huy: "Technical Leader, Full-stack Developer" vs "Technical leader, Tester" | Report Table I.1, II.8, V.4 | Đã sửa | Thêm Tester vào vai trò Trần Ngọc Huy ở Table I.1, II.8; V.4 viết hoa thống nhất |
| I53 | 🟢 | MSG12 đặt "above the feedback form", nhưng ngữ cảnh là màn hình tổng hợp feedback của CMB (UC51) | Report Table III.7 | Đã sửa | MSG12 → "Inline, on the feedback summary (club)" |
| I54 | 🟢 | Thông tin chưa đủ: MSSV/email `[TBD]`; "Le Thanh Hai" không dấu; deliverable ghi `report.docx` | Report bìa, Table I.1, I.2, VI.1 | Cần quyết định | Đã sửa "Lê Thanh Hải" và tên file; còn thiếu MSSV (Phong, Quang Huy, Ngọc Huy) và email (Phong, Quang Huy) |
| I55 | 🟡 | UCD theo actor không có «include» nào: sau I09, I11, I28 chỉ còn association phẳng tới từng UC, kèm mã UC trên oval | UCD mọi trang | Đã sửa | Vẽ lại 8 trang actor: actor → `Manage …` «include» chức năng con (CRUD cho UC quản lý danh mục); bỏ mã UC trên oval; bỏ 2 cạnh «extend» (quan hệ vẫn ghi trong Spec) |
| I56 | 🟡 | CD v2 bị nhận xét "quá nhiều chữ, vừa thiếu vừa thừa": 57 luồng gần như mỗi UC một luồng, 10 hồ sơ vẽ hai lần (CMB → hệ thống → ICPDP), nhãn là hành động; Student gần như không nhận gì, CMB thiếu thông báo vi phạm và kết quả giải ngân, ICPDP không có số liệu nào; Cloudinary có trên sơ đồ nhưng thiếu trong Model | CD, Model §3, §15, SRS §2.1, §2.3, §14.4, Report §III.1 | Đã sửa | CD v2.1: 35 luồng gộp theo nhóm dữ liệu, mỗi luồng một mũi tên thẳng; bổ sung luồng còn thiếu; Cloudinary vào Model §3; bảng luồng → UC viết lại ở Model §15 và SRS §14.4 |
| I57 | 🟡 | Sự kiện nội bộ CLB (chỉ thành viên) không có chỗ trong hệ thống: mọi sự kiện đều phải qua ICPDP duyệt (UC26), nên buổi sinh hoạt nhỏ hoặc phải xin duyệt, hoặc không được ghi lại, và ICPDP không thấy chúng | Model/Spec UC02, UC25–UC28, UC32, UC33; SRS §5, §6.6, §10.1; State diagram Event; DBML `events` | Đã sửa | Thêm BR53 (phương án A): sự kiện `Internal` không có ngân sách được ghi nhận thẳng `Draft → Approved`, có audit, ICPDP xem ở UC02, đóng khi chốt điểm danh ở UC32 |
| I58 | 🟡 | CMB là một actor chung, không phân biệt Chủ nhiệm với thành viên được giao việc; không có UC để tạo role và cấu hình permission; UC23 chỉ gán chức vụ định nghĩa sẵn ở UC09, chức vụ nhạy cảm phải qua ICPDP | Model §3, §4, §9, §11, §15, UC09, UC22–UC24, mọi UC của CMB; Spec; SRS §2.3; UCD trang CMB; CD; DBML; Report | Đã sửa | Tách CMB thành Club Member (actor gốc, làm UC vận hành khi có permission) và Club Leader (Chủ nhiệm, kế thừa Club Member); UC23 thành "Quản lý vai trò CLB và phân quyền"; sửa BR47, thêm BR54, BR55. Lần 2: cơ cấu role khai báo trong hồ sơ UC07, ICPDP thẩm định ở UC08, đánh phiên bản, role ban điều hành do chủ nhiệm đánh dấu và đổi qua chuyển giao, role Members mặc định; thêm BR56; CD 40 luồng |
| I59 | 🟡 | Ngân sách bị mô hình thành luồng riêng (UC35 Gửi yêu cầu ngân sách, UC36 Thẩm định yêu cầu ngân sách, máy trạng thái Budget Request, permission `club.budget.request`), trong khi nhóm đã thống nhất ngân sách là một phần của đề xuất sự kiện và không có ngân sách tách rời sự kiện | Model, Spec, SRS (UC25, UC26, UC35–UC39, BR22, §6.7, §7, permission), DBML, TASKS, HLD, CD, UCD, State diagram, Report | Đã sửa | Bỏ UC35, UC36; ngân sách là phần tuỳ chọn của đề xuất UC25 và được duyệt ở UC26 (tạo `EventBudget`); BR22 viết lại; bỏ `club.budget.request` (còn 15 permission); đánh số lại UC37–UC54 → UC35–UC52 (52 UC) |
| I60 | 🟡 | Luồng tiền của sự kiện thiếu bước CLB nộp quyết toán sau sự kiện và cơ chế thu hồi: `Exception` đóng ngân sách kèm chênh lệch, không có số phải hoàn, không ghi nhận tiền hoàn, không phân biệt tạm ứng với cấp bù | Model/Spec/SRS UC25, UC28, UC35–UC37, BR21, BR23, BR26, BR42; State diagram Event Budget; UCD Club Member 3; DBML; TASKS | Đã sửa | Tạm ứng (UC35) → CLB nộp quyết toán (UC36, BR57) → UC37 chốt chi hợp lệ: cấp bù, hoặc `Recovery Pending` và ghi nhận hoàn trả (BR58); bỏ `Exception`; BR21 tính cả quyết toán / hoàn trả quá hạn |

---

## Chi tiết

### I01 — Tên actor không thống nhất
- **Vấn đề:** CD gọi là **Club's admin**; Model, Spec và UCD gọi là **Club Management Board
  (CMB)**. Spec UC01 bước 7 có nhắc workspace "Club's Admin".
- **Cách sửa đề xuất:** đổi tên actor trong CD thành `Club Management Board`. Chữ "Club's Admin"
  trong UC01 có thể giữ nếu đó là tên hiển thị trên giao diện.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `diagrams/UCMS_Context_Diagram.drawio` (cell `id="admin"`)
  - Thay đổi: nhãn actor `Club's admin` → `Club Management Board (CMB)`. Kích thước hộp giữ
    nguyên (337px, đủ chỗ). Các luồng dữ liệu nối vào actor này không đổi.
  - Lý do: Model, Spec và UCD đều dùng tên CMB. Chữ "Club's Admin" trong Spec UC01 bước 7
    **không sửa** — đó là tên hiển thị của workspace CMB trên giao diện, không phải tên actor.

### I02 — UC32 bị thiếu trong bảng actor
- **Bối cảnh:** file `UCMS_UseCase_Model_v2.md` có hai chỗ cùng nói "UC nào thuộc actor nào":
  - **§4 Master use case list** (dòng 124): mỗi UC một dòng, có cột Actor. UC32 *Finalize event
    attendance* ghi rõ actor là **CMB**, Phase 1.
  - **§9 Actor → use case matrix** (dòng 810): bảng tóm tắt, mỗi actor một dòng liệt kê mọi UC
    của actor đó. Bảng này phải là bản gom lại của §4.
- **Vấn đề:** dòng CMB ở §9 có 24 UC (UC01, UC02 dùng chung + 22 UC riêng của CMB). Theo §4 thì
  CMB có 23 UC riêng. So từng mã, chỉ thiếu **UC32**: danh sách nhảy từ `UC30` sang `UC33`.
  Các nguồn khác đều có UC32 là của CMB: Spec UC32, UCD trang CMB 4. Vậy §9 bỏ sót, không phải
  UC32 bị gán sai actor.
- **Ảnh hưởng:** chỉ ở tài liệu, logic và flow không đổi. Spec UC32 (actor, flow, rule),
  §4 và UCD đều đúng. Không tài liệu nào khác lấy dữ liệu từ bảng §9.
- **Vì sao đáng sửa:** ai đọc §9 để biết CMB làm gì sẽ không thấy bước chốt điểm danh. Mà UC32 lại
  là đầu vào của UC33 (báo cáo sau event, lấy sẵn số liệu điểm danh đã chốt) và UC44.
- **Cách sửa đề xuất:** thêm `UC32` vào dòng CMB ở Model §9, giữa `UC30` và `UC33`.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `UCMS_UseCase_Model_v2.md` §9, dòng 810 (dòng `Club Management Board`)
  - Thay đổi: `…, UC28, UC30, UC33, …` → `…, UC28, UC30, UC32, UC33, …` (dòng CMB từ 24 lên
    25 UC, khớp với §4). Mức độ hạ từ 🔴 xuống 🟡: không có hai chỗ nói ngược nhau, chỉ là §9
    viết thiếu.
  - Lý do: §4, Spec UC32 và UCD đều ghi UC32 là của CMB; §9 là chỗ duy nhất thiếu. Spec và
    High Level Design không có bảng tương tự nên không phải sửa.

### I03 — Ai làm CMB khi club chưa có board?
- **Bối cảnh:** luồng lập club mới theo Model §10 và Spec là
  `UC07 nộp đơn → UC08 duyệt → UC09 cấu hình club → UC10 đề cử board → UC11 xác nhận board`.
  Actor và điều kiện của từng bước:
  - **UC07** (Student): một nhóm sinh viên nộp đơn, khai báo danh sách thành viên sáng lập.
  - **UC08** (ICPDP): chọn Approve → đơn `Approved`, hệ thống tạo Club ở trạng thái
    `Pending Setup`. Postcondition: *"its founding board can be nominated in UC10"* — nhưng
    không nói **ai** được cấp quyền gì.
  - **UC09** (CMB): precondition *"the caller holds the club-administration permission"*.
    Trigger là *"The club is created in `Pending Setup`"*, tức UC09 được thiết kế để chạy
    ngay khi club vừa tạo, trước khi có board.
  - **UC10** (CMB): trigger *"A club is newly approved"*; rule *"A founding application
    approved in UC08 nominates its first board here"*. Nominee có thể là founding member.
  - **UC11** (ICPDP): duyệt đề cử → *"grants the matching permissions"*, club chuyển `Active`.
    Rule: *"Permissions come from this confirmation, not from UC03"*.
  - **UC03** (ICPDP): có thể cấp role CMB thủ công, nhưng rule ghi role này *"subordinate to the
    board confirmed in UC11"*, và E2 cảnh báo UC10/UC11 mới là đường đúng.
- **Vấn đề:** ở `Pending Setup` club chưa có ai mang quyền CMB. Quyền CMB chỉ sinh ra ở UC11,
  UC11 cần đề cử từ UC10, UC10 lại cần actor CMB → vòng lặp:
  `UC10 cần CMB → CMB chỉ có sau UC11 → UC11 cần UC10`. UC09 cũng bị chặn vì cần
  club-administration permission. Lối thoát duy nhất là ICPDP cấp tay qua UC03, nhưng không
  tài liệu nào mô tả bước này, và chính UC03/UC11 nói đó không phải đường chính thức.
- **Ảnh hưởng:** chặn luồng nghiệp vụ chính của Phase 1 — không club mới nào đi được từ
  `Pending Setup` sang `Active` nếu làm đúng theo Spec. Khi code, dev sẽ phải tự đoán ai được
  mở màn hình UC09/UC10.
- **Cách sửa đề xuất:** người nộp đơn ở UC07 (trưởng nhóm sáng lập)
  được cấp quyền CMB tạm thời, chỉ dùng cho UC09/UC10 khi club còn `Pending Setup`; quyền này bị
  thay thế ở UC11. Ghi thêm vào postcondition của UC08 và rule của UC11.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa:
    - `UCMS_UseCase_Model_v2.md`: UC08 outcome **Approve** (dòng 352), UC11 Rules (dòng 380)
    - `UCMS_UseCase_Specification_v2.md`: UC08 Main Flow bước 4 và Postconditions; UC09 và
      UC10 Preconditions; UC11 Business Rules
  - Thay đổi:
    - UC08 Approve: ngoài việc tạo Club `Pending Setup`, người nộp đơn nhận **temporary founding
      CMB permission**, chỉ dùng cho UC09 và UC10, chỉ khi club còn `Pending Setup`.
    - UC09, UC10 (Spec): precondition chấp nhận quyền CMB thường **hoặc** quyền tạm thời này.
    - UC11: khi xác nhận board sáng lập, quyền tạm thời bị thu hồi, chỉ board đã xác nhận giữ
      quyền CMB.
  - Lý do: phá vòng lặp UC10 ↔ UC11 mà vẫn giữ nguyên tắc "quyền CMB chính thức chỉ đến từ
    UC11", không phải cấp tay qua UC03. Nếu UC11 từ chối đề cử, club vẫn `Pending Setup` nên
    người nộp đơn vẫn còn quyền tạm thời để đề cử lại. Không thêm actor hay UC mới.
  - Chưa sửa: `UCMS_UseCase_Specifications_v2.docx` (bản Word) — cần xuất lại từ file `.md`.

### I04 — ICPDP buộc huỷ event trong UC28
- **Vấn đề:** Model UC28 ghi *"ICPDP-forced cancellation is not modelled here"*. Spec UC28 lại có
  luồng A1 *"Cancelled by a lifecycle decision (UC15/UC42)"*. UCD còn vẽ `UC15 «include» UC28`.
- **Cách sửa đề xuất:** chọn một cách. Nên giữ A1 của Spec (hệ thống tự huỷ event như hệ quả của
  UC15/UC42, ICPDP không trở thành actor của UC28) và sửa câu trong Model cho khớp.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa:
    - `UCMS_UseCase_Model_v2.md`: UC28 (đoạn *ICPDP-forced cancellation* và Related)
    - `UCMS_UseCase_Specification_v2.md`: UC28 Alternative Flow A1
  - Thay đổi:
    - Model UC28: bỏ câu *"not modelled here"*, thay bằng: việc ICPDP buộc huỷ event là luồng
      A1, do hệ thống thực hiện như hệ quả của UC15 (suspend, dissolve) hoặc UC42; ICPDP không
      phải actor của UC28. Thêm UC15 vào Related.
    - Spec UC28 A1: ghi rõ hệ thống huỷ không cần bước của CMB, ghi quyết định UC15/UC42 làm
      lý do và liên kết tới nó, rồi chạy bước 4–6 (trả booking, báo người đăng ký, tính lại
      báo cáo/ngân sách).
  - Lý do: giữ UC28 một actor (CMB) như mục tiêu gộp v1 UC35, và để Model, Spec cùng nói một
    điều. Phần UCD (`UC15 «include» UC28`) sửa trong I09.
  - Chưa sửa: `UCMS_UseCase_Specifications_v2.docx` cần xuất lại từ `.md`.

### I05 — Hệ quả của việc giải thể club
- **Vấn đề:** Model UC15 ghi event và booking đã duyệt bị huỷ qua UC28 và UC49 (đọc như áp dụng
  cho mọi thay đổi trạng thái). Spec UC15 bước 3 chỉ áp dụng cho **Suspend**; nhánh Dissolve chỉ
  archive và thu hồi quyền.
- **Cách sửa đề xuất:** thêm việc huỷ event/booking vào nhánh Dissolve của Spec UC15.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa:
    - `UCMS_UseCase_Model_v2.md`: UC04 Data; UC15 Rules; UC25, UC47; bảng scheduler (§7);
      §10.2 Club; §10.5 Event; §11 thêm BR44, BR45
    - `UCMS_UseCase_Specification_v2.md`: UC04 Input; UC15 Main Flow bước 3, 5, 6, Exceptions,
      Postconditions, Business Rules, Output; UC25 E4, E5; UC47 E4; UC28 A1; UC49 A1
  - Thay đổi:
    - **Giải thể không có hiệu lực ngay**, dù ai kích hoạt (UC14, UC42, không hoạt động, chính
      sách). UC15 chỉ ghi quyết định kèm kỳ có hiệu lực = kỳ kế tiếp theo academic calendar.
    - **BR44 (mới):** một event bắt đầu và kết thúc trong cùng một kỳ.
    - **BR45 (mới):** khi club đã có quyết định giải thể, không event, đề xuất hay booking nào
      được kết thúc sau kỳ `Dissolving`. UC25 (E5) và UC47 (E4) từ chối; UC15 huỷ ngay những gì
      đã tồn tại (qua UC28 A1 và UC49) lúc ghi quyết định.
    - **Kỳ N (kỳ ra quyết định):** club giữ nguyên trạng thái, hoạt động bình thường, vẫn được
      tạo việc mới (trong giới hạn BR45).
    - **Kỳ N+1:** scheduler chuyển club sang trạng thái mới `Dissolving`: không mở tuyển, không
      nộp đề xuất event, không đặt phòng mới. Việc đã tạo (kể cả đề xuất đang chờ duyệt) chạy tới
      cuối; CMB giữ quyền chỉ để đóng việc (báo cáo event UC33/UC34, ngân sách, báo cáo định kỳ).
    - **Cuối kỳ N+1, trước khi kỳ mới bắt đầu:** nhờ BR44/BR45 không còn event nào đang chạy.
      Scheduler, trong một bước: huỷ đề xuất event và yêu cầu booking chưa duyệt; ghi nghĩa vụ
      chưa xong (báo cáo chưa nộp, ngân sách chưa quyết toán) vào hồ sơ lưu trữ; archive, thu hồi
      quyền, club → `Dissolved`. Lỗi thì club ở lại `Dissolving` và báo ICPDP.
    - §10.2: thêm `Active / Suspended → Dissolving` và `Dissolving → Dissolved` (scheduler).
      §10.5: thêm `Draft / Pending Approval / Under Review / Revision Requested → Cancelled` do
      UC15 (BR45) hoặc scheduler khi club `Dissolved`. UC04 thêm academic calendar vào danh sách cấu hình.
    - UC15 E1 (ngân sách chưa quyết toán): chỉ cảnh báo; hạn quyết toán là cuối kỳ `Dissolving`.
    - UC28 A1 và UC49 A1 (giữ từ lần sửa trước): huỷ do UC15/UC42 thì không ghi vi phạm huỷ sát
      giờ, và UC49 trả cả booking đang `In Use`.
  - Lý do: quyết định của team — giải thể chỉ bắt đầu từ kỳ tiếp theo, việc tồn đọng của kỳ hiện
    tại được xử lý nốt, và mọi việc phải đóng trước khi kỳ sau nữa bắt đầu. Event kéo dài tối đa
    một kỳ, nên chặn từ đầu (BR44/BR45) thay vì huỷ event đang chạy ở cuối. Thay cho cách sửa
    trước (giải thể là huỷ ngay mọi event, kể cả `Ongoing`).
  - Sơ đồ: `diagrams/UCMS_State_Diagrams.drawio` trang Event — nhãn 4 mũi tên huỷ đề xuất đổi
    thành `UC15 (BR45) / Scheduler [club Dissolved]`.
  - Chưa sửa: rút lại quyết định giải thể (quay về `Active`) chưa được mô hình hoá;
    `UCMS_UseCase_Specifications_v2.docx` cần xuất lại từ `.md`.

### I06 — Trạng thái sau khi nộp lại (resubmit)
- **Vấn đề:** sau khi bị yêu cầu chỉnh sửa và nộp lại, hồ sơ chuyển sang trạng thái không khớp
  với precondition của UC duyệt:

  | Cặp | Nộp lại thì về trạng thái | Precondition của UC duyệt |
  |---|---|---|
  | UC07 → UC08 | `Under Review` | `Submitted` ❌ |
  | UC25 → UC26 | `Under Review` | `Pending Approval` ❌ |
  | UC35 → UC36 | không ghi | `Submitted` |
  | UC47 → UC48 | `Requested` (Model §10.9) | `Requested` ✓ |

- **Cách sửa đề xuất:** làm theo UC47 cho cả 4 cặp — nộp lại thì quay về trạng thái chờ duyệt ban
  đầu (`Submitted` / `Pending Approval`). Sửa các luồng A2 trong Spec và Model §10.1, §10.5, §10.6.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `UCMS_UseCase_Model_v2.md` (§10.1, §10.5, §10.6, §10.9, UC07, UC25, UC35),
    `UCMS_UseCase_Specification_v2.md` (UC07 A2, UC25 A2, UC35 A2, UC47 A3),
    `diagrams/UCMS_State_Diagrams.drawio`
  - Thay đổi: nộp lại luôn tạo **phiên bản mới** và đưa hồ sơ về trạng thái chờ duyệt ban đầu:
    Club Application → `Submitted`, Event → `Pending Approval`, Budget Request → `Submitted`,
    Property Booking → `Requested`. UC duyệt mở review lại từ trạng thái đó như lần nộp đầu.
  - Lý do: bản đã nộp không bao giờ bị sửa đè; mỗi lần nộp là một phiên bản mới được lưu lịch sử
    để ICPDP so sánh các bản với nhau, và một lần nộp lại cũng là một lần nộp mới chờ duyệt.

### I07 — Trạng thái không có trong lifecycle
- **Bối cảnh:** Model §10 mở đầu bằng quy tắc *"Every transition names its driver"* — mỗi lần
  đổi trạng thái phải có UC hoặc scheduler điều khiển. Tức là §10 là danh sách **đầy đủ** các
  trạng thái hợp lệ của từng thực thể. Nhưng các luồng A/E trong Spec lại đưa thực thể vào những
  trạng thái (hoặc kết cục) mà §10 không có. Hệ quả: người code theo §10 sẽ không có enum/transition
  cho các trường hợp này; người code theo Spec sẽ tạo trạng thái "lạ" không ai định nghĩa bước tiếp
  theo.
- **Vấn đề:** 8 chỗ lệch ở 6 UC, chia 3 loại:

  | UC (Spec) | Spec viết | Lifecycle ở Model | Lệch ở đâu |
  |---|---|---|---|
  | UC08 E1 | applicant rút khi đang review → *"the review closes as `Withdrawn`"* | §10.1: `Draft → Submitted → Under Review → Revision Requested / Approved / Rejected` | Thiếu trạng thái `Withdrawn` và driver (UC07? UC08?) |
  | UC08 E2 | quá hạn chỉnh sửa → *"closed as `Expired`"* | §10.1 như trên | Thiếu `Expired` và driver (phải là **Scheduler**) |
  | UC17 A2 | student *"withdraws an application that has not been decided"* | §10.4: `Draft → Submitted → Screening → Shortlisted → Accepted / Rejected / Waitlisted → Onboarded` | Không có trạng thái đích khi rút (`Withdrawn`?) |
  | UC26 E1 | club bị suspend giữa chừng → *"the proposal is closed"* | §10.5: chỉ có `Draft / Pending Approval / Under Review / Revision Requested → Cancelled` (UC15, BR45) | Spec nói "closed", Model nói `Cancelled`; `Closed` ở §10.5 lại là trạng thái sau báo cáo (UC34) → trùng tên, khác nghĩa |
  | UC26 E2 | quá hạn chỉnh sửa → *"the proposal expires"* | §10.5 không có | Thiếu `Expired` và driver Scheduler |
  | UC36 E1 | event liên quan bị reject/cancel → *"the request is closed"* | §10.6: `Closed` chỉ đến sau `Reconciled` (UC39) | Không có transition `Submitted / Under Review → Closed/Cancelled`; driver (UC26/UC28 kéo theo?) chưa ghi |
  | UC39 bước 4, Postcondition | officer đánh dấu case *"`Reconciled`, or `Exception`"*, rồi *"can then be `Closed`"* (BR26) | §10.6: `… → Reconciliation Pending → Reconciled → Closed` | Thiếu nhánh `Exception` và `Exception → Closed` |
  | UC52 A1 | student *"withdraws a complaint that has not been decided"* | §10.10: bảng transition không có dòng rút đơn | Không có trạng thái đích khi rút (`Withdrawn`?) |

  Ba loại:
  1. **Rút đơn** (UC08 E1, UC17 A2, UC52 A1): người nộp tự rút — cần trạng thái `Withdrawn`.
  2. **Hết hạn** (UC08 E2, UC26 E2): quá revision deadline — cần `Expired` do Scheduler điều khiển.
  3. **Đóng do sự kiện khác** (UC26 E1, UC36 E1, UC39): Spec dùng chữ "closed"/`Exception`
     nhưng Model không có transition tương ứng, hoặc `Closed` đã mang nghĩa khác.
- **Cách sửa đề xuất:** thêm các trạng thái này (kèm UC điều khiển) vào Model §10, hoặc bỏ khỏi
  Spec. Với loại 3, nên dùng `Cancelled` thay vì "closed" để không đụng nghĩa `Closed` hiện có.
- **Xử lý:**
  - Ngày: 2026-09-24
  - File đã sửa: `UCMS_UseCase_Model_v2.md` (§10.1, §10.4, §10.5, §10.6, §10.10; tóm tắt UC07, UC08,
    UC15, UC17, UC26, UC36, UC39, UC52), `UCMS_UseCase_Specification_v2.md` (UC07, UC08, UC15,
    UC17, UC26, UC36, UC39, UC52), `diagrams/UCMS_State_Diagrams.drawio` (trang Club Application,
    Recruitment Application, Event, Budget Request) và 4 PNG tương ứng trong `diagrams/img/`.
  - Thay đổi:
    - **Rút đơn → `Withdrawn`** (trạng thái cuối): §10.1 `Submitted / Under Review / Revision
      Requested → Withdrawn` (UC07 alt — thêm Spec UC07 A3 *Withdraw*); §10.4 `Submitted /
      Screening / Shortlisted → Withdrawn` (UC17 A2); §10.10 `Submitted / Under Triage →
      Withdrawn` (UC52 A1). Spec UC17 A2, UC52 A1 ghi rõ trạng thái nào được rút.
    - **Hết hạn → `Expired`** (trạng thái cuối, Scheduler): §10.1 và §10.5 `Revision Requested →
      Expired`. Spec UC08 E2, UC26 E2 ghi scheduler là driver.
    - **"closed" → `Cancelled`**: UC26 E1 → `Cancelled` do UC15; Spec UC15 *Suspend* và Model UC15
      thêm "huỷ proposal chưa quyết"; driver ở §10.5 thành "UC15 (suspension, or dissolution per
      BR45)". UC36 E1 → `Cancelled`; §10.6 thêm `Submitted / Under Review → Cancelled` (UC36).
    - **`Exception`**: §10.6 chuyển từ chuỗi một dòng sang bảng; thêm `Disbursed / Reconciliation
      Pending → Reconciled / Exception` và `Reconciled / Exception → Closed` (UC39, BR26). Spec
      UC39 postcondition: officer đóng case ngay trong UC39.
    - State diagram: thêm ô `Withdrawn`, `Expired`, `Cancelled`, `Exception` cùng các cạnh; nhãn
      4 cạnh huỷ proposal ở trang Event đổi thành `UC15 / Scheduler [club Dissolved]`.
  - Lý do: chọn **thêm vào Model** thay vì bỏ khỏi Spec, vì các tình huống này đều có thật (người
    nộp rút đơn, quá hạn chỉnh sửa, event bị huỷ kéo theo budget). Dùng `Cancelled` thay "closed"
    vì `Closed` đã có nghĩa khác (sau báo cáo / sau đối soát). `Exception` giữ nguyên tên vì
    Model UC39 đã dùng.
  - Chưa sửa: budget request ở `Revision Requested` khi event bị huỷ chưa có đường ra (UC36 E1
    chỉ chạy khi officer đang xét); `UCMS_UseCase_Specifications_v2.docx` cần xuất lại.

### I08 — BR40 trong UC04
- **Vấn đề:** Spec UC04 có cấu hình "số người phản hồi tối thiểu" (BR40); Model UC04 không có, và
  Model §14 vẫn để đây là câu hỏi mở D3. BR42 lại quy định Phase 1 chỉ mở đúng danh sách trong
  UC04.
- **Cách sửa đề xuất:** chốt D3 trước, rồi làm cho hai danh sách UC04 giống nhau.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `UCMS_UseCase_Model_v2.md` — UC04 (Data), §14 D3
  - Thay đổi: UC04 Data `the feedback window (BR36)` → `the feedback window and the minimum
    respondent count (BR36, BR40)`; D3 đổi thành "giá trị ngưỡng ban đầu, ICPDP chỉnh sau qua UC04".
  - Lý do: BR40 tự ghi "the *configured* minimum", nên ngưỡng phải cấu hình được; theo BR42 nó
    phải có trong danh sách UC04. Spec đã đúng, chỉ Model thiếu. D3 không còn chặn — chỉ cần chốt
    giá trị mặc định.

### I09 — `UC15 «include» UC28/UC49`
- **Vấn đề:** «include» nghĩa là lần nào chạy UC15 cũng chạy UC28/UC49. Thực tế chỉ xảy ra khi
  Suspend/Dissolve và club có event/booking tương lai. Ngoài ra UC28/UC49 là UC của CMB, không
  phải của ICPDP.
- **Cách sửa đề xuất:** thay bằng note hoặc dependency, hoặc bỏ đi; quan hệ này đã được ghi trong
  Spec UC28 A1 và UC49 A1.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `diagrams/UCMS_UseCase_ByActor.drawio` — trang *CMB 3 - Events & bookings* và
    *ICPDP 1 - Access & club lifecycle*
  - Thay đổi: `UC15 «include» UC28` → `UC28 «extend» UC15`; `UC15 «include» UC49` →
    `UC49 «extend» UC15` (đảo chiều mũi tên, trỏ về UC15).
  - Lý do: sau I04/I05, UC15 gọi UC28 (A1) và UC49 có điều kiện — khi đình chỉ, hoặc khi giải
    thể mà còn việc kết thúc sau kỳ `Dissolving` (BR45). «extend» diễn đạt đúng "chỉ khi có điều
    kiện" và giữ quan hệ hiển thị trên sơ đồ, thay vì bỏ hẳn như đề xuất ban đầu.
  - **Huỷ (2026-09-24, I28):** cascade do hệ thống thực hiện, không phải hành vi chèn vào luồng
    của ICPDP trong UC15 → bỏ hẳn cạnh, đúng như đề xuất ban đầu.

### I10 — `UC30 «extend» UC29`
- **Vấn đề:** trạng thái `Waitlisted` được tạo ngay trong UC29 A1. UC30 là phiên làm việc riêng
  của CMB, chạy khi có chỗ trống hoặc khi đổi sức chứa, không phải một phần chèn vào lúc sinh viên
  đăng ký.
- **Cách sửa đề xuất:** bỏ quan hệ extend; chỉ để UC30 ở trang CMB.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `diagrams/UCMS_UseCase_ByActor.drawio` — trang *Student* và *CMB 3 - Events &
    bookings*; `UCMS_UseCase_Specification_v2.md` — bảng UC, UC29, UC30;
    `UCMS_UseCase_Model_v2.md` — M06, sơ đồ luồng §11, §12.
  - Thay đổi:
    - UCD: xóa cạnh `UC30 «extend» UC29` ở cả hai trang; xóa node mượn `UC30 (CMB)` ở trang
      Student và `UC29 (Student)` ở trang CMB 3.
    - Spec UC29 A1: `A1 Waitlist (Phase 2): … → Waitlisted (UC30)` → `A1 Waitlist: … →
      Waitlisted. Promotion from the waitlist is handled later in UC30.`
    - Spec + Model UC29 BR17: `Without UC30, reaching capacity simply closes registration.` →
      `When the event has no waitlist, reaching capacity closes registration.`
    - UC30: Phase `2` → `1` (Spec bảng UC + chi tiết, Model bảng M06 + chi tiết); bỏ `(2)` sau
      `UC30 Waitlist` ở sơ đồ luồng.
    - Model §12: thêm UC30 vào loop *Registration → attendance*; Phase 1 `37` → `38`, Phase 2
      `17` → `16`; bỏ UC30 và vế "a hard capacity cap without a waitlist" khỏi dòng Refinements.
  - Lý do: `Waitlisted` do UC29 A1 tự tạo; UC30 là phiên riêng của CMB, khác actor và trigger,
    chỉ dùng dữ liệu UC29 sinh ra nên không phải «extend». Liên kết giữ ở `Related UC`. Nhãn
    Phase 2 của UC30 đã lỗi thời vì mọi UC ra cùng lúc.

### I11 — `UC02 «include» UC01`
- **Vấn đề:** có session hợp lệ là precondition của UC02 (Spec UC02). Vẽ «include» nghĩa là mỗi
  lần mở dashboard đều phải đăng nhập lại.
- **Cách sửa đề xuất:** bỏ include; cả hai UC đã nối với actor `User`.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `diagrams/UCMS_UseCase_ByActor.drawio` — trang "Use cases of every user"
  - Thay đổi: xóa cạnh `p0e6` (`UC02 «include» UC01`). Trước: User — UC01, User — UC02 và
    UC02 ⇢ UC01 «include». Sau: chỉ còn hai association User — UC01 và User — UC02.
  - Lý do: Spec UC02 ghi "Preconditions: A valid session (UC01)", trigger gồm cả trường hợp
    quay lại workspace, và A2 đổi club "without re-authenticating". Đăng nhập vì thế là điều
    kiện có trước, không phải bước con của UC02. UML không vẽ precondition bằng «include» hay
    «extend», nên chỉ cần bỏ cạnh.

### I12 — Quan hệ của UC24
- **Vấn đề:** Spec UC24 bước 3 dẫn sang UC29, UC31, UC50 và UC22, nhưng UCD chỉ vẽ
  `UC22 «extend» UC24`.
- **Cách sửa đề xuất:** thêm `«extend»` từ UC29, UC31, UC50 vào UC24; hoặc bỏ luôn quan hệ của
  UC22 cho đồng nhất.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `diagrams/UCMS_UseCase_ByActor.drawio` — trang Student;
    `UCMS_UseCase_Model_v2.md` — UC24.
  - Thay đổi:
    - UCD: thêm 3 cạnh `p1e13` `UC29 «extend» UC24`, `p1e14` `UC31 «extend» UC24`, `p1e15`
      `UC50 «extend» UC24`. Trước: chỉ có `UC22 «extend» UC24`. Sau: đủ 4 UC mà Spec UC24 bước 3
      dẫn sang. UC29 và UC50 không nằm sát UC24 nên cạnh đi vòng bên phải.
    - Model UC24 Related: `UC20, UC29, UC31, UC50` → `UC20, UC22, UC29, UC31, UC50` (khớp Spec).
  - Lý do: chọn cách thêm «extend» cho đồng nhất với cách trang Student đã vẽ UC06 (`UC17`,
    `UC29 «extend» UC06` cho bước "continue into"). Mỗi UC đích vẫn giữ association riêng với
    Student vì chúng cũng chạy độc lập (UC29 từ UC06, UC31 bằng QR tại sự kiện).
  - **Huỷ một phần (2026-09-24, I27):** phần UCD của cách sửa này sai — «extend» không dùng cho
    điều hướng giao diện. Đã xoá các cạnh; phần Model UC24 Related vẫn giữ.

### I13 — Tên rút gọn làm mất nghĩa
- **Vấn đề:** "UC15 Suspend / dissolve club" thiếu **reactivate** (Model: suspend, reactivate
  hoặc dissolve); "UC49 Release booking" thiếu **track và cancel**.
- **Cách sửa đề xuất:** đổi thành "UC15 Suspend / reactivate / dissolve club" và "UC49 Cancel /
  release booking".
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `diagrams/UCMS_UseCase_ByActor.drawio` — mọi ô UC15 và UC49 (3 ô mỗi loại)
  - Thay đổi: "Suspend / dissolve club" → "Suspend / reactivate / dissolve club"; "Release
    booking" → "Cancel / release booking".
  - Lý do: khớp tên UC trong Model/Spec.

### I14 — UCD không phân biệt phase
- **Vấn đề:** UC Phase 2 trông giống hệt UC Phase 1.
- **Cách sửa đề xuất:** viền nét đứt hoặc tô xám cho UC Phase 2, kèm chú thích (legend).
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: không có.
  - Thay đổi: không có. UCD vẫn vẽ mọi UC cùng một kiểu, không có legend phase.
  - Lý do: ngày 2026-09-23 đã chốt bỏ chia Phase 1/2, mọi UC làm cùng lúc. Đánh dấu phase trên
    UCD là vẽ thêm thứ sắp bị xóa khỏi Model/Spec. Việc dọn khung phase trong Model/Spec do I26
    xử lý.

### I15 — CD: thiếu luồng ICPDP → hệ thống
- **Vấn đề:** CD chỉ có *Event approval decision*, *Club application review decision*, *Club
  evaluation scoring*. Còn thiếu:
  - xác nhận board (UC11), suspend/reactivate/dissolve club (UC15);
  - quyết định budget (UC36), ghi nhận giải ngân (UC37), đối soát (UC39);
  - đánh giá báo cáo (UC34, UC41), quyết định booking (UC48);
  - quản lý danh mục phòng/thiết bị (UC46), tài khoản và policy (UC03, UC04).
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `docs/diagrams/UCMS_Context_Diagram_v2.drawio` (mới), `docs/UCMS_UseCase_Model_v2.md` (thêm §15 và dòng dẫn ở đầu file), `docs/README.md` (thêm dòng 4b, chuyển CD cũ sang mục superseded).
  - Thay đổi: ICPDP → HT từ 3 luồng (Event approval decision, Club application review decision, Club evaluation scoring) → 8 luồng: Accounts, policy & routing config; Review decisions; Club status action; Disbursement & reconciliation; Property catalogue; Complaint triage; Violation cases; Evaluation scheme & scoring. Ngoài danh sách của issue, bổ sung thêm UC05, UC13, UC42, UC43.
  - Lý do: chốt ngày 2026-09-23 xử lý I15–I20 một lần theo một quy tắc: mỗi luồng phải trỏ tới ít nhất một UC, và mỗi UC có dữ liệu đi qua biên hệ thống phải nằm trong ít nhất một luồng. Luồng được gộp theo loại dữ liệu (55 luồng thay vì khoảng 80 nếu vẽ mỗi UC một luồng); mã UC nằm ở bảng Model §15, không ghi trên sơ đồ. Vẽ file mới thay vì sửa file cũ để giữ CD mà team đã thống nhất làm lịch sử, giống cách làm với Model v1/v2.

### I16 — CD: thiếu luồng hệ thống → ICPDP
- **Vấn đề:** thiếu Event proposal (UC25), đơn thành lập club (UC07), Budget request (UC35),
  báo cáo sau sự kiện (UC33), đề cử board (UC10), Complaint (UC52 — theo BR38 complaint đi thẳng
  tới ICPDP).
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `docs/diagrams/UCMS_Context_Diagram_v2.drawio` (mới), `docs/UCMS_UseCase_Model_v2.md` (thêm §15 và dòng dẫn ở đầu file), `docs/README.md` (thêm dòng 4b, chuyển CD cũ sang mục superseded).
  - Thay đổi: HT → ICPDP từ 8 luồng → 11 luồng: Club establishment application, Board nomination (thay *Club's leadership information*), Leadership transition plan (thay *Club transition notification*), Suspension request (UC14, ngoài danh sách của issue), Event proposal, Post-event report, Budget request & expenses, Periodic reports, Property booking request, Club complaint, Evaluation draft.
  - Lý do: chốt ngày 2026-09-23 xử lý I15–I20 một lần theo một quy tắc: mỗi luồng phải trỏ tới ít nhất một UC, và mỗi UC có dữ liệu đi qua biên hệ thống phải nằm trong ít nhất một luồng. Luồng được gộp theo loại dữ liệu (55 luồng thay vì khoảng 80 nếu vẽ mỗi UC một luồng); mã UC nằm ở bảng Model §15, không ghi trên sơ đồ. Vẽ file mới thay vì sửa file cũ để giữ CD mà team đã thống nhất làm lịch sử, giống cách làm với Model v1/v2.

### I17 — CD: thiếu luồng của CMB
- **Vấn đề:**
  - **CMB → hệ thống** thiếu: Budget request (UC35), đề cử board (UC10), huỷ/đổi lịch event
    (UC28), huỷ booking (UC49), chốt điểm danh (UC32), trả lời complaint (UC54).
  - **Hệ thống → CMB** thiếu: complaint được chuyển tới (UC53), đơn xin gia nhập (UC17), quyết
    định budget (UC36), kết quả xác nhận board (UC11).
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `docs/diagrams/UCMS_Context_Diagram_v2.drawio` (mới), `docs/UCMS_UseCase_Model_v2.md` (thêm §15 và dòng dẫn ở đầu file), `docs/README.md` (thêm dòng 4b, chuyển CD cũ sang mục superseded).
  - Thay đổi: CMB → HT từ 11 → 17 luồng: thêm Board nomination, Suspension request, Event cancellation / reschedule, Waitlist & attendance finalization, Budget request, Complaint response; *Property booking request* → *Property booking request / cancellation*; *Recruit configuration* → *Recruitment configuration*; *Recruitment candidate result* → *Candidate decisions*. HT → CMB từ 6 → 6 luồng: thêm Membership applications, Forwarded complaint; gộp *Event status notification*, *Property booking status*, *Revision request* thành *Review decisions & revision requests* (có cả UC11, UC36).
  - Lý do: chốt ngày 2026-09-23 xử lý I15–I20 một lần theo một quy tắc: mỗi luồng phải trỏ tới ít nhất một UC, và mỗi UC có dữ liệu đi qua biên hệ thống phải nằm trong ít nhất một luồng. Luồng được gộp theo loại dữ liệu (55 luồng thay vì khoảng 80 nếu vẽ mỗi UC một luồng); mã UC nằm ở bảng Model §15, không ghi trên sơ đồ. Vẽ file mới thay vì sửa file cũ để giữ CD mà team đã thống nhất làm lịch sử, giống cách làm với Model v1/v2.

### I18 — CD: thiếu luồng của Student
- **Vấn đề:** thiếu *Event check-in* (UC31) đi vào hệ thống; thiếu kết quả xét duyệt / yêu cầu
  chỉnh sửa gửi lại cho sinh viên (UC08, UC18).
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `docs/diagrams/UCMS_Context_Diagram_v2.drawio` (mới), `docs/UCMS_UseCase_Model_v2.md` (thêm §15 và dòng dẫn ở đầu file), `docs/README.md` (thêm dòng 4b, chuyển CD cũ sang mục superseded).
  - Thay đổi: Student → HT thêm *Event check-in*; *Club establishment request* → *Club establishment application*. HT → Student: *Clubs information* + *Events information* gộp thành *Clubs & events information*; *Membership's club status* → *Application results & revision requests*.
  - Lý do: chốt ngày 2026-09-23 xử lý I15–I20 một lần theo một quy tắc: mỗi luồng phải trỏ tới ít nhất một UC, và mỗi UC có dữ liệu đi qua biên hệ thống phải nằm trong ít nhất một luồng. Luồng được gộp theo loại dữ liệu (55 luồng thay vì khoảng 80 nếu vẽ mỗi UC một luồng); mã UC nằm ở bảng Model §15, không ghi trên sơ đồ. Vẽ file mới thay vì sửa file cũ để giữ CD mà team đã thống nhất làm lịch sử, giống cách làm với Model v1/v2.

### I19 — CD: luồng không UC nào tạo ra
- **Vấn đề:** *Event registration list* và *Club recruitment result* gửi tới ICPDP, nhưng không UC
  nào của ICPDP dùng tới (kể cả nội dung dashboard UC02). *Club and event feedback* gửi tới ICPDP
  chỉ là dữ liệu đầu vào của UC44.
- **Cách sửa đề xuất:** bỏ các luồng này, hoặc thêm chúng vào nội dung dashboard ICPDP ở UC02.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `docs/diagrams/UCMS_Context_Diagram_v2.drawio` (mới), `docs/UCMS_UseCase_Model_v2.md` (thêm §15 và dòng dẫn ở đầu file), `docs/README.md` (thêm dòng 4b, chuyển CD cũ sang mục superseded).
  - Thay đổi: Bỏ 3 luồng HT → ICPDP: *Event registration list*, *Club recruitment result* (không UC nào của ICPDP đọc, UC02 cũng không có), *Club and event feedback* (UC44 đọc feedback bên trong hệ thống; nguồn thật là Student → HT *Event feedback*). *Club evaluation report* → *Evaluation draft* (UC44).
  - Lý do: chốt ngày 2026-09-23 xử lý I15–I20 một lần theo một quy tắc: mỗi luồng phải trỏ tới ít nhất một UC, và mỗi UC có dữ liệu đi qua biên hệ thống phải nằm trong ít nhất một luồng. Luồng được gộp theo loại dữ liệu (55 luồng thay vì khoảng 80 nếu vẽ mỗi UC một luồng); mã UC nằm ở bảng Model §15, không ghi trên sơ đồ. Vẽ file mới thay vì sửa file cũ để giữ CD mà team đã thống nhất làm lịch sử, giống cách làm với Model v1/v2.

### I20 — CD: "Expense & financial report"
- **Vấn đề:** không UC nào tạo ra "financial report"; UC gần nhất là UC38 *Record an expense with
  its evidence*.
- **Cách sửa đề xuất:** đổi tên thành *Expense & evidence*.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa: `docs/diagrams/UCMS_Context_Diagram_v2.drawio` (mới), `docs/UCMS_UseCase_Model_v2.md` (thêm §15 và dòng dẫn ở đầu file), `docs/README.md` (thêm dòng 4b, chuyển CD cũ sang mục superseded).
  - Thay đổi: *Expense & financial report* → *Expense & evidence* (UC38).
  - Lý do: chốt ngày 2026-09-23 xử lý I15–I20 một lần theo một quy tắc: mỗi luồng phải trỏ tới ít nhất một UC, và mỗi UC có dữ liệu đi qua biên hệ thống phải nằm trong ít nhất một luồng. Luồng được gộp theo loại dữ liệu (55 luồng thay vì khoảng 80 nếu vẽ mỗi UC một luồng); mã UC nằm ở bảng Model §15, không ghi trên sơ đồ. Vẽ file mới thay vì sửa file cũ để giữ CD mà team đã thống nhất làm lịch sử, giống cách làm với Model v1/v2.

### I21 — Phase 1 phụ thuộc UC23 (Phase 2)
- **Vấn đề:** UC09 E2 *"refused until UC23 reassigns it"* và UC21 bước 4 *"revokes any position
  held (UC23)"* thuộc Phase 1 nhưng lại cần UC23 (Phase 2). Phụ lục Spec khẳng định không có phụ
  thuộc kiểu này.
- **Cách sửa đề xuất:** ở Phase 1, chức vụ chỉ là ghế board từ UC10/UC11 — sửa cả hai chỗ để trỏ
  tới UC10/UC11, còn UC23 là đường đi của Phase 2.
- **Xử lý:** 2026-09-26 — **không sửa**.
  - Không đổi file nào.
  - **Lý do:** issue dựa trên BR43 (Phase 1 không được phụ thuộc Phase 2), BR43 đã rút ở I26 và mọi UC ra
    cùng một bản phát hành. Report UC09 E409 đã ghi *"System refuses until UC10/UC11 or UC23 reassigns
    it"*, SRS §16.2 và FR-UC09-07 / FR-UC21-03 / FR-UC21-07 nêu rõ ghế ban chủ nhiệm thay qua UC10/UC11,
    chức vụ nội bộ qua UC23. Không còn mâu thuẫn.

### I22 — Quy tắc hiển thị club ở UC06
- **Vấn đề:** *"Only `Active` clubs are listed. A `Suspended` club is visible but marked"* — câu
  sau mâu thuẫn với câu trước.
- **Cách sửa đề xuất:** *"`Active` and `Suspended` clubs are listed; a `Suspended` club is marked
  and shows no open campaign (BR09); a `Dissolved` club is not listed."*
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất.
  - `Group1_SE1939-NJ_Report_Final_v2.docx`: UC06 đã đúng sẵn (*"Active and Suspended clubs are listed; a Suspended club is marked and
    shows no open campaign."*), không sửa.
  - `UCMS_UseCase_Specification_v2.md` UC06 Quy tắc nghiệp vụ: *"Chỉ liệt kê các CLB `Active`. Một CLB
    `Suspended` vẫn thấy được nhưng có đánh dấu…"* → *"Liệt kê các CLB `Active` và `Suspended`; một CLB
    `Suspended` được đánh dấu và không hiện đợt tuyển nào (BR09). Một CLB `Dissolved` không được liệt kê."*
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx` UC06: *"Only Active clubs are listed; a Suspended club is visible but marked and shows no open
    campaign."* → *"Active and Suspended clubs are listed; a Suspended club is marked and shows no open
    campaign (BR09); a Dissolved club is not listed."*
  - `UCMS_UseCase_Model_v2.md` UC06 Quy tắc: sửa giống Spec.
  - `SRS.md`: FR-UC06-03 bỏ *"xem vấn đề còn mở I22"*, thêm *"không liệt kê CLB `Dissolved`"*; dòng I22
    ở §16.2 đổi từ *"Vẫn mở"* → *"Đã sửa"*.
  - **Lý do:** câu thứ hai (Suspended vẫn thấy) là ý định thật; chỉ cần sửa câu đầu cho khớp.

### I23 — Trạng thái tiền sự kiện `Open for Registration`
- **Vấn đề:** `Ongoing` chỉ là D-day (scheduler theo giờ bắt đầu/kết thúc). Toàn bộ thời gian từ
  lúc publish đến D-day mang tên `Open for Registration`, nên sai nghĩa khi:
  - đăng ký đã đóng nhưng chưa tới D-day — event vẫn "Open for Registration";
  - event không cần đăng ký (UC27 A2) — vẫn gọi là "Open for Registration".
- **Cách sửa đề xuất:** đổi tên thành `Upcoming`; mở/đóng đăng ký là giá trị tính từ registration
  window, không phải trạng thái riêng.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa:
    - `UCMS_UseCase_Model_v2.md`: UC27 Flow, bảng Scheduler (§7), §10.5
    - `UCMS_UseCase_Specification_v2.md`: UC27 bước 3 và Postconditions; Preconditions của UC28,
      UC29, UC30; UC15 nhánh Dissolve
  - Thay đổi:
    - `Open for Registration` → `Upcoming` ở mọi chỗ trên.
    - §10.5 thêm ghi chú: `Upcoming` bao trùm từ lúc publish tới giờ bắt đầu, dù đăng ký đang
      mở, đã đóng hay không dùng; `Registration Open/Closed` tính từ registration window (giống
      feedback window ở §10.11).
    - UC29, UC30: precondition ghi rõ "inside its registration window" vì `Upcoming` không còn
      hàm ý đang mở đăng ký.
  - Lý do: không thêm trạng thái hay chuyển trạng thái mới cho scheduler; một tên đúng cho mọi
    loại event.
  - Chưa sửa: `UCMS_Business_System_Analysis*.md` (tài liệu v1, giữ nguyên);
    `UCMS_UseCase_Specifications_v2.docx` cần xuất lại từ `.md`.

### I24 — UC34 trả báo cáo: thiếu trong lifecycle Event
- **Vấn đề:** Spec UC34 có kết quả *Return for correction* (UC33 A2 sửa và nộp lại), sơ đồ
  trạng thái vẽ `Report Submitted → Completed : UC34 return report`, nhưng bảng Model §10.5 không
  có chuyển trạng thái này, và Spec không nói event về trạng thái nào.
- **Cách sửa đề xuất:** thêm dòng vào §10.5; ghi rõ trạng thái trong Spec UC34.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa:
    - `UCMS_UseCase_Model_v2.md`: §10.5 Event
    - `UCMS_UseCase_Specification_v2.md`: UC34 Main Flow bước 2
  - Thay đổi: thêm `Report Submitted → Completed (report returned for correction) | UC34`;
    Spec UC34 *Return for correction* → *the event returns to `Completed` and the report goes
    back to UC33 (A2)*.
  - Lý do: khớp Model với Spec và sơ đồ trạng thái đã có; `Completed` là trạng thái UC33 nộp
    báo cáo từ đó.
  - Chưa sửa: `UCMS_UseCase_Specifications_v2.docx` cần xuất lại từ `.md`.

### I25 — Trạng thái Membership
- **Vấn đề:** `Ended` không phân biệt thành viên tự xin rời (UC22) với bị CLB loại, nên roster
  và lịch sử không cho biết lý do kết thúc; `On Leave` và `Inactive` không có gì phân biệt.
- **Cách sửa đề xuất:** 4 trạng thái `Active`, `Inactive`, `Left`, `Banned`.
- **Xử lý:**
  - Ngày: 2026-09-23
  - File đã sửa:
    - `UCMS_UseCase_Model_v2.md`: UC21 States, Flow, Rules; UC17 Validation; UC20 Rules; §11 thêm
      BR46
    - `UCMS_UseCase_Specification_v2.md`: UC21 Trigger, Input, bước 2–3, A1, A2, E1, Business
      Rules; UC22 Preconditions; UC17 E4 + BR; UC20 E2 + BR
    - `diagrams/UCMS_State_Diagrams.drawio`: trang Membership vẽ lại
  - Thay đổi:
    - `Active → On Leave → Inactive → Ended` → `Active` ⇄ `Inactive`; `Active` / `Inactive` →
      `Left` hoặc `Banned`; `Left`, `Banned` là trạng thái cuối.
    - `Inactive`: ngừng hoạt động, CMB đổi qua lại với `Active`. Membership mới (UC20) mặc định
      `Active`.
    - UC21 A2 *Bulk end of term* ("not renewed" — không UC nào tạo dữ liệu gia hạn) → *Semester
      re-registration*: đầu mỗi kỳ (lịch UC04) CMB xác nhận ai còn active; `Active` không được
      xác nhận → `Inactive`, `Inactive` được xác nhận → `Active`, hiệu lực từ đầu kỳ. Trigger
      của UC21 thêm "a semester begins".
    - E1 (đang giữ vị trí board) chặn cả `Inactive`; ở A2 thành viên board luôn được tính là đã
      xác nhận.
    - `Left`: UC21 A1 chấp nhận yêu cầu UC22. UC22 cho phép cả membership `Inactive` xin rời.
    - `Banned`: CMB buộc rời, lý do bắt buộc. E1 (đang giữ vị trí board) chặn cả `Left` và
      `Banned`.
    - Quay lại CLB sau `Left` là membership mới qua UC20. **BR46** (mới): sinh viên `Banned` không
      được apply (UC17 E4) hay onboard (UC20 E2, kể cả manual onboarding) vào CLB đó nữa.
  - Lý do: tách hai cách kết thúc theo người khởi xướng; bỏ trạng thái không có hành vi riêng.
  - Chưa sửa: `UCMS_Business_System_Analysis*.md` (tài liệu v1, giữ nguyên);
    `UCMS_UseCase_Specifications_v2.docx` cần xuất lại từ `.md`.

### I26 — Khung Phase 1/2 lỗi thời
- **Vấn đề:** đã chốt mọi UC ra cùng lúc, nhưng Model và Spec vẫn dựng trên khung Phase 1/2.
  Không chỉ là nhãn: nhiều chỗ dùng phase để hoãn hoặc thay thế hành vi, nên phải có quyết định
  về nội dung chứ không xóa chữ được.
  - **Chỉ là nhãn** (xóa hoặc bỏ cột):
    - cột `Phase` trong bảng UC (Model §4–§8, Spec bảng UC);
    - dòng `**Phase:** N` ở từng UC (Model §8, 54 chỗ ở Spec);
    - `(2)` trong sơ đồ luồng Model §11 và chú thích "`(2)` marks Phase 2";
    - `*(Phase 2)*` ở tiêu đề Model §10.7, §10.8, §10.10, §10.11;
    - định nghĩa Phase ở Model (sau bảng module) và phần đầu Spec.
  - **Có nội dung phụ thuộc phase** (cần quyết định):
    - Model mục actor: bỏ `ICPDP Head`, duyệt đa cấp dời sang UC05 Phase 2; Spec UC08, UC26, UC36
      có `A1 Second level (Phase 2)`; **BR16** "Inactive in Phase 1" → nay
      duyệt đa cấp có hiệu lực luôn hay bỏ hẳn?
    - **BR42** + Spec UC04: "Phase 1 exposes only this list" → màn hình cấu hình mở rộng tới đâu
      (liên quan **D2**)?
    - **BR43** (Phase 1 không phụ thuộc Phase 2) → mất đối tượng, xóa.
    - Model UC28 ("compliance signal (UC42, Phase 2)"), UC34 ("Phase 2, open a case through
      UC42") → ghi thẳng là gọi UC42.
    - UC37, UC49 và BR23/BR35: câu "why … is Phase 1" → chỉ giữ lý do nghiệp vụ.
    - Model §12 *Phase plan* (loop Phase 1, bảng Phase 2 với "Phase 1 substitute", mục "If
      scope must be cut further") → xóa hay đổi thành thứ tự build / cắt scope?
    - Model §13 (cột "Phase 1 coverage", BP12/13/17/18 "none in Phase 1") và bảng kiểm cuối
      Spec (dòng BR43, dòng BP "land in Phase 2") → đổi thành coverage đầy đủ.
- **Cách sửa đề xuất:** xóa toàn bộ nhãn; với nhóm nội dung: bật duyệt đa cấp theo UC05 (bỏ
  "Inactive" ở BR16, bỏ "(Phase 2)" ở các A1), xóa BR43, viết lại BR42 theo kết luận D2, rút §12
  thành thứ tự build + thứ tự cắt scope, cập nhật §13 và bảng kiểm Spec.
- **Xử lý:**
  - Ngày: 2026-09-24
  - File đã sửa: `UCMS_UseCase_Model_v2.md`, `UCMS_UseCase_Specification_v2.md`, `README.md`.
  - Thay đổi:
    - Nhãn: bỏ cột `Phase` ở các bảng UC (Model §4, Spec Index); bỏ `**Phase:** N` ở mọi UC; bỏ
      `(2)` và chú thích của nó ở sơ đồ luồng Model §8; bỏ `*(Phase 2)*` ở Model §10.7, 10.8,
      10.10, 10.11; bỏ `Phase` khỏi template/format (Model §6, đầu Spec) và đoạn định nghĩa
      Phase ở Model §4.
    - Duyệt đa cấp (giữ lại): Model §3 — `ICPDP Head` vẫn không là actor, nhưng UC05 định tuyến
      sang cấp hai và mọi cấp đều do ICPDP Officer thực hiện nên BR31 vẫn đúng. **BR16**
      `Inactive in Phase 1` → `Changed`: duyệt đa cấp theo UC05, request không khớp rule nào thì
      duyệt một cấp. UC05 (Model + Spec): "Until it ships … BR16 is inactive" → "It is what
      makes BR16 enforceable". Spec UC08, UC26, UC36: `A1 Second level (Phase 2)` →
      `A1 Second level`. D1: bỏ "When UC05 ships", câu hỏi RBAC hay actor thứ tư vẫn mở.
    - **BR42** + UC04: "Phase 1 exposes only this list" → "The configuration screen exposes only
      this list". D2: bỏ "in Phase 1", vẫn mở.
    - **BR43** → `Withdrawn`, giữ số hiệu, không dùng lại. Gỡ các tham chiếu BR43 ở Spec UC34,
      UC37, UC49, UC53 và dòng kiểm tra BR43 ở phụ lục Spec.
    - UC28 (Model): "(UC42, Phase 2)" → "for UC42". UC34: bỏ "once that ships" / "Until UC42
      ships …"; finding mở case ở UC42 luôn. UC37, UC49, BR23, BR35: "is Phase 1 because" →
      chỉ giữ lý do nghiệp vụ. UC53: bỏ "which is why … same phase".
    - Model §12 `Phase plan` → `Release scope`: một release 54 UC, 11 loop (thêm UC05, UC12–UC14,
      UC19, UC22, UC23, loop Governance intelligence, loop Feedback & complaint); thứ tự cắt
      scope thêm Governance intelligence (kéo theo Feedback & complaint) lên đầu.
    - Model §13: cột `Phase 1 coverage` → `Coverage`; BP03, BP12, BP13, BP17, BP18 → `full`; đoạn
      "Four pain points have no Phase 1 coverage" → "Every pain point is covered". Phụ lục Spec
      dòng pain point → "19 of 19 (model §13)".
    - Model §1 (dòng "MVP broke its own dependencies"), Spec phần đầu và `README.md`: "phase
      plan" → "release scope" / một release chia loop.
  - Lý do: mọi UC ra cùng lúc nên nhãn phase vô nghĩa; các chỗ dùng phase để hoãn hành vi được
    viết lại thành hành vi thật. Duyệt đa cấp giữ lại theo quyết định của team, D1 và D2 vẫn là
    câu hỏi mở vì không phụ thuộc phase.
  - Chưa sửa: `UCMS_Business_System_Analysis*.md` (tài liệu v1, giữ nguyên);
    `UCMS_UseCase_Specifications_v2.docx` cần xuất lại từ `.md`.
  - 2026-09-26 — dọn phần sót trong `UCMS_UseCase_Specifications_v2.docx` (sửa tay, không xuất lại):
    xoá hàng BR43 ở UC34 (*"Until UC42 ships, …"*) và UC53 (*"… ship in the same phase"*); BR42
    *"Phase 1 exposes …"* → *"The system exposes …"*; bỏ đuôi *"(Phase 2)"* ở 4 luồng thay thế
    (duyệt 2 cấp ICPDP ×3, waitlist UC29). `README.md`: dãy BR *BR01–BR46* → *BR01–BR52 (51 quy tắc
    còn hiệu lực)*. Sau lần này không còn `Phase 1/2` hay BR43 đang hiệu lực trong tài liệu v2.

### I27 — «extend» dùng cho điều hướng giao diện ở trang Student
- **Vấn đề:** trang Student có 6 cạnh `«extend»`: `UC17 / UC29 → UC06` và
  `UC22 / UC29 / UC31 / UC50 → UC24`. Chúng mô tả "từ màn hình A bấm sang chức năng B" (UI flow),
  không phải hành vi tùy chọn chèn vào UC gốc tại một extension point:
  - UC06 và UC24 là màn hình xem, không có điểm mở rộng hay điều kiện chèn nào;
  - UC29 extend hai UC gốc khác nhau — dấu hiệu vẽ theo màn hình vào;
  - cả 6 UC đích đều có association trực tiếp với Student, tức là UC độc lập;
  - các cạnh đi vòng làm sơ đồ rối.
- **Cách sửa đề xuất:** xoá toàn bộ 6 cạnh; Student nối thẳng tới từng UC. Điều hướng ghi trong
  Spec hoặc sơ đồ UI flow, không ở UCD.
- **Xử lý:**
  - Ngày: 2026-09-24
  - File đã sửa: `diagrams/UCMS_UseCase_ByActor.drawio` — trang Student;
    `diagrams/img/UCMS_UseCase_ByActor_02_Student.png`; `UCMS_UseCase_Specification_v2.md` — UC24.
  - Thay đổi:
    - UCD: xoá `p1e10`–`p1e15`. Trước: 6 cạnh «extend». Sau: chỉ còn 9 association Student → UC.
    - Spec UC24 bước 3: "The student continues into UC29 … or UC22" → ghi rõ đó là liên kết điều
      hướng, mỗi UC đích là UC độc lập, không phải «extend» của UC24.
    - I12: đánh dấu phần UCD bị huỷ.
  - Lý do: «extend» chỉ dành cho hành vi có điều kiện chèn vào luồng UC gốc. Các trang CMB/ICPDP
    giữ nguyên vì cạnh ở đó đúng nghĩa này (vd. `UC47 «extend» UC25` khi sự kiện cần địa điểm,
    `UC42 «extend» UC53` khi khiếu nại cần mở case).
  - Chưa sửa: `UCMS_UseCase_Specifications_v2.docx` cần xuất lại từ `.md`.

### I28 — «extend» dùng cho cascade hệ thống ở trang CMB 3, ICPDP 1, ICPDP 3
- **Vấn đề (review lần 2):**
  1. `UC28 «extend» UC15`, `UC49 «extend» UC15`: khi ICPDP đình chỉ/giải thể club, hệ thống tự
     huỷ event và booking (Spec UC15 bước 3, UC28 A1 "without a CMB step", UC49 A1). Đó là hệ
     quả nghiệp vụ (cascade), không phải hành vi mà actor của UC15 thực hiện tại một extension
     point; UC28/UC49 lại là UC của CMB.
  2. `UC42 «extend» UC49`: UC49 E2 chỉ ghi một *compliance signal*; case được ICPDP mở sau, ở UC42.
     Không có gì chèn vào luồng UC49.
  3. Trang CMB 3 mượn UC15, UC42 của ICPDP chỉ để nối các cạnh trên; trang ICPDP 1 mượn
     UC28/UC49, ICPDP 3 mượn UC49 của CMB.
  - Review còn cho rằng chiều mũi tên `UC28 → UC15` bị ngược. **Không đúng:** cạnh đi từ UC mở
    rộng (UC28) về UC gốc (UC15) là đúng chiều; lỗi nằm ở việc dùng «extend», không ở chiều.
  - Review đề nghị bỏ cả `UC47 «extend» UC25` vì UC47 có association trực tiếp với CMB. **Không
    sửa:** Spec UC25 bước 4 "optionally attaches a property booking request (UC47)" và UC47 A2 là
    đúng mẫu «extend» (tùy chọn, chèn tại một bước của UC gốc, cùng actor); UC47 vẫn chạy độc
    lập cho hoạt động không gắn event nên giữ association. Khác I27: ở đó UC gốc (UC06, UC24) là
    màn hình xem, không có bước nào để chèn.
- **Cách sửa đề xuất:** xoá cạnh ở (1), (2) và các node mượn; mô tả cascade trong Spec.
- **Xử lý:**
  - Ngày: 2026-09-24
  - File đã sửa: `diagrams/UCMS_UseCase_ByActor.drawio` — trang CMB 3, ICPDP 1, ICPDP 3;
    PNG tương ứng trong `diagrams/img/`; `UCMS_UseCase_Specification_v2.md` — UC15.
  - Thay đổi:
    - CMB 3: xoá `p4e7` (UC28→UC15), `p4e8` (UC49→UC15), `p4e12` (UC42→UC49) và node mượn
      `p4UC15`, `p4UC42`. Còn `UC47 «extend» UC25`, `UC49 «extend» UC28`.
    - ICPDP 1: xoá `p6e8`, `p6e9` và node mượn `p6UC28`, `p6UC49`. Còn `UC15 «extend» UC42`.
    - ICPDP 3: xoá `p8e9` (UC42→UC49) và node mượn `p8UC49`. Còn UC42 extend UC53/UC34/UC39 và
      `UC15 «extend» UC42` — cùng actor ICPDP, mở case/ra quyết định ngay trong luồng khi có vi phạm.
    - Spec UC15 Postconditions: thêm câu event/booking bị huỷ là cascade của hệ thống (UC28 A1,
      UC49 A1).
    - I09: đánh dấu cách sửa bị huỷ.
  - Lý do: UCD chỉ giữ quan hệ mà actor thực sự đi qua; cascade và tín hiệu bất đồng bộ thuộc về
    Spec (Postconditions, Alternative Flows) hoặc sơ đồ activity/state.
  - Chưa sửa: `UCMS_UseCase_Specifications_v2.docx` cần xuất lại từ `.md`.

### I29 — Lỗi hiển thị trang All users
- **Vấn đề (review lần 3):**
  1. Nhãn actor hiện `<<external>><br>Google OAuth`: value bị escape hai lần nên `<br>` in ra
     nguyên văn.
  2. UC02 nằm trên UC01, đọc ngược thứ tự.
  3. (Phát hiện thêm) nhãn hai dòng "Club Management Board" đè lên đầu actor ICPDP Officer.
  - Review còn đề nghị: đổi Google OAuth sang hình hộp / stereotype `«secondary»`; đổi "Sign in
    with Google" → "Sign in"; thêm quan hệ UC02–UC01. **Không sửa:**
    - UML cho phép hệ thống ngoài làm actor; vai trò supporting đã thể hiện bằng vị trí bên phải
      và association chỉ với UC01; `«secondary»` không phải stereotype chuẩn; `«external»` khớp
      Model §3 (Supporting: Google OAuth, ES1).
    - Đăng nhập chỉ qua Google là ràng buộc nghiệp vụ (UC01: "Access without in-house
      passwords"), và tên UC trên UCD phải khớp Model/Spec ("Authenticate via Google OAuth …",
      cùng nguyên tắc I13).
    - UC02–UC01 đã xử lý ở I11: UC01 là precondition của UC02 (Spec UC02).
- **Cách sửa đề xuất:** sửa escape, đảo hai oval, giãn actor.
- **Xử lý:**
  - Ngày: 2026-09-24
  - File đã sửa: `diagrams/UCMS_UseCase_ByActor.drawio` — trang All users;
    `diagrams/img/UCMS_UseCase_ByActor_01_All-users.png`.
  - Thay đổi:
    - `p0oauth` value: `&amp;lt;br&amp;gt;` → `&lt;br&gt;` — nhãn thành hai dòng `<<external>>` /
      `Google OAuth`.
    - `p0UC01` y 230 → 110, `p0UC02` y 110 → 230; `p0oauth` y 217 → 97 để ngang UC01.
    - Actor: `p0a1` y 150 → 160, `p0a2` y 260 → 280, `p0user` y 150 → 160.
  - Lý do: chỉ sửa lỗi hiển thị; ký hiệu và tên UC đã đúng chuẩn và khớp tài liệu.

### I30 — Trang CMB 4: ký hiệu supporting, UC51–UC33, thứ tự
- **Vấn đề (review lần 4):**
  1. CMB nối UC31 bằng nét đứt có nhãn "supporting". UML chỉ có association (nét liền) giữa actor
     và UC; vai trò primary/supporting không vẽ được trên cạnh mà ghi ở Spec (UC31: Primary
     Student, Supporting CMB).
  2. `UC51 «extend» UC33`: UC51 không chèn hành vi vào luồng UC33 — UC33 bước 1 là hệ thống nạp
     sẵn tóm tắt feedback, không phải CMB chạy UC51. Quan hệ thật là luồng dữ liệu (output UC51 →
     input UC33), đã có ở Related UC. UC51 còn chạy độc lập (trigger: đóng cửa sổ feedback; A1 so
     sánh nhiều event).
  3. Thứ tự oval: UC31 nằm cuối, UC54 chen giữa nhóm event và nhóm tài chính.
  - Review đề nghị tách UC31 thành UC "Take attendance" riêng của CMB. **Không sửa:** Model §1 đã
    gộp check-in thủ công vào UC31 A1 để bỏ hai primary actor của v1; tách ra thì hai UC cùng tạo
    attendance record và BR18 phải kiểm ở hai chỗ.
  - Review đề nghị `UC33 «include» UC51` nếu xem feedback là bắt buộc. **Không sửa:** không bắt
    buộc — dưới ngưỡng BR40 UC51 không hiển thị nội dung.
- **Cách sửa đề xuất:** association nét liền; xoá «extend»; xếp lại theo luồng nghiệp vụ.
- **Xử lý:**
  - Ngày: 2026-09-24
  - File đã sửa: `diagrams/UCMS_UseCase_ByActor.drawio` — trang CMB 4;
    `diagrams/img/UCMS_UseCase_ByActor_06_CMB-4-Accountability-finance.png`.
  - Thay đổi:
    - `p5e8`: nét đứt nhãn "supporting" → association nét liền, không nhãn. Oval UC31 giữ ghi chú
      *(Student)* để biết UC mượn từ trang Student.
    - Xoá `p5e9` (`UC51 «extend» UC33`).
    - Thứ tự từ trên xuống: UC32, UC33, UC51, UC54, UC35, UC38, UC40, UC31 → UC31, UC32, UC33,
      UC51 (điểm danh, đóng event) · UC35, UC38 (tài chính) · UC40 (báo cáo định kỳ) · UC54
      (khiếu nại).
  - Lý do: UCD chỉ dùng ký hiệu UML chuẩn; phân vai actor và luồng dữ liệu thuộc về Spec. Sắp
    theo luồng nghiệp vụ giữ các UC liên quan cạnh nhau và gần như tăng dần theo ID.

---

## Review Report v2 (2026-09-26)

Các issue I31–I54 phát hiện khi đọc toàn bộ phần chữ và bảng của **Report** (không đối chiếu được
nội dung bên trong hình). Nhiều lỗi nằm ở câu chữ do bộ sinh report tạo ra, nên phải sửa ở nguồn
sinh (Spec/Model + generator) rồi sinh lại, không sửa tay trong `.docx`.

### I31 — Guest: có hay không có actor này?
- **Vấn đề:**
  - Report §III.2.1: *"UCMS has three human actors"* — không có Guest.
  - Nhưng §III.3.1.2.4 có *Guest flow* (Fig III.10), Table III.4 có cột Guest (screen 1–7), §VI.3.2
    là *"Role: Guest"*.
  - UC06 (Actor: Student) có precondition *"A valid session (UC01)"*, nên Guest không xem được
    Homepage / Club directory / Event list như Table III.4 cho phép.
  - §I.1.1 gọi là *"a public student-facing portal"*, còn §I.4 và §I.5 gọi là *"a single
    authenticated entry point"* / *"one authenticated place"*.
- **Cần chốt:** khách chưa đăng nhập có được xem khu public không?
- **Cách sửa đề xuất (nếu "có"):** giữ ba business actor; thêm một ghi chú dưới Table III.1 rằng
  Guest là khách chưa đăng nhập, chỉ đọc, không phải business actor. UC06 precondition → *"None;
  applying or registering requires UC01"*. Sửa câu ở §I.4, §I.5 thành "public discovery,
  authenticated action".
- **Cách sửa đề xuất (nếu "không"):** xoá Guest flow, cột Guest, §VI.3.2; sửa §I.1.1.
- **Xử lý:** 2026-09-26 — chốt **"có"**: Guest được xem khu công khai, chỉ đọc.
  - `UCMS_UseCase_Specification_v2.md` UC06: tiền điều kiện *"Có một phiên hợp lệ (UC01)"* →
    *"Không có — Guest cũng xem được, chỉ đọc. Đi tiếp sang UC17 / UC29 thì phải có phiên hợp lệ
    (UC01)"*; bước 4 thêm: chưa đăng nhập thì chuyển sang UC01 rồi quay lại đúng trang.
  - `UCMS_UseCase_Model_v2.md` §3: thêm đoạn *"Guest không phải actor"* (khách chưa đăng nhập,
    chỉ đọc UC06, không sở hữu UC nào; *khám phá công khai, hành động phải đăng nhập*). UC06 ở §4
    thêm dòng tiền điều kiện.
  - `SRS.md`: §2.3 thêm cùng đoạn ghi chú Guest; UC06 tiền điều kiện đổi như Spec, thêm
    FR-UC06-07 (phục vụ UC06 cho Guest, chuyển sang UC01 khi đi tiếp UC17/UC29); §3.1 thêm
    *"khu công khai chỉ đọc"* và dòng workspace `Public` trong danh mục màn hình.
  - Vẫn giữ **ba business actor** (§III.2.1 đúng), Guest flow, cột Guest ở Table III.4 và §VI.3.2.
  - `Group1_SE1939-NJ_Report_Final_v2.docx` (sửa trực tiếp): thêm đoạn *"Guest is not a business
    actor…"* ngay dưới Table III.1; UC06 Preconditions *"A valid session (UC01)."* → *"None; a guest
    can browse read-only. Applying (UC17) or registering (UC29) requires a valid session (UC01)."*;
    UC06 bước 3 thêm *"a guest is sent to UC01 first and returned to the same page"*; §I.4 *"a
    single authenticated entry point"* và §I.5 *"one authenticated place"* → thêm *"public
    discovery, authenticated action"*.
  - **Lý do:** UC06 là cửa vào của sản phẩm — cho khách xem trước là hợp lý và report đã có sẵn
    Guest flow, cột Guest, User Manual cho Guest; giữ Guest ngoài danh sách actor vì Guest không
    ra quyết định, không tạo dữ liệu (đúng quy tắc actor ở Model §2).

### I32 — BR31 nói quá rộng
- **Vấn đề:** BR31 catalogue: *"ICPDP is the single approval authority; no decision in the system
  is approved by another actor"*. Nhưng CMB tự quyết: Accept/Reject đơn thành viên (UC18), ban
  (UC21), gán position không nhạy cảm (UC23), chốt attendance (UC32). Glossary "ICPDP" cũng nói
  *"the single approval authority in UCMS"*.
- **Cách sửa đề xuất:** BR31 → *"ICPDP is the single approval authority for every request a club
  or student submits to the university; decisions internal to a club are taken by its CMB within
  its scope"*. Sửa Glossary tương tự.
- **Xử lý:** 2026-09-26 — chốt **giới hạn phạm vi BR31** (theo cách sửa đề xuất).
  - `Group1_SE1939-NJ_Report_Final_v2.docx` (sửa trực tiếp):
    - Table III.6 BR31: *"ICPDP is the single approval authority; no decision in the system is
      approved by another actor"* → *"ICPDP is the single approval authority for every request a
      club or student submits to the university; decisions internal to a club are taken by its CMB
      within its scope"*.
    - Glossary "ICPDP": *"the single approval authority in UCMS"* → *"the single approval authority
      for every request a club or student submits to the university"*.
    - Bảng actor, dòng ICPDP: *"The only university-side actor and the single approval
      authority."* → thêm *"for every request submitted to the university; decisions internal to
      a club stay with its CMB"*.
    - Câu ở BR16 (*"every approval level is exercised by an ICPDP Officer"*) giữ nguyên, vì vẫn đúng.
  - `SRS.md`: sửa theo cùng cách ở 4 chỗ: Glossary ICPDP (§1), §A3 ICPDP Officer, dòng BR31
    trong catalogue và bảng thuật ngữ cuối.
  - `01-business-analysis/UCMS_Business_System_Analysis.md`: sửa dòng BR31 như trên.
  - Không sửa Model/Spec: hai file này chỉ nhắc BR31 ở UC08/UC26/UC48, đều là yêu cầu gửi lên nhà
    trường. Không sửa Report v1 (`Group1_SE1939-NJ_Report_Final.docx`) vì chỉ sửa ở bản v2.
  - **Lý do:** UC18, UC21, UC23, UC32 là quyết định nội bộ của CMB, không phải yêu cầu gửi lên
    nhà trường. Giới hạn phạm vi BR31 giữ được ý "một cấp phê duyệt duy nhất" mà không mâu thuẫn
    với các UC đó, và không phải đổi UC nào.

### I33 — Nguồn gốc quyền CMB
- **Vấn đề:**
  - UC01 (BR31 trong bảng UC): quyền *"derived from the position assignment inside the active term,
    never from a flag on the user"*.
  - UC03: ICPDP *"grants or revokes an ICPDP or CMB role"*; E409 cho phép override khi người đó
    giữ board seat. §VI.3.5 viết lại y như vậy.
  - UC11 (BR07 trong bảng UC): *"Permissions come from this confirmation, not from UC03"*.
- **Cần chốt:** UC03 có được cấp CMB role không?
- **Cách sửa đề xuất:** UC03 chỉ cấp/thu hồi role ICPDP (kể cả special role của BR19) và
  lock/unlock tài khoản. Quyền CMB chỉ đến từ UC08 (tạm thời), UC11, UC13, UC23. Nếu cần cấp CMB
  khẩn cấp thì ghi rõ là override có lý do, có hạn, có audit — và sửa câu của UC01, UC11 cho khớp.
- **Xử lý:** 2026-09-26 — chốt **UC03 không cấp quyền CMB** (phương án 1 của cách sửa đề xuất).
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - Table III.6: thêm dòng **BR47** — *"CMB permissions in a club come only from a confirmed position in
      its active term: the applicant's temporary seat (UC08), the confirmed board (UC11), the confirmed term
      transition (UC13) or a position assignment (UC23). UC03 never grants them."* · áp dụng tại *UC01, UC03,
      UC08, UC11, UC13, UC23*. Câu dẫn bảng *"leaving 45 rules in force"* → *"46 rules"*.
    - Table III.2 và Summary UC03: *"grants or revokes an ICPDP or CMB role"* → *"grants or revokes an ICPDP
      role or the special role of BR19"*.
    - UC03 bước 2: *"Officer grants or revokes an ICPDP or CMB role."* / *"System scopes a club-scoped role
      to the selected club."* → *"… an ICPDP role or the special role of BR19."* / *"System offers no CMB
      permission here; club permissions come only from UC08, UC11, UC13 and UC23 (BR47)."*
    - UC03 E409 thứ hai: *"The target holds a confirmed board position. System warns that UC10/UC11 is the
      correct path and records the override if the officer proceeds."* → *"The officer tries to give a user
      CMB permissions. System refuses and points to UC10/UC11 or UC23 (BR47)."*
    - UC03 dòng BR31 (*"A CMB role granted here is subordinate…"*) → **BR47**: *"This use case never grants
      CMB permissions; they come only from a confirmed position in the club's active term (UC08, UC11, UC13,
      UC23)."*
    - UC01 dòng BR31 (*"… permission is derived from the position assignment inside the active term, never
      from a flag on the user."*) → **BR47**: *"Club permissions are derived from the confirmed position the
      user holds in the club's active term, never from a role granted in UC03."*
    - UC11 dòng BR07 (*"Permissions come from this confirmation, not from UC03, and expire with the term."*)
      → đổi mã thành **BR47**, giữ câu.
    - §VI.3.5 *Manage accounts*: bỏ *"grant or revoke an … club role … A club role granted here is
      subordinate…"* → *"grant or revoke an ICPDP role or the special role … Club permissions are never
      granted here: they come only from the board confirmed through the nomination flow, a confirmed term
      transition or a position assignment, and expire with the term."*
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx` UC03: Summary, bước 2, ngoại lệ 422 (override →
    từ chối, BR47), dòng `BR-RBAC` → `BR47` với câu mới; UC11 dòng `BR-PERM` → `BR47`.
  - `UCMS_UseCase_Specification_v2.md` UC03: Dữ liệu vào, bước 3, E2 (override → từ chối), Quy tắc
    nghiệp vụ (BR47); UC11 Quy tắc thêm BR47.
  - `UCMS_UseCase_Model_v2.md`: UC03 luồng + quy tắc; UC11 quy tắc thêm BR47; catalogue §11 thêm BR47.
  - `SRS.md`: UC03 (Dữ liệu vào, Quy tắc, FR-UC03-02, FR-UC03-06, FR-UC03-09); catalogue §5 thêm BR47; số
    quy tắc 45 → 46 (BR01–BR47); bảng truy vết UC01, UC03, UC11 thêm BR47. §2.3 (vai trò hệ thống cấp ở
    UC03, vai trò CLB cấp bởi UC11/UC13) đã đúng sẵn.
  - `UCMS_BR_Issues_Context.md`: cập nhật dòng BR07, BR31 và mục I33.
  - Không sửa DBML: note của bảng gán vai trò đã ghi *"Quyền phía CLB KHÔNG cấp ở đây — nó đến từ
    clubPositionAssignments…"*, khớp sẵn với cách này.
  - **Lý do:** Model đã có đủ đường cho mọi tình huống (CLB mới qua UC08, ghế trống qua UC10/UC11, chức
    vụ qua UC23), DBML và FR-UC01-05 đều suy quyền từ vị trí trong nhiệm kỳ. Bỏ đường cấp tay giúp chỉ còn
    một nguồn quyền, không phải định nghĩa hạn dùng / xung đột / thu hồi cho quyền override.

### I34 — UC05 "total" vs BR16 mặc định một cấp
- **Vấn đề:** UC05 bước 3: *"every request matches exactly one rule"*; E409: *"a request type has
  no rule. System refuses activation"*. BR16: *"a request that matches no rule is decided at a
  single level"*.
- **Cách sửa đề xuất:** giữ BR16 (mặc định một cấp là hợp lý). UC05 bước 3 → *"validates that no
  two rules overlap"*; E409 bỏ vế *"or a request type has no rule"*.
- **Xử lý:** 2026-09-26 — chốt **giữ BR16, sửa UC05** (theo cách sửa đề xuất).
  - `Group1_SE1939-NJ_Report_Final_v2.docx` UC05:
    - Bước 3: *"System validates that the rules are total and unambiguous — every request matches exactly
      one rule."* → *"System validates that no two rules overlap; a request that matches no rule is decided
      at a single level (BR16)."*
    - E409: *"Two rules overlap, or a request type has no rule. System refuses activation."* → *"Two rules
      overlap. System refuses activation."*
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx` UC05: bước validate và ngoại lệ 409 sửa tương tự
    (*"… and names the gap"* → *"… and names the overlapping rules"*).
  - `UCMS_UseCase_Specification_v2.md` UC05: bước 3 và E1 sửa theo cùng cách.
  - `SRS.md`: FR-UC05-02, FR-UC05-03.
  - `05-implementation/TASKS.md` BE-1.9: *"validate tính đầy đủ và không nhập nhằng"* → *"validate không
    chồng lấn (hồ sơ không khớp rule nào → một cấp, BR16)"*.
  - Không sửa BR16 (catalogue và UC05, UC26, UC36 đã nói đúng ý này) và Model UC05 (đã khớp sẵn).
  - **Lý do:** ICPDP chỉ cần khai báo các trường hợp cần cấp 2, mọi hồ sơ còn lại mặc định một cấp;
    bộ rule ngắn, dễ bảo trì, và các chỗ khác trong tài liệu đều đã hiểu BR16 theo nghĩa này.

### I35 — Giá trị "configurable" ngoài 9 giá trị của BR42
- **Vấn đề:** BR42: màn hình cấu hình chỉ có 9 giá trị của UC04, mọi thứ khác là hằng số trong
  policy document. Nhưng các chỗ sau vẫn ghi "configurable / configured by ICPDP" mà không có UC
  nào cấu hình:
  - BR06 (overlap President "unless policy allows"), BR07 (eligibility), BR25 (evidence theo
    expense category), BR27 (*"severity taxonomy is configured by ICPDP"*).
  - Revision deadline (UC08, UC26), lead time (UC25), notice period huỷ muộn (UC28, UC49), promotion
    policy (UC30), check-in window (UC31), response deadline (UC54), rubric (UC19 — cái này cấu hình
    theo campaign ở UC16 nên hợp lệ), complaint types (UC52), sensitive position (UC23).
- **Cần chốt:** giá trị nào thêm vào UC04 (tăng từ 9), giá trị nào là hằng số trong policy document.
- **Cách sửa đề xuất:** giữ 9; các giá trị còn lại đổi chữ thành *"defined in the policy
  document"*. Riêng BR27 đổi *"configured by ICPDP"* → *"defined in the policy document"*.
  Cập nhật BR42 kèm danh sách hằng số để tra cứu.
- **Xử lý:** 2026-09-26 — chốt **giữ 9 giá trị** (theo cách sửa đề xuất).
  - `Group1_SE1939-NJ_Report_Final_v2.docx` (sửa trực tiếp), mỗi chỗ *"configured / configurable /
    policy allows / required by policy"* → *"defined in the policy document"*:
    - BR06 (UC10 + catalogue): *"unless policy allows it"* → *"unless the policy document allows
      it"*; UC10 E: *"System refuses unless policy allows the overlap"* → tương tự.
    - BR07 (UC10 + catalogue), BR25 (UC38 + catalogue), BR27 (UC42 + catalogue): *"are/is
      configurable"*, *"is configured by ICPDP"* → *"… defined in the policy document"*.
    - UC07 precondition: *"eligible under the policy configured in UC04"* → *"eligible under the
      founding eligibility defined in the policy document"*.
    - UC10 E: *"ineligible under the configured conditions"* → *"… the eligibility conditions
      defined in the policy document"*.
    - UC25: *"the lead time required by policy"* → *"the minimum lead time defined in the policy
      document"*.
    - UC28, UC49 E: *"inside the configured notice period"* → *"inside the notice period defined in
      the policy document"*.
    - UC30 (Table III.2, mô tả, bước hệ thống, BR): *"configured (promotion) policy"* → *"the
      (promotion) policy defined in the policy document"*.
    - UC31 precondition: *"the configured check-in window"* → *"the check-in window defined in the
      policy document"*.
    - UC40 precondition *"the period is defined in UC04"* và glossary Periodic report *"for a
      configured period"* → học kỳ theo lịch UC04 hoặc kỳ khác *"defined in the policy document"*.
    - UC54: *"due within the configured period"* → *"due within the period defined in the policy
      document"*.
    - BR42 (UC04 + catalogue): *"every other rule marked configurable ships as a constant in one
      policy document"* → *"every other policy value is a constant defined in the policy document:
      …"* kèm danh sách 12 hằng số (UC07, BR06, BR07, UC25, UC28/UC49, UC30, UC31, BR25, BR27,
      UC40, UC52, UC54).
  - `UCMS_UseCase_Specification_v2.md`: UC04 BR42 (thêm danh sách hằng số), UC07, UC10 E2, UC18,
    UC25, UC28 E2, UC30, UC31, UC40, UC49 E2, UC54.
  - `UCMS_UseCase_Model_v2.md`: UC04 (danh sách hằng số), UC18, UC28, UC30, UC38 (BR25), UC49,
    UC54, dòng BR42 ở §14.
  - `SRS.md`: UC04 quy tắc, UC07, FR-UC10-02/03, UC18, FR-UC25-02, FR-UC28-08, UC30, UC31,
    FR-UC40-01, FR-UC42-01, FR-UC49-06, UC54; catalogue BR06, BR07, BR25, BR27, BR42 và đoạn
    "Cấu hình được và hằng số" (thêm danh sách hằng số).
  - `01-business-analysis/UCMS_Business_System_Analysis.md`: dòng BR06, BR07, BR25, BR27.
  - Giữ nguyên, vì hợp lệ: rubric (UC19, cấu hình theo campaign ở UC16), sensitive position (cờ
    `isSensitive` do CMB đặt cho từng chức vụ ở UC09), revision deadline (officer đặt khi yêu cầu
    sửa ở UC08/UC26), ngưỡng ở UC05/UC36 (quy tắc định tuyến UC05), các giá trị thuộc 9 giá trị
    của UC04. Cũng giữ nguyên danh tính người khiếu nại *"as policy allows"* vì thuộc quyết định
    còn mở D5.
  - Không sửa: Report v1, `UCMS_UseCase_Specifications_v2.docx` (cần xuất lại từ `.md`).
  - **Lý do:** mỗi giá trị thêm vào UC04 kéo theo một màn hình, một schema và một đường validate,
    trong khi các giá trị này chưa có nhu cầu đổi thật (D2). Đổi chữ giúp tài liệu hết mâu thuẫn
    với BR42 mà không phải mở rộng phạm vi, và danh sách trong BR42 cho biết giá trị nào là hằng số.

### I36 — Deployment không khởi tạo được
- **Vấn đề:** §VI.2.2 bảo *"add the allowed university e-mail domain to the policy configuration
  after the first sign-in"* và *"The first account signed in must be granted the ICPDP role"*.
  Nhưng UC01 bước 3 chặn mọi e-mail ngoài allowed domain (chưa cấu hình thì không ai vào được), và
  chỉ UC03 cấp role — mà UC03 đòi người thao tác đã có quyền admin.
- **Cách sửa đề xuất:** thêm bước seed: biến môi trường `ALLOWED_DOMAIN` và `BOOTSTRAP_ICPDP_EMAIL`
  (hoặc bản ghi trong `Data.zip`) tạo PolicyVersion đầu tiên và tài khoản ICPDP đầu tiên. Sửa
  §VI.2.2 theo đó.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất (biến môi trường).
  - `Group1_SE1939-NJ_Report_Final_v2.docx` §VI.2.2:
    - Bước 2: thêm *"ALLOWED_DOMAIN (the allowed university e-mail domain) and BOOTSTRAP_ICPDP_EMAIL
      (the e-mail of the first ICPDP Officer)"* vào danh sách biến trong `.env`.
    - Bước 3: *"… and add the allowed university e-mail domain to the policy configuration after the
      first sign-in."* → *"… On its first start against an empty database the server seeds the first
      policy version from ALLOWED_DOMAIN and the first ICPDP account from BOOTSTRAP_ICPDP_EMAIL, so the
      first sign-in is not blocked by the domain check and no one has to hold the ICPDP role beforehand."*
    - Bước cuối: *"sign in with a university Google account. The first account signed in must be granted
      the ICPDP role…"* → *"sign in with the Google account set in BOOTSTRAP_ICPDP_EMAIL, which already
      holds the ICPDP role, and complete the policy and routing configuration (UC04, UC05)."*
  - `SRS.md` dòng *Bí mật* (ràng buộc triển khai): thêm câu về `ALLOWED_DOMAIN` / `BOOTSTRAP_ICPDP_EMAIL`.
  - `05-implementation/TASKS.md`: DB-0.1 thêm 2 biến vào schema cấu hình; DB-0.5 ghi rõ seed ICPDP
    officer và policy version lấy từ 2 biến đó, chạy khi database còn trống.
  - **Lý do:** biến môi trường là cách nhỏ nhất phá vòng lặp "cần domain để đăng nhập, cần đăng nhập để
    cấu hình domain"; seed DB-0.5 vốn đã có ICPDP officer + policy version nên chỉ cần nói rõ nguồn.

### I37 — Report vẫn nói cắt scope sau khi rút BR43
- **Vấn đề:** BR43: *"all use cases now ship in one release"* (I26 đã dọn Model/Spec). Report vẫn
  còn:
  - §III.3.2 đoạn đầu: *"Medium is a loop that can be deferred, and Low is a loop that is cut first
    if scope must be reduced"*.
  - Risk #4: *"Ship by closed loops … If scope must be cut, cut a whole loop in the published order"*.
  - UC42 Low trong khi UC15, UC34 (High) mở case ở UC42.
- **Cách sửa đề xuất:** Priority → thứ tự **build/demo**, không phải thứ tự cắt. Risk #4 response →
  build theo loop khép kín, ưu tiên loop High trước, không cắt UC. Xem lại priority của UC42.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất.
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - §III.3.2 đoạn đầu: *"The priority column reflects the delivery order of the release loops: High is a
      loop that cannot be cut…, Medium is a loop that can be deferred, and Low is a loop that is cut first
      if scope must be reduced."* → *"The priority column reflects the build and demonstration order of the
      release loops: High loops are built and demonstrated first, then Medium, then Low. It is not a cut
      order; all 54 use cases ship in one release."*
    - Table II.4 Risk #4 response: *"Ship by closed loops, not by half-features (§V of the SRS). If scope
      must be cut, cut a whole loop in the published order…"* → *"Build by closed loops, not by
      half-features: finish the High loops first, then Medium and Low, and never leave an entity in a state
      no use case can leave. No use case is cut; all 54 ship in one release."*
  - `SRS.md`: đoạn dẫn bảng P1–P5 *"thứ tự cắt"* → *"thứ tự build và demo … không cắt use case nào"*;
    P1 *"Cắt đi là phá lý do tồn tại"* → *"build trước"*; P2 bỏ *"bị cắt sau cùng"*; P5 *"cắt đầu tiên"* →
    *"build sau cùng"*; §15 đoạn *"Nếu buộc phải cắt phạm vi…"* → *"Không cắt use case nào…"*.
  - `UCMS_UseCase_Model_v2.md` §12: mục *"Nếu buộc phải cắt phạm vi"* → *"Thứ tự build và demo"*.
  - **Không đổi priority của UC42** (vẫn Low): khi priority chỉ là thứ tự build, UC15/UC34 (High) mở case
    ở UC42 vẫn đúng vì cả hai cùng ra một bản; UC42 cần dữ liệu từ nhiều vòng nên build sau là hợp lý.
  - **Lý do:** BR43 đã rút; giữ cột priority nhưng đổi nghĩa là thay đổi nhỏ nhất.

### I38 — Câu diễn giải BR trong bảng UC khác catalogue
- **Vấn đề:** cùng mã BR nhưng mỗi UC diễn giải một kiểu, nhiều câu không phải nghĩa của rule:

  | BR | Catalogue (Table III.6) | Bảng UC ghi |
  |---|---|---|
  | BR05 | Actor/timestamp/reason cho approve/reject | UC02: dashboard read-only; UC09, UC12, UC22: audit; UC30: promotion theo policy |
  | BR07 | Eligibility vị trí lãnh đạo | UC09: template, institutional fields; UC11: quyền từ confirmation; UC19: rubric; UC23: position phải có ở UC09 |
  | BR08 | Quyền mới chỉ có hiệu lực khi transition được confirm | UC12: obligations gắn với club; UC22: phải thay board seat trước |
  | BR09 | Suspended không mở campaign | UC06: Active và Suspended được liệt kê |
  | BR14 | Event public sau Approved | UC06: Dissolved club không liệt kê |
  | BR17 | Capacity | UC27: open/closed suy ra từ window |
  | BR18 | 1 attendance / người / event | UC29: 1 **registration** / người / event |
  | BR23 | Disbursed ≤ approved | UC39: Exception case vẫn close |
  | BR26 | Reconcile trước khi close | UC37: tracking only, không thanh toán |
  | BR29 | Tổng weight hợp lệ | UC44: scheme quyết định dimension; UC45: score giải thích được |
  | BR30 | Published evaluation không sửa | UC43: scheme không sửa; UC44: draft phải qua UC45 |
  | BR31 | ICPDP single authority | UC01, UC02, UC24: chỉ thấy club của mình; UC03: CMB role subordinate; UC23: scoped theo club/term |
  | BR33 | Không overlap booking | UC46: đổi giờ không ảnh hưởng quyết định cũ; UC49: slot trống ngay |
- **Cách sửa đề xuất:** generator lấy nguyên văn định nghĩa từ catalogue cho cột *Rule*. Những ý
  hiện đang "nhét" vào BR mà không có rule tương ứng thì: (a) chuyển vào Summary/Postconditions
  của UC, hoặc (b) thêm BR mới (BR47+) nếu là ràng buộc thật — ví dụ "1 registration / người /
  event", "permission scoped to club and active term", "registration state derived from window",
  "evaluation scheme versioned once used".
- **Xử lý:** 2026-09-26 — chốt **cột Rule ghi nguyên văn catalogue + thêm BR mới** (bảng trước → sau đã được duyệt).
  - **BR mới** (Report Table III.6, SRS §5, Model §11): **BR48** mỗi sinh viên tối đa 1 đăng ký / sự kiện
    (UC29); **BR49** người dùng chỉ thấy và thao tác trên CLB mình có tư cách thành viên hoặc chức vụ trong
    nhiệm kỳ đang hoạt động, ICPDP thấy mọi CLB (UC02, UC23, UC24); **BR50** `Registration Open/Closed`
    suy ra từ registration window, không là state của event (UC27, UC29); **BR51** scheme đánh giá đã dùng
    thì bị khoá, sửa phải tạo version mới (UC43, UC44); **BR52** thành viên giữ ghế ban chủ nhiệm đã xác
    nhận phải được thay qua UC10/UC11 trước khi tư cách thành viên kết thúc (UC21, UC22). Số rule còn hiệu
    lực 46 → 51 (Report §III.5.1, SRS §1).
  - `Group1_SE1939-NJ_Report_Final_v2.docx`, cột *Rule* của bảng UC:
    - **Đổi mã** sang BR mới: UC02 BR31 → BR49; UC22 BR08 → BR52; UC23 BR07 → BR47, BR31 → BR49; UC24 BR31 →
      BR49; UC27 BR17 → BR50; UC29 BR18 → BR48; UC43 BR30 → BR51; UC44 BR29 → BR51.
    - **Thêm dòng:** UC21 BR52; UC29 BR50.
    - **Giữ mã, ghi nguyên văn catalogue:** UC06 BR09, BR14; UC12 BR08; UC22 BR05; UC30 BR05; UC39 BR23; UC44
      BR30.
    - **Xoá dòng** (ý đã có sẵn trong UC hoặc thuộc SE-03): UC02 BR05; UC09 BR05, BR07; UC12 BR05; UC19 BR07;
      UC37 BR26; UC45 BR29; UC46 BR33; UC49 BR33. UC09 không còn BR nào → bảng còn một dòng *"— | No rule of
      Table III.6 applies; changes are audited under SE-03."*
    - **Chuyển ý vào Postconditions:** UC06 thêm *"Active and Suspended clubs are listed, a Suspended club is
      marked and shows no open campaign, and a Dissolved club is not listed."*; UC46 thêm *"changing bookable
      hours never invalidates a decision already taken"*.
    - **Giữ nguyên** các dòng mở rộng nhưng không sai nghĩa: UC04 BR20, UC05 BR31, UC08 BR31, UC21 BR19,
      UC42 BR28, UC48 BR34, UC53 BR38.
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx` (dùng bộ mã cũ, sửa theo cùng ý): UC02 BR31 → BR49;
    UC06 BR09 nguyên văn, `BR-VIS` → BR14, Postconditions thêm câu liệt kê CLB; UC21 thêm BR52; UC22 `BR-SEP`
    → BR52; UC23 `BR-POS` → BR47, `BR-SENS` → BR49; UC24 `BR-SCOPE` → BR49; UC27 thêm BR50; UC29 `BR-DUP` →
    BR48, thêm BR50; UC43 BR30 → BR51; UC44 BR29 → BR51, `BR-DRAFT` → BR30. Các mã cục bộ khác (`BR-DASH`,
    `BR-EFF`…) không phải mã catalogue bị dùng sai nên để nguyên.
  - `UCMS_UseCase_Specification_v2.md`: dòng *Quy tắc nghiệp vụ* của UC02, 06, 12, 21, 22, 23, 24, 27, 29,
    30, 43, 44 thêm mã tương ứng (file này vốn không dùng sai mã, chỉ thiếu mã).
  - `SRS.md`: dòng *Quy tắc* của cùng các UC và bảng truy vết UC → BR; catalogue §5 thêm BR48–BR52.
  - `UCMS_UseCase_Model_v2.md` §11: thêm BR48–BR52.
  - **Lý do:** mỗi mã BR chỉ mang đúng một nghĩa, truy vết BR → UC không còn sai; các ràng buộc thật đang
    "ở nhờ" mã khác (1 đăng ký, phạm vi CLB, registration window, khoá scheme, thay ghế board) có BR riêng.

### I39 — BR14 vs UC27
- **Vấn đề:** BR14 *"An event becomes public only after it is Approved"*; UC27: event Approved chưa
  hiển thị, chỉ `Upcoming` (sau khi publish) mới hiển thị.
- **Cách sửa đề xuất:** BR14 → *"An event becomes public only once it is Approved and published
  (UC27)"*.
- **Xử lý:** 2026-09-26 — chốt **sửa chữ BR14 cho rõ** (theo cách sửa đề xuất).
  - Nhận xét: *"only after it is Approved"* vốn chỉ nói `Approved` là điều kiện **cần**, nên UC27 không vi
    phạm BR14. Nhưng câu dễ đọc thành "Approved ⇒ công khai", nên viết lại cho rõ; nghĩa rule không đổi.
  - `Group1_SE1939-NJ_Report_Final_v2.docx`: Table III.6 BR14 và dòng BR14 trong bảng UC26: *"An event
    becomes public only after it is Approved."* → *"An event becomes public only once it is Approved and
    published (UC27)."* Dòng BR14 của UC27 (*"Only an Approved event can be published."*) giữ nguyên, vẫn
    đúng. Dòng BR14 của UC06 để lại cho I38.
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx` UC26, UC27: *"An event may only be made public after
    it is Approved."* → *"An event may only be made public once it is Approved and published (UC27)."*
  - `SRS.md` catalogue BR14: *"Sự kiện chỉ được công khai sau khi đã `Approved`"* → *"Sự kiện chỉ được công
    khai khi đã `Approved` **và** được công bố ở UC27 (`Upcoming`)"*.
  - `01-business-analysis/UCMS_Business_System_Analysis.md` BR14: sửa tương tự.
  - `UCMS_BR_Issues_Context.md`: dòng BR14 cập nhật trạng thái.
  - Không sửa Model / Spec md: hai file chỉ dẫn mã BR14 ở UC26/UC27, không chép câu rule.
  - **Lý do:** tránh đọc nhầm (ví dụ query UC06 lọc `status = Approved` sẽ lộ sự kiện chưa công bố);
    lifecycle và UC27 đã đúng nên không phải đổi UC.

### I40 — Tham chiếu treo
- **Vấn đề:** UC04 (BR20) *"drive the scheduler in §8.2 of the SRS"*; Risk #4 *"(§V of the
  SRS)"*. Report không có hai mục này (là mục của `SRS.md`).
- **Cách sửa đề xuất:** §8.2 → *"§IV.3.2"* của report; bỏ *"(§V of the SRS)"* (cùng lúc với I37).
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất.
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - UC04 dòng BR20: *"… drive the scheduler in §8.2 of the SRS."* → *"… drive the scheduler described in
      §IV.3.2."*
    - Risk #4: bỏ *"(§V of the SRS)"* (sửa cùng câu ở I37).
  - **Lý do:** §IV.3.2 của report là mục mô tả scheduler; SRS không nằm trong report.

### I41 — Màn hình không có UC
- **Vấn đề:** §III.3.1.3 khẳng định *"no screen exists without a requirement behind it"*, nhưng
  screen 30 *Notification* và 113 *Audit logs* có cột UC là "—".
- **Cần chốt:** thêm UC hay sửa câu khẳng định.
- **Cách sửa đề xuất:** map Notification → UC02 (xem những gì cần hành động); Audit logs → yêu cầu
  phi chức năng SE-03 (ghi "SE-03" ở cột UC) và sửa câu thành *"… without a use case or a
  non-functional requirement behind it"*.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất.
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - Table III.3, screen 30 *Notification*: cột UC *"—"* → *"UC02"*.
    - Table III.3, screen 113 *Audit logs*: cột UC *"—"* → *"SE-03"*.
    - §III.3.1.3: *"… no screen exists without a requirement behind it."* → *"… no screen exists without a
      use case or a non-functional requirement behind it."*
  - **Lý do:** Notification là nơi người dùng thấy việc cần làm (UC02); Audit logs phục vụ yêu cầu phi chức
    năng SE-03, không phải một UC. Không cần thêm UC mới.

### I42 — ApprovalTask và bảng design
- **Vấn đề:** §IV.3.2: *"Six business objects go through submit, review, revise and decide"*
  (establishment, event proposal, budget, booking, complaint, suspension). Nhưng board nomination
  (UC10), transition plan (UC12), post-event report (UC33), periodic report (UC40) cũng tạo "ICPDP
  task". Collection ApprovalTask lại ghi *"every submit-and-decide pair"*. Table IV.3 thiếu
  ApprovalTask ở M03, M07 và thiếu AuditLog ở M04, M07.
- **Cách sửa đề xuất:** liệt kê đủ 10 loại đối tượng dùng ApprovalTask; bổ sung collection còn thiếu
  trong Table IV.3.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất.
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - §IV.3.2: *"Six business objects go through submit, review, revise and decide: the club establishment
      application, the event proposal, the budget request, the property booking, the complaint and the club
      suspension."* → *"Ten business objects go through submit, review and decide, most of them with a revise
      loop: the club establishment application, the board nomination, the transition plan, the club
      suspension request, the event proposal, the post-event report, the budget request, the periodic
      report, the property booking and the complaint."*
    - Table IV.3 cột *Collections written*: M03 thêm `ApprovalTask`; M04 thêm `AuditLog`; M07 thêm
      `ApprovalTask`, `AuditLog`; M12 thêm `ApprovalTask` (complaint nằm trong 10 đối tượng trên).
  - Mô tả collection `ApprovalTask` (*"every submit-and-decide pair"*) giữ nguyên, giờ đã khớp.
  - **Lý do:** 10 đối tượng là các UC tạo "ICPDP task" trong report (UC07, 10, 12, 14, 25, 33, 35, 40, 47,
    52/53).

### I43 — Module M10 biến mất
- **Vấn đề:** Risk #2 nói module M01–M12; các UC dùng M01–M09, M11, M12. M10 không xuất hiện.
- **Cách sửa đề xuất:** nếu M10 là Notification & Audit (các service chung ở §IV.3.2) thì ghi tên
  M10 vào §IV.3.2 và Table IV.3; nếu không có thì đánh số lại.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất (M10 là Notification & Audit, khớp SRS §2 và DBML).
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - Tiêu đề §IV.3.2 (và dòng mục lục): *"Design of the workflow, notification and audit services"* →
      thêm *"(M10)"*.
    - Table IV.3: thêm dòng M10 giữa M07 và M11 — *M10 Workflow, Notification & Audit* · *— (cross-cutting,
      §3.2)* · *approval-routes, notification-routes, audit-routes, approval inbox, notification outbox,
      scheduler, e-mail sender, audit writer* · *ApprovalTask, ApprovalDecision, Notification,
      EmailDeliveryLog, AuditLog*.
  - **Lý do:** SRS, BSA, HLD và DBML đều định nghĩa M10 là module xuyên suốt; report chỉ thiếu tên.

### I44 — Objective #5 và số state diagram
- **Vấn đề:** Objective #5: *"Every one of the 54 use cases … is traceable to a business rule, a
  state machine and at least one test case"*. §III.5.3 chỉ có 8 state diagram; Complaint, Violation,
  Evaluation, Reconciliation, Post-event/Periodic report, Registration, TransitionPlan có state
  trong UC nhưng không có diagram. Một số UC (UC02, UC06, UC24, UC51) không có state nào.
- **Cần chốt:** vẽ thêm diagram hay sửa objective.
- **Cách sửa đề xuất:** sửa objective → *"… traceable to a business rule and at least one test case,
  and every state-changing use case to its entity lifecycle"*; cân nhắc vẽ thêm Complaint và
  Violation vì đó là hai lifecycle dài nhất còn thiếu.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất (sửa objective).
  - `Group1_SE1939-NJ_Report_Final_v2.docx` Table II.2 Objective #5: *"… is traceable to a business rule, a state machine and at least one test
    case."* → *"… is traceable to a business rule and at least one test case, and every use case that
    changes a state is traceable to the lifecycle of its entity."*
  - **Không vẽ thêm** diagram Complaint/Violation (đề xuất chỉ ghi "cân nhắc"); lifecycle của các entity
    đó đã có trong Model §10.
  - **Lý do:** UC02, UC06, UC24, UC51 không đổi trạng thái nên không thể truy tới state machine; sửa câu
    objective là thay đổi nhỏ nhất và đúng thực tế.

### I45 — Member Inactive không vào được workspace để xin rời
- **Vấn đề:** UC22 precondition *"An Active or Inactive membership"*, bước 1 *"opens the membership
  in the member workspace"*. UC24 precondition *"An active membership"*; BR31 (UC24) *"scoped to
  clubs where the caller holds an active membership"*.
- **Cách sửa đề xuất:** UC24 cho cả `Inactive` vào (read-only, chỉ hiện hành động xin rời), hoặc
  UC22 bước 1 mở từ "My membership" (screen 14) thay vì workspace.
- **Xử lý:** 2026-09-26 — theo phương án 1 (UC24 cho cả `Inactive` vào).
  - `Group1_SE1939-NJ_Report_Final_v2.docx` UC24: Preconditions → *"An Active or Inactive membership in that
    club."*; bước 1 system response thêm *"an Inactive membership is marked as inactive this semester and
    keeps the link to UC22"*; E403 → *"The membership ends (Left or Banned). …"*.
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx`: UC22 Preconditions → *"An Active or Inactive
    membership."* (trước đó ghi "An active membership", lệch Report); UC24 sửa giống Report.
  - `UCMS_UseCase_Specification_v2.md` UC24: tiền điều kiện, bước 2, E1 (`Left`/`Banned`), quy tắc nghiệp vụ.
  - `UCMS_UseCase_Model_v2.md` UC24 Quy tắc; `SRS.md` UC24 tiền điều kiện, quy tắc, FR-UC24-08.
  - BR49 giữ nguyên: `Inactive` vẫn là membership trong nhiệm kỳ đang hoạt động.
  - **Lý do:** `Inactive` chỉ là "không tham gia kỳ này" (I25), vẫn là thành viên; chỉ `Left`/`Banned` mới là
    kết thúc membership.

### I46 — Suspension: UC14 vs UC15
- **Vấn đề:** UC14 E409: có event/booking đã duyệt trong kỳ → refuse cho tới khi club tự huỷ qua
  UC28/UC49. UC15 Suspend: tự huỷ *"approved future events and bookings through UC28 and UC49"*.
  §VI.3.5 chỉ nói *"cancels undecided proposals and future bookings"*.
- **Cách sửa đề xuất:** UC14 đổi E409 thành cảnh báo: liệt kê event/booking sẽ bị huỷ nếu ICPDP
  duyệt (đã có ở bước 1). Sửa §VI.3.5 thêm *"approved future events"*.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất.
  - `Group1_SE1939-NJ_Report_Final_v2.docx` UC14 exception: `409 Conflict` → `200 Warning` (cùng mẫu với
    UC49 capacity warning), mô tả *"An approved future event or booking exists. System warns and lists
    them: if UC15 approves the suspension they are cancelled automatically (UC28 A1, UC49 A1); the board
    confirms and submits."*; §VI.3.5 *"cancels undecided proposals and future bookings"* → *"… and approved
    future events and bookings"*.
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx` UC14: sửa giống hệt.
  - `UCMS_UseCase_Specification_v2.md` UC14 E1; `UCMS_UseCase_Model_v2.md` UC14 thêm Ngoại lệ;
    `SRS.md` FR-UC14-03; `TASKS.md` BE-2.10.
  - **Lý do:** UC15 còn được gọi không qua UC14 (ICPDP tự quyết, UC42, chính sách) nên cascade là bắt
    buộc; bắt CMB huỷ tay trước là trùng lặp và mất event oan nếu ICPDP từ chối.

### I47 — Audit sign-in bị từ chối
- **Vấn đề:** SE-03 audit *"including rejected sign-in attempts"*; UC01 E403 (sai domain) *"System
  denies access and creates nothing"*.
- **Cách sửa đề xuất:** UC01 E403 → *"creates no User and no session, and writes an audit record"*.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất.
  - `Group1_SE1939-NJ_Report_Final_v2.docx` UC01 E403: *"… System denies access and creates nothing."* → *"… System denies access, creates no
    User and no session, and writes an audit record of the attempt."*
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx` UC01: sửa giống hệt.
  - `UCMS_UseCase_Specification_v2.md` UC01 E1: *"không tạo gì cả"* → *"không tạo User hay phiên nào, và
    lần thử được ghi audit"*.
  - `UCMS_UseCase_Model_v2.md` UC01 Ngoại lệ: thêm *"không tạo User hay phiên, ghi audit lần thử"*.
  - `SRS.md` FR-UC01-09: sửa theo cùng cách (khớp FR-UC01-13 vốn đã audit mọi lần bị từ chối).
  - **Lý do:** SE-03 và FR-UC01-13 đều đòi audit lần đăng nhập bị từ chối.

### I48 — Trình duyệt được test
- **Vấn đề:** UI-01 đòi hiển thị đúng trên Chrome, Firefox, Safari, Edge; §V.2.1 *"executes … on
  the Google Chrome browser"*, Table V.5 chỉ có Chrome.
- **Cách sửa đề xuất:** thêm smoke test GUI trên Firefox, Safari, Edge vào §V.2.1 và Table V.5, hoặc
  thu hẹp UI-01 về Chrome + Edge.
- **Xử lý:** 2026-09-26 — theo phương án 1 của cách sửa đề xuất (thêm smoke test, không thu hẹp UI-01).
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - §V.2.1: thêm *"To cover UI-01, the GUI test cases are also run as a smoke test on the current releases
      of Firefox, Safari and Edge."*
    - Table V.5 dòng System testing: Tool *"Google Chrome"* → *"Google Chrome; Firefox, Safari, Edge (GUI
      smoke test)"*; Provider *"Google"* → *"Google; Mozilla, Apple, Microsoft"*.
    - Table II.11 dòng Testing: thêm *"Firefox / Safari / Edge (GUI smoke test)"*.
  - **Lý do:** SRS (ràng buộc trình duyệt, NFR-CMP-01) cũng đòi cả 4 trình duyệt, nên giữ UI-01 và bổ sung
    kế hoạch test thay vì hạ yêu cầu.

### I49 — UC20: ai accept/decline offer?
- **Vấn đề:** UC20 trigger *"The candidate accepts the offer, or the club confirms the acceptance"*,
  A2b *"The candidate declines the offer"*. Student không có UC nào để accept/decline.
- **Cần chốt:** có bước candidate xác nhận hay không.
- **Cách sửa đề xuất:** bỏ bước candidate xác nhận: trigger chỉ là CMB confirm; A2b → *"The candidate
  informs the club that they decline"* (CMB ghi nhận). Nếu muốn giữ thì thêm hành động vào UC17.
- **Xử lý:** 2026-09-26 — chốt **bỏ bước ứng viên xác nhận** (theo cách sửa đề xuất).
  - `Group1_SE1939-NJ_Report_Final_v2.docx` (sửa trực tiếp), UC20:
    - Triggers: *"The candidate accepts the offer, or the club confirms the acceptance."* →
      *"The club confirms the acceptance of an accepted candidate."*
    - A2b: *"The candidate declines the offer."* → *"The candidate informs the club that they
      decline; CMB records it."*; system response *"… returns the place to the waitlist."* →
      *"System moves the application to Declined (final); the free place can be filled by promoting
      a waitlisted candidate (UC18)."*
    - Table III.2 dòng UC20 giữ nguyên (không nhắc offer).
    - Figure III.15 (Recruitment application state diagram): thay ảnh bằng bản xuất lại từ
      `UCMS_State_Diagrams.drawio` (trang Recruitment Application, `drawio -x -p 5 -s 2`), đã có `Declined`.
  - `UCMS_UseCase_Specification_v2.md` UC20: sửa kích hoạt và A2 theo cùng cách.
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx` UC20: sửa Triggers và 2b.1 giống hệt Report v2.
  - `UCMS_UseCase_Model_v2.md`: UC20 thêm nhánh `Declined`; §10.4 thêm `Accepted → Declined`.
  - `SRS.md`: UC20 (kích hoạt, thực thể/trạng thái, FR-UC20-04) và §6.4 (sơ đồ + tác nhân).
  - `03-diagrams/UCMS_State_Diagrams.drawio` (trang Recruitment Application): thêm state
    `Declined` + trạng thái cuối, cạnh `UC20 decline` từ `Accepted`.
  - `05-implementation/UCMS_Database_Design.dbml`: enum `recruitmentApplicationState` thêm `Declined`.
  - `05-implementation/TASKS.md` BE-3.6: *"từ chối lời mời"* → *"ghi nhận ứng viên từ chối (`Declined`)"*.
  - Không sửa BSA §15.4 (chỉ ghi luồng chính, cũng không có `Withdrawn`) và Report v1.
  - **Lý do:** actor chính của UC20 là CMB và Student không có UC nào để nhận/từ chối lời mời.
    Để CMB ghi nhận việc từ chối là thay đổi nhỏ nhất; `Declined` lấp chỗ trống trạng thái đích
    mà A2 cũ để hở ("đơn được đóng lại" nhưng không nói trạng thái nào).

### I50 — Precondition trái với alt/exception
- **Vấn đề:**
  - UC32: precondition *"The event is Completed"*, E404 *"The event was cancelled"*.
  - UC34: precondition *"The report is Report Submitted"*, A1a *"No report was filed at all"*.
    UC33/UC34 viết *"The report is Report Submitted"* trong khi `Report Submitted` là state của
    Event (I24).
  - UC49: precondition *"Requested or Approved"*, A2a release cả booking `In Use`.
- **Cách sửa đề xuất:** UC32 bỏ E404 (cancelled không vào được UC này); UC34 chuyển A1a sang
  scheduler/UC41 hoặc đổi trigger; UC33/34 → *"The event is Report Submitted"*; UC49 precondition
  thêm *"or In Use when the cancellation comes from UC15/UC42"*.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất; UC34 chọn phương án **đổi trigger**.
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - UC32 Exceptions: *"404 Not Found — The event was cancelled. System offers nothing to finalize."* →
      *"409 Conflict — A flagged record has neither a correction nor a confirmation with a reason. System
      refuses to finalize until every flagged record is handled."* (mỗi UC trong report đều có ít nhất một
      ngoại lệ, nên thay bằng ngoại lệ thật suy ra từ bước 2 thay vì để bảng trống).
    - UC33 Post Conditions: *"The report is Report Submitted with its preloaded figures frozen…"* → *"The event
      is Report Submitted, the report's preloaded figures are frozen, and an ICPDP task exists."*
    - UC34 Triggers: thêm *"or the report deadline passes with no report filed (1a)"*; Preconditions: *"The
      report is Report Submitted."* → *"The event is Report Submitted, or its report deadline has passed with
      no report filed (1a)."*
    - UC49 Preconditions: thêm *"or In Use when the cancellation comes from UC15 or UC42 (2a)"*.
  - `02-use-cases/UCMS_UseCase_Specifications_v2.docx`: UC32 (410 Gone → 409 Conflict, cùng câu), UC33 Post Conditions, UC34 Triggers/Preconditions
    (tham chiếu 3a), UC49 Preconditions — sửa giống Report.
  - `UCMS_UseCase_Specification_v2.md`: UC32 E1, UC33 Hậu điều kiện, UC34 Kích hoạt + Tiền điều kiện, UC49
    Tiền điều kiện — sửa theo cùng cách.
  - `SRS.md`: FR-UC32-05, UC34 Kích hoạt + Tiền điều kiện, UC49 Tiền điều kiện.
  - **Lý do:** đổi trigger UC34 giữ nguyên A1 (FR-UC34-04 vẫn đúng) mà không phải tạo UC/scheduler job mới.

### I51 — Công cụ quản lý defect
- **Vấn đề:** Table II.11 *"GitHub (tasks, defects)"*; §V.2.3 defect ở Google Sheets, test case ở
  Microsoft Excel (không có trong Table II.11).
- **Cách sửa đề xuất:** chọn một nơi cho defect và sửa cả hai chỗ.
- **Xử lý:** 2026-09-26 — chọn **Google Sheets** cho defect.
  - `Group1_SE1939-NJ_Report_Final_v2.docx` Table II.11:
    - Project management: *"Google Sheets (schedule, tasks), GitHub (tasks, defects)"* → *"Google Sheets
      (schedule, tasks, defects), GitHub (pull requests, code review)"*.
    - Testing: thêm *"Microsoft Excel (test cases)"*.
  - §V.2.3 giữ nguyên.
  - **Lý do:** §V.2.3 đã có mô tả và ảnh chụp Google Sheets / Excel (Figure V.2, V.3); sửa một dòng bảng ít
    hơn sửa cả mục kèm hình.

### I52 — Vai trò Trần Ngọc Huy
- **Vấn đề:** Table I.1, II.8: *"Technical Leader, Full-stack Developer"*; Table V.4: *"Technical
  leader, Tester"*.
- **Cách sửa đề xuất:** thêm Tester vào Table I.1/II.8, hoặc đổi Table V.4.
- **Xử lý:** 2026-09-26 — theo phương án 1 của cách sửa đề xuất.
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - Table I.1 và Table II.8: *"Technical Leader, Full-stack Developer"* → *"Technical Leader, Tester,
      Full-stack Developer"*.
    - Table V.4: *"Technical leader, Tester"* → *"Technical Leader, Tester"*.
  - **Lý do:** Table V.4 giao việc test cụ thể (automated suite, test environment); các thành viên khác đều
    có Tester trong Table I.1.

### I53 — Vị trí MSG12
- **Vấn đề:** MSG12 *"Inline, above the feedback form"*, ngữ cảnh *"respondent count is below the
  configured minimum"* — đó là màn hình tổng hợp của CMB (UC51, screen 62), không phải form của
  student.
- **Cách sửa đề xuất:** vị trí → *"Inline, on the feedback summary (club)"*.
- **Xử lý:** 2026-09-26 — theo cách sửa đề xuất.
  - `Group1_SE1939-NJ_Report_Final_v2.docx` Table III.7 MSG12: *"Inline, above the feedback form"* → *"Inline, on the feedback summary (club)"*.
  - **Lý do:** ngữ cảnh (số người phản hồi dưới ngưỡng) chỉ xuất hiện ở màn tổng hợp của CMB (UC51).

### I54 — Thông tin chưa đầy đủ
- **Vấn đề:** MSSV của Nguyễn Đình Phong, Nguyễn Quang Huy, Trần Ngọc Huy và email của Phong, Quang
  Huy là `[TBD]`; Table I.2 ghi "Le Thanh Hai" (bìa: "Lê Thanh Hải"); Table VI.1 ghi `report.docx`
  thay vì tên file nộp.
- **Cách sửa đề xuất:** điền thông tin, thống nhất tên có dấu, sửa tên file.
- **Xử lý:** 2026-09-26 — **sửa một phần**, phần còn lại cần số liệu thật.
  - `Group1_SE1939-NJ_Report_Final_v2.docx`:
    - Table I.2: *"Le Thanh Hai"* → *"Lê Thanh Hải"* (khớp bìa).
    - Table VI.1: *"report.docx — this document"* → *"Group1_SE1939-NJ_Report_Final_v2.docx — this document"*.
  - **Cần cung cấp:** MSSV của Nguyễn Đình Phong, Nguyễn Quang Huy, Trần Ngọc Huy (bìa) và email của
    Nguyễn Đình Phong, Nguyễn Quang Huy (Table I.1). Nếu tên file nộp cuối khác tên hiện tại thì sửa lại
    Table VI.1.

### I55 — UCD theo actor thiếu «include»
- **Vấn đề:** review lần sau nhận xét sơ đồ "thiếu include". Bản gốc có 5 cạnh `«include»` nhưng
  cả 5 đều sai và đã bị xoá (I09, I11, I28), nên sơ đồ chỉ còn actor nối thẳng tới từng UC kèm mã UC.
- **Cách sửa đã chọn:** gom theo chức năng — actor chỉ nối tới use case nhóm `Manage …`, nhóm
  `«include»` các chức năng con; use case quản lý danh mục tách theo CRUD. Bỏ mã UC trên oval.
- **Xử lý:**
  - Ngày: 2026-09-30
  - File đã sửa: `03-diagrams/UCMS_UseCase_ByActor.drawio` (sinh lại toàn bộ) và 9 ảnh
    `03-diagrams/img/UCMS_UseCase_ByActor_*.png`; quy ước trong `03-diagrams/README.md` và `SRS.md`; `Group1_SE1939-NJ_Report_Final_v2.docx`
    Figure III.2.1–III.2.9 thay ảnh mới, câu dẫn 2.2.1 bỏ *"UC numbers match …"*, thay bằng mô tả
    kiểu `Manage …` «include» chức năng con.
  - Cấu trúc mới (nhóm → chức năng con):
    - Student: Manage club participation → Browse clubs, Submit club application, Apply for
      membership, View member workspace, Request to leave club; Manage event participation →
      Register for event, Check in, Submit event feedback; Submit complaint (nối thẳng).
    - CMB 1: Manage club profile → View club profile, Update club information, Define club structure
      (UC09); Manage board → Nominate board, Plan leadership transition; Request suspension.
    - CMB 2: Manage recruitment campaigns → Create / Update / Publish recruitment campaign (UC16);
      Manage applications → Screen applications, Record candidate evaluation, Onboard members;
      Manage members → View member list, Update membership status (UC21), Assign positions.
    - CMB 3: Manage events → Submit event proposal, Publish event, Cancel / reschedule event, Manage
      waitlist; Manage bookings → Request property booking, Cancel / release booking.
    - CMB 4: Manage event accountability → Finalize attendance, Submit event report, Review event
      feedback; Manage budget → Submit budget request, Record expense; Manage reports & complaints →
      Submit periodic report, Respond to complaint.
    - ICPDP 1: Manage accounts → View accounts, Assign / revoke role, Lock / unlock account (UC03);
      Manage system configuration → Configure policy & deadlines, Configure approval routing; Manage
      club lifecycle → Decide club application, Confirm board, Confirm leadership transition,
      Suspend / reactivate / dissolve club.
    - ICPDP 2: Manage event oversight → Decide event proposal, Close event report; Manage properties
      → Add property, View properties, Update property, Deactivate property (UC46); Manage bookings →
      Decide booking request; Manage budget → Decide budget request, Record disbursement, Reconcile
      budget.
    - ICPDP 3: Manage compliance → Assess periodic report, Triage complaint, Open compliance case,
      Issue case decision, Resolve compliance case (UC42); Manage evaluation → Create / Update /
      Activate evaluation scheme (UC43), Generate evaluation draft, Publish evaluation.
  - Bỏ 2 cạnh `«extend»` ở trang CMB 3 (UC47→UC25, UC49→UC28): nối chéo giữa hai nhóm gây rối
    trong kiểu gom nhóm; quan hệ vẫn ghi ở luồng thay thế và Related UC của Spec. Oval nhóm không
    in đậm, cùng kiểu với oval con.
  - Bỏ: association CMB — Check in (vai trò hỗ trợ) và các node mượn "(see ICPDP n)".
  - Lý do: theo lựa chọn của nhóm (kiểu gom chức năng, CRUD được include). Model/Spec vẫn giữ
    UC01–UC54; các chức năng con CRUD là bước trong luồng chính của UC tương ứng.

### I56 — Context diagram quá nhiều chữ, vừa thiếu vừa thừa
- **Vấn đề:** review nhận xét CD v2 "quá nhiều chữ, vừa thiếu vừa thừa". Đối chiếu thì thấy:
  - **Thừa:** 57 luồng, gần như mỗi UC một luồng. 10 hồ sơ bị vẽ hai lần (CMB → hệ thống, rồi hệ
    thống → ICPDP). Nhiều nhãn là hành động chứ không phải dữ liệu (`Member management`,
    `Event publishment`, `Send email request`).
  - **Thiếu:** Student chỉ có 3 luồng ra, không nhận kết quả đăng ký sự kiện hay kết quả khiếu
    nại. CMB không nhận thông báo vi phạm, kết quả giải ngân hay danh sách đăng ký sự kiện. ICPDP
    không nhận số liệu nào. Cloudinary có trên sơ đồ nhưng thiếu trong Model §3 và §15.
- **Xử lý:**
  - Ngày: 2026-09-30
  - File đã sửa: `03-diagrams/UCMS_Context_Diagram_v2.1.drawio` (mới) và
    `03-diagrams/img/UCMS_Context_Diagram_v2.1_01_Context-diagram-v2.1.png`; `03-diagrams/README.md`,
    `../README.md`; Model (dòng dẫn đầu file, §3, §15); `SRS.md` (bảng tổng quan, R5, §2.1, §2.3
    ES1–ES3, §14.4, danh mục sơ đồ); Report §III.1 (đoạn mô tả và Figure III.1, hình xoay ngang).
  - Thay đổi: 57 luồng → 35 luồng (Student 4 vào / 4 ra, CMB 7 / 5, ICPDP 6 / 4, OAuth 2, SMTP 1,
    Cloudinary 2). Mỗi luồng là một nhóm dữ liệu và có một mũi tên thẳng riêng. Các hồ sơ gửi lên
    ICPDP gộp thành `Submissions for review`, các quyết định gộp thành `Review decisions`. Nhãn
    đổi sang danh từ dữ liệu (`Send email request` → `Email message`, `Image upload` → `Image
    file`, `Authentication data` → `Identity data`). Thêm các luồng còn thiếu: `Complaint
    outcome` (→ Student), `Violation notices & evaluation results`, `Review decisions &
    disbursements`, `Member applications & event registrations` (→ CMB), `Club statistics &
    evaluation draft` và `Internal event records` (→ ICPDP, xem I57).
  - Lý do: context diagram (DFD mức 0) thể hiện dữ liệu đi qua biên hệ thống ở mức nhóm; chi tiết
    theo từng UC đã có ở use case diagram và ở bảng ánh xạ Model §15 / SRS §14.4. CD v2 giữ lại
    làm lịch sử.

### I57 — Sự kiện nội bộ không được ghi nhận trong hệ thống
- **Vấn đề:** mọi sự kiện đều đi UC25 → UC26 (ICPDP duyệt) → UC27. FR-UC27-04 đã có khái niệm
  "sự kiện nội bộ" (chỉ thành viên CLB) nhưng nó vẫn phải xin duyệt. Kết quả là một buổi sinh hoạt
  nhỏ hoặc phải qua ICPDP, hoặc nằm ngoài hệ thống, và ICPDP không thấy CLB có hoạt động.
- **Cách sửa đã chọn:** phương án A — thêm phạm vi `Public` / `Internal` vào UC25. Nhóm yêu cầu
  ICPDP phải xem được các sự kiện này.
- **Xử lý:**
  - Ngày: 2026-09-30
  - File đã sửa: `SRS.md` (UC02, UC25 FR-14…16, UC26 FR-12, UC27 FR-04, UC28 FR-02, UC32 FR-08,
    UC33 FR-10, BR53, §6.6, §7.2, AUD-03, §10.1, §14.2); Model (UC02, UC25–UC28, UC32, UC33, §10.5,
    bảng BR); Spec (UC02, UC25 A4, UC26, UC27 A1, UC28, UC32 A2, UC33); `UCMS_BR_Issues_Context.md`;
    `03-diagrams/UCMS_State_Diagrams.drawio` trang Event và ảnh `UCMS_State_Diagrams_06_Event.png`;
    `05-implementation/UCMS_Database_Design.dbml` (`events.audienceScope`, index `ix_events_scope`);
    Report (UC02 bước 3, UC25 alt 4c.1 và BR53, UC32 alt 3b.1 và BR53, catalogue BR, Figure III.16).
  - Thay đổi — **BR53 (mới):** sự kiện `Internal` không có dự toán ngân sách được **ghi nhận**
    chứ không xin duyệt: UC25 chuyển thẳng `Draft → Approved`, không tạo review task, ghi audit
    `RECORD_INTERNAL`; ICPDP xem mọi sự kiện như vậy trên dashboard UC02 (lọc theo CLB và học kỳ,
    xem chi tiết và điểm danh, chỉ đọc). Sự kiện không cần báo cáo sau sự kiện, và đóng
    `Completed → Closed` khi chốt điểm danh ở UC32. Sự kiện `Internal` có dự toán ngân sách vẫn đi
    UC26; booking đính kèm luôn do UC48 quyết định (BR35). BR10, BR15, BR21, BR44, BR45 vẫn áp
    dụng. Đổi lịch sự kiện nội bộ chỉ ghi nhận lại, không quay về UC26. ICPDP xử lý sai phạm qua
    UC42 như mọi sự kiện.
  - Lý do: giữ được luồng duyệt cho mọi thứ tốn tiền hoặc chiếm cơ sở vật chất của trường, đồng
    thời ghi lại hoạt động nội bộ bằng dữ liệu điểm danh (UC29–UC32) sẵn có, không thêm thực thể
    mới. Bỏ nghĩa vụ báo cáo vì một buổi sinh hoạt nội bộ không có gì để ICPDP thẩm định; bộ điểm
    danh đã chốt chính là bản ghi hoạt động.

### I58 — CMB không phân biệt Chủ nhiệm với thành viên, không có cấu hình role và permission
- **Vấn đề:** CMB là một actor chung cho cả ban chủ nhiệm lẫn thành viên được giao việc. Chủ
  nhiệm không có cách tạo role cho CLB hay quyết định mỗi role làm được gì: UC09 định nghĩa chức
  vụ, UC23 chỉ gán chức vụ có sẵn, quyền của chức vụ không được cấu hình ở use case nào, và chức
  vụ "nhạy cảm" phải đưa qua ICPDP xác nhận (UC23 A1).
- **Cách sửa đã chọn** (nhóm chốt 2026-09-30):
  1. Club Member là actor gốc cho việc vận hành CLB, chỉ làm được khi role có permission; Club
     Leader kế thừa Club Member.
  2. Club Leader là người giữ ghế Chủ nhiệm đã được ICPDP xác nhận (UC11 / UC13); leader không
     uỷ quyền quản lý role cho người khác.
  3. Leader cấp permission từ danh mục cố định, trừ bốn quyền giữ riêng của leader.
  4. Role nội bộ và việc gán role có hiệu lực ngay, không cần ICPDP; chỉ ghế ban chủ nhiệm vẫn qua
     UC10 / UC11. Bỏ cờ "chức vụ nhạy cảm".
- **Xử lý:**
  - Ngày: 2026-09-30
  - File đã sửa: `SRS.md` (§2.3 actor, mô hình RBAC và danh mục permission, trường actor của các
    UC, UC09, UC23, BR); Model (§2 tổng số actor, §3, §4, §6 dòng Actor của mọi UC phía CLB, UC09,
    UC22–UC24, UC31, §9, §11 BR47 / BR54 / BR55, §15); Spec (bảng tổng hợp, dòng Actor chính, ngoại
    lệ và quy tắc BR54 của 19 UC vận hành, UC09, UC22, UC23 viết lại, UC24, UC31, ghi chú đầu
    tài liệu); `UCMS_BR_Issues_Context.md`; `05-implementation/UCMS_Database_Design.dbml`
    (`clubPositions`, `permissions`); `03-diagrams/UCMS_UseCase_ByActor.drawio` các trang phía CLB
    và ảnh PNG; `03-diagrams/UCMS_Context_Diagram_v2.1.drawio` và ảnh PNG; `03-diagrams/README.md`;
    Report (actor, bảng UC, UC23, catalogue BR, các hình UCD và context diagram).
  - Thay đổi:
    - Actor: Student ◁ Club Member ◁ Club Leader. Club Member làm UC22, UC24 và 19 UC vận hành
      khi có permission (`club.profile.manage`, `club.recruitment.manage`,
      `club.application.review`, `club.member.manage`, `club.event.manage`,
      `club.attendance.manage`, `club.report.submit`, `club.budget.request`, `club.expense.record`,
      `club.booking.manage`, `club.feedback.view`, `club.complaint.respond`). Club Leader có mọi
      permission và giữ riêng UC10, UC12, UC14, UC23. "CMB" được giữ làm tên gọi chung của phía CLB
      trong câu văn.
    - UC23 "Phân công chức vụ trong CLB" → "Quản lý vai trò CLB và phân quyền": tạo / sửa / ngừng
      dùng role, cấu hình permission, gán / thu hồi thành viên; bỏ A1 chức vụ nhạy cảm; thêm bộ role
      mặc định và ghế ban chủ nhiệm (chỉ cấu hình permission, người giữ đến từ UC10 / UC11). UC09
      chỉ còn hồ sơ và ban / bộ phận.
    - BR47 sửa: quyền trong CLB đến từ ghế Chủ nhiệm (Club Leader), ghế tạm của người đứng đơn,
      ghế ban chủ nhiệm khác hoặc role gán ở UC23. BR54 mới: kiểm tra permission ở mọi UC vận
      hành. BR55 mới: danh mục permission cố định, quyền giữ riêng của leader, role có hiệu lực
      ngay.
    - Context diagram v2.1: CMB tách thành Club Member (13 luồng) và Club Leader (3 luồng, thêm
      `Club roles & permissions` và `Leadership & club status decisions`); `Leave request` và
      `Member workspace` chuyển từ Student sang Club Member. Tổng 39 luồng.
  - Lý do: đúng cách CLB thật sự vận hành — Chủ nhiệm chịu trách nhiệm trước nhà trường và tự phân
    việc trong CLB. Giữ ICPDP ở vòng xác nhận ban chủ nhiệm, còn phân quyền nội bộ để CLB tự làm,
    có audit để ICPDP theo dõi. Giữ "CMB" làm tên gọi chung để không phải viết lại hàng trăm câu
    văn chỉ nói về "phía CLB".
  - **Cập nhật lần 2 (2026-09-30).** Nhóm bổ sung: ICPDP phải theo dõi được CLB có những role nào,
    việc chuyển giao, và lịch sử ban điều hành. Bốn quyết định:
    1. Cơ cấu role + permission được khai báo trong hồ sơ thành lập UC07; ICPDP thẩm định cùng hồ
       sơ ở UC08; khi duyệt, cơ cấu thành phiên bản 1 của CLB.
    2. Chủ nhiệm tự đánh dấu role nào thuộc ban điều hành (ví dụ Phó chủ nhiệm, Trưởng ban A,
       Trưởng ban B); người giữ các role này đi qua UC10 / UC11 và thay qua chuyển giao UC12 / UC13
       → có lịch sử ban điều hành theo nhiệm kỳ.
    3. Sau khi thành lập, leader sửa cơ cấu tự do ở UC23, mỗi lần sửa là một phiên bản mới có ngày
       hiệu lực; thêm / bỏ role ban điều hành chỉ đi qua UC12 / UC13.
    4. Role Members là role mặc định, không xoá được, tự gán cho mọi thành viên ở UC20; chủ nhiệm
       chọn permission cho nó (mặc định không có). Role Chủ nhiệm cố định trong mọi cơ cấu.
    - File đã sửa: `SRS.md`; `05-implementation/UCMS_Database_Design.dbml` (`proposedRoleStructure`
      trong hồ sơ, bảng mới `clubRoleStructureVersions`, cờ `isDefaultMemberRole` / `isLeaderRole`
      của `clubPositions`); Model (UC02, UC07, UC08, UC10–UC13, UC20–UC23, bảng BR, §15); Spec
      (UC02, UC07, UC08, UC10–UC13, UC20–UC23); `UCMS_BR_Issues_Context.md`;
      `03-diagrams/UCMS_UseCase_ByActor.drawio` trang Student, Club Leader, ICPDP 1 và ảnh PNG;
      `03-diagrams/UCMS_Context_Diagram_v2.1.drawio` và ảnh PNG (40 luồng); Report (UC07, UC08,
      UC09, UC10, UC12, UC13, UC20, UC23, catalogue BR, các hình).
    - Thay đổi: UC07 thêm phần "cơ cấu tổ chức dự kiến" (role, ban điều hành, permission) và ngoại
      lệ E4; UC08 thẩm định cả cơ cấu và tạo phiên bản cơ cấu 1 khi duyệt; UC10 đề cử theo các role
      ban điều hành của cơ cấu đang hiệu lực; UC11 / UC13 ghi lịch sử ban điều hành; UC12 A2 cho
      phép đổi danh sách role ban điều hành, có hiệu lực khi UC13 xác nhận; UC20 tự gán role
      Members; UC21 / UC22 thu hồi mọi role khi tư cách thành viên kết thúc; UC23 tạo phiên bản cơ
      cấu mới ở mỗi thay đổi, A3 (cơ cấu ban đầu từ UC07 / UC08) thay cho bộ role mặc định của
      trường, thêm A5 xem lịch sử, E6 (đổi role ban điều hành phải qua chuyển giao), E7 (bảo vệ role
      Chủ nhiệm và Members); UC02 cho ICPDP và Club Leader xem phiên bản cơ cấu và lịch sử ban
      điều hành. BR55 sửa; BR56 mới (55 quy tắc còn hiệu lực, BR01–BR56). Context diagram thêm
      luồng `Club role structure & board history` (hệ thống → ICPDP), tổng 40 luồng.
    - Lý do: cơ cấu là thứ ICPDP cần nhìn thấy để theo dõi ban điều hành, nên nó được thẩm định
      ngay từ hồ sơ thành lập và lưu thành phiên bản thay vì ghi đè; chỉ role ban điều hành đi qua
      ICPDP, còn phân quyền hằng ngày vẫn để CLB tự làm.

### I59 — Ngân sách tách rời đề xuất sự kiện
- **Vấn đề:** tài liệu mô hình ngân sách thành một luồng riêng: UC35 *Gửi yêu cầu ngân sách* (có
  thể gắn với sự kiện, kế hoạch học kỳ hoặc hoạt động đã duyệt), UC36 *Thẩm định và quyết định yêu
  cầu ngân sách*, máy trạng thái Budget Request riêng, và permission `club.budget.request` (I58).
  Nhóm đã thống nhất rằng ngân sách nằm trong đề xuất sự kiện, và không có ngân sách nào không gắn
  với sự kiện; quyết định đó chưa từng được ghi vào tài liệu.
- **Cách sửa đã chọn (2026-09-30):** bỏ hẳn UC35, UC36; gộp vào UC25 / UC26; đánh số lại use case.
- **Xử lý:**
  - Ngày: 2026-09-30
  - File đã sửa (giai đoạn 1, vẫn dùng số UC cũ): `SRS.md`, Model, Spec, `UCMS_BR_Issues_Context.md`,
    `05-implementation/UCMS_Database_Design.dbml`, `05-implementation/TASKS.md`,
    `04-design/UCMS_High_Level_Design.md`; sơ đồ (CD v2.1, UCD trang Club Member 3 và ICPDP 2, state
    diagram trang Budget Request → Event Budget) và Report do phần sơ đồ / report xử lý.
  - Thay đổi:
    - **UC25** có **phần ngân sách** tuỳ chọn (các dòng: hạng mục, số tiền, mục đích, khoản chi dự
      kiến; tổng số tiền xin), đóng băng theo bản sửa của đề xuất. Đây là cách duy nhất để xin kinh phí.
    - **UC26** thẩm định luôn phần ngân sách (điều kiện, hạn mức còn lại, trùng lặp — nội dung cũ
      của UC36); khi duyệt, officer chốt số tiền duyệt theo từng dòng (có thể thấp hơn, kèm lý do)
      và hệ thống tạo `EventBudget` ở `Approved`. Ngân sách vượt ngưỡng đi cấp ICPDP thứ hai (BR16).
    - **UC37 / UC38 / UC39** (giải ngân, khoản chi, đối soát) làm việc trên `EventBudget` của sự
      kiện. **UC28** huỷ sự kiện → `EventBudget` chưa giải ngân chuyển `Cancelled`.
    - Máy trạng thái **Budget Request → Event Budget**: `Approved → Disbursed → Reconciliation
      Pending → Reconciled | Exception → Closed`, cộng `Approved → Cancelled`; các trạng thái nháp /
      chờ duyệt / sửa / từ chối nay là trạng thái của `Event`.
    - **BR22** viết lại: ngân sách chỉ tồn tại như một phần của đề xuất sự kiện. BR05, BR16, BR31,
      BR54 bỏ UC36 / UC35 khỏi danh sách; BR26, BR53 đổi chữ.
    - Bỏ permission `club.budget.request`: danh mục còn **15 permission** (11 cấp được + 4 giữ
      riêng leader); việc xin ngân sách nằm trong `club.event.manage`.
    - DBML: `budgetRequests` → `eventBudgets` (unique `eventId`), bỏ `budgetRequestVersions`,
      `eventProposalVersions` thêm `budgetLines` và `requestedBudgetTotal`, bỏ `events.budgetEstimate`,
      các khoá ngoại tài chính đổi sang `eventBudgetId`, enum `eventBudgetState`.
    - Context diagram vẫn 40 luồng: `Budget requests & expenses` → `Expenses`.
    - Tổng use case **54 → 52**.
  - **Đánh số lại (giai đoạn 2, đã chạy 2026-09-30 trên SRS, Model, Spec, DBML, TASKS, README, State diagram và Report; tracker, BR_Issues_Context, BSA và các bảng / câu nói về v1 giữ số cũ):** UC01–UC34 giữ nguyên; UC35, UC36 bị bỏ; UC37→UC35, UC38→UC36, UC39→UC37, UC40→UC38, UC41→UC39, UC42→UC40, UC43→UC41, UC44→UC42, UC45→UC43, UC46→UC44, UC47→UC45, UC48→UC46, UC49→UC47, UC50→UC48, UC51→UC49, UC52→UC50, UC53→UC51, UC54→UC52. Các bảng
    ánh xạ v1 → v2 trong Model và các issue I01–I58 giữ số UC của thời điểm đó.
  - Lý do: đúng với quy trình thật — CLB chỉ xin kinh phí cho một sự kiện cụ thể, và ICPDP quyết
    định kinh phí cùng lúc với việc cho phép tổ chức; tách hai luồng làm ICPDP phải thẩm định hai
    lần cùng một sự kiện và cho phép ngân sách "treo" không gắn với hoạt động nào.

### I60 — Luồng tiền của sự kiện thiếu quyết toán và thu hồi
- **Vấn đề:** nhóm muốn tiền đi theo luồng: CLB xin tiền trong đề xuất; ICPDP tạm ứng trước một
  phần hoặc toàn bộ; sau sự kiện CLB phải sao kê đầy đủ, nếu không thì bị thu hồi phần không đúng.
  Tài liệu mới đáp ứng được hai bước đầu (UC25 / UC26, UC35 A1):
  - không có bước CLB nộp quyết toán, cũng không có hạn quyết toán — UC36 chỉ ghi từng khoản chi
    lẻ, còn UC37 do ICPDP tự mở;
  - không có cơ chế thu hồi: `Exception` chỉ ghi lại phần chênh lệch rồi vẫn `Closed`; không có
    số phải hoàn, không ghi nhận được tiền hoàn, và không có hậu quả khi CLB không hoàn;
  - không phân biệt tạm ứng với cấp bù; phần duyệt nhưng chưa cấp không có đường xử lý.
- **Cách sửa đã chọn (2026-09-30):** quyết toán là một bước riêng trong UC36 (không gộp vào báo
  cáo UC33); thu hồi có trạng thái riêng và ICPDP ghi nhận tiền hoàn; phần chi hợp lệ vượt số
  tạm ứng được cấp bù sau đối soát (trần là số duyệt).
- **Xử lý:**
  - Ngày: 2026-09-30
  - File đã sửa: Model (UC25, UC28, UC35–UC37, §10.6, §11 BR21/BR23/BR26/BR42/BR57/BR58, danh
    sách UC), Spec (UC04, UC25, UC28, UC35–UC37, danh sách UC), `SRS.md` (§1 luồng, trách nhiệm
    Club Member, FR-UC02-02, bảng UC04, FR-UC25-10, FR-UC28-05, UC35–UC37, §5 BR, hằng số BR42,
    §6.7, §7 entity, AC13, ma trận truy vết, glossary, endpoint M07),
    `05-implementation/UCMS_Database_Design.dbml`, `05-implementation/TASKS.md`,
    `03-diagrams/UCMS_State_Diagrams.drawio` (trang Event Budget + PNG),
    `03-diagrams/UCMS_UseCase_ByActor.drawio` (trang Club Member 3 + PNG), `UCMS_BR_Issues_Context.md`.
  - Thay đổi:
    - Máy trạng thái `EventBudget`: `Approved → Disbursed → Reconciliation Pending → Reconciled |
      Exception → Closed` → `Approved → Disbursed → Settlement Submitted → Reconciled | Recovery
      Pending → Closed`, `Settlement Submitted ⇄ Reconciliation Pending`, `Disbursed /
      Reconciliation Pending → Recovery Pending` khi quá hạn quyết toán. Bỏ `Exception`.
    - **UC35** ghi mọi dòng tiền (`Advance`, `TopUp`, `Refund`): tạm ứng trước sự kiện (một phần
      hoặc toàn bộ), A2 cấp bù → `Closed`, A3 ghi nhận CLB hoàn đủ → `Closed`.
    - **UC36** "Ghi nhận khoản chi kèm chứng từ" → "Ghi nhận khoản chi và nộp quyết toán": sau khi
      sự kiện kết thúc hoặc bị huỷ, CLB nộp quyết toán → `Settlement Submitted`, khoá bộ khoản chi;
      A3 nộp lại; nộp trễ bị đánh dấu và đi vào BR21.
    - **UC37** officer chấp nhận / loại từng khoản chi → chi hợp lệ; chênh lệch tất toán = chi hợp
      lệ (trần số duyệt) − đã tạm ứng: 0 → đóng, dương → chờ cấp bù, âm → `Recovery Pending` với
      số phải hoàn. A2 quá hạn quyết toán: chốt trên khoản đã có chứng từ. E2 quá hạn hoàn trả →
      BR21 + hồ sơ UC40.
    - **BR21** mở rộng: nghĩa vụ quá hạn gồm báo cáo, quyết toán, hoàn trả (UC25 E2 đổi theo).
      **BR23** tính cả cấp bù. **BR26** ngân sách chỉ đóng khi chênh lệch đã tất toán. **BR57**
      (mới) nghĩa vụ và hạn quyết toán. **BR58** (mới) thu hồi và hạn hoàn trả. 57 BR còn hiệu lực.
    - Hạn quyết toán và hạn hoàn trả là **hằng số trong tài liệu chính sách** (thêm vào danh sách
      của BR42), không thêm giá trị cấu hình ở UC04 — giữ quyết định 9 giá trị của I35.
    - UC28: huỷ sự kiện đã tạm ứng → quyết toán ở UC36, phần chưa chi bị thu hồi ở UC37.
    - DBML: enum `eventBudgetState` (bỏ `Exception`, thêm `Settlement Submitted`, `Recovery
      Pending`), enum mới `budgetFlowKind`, `expenseReviewOutcome`; `eventBudgets` thêm hạn / thời
      điểm quyết toán, `acceptedTotal`, `settlementBalance`, `recoveryAmount`, `recoveryDueAt`,
      `refundedTotal`; `budgetDisbursements.kind`; `expenses.reviewOutcome`; `financialReconciliations`
      bỏ `variance`/`discrepancyNote`, thêm `acceptedTotal`, `settlementBalance`, `isOverdueSettlement`.
    - SRS §14 endpoint M07 còn sót `/budget-requests` từ trước I59 → đổi sang `/event-budgets`.
  - Lần 2 (cùng ngày): `03-diagrams/UCMS_ERD.drawio` — `BudgetRequest` / `BudgetRequestVersion`
    (sót từ I59) → `EventBudget` (clubId, eventId, approvedByDecisionId, state), mọi `budgetRequestId`
    → `eventBudgetId`; thêm `ClubRoleStructureVersion` (sót từ I58); ERD khớp 50 collection của DBML.
    Report `Group1_SE1939-NJ_Report_Final_v2.docx`: tiêu đề và bảng spec UC35–UC37 (thêm luồng
    thay thế, ngoại lệ, BR57 / BR58), danh sách UC (Table 14), danh sách màn hình (Table 15, 16),
    UC02 / UC25 / UC40, bảng BR (BR21, BR23, BR26, BR42, thêm BR57, BR58; "51 rules in force" → 57),
    bảng collection và package M07 (bỏ `BudgetRequest`), hai đoạn "Manage money" / "Decide money";
    thay hình III.2.6 (UCD Club Member 3), III.17 (Event Budget) và IV.4 (ERD).
  - Lý do: tạm ứng mà không có nghĩa vụ quyết toán và cơ chế thu hồi thì nhà trường không đòi lại
    được phần tiền không được chứng minh; `Exception` hợp thức hoá chính phần chênh lệch đó.

### I61 — Sự kiện cấp trường do ICPDP chủ trì và cơ chế mời CLB tham gia
- **Vấn đề:** toàn bộ sự kiện hiện tại đều do CLB tự đề xuất qua UC25, ICPDP chỉ duyệt (UC26).
  Thực tế nhà trường/ICPDP thường xuyên chủ trì các sự kiện lớn cấp trường (Ngày hội CLB - Club Day,
  Lễ vinh danh, Hội thao, Workshop tập huấn) và mời các CLB tham gia (dựng gian hàng, cử tiết mục,
  cử đại biểu). Hiện hệ thống chưa có Use Case cho ICPDP tự tạo sự kiện và gửi lời mời, cũng như
  chưa có chức năng cho CLB phản hồi (chấp nhận/từ chối) lời mời này.
- **Cách sửa đã chọn (2026-10-07):**
  1. Thêm **UC53** *Tạo sự kiện cấp trường và mời câu lạc bộ tham gia*: Actor là `ICPDP Officer`. Sự kiện
     do ICPDP tạo có `organizerType = 'ICPDP'`, không gắn với một CLB cụ thể (`clubId` null), được công
     bố trực tiếp hoặc lên lịch, và cho phép gửi lời mời (`EventInvitation`) tới danh sách các CLB đang `Active`.
  2. Thêm **UC54** *Phản hồi lời mời tham gia sự kiện*: Actor là `Club Member` có permission `club.event.manage`
     hoặc `Club Leader`. CLB xem chi tiết lời mời, quyết định `Accepted` (kèm thông tin gian hàng/tiết mục/đại diện)
     hoặc `Declined` (kèm lý do) trước hạn chót (`deadline`).
  3. Bổ sung **BR59** (mới): Quy tắc sự kiện cấp trường và thời hạn phản hồi lời mời; lời mời quá hạn tự động `Expired`.
     ICPDP có thể thu hồi lời mời (`Withdrawn`) trước khi CLB phản hồi.
  4. Máy trạng thái `EventInvitation`: `Pending → Accepted | Declined | Expired | Withdrawn`.
  5. Cập nhật thực thể `Event` (`organizerType`, `clubId` nullable), thêm collection `eventInvitations`
     vào Module M05. Tổng số use case tăng từ 52 lên **54 use cases (UC01–UC54)**; 58 quy tắc nghiệp vụ còn hiệu lực.
- **Xử lý:**
  - Ngày: 2026-10-07
  - File đã sửa: `SRS.md`, `02-use-cases/UCMS_Review_Issues.md`, `05-implementation/UCMS_Database_Design.dbml`,
    `05-implementation/TASKS.md`, `04-design/UCMS_High_Level_Design.md`, `README.md`,
    `03-diagrams/UCMS_Context_Diagram_v2.1.drawio`, `03-diagrams/README.md`.
  - Thay đổi trên Context Diagram: Bổ sung 4 luồng dữ liệu mới (`f40` ICPDP → Sys: `University events & invitations`, `f41` Sys → ICPDP: `Event invitation responses`, `f42` Sys → Club Member: `Event invitations`, `f43` Club Member → Sys: `Event invitation response`), nâng tổng số luồng từ 40 lên **44 luồng dữ liệu**, bố cục căn chỉnh hình học đối xứng chuẩn xác.

