# UCMS — Context các issue liên quan đến Business Rule (BR)

File này gom mọi issue trong [`UCMS_Review_Issues.md`](UCMS_Review_Issues.md) có dính tới BR, và
giải thích **vì sao nó là vấn đề** để đọc mà không phải mở song song 4–5 tài liệu. File này
**không thay** tracker: trạng thái và mục "Xử lý" vẫn ghi ở `UCMS_Review_Issues.md`.

Ký hiệu tài liệu giống tracker: **Model** (`UCMS_UseCase_Model_v2.md`), **Spec**
(`UCMS_UseCase_Specification_v2.md`), **SRS** (`../SRS.md`), **Report**
(`../Group1_SE1939-NJ_Report_Final_v2.docx`). Catalogue BR đầy đủ: SRS mục quy tắc nghiệp vụ,
Model §11 / bảng BR, Report Table III.6.

Cập nhật: 2026-09-26.

---

## 1. Bảng tra nhanh BR → issue

| BR | Nói gì (catalogue hiện tại) | Issue | Trạng thái |
|---|---|---|---|
| BR05 | Mọi approve/reject lưu actor, thời điểm, lý do | I38 | Đã sửa (I38) |
| BR06 | Không có 2 nhiệm kỳ Chủ nhiệm chồng nhau, trừ khi tài liệu chính sách cho phép | I35 | Đã sửa |
| BR07 | Điều kiện giữ chức vụ lãnh đạo định nghĩa trong tài liệu chính sách | I35, I38, I33 | Đã sửa |
| BR08 | Quyền mới chỉ có hiệu lực khi chuyển giao nhiệm kỳ được xác nhận | I38 | Đã sửa (I38) |
| BR09 | CLB `Suspended` không mở đợt tuyển mới | I38 (và I22) | Đã sửa (I38) |
| BR14 | Sự kiện chỉ công khai khi đã `Approved` và được công bố ở UC27 | **I39**, I38 | Đã sửa |
| BR16 | Duyệt đa cấp theo rule UC05; không khớp rule nào → duyệt một cấp | I26, **I34** | I26, I34 đã sửa |
| BR17 | Số đăng ký xác nhận không vượt sức chứa (trừ overbooking) | I38 | Đã sửa (I38) |
| BR18 | Mỗi người 1 bản ghi điểm danh chính thức / sự kiện | I38 | Đã sửa (I38) |
| BR22 | Ngân sách chỉ tồn tại trong đề xuất sự kiện (UC25), được quyết định cùng đề xuất ở UC26; không có ngân sách tách rời sự kiện | I59 | Đã sửa (viết lại) |
| BR23 | Giải ngân không vượt số đã duyệt | I38 | Đã sửa (I38) |
| BR25 | Chứng từ theo hạng mục chi định nghĩa trong tài liệu chính sách | I35 | Đã sửa |
| BR26 | Đối soát xong mới được đóng ngân sách của sự kiện | I38, I59 | Đã sửa (I38; I59 đổi chữ) |
| BR27 | Thang mức độ vi phạm định nghĩa trong tài liệu chính sách | I35 | Đã sửa |
| BR29 | Tổng trọng số phải hợp lệ trước khi kích hoạt scheme | I38 | Đã sửa (I38) |
| BR30 | Kỳ đánh giá đã công bố không sửa tại chỗ | I38 | Đã sửa (I38) |
| BR31 | ICPDP là cấp duyệt duy nhất cho yêu cầu gửi lên nhà trường; việc nội bộ CLB do CMB | I32, I38, I33 | Đã sửa |
| BR33 | Không có 2 booking `Approved` trùng giờ trên 1 property | I38 | Đã sửa (I38) |
| BR40 | Tổng hợp phản hồi chỉ hiện khi đủ số người phản hồi tối thiểu (cấu hình được) | I08 | Đã sửa |
| BR42 | Màn hình cấu hình chỉ có 9 giá trị của UC04; còn lại là hằng số | I26, I35 | Đã sửa |
| BR43 | *(Đã rút)* Phase 1 không phụ thuộc Phase 2 | I21, I26, **I37** | I26, I37 đã sửa; I21 không sửa |
| BR44 | Sự kiện bắt đầu và kết thúc trong cùng một học kỳ | I05 | Đã sửa (BR mới) |
| BR45 | Khi đã có quyết định giải thể, không gì kết thúc sau kỳ `Dissolving` | I05 | Đã sửa (BR mới) |
| BR46 | Sinh viên `Banned` không được apply / tiếp nhận lại vào CLB đó | I25 | Đã sửa (BR mới) |
| BR47 | Quyền trong CLB chỉ đến từ vị trí trong nhiệm kỳ: ghế Chủ nhiệm (Club Leader), ghế tạm của người đứng đơn, ghế ban chủ nhiệm khác hoặc role gán ở UC23; UC03 không cấp | I33, I58 | Đã sửa (BR mới, sửa lại ở I58) |
| BR48 | Mỗi sinh viên tối đa 1 đăng ký / sự kiện | I38 | Đã sửa (BR mới) |
| BR49 | Chỉ thấy / thao tác trên CLB mình có tư cách thành viên hoặc chức vụ trong nhiệm kỳ | I38 | Đã sửa (BR mới) |
| BR50 | `Registration Open/Closed` suy ra từ registration window | I38 | Đã sửa (BR mới) |
| BR51 | Scheme đánh giá đã dùng thì khoá, sửa phải tạo version mới | I38 | Đã sửa (BR mới) |
| BR52 | Thành viên giữ ghế board phải được thay trước khi rời | I38 | Đã sửa (BR mới) |
| BR53 | Sự kiện nội bộ không có ngân sách được ghi nhận thẳng, ICPDP xem được, đóng khi chốt điểm danh | I57 | Đã sửa (BR mới) |
| BR54 | Mỗi UC vận hành CLB kiểm tra permission của người gọi; quyền là hợp các role, leader có mọi quyền | I58 | Đã sửa (BR mới) |
| BR55 | Danh mục permission cố định; 4 quyền giữ riêng của leader không cấp được; cơ cấu ban đầu ICPDP thẩm định ở UC07 / UC08, sau đó leader sửa tự do trừ role ban điều hành (người giữ qua UC10 / UC11 / UC13, thêm / bỏ qua UC12 / UC13) | I58 | Đã sửa (BR mới, sửa ở lần 2) |
| BR56 | Cơ cấu role đánh phiên bản (phiên bản 1 từ UC08, mỗi thay đổi ở UC23 / UC13 là phiên bản mới); role Chủ nhiệm cố định, role Members mặc định tự gán ở UC20; ICPDP xem mọi phiên bản và lịch sử ban điều hành | I58 | Đã sửa (BR mới, lần 2) |

**Còn mở, cần làm:** không còn issue nào trong bảng này (I21 không sửa).

---

## 2. Các issue còn mở

### I34 — UC05 đòi bộ rule "đầy đủ", BR16 lại có mặc định một cấp 🔴

**Hai câu đang nói ngược nhau:**

| Nguồn | Nói gì |
|---|---|
| BR16 (SRS, Model, Report) | *Hồ sơ không khớp rule nào → được quyết định ở **một cấp** duy nhất.* |
| Spec UC05 bước 3 (dòng 238) | *Hệ thống validate rằng bộ rule là **đầy đủ** và không nhập nhằng — mỗi hồ sơ khớp **đúng một** rule.* |
| Spec UC05 E1 (dòng 244) | *Hai rule chồng nhau **hoặc một loại hồ sơ không có rule nào** → từ chối kích hoạt.* |
| Spec UC05 cuối (dòng 248) | *… làm BR16 cưỡng chế được: một hồ sơ không khớp rule nào thì được quyết định ở một cấp.* |

**Vì sao là vấn đề:** nếu UC05 bắt mọi loại hồ sơ phải có rule, thì trường hợp "không khớp rule
nào" của BR16 **không bao giờ xảy ra** — nhánh mặc định một cấp là code chết. Ngược lại, nếu BR16
đúng, thì UC05 đang từ chối kích hoạt một bộ rule hợp lệ. Mâu thuẫn nằm ngay trong Spec UC05
(dòng 238/244 vs 248), không chỉ giữa Report và BR.

**Hệ quả thực tế:** ICPDP muốn chỉ đặt rule hai cấp cho "sự kiện quy mô lớn" sẽ bị UC05 chặn vì
các loại hồ sơ khác (thành lập CLB, ngân sách, booking…) chưa có rule.

**Lựa chọn:**

| | Cách | Hệ quả |
|---|---|---|
| A *(đề xuất trong tracker)* | Giữ BR16. UC05 bước 3 → *"validate không có hai rule chồng nhau"*; E1 bỏ vế *"hoặc một loại hồ sơ không có rule"* | Chỉ cần viết rule cho ngoại lệ; mặc định an toàn là một cấp. Sửa ít |
| B | Giữ UC05 "đầy đủ", bỏ vế mặc định ở BR16 | ICPDP phải khai rule cho mọi loại hồ sơ trước khi hệ thống chạy — thêm gánh nặng seed dữ liệu, dính I36 (khởi tạo) |

**Chỗ phải sửa (nếu chọn A):** Spec UC05 bước 3 + E1; Model UC05; SRS UC05 (FR-UC05-*); Report UC05.

---

### I39 — BR14 "công khai sau khi Approved" lệch UC27 🟡

**Hai câu:**

| Nguồn | Nói gì |
|---|---|
| BR14 | *Sự kiện chỉ được công khai sau khi đã `Approved`.* |
| Spec UC27 (dòng 915–931) | Tiền điều kiện `Approved`; bước 3 *"Thành viên công bố → `Upcoming`"*; bước 4 *"Sự kiện xuất hiện ở UC06 và UC24"*; hậu điều kiện *"`Upcoming` và hiển thị công khai"* |

**Vì sao là vấn đề:** BR14 viết như `Approved` ⇒ công khai. Thực tế lifecycle có **hai bước**:
`Approved` (ICPDP duyệt, vẫn ẩn) → CMB publish ở UC27 → `Upcoming` (mới hiện ra). BR14 chỉ là điều
kiện **cần**, không phải điều kiện **đủ**. Người đọc BR14 (hoặc dev viết query UC06) dễ lọc
`status = Approved` và lộ sự kiện chưa publish.

**Đề xuất:** BR14 → *"Sự kiện chỉ được công khai khi đã `Approved` **và được công bố ở UC27**
(`Upcoming`)."*

**Chỗ phải sửa:** catalogue BR14 ở SRS, Model, Report Table III.6 (+ BSA nếu có dòng BR14).
Không phải sửa UC27 — UC27 đã đúng.

---

### I38 — Câu diễn giải BR trong bảng UC khác catalogue 🟡

**Đã sửa (2026-09-26):** 30 dòng Rule sửa theo catalogue; thêm BR48–BR52. Xem `UCMS_Review_Issues.md` I38.

**Bối cảnh:** trong Report, mỗi UC có một bảng với cột *Rule* ghi mã BR kèm một câu diễn giải.
Câu này lẽ ra phải là nghĩa của BR trong catalogue (Table III.6). Thực tế nhiều UC dùng mã BR như
"nhãn" để nhét một ràng buộc riêng của UC đó — cùng một mã mà mỗi nơi nói một kiểu.

**Ví dụ rõ nhất:**

- **BR18** catalogue: *1 bản ghi **điểm danh** / người / sự kiện*. UC29 ghi: *1 **đăng ký** / người /
  sự kiện*. Đây là **hai ràng buộc khác nhau** (đăng ký ≠ điểm danh), và ràng buộc "1 đăng ký"
  hiện **không có BR nào** giữ.
- **BR31** catalogue: *ICPDP là cấp duyệt duy nhất*. UC01, UC02, UC24 dùng BR31 để nói *"chỉ thấy
  CLB của mình"* — đó là **phân quyền theo phạm vi**, không liên quan gì tới cấp duyệt.
- **BR14** catalogue: *công khai sau Approved*. UC06 dùng BR14 để nói *"CLB `Dissolved` không được
  liệt kê"* — nói về CLB, không phải sự kiện.

**Toàn bộ danh sách lệch:**

| BR | Catalogue | Bảng UC ghi (sai nghĩa) |
|---|---|---|
| BR05 | Actor/thời điểm/lý do cho approve/reject | UC02: dashboard read-only; UC09, UC12, UC22: audit chung; UC30: promotion theo policy |
| BR07 | Điều kiện giữ chức vụ lãnh đạo | UC09: template, trường của trường; UC11: quyền đến từ xác nhận; UC19: rubric; UC23: chức vụ phải có ở UC09 |
| BR08 | Quyền mới chỉ hiệu lực khi chuyển giao được xác nhận | UC12: nghĩa vụ gắn với CLB; UC22: phải thay ghế board trước |
| BR09 | `Suspended` không mở đợt tuyển | UC06: `Active` và `Suspended` được liệt kê |
| BR14 | Sự kiện công khai sau `Approved` | UC06: CLB `Dissolved` không liệt kê |
| BR17 | Sức chứa | UC27: mở/đóng đăng ký suy ra từ window |
| BR18 | 1 điểm danh / người / sự kiện | UC29: 1 **đăng ký** / người / sự kiện |
| BR23 | Giải ngân ≤ số đã duyệt | UC39: case `Exception` vẫn đóng được |
| BR26 | Đối soát trước khi đóng | UC37: chỉ theo dõi, không thanh toán |
| BR29 | Tổng trọng số hợp lệ | UC44: scheme quyết định dimension; UC45: điểm giải thích được |
| BR30 | Kỳ đánh giá đã công bố không sửa | UC43: scheme không sửa; UC44: bản nháp phải qua UC45 |
| BR31 | ICPDP là cấp duyệt duy nhất | UC01, UC02, UC24: chỉ thấy CLB mình; UC03: role CMB thứ cấp; UC23: phạm vi theo CLB/nhiệm kỳ |
| BR33 | Không trùng giờ booking | UC46: đổi giờ không ảnh hưởng quyết định cũ; UC49: slot trống ngay |

**Vì sao là vấn đề:**
1. Truy vết BR → UC sai: tra "BR18 được thực thi ở đâu" sẽ ra UC29, trong khi UC29 thực thi một
   luật khác.
2. Có ràng buộc thật **không có BR nào giữ** (1 đăng ký / người; quyền theo CLB + nhiệm kỳ; trạng
   thái đăng ký suy ra từ window; scheme đánh giá bị khoá version khi đã dùng).
3. I33 dựa một phần vào đây: UC01 viện BR31, UC11 viện BR07 để nói về nguồn gốc quyền CMB — cả hai
   đều sai BR.

**Đề xuất (tracker):**
- Cột *Rule* của bảng UC lấy **nguyên văn** định nghĩa từ catalogue (sinh tự động, không viết tay).
- Ý đang bị nhét vào BR thì: (a) chuyển vào Summary/Postconditions của UC nếu chỉ là mô tả hành vi;
  hoặc (b) thêm BR mới (**BR47+**) nếu là ràng buộc thật. Ứng viên BR mới:
  - 1 đăng ký / người / sự kiện (UC29);
  - quyền giới hạn theo CLB và nhiệm kỳ đang hiệu lực (UC01, UC02, UC23, UC24);
  - trạng thái mở/đóng đăng ký suy ra từ registration window (UC27, UC29);
  - scheme đánh giá đã được dùng thì bị khoá, sửa phải tạo version mới (UC43, UC44).

**Cần chốt:** thêm những BR mới nào (a hay b cho từng dòng). Phạm vi sửa chủ yếu ở **Report**.

---

### I37 — Report vẫn nói "cắt scope" sau khi BR43 đã rút 🟡

**Bối cảnh:** BR43 cũ = *"Phase 1 không phụ thuộc Phase 2"*. Khi team chốt **mọi UC ra cùng một
release** (xem I26), BR43 bị rút và Model/Spec đã được dọn. Report chưa dọn.

**Còn sót trong Report:**
- §III.3.2 đoạn đầu: *"Medium is a loop that can be deferred, and Low is a loop that is cut first if
  scope must be reduced"* → priority đang được hiểu là **thứ tự cắt**.
- Table II.4 Risk #4: *"If scope must be cut, cut a whole loop in the published order"*.
- UC42 priority **Low**, trong khi UC15, UC34 (**High**) mở case ở UC42 → nếu cắt Low thì High gãy.

**Đề xuất:** Priority = thứ tự **build/demo**, không phải thứ tự cắt. Risk #4 response → *build theo
loop khép kín, loop High trước, không cắt UC*. Nâng hoặc xem lại priority UC42.

**Chỗ phải sửa:** chỉ Report (§III.3.2, Table II.4, cột priority UC42).

---

### I21 — "Phase 1 phụ thuộc UC23 (Phase 2), vi phạm BR43" 🟡 — có thể đóng

**Vấn đề gốc (2026-09-23):** Spec UC09 E2 *"từ chối cho tới khi UC23 phân công lại"* (dòng 381–382)
và UC21 bước 4 *"thu hồi mọi chức vụ đang giữ (UC23)"* (dòng 734) — hai UC Phase 1 gọi tới UC23 vốn
là Phase 2, trái BR43.

**Tình trạng hiện tại:** I26 đã bỏ phase và rút BR43. UC23 ra cùng release, nên hai tham chiếu trên
**không còn vi phạm gì**. Hai câu vẫn đúng nghĩa nghiệp vụ.

**Đề xuất:** đổi trạng thái I21 → `Không sửa`, lý do: *"BR43 đã rút ở I26; UC23 ra cùng release nên
tham chiếu từ UC09/UC21 hợp lệ."*

---

### I33 — Nguồn gốc quyền CMB 🔴 — phần dính BR

**Đã sửa (2026-09-26):** thêm BR47; UC01, UC03, UC11 dùng BR47 thay cho BR31/BR07. Xem `UCMS_Review_Issues.md` I33.

Issue chính là "UC03 có được cấp role CMB không" (cần quyết định). Phần liên quan BR:

- UC01 viện **BR31** để nói quyền *"đến từ position assignment trong nhiệm kỳ hiện hành"*.
- UC11 viện **BR07** để nói *"quyền đến từ xác nhận này, không phải từ UC03"*.
- Cả hai đều dùng sai BR (xem I38). Không BR nào hiện nay nói *"quyền CMB đến từ đâu"*.

→ Khi chốt I33, nên đồng thời thêm một BR mới (vd. *"Quyền CMB chỉ đến từ ghế board/chức vụ đã xác
nhận trong nhiệm kỳ hiện hành (UC08 tạm thời, UC11, UC13, UC23)"*) và gỡ BR31/BR07 khỏi UC01/UC11.

---

## 3. Các issue đã xử lý (để hiểu vì sao BR như hiện nay)

### I05 → BR44, BR45 mới (giải thể CLB)
- **Vấn đề:** Model UC15 nói giải thể thì huỷ event/booking; Spec UC15 chỉ archive và thu hồi quyền.
- **Chốt:** giải thể **không có hiệu lực ngay**. Kỳ N (ra quyết định) chạy bình thường → kỳ N+1 CLB
  `Dissolving` (không tạo việc mới, chỉ đóng việc cũ) → cuối kỳ N+1 → `Dissolved`.
- **BR44:** sự kiện bắt đầu và kết thúc trong cùng một học kỳ.
  **BR45:** đã có quyết định giải thể thì không sự kiện/đề xuất/booking nào được kết thúc sau kỳ
  `Dissolving`; UC25 E5, UC47 E4 từ chối; UC15 huỷ những gì đã tồn tại.
- **Tại sao cần hai BR:** nhờ BR44 + BR45, tới cuối kỳ `Dissolving` chắc chắn **không còn sự kiện
  nào đang chạy** → không phải huỷ sự kiện `Ongoing`.
- **Còn lại:** rút lại quyết định giải thể (về `Active`) chưa mô hình hoá.

### I08 → BR40 vào danh sách UC04
- **Vấn đề:** Spec UC04 có "số người phản hồi tối thiểu" (BR40), Model UC04 không.
- **Chốt:** BR40 tự ghi *"mức tối thiểu **cấu hình được**"* → theo BR42 phải nằm trong UC04. Thêm vào
  Model UC04. D3 chỉ còn là chọn giá trị mặc định.

### I25 → BR46 mới (Banned)
- **Vấn đề:** membership `Ended` gộp chung "tự rời" và "bị loại"; `On Leave` trùng `Inactive`.
- **Chốt:** `Active` ⇄ `Inactive` → `Left` (UC22 được chấp nhận) / `Banned` (CMB buộc rời, lý do bắt
  buộc). `Left` quay lại bằng membership mới (UC20).
- **BR46:** sinh viên `Banned` không được apply (UC17 E4) hay được tiếp nhận lại, kể cả tiếp nhận
  thủ công (UC20 E2).

### I26 → BR16 bật, BR42 viết lại, BR43 rút
- **Vấn đề:** Model/Spec dựng trên khung Phase 1/2 dù mọi UC ra cùng lúc; nhiều BR dùng phase để
  hoãn hành vi.
- **Chốt:**
  - **BR16:** *"Inactive in Phase 1"* → có hiệu lực: duyệt đa cấp theo UC05, không khớp rule nào →
    một cấp. Mọi cấp do ICPDP Officer nên BR31 vẫn đúng. *(Chính câu "không khớp rule → một cấp"
    này sinh ra I34.)*
  - **BR42:** *"Phase 1 exposes only this list"* → *"Màn hình cấu hình chỉ có danh sách này"*.
  - **BR43:** `Withdrawn`, giữ số hiệu, không dùng lại. *(Report chưa dọn → I37.)*

### I32 → BR31 thu hẹp phạm vi
- **Vấn đề:** BR31 cũ: *"no decision in the system is approved by another actor"* — trái với các quyết
  định CMB tự đưa ra (UC18 duyệt đơn thành viên, UC21 ban, UC23 phân chức vụ, UC32 chốt điểm danh).
- **Chốt:** BR31 → *ICPDP là cấp duyệt duy nhất **cho mọi yêu cầu CLB/sinh viên gửi lên nhà
  trường**; quyết định nội bộ CLB do CMB đưa ra trong phạm vi của mình.* Sửa Report v2, SRS, BSA.

### I35 → BR42 kèm danh sách hằng số; BR06, BR07, BR25, BR27 đổi chữ
- **Vấn đề:** BR42 chỉ cho cấu hình 9 giá trị, nhưng BR06, BR07, BR25, BR27 và nhiều UC vẫn ghi
  *"configurable / configured by ICPDP"* mà không có màn hình nào để cấu hình.
- **Chốt:** giữ 9 giá trị. Mọi chỗ còn lại → *"defined in the policy document"*. BR42 kèm danh sách
  12 hằng số (UC07, BR06, BR07, UC25, UC28/UC49, UC30, UC31, BR25, BR27, UC40, UC52, UC54).
- **Lý do:** mỗi giá trị cấu hình thêm = một màn hình + schema + validate, trong khi chưa có nhu cầu
  đổi thật (D2).

---

## 4. Thứ tự xử lý đề xuất

1. **I34** (🔴) — mâu thuẫn ngay trong Spec, ảnh hưởng logic định tuyến duyệt. Sửa nhỏ nếu chọn A.
2. **I39** — sửa một câu BR14, tránh lỗi query công khai sự kiện.
3. **I21** — đóng với `Không sửa`.
4. **I37** — dọn Report.
5. **I38** (+ phần BR của **I33**) — việc lớn nhất; cần chốt danh sách BR47+ trước khi sửa Report.

