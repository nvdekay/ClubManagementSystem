# UCMS — Use Case Model v2 (bản sửa đổi)

> **Trạng thái:** bản sửa đổi của §8–§11, §14–§15, §21–§22 trong
> [`UCMS_Business_System_Analysis.md`](../01-business-analysis/UCMS_Business_System_Analysis.md).
> Các mục đó vẫn được giữ nguyên làm lịch sử; khi hai bên nói khác nhau, **lấy theo tài liệu này**.
> Những mục không liệt kê ở đây (§1–§7, §12–§13, §16–§20, §23–§24) không thay đổi và vẫn còn hiệu lực.

> **Sơ đồ:** mô hình này được vẽ trong [`../03-diagrams/UCMS_UseCase_ByActor.drawio`](../03-diagrams/UCMS_UseCase_ByActor.drawio) (draw.io), phủ UC01–UC52.
> Biên hệ thống được vẽ trong [`../03-diagrams/UCMS_Context_Diagram_v2.1.drawio`](../03-diagrams/UCMS_Context_Diagram_v2.1.drawio) (v2.1, 40 luồng — I56, I58); §15 ánh xạ từng luồng dữ liệu của nó tới use case.

**Tổng: 52 business use case** — 43 use case mang sang từ 57 use case của v1, thêm mới 9. (Hai use case ngân sách cũ, UC35 và UC36 theo cách đánh số trước I59, đã gộp vào UC25, UC26; các use case sau đó được đánh số lại — xem I59.)
4 actor (Student, Club Member, Club Leader, ICPDP Officer — CMB được tách ở I58), 3 hệ thống ngoài (Google OAuth, Google SMTP, Cloudinary), 12 module.

---

## 1. Vì sao mô hình thay đổi

v1 đếm được 57 use case. Vấn đề không nằm ở con số, mà ở cách cấu thành.

| Khiếm khuyết trong v1 | Bằng chứng | Cách sửa trong v2 |
|---|---|---|
| Một phiên thẩm định bị tách thành 3 use case | UC03+UC04+UC06, UC26+UC27+UC29, UC39+UC41 — cùng actor, cùng thực thể, cùng màn hình. UC52 thì đã gộp cả ba cho việc đặt cơ sở vật chất | Mỗi lần phê duyệt là một use case `Thẩm định và quyết định` duy nhất, với `Yêu cầu chỉnh sửa` là một kết quả của nó |
| Việc nộp lại được mô hình hoá thành use case riêng | UC05, UC28, UC40 — cùng actor và cùng biểu mẫu với lần nộp đầu, chỉ khác tiền điều kiện | Trở thành luồng thay thế của chính use case nộp |
| Một chức năng hệ thống bị đếm như use case | UC25 `Phát hiện xung đột sự kiện`, actor chính ghi là `System/CMB` | Trở thành quy tắc nghiệp vụ BR15, được gọi bên trong UC25 và UC45 (đánh số v2) |
| Use case có hai actor chính | UC23, UC25, UC33, UC35, UC45 — vi phạm chính §1.3 của v1 "actor chịu trách nhiệm rõ ràng" | Mỗi use case một actor chính; actor thứ hai trở thành actor hỗ trợ hoặc thành use case riêng |
| Thiếu các use case cấu hình | UC51 đọc một danh mục cơ sở vật chất mà không ai duy trì; BR29 kiểm tra một scheme mà không ai cấu hình | Thêm UC04, UC41, UC44; UC05 từng được thêm cho duyệt đa cấp nhưng đã rút ngày 2026-10-08 |
| Thiếu các use case đọc dữ liệu | §3 và §4 coi "khám phá CLB" và "theo dõi trạng thái đơn" là trách nhiệm của Student; §18 đặc tả ba dashboard — không cái nào có use case | Thêm UC02, UC06 |
| Tư cách thành viên không tạo ra thứ gì | Sau khi được tiếp nhận, use case của một thành viên giống hệt của người không phải thành viên | Thêm UC24 |
| Một trạng thái vòng đời không có ai sở hữu | §15.10 giao `Forwarded → Club Responded` cho CMB dưới UC57, nhưng UC57 lại thuộc về ICPDP theo §8.7 và §11 | Thêm UC52 |
| Có trạng thái mà không actor nào và không chức năng hệ thống nào chạm tới | Event `Ongoing`/`Completed`, Booking `In Use`/`Completed`; Feedback `Window Open`/`Aggregated` vốn không phải trạng thái của một bản ghi phản hồi | §10 gán cho mọi chuyển trạng thái một tác nhân điều khiển; vòng đời phản hồi được sửa lại |
| MVP tự phá vỡ phụ thuộc của chính nó | Một use case Must lại bao hàm một use case Should; đối soát (MVP) cần giải ngân (V2); leo thang khiếu nại (MVP) cần hồ sơ vi phạm (V2); đặt cơ sở vật chất (MVP, "không được cắt") cần việc trả chỗ (V2) | §12 chia phạm vi phát hành theo vòng lặp; chỉ một bản phát hành, nên không use case nào phải chờ một use case bị hoãn |

## 2. Các quy tắc thiết kế mà mô hình này tuân theo

Một hành vi chỉ được cấp số use case khi **tất cả** điều sau cùng đúng:

1. có **một** actor chính chịu trách nhiệm cho nó;
2. actor đó là **con người**, không bao giờ là "System" — hành vi chạy theo thời gian hoặc theo
   quy tắc là chức năng hệ thống (§7) hoặc là quy tắc nghiệp vụ (§11), không phải use case;
3. nó tạo ra một kết quả nghiệp vụ mà actor mang đi được;
4. nó không phải là một **kết quả** khác hay một **tiền điều kiện** khác của một use case đã có
   — những thứ đó là luồng thay thế;
5. việc đọc dữ liệu vẫn được tính, nếu bản thân việc đọc là mục tiêu nghiệp vụ (một dashboard,
   một danh mục, một danh sách thành viên) chứ không phải một bước bên trong use case khác.

Quy tắc 1 buộc phải tách các use case hai actor. Quy tắc 2 loại bỏ UC25 của v1. Quy tắc 4 loại
bỏ các phần phê duyệt bị chẻ nhỏ và các use case nộp lại của v1. Quy tắc 5 khôi phục lại các
dashboard, danh mục CLB và không gian thành viên mà v1 đã bỏ đi vì coi là "CRUD".

## 3. Các actor

**Student**, **Club Member**, **Club Leader**, **ICPDP Officer**, cộng thêm Google OAuth,
Google SMTP và Cloudinary (lưu ảnh tải lên) với tư cách hệ thống ngoài. Actor `Club Management
Board (CMB)` của §4 được tách thành Club Member và Club Leader (I58):

- **Chuỗi generalization:** Student ◁ Club Member ◁ Club Leader. Club Member là một Student;
  Club Leader là một Club Member; mỗi actor kế thừa mọi use case của actor cha.
- **Club Member** — Student có tư cách thành viên `Active` (UC24 cho phép cả `Inactive`) ở một
  CLB. Actor chính của UC22 và UC24 (mọi thành viên) và của các use case vận hành CLB; một use case
  vận hành chỉ làm được khi role của người gọi trong CLB đó có permission tương ứng (BR54). Một
  thành viên giữ nhiều role thì quyền là hợp các permission của các role.
- **Club Leader** — Chủ nhiệm CLB: người giữ ghế Chủ nhiệm đã được ICPDP xác nhận ở UC11 / UC13,
  hoặc người đứng đơn giữ ghế tạm từ UC08 khi CLB còn `Pending Setup` (khi đó chỉ UC09, UC10,
  UC23). Có mọi permission CLB và giữ riêng bốn quyền không cấp được cho role nào: UC10, UC12,
  UC14 và UC23 (BR55). Leader không uỷ quyền quản lý role cho người khác.
- **"CMB" từ nay là tên gọi chung của phía CLB** — Club Leader cùng các Club Member có role phù
  hợp — trong câu văn, thông báo và dashboard. Chỉ trường **Actor** của mỗi use case ghi actor cụ
  thể kèm permission.

**Guest không phải actor.** Guest là khách chưa đăng nhập, chỉ được **đọc** khu công khai của
UC06 (danh bạ CLB, trang CLB, đợt tuyển đang mở, sự kiện công khai sắp tới). Guest không sở hữu
use case nào và không tạo dữ liệu; mọi hành động (ứng tuyển, đăng ký, nộp hồ sơ…) đều đòi UC01,
và lúc đó người dùng là Student. Nguyên tắc: *khám phá công khai, hành động phải đăng nhập*.

Hai mâu thuẫn của v1 quanh mô hình actor được giải quyết tại đây:

- **Không có `ICPDP Head` hay duyệt đa cấp.** ICPDP chỉ có role `ICPDP_OFFICER`; mỗi lần nộp
  nhận đúng một quyết định của một officer. D1 đã chốt ngày 2026-10-08 và UC05 được rút.
- **"Thủ quỹ" là một role CLB, không phải actor.** v1 ghi actor của UC43 là `CMB/Treasurer`;
  v2 ghi Club Member có permission tương ứng, và Thủ quỹ là một role do Club Leader tạo và cấp
  permission ở UC23 (ví dụ `club.event.manage`, `club.expense.record`).

## 4. Danh sách use case tổng hợp

### M01 — Định danh, truy cập và cấu hình

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC01 | Xác thực qua Google OAuth và vào workspace theo vai trò | Tất cả | Truy cập mà không cần mật khẩu nội bộ |
| UC02 | Mở dashboard theo vai trò của tôi | Tất cả | Thấy việc gì cần mình, và hồ sơ mình nộp giờ ra sao |
| UC03 | Quản lý tài khoản và gán vai trò | ICPDP | Cấp, thu hồi và khoá quyền truy cập |
| UC04 | Cấu hình chính sách và deadline của nhà trường | ICPDP | Đổi quy tắc mà không cần sửa code |
| UC05 | **Đã rút** — cấu hình quy tắc định tuyến phê duyệt | — | Giữ mã để không đánh số lại UC06–UC52 |

### M02 / M03 — Vòng đời CLB, quản trị và nhiệm kỳ

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC06 | Khám phá CLB và hoạt động đang mở | Student | Tìm được một CLB đáng tham gia |
| UC07 | Nộp hồ sơ đề nghị thành lập CLB | Student | Đề xuất một CLB mới |
| UC08 | Thẩm định và quyết định hồ sơ thành lập CLB | ICPDP | Kiểm tra, yêu cầu chỉnh sửa, phê duyệt hoặc từ chối |
| UC09 | Cấu hình hồ sơ và cơ cấu tổ chức CLB | Club Member | Thiết lập thông tin vận hành và các đơn vị nội bộ |
| UC10 | Đề xuất ban chủ nhiệm CLB | Club Leader | Đề cử bộ máy lãnh đạo cho một nhiệm kỳ |
| UC11 | Xác nhận ban chủ nhiệm | ICPDP | Trao quyền quản lý |
| UC12 | Lập kế hoạch chuyển giao nhiệm kỳ | Club Leader | Chuẩn bị bàn giao kèm các nghĩa vụ của nó |
| UC13 | Xác nhận chuyển giao nhiệm kỳ | ICPDP | Chuyển giao quyền một cách an toàn |
| UC14 | Yêu cầu tạm ngừng hoạt động CLB | Club Leader | Tạm dừng hoạt động một cách hợp thức |
| UC15 | Tạm ngừng, kích hoạt lại hoặc giải thể CLB | ICPDP | Kiểm soát vòng đời CLB |

### M04 — Tuyển thành viên và quản lý thành viên

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC16 | Tạo và công bố đợt tuyển thành viên | Club Member | Tuyển thành viên |
| UC17 | Nộp đơn ứng tuyển vào CLB | Student | Ứng tuyển vào một đợt tuyển |
| UC18 | Sàng lọc và quyết định đơn ứng tuyển | Club Member | Rút gọn danh sách, nhận, từ chối hoặc đưa vào danh sách chờ |
| UC19 | Ghi nhận đánh giá ứng viên | Club Member | Chấm theo một rubric |
| UC20 | Tiếp nhận ứng viên trúng tuyển | Club Member | Tạo tư cách thành viên |
| UC21 | Quản lý trạng thái thành viên | Club Member | Giữ danh sách thành viên đúng thực tế, kể cả khi loại thành viên |
| UC22 | Xin rời CLB | Club Member | Tự kết thúc tư cách thành viên của mình |
| UC23 | Quản lý vai trò CLB và phân quyền | Club Leader | Tạo role, cấu hình permission cho role và gán thành viên vào role |
| UC24 | Sử dụng không gian thành viên của tôi | Club Member | Nhận được giá trị từ việc là thành viên |

### M05 — Sự kiện và hoạt động

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC25 | Nộp đề xuất tổ chức sự kiện | Club Member | Xin phép tổ chức một sự kiện |
| UC26 | Thẩm định và quyết định đề xuất sự kiện | ICPDP | Kiểm tra, yêu cầu chỉnh sửa, phê duyệt hoặc từ chối |
| UC27 | Công bố sự kiện và mở đăng ký | Club Member | Cho phép tham gia |
| UC28 | Huỷ hoặc đổi lịch sự kiện | Club Member | Xử lý một thay đổi cùng mọi hệ quả của nó |

### M06 — Đăng ký và điểm danh

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC29 | Đăng ký tham gia sự kiện | Student | Giữ một chỗ |
| UC30 | Quản lý sức chứa và danh sách chờ | Club Member | Kiểm soát số người vượt trên mức trần cứng |
| UC31 | Check-in vào sự kiện | Student | Chứng minh mình đã tham dự |
| UC32 | Chốt điểm danh sự kiện | Club Member | Tạo ra bộ dữ liệu điểm danh chính thức |

### M08 — Trách nhiệm giải trình sau sự kiện

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC33 | Nộp báo cáo sau sự kiện | Club Member | Khép vòng trách nhiệm giải trình |
| UC34 | Thẩm định và đóng báo cáo sự kiện | ICPDP | Kết thúc vòng đời của sự kiện |

### M07 — Tài chính và ngân sách

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC35 | Ghi nhận giải ngân | ICPDP | Theo dõi mọi dòng tiền của ngân sách đã duyệt: tạm ứng, cấp bù và tiền CLB hoàn trả |
| UC36 | Ghi nhận khoản chi và nộp quyết toán | Club Member | Chứng minh chi tiêu và nộp quyết toán sau sự kiện |
| UC37 | Đối soát ngân sách và chi tiêu | ICPDP | Xác lập trách nhiệm giải trình |

### M08 — Báo cáo và tuân thủ

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC38 | Nộp báo cáo hoạt động định kỳ | Club Member | Hoàn thành nghĩa vụ báo cáo |
| UC39 | Thẩm định báo cáo hoạt động định kỳ | ICPDP | Xác nhận để dùng làm đầu vào đánh giá |
| UC40 | Quản lý hồ sơ vi phạm và tuân thủ | ICPDP | Kiểm soát tuân thủ kèm vết xử lý |

### M09 — Đánh giá hiệu quả

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC41 | Cấu hình scheme đánh giá | ICPDP | Định nghĩa dimension, trọng số và ngưỡng |
| UC42 | Sinh bản nháp đánh giá hiệu quả CLB | ICPDP | Biến dữ liệu vận hành thành dữ liệu quản trị |
| UC43 | Xem lại, chốt và công bố đánh giá | ICPDP | Công bố một kết quả chính thức |

### M11 — Cơ sở vật chất và đặt chỗ

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC44 | Quản lý danh mục cơ sở vật chất | ICPDP | Định nghĩa những gì được phép đặt |
| UC45 | Gửi yêu cầu đặt cơ sở vật chất | Club Member | Xin một phòng hoặc thiết bị |
| UC46 | Thẩm định và quyết định yêu cầu đặt cơ sở vật chất | ICPDP | Cấp phát nguồn lực có kiểm soát |
| UC47 | Theo dõi và huỷ / trả cơ sở vật chất đã đặt | Club Member | Giải phóng thứ không còn cần |

### M12 — Phản hồi và khiếu nại

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC48 | Gửi phản hồi sau sự kiện | Student | Phản ánh trải nghiệm của người tham dự |
| UC49 | Xem phản hồi sự kiện | Club Member | Cải thiện chất lượng hoạt động |
| UC50 | Gửi khiếu nại về một CLB | Student | Khiếu nại vượt ra ngoài phạm vi CLB |
| UC51 | Phân loại khiếu nại | ICPDP | Bác bỏ, chuyển xuống hoặc leo thang, kèm lý do |
| UC52 | Trả lời khiếu nại được chuyển xuống | Club Member | Giải trình chính thức, có ghi nhận |

**Tổng:** 5 + 10 + 9 + 4 + 4 + 2 + 3 + 3 + 3 + 4 + 5 = **52**.

## 5. Ánh xạ v1 → v2

Mọi mã số của v1 đều được xử lý.

| v1 | v2 | Thay đổi |
|---|---|---|
| UC01 | UC01 | — |
| UC02 | UC07 | hấp thụ UC05 thành "nộp lại sau khi bị yêu cầu chỉnh sửa" |
| UC03, UC04, UC06 | UC08 | gộp thành một use case thẩm định-và-quyết định |
| UC05 | UC07 | luồng thay thế |
| UC07, UC08 | UC09 | gộp (cùng actor, cùng thực thể, cùng một phiên thiết lập) |
| UC09 | UC10 | — |
| UC10 | UC11 | — |
| UC11 | UC12 | — |
| UC12 | UC13 | — |
| UC13 | UC14 | — |
| UC14 | UC15 | — |
| UC15 | UC16 | — |
| UC16 | UC17 | — |
| UC17, UC19 | UC18 | gộp (sàng lọc và ra quyết định là một phiên) |
| UC18 | UC19 | — |
| UC20 | UC20 | — |
| UC21 | UC21 | hấp thụ nửa "CLB loại thành viên" của UC23 |
| UC22 | UC23 | — |
| UC23 | UC21 + UC22 | tách theo actor: CLB loại thành viên (UC21) và sinh viên xin rời (UC22) |
| UC24 | UC25 | hấp thụ UC28; kiểm tra xung đột trở thành BR15 |
| UC25 | — | xoá; trở thành BR15, được gọi bởi UC25 và UC45 |
| UC26, UC27, UC29 | UC26 | gộp thành một use case thẩm định-và-quyết định |
| UC28 | UC25 | luồng thay thế |
| UC30 | UC27 | — |
| UC31 | UC29 | — |
| UC32 | UC30 | — |
| UC33 | UC31 | actor chính giờ chỉ còn Student; CMB check-in thủ công là luồng thay thế |
| UC34 | UC32 | — |
| UC35 | UC28 | actor chính giờ chỉ còn CMB; việc ICPDP buộc huỷ đi qua UC15 hoặc UC40 |
| UC36 | UC33 | — |
| UC37 | UC34 | — |
| UC38 | UC25 | hấp thụ UC40; ngân sách gộp vào đề xuất sự kiện (I59) |
| UC39, UC41 | UC26 | gộp thành một use case thẩm định-và-quyết định; sau I59 ngân sách được thẩm định cùng đề xuất sự kiện |
| UC40 | UC25 | luồng thay thế (nộp lại đề xuất kèm ngân sách, I59) |
| UC42 | UC35 | — |
| UC43, UC44 | UC36 | gộp (chứng từ luôn tham chiếu tới một khoản chi) |
| UC45 | UC37 | actor chính giờ chỉ còn ICPDP; CMB đọc cùng bộ số liệu qua UC02 |
| UC46 | UC38 | — |
| UC47 | UC39 | — |
| UC48 | UC40 | — |
| UC49 | UC42 | — |
| UC50 | UC43 | — |
| UC51 | UC45 | hấp thụ "sửa và nộp lại booking" thành luồng thay thế |
| UC52 | UC46 | — |
| UC53 | UC47 | — |
| UC54 | UC48 | feedback window nay mở tại lúc check-in, không phải sau khi chốt điểm danh (BR36) |
| UC55 | UC49 | đổi tên: CMB xem phản hồi; việc ghi lại bài học diễn ra ở UC33 |
| UC56 | UC50 | — |
| UC57 | UC51 | nửa phần CLB trả lời trở thành UC52 |
| *mới* | UC02 | Mở dashboard theo vai trò (§18 không có use case) |
| *mới* | UC03 | Quản lý tài khoản và gán vai trò ("tài khoản bị khoá" của UC01 không có ai sở hữu) |
| *mới* | UC04 | Cấu hình chính sách và deadline (~20 quy tắc ghi "cấu hình được") |
| *mới, đã rút* | UC05 | Từng cấu hình quy tắc định tuyến phê duyệt; rút ngày 2026-10-08 |
| *mới* | UC06 | Khám phá CLB và hoạt động đang mở (trách nhiệm của Student theo §4) |
| *mới* | UC24 | Sử dụng không gian thành viên (tư cách thành viên không có người tiêu thụ) |
| *mới* | UC41 | Cấu hình scheme đánh giá (BR29) |
| *mới* | UC44 | Quản lý danh mục cơ sở vật chất (UC51 của v1 đọc một danh mục không ai duy trì) |
| *mới* | UC52 | Trả lời khiếu nại được chuyển xuống (trạng thái ở §15.10 không có actor) |

## 6. Đặc tả chi tiết — bản rút gọn

> **Đặc tả đầy đủ:** [`UCMS_UseCase_Specification_v2.md`](UCMS_UseCase_Specification_v2.md)
> chứa cả 52 use case theo mẫu §9 của bản phân tích — actor, mục tiêu, điều kiện kích hoạt,
> tiền điều kiện, dữ liệu vào, luồng chính, luồng thay thế, ngoại lệ, hậu điều kiện, quy tắc
> nghiệp vụ, đầu ra, use case liên quan, pain point. Các mục dưới đây là bản rút gọn; khi hai
> bên khác nhau, lấy theo tài liệu đặc tả.

Định dạng: **Actor** · **Mục tiêu** · **Luồng** · **Quy tắc** · **Liên quan**. Ở những chỗ v1 đã
đặc tả đầy đủ và không có gì thay đổi, mục này được viết ngắn có chủ ý — phần chữ của v1 vẫn
còn hiệu lực.

### M01 — Định danh, truy cập và cấu hình

#### UC01 — Xác thực qua Google OAuth và vào workspace theo vai trò
- **Actor:** Tất cả · **Hỗ trợ:** Google OAuth (ES1)
- **Mục tiêu:** Truy cập đúng với vai trò của người gọi, không lưu mật khẩu nào trong hệ thống.
- **Luồng:** gửi yêu cầu tới Google → người dùng xác thực → Google trả email, họ tên, ảnh đại
  diện → đối chiếu domain email với chính sách (UC04) → ánh xạ tới một User, tạo User +
  StudentProfile ở lần đăng nhập đầu → nạp vai trò và quyền → điều hướng tới workspace.
- **Thay thế:** người dùng có nhiều ngữ cảnh (vừa là Student vừa là CMB của một CLB) chọn workspace.
- **Ngoại lệ:** domain không được phép → từ chối, không tạo User hay phiên, ghi audit lần thử; tài khoản bị khoá ở UC03 → từ chối và ghi
  audit; không kết nối được Google → báo lỗi, không tạo phiên.
- **Quy tắc:** BR32. Không bao giờ lưu mật khẩu.
- **Liên quan:** UC02, UC03, UC04

#### UC02 — Mở dashboard theo vai trò của tôi
- **Actor:** Tất cả
- **Mục tiêu:** Mỗi vai trò một màn hình trả lời "việc gì cần tôi, và hồ sơ tôi nộp giờ ra sao".
- **Luồng:** hệ thống xác định vai trò và ngữ cảnh CLB của người gọi → nạp các mục đang chờ, các
  deadline và các trạng thái do vai trò đó sở hữu → người dùng mở bất kỳ mục nào sang use case
  của chính nó.
- **Nội dung (theo §18):**
  - *ICPDP:* hồ sơ chờ duyệt theo loại và độ trễ, CLB theo trạng thái, báo cáo quá hạn,
    ngân sách chưa đối soát, hồ sơ đang mở, sự kiện nội bộ đã ghi nhận của mọi CLB kèm điểm
    danh (BR53, chỉ đọc); trang mỗi CLB có phiên bản cơ cấu role hiện hành, lịch sử các phiên
    bản cơ cấu và lịch sử ban điều hành theo nhiệm kỳ (BR56, chỉ đọc).
  - *Club Leader:* thêm phiên bản cơ cấu role, lịch sử phiên bản và lịch sử ban điều hành của CLB
    mình (BR56).
  - *CMB:* hồ sơ của chúng tôi và trạng thái, deadline sắp tới, lịch sự kiện và booking,
    số lượng thành viên, tình hình ngân sách.
  - *Student:* đơn của tôi và trạng thái, đăng ký của tôi, lịch sử check-in, tư cách thành viên,
    khiếu nại của tôi.
- **Quy tắc:** chỉ đọc; không có chuyển trạng thái nào ở đây. Mọi con số là truy vấn trực tiếp
  vào module sở hữu, không bao giờ là bản sao thứ hai của dữ liệu.
- **Trả lời:** BP01 (CLB nào đang Active), BP14 (nhìn thấy deadline) và trách nhiệm "theo dõi
  trạng thái đơn" ở §4.
- **Liên quan:** tất cả

#### UC03 — Quản lý tài khoản và gán vai trò
- **Actor:** ICPDP
- **Mục tiêu:** Kiểm soát ai được hành động, tách biệt với ai được đăng nhập.
- **Luồng:** tìm người dùng → xem vai trò và ngữ cảnh CLB hiện tại → cấp hoặc thu hồi một vai
  trò ICPDP hoặc vai trò đặc biệt của BR19 → khoá hoặc mở khoá tài khoản kèm lý do → hệ thống
  ghi audit thay đổi.
- **Quy tắc:** tài khoản bị khoá sẽ bị từ chối ở UC01; UC03 không cấp quyền CLB (BR47);
  phân cấp trong ICPDP được biểu diễn bằng quyền, không phải bằng actor mới (§3).
- **Liên quan:** UC01, UC11, UC13

#### UC04 — Cấu hình chính sách và deadline của nhà trường
- **Actor:** ICPDP
- **Mục tiêu:** Đổi một quy tắc nghiệp vụ mà không cần một lần phát hành.
- **Dữ liệu:** domain email được phép; số thành viên sáng lập tối thiểu (BR03); tài liệu bắt
  buộc của hồ sơ thành lập (BR02); deadline báo cáo và các mốc nhắc (BR20, §19); ngưỡng xung đột
  (BR15); feedback window và số người phản hồi tối thiểu (BR36, BR40); chính sách overbooking
  (BR33); các công tắc cưỡng chế (BR21); lịch học kỳ (ngày bắt đầu và kết thúc).
- **Quy tắc:** mọi thay đổi đều được đánh phiên bản và ghi audit; một thay đổi không bao giờ
  viết lại một quyết định đã ra. **Màn hình cấu hình chỉ phơi ra đúng danh sách này** — mọi giá
  trị chính sách khác là hằng số định nghĩa trong tài liệu chính sách: điều kiện được lập CLB (UC07); thời gian báo trước tối thiểu của sự kiện (UC25); thời hạn báo trước khi huỷ (UC28, UC47); chính sách đẩy lên từ danh sách chờ (UC30); khung giờ check-in (UC31); yêu cầu chứng từ theo hạng mục chi (BR25); thang phân loại mức độ vi phạm (BR27); các kỳ báo cáo ngoài học kỳ (UC38); các loại khiếu nại (UC50); thời hạn CMB trả lời khiếu nại (UC52); hạn nộp quyết toán sau sự kiện (BR57); hạn hoàn trả khoản bị thu hồi (BR58). Các giá trị
  này chỉ trở nên sửa được khi có nhu cầu thật (§14, quyết định còn mở D2).
- **Liên quan:** UC01, UC07, UC25, UC33, UC38, UC45, UC48

#### UC05 — Đã rút: Cấu hình quy tắc định tuyến phê duyệt

Rút ngày 2026-10-08 vì mỗi lần nộp chỉ có đúng một quyết định của một `ICPDP_OFFICER`. Không
còn cấp duyệt để định tuyến; giữ mã UC05 để không đánh số lại các use case sau.

### M02 / M03 — Vòng đời CLB, quản trị và nhiệm kỳ

#### UC06 — Khám phá CLB và hoạt động đang mở
- **Actor:** Student
- **Mục tiêu:** Tìm được một CLB và một đợt tuyển hoặc sự kiện đáng tham gia.
- **Tiền điều kiện:** không có — Guest xem được (chỉ đọc); UC17 / UC29 đòi UC01.
- **Luồng:** duyệt hoặc tìm CLB đang hoạt động theo lĩnh vực và từ khoá → mở trang CLB (hồ sơ,
  ban chủ nhiệm, lịch sử hoạt động, đợt tuyển đang mở, sự kiện công khai sắp tới) → đi tiếp sang
  UC17 hoặc UC29.
- **Quy tắc:** liệt kê CLB `Active` và `Suspended`; CLB `Suspended` được đánh dấu và không hiện
  đợt tuyển nào (BR09); CLB `Dissolved` không được liệt kê.
- **Liên quan:** UC17, UC29, UC16, UC27

#### UC07 — Nộp hồ sơ đề nghị thành lập CLB
- **Actor:** Student
- **Mục tiêu:** Đề xuất một CLB mới qua một quy trình chuẩn.
- **Luồng:** nhập tên, lĩnh vực và mục tiêu → khai báo thành viên sáng lập → khai báo **cơ cấu
  tổ chức dự kiến**: danh sách role (tên, ban/bộ phận, một hay nhiều người giữ, có thuộc ban điều
  hành không) và permission của từng role chọn từ danh mục cố định; có sẵn role Chủ nhiệm (cố
  định) và Members (mặc định) (BR55, BR56) → tải lên các tài liệu bắt buộc (BR02) → hệ thống
  validate → xác nhận → hệ thống tạo version 1 (gồm cả cơ cấu) → `Submitted` → ICPDP nhận một
  review task.
- **Thay thế — nộp lại (UC05 của v1):** từ `Revision Requested`, người nộp sửa và nộp lại; hệ
  thống tạo một **version mới** và đưa hồ sơ về `Submitted`.
- **Thay thế:** lưu ở trạng thái `Draft`.
- **Thay thế — rút hồ sơ:** trước khi có quyết định, người nộp rút hồ sơ → `Withdrawn`.
- **Ngoại lệ:** thiếu một tài liệu bắt buộc; số thành viên sáng lập ít hơn mức BR03 cho phép;
  cơ cấu thiếu role Chủ nhiệm hoặc cấp một quyền giữ riêng của leader cho một role (BR55).
- **Quy tắc:** BR02, BR03, BR04 — một version đã nộp, gồm cả cơ cấu role, không bao giờ bị ghi
  đè; BR55, BR56.
- **Liên quan:** UC08, UC23 · **Pain point:** BP04

#### UC08 — Thẩm định và quyết định hồ sơ thành lập CLB
- **Actor:** ICPDP
- **Mục tiêu:** Một phiên thẩm định duy nhất kết thúc bằng một trong ba kết quả.
- **Tiền điều kiện:** hồ sơ đang ở `Submitted`.
- **Luồng:** mở hồ sơ → kiểm tra thông tin CLB, thành viên sáng lập, cơ cấu role dự kiến (role,
  permission, role ban điều hành), tài liệu và lịch sử version → chọn một kết quả:
  1. **Yêu cầu chỉnh sửa** — đánh dấu các phần chưa đạt (có thể là cơ cấu role), nhập nhận xét có
     cấu trúc, đặt deadline → `Revision Requested`, người nộp được thông báo;
  2. **Phê duyệt** → `Approved`, một Club được tạo ở `Pending Setup` cùng **phiên bản cơ cấu 1**
     (các role và permission trong hồ sơ, hiệu lực từ ngày duyệt — BR56), và người nộp nhận ghế
     tạm của người đứng đơn, chỉ dùng được cho UC09, UC10 và UC23 khi CLB còn `Pending Setup`;
  3. **Từ chối** — bắt buộc có lý do → `Rejected`, không tạo Club nào.
- **Ngoại lệ:** hết deadline chỉnh sửa mà không có bản nộp lại → scheduler đặt `Expired`.
- **Quy tắc:** BR05 — actor, thời điểm và lý do được lưu cho mọi kết quả. ICPDP không bao giờ
  sửa dữ liệu thay cho người nộp. Lịch sử quyết định gắn liền với hồ sơ và đọc được ngay tại đây
  (đây chính là thứ thoả mãn BP15 — không có use case audit riêng nào tồn tại).
- **Liên quan:** UC07, UC09, UC10, UC23

#### UC09 — Cấu hình hồ sơ và cơ cấu tổ chức CLB
- **Actor:** Club Member có permission `club.profile.manage` (BR54)
- **Mục tiêu:** Hoàn thiện thông tin vận hành và các đơn vị nội bộ của một CLB đã được công nhận.
- **Dữ liệu:** mô tả, liên hệ, điều lệ, kênh truyền thông, phạm vi hoạt động; các ban và bộ
  phận. Việc định nghĩa role và permission chuyển sang UC23 (I58).
- **Quy tắc:** các trường thuộc thẩm quyền nhà trường chỉ ICPDP sửa được; cơ cấu có thể bị ràng
  buộc bởi template của trường. Khi CLB còn `Pending Setup`, người đứng đơn (ghế tạm từ UC08) làm
  use case này với quyền Club Leader (BR47).
- **Liên quan:** UC10, UC23

#### UC10 — Đề xuất ban chủ nhiệm CLB
- **Actor:** Club Leader (quyền giữ riêng `club.board.nominate`, BR55) · **Mục tiêu:** Đề cử lãnh đạo cho một nhiệm kỳ.
- **Luồng:** với mỗi role **ban điều hành** trong phiên bản cơ cấu đang hiệu lực (không còn lấy từ
  template của trường) → chọn một thành viên → nhiệm kỳ → nộp → `Pending Confirmation`.
- **Quy tắc:** BR06, BR07, BR55. Người được đề cử phải có membership `Active`; nhiệm kỳ Chủ nhiệm
  không được chồng lấn. Hồ sơ thành lập được duyệt ở UC08 sẽ đề cử ban chủ nhiệm đầu tiên
  tại đây.
- **Liên quan:** UC11

#### UC11 — Xác nhận ban chủ nhiệm
- **Actor:** ICPDP · **Mục tiêu:** Trao quyền quản lý.
- **Luồng:** kiểm tra membership `Active`, chồng lấn nhiệm kỳ Chủ nhiệm và ngày hiệu lực → một ICPDP Officer
  phê duyệt hoặc từ chối (có thể xác nhận một phần) → khi phê duyệt,
  các quyền tương ứng có hiệu lực và CLB có thể rời `Pending Setup`.
- **Quy tắc:** BR05, BR07, BR47, BR56. Quyền được cấp bởi lần xác nhận này, không phải bởi UC03.
  Với ban chủ nhiệm sáng lập, lần xác nhận này thay thế quyền sáng lập tạm thời đã cấp ở UC08.
  Bản xác nhận người giữ từng role ban điều hành thuộc về nhiệm kỳ, tạo thành lịch sử ban điều
  hành mà ICPDP xem ở UC02.
- **Liên quan:** UC10, UC03

#### UC12 — Lập kế hoạch chuyển giao nhiệm kỳ
- **Actor:** Club Leader (quyền giữ riêng `club.transition.plan`, BR55) · **Mục tiêu:** Chuẩn bị một cuộc bàn giao mang theo cả nghĩa vụ của nó.
- **Dữ liệu:** nhiệm kỳ mới, người giữ mới cho từng role ban điều hành, sự kiện còn dở, ngân sách
  còn treo, báo cáo chưa xong, tài sản và trách nhiệm cần bàn giao, và (tuỳ chọn) thay đổi danh
  sách role ban điều hành — thêm / bỏ role → `Pending Confirmation`.
- **Quy tắc:** BR08, BR55 — thêm / bỏ role ban điều hành chỉ đi qua chuyển giao.
- **Liên quan:** UC13, UC23

#### UC13 — Xác nhận chuyển giao nhiệm kỳ
- **Actor:** ICPDP · **Mục tiêu:** Chuyển giao quyền mà không đánh mất trách nhiệm giải trình.
- **Luồng:** khi phê duyệt — đóng nhiệm kỳ cũ, kích hoạt nhiệm kỳ mới, thu hồi quyền cũ, cấp
  quyền mới, lưu lại lịch sử ban điều hành; nếu kế hoạch có thay đổi danh sách role ban điều hành,
  tạo một phiên bản cơ cấu mới có hiệu lực từ lúc xác nhận (BR56).
- **Quy tắc:** BR08, BR55, BR56. Các nghĩa vụ liệt kê ở UC12 vẫn gắn với CLB, không gắn với ban chủ nhiệm
  sắp rời đi.
- **Liên quan:** UC12, UC03

#### UC14 — Yêu cầu tạm ngừng hoạt động CLB
- **Actor:** Club Leader (quyền giữ riêng `club.suspension.request`, BR55) · **Dữ liệu vào:** lý do, thời lượng dự kiến, các nghĩa vụ, kế hoạch phục hồi.
- **Ngoại lệ:** có sự kiện/booking tương lai đã duyệt → cảnh báo, liệt kê những gì sẽ bị huỷ nếu
  UC15 chấp thuận; không chặn việc nộp.
- **Liên quan:** UC15

#### UC15 — Tạm ngừng, kích hoạt lại hoặc giải thể CLB
- **Actor:** ICPDP · **Mục tiêu:** Kiểm soát vòng đời CLB.
- **Kích hoạt:** một yêu cầu (UC14), tình trạng không hoạt động, kết quả một hồ sơ (UC40), hoặc
  chính sách.
- **Quy tắc:** BR09, BR10, BR34 — một CLB `Suspended` không mở đợt tuyển nào, không nộp đề xuất
  sự kiện nào và không nhận booking mới nào; việc tạm ngừng huỷ các đề xuất sự kiện chưa được
  quyết định, và huỷ các sự kiện cùng booking tương lai đã duyệt thông qua UC28 (A1) và UC47.
- **Giải thể là có lịch, không tức thì**, bất kể ai kích hoạt nó:
  - tại thời điểm quyết định, mọi thứ kết thúc sau học kỳ `Dissolving` đều bị huỷ thông qua UC28
    (A1) và UC47, và không thứ gì mới được phép kết thúc sau đó (BR45);
  - học kỳ ra quyết định vẫn chạy bình thường — CLB tiếp tục hoạt động và vẫn có thể tạo việc mới;
  - vào đầu học kỳ kế tiếp, CLB chuyển sang `Dissolving`: không tạo gì mới, và CMB chỉ giữ quyền
    truy cập để hoàn tất phần việc còn tồn;
  - mọi thứ phải được đóng trước khi học kỳ tiếp theo bắt đầu. Vì mọi sự kiện đều gọn trong một
    học kỳ (BR44) và không cái nào được kết thúc muộn hơn (BR45), lúc đó không còn sự kiện nào
    đang chạy: scheduler huỷ các đề xuất chưa quyết định, ghi các nghĩa vụ chưa hoàn thành vào
    hồ sơ lưu trữ, lưu trữ lịch sử quản trị, thu hồi quyền quản lý và đặt `Dissolved`.
- **Liên quan:** UC14, UC40, UC28, UC47 · **Pain point:** BP01

### M04 — Tuyển thành viên và quản lý thành viên

#### UC16 — Tạo và công bố đợt tuyển thành viên
- **Actor:** Club Member có permission `club.recruitment.manage` (BR54) · **Tiền điều kiện:** CLB đang `Active` (BR01)
- **Dữ liệu vào:** vị trí cần tuyển, tiêu chí, khung thời gian nhận đơn, chỉ tiêu, các vòng
  tuyển → `Published`.
- **Liên quan:** UC17 · **Pain point:** BP11

#### UC17 — Nộp đơn ứng tuyển vào CLB
- **Actor:** Student
- **Luồng:** chọn một đợt tuyển (từ UC06) → điền biểu mẫu → nộp → `Submitted`.
- **Thay thế — rút đơn:** trước khi có quyết định → `Withdrawn`.
- **Validate:** điều kiện dự tuyển, khung thời gian nhận đơn (BR11), không nộp trùng (BR12),
  không có tư cách thành viên `Banned` ở CLB này (BR46).
- **Liên quan:** UC18, UC02

#### UC18 — Sàng lọc và quyết định đơn ứng tuyển
- **Actor:** Club Member có permission `club.application.review` (BR54)
- **Mục tiêu:** Đưa toàn bộ đơn của một đợt tuyển từ `Submitted` tới quyết định trong một phiên.
- **Luồng:** lọc và xem xét đơn → `Screening` → đưa vào danh sách rút gọn hoặc từ chối → với
  ứng viên trong danh sách rút gọn, có thể đính kèm một bản đánh giá (UC19) → quyết định:
  `Accepted`, `Rejected` hoặc `Waitlisted`.
- **Quy tắc:** lý do từ chối có thể là bắt buộc theo tài liệu chính sách; quyết định được thông báo tới
  ứng viên và hiển thị trong UC02 của họ.
- **Liên quan:** UC17, UC19, UC20

#### UC19 — Ghi nhận đánh giá ứng viên
- **Actor:** Club Member có permission `club.application.review` (BR54) · **Dữ liệu:** kết quả phỏng vấn, điểm rubric, nhận xét của người đánh giá.
- **Quy tắc:** rubric được cấu hình theo từng đợt tuyển. · **Liên quan:** UC18

#### UC20 — Tiếp nhận ứng viên trúng tuyển
- **Actor:** Club Member có permission `club.application.review` (BR54)
- **Luồng:** xác nhận việc nhận → tạo ClubMembership với ngày gia nhập; thành viên mới tự động
  giữ role **Members** (BR56).
  Nếu ứng viên báo không tham gia, CMB ghi nhận → `Declined`.
- **Quy tắc:** BR13, BR46, BR56; không có hai tư cách thành viên đang hiệu lực cho cùng một sinh
  viên và một CLB.
- **Liên quan:** UC18, UC21, UC24

#### UC21 — Quản lý trạng thái thành viên
- **Actor:** Club Member có permission `club.member.manage` (BR54)
- **Mục tiêu:** Giữ danh sách thành viên đúng thực tế, kể cả khi kết thúc một tư cách thành viên.
- **Trạng thái:** `Active` ⇄ `Inactive` (ngừng tham gia); `Active` / `Inactive` → `Left`
  (yêu cầu ở UC22 của sinh viên được chấp nhận) hoặc `Banned` (CLB buộc thành viên rời đi).
  `Left` và `Banned` là trạng thái cuối; sinh viên `Banned` không được quay lại CLB đó (BR46).
- **Luồng:** đổi trạng thái của một thành viên kèm ngày hiệu lực và, với lệnh cấm, một lý do bắt
  buộc → hệ thống ghi audit và thu hồi mọi role đang giữ, kể cả Members (UC23; role ban điều hành
  phải được thay trước theo BR52). Mỗi học kỳ, CLB đăng ký lại
  các thành viên đang hoạt động; ai không được xác nhận sẽ chuyển thành `Inactive`.
- **Quy tắc:** mọi thay đổi đều mang một ngày hiệu lực; một lệnh cấm luôn quy được trách nhiệm.
  Việc rời CLB do sinh viên yêu cầu (UC22) được thực thi tại đây dưới dạng `Left`.
- **Liên quan:** UC22, UC23 · **Pain point:** BP02

#### UC22 — Xin rời CLB
- **Actor:** Club Member
- **Luồng:** mở tư cách thành viên của tôi → gửi yêu cầu rời kèm lý do → CMB thực thi ở UC21.
- **Quy tắc:** một thành viên đang giữ ghế ban chủ nhiệm đã xác nhận phải được thay thế qua
  UC10/UC11 trước khi việc rời CLB có hiệu lực. Khi việc rời có hiệu lực ở UC21, mọi role của
  thành viên bị thu hồi.
- **Liên quan:** UC21, UC24

#### UC23 — Quản lý vai trò CLB và phân quyền
- **Actor:** Club Leader (quyền giữ riêng `club.role.manage`, BR55)
- **Mục tiêu:** Chủ nhiệm tự tổ chức CLB — tạo role, quyết định mỗi role làm được gì, và giao
  role cho thành viên.
- **Luồng:** mở danh sách role → tạo hoặc sửa role (tên, mô tả, ban/bộ phận ở UC09, một hay nhiều
  người giữ) → chọn permission từ danh mục cố định, đã ẩn các quyền giữ riêng của leader → gán
  thành viên `Active` vào role (có thể kèm thời hạn) → quyền có hiệu lực ngay, có audit, thành viên
  được thông báo và thấy role ở UC24. Mỗi lần tạo / sửa / ngừng dùng role hoặc đổi permission tạo
  một **phiên bản cơ cấu mới** (số phiên bản, ngày hiệu lực, người sửa, lý do tuỳ chọn), không ghi
  đè phiên bản trước (BR56); leader xem được lịch sử phiên bản.
- **Thay thế:** sửa permission của role (áp dụng ngay cho mọi người giữ); thu hồi role của một
  thành viên; cơ cấu ban đầu đến từ hồ sơ thành lập đã duyệt ở UC07 / UC08 (phiên bản 1); role
  ban điều hành (ví dụ Phó chủ nhiệm, Trưởng ban) được đổi permission tại đây (hiệu lực ngay)
  nhưng người giữ chỉ đến từ UC10 / UC11 / UC13; role Members tự gán ở UC20, không gán tay.
- **Ngoại lệ:** gán cho thành viên không `Active`; role một người giữ đã có người; cấp một quyền
  giữ riêng của leader (BR55); ngừng dùng role còn người giữ hoặc là ghế ban chủ nhiệm đã xác
  nhận; thêm / bỏ / đánh dấu lại một role ban điều hành trong nhiệm kỳ đang chạy — phải đi qua
  UC12 / UC13; xoá hoặc ngừng dùng role Chủ nhiệm hay Members; người gọi không phải Club Leader.
- **Quy tắc:** BR47, BR49, BR54, BR55, BR56. Không cần ICPDP xác nhận — cờ "chức vụ nhạy cảm" của
  v2 trước I58 bị bỏ; ICPDP đã thẩm định cơ cấu ban đầu ở UC08 và xem mọi phiên bản cơ cấu cùng
  lịch sử ban điều hành (chỉ đọc) ở UC02.
- **Liên quan:** UC07, UC08, UC09, UC10, UC11, UC12, UC13, UC20, UC21, UC24

#### UC24 — Sử dụng không gian thành viên của tôi
- **Actor:** Club Member
- **Mục tiêu:** Cho tư cách thành viên một lý do tồn tại bên trong hệ thống.
- **Luồng:** mở một CLB tôi thuộc về → xem bản ghi tư cách thành viên và các role của mình, danh
  sách thành viên và ban chủ nhiệm, các sự kiện sắp tới của CLB kèm trạng thái đăng ký của tôi,
  lịch sử điểm danh của tôi, và các nghĩa vụ còn treo (phản hồi chưa gửi, yêu cầu rời đang chờ).
- **Quy tắc:** chỉ đọc, giới hạn trong các CLB mà người gọi có tư cách thành viên `Active` hoặc
  `Inactive` (`Inactive` được đánh dấu, vẫn xin rời được qua UC22);
  nó không tạo thực thể mới và không tạo dữ liệu mới — mọi trường đều đã do một use case khác
  sinh ra. Nhắn tin nội bộ, chat và chia sẻ file nằm ngoài phạm vi (§5.2).
- **Liên quan:** UC20, UC22, UC29, UC31, UC48

### M05 — Sự kiện và hoạt động

#### UC25 — Nộp đề xuất tổ chức sự kiện
- **Actor:** Club Member có permission `club.event.manage` (BR54) · **Tiền điều kiện:** CLB đang `Active` (BR10) và người gọi có quyền tương ứng
- **Dữ liệu vào:** mục tiêu, thời gian, địa điểm, đối tượng, sức chứa, kế hoạch, rủi ro, nhu cầu
  cơ sở vật chất, và **phần ngân sách** tuỳ chọn: các dòng ngân sách (hạng mục, số tiền, mục đích,
  khoản chi dự kiến) cùng tổng số tiền xin. Đây là cách duy nhất để CLB xin kinh phí (BR22); phần
  ngân sách được đóng băng trong bản sửa của đề xuất.
- **Dữ liệu vào thêm:** phạm vi `Public` (mọi sinh viên) hoặc `Internal` (chỉ thành viên CLB).
- **Luồng:** validate → hệ thống đánh giá quy tắc xung đột BR15 và hiển thị
  `No Conflict` / `Warning` / `Blocking Conflict` → có thể đính kèm một yêu cầu đặt cơ sở vật
  chất (UC45) → nộp → `Pending Approval`.
- **Thay thế — nộp lại (UC28 của v1):** từ `Revision Requested`, sửa và nộp lại; một bản sửa mới
  được tạo và đề xuất quay về `Pending Approval`.
- **Thay thế — ghi nhận sự kiện nội bộ (BR53):** sự kiện `Internal` không có phần ngân sách
  được ghi nhận thẳng `Draft → Approved`, không tạo review task, có ghi audit; ICPDP xem nó ở
  UC02. Có phần ngân sách thì đi luồng chính; booking đính kèm vẫn do UC46 quyết định.
- **Ngoại lệ:** có xung đột chặn trong khi chính sách cấm chồng lịch; một nghĩa vụ bắt buộc
  (báo cáo, quyết toán, hoàn trả) đã quá hạn và công tắc cưỡng chế BR21 đang bật.
- **Quy tắc:** BR10, BR15, BR21, BR22, BR44, BR45, BR53. Một bản sửa không bao giờ ghi đè bản trước.
- **Liên quan:** UC26, UC45 · **Pain point:** BP05, BP06, BP09

#### UC26 — Thẩm định và quyết định đề xuất sự kiện
- **Actor:** ICPDP
- **Tiền điều kiện:** đề xuất đang ở `Pending Approval`.
- **Luồng:** xem xét mức độ tuân thủ, địa điểm, thời gian, rủi ro, các nghĩa vụ quá hạn, yêu cầu
  booking đính kèm, và **phần ngân sách** (điều kiện, hạn mức còn lại của kỳ, khả năng trùng lặp)
  → chọn: **yêu cầu chỉnh sửa** (bắt buộc nhận xét có cấu trúc, có thể nhắm riêng vào ngân sách)
  → `Revision Requested`; **phê duyệt** → `Approved`, officer chốt **số tiền duyệt** theo từng
  dòng (có thể thấp hơn số xin ở nơi chính sách cho phép) và hệ thống tạo `EventBudget` ở
  `Approved`; **từ chối** (bắt buộc lý do) → `Rejected`.
- **Ngoại lệ:** CLB bị tạm ngừng trước khi có quyết định → `Cancelled` bởi UC15; hết deadline
  chỉnh sửa → scheduler đặt `Expired`.
- **Quy tắc:** BR05, BR14, BR16, BR22, BR31 — ICPDP là cấp phê duyệt duy nhất; ý kiến của Cơ sở vật chất, An
  ninh và Tài chính được lấy ngoài hệ thống và ghi vào review note. Việc duyệt một đề xuất có
  kèm yêu cầu booking **không** đồng nghĩa duyệt booking đó; UC46 mới quyết định nó. Sự kiện nội
  bộ ghi nhận thẳng (BR53) không đi qua UC26.
- **Liên quan:** UC25, UC27, UC46

#### UC27 — Công bố sự kiện và mở đăng ký
- **Actor:** Club Member có permission `club.event.manage` (BR54) · **Tiền điều kiện:** sự kiện đang `Approved` (BR14)
- **Luồng:** đặt khung thời gian đăng ký và thông tin công khai → công bố → `Upcoming`.
- **Thay thế:** sự kiện `Internal` chỉ mở cho thành viên và chỉ hiển thị ở UC24, không ở UC06.
- **Liên quan:** UC29, UC06, UC24

#### UC28 — Huỷ hoặc đổi lịch sự kiện
- **Actor:** Club Member có permission `club.event.manage` (BR54)
- **Mục tiêu:** Thay đổi một sự kiện đã duyệt mà không mất vết và không để rò rỉ nguồn lực.
- **Luồng:** nhập lý do → với việc đổi lịch, đánh giá lại BR15 và nộp lại để có quyết định khi
  chính sách yêu cầu (sự kiện nội bộ theo BR53 chỉ được ghi nhận lại) → cập nhật hoặc giải phóng booking liên quan (UC47) → thông báo cho người
  đã đăng ký → tính lại các nghĩa vụ báo cáo và ngân sách (huỷ sự kiện: `EventBudget` chưa giải
  ngân chuyển `Cancelled`, đã tạm ứng thì CLB phải quyết toán ở UC36 và phần chưa chi bị thu hồi
  ở UC37 — BR57, BR58).
- **Quy tắc:** BR35 — huỷ một sự kiện sẽ giải phóng booking đã duyệt của nó. Một lần huỷ nằm
  trong thời hạn báo trước định nghĩa trong tài liệu chính sách sẽ được ghi nhận là tín hiệu tuân thủ cho UC40.
- **ICPDP buộc huỷ** là luồng thay thế A1: hệ thống huỷ sự kiện như hệ quả của UC15 (tạm ngừng,
  giải thể) hoặc UC40 (kết quả hồ sơ). ICPDP không phải actor của UC28 — đây chính là thứ loại
  bỏ vấn đề hai actor của UC35 trong v1.
- **Liên quan:** UC27, UC47, UC40, UC15

### M06 — Đăng ký và điểm danh

#### UC29 — Đăng ký tham gia sự kiện
- **Actor:** Student
- **Validate:** khung thời gian đăng ký, điều kiện tham gia, không đăng ký trùng, sức chứa.
- **Kết quả:** `Confirmed`, hoặc `Waitlisted` khi danh sách chờ được bật; việc đẩy lên là UC30.
- **Quy tắc:** BR17 — số đăng ký đã xác nhận không bao giờ vượt sức chứa trừ khi chính sách cho
  phép overbooking. Khi sự kiện không có danh sách chờ, đạt sức chứa nghĩa là đóng đăng ký.
- **Liên quan:** UC27, UC30, UC31 · **Pain point:** BP07

#### UC30 — Quản lý sức chứa và danh sách chờ
- **Actor:** Club Member có permission `club.attendance.manage` (BR54) · **Quy tắc:** khi một chỗ trống ra, việc đẩy lên theo quy tắc định nghĩa trong tài liệu chính sách.
- **Liên quan:** UC29

#### UC31 — Check-in vào sự kiện
- **Actor:** Student · **Hỗ trợ:** Club Member có permission `club.attendance.manage`
- **Luồng:** sinh viên xuất trình hoặc quét mã sự kiện tại địa điểm → hệ thống xác minh đăng ký
  và khung giờ → một bản ghi điểm danh được tạo.
- **Thay thế:** một thành viên CMB có quyền check-in hộ một người tham dự, và bản ghi lưu lại ai
  đã thực hiện.
- **Quy tắc:** BR18 — mỗi người tham dự một bản ghi điểm danh cho mỗi sự kiện; check-in trùng
  không bao giờ tạo bản ghi thứ hai.
- **Liên quan:** UC29, UC32, UC48

#### UC32 — Chốt điểm danh sự kiện
- **Actor:** Club Member có permission `club.attendance.manage` (BR54)
- **Luồng:** xem lại các lượt check-in bất thường → chốt → bộ dữ liệu bị khoá.
- **Thay thế:** với sự kiện nội bộ ghi nhận thẳng (BR53), chốt điểm danh đưa sự kiện
  `Completed → Closed`; không có báo cáo sau sự kiện (UC33).
- **Quy tắc:** BR19 — chỉ một vai trò đặc biệt mới mở khoá được. Việc chốt **không** điều khiển
  feedback window; BR36 đã mở nó từ lúc check-in.
- **Liên quan:** UC31, UC33, UC42

### M08 — Trách nhiệm giải trình sau sự kiện

#### UC33 — Nộp báo cáo sau sự kiện
- **Actor:** Club Member có permission `club.report.submit` (BR54)
- **Được nạp sẵn:** đề xuất đã duyệt, bảng điểm danh đã chốt, ngân sách và các khoản chi, bản
  tổng hợp phản hồi khi UC49 đã có dữ liệu.
- **Nhập tay:** kết quả thực tế, minh chứng, sự cố, bài học rút ra.
- **Quy tắc:** BR20 — deadline được cấu hình ở UC04; một báo cáo quá hạn sẽ đi vào BR21. Sự
  kiện nội bộ ghi nhận thẳng (BR53) không có nghĩa vụ báo cáo.
- **Liên quan:** UC32, UC34, UC36 · **Pain point:** BP08

#### UC34 — Thẩm định và đóng báo cáo sự kiện
- **Actor:** ICPDP
- **Luồng:** đối chiếu kế hoạch với thực tế → chấp nhận → `Closed`; hoặc trả về để sửa; hoặc ghi
  nhận một phát hiện, và phát hiện đó mở một hồ sơ ở UC40.
- **Quy tắc:** BR05.
- **Liên quan:** UC33, UC40, UC42

### M07 — Tài chính và ngân sách

#### UC35 — Ghi nhận giải ngân
- **Actor:** ICPDP · **Dữ liệu:** loại dòng tiền, số tiền, ngày, mã tham chiếu.
- **Luồng — tạm ứng:** `EventBudget` đang `Approved` hoặc `Disbursed` → officer ghi một lần tạm
  ứng, một phần hoặc toàn bộ số duyệt, trước khi sự kiện diễn ra → `Disbursed`; CLB được thông báo.
  Nhiều lần tạm ứng cộng dồn vào một lần duyệt.
- **Thay thế — cấp bù:** `EventBudget` đang `Reconciled` với chi hợp lệ lớn hơn số đã tạm ứng →
  officer ghi khoản cấp bù đúng bằng phần chênh (trần là số duyệt) → `Closed`.
- **Thay thế — ghi nhận hoàn trả:** `EventBudget` đang `Recovery Pending` → officer ghi số tiền CLB
  đã hoàn; hoàn đủ số phải hoàn → `Closed` (BR58).
- **Quy tắc:** BR23 — tổng tạm ứng và cấp bù không bao giờ vượt số tiền duyệt khi chưa có văn bản
  điều chỉnh. Chỉ theo dõi; đây không phải một hệ thống kế toán (§5.2). Không có nó thì UC37
  không tính được gì.
- **Liên quan:** UC26, UC36, UC37

#### UC36 — Ghi nhận khoản chi và nộp quyết toán
- **Actor:** Club Member có permission `club.expense.record` (BR54)
- **Tiền điều kiện:** `EventBudget` của sự kiện đang `Disbursed` hoặc `Reconciliation Pending`.
- **Dữ liệu vào:** hạng mục, số tiền, ngày, mô tả, và hoá đơn, biên lai hoặc chứng từ thanh toán.
- **Luồng:** ghi từng khoản chi kèm chứng từ → khi sự kiện đã `Completed` hoặc bị huỷ, **nộp
  quyết toán**: hệ thống hiển thị đã tạm ứng, tổng chi, số dư chưa chi, khoản chi thiếu chứng từ →
  xác nhận → `Settlement Submitted`, bộ khoản chi bị khoá; ICPDP nhận một task.
- **Thay thế:** nộp lại quyết toán sau khi UC37 trả về (`Reconciliation Pending`).
- **Quy tắc:** BR24 — khoản chi ngoài hạng mục đã duyệt bị gắn cờ ngoại lệ; BR25 — yêu cầu về
  chứng từ theo hạng mục định nghĩa trong tài liệu chính sách; mỗi chứng từ tham chiếu đúng một
  khoản chi, và đó chính là lý do UC43 và UC44 của v1 gộp thành một use case ở đây; BR57 — quyết
  toán phải nộp trước hạn, quá hạn là một nghĩa vụ quá hạn theo BR21.
- **Liên quan:** UC35, UC37, UC33

#### UC37 — Đối soát ngân sách và chi tiêu
- **Actor:** ICPDP · **Tiền điều kiện:** `EventBudget` đang `Settlement Submitted` (UC36).
- **Hệ thống tính:** đã duyệt, đã tạm ứng, khoản chi đã ghi nhận, khoản chi có chứng từ, khoản
  chi thiếu chứng từ, số dư chưa chi, chênh lệch.
- **Luồng:** officer chấp nhận hoặc loại từng khoản chi (khoản thiếu chứng từ hoặc ngoài hạng mục
  không được chấp nhận thì bị loại) → hệ thống chốt **chi hợp lệ** và **chênh lệch tất toán** =
  chi hợp lệ (trần là số duyệt) − đã tạm ứng: bằng 0 → `Reconciled → Closed`; dương →
  `Reconciled`, chờ cấp bù ở UC35; âm → `Recovery Pending` với **số phải hoàn** và hạn hoàn (BR58).
- **Thay thế:** A1 trả về để bổ sung chứng từ → `Reconciliation Pending`; A2 quá hạn quyết toán
  (BR57) → officer chốt trên các khoản chi đã có chứng từ → `Recovery Pending`.
- **Ngoại lệ:** quá hạn hoàn trả → nghĩa vụ quá hạn theo BR21 và officer mở hồ sơ vi phạm ở UC40.
- **Quy tắc:** BR26 — ngân sách chỉ đóng khi đã đối soát và chênh lệch đã tất toán (cấp bù hoặc
  hoàn trả). BR57, BR58. CMB
  không đồng sở hữu quyết định này; họ đọc cùng bộ số liệu qua UC02, và đó chính là thứ loại bỏ
  vấn đề hai actor của UC45 trong v1.
- **Liên quan:** UC35, UC36, UC40, UC42 · **Pain point:** BP10

### M08 — Báo cáo và tuân thủ

#### UC38 — Nộp báo cáo hoạt động định kỳ
- **Actor:** Club Member có permission `club.report.submit` (BR54) · **Kỳ báo cáo:** học kỳ, năm học hoặc một kỳ được cấu hình
- **Tự động nạp sẵn:** sự kiện, thành viên, điểm danh, tài chính. **Nhập tay:** phần thuyết minh
  và minh chứng mà hệ thống không có.
- **Quy tắc:** BR20; deadline và các mốc nhắc đến từ UC04 và §19.
- **Liên quan:** UC39 · **Pain point:** BP14

#### UC39 — Thẩm định báo cáo hoạt động định kỳ
- **Actor:** ICPDP · **Kết quả:** chấp nhận — báo cáo trở thành đầu vào đánh giá — hoặc trả về
  để sửa. · **Liên quan:** UC38, UC42

#### UC40 — Quản lý hồ sơ vi phạm và tuân thủ
- **Actor:** ICPDP
- **Kích hoạt:** một khiếu nại được leo thang (UC51), một phát hiện từ báo cáo (UC34), một báo
  cáo quá hạn, một ngoại lệ tài chính (UC37), một sự kiện không phép, một lần huỷ booking sát
  giờ (UC47).
- **Vòng đời:** `Open` → `Under Investigation` → `Awaiting Club Response` → `Decision Issued` →
  `Corrective Action` → `Resolved`.
- **Quy tắc:** BR27, BR28 — mỗi hồ sơ ghi lại nguồn gốc của nó, và hồ sơ mở từ một khiếu nại
  liên kết ngược lại khiếu nại đó. Một quyết định phải có lý do và chứng cứ.
- **Liên quan:** UC51, UC34, UC37, UC15, UC42 · **Pain point:** BP12

### M09 — Đánh giá hiệu quả

#### UC41 — Cấu hình scheme đánh giá
- **Actor:** ICPDP
- **Dữ liệu:** các dimension của §17 (D1–D6), trọng số của chúng, ngưỡng cho từng mức xếp loại,
  kỳ áp dụng, và trạng thái kích hoạt.
- **Quy tắc:** BR29 — một scheme không kích hoạt được nếu tổng trọng số không hợp lệ; một scheme
  đang hoạt động và đã được một kỳ đánh giá đã công bố sử dụng thì không bao giờ sửa tại chỗ,
  phải tạo một version mới.
- **Liên quan:** UC42

#### UC42 — Sinh bản nháp đánh giá hiệu quả CLB
- **Actor:** ICPDP
- **Đầu vào:** hoạt động (UC26–UC34), điểm danh (UC32), thành viên (UC21), tài chính (UC37),
  báo cáo (UC39), vi phạm (UC40), phản hồi (UC48), kết quả khiếu nại (UC51), mức tuân thủ về
  booking (UC46, UC47).
- **Xử lý:** áp dụng scheme đang hoạt động từ UC41 → `Evaluation Draft` kèm điểm số và chứng cứ
  phía sau mỗi dimension.
- **Liên quan:** UC41, UC43 · **Pain point:** BP13

#### UC43 — Xem lại, chốt và công bố đánh giá
- **Actor:** ICPDP
- **Luồng:** xem lại dữ liệu nguồn → xử lý các bất thường → thêm các dimension chấm tay được
  phép → chốt → công bố.
- **Quy tắc:** BR30 — một kỳ đánh giá đã công bố không bao giờ được sửa tại chỗ; phải tạo một
  bản sửa hoặc bản chụp mới. · **Liên quan:** UC42

### M11 — Cơ sở vật chất và đặt chỗ

#### UC44 — Quản lý danh mục cơ sở vật chất
- **Actor:** ICPDP
- **Mục tiêu:** Định nghĩa những gì CLB được phép đặt — tiền điều kiện còn thiếu của UC51 trong v1.
- **Dữ liệu:** mã và tên property, loại (phòng, hội trường, thiết bị), sức chứa, vị trí, thiết
  bị đi kèm, khung giờ được đặt, các giai đoạn khoá, trạng thái hoạt động.
- **Quy tắc:** một property còn booking tương lai đã duyệt thì không xoá được, chỉ ngừng kích
  hoạt; việc đổi khung giờ được đặt không bao giờ làm vô hiệu một quyết định đã ra. UCMS chỉ giữ
  những property được mở cho hoạt động CLB và không thay thế hệ thống đặt phòng riêng của trường
  (§5.2).
- **Liên quan:** UC45, UC46

#### UC45 — Gửi yêu cầu đặt cơ sở vật chất
- **Actor:** Club Member có permission `club.booking.manage` (BR54) · **Tiền điều kiện:** CLB đang `Active` (BR34) và người gọi có quyền tương ứng
- **Dữ liệu vào:** property, mục đích, thời điểm bắt đầu và kết thúc, số người dự kiến, thiết bị
  đi kèm, sự kiện liên quan nếu có.
- **Luồng:** chọn một property từ danh mục (UC44) → hệ thống hiển thị tình trạng còn trống →
  nhập thông tin sử dụng → hệ thống đánh giá BR15 → nộp → `Requested`.
- **Thay thế:** lưu ở `Draft`; đính kèm yêu cầu vào một đề xuất sự kiện đang soạn (UC25);
  **sửa và nộp lại** từ `Revision Requested` — chính là luồng đối xứng mà v1 có ở bước 3 của
  UC50 nhưng không bao giờ cấp cho nó một use case.
- **Ngoại lệ:** khung giờ đã có người đặt và chính sách cấm overbooking (BR33); booking kết thúc
  sau học kỳ `Dissolving` của CLB (BR45).
- **Liên quan:** UC25, UC44, UC46 · **Pain point:** BP16

#### UC46 — Thẩm định và quyết định yêu cầu đặt cơ sở vật chất
- **Actor:** ICPDP
- **Luồng:** mở yêu cầu → kiểm tra trạng thái CLB, mục đích, các xung đột và nghĩa vụ quá hạn →
  yêu cầu chỉnh sửa, phê duyệt hoặc từ chối kèm lý do → hệ thống ghi audit, cập nhật trạng thái
  và thông báo cho CMB.
- **Quy tắc:** BR33, BR34, BR35 — một booking đã duyệt khoá khung giờ; CLB bị tạm ngừng không
  nhận booking mới; chỉ ICPDP quyết định.
- **Liên quan:** UC45, UC47, UC26

#### UC47 — Theo dõi và huỷ / trả cơ sở vật chất đã đặt
- **Actor:** Club Member có permission `club.booking.manage` (BR54)
- **Kích hoạt:** sự kiện bị huỷ hoặc đổi lịch (UC28), hoặc CLB không còn cần property đó.
- **Luồng:** mở một booking `Approved` → huỷ kèm lý do → khung giờ được giải phóng → ICPDP được
  thông báo.
- **Quy tắc:** BR35 — một booking mà sự kiện của nó bị huỷ sẽ được giải phóng tự động; một lần
  huỷ nằm trong thời hạn báo trước định nghĩa trong tài liệu chính sách sẽ được ghi nhận là tín hiệu tuân thủ cho UC40.
  Không có nó, một booking đã duyệt sẽ khoá một căn phòng vĩnh viễn.
- **Liên quan:** UC28, UC46, UC40

### M12 — Phản hồi và khiếu nại

#### UC48 — Gửi phản hồi sau sự kiện
- **Actor:** Student · **Tiền điều kiện:** người gọi có một bản ghi điểm danh của sự kiện
- **Dữ liệu vào:** điểm theo từng tiêu chí, nhận xét tự do, tuỳ chọn ẩn danh.
- **Luồng:** mở một sự kiện tôi đã tham dự → điền biểu mẫu → nộp → bản tổng hợp được cập nhật.
- **Quy tắc:** BR36 — mỗi người tham dự một phản hồi cho một sự kiện, nhận từ lúc **check-in**
  cho tới khi window cấu hình được đóng lại; BR37 — phản hồi không bao giờ bị sửa hay xoá, và
  CMB chỉ thấy nó ở dạng tổng hợp; BR40 — không hiển thị bản tổng hợp khi chưa đạt số người phản
  hồi tối thiểu.
- **Vì sao window được dời:** v1 mở nó sau khi chốt điểm danh ở UC32, nên một CLB chốt muộn —
  đúng cái hành vi mà BP08 mô tả — sẽ đẩy tỉ lệ phản hồi về 0 và làm D1, D2 của mô hình đánh giá
  chết đói dữ liệu.
- **Liên quan:** UC31, UC49, UC42 · **Pain point:** BP17

#### UC49 — Xem phản hồi sự kiện
- **Actor:** Club Member có permission `club.feedback.view` (BR54)
- **Luồng:** mở bản tổng hợp của một sự kiện → đọc điểm trung bình theo từng tiêu chí, phân bố
  và các nhận xét → mang kết luận vào báo cáo sau sự kiện (UC33).
- **Quy tắc:** BR37, BR40. Việc ghi lại bài học thuộc về UC33, không phải ở đây.
- **Liên quan:** UC48, UC33, UC42

#### UC50 — Gửi khiếu nại về một CLB
- **Actor:** Student
- **Dữ liệu vào:** CLB, sự kiện liên quan nếu có, loại khiếu nại, mô tả, chứng cứ.
- **Luồng:** chọn CLB hoặc sự kiện → chọn loại → mô tả và đính kèm chứng cứ → nộp → `Submitted`,
  ICPDP nhận một task.
- **Thay thế — rút khiếu nại:** trước khi phân loại ra quyết định → `Withdrawn`.
- **Quy tắc:** BR38 — khiếu nại đi thẳng tới ICPDP; CLB chỉ tiếp cận được sau khi UC51 chuyển
  xuống. Người khiếu nại theo dõi tiến trình qua UC02.
- **Liên quan:** UC51 · **Pain point:** BP18

#### UC51 — Phân loại khiếu nại
- **Actor:** ICPDP
- **Luồng:** mở khiếu nại → phân loại mức độ nghiêm trọng và tính hợp lệ → chọn: `Dismissed`
  (ghi lý do), `Forwarded` (chuyển cho CLB trả lời qua UC52), hoặc `Escalated` (mở một hồ sơ ở
  UC40 và liên kết ngược lại).
- **Quy tắc:** BR39 — mọi quyết định đều mang một lý do và được ghi audit; chỉ ICPDP được bác bỏ
  hoặc leo thang. `Escalated` cần tới UC40.
- **Liên quan:** UC50, UC52, UC40

#### UC52 — Trả lời khiếu nại được chuyển xuống
- **Actor:** Club Member có permission `club.complaint.respond` (BR54)
- **Mục tiêu:** Cho CLB giải trình chính thức — chủ sở hữu mà chuyển trạng thái
  `Forwarded → Club Responded` của v1 chưa từng có.
- **Luồng:** mở khiếu nại được chuyển xuống (danh tính người khiếu nại chỉ hiển thị ở mức chính
  sách cho phép) → nhập phần trả lời và đính kèm chứng cứ → nộp → `Club Responded`; ICPDP đóng
  hoặc leo thang nó qua UC51.
- **Quy tắc:** phải trả lời trong thời hạn định nghĩa trong tài liệu chính sách; quá hạn trả lời là một tín hiệu tuân
  thủ cho UC40. CMB không bao giờ tự sửa hay tự đóng khiếu nại.
- **Liên quan:** UC51, UC40

## 7. Cố ý không phải use case

Những hành vi sau có tồn tại, được đặc tả ở nơi khác, và bị loại khỏi phép đếm dựa trên quy tắc
2 của §2. v1 đã đếm cái đầu tiên và quên phần còn lại.

| Hành vi | Nó nằm ở đâu |
|---|---|
| Phát hiện xung đột sự kiện và booking | BR15, được đánh giá bên trong UC25 và UC45 (v1 từng đếm nó thành UC25) |
| Nhắc hạn và leo thang deadline | §19 + các giá trị cấu hình ở UC04; một bộ lập lịch, không có actor |
| `Upcoming → Ongoing → Completed` của một sự kiện | Scheduler, điều khiển bởi chính mốc giờ của sự kiện (§10) |
| `Approved → In Use → Completed` của một booking | Scheduler, điều khiển bởi chính mốc giờ của booking (§10) |
| `Dissolving → Dissolved` của một CLB, và việc bước vào `Dissolving` | Scheduler, điều khiển bởi lịch học kỳ (UC04) sau một quyết định giải thể ở UC15 |
| Đóng feedback window | Scheduler, theo window cấu hình ở UC04 |
| Gửi và thử lại thông báo, gồm cả Google SMTP | §19, M10; một outbox, không phải mục tiêu của một actor |
| Ghi audit | BR05, xuyên suốt; lịch sử quyết định được *đọc* bên trong mỗi use case thẩm định-và-quyết định |
| Tổng hợp phản hồi | Một khung nhìn trên dữ liệu của UC48, không phải trạng thái của một bản ghi |

## 8. Bản đồ quan hệ

```text
UC01 Đăng nhập
 └─ UC02 Dashboard ── mọi use case đều mở từ đây

CLB:        UC07 Nộp ⇄ UC08 Thẩm định&Quyết định → UC09 Hồ sơ/Cơ cấu
                                                 → UC10 Đề xuất ban → UC11 Xác nhận
                                                 → UC15 Tạm ngừng/Kích hoạt lại/Giải thể
Tuyển TV:   UC06 Khám phá → UC17 Ứng tuyển → UC18 Sàng lọc&Quyết định → UC20 Tiếp nhận → UC21 Trạng thái
                                             ├─ UC19 Đánh giá ứng viên
                                             └─ UC24 Không gian thành viên
                                                UC22 Xin rời → UC21
                                                UC23 Chức vụ
Sự kiện:    UC25 Đề xuất ⇄ UC26 Thẩm định&Quyết định → UC27 Công bố → UC29 Đăng ký → UC31 Check-in
               │  include BR15 xung đột                  └─ UC30 Danh sách chờ
               └─ extend  UC45 Booking                 → UC32 Chốt điểm danh
            UC28 Huỷ/Đổi lịch tác động lên UC27–UC33 và gọi UC47
                                                       → UC33 Báo cáo → UC34 Đóng
Tài chính:  UC26 duyệt ngân sách trong đề xuất → UC35 Giải ngân → UC36 Khoản chi+Chứng từ
                                                      → UC37 Đối soát
Cơ sở VC:   UC44 Danh mục → UC45 Yêu cầu ⇄ UC46 Thẩm định&Quyết định → UC47 Theo dõi/Trả
Báo cáo:    UC38 Nộp → UC39 Thẩm định
Phản hồi:   UC31 Check-in → UC48 Phản hồi → UC49 CMB xem → UC33 Báo cáo
Khiếu nại:  UC50 Gửi → UC51 Phân loại ─┬─ Bác bỏ
                                       ├─ Chuyển xuống → UC52 CLB trả lời
                                       └─ Leo thang → UC40 Hồ sơ → UC15
Đánh giá:   UC41 Scheme → UC42 Bản nháp → UC43 Công bố
            UC42 tiêu thụ UC21, UC32, UC34, UC37, UC39, UC40, UC46, UC47, UC48, UC51
Cấu hình:   UC03 Tài khoản · UC04 Chính sách&Deadline · UC05 đã rút
            cấp dữ liệu cho UC01, UC08, UC26, UC46
```

`⇄` đánh dấu một cặp nộp/thẩm định mà vòng chỉnh sửa của nó là **luồng thay thế của use case
nộp**, không phải một use case riêng.

## 9. Ma trận actor → use case

| Actor | Use case |
|---|---|
| **Student** | UC01, UC02, UC06, UC07, UC17, UC29, UC31, UC48, UC50 |
| **Club Member** (kế thừa Student) | UC22, UC24; và khi có permission (BR54): UC09, UC16, UC18, UC19, UC20, UC21, UC25, UC27, UC28, UC30, UC32, UC33, UC36, UC38, UC45, UC47, UC49, UC52 |
| **Club Leader** (kế thừa Club Member, có mọi permission CLB) | UC10, UC12, UC14, UC23 |
| **ICPDP Officer** | UC01, UC02, UC03, UC04, UC08, UC11, UC13, UC15, UC26, UC34, UC35, UC37, UC39, UC40, UC41, UC42, UC43, UC44, UC46, UC51 |

Dùng chung: UC01 và UC02 (mọi actor, nội dung khác nhau theo vai trò và permission). UC31 có
Student là actor chính và Club Member có `club.attendance.manage` là actor hỗ trợ. **Không use case nào có hai actor chính.**

## 10. Vòng đời thực thể

Mọi chuyển trạng thái đều nêu rõ tác nhân điều khiển. Tác nhân đó là một use case, hoặc một bộ
lập lịch — không bao giờ là "System" mà không giải thích.

### 10.1 Club Application
| Từ → Đến | Tác nhân |
|---|---|
| Draft → Submitted | UC07 |
| Submitted → Under Review | UC08 |
| Under Review → Revision Requested | UC08 |
| Revision Requested → Submitted (version mới) | UC07 alt |
| Under Review → Approved / Rejected | UC08 |
| Submitted / Under Review / Revision Requested → Withdrawn | UC07 alt (rút hồ sơ) |
| Revision Requested → Expired | **Scheduler** (deadline chỉnh sửa đặt ở UC08) |

`Withdrawn` và `Expired` là trạng thái cuối; sau `Expired`, người nộp phải làm hồ sơ mới.

### 10.2 Club
`Pending Setup → Active → Suspended ⇄ Active → Dissolving → Dissolved`
| Từ → Đến | Tác nhân |
|---|---|
| Pending Setup → Active | UC11 (ban chủ nhiệm được xác nhận) |
| Active → Suspended | UC15 |
| Suspended → Active | UC15 |
| Active / Suspended → Dissolving | **Scheduler**, vào đầu học kỳ sau quyết định giải thể ở UC15 |
| Dissolving → Dissolved | **Scheduler**, vào cuối học kỳ đó, trước khi học kỳ kế tiếp bắt đầu |

Một quyết định giải thể ở UC15 không đổi trạng thái nào ngay lập tức: CLB giữ nguyên trạng thái
cho tới học kỳ sau, nên công việc của học kỳ hiện tại chạy tới hết.

`Inactive` **không** được thêm vào: v1 để nó ở dạng tuỳ chọn, và không có gì trong mô hình phân
biệt được nó với `Suspended`. Một CLB ngừng hoạt động thì ở `Suspended` kèm lý do không hoạt động.

### 10.3 Recruitment Campaign
`Draft → Published → Accepting Applications → Screening → Completed`, hoặc `→ Cancelled`.
Tác nhân: UC16 cho `Draft → Published`; scheduler cho việc mở và đóng khung thời gian
(`Accepting Applications`, `Screening`); UC18 cho `Completed`; UC16 cho `Cancelled`.

### 10.4 Recruitment Application
`Draft → Submitted → Screening → Shortlisted → Accepted / Rejected / Waitlisted → Onboarded`.
Tác nhân: UC17, rồi UC18 cho tới quyết định, rồi UC20 cho `Onboarded`.
`Submitted / Screening / Shortlisted → Withdrawn` (trạng thái cuối): UC17 alt, sinh viên rút đơn
trước khi có quyết định.
`Accepted → Declined` (trạng thái cuối): UC20 alt, CMB ghi nhận việc ứng viên từ chối.

### 10.5 Event
| Từ → Đến | Tác nhân |
|---|---|
| Draft → Pending Approval | UC25 |
| Draft → Approved | UC25 alt — sự kiện nội bộ ghi nhận thẳng (BR53) |
| Pending Approval → Under Review | UC26 |
| Under Review → Revision Requested | UC26 |
| Revision Requested → Pending Approval (bản sửa mới) | UC25 alt |
| Under Review → Approved / Rejected | UC26 |
| Approved → Upcoming | UC27 |
| Upcoming → Ongoing | **Scheduler** (giờ bắt đầu) |
| Ongoing → Completed | **Scheduler** (giờ kết thúc) |
| Completed → Report Submitted | UC33 |
| Report Submitted → Closed | UC34 |
| Report Submitted → Completed (báo cáo bị trả về để sửa) | UC34 |
| Completed → Closed | UC32 alt — sự kiện nội bộ ghi nhận thẳng, không có báo cáo (BR53) |
| Approved / Upcoming / Ongoing → Cancelled | UC28, hoặc UC15 / UC40 tác động lên CLB |
| Draft / Pending Approval / Under Review / Revision Requested → Cancelled | UC15 (tạm ngừng, hoặc giải thể theo BR45), hoặc **Scheduler** khi CLB chuyển `Dissolved` |
| Revision Requested → Expired | **Scheduler** (deadline chỉnh sửa đặt ở UC26); là trạng thái cuối, CLB phải nộp đề xuất mới |

`Upcoming` bao trùm toàn bộ khoảng từ lúc công bố tới lúc bắt đầu, bất kể đăng ký đang mở, đã
đóng, hay không dùng tới. `Registration Open` và `Registration Closed` được suy ra từ khung thời
gian đăng ký đặt ở UC27, không phải trạng thái của sự kiện — cùng cách tiếp cận với feedback
window ở §10.11.

### 10.6 Event Budget
Ngân sách là một phần của đề xuất sự kiện (BR22): nháp, chờ duyệt, yêu cầu chỉnh sửa và từ chối là
trạng thái của `Event`. `EventBudget` chỉ được tạo khi UC26 phê duyệt đề xuất có phần ngân sách.

| Từ → Đến | Tác nhân |
|---|---|
| (tạo) → Approved | UC26 phê duyệt đề xuất có phần ngân sách, kèm số tiền duyệt |
| Approved → Disbursed | UC35 — lần tạm ứng đầu tiên, một phần hoặc toàn bộ số duyệt; tạm ứng thêm giữ nguyên `Disbursed` |
| Disbursed → Settlement Submitted | UC36 — CLB nộp quyết toán sau khi sự kiện kết thúc hoặc bị huỷ (BR57) |
| Settlement Submitted → Reconciliation Pending | UC37 A1 (trả về để bổ sung chứng từ) |
| Reconciliation Pending → Settlement Submitted | UC36 (nộp lại quyết toán) |
| Settlement Submitted → Reconciled | UC37 — chi hợp lệ không thấp hơn số đã tạm ứng |
| Settlement Submitted → Recovery Pending | UC37 — chi hợp lệ thấp hơn số đã tạm ứng; chốt số phải hoàn (BR58) |
| Disbursed / Reconciliation Pending → Recovery Pending | UC37 A2 — quá hạn quyết toán (BR57) |
| Reconciled → Closed | UC37 khi chênh lệch bằng 0, hoặc UC35 ghi khoản cấp bù (BR26) |
| Recovery Pending → Closed | UC35 ghi nhận CLB đã hoàn đủ (BR26, BR58) |
| Approved → Cancelled | UC28, hoặc UC15 / UC40 tác động lên CLB, khi sự kiện bị huỷ trước khi tạm ứng |

Không còn trạng thái `Exception`: phần tạm ứng không được chứng minh bằng chi hợp lệ không được
"đóng kèm chênh lệch" nữa mà phải hoàn trả (BR58).

### 10.7 Violation
`Open → Under Investigation → Awaiting Club Response → Decision Issued → Corrective Action → Resolved`.
Tác nhân: UC40 xuyên suốt; bước `Awaiting Club Response → Decision Issued` được mở khoá bởi phần
trả lời của CLB, ghi ở UC40 hoặc UC52.

### 10.8 Evaluation
`Draft → Data Ready → Under Review → Finalized → Published`.
Tác nhân: UC42 tới `Data Ready`, UC43 từ `Under Review` trở đi.

### 10.9 Property Booking
| Từ → Đến | Tác nhân |
|---|---|
| Draft → Requested | UC45 |
| Requested → Under Review | UC46 |
| Under Review → Revision Requested | UC46 |
| Revision Requested → Requested (version mới) | UC45 alt |
| Under Review → Approved / Rejected | UC46 |
| Approved → In Use | **Scheduler** (giờ bắt đầu) |
| In Use → Completed | **Scheduler** (giờ kết thúc) |
| Requested / Approved → Cancelled | UC47 |
| Approved → Released | UC28 qua BR35, hoặc UC47 |

### 10.10 Complaint
| Từ → Đến | Tác nhân |
|---|---|
| — → Submitted | UC50 |
| Submitted → Under Triage | UC51 |
| Under Triage → Dismissed / Forwarded / Escalated | UC51 |
| Forwarded → Club Responded | **UC52** |
| Club Responded → Closed / Escalated | UC51 |
| Escalated → Violation Open | UC40 |
| Submitted / Under Triage → Withdrawn | UC50 alt (trạng thái cuối) |

### 10.11 Event Feedback
`Submitted` — và không có gì khác.

```text
(chưa có bản ghi)  --UC48-->  Submitted   [bất biến]
```

`Window Open` và `Window Closed` của v1 là trạng thái của **sự kiện**, suy ra từ thời điểm
check-in và window cấu hình được (BR36), còn `Aggregated` là một khung nhìn trên các bản ghi đã
nộp, không phải trạng thái của một bản ghi. Bản thân bản ghi chỉ có một trạng thái duy nhất vì
BR37 cấm sửa và cấm xoá.

## 11. Quy tắc nghiệp vụ — chỉ phần thay đổi

BR01–BR39 của §14 vẫn giữ nguyên, với các sửa đổi sau:

| Quy tắc | Thay đổi |
|---|---|
| BR15 | Được phát biểu lại thành chính quy tắc xung đột (vốn là UC25 của v1): *trùng thời gian trên cùng một property, nơi một sự kiện hoặc booking đã duyệt chặn lại, cho kết quả `Blocking Conflict`; trùng nhẹ cho `Warning`; ngưỡng được cấu hình ở UC04.* Được đánh giá bên trong UC25 và UC45. |
| BR16 | **Đã đổi.** Mỗi lần nộp chỉ cần đúng một quyết định của một `ICPDP_OFFICER`; không có cấp duyệt thứ hai hay định tuyến đa cấp. |
| BR19 | Không đổi, nhưng "vai trò đặc biệt" được cấp ở UC03. |
| BR21 | **Mở rộng (I60).** Nghĩa vụ quá hạn gồm báo cáo bắt buộc, quyết toán (BR57) và khoản phải hoàn (BR58); công tắc cưỡng chế chặn đề xuất mới khi còn bất kỳ nghĩa vụ nào quá hạn. (UC25, UC34, UC37, UC39) |
| BR22 | **Đã sửa (I59).** Ngân sách chỉ tồn tại như một phần của đề xuất sự kiện (UC25) và được quyết định cùng đề xuất ở UC26; không có ngân sách tách rời sự kiện. (UC25, UC26) |
| BR23 | Không đổi — và đó chính là lý do UC35 tồn tại: không có số tiền đã giải ngân thì UC37 không tính được gì. Cấp bù (UC35) cũng tính vào tổng này. |
| BR26 | **Đã đổi (I60).** Ngân sách của một sự kiện chỉ đóng khi đã đối soát và chênh lệch tất toán đã được xử lý: cấp bù xong, hoặc CLB đã hoàn đủ. Không còn đóng kèm chênh lệch (`Exception`). (UC35, UC37) |
| BR35 | Không đổi — và đó chính là lý do UC47 tồn tại: không có việc trả chỗ thì một booking đã duyệt khoá một căn phòng vĩnh viễn. |
| BR36 | **Đã đổi.** Feedback window mở tại thời điểm **check-in** của người tham dự (UC31) và đóng sau khi sự kiện kết thúc một khoảng cấu hình được — không phải sau khi chốt điểm danh (UC54 của v1). |
| BR37 | Không đổi. |
| **BR40** | **Mới.** Bản tổng hợp phản hồi chỉ được hiển thị khi số người phản hồi đạt mức tối thiểu cấu hình được; dưới ngưỡng đó chỉ hiển thị việc có tồn tại phản hồi. Không có quy tắc này thì phản hồi "ẩn danh" trong một sự kiện mười người là không ẩn danh. |
| **BR41** | **Mới.** Một property không được xoá khi còn booking tương lai đã duyệt; thay vào đó là ngừng kích hoạt (UC44). |
| **BR42** | **Mới.** Màn hình cấu hình chỉ bao gồm các giá trị liệt kê ở UC04. Mọi giá trị chính sách khác là hằng số định nghĩa trong tài liệu chính sách: điều kiện được lập CLB (UC07); thời gian báo trước tối thiểu của sự kiện (UC25); thời hạn báo trước khi huỷ (UC28, UC47); chính sách đẩy lên từ danh sách chờ (UC30); khung giờ check-in (UC31); yêu cầu chứng từ theo hạng mục chi (BR25); thang phân loại mức độ vi phạm (BR27); các kỳ báo cáo ngoài học kỳ (UC38); các loại khiếu nại (UC50); thời hạn CMB trả lời khiếu nại (UC52); hạn nộp quyết toán sau sự kiện (BR57); hạn hoàn trả khoản bị thu hồi (BR58). |
| **BR43** | **Đã rút.** Nó từng dùng để giữ bản phát hành đầu độc lập với các use case bị hoãn; nay mọi use case ra cùng một bản phát hành. Số hiệu không được dùng lại. |
| **BR44** | **Mới.** Một sự kiện bắt đầu và kết thúc trong cùng một học kỳ của lịch học kỳ (UC04). |
| **BR45** | **Mới.** Khi một CLB đã có quyết định giải thể (UC15), không sự kiện, đề xuất sự kiện hay booking nào của CLB đó được kết thúc sau học kỳ `Dissolving` của nó. UC25 và UC45 từ chối những hồ sơ như vậy; UC15 huỷ những gì đã tồn tại. |
| **BR46** | **Mới.** Sinh viên có tư cách thành viên `Banned` ở một CLB không được nộp đơn vào (UC17) hay được tiếp nhận lại (UC20) vào CLB đó. |
| **BR47** | **Mới, sửa ở I58.** Quyền trong CLB chỉ đến từ một vị trí trong nhiệm kỳ đang hoạt động của CLB đó: (a) ghế Chủ nhiệm đã xác nhận ở UC11 / UC13 → Club Leader, mọi permission CLB; (b) ghế tạm của người đứng đơn (UC08) → quyền leader chỉ cho UC09, UC10, UC23 khi CLB `Pending Setup`; (c) một ghế ban chủ nhiệm khác đã xác nhận (UC11 / UC13) hoặc một role được gán ở UC23 → đúng các permission của role đó. UC03 không bao giờ cấp quyền CLB. (UC01, UC03, UC08, UC11, UC13, UC23) |
| **BR48** | **Mới.** Mỗi sinh viên có tối đa một đăng ký cho mỗi sự kiện. (UC29) |
| **BR49** | **Mới.** Người dùng chỉ thấy và thao tác trên các CLB mà họ có tư cách thành viên hoặc chức vụ trong nhiệm kỳ đang hoạt động; ICPDP thấy mọi CLB. (UC02, UC23, UC24) |
| **BR50** | **Mới.** `Registration Open` / `Registration Closed` suy ra từ registration window đặt ở UC27, không bao giờ lưu thành trạng thái của sự kiện. (UC27, UC29) |
| **BR51** | **Mới.** Một scheme đánh giá đã được dùng thì bị khoá; muốn thay đổi phải tạo version mới, và kỳ đánh giá dùng version có hiệu lực cho kỳ đó. (UC41, UC42) |
| **BR52** | **Mới.** Thành viên đang giữ một ghế ban chủ nhiệm đã xác nhận phải được thay qua UC10/UC11 trước khi tư cách thành viên của họ kết thúc. (UC21, UC22) |
| **BR53** | **Mới.** Sự kiện `Internal` (chỉ thành viên CLB) không có phần ngân sách được ghi nhận, không xin duyệt: UC25 chuyển thẳng `Draft → Approved` và ghi audit; ICPDP xem mọi sự kiện như vậy ở UC02; không cần báo cáo sau sự kiện, sự kiện đóng khi chốt điểm danh ở UC32. Có phần ngân sách thì đi đường UC26; booking luôn do UC46 quyết định. (UC02, UC25, UC26, UC27, UC32, UC33) |
| **BR54** | **Mới (I58).** Mỗi use case vận hành CLB kiểm tra người gọi có permission tương ứng trong CLB đó (bảng permission → use case ở SRS §2.3); thiếu quyền thì từ chối. Một thành viên giữ nhiều role có quyền là hợp các permission của các role; Club Leader có mọi permission CLB. (UC09, UC16, UC18–UC21, UC25, UC27, UC28, UC30, UC32, UC33, UC36, UC38, UC45, UC47, UC49, UC52) |
| **BR55** | **Mới (I58), sửa ở lần 2.** Danh mục permission CLB là cố định, do hệ thống định nghĩa; Club Leader chỉ chọn từ danh mục đó. Bốn quyền giữ riêng của leader — `club.role.manage`, `club.board.nominate`, `club.transition.plan`, `club.suspension.request` — không cấp được cho role nào. Cơ cấu role ban đầu được ICPDP thẩm định cùng hồ sơ thành lập (UC07 / UC08); sau đó Club Leader sửa cơ cấu ở UC23 không cần ICPDP xác nhận, trừ role ban điều hành: người giữ chỉ đến từ UC10 / UC11 / UC13 và việc thêm / bỏ role ban điều hành chỉ đi qua chuyển giao UC12 / UC13. Mọi thay đổi được ghi audit và ICPDP xem được. (UC07, UC08, UC10, UC11, UC12, UC13, UC23) |
| **BR56** | **Mới (I58, lần 2).** Cơ cấu role của CLB được **đánh phiên bản**: phiên bản 1 là cơ cấu được duyệt ở UC08; mỗi thay đổi ở UC23 hoặc UC13 tạo một phiên bản mới có ngày hiệu lực và không bao giờ ghi đè phiên bản trước. Mỗi CLB luôn có role Chủ nhiệm (cố định) và role Members (mặc định, không xoá được, tự gán cho mọi thành viên ở UC20). ICPDP xem được mọi phiên bản cơ cấu và lịch sử người giữ role ban điều hành theo nhiệm kỳ. (UC02, UC07, UC08, UC13, UC20, UC23) |
| **BR57** | **Mới (I60).** Ngân sách đã tạm ứng phải được CLB quyết toán (UC36) — đủ khoản chi và chứng từ — trong một thời hạn định nghĩa trong tài liệu chính sách, tính từ lúc sự kiện kết thúc hoặc bị huỷ. Quá hạn là nghĩa vụ quá hạn theo BR21, và ICPDP được chốt đối soát trên các khoản chi đã có chứng từ (UC37 A2). (UC36, UC37) |
| **BR58** | **Mới (I60).** Phần đã tạm ứng không được chứng minh bằng chi hợp lệ — số dư chưa chi, khoản chi thiếu chứng từ hoặc bị loại — bị thu hồi: CLB phải hoàn trong thời hạn định nghĩa trong tài liệu chính sách; ICPDP ghi nhận tiền hoàn ở UC35. Quá hạn là nghĩa vụ quá hạn theo BR21 và là căn cứ mở hồ sơ vi phạm ở UC40. (UC35, UC37, UC40) |

## 12. Phạm vi phát hành

Có 52 mã use case, trong đó 51 use case còn hiệu lực và UC05 đã rút. MVP của v1 (§22) nêu 30–34 use case nhưng lại bao gồm
những luồng mà phụ thuộc của chúng đã bị hoãn; việc nhóm theo vòng lặp tránh được điều đó.

| Vòng lặp | Use case |
|---|---|
| Truy cập & cấu hình | UC01, UC02, UC03, UC04; UC05 đã rút |
| Thành lập & quản trị CLB | UC06, UC07, UC08, UC09, UC10, UC11, UC12, UC13, UC14, UC15 |
| Tuyển thành viên → thành viên | UC16, UC17, UC18, UC19, UC20, UC21, UC22, UC23, UC24 |
| Duyệt → công bố sự kiện | UC25, UC26, UC27, UC28 |
| Đăng ký → điểm danh | UC29, UC30, UC31, UC32 |
| Trách nhiệm sau sự kiện | UC33, UC34 |
| Tài chính | UC35, UC36, UC37 |
| Báo cáo định kỳ | UC38, UC39 |
| Governance intelligence | UC40, UC41, UC42, UC43 |
| Cơ sở vật chất | UC44, UC45, UC46, UC47 |
| Phản hồi & khiếu nại | UC48, UC49, UC50, UC51, UC52 |

Mỗi vòng lặp đều khép kín: không có gì kết thúc ở một trạng thái mà không use case nào rời đi được.

### Thứ tự build và demo

Không cắt use case nào: cả 52 use case ra trong một bản phát hành. Priority (High / Medium / Low)
chỉ là thứ tự build và demo — build trọn từng vòng lặp, không bao giờ làm nửa vòng, vòng High
trước rồi tới Medium, Low.

## 13. Truy vết — pain point → use case

| BP | Use case | Mức phủ |
|---|---|---|
| BP01 trạng thái CLB không tập trung | UC02, UC15 | đầy đủ — câu trả lời là dashboard, không phải lệnh tạm ngừng |
| BP02 số thành viên không chính xác | UC20, UC21, UC24 | đầy đủ |
| BP03 lịch sử ban chủ nhiệm và nhiệm kỳ | UC10, UC11, UC12, UC13 | đầy đủ — lịch sử được ghi lại; UC12 và UC13 gánh phần chuyển giao |
| BP04 hồ sơ thành lập phân tán | UC07, UC08 | đầy đủ |
| BP05 không có workflow sự kiện | UC25, UC26, UC27 | đầy đủ |
| BP06 không phát hiện trùng lịch | BR15 bên trong UC25 và UC45 | đầy đủ — là một quy tắc, luôn bật, không phải use case có thể hoãn |
| BP07 đăng ký tách rời sự kiện | UC29, UC31, UC32 | đầy đủ |
| BP08 sự kiện có thực sự diễn ra không | UC33, UC34 | đầy đủ |
| BP09 ngân sách không liên kết end-to-end | UC25, UC26, UC35–UC37 | đầy đủ |
| BP10 không phát hiện được chi vượt | UC35, UC36, UC37 | đầy đủ |
| BP11 tuyển thành viên không liên kết | UC16, UC17, UC18, UC20 | đầy đủ |
| BP12 không có lịch sử tuân thủ | UC34, UC40 | đầy đủ — một phát hiện trên báo cáo mở ra một hồ sơ |
| BP13 đánh giá thủ công | UC41, UC42, UC43 | đầy đủ — kỳ đánh giá đầu tiên cần trọn một kỳ dữ liệu |
| BP14 nhắc deadline thủ công | UC04 + scheduler (§19), hiển thị ở UC02 | đầy đủ |
| BP15 không có audit trail | BR05 xuyên suốt; được đọc bên trong UC08, UC26, UC46 | đầy đủ, không cần use case riêng |
| BP16 mượn cơ sở vật chất qua email | UC44, UC45, UC46, UC47 | đầy đủ |
| BP17 phản hồi không có cấu trúc | UC48, UC49 | đầy đủ |
| BP18 không có kênh khiếu nại | UC50, UC51, UC52 | đầy đủ |
| BP19 phải nhớ thêm mật khẩu | UC01 | đầy đủ |

Mọi pain point đều được phủ. v1 truy vết BP03, BP06, BP12 và BP13 tới những use case mà chính nó
đã đẩy sang V2.

## 14. Các quyết định còn mở của nhóm

**D1 đã chốt ngày 2026-10-08:** chỉ có `ICPDP_OFFICER`, mỗi lần nộp chỉ duyệt một lần; UC05
đã rút.

| # | Quyết định | Vì sao không thể mặc định ở đây |
|---|---|---|
| D2 | Những giá trị nào của §14 trở nên sửa được ngoài danh sách của UC04? | Mỗi giá trị thêm vào tốn một màn hình, một schema và một đường validate; danh sách phải đến từ quy trình thật của ICPDP. |
| D3 | Số người phản hồi tối thiểu ban đầu cho BR40 (ICPDP có thể đổi sau ở UC04). | Đây là một con số chính sách, không phải con số kỹ thuật. Năm là mức sàn phổ biến. |
| D4 | Một sự kiện đổi lịch có cần một quyết định mới từ UC26, hay chỉ cần thông báo? | Phụ thuộc vào cách ICPDP thực sự xử lý một thay đổi thời gian. |
| D5 | UC52 có hiển thị danh tính người khiếu nại cho CMB không? | Đây là một quy tắc riêng tư mà nhà trường phải đặt ra; mô hình hỗ trợ cả hai hướng. |

## 15. Context diagram — luồng dữ liệu → use case

[`../03-diagrams/UCMS_Context_Diagram_v2.1.drawio`](../03-diagrams/UCMS_Context_Diagram_v2.1.drawio)
tuân theo một quy tắc: mọi luồng đều được tạo ra hoặc tiêu thụ bởi ít nhất một use case, và mọi
use case có dữ liệu đi qua biên hệ thống đều xuất hiện trong ít nhất một luồng. Một luồng gom
các dữ liệu cùng loại, nên những use case đứng sau nó được liệt kê ở đây chứ không vẽ lên sơ đồ.

| Từ → Đến | Luồng dữ liệu | Use case |
|---|---|---|
| Student → Hệ thống | Club establishment application | UC07 (gồm cơ cấu role dự kiến) |
| Student → Hệ thống | Membership application | UC17 |
| Student → Hệ thống | Event registration, check-in & feedback | UC29, UC31, UC48 |
| Student → Hệ thống | Club complaint | UC50 |
| Hệ thống → Student | Club & event information | UC06 |
| Hệ thống → Student | Student profile | UC01, UC02 |
| Hệ thống → Student | Application & registration results | UC08, UC18, UC20, UC29, UC30 |
| Hệ thống → Student | Complaint outcome | UC51 |
| Club Member → Hệ thống | Club profile & membership data | UC09, UC16, UC18, UC19, UC20, UC21 |
| Club Member → Hệ thống | Event proposals & internal events | UC25 (gồm ngân sách sự kiện và sự kiện nội bộ theo BR53), UC27, UC28, UC30, UC32 |
| Club Member → Hệ thống | Event & periodic reports | UC33, UC38 |
| Club Member → Hệ thống | Expenses | UC36 |
| Club Member → Hệ thống | Property booking requests | UC45, UC47 |
| Club Member → Hệ thống | Complaint response | UC52 |
| Club Member → Hệ thống | Leave request | UC22 |
| Hệ thống → Club Member | Member workspace | UC24 |
| Hệ thống → Club Member | Member applications & event registrations | UC17 → UC18, UC29 → UC30, UC32 |
| Hệ thống → Club Member | Review decisions & disbursements | UC26, UC34, UC35, UC39, UC46 |
| Hệ thống → Club Member | Event feedback & forwarded complaints | UC49, UC51 → UC52 |
| Hệ thống → Club Member | Violation notices & evaluation results | UC40, UC43 |
| Hệ thống → Club Member | Deadline reminders | UC04 + scheduler |
| Club Leader → Hệ thống | Leadership & suspension requests | UC10, UC12, UC14 |
| Club Leader → Hệ thống | Club roles & permissions | UC23 (phiên bản cơ cấu mới, BR56) |
| Hệ thống → Club Leader | Leadership & club status decisions | UC11, UC13, UC15 |
| ICPDP → Hệ thống | System configuration | UC03, UC04, UC41, UC44 |
| ICPDP → Hệ thống | Review decisions | UC08, UC11, UC13, UC26, UC34, UC39, UC46 |
| ICPDP → Hệ thống | Club status & violation decisions | UC15, UC40 |
| ICPDP → Hệ thống | Disbursements & reconciliation | UC35, UC37 |
| ICPDP → Hệ thống | Complaint triage | UC51 |
| ICPDP → Hệ thống | Evaluation scoring | UC43 |
| Hệ thống → ICPDP | Submissions for review | UC07 → UC08, UC10 → UC11, UC12 → UC13, UC14 → UC15, UC25 → UC26, UC33 → UC34, UC36 → UC37, UC38 → UC39, UC45 → UC46 |
| Hệ thống → ICPDP | Club complaints | UC50 → UC51 |
| Hệ thống → ICPDP | Internal event records | UC25 (BR53) → UC02 |
| Hệ thống → ICPDP | Club statistics & evaluation draft | UC02, UC42 |
| Hệ thống → ICPDP | Club role structure & board history | UC02 (phiên bản cơ cấu và lịch sử ban điều hành của mọi CLB; BR56) |
| Hệ thống → Google OAuth | Authentication request | UC01 |
| Google OAuth → Hệ thống | Identity data | UC01 |
| Hệ thống → Google SMTP | Email message | mọi thông báo có kênh email (§8.2) |
| Hệ thống → Cloudinary | Image file | mọi UC có tải ảnh lên |
| Cloudinary → Hệ thống | Image URL | mọi UC có tải ảnh lên |

`A → B` ở cột cuối nghĩa là luồng đó mang thứ mà use case A nộp lên cho actor của use case B.
