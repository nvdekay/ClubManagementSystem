# UCMS — Theo dõi các lỗi review Use Case

Đối chiếu 4 tài liệu:

- [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md) — gọi tắt **Model**
- [`UCMS_UseCase_Specification_v2.md`](UCMS_UseCase_Specification_v2.md) — gọi tắt **Spec**
- [`diagrams/UCMS_UseCase_ByActor.drawio`](diagrams/UCMS_UseCase_ByActor.drawio) — gọi tắt **UCD** (use case diagram)
- [`diagrams/UCMS_Context_Diagram.drawio`](diagrams/UCMS_Context_Diagram.drawio) — gọi tắt **CD** (context diagram).
  Từ I15–I20 trở đi, CD hiện hành là [`diagrams/UCMS_Context_Diagram_v2.drawio`](diagrams/UCMS_Context_Diagram_v2.drawio)

Ký hiệu `§N` là mục số N của tài liệu đó (heading `## N. ...`). Ví dụ: **Model §9** là mục
`## 9. Actor → use case matrix` trong `UCMS_UseCase_Model_v2.md`.

Ngày review: 2026-09-23.

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
| I21 | 🟡 | UC Phase 1 phụ thuộc UC23 (Phase 2), vi phạm BR43 | Model/Spec UC09, UC21; phụ lục Spec | Chưa xử lý | — |
| I22 | 🟢 | UC06 tự mâu thuẫn: "chỉ liệt kê club Active" nhưng "club Suspended vẫn hiển thị" | Model/Spec UC06 | Chưa xử lý | — |
| I23 | 🟡 | Trạng thái `Open for Registration` sai nghĩa khi đã hết hạn đăng ký hoặc event không cần đăng ký | Model §10.5, UC27; Spec UC27, UC28, UC29, UC30, UC15 | Đã sửa | Đổi thành `Upcoming`; trạng thái đăng ký tính từ registration window |
| I24 | 🟢 | Model §10.5 thiếu chuyển trạng thái khi UC34 trả báo cáo để sửa | Model §10.5, Spec UC34 | Đã sửa | Thêm `Report Submitted → Completed` (UC34); Spec UC34 ghi rõ event về `Completed` |
| I25 | 🟡 | Trạng thái membership `Ended` gộp chung tự rời và bị loại; `On Leave` trùng nghĩa `Inactive` | Model UC21, Spec UC21/UC22, sơ đồ trạng thái Membership | Đã sửa | Đổi thành `Active` ⇄ `Inactive` → `Left` (UC22 được chấp nhận) / `Banned` (CMB buộc rời); BR46 chặn `Banned` quay lại; UC21 A2 thành đăng ký lại thành viên mỗi kỳ |
| I26 | 🟡 | Khung Phase 1/2 lỗi thời: mọi UC ra cùng lúc nhưng tài liệu vẫn chia phase và dựa vào đó để hoãn hành vi | Model §4–§8, §10.7–10.11, BR16/BR42/BR43, §12, §13, D2; Spec phần đầu, bảng UC, UC04/UC08/UC26/UC36/UC37/UC49, cuối Spec | Đã sửa | Xóa mọi nhãn Phase; giữ duyệt đa cấp qua UC05 (BR16 có hiệu lực); BR43 rút lại; §12 thành Release scope; §13 coverage đầy đủ |
| I27 | 🟡 | `«extend»` trên trang Student vẽ điều hướng giao diện (UC17/UC29 → UC06; UC22/UC29/UC31/UC50 → UC24) | UCD Student, Spec UC24 | Đã sửa | Xoá 6 cạnh «extend»; Student chỉ còn association tới 9 UC; Spec UC24 bước 3 ghi rõ là điều hướng; huỷ cách sửa của I12 |
| I28 | 🟡 | `«extend»` vẽ cascade hệ thống: `UC28 / UC49 → UC15`, `UC42 → UC49`; UC của ICPDP mượn sang trang CMB 3 | UCD CMB 3, ICPDP 1, ICPDP 3; Spec UC15 | Đã sửa | Xoá 3 loại cạnh và các node mượn; cascade ghi ở Postconditions UC15 (Spec UC28 A1, UC49 A1 đã có); giữ `UC47 «extend» UC25`, `UC49 «extend» UC28` |
| I29 | 🟢 | Trang All users: nhãn Google OAuth hiện nguyên `<br>`; UC02 nằm trên UC01; nhãn actor CMB đè lên actor ICPDP | UCD All users | Đã sửa | Sửa escape nhãn; đảo vị trí UC01/UC02; giãn 3 actor. Giữ tên "Sign in with Google" và actor hình người |

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
- **Xử lý:**
  - Ngày: —
  - File đã sửa: —
  - Thay đổi: —
  - Lý do: —

### I22 — Quy tắc hiển thị club ở UC06
- **Vấn đề:** *"Only `Active` clubs are listed. A `Suspended` club is visible but marked"* — câu
  sau mâu thuẫn với câu trước.
- **Cách sửa đề xuất:** *"`Active` and `Suspended` clubs are listed; a `Suspended` club is marked
  and shows no open campaign (BR09); a `Dissolved` club is not listed."*
- **Xử lý:**
  - Ngày: —
  - File đã sửa: —
  - Thay đổi: —
  - Lý do: —

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
