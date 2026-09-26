# UCMS — Use Case Model v2 (bản sửa đổi)

> **Trạng thái:** bản sửa đổi của §8–§11, §14–§15, §21–§22 trong
> [`UCMS_Business_System_Analysis.md`](../01-business-analysis/UCMS_Business_System_Analysis.md).
> Các mục đó vẫn được giữ nguyên làm lịch sử; khi hai bên nói khác nhau, **lấy theo tài liệu này**.
> Những mục không liệt kê ở đây (§1–§7, §12–§13, §16–§20, §23–§24) không thay đổi và vẫn còn hiệu lực.

> **Sơ đồ:** mô hình này được vẽ trong [`../03-diagrams/UCMS_UseCase_ByActor.drawio`](../03-diagrams/UCMS_UseCase_ByActor.drawio) (draw.io), phủ UC01–UC54.
> Biên hệ thống được vẽ trong [`../03-diagrams/UCMS_Context_Diagram_v2.drawio`](../03-diagrams/UCMS_Context_Diagram_v2.drawio); §15 ánh xạ từng luồng dữ liệu của nó tới use case.

**Tổng: 54 business use case** — 45 use case mang sang từ 57 use case của v1, thêm mới 9.
Actor và module không đổi: 3 actor, 2 hệ thống ngoài, 12 module.

---

## 1. Vì sao mô hình thay đổi

v1 đếm được 57 use case. Vấn đề không nằm ở con số, mà ở cách cấu thành.

| Khiếm khuyết trong v1 | Bằng chứng | Cách sửa trong v2 |
|---|---|---|
| Một phiên thẩm định bị tách thành 3 use case | UC03+UC04+UC06, UC26+UC27+UC29, UC39+UC41 — cùng actor, cùng thực thể, cùng màn hình. UC52 thì đã gộp cả ba cho việc đặt cơ sở vật chất | Mỗi lần phê duyệt là một use case `Thẩm định và quyết định` duy nhất, với `Yêu cầu chỉnh sửa` là một kết quả của nó |
| Việc nộp lại được mô hình hoá thành use case riêng | UC05, UC28, UC40 — cùng actor và cùng biểu mẫu với lần nộp đầu, chỉ khác tiền điều kiện | Trở thành luồng thay thế của chính use case nộp |
| Một chức năng hệ thống bị đếm như use case | UC25 `Phát hiện xung đột sự kiện`, actor chính ghi là `System/CMB` | Trở thành quy tắc nghiệp vụ BR15, được gọi bên trong UC25 và UC47 (đánh số v2) |
| Use case có hai actor chính | UC23, UC25, UC33, UC35, UC45 — vi phạm chính §1.3 của v1 "actor chịu trách nhiệm rõ ràng" | Mỗi use case một actor chính; actor thứ hai trở thành actor hỗ trợ hoặc thành use case riêng |
| Thiếu các use case cấu hình | UC51 đọc một danh mục cơ sở vật chất mà không ai duy trì; BR29 kiểm tra một scheme mà không ai cấu hình; Feature nổi bật 1 hoàn toàn không có use case | Thêm UC04, UC05, UC43, UC46 |
| Thiếu các use case đọc dữ liệu | §3 và §4 coi "khám phá CLB" và "theo dõi trạng thái đơn" là trách nhiệm của Student; §18 đặc tả ba dashboard — không cái nào có use case | Thêm UC02, UC06 |
| Tư cách thành viên không tạo ra thứ gì | Sau khi được tiếp nhận, use case của một thành viên giống hệt của người không phải thành viên | Thêm UC24 |
| Một trạng thái vòng đời không có ai sở hữu | §15.10 giao `Forwarded → Club Responded` cho CMB dưới UC57, nhưng UC57 lại thuộc về ICPDP theo §8.7 và §11 | Thêm UC54 |
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

Không đổi so với §4: **Student**, **Club Management Board (CMB)**, **ICPDP Officer**, cộng thêm
Google OAuth và Google SMTP với tư cách hệ thống ngoài.

Hai mâu thuẫn của v1 quanh mô hình actor được giải quyết tại đây:

- **Không đưa `ICPDP Head` vào làm actor; duyệt đa cấp vẫn nằm trong nội bộ ICPDP.**
  v1 vừa tuyên bố chỉ có một cấp phê duyệt (BR31) vừa mô tả một nút phê duyệt thứ hai bên trong
  ICPDP ở BR16 và Feature nổi bật 1. Cả hai cùng đúng được: UC05 định tuyến một hồ sơ lên cấp
  thứ hai, và mọi cấp đều do một ICPDP Officer thực hiện, nên ICPDP vẫn là cấp phê duyệt duy
  nhất. Việc cấp thứ hai là một quyền RBAC hay là một actor thứ tư là quyết định còn mở D1 (§14).
- **"Thủ quỹ" là một vai trò RBAC, không phải actor.** v1 ghi actor của UC43 là
  `CMB/Treasurer`; v2 ghi CMB ở mọi nơi và để việc chia vai trò cho RBAC, đúng như §4 vốn đã có ý.

## 4. Danh sách use case tổng hợp

### M01 — Định danh, truy cập và cấu hình

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC01 | Xác thực qua Google OAuth và vào workspace theo vai trò | Tất cả | Truy cập mà không cần mật khẩu nội bộ |
| UC02 | Mở dashboard theo vai trò của tôi | Tất cả | Thấy việc gì cần mình, và hồ sơ mình nộp giờ ra sao |
| UC03 | Quản lý tài khoản và gán vai trò | ICPDP | Cấp, thu hồi và khoá quyền truy cập |
| UC04 | Cấu hình chính sách và deadline của nhà trường | ICPDP | Đổi quy tắc mà không cần sửa code |
| UC05 | Cấu hình quy tắc định tuyến phê duyệt | ICPDP | Định tuyến theo loại hồ sơ, số tiền và mức rủi ro |

### M02 / M03 — Vòng đời CLB, quản trị và nhiệm kỳ

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC06 | Khám phá CLB và hoạt động đang mở | Student | Tìm được một CLB đáng tham gia |
| UC07 | Nộp hồ sơ đề nghị thành lập CLB | Student | Đề xuất một CLB mới |
| UC08 | Thẩm định và quyết định hồ sơ thành lập CLB | ICPDP | Kiểm tra, yêu cầu chỉnh sửa, phê duyệt hoặc từ chối |
| UC09 | Cấu hình hồ sơ và cơ cấu tổ chức CLB | CMB | Thiết lập thông tin vận hành và các đơn vị nội bộ |
| UC10 | Đề xuất ban chủ nhiệm CLB | CMB | Đề cử bộ máy lãnh đạo cho một nhiệm kỳ |
| UC11 | Xác nhận ban chủ nhiệm | ICPDP | Trao quyền quản lý |
| UC12 | Lập kế hoạch chuyển giao nhiệm kỳ | CMB | Chuẩn bị bàn giao kèm các nghĩa vụ của nó |
| UC13 | Xác nhận chuyển giao nhiệm kỳ | ICPDP | Chuyển giao quyền một cách an toàn |
| UC14 | Yêu cầu tạm ngừng hoạt động CLB | CMB | Tạm dừng hoạt động một cách hợp thức |
| UC15 | Tạm ngừng, kích hoạt lại hoặc giải thể CLB | ICPDP | Kiểm soát vòng đời CLB |

### M04 — Tuyển thành viên và quản lý thành viên

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC16 | Tạo và công bố đợt tuyển thành viên | CMB | Tuyển thành viên |
| UC17 | Nộp đơn ứng tuyển vào CLB | Student | Ứng tuyển vào một đợt tuyển |
| UC18 | Sàng lọc và quyết định đơn ứng tuyển | CMB | Rút gọn danh sách, nhận, từ chối hoặc đưa vào danh sách chờ |
| UC19 | Ghi nhận đánh giá ứng viên | CMB | Chấm theo một rubric |
| UC20 | Tiếp nhận ứng viên trúng tuyển | CMB | Tạo tư cách thành viên |
| UC21 | Quản lý trạng thái thành viên | CMB | Giữ danh sách thành viên đúng thực tế, kể cả khi loại thành viên |
| UC22 | Xin rời CLB | Student | Tự kết thúc tư cách thành viên của mình |
| UC23 | Phân công chức vụ trong CLB | CMB | Phân quyền nội bộ |
| UC24 | Sử dụng không gian thành viên của tôi | Student | Nhận được giá trị từ việc là thành viên |

### M05 — Sự kiện và hoạt động

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC25 | Nộp đề xuất tổ chức sự kiện | CMB | Xin phép tổ chức một sự kiện |
| UC26 | Thẩm định và quyết định đề xuất sự kiện | ICPDP | Kiểm tra, yêu cầu chỉnh sửa, phê duyệt hoặc từ chối |
| UC27 | Công bố sự kiện và mở đăng ký | CMB | Cho phép tham gia |
| UC28 | Huỷ hoặc đổi lịch sự kiện | CMB | Xử lý một thay đổi cùng mọi hệ quả của nó |

### M06 — Đăng ký và điểm danh

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC29 | Đăng ký tham gia sự kiện | Student | Giữ một chỗ |
| UC30 | Quản lý sức chứa và danh sách chờ | CMB | Kiểm soát số người vượt trên mức trần cứng |
| UC31 | Check-in vào sự kiện | Student | Chứng minh mình đã tham dự |
| UC32 | Chốt điểm danh sự kiện | CMB | Tạo ra bộ dữ liệu điểm danh chính thức |

### M08 — Trách nhiệm giải trình sau sự kiện

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC33 | Nộp báo cáo sau sự kiện | CMB | Khép vòng trách nhiệm giải trình |
| UC34 | Thẩm định và đóng báo cáo sự kiện | ICPDP | Kết thúc vòng đời của sự kiện |

### M07 — Tài chính và ngân sách

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC35 | Gửi yêu cầu ngân sách | CMB | Xin kinh phí |
| UC36 | Thẩm định và quyết định yêu cầu ngân sách | ICPDP | Kiểm tra, yêu cầu sửa, duyệt hoặc từ chối |
| UC37 | Ghi nhận giải ngân | ICPDP | Theo dõi số tiền thực sự được cấp |
| UC38 | Ghi nhận khoản chi kèm chứng từ | CMB | Theo dõi và chứng minh chi tiêu |
| UC39 | Đối soát ngân sách và chi tiêu | ICPDP | Xác lập trách nhiệm giải trình |

### M08 — Báo cáo và tuân thủ

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC40 | Nộp báo cáo hoạt động định kỳ | CMB | Hoàn thành nghĩa vụ báo cáo |
| UC41 | Thẩm định báo cáo hoạt động định kỳ | ICPDP | Xác nhận để dùng làm đầu vào đánh giá |
| UC42 | Quản lý hồ sơ vi phạm và tuân thủ | ICPDP | Kiểm soát tuân thủ kèm vết xử lý |

### M09 — Đánh giá hiệu quả

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC43 | Cấu hình scheme đánh giá | ICPDP | Định nghĩa dimension, trọng số và ngưỡng |
| UC44 | Sinh bản nháp đánh giá hiệu quả CLB | ICPDP | Biến dữ liệu vận hành thành dữ liệu quản trị |
| UC45 | Xem lại, chốt và công bố đánh giá | ICPDP | Công bố một kết quả chính thức |

### M11 — Cơ sở vật chất và đặt chỗ

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC46 | Quản lý danh mục cơ sở vật chất | ICPDP | Định nghĩa những gì được phép đặt |
| UC47 | Gửi yêu cầu đặt cơ sở vật chất | CMB | Xin một phòng hoặc thiết bị |
| UC48 | Thẩm định và quyết định yêu cầu đặt cơ sở vật chất | ICPDP | Cấp phát nguồn lực có kiểm soát |
| UC49 | Theo dõi và huỷ / trả cơ sở vật chất đã đặt | CMB | Giải phóng thứ không còn cần |

### M12 — Phản hồi và khiếu nại

| ID | Use case | Actor | Mục tiêu nghiệp vụ |
|---|---|---|---|
| UC50 | Gửi phản hồi sau sự kiện | Student | Phản ánh trải nghiệm của người tham dự |
| UC51 | Xem phản hồi sự kiện | CMB | Cải thiện chất lượng hoạt động |
| UC52 | Gửi khiếu nại về một CLB | Student | Khiếu nại vượt ra ngoài phạm vi CLB |
| UC53 | Phân loại khiếu nại | ICPDP | Bác bỏ, chuyển xuống hoặc leo thang, kèm lý do |
| UC54 | Trả lời khiếu nại được chuyển xuống | CMB | Giải trình chính thức, có ghi nhận |

**Tổng:** 5 + 10 + 9 + 4 + 4 + 2 + 5 + 3 + 3 + 4 + 5 = **54**.

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
| UC25 | — | xoá; trở thành BR15, được gọi bởi UC25 và UC47 |
| UC26, UC27, UC29 | UC26 | gộp thành một use case thẩm định-và-quyết định |
| UC28 | UC25 | luồng thay thế |
| UC30 | UC27 | — |
| UC31 | UC29 | — |
| UC32 | UC30 | — |
| UC33 | UC31 | actor chính giờ chỉ còn Student; CMB check-in thủ công là luồng thay thế |
| UC34 | UC32 | — |
| UC35 | UC28 | actor chính giờ chỉ còn CMB; việc ICPDP buộc huỷ đi qua UC15 hoặc UC42 |
| UC36 | UC33 | — |
| UC37 | UC34 | — |
| UC38 | UC35 | hấp thụ UC40 |
| UC39, UC41 | UC36 | gộp thành một use case thẩm định-và-quyết định |
| UC40 | UC35 | luồng thay thế |
| UC42 | UC37 | — |
| UC43, UC44 | UC38 | gộp (chứng từ luôn tham chiếu tới một khoản chi) |
| UC45 | UC39 | actor chính giờ chỉ còn ICPDP; CMB đọc cùng bộ số liệu qua UC02 |
| UC46 | UC40 | — |
| UC47 | UC41 | — |
| UC48 | UC42 | — |
| UC49 | UC44 | — |
| UC50 | UC45 | — |
| UC51 | UC47 | hấp thụ "sửa và nộp lại booking" thành luồng thay thế |
| UC52 | UC48 | — |
| UC53 | UC49 | — |
| UC54 | UC50 | feedback window nay mở tại lúc check-in, không phải sau khi chốt điểm danh (BR36) |
| UC55 | UC51 | đổi tên: CMB xem phản hồi; việc ghi lại bài học diễn ra ở UC33 |
| UC56 | UC52 | — |
| UC57 | UC53 | nửa phần CLB trả lời trở thành UC54 |
| *mới* | UC02 | Mở dashboard theo vai trò (§18 không có use case) |
| *mới* | UC03 | Quản lý tài khoản và gán vai trò ("tài khoản bị khoá" của UC01 không có ai sở hữu) |
| *mới* | UC04 | Cấu hình chính sách và deadline (~20 quy tắc ghi "cấu hình được") |
| *mới* | UC05 | Cấu hình quy tắc định tuyến phê duyệt (Feature nổi bật 1) |
| *mới* | UC06 | Khám phá CLB và hoạt động đang mở (trách nhiệm của Student theo §4) |
| *mới* | UC24 | Sử dụng không gian thành viên (tư cách thành viên không có người tiêu thụ) |
| *mới* | UC43 | Cấu hình scheme đánh giá (BR29) |
| *mới* | UC46 | Quản lý danh mục cơ sở vật chất (UC51 của v1 đọc một danh mục không ai duy trì) |
| *mới* | UC54 | Trả lời khiếu nại được chuyển xuống (trạng thái ở §15.10 không có actor) |

## 6. Đặc tả chi tiết — bản rút gọn

> **Đặc tả đầy đủ:** [`UCMS_UseCase_Specification_v2.md`](UCMS_UseCase_Specification_v2.md)
> chứa cả 54 use case theo mẫu §9 của bản phân tích — actor, mục tiêu, điều kiện kích hoạt,
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
- **Ngoại lệ:** domain không được phép → từ chối; tài khoản bị khoá ở UC03 → từ chối và ghi
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
    ngân sách chưa đối soát, hồ sơ đang mở.
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
  trò ICPDP hoặc CMB → khoá hoặc mở khoá tài khoản kèm lý do → hệ thống ghi audit thay đổi.
- **Quy tắc:** tài khoản bị khoá sẽ bị từ chối ở UC01; vai trò CMB cấp ở đây là thứ cấp so với
  ban chủ nhiệm được xác nhận ở UC11 và bị thu hồi tự động khi một nhiệm kỳ đóng lại (UC13);
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
  viết lại một quyết định đã ra. **Màn hình cấu hình chỉ phơi ra đúng danh sách này** — mọi quy
  tắc "cấu hình được" khác trong §14 sẽ nằm dưới dạng hằng số trong một tài liệu chính sách và
  chỉ trở nên sửa được khi có nhu cầu thật (§14, quyết định còn mở D2).
- **Liên quan:** UC01, UC07, UC25, UC33, UC40, UC47, UC50

#### UC05 — Cấu hình quy tắc định tuyến phê duyệt
- **Actor:** ICPDP
- **Mục tiêu:** Quyết định hồ sơ nào cần cấp duyệt thứ hai trong nội bộ ICPDP.
- **Dữ liệu:** loại hồ sơ, ngưỡng số tiền, mức rủi ro sự kiện, hạng cơ sở vật chất, lịch sử tuân
  thủ của CLB → cấp duyệt yêu cầu và SLA.
- **Quy tắc:** đây chính là use case mà Feature nổi bật 1 còn thiếu. Nó là thứ làm BR16 cưỡng
  chế được: một hồ sơ không khớp rule nào thì được quyết định ở một cấp duy nhất.
- **Liên quan:** UC08, UC26, UC36, UC48

### M02 / M03 — Vòng đời CLB, quản trị và nhiệm kỳ

#### UC06 — Khám phá CLB và hoạt động đang mở
- **Actor:** Student
- **Mục tiêu:** Tìm được một CLB và một đợt tuyển hoặc sự kiện đáng tham gia.
- **Luồng:** duyệt hoặc tìm CLB đang hoạt động theo lĩnh vực và từ khoá → mở trang CLB (hồ sơ,
  ban chủ nhiệm, lịch sử hoạt động, đợt tuyển đang mở, sự kiện công khai sắp tới) → đi tiếp sang
  UC17 hoặc UC29.
- **Quy tắc:** chỉ liệt kê CLB `Active`; CLB `Suspended` vẫn thấy được nhưng có đánh dấu và
  không hiện đợt tuyển nào (BR09); CLB `Dissolved` không được liệt kê.
- **Liên quan:** UC17, UC29, UC16, UC27

#### UC07 — Nộp hồ sơ đề nghị thành lập CLB
- **Actor:** Student
- **Mục tiêu:** Đề xuất một CLB mới qua một quy trình chuẩn.
- **Luồng:** nhập tên, lĩnh vực và mục tiêu → khai báo thành viên sáng lập → tải lên các tài
  liệu bắt buộc (BR02) → hệ thống validate → xác nhận → hệ thống tạo version 1 → `Submitted` →
  ICPDP nhận một review task.
- **Thay thế — nộp lại (UC05 của v1):** từ `Revision Requested`, người nộp sửa và nộp lại; hệ
  thống tạo một **version mới** và đưa hồ sơ về `Submitted`.
- **Thay thế:** lưu ở trạng thái `Draft`.
- **Thay thế — rút hồ sơ:** trước khi có quyết định, người nộp rút hồ sơ → `Withdrawn`.
- **Ngoại lệ:** thiếu một tài liệu bắt buộc; số thành viên sáng lập ít hơn mức BR03 cho phép.
- **Quy tắc:** BR02, BR03, BR04 — một version đã nộp không bao giờ bị ghi đè.
- **Liên quan:** UC08 · **Pain point:** BP04

#### UC08 — Thẩm định và quyết định hồ sơ thành lập CLB
- **Actor:** ICPDP
- **Mục tiêu:** Một phiên thẩm định duy nhất kết thúc bằng một trong ba kết quả.
- **Tiền điều kiện:** hồ sơ đang ở `Submitted`.
- **Luồng:** mở hồ sơ → kiểm tra thông tin CLB, thành viên sáng lập, tài liệu và lịch sử version
  → chọn một kết quả:
  1. **Yêu cầu chỉnh sửa** — đánh dấu các phần chưa đạt, nhập nhận xét có cấu trúc, đặt deadline
     → `Revision Requested`, người nộp được thông báo;
  2. **Phê duyệt** → `Approved`, một Club được tạo ở `Pending Setup` và người nộp nhận quyền CMB
     sáng lập tạm thời, chỉ dùng được cho UC09 và UC10 khi CLB còn `Pending Setup`;
  3. **Từ chối** — bắt buộc có lý do → `Rejected`, không tạo Club nào.
- **Ngoại lệ:** hết deadline chỉnh sửa mà không có bản nộp lại → scheduler đặt `Expired`.
- **Quy tắc:** BR05 — actor, thời điểm và lý do được lưu cho mọi kết quả. ICPDP không bao giờ
  sửa dữ liệu thay cho người nộp. Lịch sử quyết định gắn liền với hồ sơ và đọc được ngay tại đây
  (đây chính là thứ thoả mãn BP15 — không có use case audit riêng nào tồn tại).
- **Liên quan:** UC07, UC09, UC10

#### UC09 — Cấu hình hồ sơ và cơ cấu tổ chức CLB
- **Actor:** CMB
- **Mục tiêu:** Hoàn thiện thông tin vận hành và các đơn vị nội bộ của một CLB đã được công nhận.
- **Dữ liệu:** mô tả, liên hệ, điều lệ, kênh truyền thông, phạm vi hoạt động; các ban, bộ phận
  và những chức vụ mà mỗi đơn vị có thể nắm.
- **Quy tắc:** các trường thuộc thẩm quyền nhà trường chỉ ICPDP sửa được; cơ cấu có thể bị ràng
  buộc bởi template của trường; một chức vụ đang được một tư cách thành viên đang hiệu lực nắm
  giữ thì không xoá được.
- **Liên quan:** UC10, UC23

#### UC10 — Đề xuất ban chủ nhiệm CLB
- **Actor:** CMB · **Mục tiêu:** Đề cử lãnh đạo cho một nhiệm kỳ.
- **Luồng:** chọn một thành viên → chức vụ → nhiệm kỳ → nộp → `Pending Confirmation`.
- **Quy tắc:** BR06, BR07. Hồ sơ thành lập được duyệt ở UC08 sẽ đề cử ban chủ nhiệm đầu tiên tại đây.
- **Liên quan:** UC11

#### UC11 — Xác nhận ban chủ nhiệm
- **Actor:** ICPDP · **Mục tiêu:** Trao quyền quản lý.
- **Luồng:** kiểm tra điều kiện, xung đột và nhiệm kỳ → phê duyệt hoặc từ chối → khi phê duyệt,
  các quyền tương ứng có hiệu lực và CLB có thể rời `Pending Setup`.
- **Quy tắc:** BR05, BR07. Quyền được cấp bởi lần xác nhận này, không phải bởi UC03. Với ban
  chủ nhiệm sáng lập, lần xác nhận này thay thế quyền sáng lập tạm thời đã cấp ở UC08.
- **Liên quan:** UC10, UC03

#### UC12 — Lập kế hoạch chuyển giao nhiệm kỳ
- **Actor:** CMB · **Mục tiêu:** Chuẩn bị một cuộc bàn giao mang theo cả nghĩa vụ của nó.
- **Dữ liệu:** nhiệm kỳ mới, ứng viên, sự kiện còn dở, ngân sách còn treo, báo cáo chưa xong,
  tài sản và trách nhiệm cần bàn giao → `Pending Confirmation`.
- **Liên quan:** UC13

#### UC13 — Xác nhận chuyển giao nhiệm kỳ
- **Actor:** ICPDP · **Mục tiêu:** Chuyển giao quyền mà không đánh mất trách nhiệm giải trình.
- **Luồng:** khi phê duyệt — đóng nhiệm kỳ cũ, kích hoạt nhiệm kỳ mới, thu hồi quyền cũ, cấp
  quyền mới, lưu lại lịch sử.
- **Quy tắc:** BR08. Các nghĩa vụ liệt kê ở UC12 vẫn gắn với CLB, không gắn với ban chủ nhiệm
  sắp rời đi.
- **Liên quan:** UC12, UC03

#### UC14 — Yêu cầu tạm ngừng hoạt động CLB
- **Actor:** CMB · **Dữ liệu vào:** lý do, thời lượng dự kiến, các nghĩa vụ, kế hoạch phục hồi.
- **Liên quan:** UC15

#### UC15 — Tạm ngừng, kích hoạt lại hoặc giải thể CLB
- **Actor:** ICPDP · **Mục tiêu:** Kiểm soát vòng đời CLB.
- **Kích hoạt:** một yêu cầu (UC14), tình trạng không hoạt động, kết quả một hồ sơ (UC42), hoặc
  chính sách.
- **Quy tắc:** BR09, BR10, BR34 — một CLB `Suspended` không mở đợt tuyển nào, không nộp đề xuất
  sự kiện nào và không nhận booking mới nào; việc tạm ngừng huỷ các đề xuất sự kiện chưa được
  quyết định, và huỷ các sự kiện cùng booking tương lai đã duyệt thông qua UC28 (A1) và UC49.
- **Giải thể là có lịch, không tức thì**, bất kể ai kích hoạt nó:
  - tại thời điểm quyết định, mọi thứ kết thúc sau học kỳ `Dissolving` đều bị huỷ thông qua UC28
    (A1) và UC49, và không thứ gì mới được phép kết thúc sau đó (BR45);
  - học kỳ ra quyết định vẫn chạy bình thường — CLB tiếp tục hoạt động và vẫn có thể tạo việc mới;
  - vào đầu học kỳ kế tiếp, CLB chuyển sang `Dissolving`: không tạo gì mới, và CMB chỉ giữ quyền
    truy cập để hoàn tất phần việc còn tồn;
  - mọi thứ phải được đóng trước khi học kỳ tiếp theo bắt đầu. Vì mọi sự kiện đều gọn trong một
    học kỳ (BR44) và không cái nào được kết thúc muộn hơn (BR45), lúc đó không còn sự kiện nào
    đang chạy: scheduler huỷ các đề xuất chưa quyết định, ghi các nghĩa vụ chưa hoàn thành vào
    hồ sơ lưu trữ, lưu trữ lịch sử quản trị, thu hồi quyền quản lý và đặt `Dissolved`.
- **Liên quan:** UC14, UC42, UC28, UC49 · **Pain point:** BP01

### M04 — Tuyển thành viên và quản lý thành viên

#### UC16 — Tạo và công bố đợt tuyển thành viên
- **Actor:** CMB · **Tiền điều kiện:** CLB đang `Active` (BR01)
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
- **Actor:** CMB
- **Mục tiêu:** Đưa toàn bộ đơn của một đợt tuyển từ `Submitted` tới quyết định trong một phiên.
- **Luồng:** lọc và xem xét đơn → `Screening` → đưa vào danh sách rút gọn hoặc từ chối → với
  ứng viên trong danh sách rút gọn, có thể đính kèm một bản đánh giá (UC19) → quyết định:
  `Accepted`, `Rejected` hoặc `Waitlisted`.
- **Quy tắc:** lý do từ chối có thể là bắt buộc theo chính sách; quyết định được thông báo tới
  ứng viên và hiển thị trong UC02 của họ.
- **Liên quan:** UC17, UC19, UC20

#### UC19 — Ghi nhận đánh giá ứng viên
- **Actor:** CMB · **Dữ liệu:** kết quả phỏng vấn, điểm rubric, nhận xét của người đánh giá.
- **Quy tắc:** rubric được cấu hình theo từng đợt tuyển. · **Liên quan:** UC18

#### UC20 — Tiếp nhận ứng viên trúng tuyển
- **Actor:** CMB
- **Luồng:** xác nhận việc nhận → tạo ClubMembership với vai trò mặc định và ngày gia nhập.
- **Quy tắc:** BR13, BR46; không có hai tư cách thành viên đang hiệu lực cho cùng một sinh viên
  và một CLB.
- **Liên quan:** UC18, UC21, UC24

#### UC21 — Quản lý trạng thái thành viên
- **Actor:** CMB
- **Mục tiêu:** Giữ danh sách thành viên đúng thực tế, kể cả khi kết thúc một tư cách thành viên.
- **Trạng thái:** `Active` ⇄ `Inactive` (ngừng tham gia); `Active` / `Inactive` → `Left`
  (yêu cầu ở UC22 của sinh viên được chấp nhận) hoặc `Banned` (CLB buộc thành viên rời đi).
  `Left` và `Banned` là trạng thái cuối; sinh viên `Banned` không được quay lại CLB đó (BR46).
- **Luồng:** đổi trạng thái của một thành viên kèm ngày hiệu lực và, với lệnh cấm, một lý do bắt
  buộc → hệ thống ghi audit và thu hồi mọi chức vụ đang giữ (UC23). Mỗi học kỳ, CLB đăng ký lại
  các thành viên đang hoạt động; ai không được xác nhận sẽ chuyển thành `Inactive`.
- **Quy tắc:** mọi thay đổi đều mang một ngày hiệu lực; một lệnh cấm luôn quy được trách nhiệm.
  Việc rời CLB do sinh viên yêu cầu (UC22) được thực thi tại đây dưới dạng `Left`.
- **Liên quan:** UC22, UC23 · **Pain point:** BP02

#### UC22 — Xin rời CLB
- **Actor:** Student
- **Luồng:** mở tư cách thành viên của tôi → gửi yêu cầu rời kèm lý do → CMB thực thi ở UC21.
- **Quy tắc:** một thành viên đang giữ ghế ban chủ nhiệm đã xác nhận phải được thay thế qua
  UC10/UC11 trước khi việc rời CLB có hiệu lực.
- **Liên quan:** UC21, UC24

#### UC23 — Phân công chức vụ trong CLB
- **Actor:** CMB · **Quy tắc:** thành viên phải đang `Active`; chức vụ phải được định nghĩa ở
  UC09; chức vụ nhạy cảm cần xác nhận qua UC11.
- **Liên quan:** UC09, UC11, UC21

#### UC24 — Sử dụng không gian thành viên của tôi
- **Actor:** Student (với tư cách thành viên)
- **Mục tiêu:** Cho tư cách thành viên một lý do tồn tại bên trong hệ thống.
- **Luồng:** mở một CLB tôi thuộc về → xem bản ghi tư cách thành viên và chức vụ của mình, danh
  sách thành viên và ban chủ nhiệm, các sự kiện sắp tới của CLB kèm trạng thái đăng ký của tôi,
  lịch sử điểm danh của tôi, và các nghĩa vụ còn treo (phản hồi chưa gửi, yêu cầu rời đang chờ).
- **Quy tắc:** chỉ đọc, giới hạn trong các CLB mà người gọi có tư cách thành viên đang hiệu lực;
  nó không tạo thực thể mới và không tạo dữ liệu mới — mọi trường đều đã do một use case khác
  sinh ra. Nhắn tin nội bộ, chat và chia sẻ file nằm ngoài phạm vi (§5.2).
- **Liên quan:** UC20, UC22, UC29, UC31, UC50

### M05 — Sự kiện và hoạt động

#### UC25 — Nộp đề xuất tổ chức sự kiện
- **Actor:** CMB · **Tiền điều kiện:** CLB đang `Active` (BR10) và người gọi có quyền tương ứng
- **Dữ liệu vào:** mục tiêu, thời gian, địa điểm, đối tượng, sức chứa, kế hoạch, rủi ro, dự toán
  ngân sách, nhu cầu cơ sở vật chất.
- **Luồng:** validate → hệ thống đánh giá quy tắc xung đột BR15 và hiển thị
  `No Conflict` / `Warning` / `Blocking Conflict` → có thể đính kèm một yêu cầu đặt cơ sở vật
  chất (UC47) → nộp → `Pending Approval`.
- **Thay thế — nộp lại (UC28 của v1):** từ `Revision Requested`, sửa và nộp lại; một bản sửa mới
  được tạo và đề xuất quay về `Pending Approval`.
- **Ngoại lệ:** có xung đột chặn trong khi chính sách cấm chồng lịch; một báo cáo bắt buộc đã
  quá hạn và công tắc cưỡng chế BR21 đang bật.
- **Quy tắc:** BR10, BR15, BR21, BR44, BR45. Một bản sửa không bao giờ ghi đè bản trước.
- **Liên quan:** UC26, UC47 · **Pain point:** BP05, BP06

#### UC26 — Thẩm định và quyết định đề xuất sự kiện
- **Actor:** ICPDP
- **Tiền điều kiện:** đề xuất đang ở `Pending Approval`.
- **Luồng:** xem xét mức độ tuân thủ, địa điểm, thời gian, dự toán ngân sách, rủi ro, các nghĩa
  vụ quá hạn và yêu cầu booking đính kèm → chọn: **yêu cầu chỉnh sửa** (bắt buộc nhận xét có cấu
  trúc) → `Revision Requested`; **phê duyệt** → `Approved`; **từ chối** (bắt buộc lý do) →
  `Rejected`.
- **Ngoại lệ:** CLB bị tạm ngừng trước khi có quyết định → `Cancelled` bởi UC15; hết deadline
  chỉnh sửa → scheduler đặt `Expired`.
- **Quy tắc:** BR05, BR14, BR31 — ICPDP là cấp phê duyệt duy nhất; ý kiến của Cơ sở vật chất, An
  ninh và Tài chính được lấy ngoài hệ thống và ghi vào review note. Việc duyệt một đề xuất có
  kèm yêu cầu booking **không** đồng nghĩa duyệt booking đó; UC48 mới quyết định nó.
- **Liên quan:** UC25, UC27, UC48

#### UC27 — Công bố sự kiện và mở đăng ký
- **Actor:** CMB · **Tiền điều kiện:** sự kiện đang `Approved` (BR14)
- **Luồng:** đặt khung thời gian đăng ký và thông tin công khai → công bố → `Upcoming`.
- **Liên quan:** UC29, UC06

#### UC28 — Huỷ hoặc đổi lịch sự kiện
- **Actor:** CMB
- **Mục tiêu:** Thay đổi một sự kiện đã duyệt mà không mất vết và không để rò rỉ nguồn lực.
- **Luồng:** nhập lý do → với việc đổi lịch, đánh giá lại BR15 và nộp lại để có quyết định khi
  chính sách yêu cầu → cập nhật hoặc giải phóng booking liên quan (UC49) → thông báo cho người
  đã đăng ký → tính lại các nghĩa vụ báo cáo và ngân sách.
- **Quy tắc:** BR35 — huỷ một sự kiện sẽ giải phóng booking đã duyệt của nó. Một lần huỷ nằm
  trong thời hạn báo trước cấu hình được sẽ được ghi nhận là tín hiệu tuân thủ cho UC42.
- **ICPDP buộc huỷ** là luồng thay thế A1: hệ thống huỷ sự kiện như hệ quả của UC15 (tạm ngừng,
  giải thể) hoặc UC42 (kết quả hồ sơ). ICPDP không phải actor của UC28 — đây chính là thứ loại
  bỏ vấn đề hai actor của UC35 trong v1.
- **Liên quan:** UC27, UC49, UC42, UC15

### M06 — Đăng ký và điểm danh

#### UC29 — Đăng ký tham gia sự kiện
- **Actor:** Student
- **Validate:** khung thời gian đăng ký, điều kiện tham gia, không đăng ký trùng, sức chứa.
- **Kết quả:** `Confirmed`, hoặc `Waitlisted` khi danh sách chờ được bật; việc đẩy lên là UC30.
- **Quy tắc:** BR17 — số đăng ký đã xác nhận không bao giờ vượt sức chứa trừ khi chính sách cho
  phép overbooking. Khi sự kiện không có danh sách chờ, đạt sức chứa nghĩa là đóng đăng ký.
- **Liên quan:** UC27, UC30, UC31 · **Pain point:** BP07

#### UC30 — Quản lý sức chứa và danh sách chờ
- **Actor:** CMB · **Quy tắc:** khi một chỗ trống ra, việc đẩy lên theo chính sách đã cấu hình.
- **Liên quan:** UC29

#### UC31 — Check-in vào sự kiện
- **Actor:** Student · **Hỗ trợ:** CMB
- **Luồng:** sinh viên xuất trình hoặc quét mã sự kiện tại địa điểm → hệ thống xác minh đăng ký
  và khung giờ → một bản ghi điểm danh được tạo.
- **Thay thế:** một thành viên CMB có quyền check-in hộ một người tham dự, và bản ghi lưu lại ai
  đã thực hiện.
- **Quy tắc:** BR18 — mỗi người tham dự một bản ghi điểm danh cho mỗi sự kiện; check-in trùng
  không bao giờ tạo bản ghi thứ hai.
- **Liên quan:** UC29, UC32, UC50

#### UC32 — Chốt điểm danh sự kiện
- **Actor:** CMB
- **Luồng:** xem lại các lượt check-in bất thường → chốt → bộ dữ liệu bị khoá.
- **Quy tắc:** BR19 — chỉ một vai trò đặc biệt mới mở khoá được. Việc chốt **không** điều khiển
  feedback window; BR36 đã mở nó từ lúc check-in.
- **Liên quan:** UC31, UC33, UC44

### M08 — Trách nhiệm giải trình sau sự kiện

#### UC33 — Nộp báo cáo sau sự kiện
- **Actor:** CMB
- **Được nạp sẵn:** đề xuất đã duyệt, bảng điểm danh đã chốt, ngân sách và các khoản chi, bản
  tổng hợp phản hồi khi UC51 đã có dữ liệu.
- **Nhập tay:** kết quả thực tế, minh chứng, sự cố, bài học rút ra.
- **Quy tắc:** BR20 — deadline được cấu hình ở UC04; một báo cáo quá hạn sẽ đi vào BR21.
- **Liên quan:** UC32, UC34, UC38 · **Pain point:** BP08

#### UC34 — Thẩm định và đóng báo cáo sự kiện
- **Actor:** ICPDP
- **Luồng:** đối chiếu kế hoạch với thực tế → chấp nhận → `Closed`; hoặc trả về để sửa; hoặc ghi
  nhận một phát hiện, và phát hiện đó mở một hồ sơ ở UC42.
- **Quy tắc:** BR05.
- **Liên quan:** UC33, UC42, UC44

### M07 — Tài chính và ngân sách

#### UC35 — Gửi yêu cầu ngân sách
- **Actor:** CMB · **Có thể gắn với:** một sự kiện, một kế hoạch học kỳ, một hoạt động đã duyệt
- **Dữ liệu vào:** hạng mục, số tiền, mục đích, các khoản chi dự kiến.
- **Thay thế — sửa và nộp lại (UC40 của v1):** từ `Revision Requested`, sửa và nộp lại; một
  version mới được tạo, yêu cầu quay về `Submitted`, và cả lịch sử version lẫn lịch sử phê duyệt
  đều được giữ lại.
- **Quy tắc:** BR22. · **Liên quan:** UC36 · **Pain point:** BP09

#### UC36 — Thẩm định và quyết định yêu cầu ngân sách
- **Actor:** ICPDP
- **Luồng:** xem xét điều kiện, hạn mức còn lại, khả năng trùng lặp và trạng thái của hoạt động
  liên quan → yêu cầu chỉnh sửa, phê duyệt (có thể với số tiền thấp hơn) hoặc từ chối.
- **Ngoại lệ:** sự kiện liên quan bị từ chối hoặc bị huỷ → `Cancelled`.
- **Quy tắc:** BR05 bắt buộc audit; số tiền duyệt có thể khác số tiền xin ở nơi chính sách
  cho phép.
- **Liên quan:** UC35, UC37

#### UC37 — Ghi nhận giải ngân
- **Actor:** ICPDP · **Dữ liệu:** số tiền duyệt, số tiền giải ngân, ngày, mã tham chiếu.
- **Quy tắc:** BR23 — số tiền giải ngân không bao giờ vượt số tiền duyệt khi chưa có văn bản
  điều chỉnh. Chỉ theo dõi; đây không phải một hệ thống kế toán (§5.2). Không có nó thì UC39
  không tính được gì.
- **Liên quan:** UC36, UC39

#### UC38 — Ghi nhận khoản chi kèm chứng từ
- **Actor:** CMB
- **Dữ liệu vào:** hạng mục, số tiền, ngày, ngân sách hoặc sự kiện liên quan, mô tả, và hoá đơn,
  biên lai hoặc chứng từ thanh toán.
- **Quy tắc:** BR24 — khoản chi ngoài hạng mục đã duyệt bị gắn cờ ngoại lệ; BR25 — yêu cầu về
  chứng từ theo hạng mục là cấu hình được; mỗi chứng từ tham chiếu đúng một khoản chi, và đó
  chính là lý do UC43 và UC44 của v1 gộp thành một use case ở đây.
- **Liên quan:** UC37, UC39

#### UC39 — Đối soát ngân sách và chi tiêu
- **Actor:** ICPDP
- **Hệ thống tính:** đã duyệt, đã giải ngân, khoản chi đã ghi nhận, khoản chi có chứng từ, khoản
  chi thiếu chứng từ, số dư còn lại, chênh lệch.
- **Kết quả:** `Reconciled` hoặc `Exception`, rồi `Closed`.
- **Quy tắc:** BR26 — việc đối soát phải hoàn tất trước khi một hồ sơ ngân sách được đóng. CMB
  không đồng sở hữu quyết định này; họ đọc cùng bộ số liệu qua UC02, và đó chính là thứ loại bỏ
  vấn đề hai actor của UC45 trong v1.
- **Liên quan:** UC37, UC38, UC44 · **Pain point:** BP10

### M08 — Báo cáo và tuân thủ

#### UC40 — Nộp báo cáo hoạt động định kỳ
- **Actor:** CMB · **Kỳ báo cáo:** học kỳ, năm học hoặc một kỳ được cấu hình
- **Tự động nạp sẵn:** sự kiện, thành viên, điểm danh, tài chính. **Nhập tay:** phần thuyết minh
  và minh chứng mà hệ thống không có.
- **Quy tắc:** BR20; deadline và các mốc nhắc đến từ UC04 và §19.
- **Liên quan:** UC41 · **Pain point:** BP14

#### UC41 — Thẩm định báo cáo hoạt động định kỳ
- **Actor:** ICPDP · **Kết quả:** chấp nhận — báo cáo trở thành đầu vào đánh giá — hoặc trả về
  để sửa. · **Liên quan:** UC40, UC44

#### UC42 — Quản lý hồ sơ vi phạm và tuân thủ
- **Actor:** ICPDP
- **Kích hoạt:** một khiếu nại được leo thang (UC53), một phát hiện từ báo cáo (UC34), một báo
  cáo quá hạn, một ngoại lệ tài chính (UC39), một sự kiện không phép, một lần huỷ booking sát
  giờ (UC49).
- **Vòng đời:** `Open` → `Under Investigation` → `Awaiting Club Response` → `Decision Issued` →
  `Corrective Action` → `Resolved`.
- **Quy tắc:** BR27, BR28 — mỗi hồ sơ ghi lại nguồn gốc của nó, và hồ sơ mở từ một khiếu nại
  liên kết ngược lại khiếu nại đó. Một quyết định phải có lý do và chứng cứ.
- **Liên quan:** UC53, UC34, UC39, UC15, UC44 · **Pain point:** BP12

### M09 — Đánh giá hiệu quả

#### UC43 — Cấu hình scheme đánh giá
- **Actor:** ICPDP
- **Dữ liệu:** các dimension của §17 (D1–D6), trọng số của chúng, ngưỡng cho từng mức xếp loại,
  kỳ áp dụng, và trạng thái kích hoạt.
- **Quy tắc:** BR29 — một scheme không kích hoạt được nếu tổng trọng số không hợp lệ; một scheme
  đang hoạt động và đã được một kỳ đánh giá đã công bố sử dụng thì không bao giờ sửa tại chỗ,
  phải tạo một version mới.
- **Liên quan:** UC44

#### UC44 — Sinh bản nháp đánh giá hiệu quả CLB
- **Actor:** ICPDP
- **Đầu vào:** hoạt động (UC26–UC34), điểm danh (UC32), thành viên (UC21), tài chính (UC39),
  báo cáo (UC41), vi phạm (UC42), phản hồi (UC50), kết quả khiếu nại (UC53), mức tuân thủ về
  booking (UC48, UC49).
- **Xử lý:** áp dụng scheme đang hoạt động từ UC43 → `Evaluation Draft` kèm điểm số và chứng cứ
  phía sau mỗi dimension.
- **Liên quan:** UC43, UC45 · **Pain point:** BP13

#### UC45 — Xem lại, chốt và công bố đánh giá
- **Actor:** ICPDP
- **Luồng:** xem lại dữ liệu nguồn → xử lý các bất thường → thêm các dimension chấm tay được
  phép → chốt → công bố.
- **Quy tắc:** BR30 — một kỳ đánh giá đã công bố không bao giờ được sửa tại chỗ; phải tạo một
  bản sửa hoặc bản chụp mới. · **Liên quan:** UC44

### M11 — Cơ sở vật chất và đặt chỗ

#### UC46 — Quản lý danh mục cơ sở vật chất
- **Actor:** ICPDP
- **Mục tiêu:** Định nghĩa những gì CLB được phép đặt — tiền điều kiện còn thiếu của UC51 trong v1.
- **Dữ liệu:** mã và tên property, loại (phòng, hội trường, thiết bị), sức chứa, vị trí, thiết
  bị đi kèm, khung giờ được đặt, các giai đoạn khoá, trạng thái hoạt động.
- **Quy tắc:** một property còn booking tương lai đã duyệt thì không xoá được, chỉ ngừng kích
  hoạt; việc đổi khung giờ được đặt không bao giờ làm vô hiệu một quyết định đã ra. UCMS chỉ giữ
  những property được mở cho hoạt động CLB và không thay thế hệ thống đặt phòng riêng của trường
  (§5.2).
- **Liên quan:** UC47, UC48

#### UC47 — Gửi yêu cầu đặt cơ sở vật chất
- **Actor:** CMB · **Tiền điều kiện:** CLB đang `Active` (BR34) và người gọi có quyền tương ứng
- **Dữ liệu vào:** property, mục đích, thời điểm bắt đầu và kết thúc, số người dự kiến, thiết bị
  đi kèm, sự kiện liên quan nếu có.
- **Luồng:** chọn một property từ danh mục (UC46) → hệ thống hiển thị tình trạng còn trống →
  nhập thông tin sử dụng → hệ thống đánh giá BR15 → nộp → `Requested`.
- **Thay thế:** lưu ở `Draft`; đính kèm yêu cầu vào một đề xuất sự kiện đang soạn (UC25);
  **sửa và nộp lại** từ `Revision Requested` — chính là luồng đối xứng mà v1 có ở bước 3 của
  UC52 nhưng không bao giờ cấp cho nó một use case.
- **Ngoại lệ:** khung giờ đã có người đặt và chính sách cấm overbooking (BR33); booking kết thúc
  sau học kỳ `Dissolving` của CLB (BR45).
- **Liên quan:** UC25, UC46, UC48 · **Pain point:** BP16

#### UC48 — Thẩm định và quyết định yêu cầu đặt cơ sở vật chất
- **Actor:** ICPDP
- **Luồng:** mở yêu cầu → kiểm tra trạng thái CLB, mục đích, các xung đột và nghĩa vụ quá hạn →
  yêu cầu chỉnh sửa, phê duyệt hoặc từ chối kèm lý do → hệ thống ghi audit, cập nhật trạng thái
  và thông báo cho CMB.
- **Quy tắc:** BR33, BR34, BR35 — một booking đã duyệt khoá khung giờ; CLB bị tạm ngừng không
  nhận booking mới; chỉ ICPDP quyết định.
- **Liên quan:** UC47, UC49, UC26

#### UC49 — Theo dõi và huỷ / trả cơ sở vật chất đã đặt
- **Actor:** CMB
- **Kích hoạt:** sự kiện bị huỷ hoặc đổi lịch (UC28), hoặc CLB không còn cần property đó.
- **Luồng:** mở một booking `Approved` → huỷ kèm lý do → khung giờ được giải phóng → ICPDP được
  thông báo.
- **Quy tắc:** BR35 — một booking mà sự kiện của nó bị huỷ sẽ được giải phóng tự động; một lần
  huỷ nằm trong thời hạn báo trước cấu hình được sẽ được ghi nhận là tín hiệu tuân thủ cho UC42.
  Không có nó, một booking đã duyệt sẽ khoá một căn phòng vĩnh viễn.
- **Liên quan:** UC28, UC48, UC42

### M12 — Phản hồi và khiếu nại

#### UC50 — Gửi phản hồi sau sự kiện
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
- **Liên quan:** UC31, UC51, UC44 · **Pain point:** BP17

#### UC51 — Xem phản hồi sự kiện
- **Actor:** CMB
- **Luồng:** mở bản tổng hợp của một sự kiện → đọc điểm trung bình theo từng tiêu chí, phân bố
  và các nhận xét → mang kết luận vào báo cáo sau sự kiện (UC33).
- **Quy tắc:** BR37, BR40. Việc ghi lại bài học thuộc về UC33, không phải ở đây.
- **Liên quan:** UC50, UC33, UC44

#### UC52 — Gửi khiếu nại về một CLB
- **Actor:** Student
- **Dữ liệu vào:** CLB, sự kiện liên quan nếu có, loại khiếu nại, mô tả, chứng cứ.
- **Luồng:** chọn CLB hoặc sự kiện → chọn loại → mô tả và đính kèm chứng cứ → nộp → `Submitted`,
  ICPDP nhận một task.
- **Thay thế — rút khiếu nại:** trước khi phân loại ra quyết định → `Withdrawn`.
- **Quy tắc:** BR38 — khiếu nại đi thẳng tới ICPDP; CLB chỉ tiếp cận được sau khi UC53 chuyển
  xuống. Người khiếu nại theo dõi tiến trình qua UC02.
- **Liên quan:** UC53 · **Pain point:** BP18

#### UC53 — Phân loại khiếu nại
- **Actor:** ICPDP
- **Luồng:** mở khiếu nại → phân loại mức độ nghiêm trọng và tính hợp lệ → chọn: `Dismissed`
  (ghi lý do), `Forwarded` (chuyển cho CLB trả lời qua UC54), hoặc `Escalated` (mở một hồ sơ ở
  UC42 và liên kết ngược lại).
- **Quy tắc:** BR39 — mọi quyết định đều mang một lý do và được ghi audit; chỉ ICPDP được bác bỏ
  hoặc leo thang. `Escalated` cần tới UC42.
- **Liên quan:** UC52, UC54, UC42

#### UC54 — Trả lời khiếu nại được chuyển xuống
- **Actor:** CMB
- **Mục tiêu:** Cho CLB giải trình chính thức — chủ sở hữu mà chuyển trạng thái
  `Forwarded → Club Responded` của v1 chưa từng có.
- **Luồng:** mở khiếu nại được chuyển xuống (danh tính người khiếu nại chỉ hiển thị ở mức chính
  sách cho phép) → nhập phần trả lời và đính kèm chứng cứ → nộp → `Club Responded`; ICPDP đóng
  hoặc leo thang nó qua UC53.
- **Quy tắc:** phải trả lời trong thời hạn cấu hình được; quá hạn trả lời là một tín hiệu tuân
  thủ cho UC42. CMB không bao giờ tự sửa hay tự đóng khiếu nại.
- **Liên quan:** UC53, UC42

## 7. Cố ý không phải use case

Những hành vi sau có tồn tại, được đặc tả ở nơi khác, và bị loại khỏi phép đếm dựa trên quy tắc
2 của §2. v1 đã đếm cái đầu tiên và quên phần còn lại.

| Hành vi | Nó nằm ở đâu |
|---|---|
| Phát hiện xung đột sự kiện và booking | BR15, được đánh giá bên trong UC25 và UC47 (v1 từng đếm nó thành UC25) |
| Nhắc hạn và leo thang deadline | §19 + các giá trị cấu hình ở UC04; một bộ lập lịch, không có actor |
| `Upcoming → Ongoing → Completed` của một sự kiện | Scheduler, điều khiển bởi chính mốc giờ của sự kiện (§10) |
| `Approved → In Use → Completed` của một booking | Scheduler, điều khiển bởi chính mốc giờ của booking (§10) |
| `Dissolving → Dissolved` của một CLB, và việc bước vào `Dissolving` | Scheduler, điều khiển bởi lịch học kỳ (UC04) sau một quyết định giải thể ở UC15 |
| Đóng feedback window | Scheduler, theo window cấu hình ở UC04 |
| Gửi và thử lại thông báo, gồm cả Google SMTP | §19, M10; một outbox, không phải mục tiêu của một actor |
| Ghi audit | BR05, xuyên suốt; lịch sử quyết định được *đọc* bên trong mỗi use case thẩm định-và-quyết định |
| Tổng hợp phản hồi | Một khung nhìn trên dữ liệu của UC50, không phải trạng thái của một bản ghi |

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
               └─ extend  UC47 Booking                 → UC32 Chốt điểm danh
            UC28 Huỷ/Đổi lịch tác động lên UC27–UC33 và gọi UC49
                                                       → UC33 Báo cáo → UC34 Đóng
Tài chính:  UC35 Yêu cầu ⇄ UC36 Thẩm định&Quyết định → UC37 Giải ngân → UC38 Khoản chi+Chứng từ
                                                      → UC39 Đối soát
Cơ sở VC:   UC46 Danh mục → UC47 Yêu cầu ⇄ UC48 Thẩm định&Quyết định → UC49 Theo dõi/Trả
Báo cáo:    UC40 Nộp → UC41 Thẩm định
Phản hồi:   UC31 Check-in → UC50 Phản hồi → UC51 CMB xem → UC33 Báo cáo
Khiếu nại:  UC52 Gửi → UC53 Phân loại ─┬─ Bác bỏ
                                       ├─ Chuyển xuống → UC54 CLB trả lời
                                       └─ Leo thang → UC42 Hồ sơ → UC15
Đánh giá:   UC43 Scheme → UC44 Bản nháp → UC45 Công bố
            UC44 tiêu thụ UC21, UC32, UC34, UC39, UC41, UC42, UC48, UC49, UC50, UC53
Cấu hình:   UC03 Tài khoản · UC04 Chính sách&Deadline · UC05 Định tuyến
            cấp dữ liệu cho UC01, UC08, UC26, UC36, UC48
```

`⇄` đánh dấu một cặp nộp/thẩm định mà vòng chỉnh sửa của nó là **luồng thay thế của use case
nộp**, không phải một use case riêng.

## 9. Ma trận actor → use case

| Actor | Use case |
|---|---|
| **Student** | UC01, UC02, UC06, UC07, UC17, UC22, UC24, UC29, UC31, UC50, UC52 |
| **Club Management Board** | UC01, UC02, UC09, UC10, UC12, UC14, UC16, UC18, UC19, UC20, UC21, UC23, UC25, UC27, UC28, UC30, UC32, UC33, UC35, UC38, UC40, UC47, UC49, UC51, UC54 |
| **ICPDP Officer** | UC01, UC02, UC03, UC04, UC05, UC08, UC11, UC13, UC15, UC26, UC34, UC36, UC37, UC39, UC41, UC42, UC43, UC44, UC45, UC46, UC48, UC53 |

Dùng chung: UC01 và UC02 (cả ba actor, nội dung khác nhau). UC31 có Student là actor chính và
CMB là actor hỗ trợ. **Không use case nào có hai actor chính.**

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

### 10.5 Event
| Từ → Đến | Tác nhân |
|---|---|
| Draft → Pending Approval | UC25 |
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
| Approved / Upcoming / Ongoing → Cancelled | UC28, hoặc UC15 / UC42 tác động lên CLB |
| Draft / Pending Approval / Under Review / Revision Requested → Cancelled | UC15 (tạm ngừng, hoặc giải thể theo BR45), hoặc **Scheduler** khi CLB chuyển `Dissolved` |
| Revision Requested → Expired | **Scheduler** (deadline chỉnh sửa đặt ở UC26); là trạng thái cuối, CLB phải nộp đề xuất mới |

`Upcoming` bao trùm toàn bộ khoảng từ lúc công bố tới lúc bắt đầu, bất kể đăng ký đang mở, đã
đóng, hay không dùng tới. `Registration Open` và `Registration Closed` được suy ra từ khung thời
gian đăng ký đặt ở UC27, không phải trạng thái của sự kiện — cùng cách tiếp cận với feedback
window ở §10.11.

### 10.6 Budget Request
| Từ → Đến | Tác nhân |
|---|---|
| Draft → Submitted | UC35 |
| Submitted → Under Review | UC36 |
| Under Review → Revision Requested | UC36 |
| Revision Requested → Submitted (version mới) | UC35 alt |
| Under Review → Approved / Rejected | UC36 |
| Submitted / Under Review → Cancelled | UC36 (sự kiện liên quan bị `Rejected` hoặc `Cancelled`) |
| Approved → Disbursed | UC37 |
| Disbursed → Reconciliation Pending | UC39 (trả về để bổ sung chứng từ) |
| Disbursed / Reconciliation Pending → Reconciled / Exception | UC39 |
| Reconciled / Exception → Closed | UC39 (BR26) |

`Exception` nghĩa là việc đối soát kết thúc với một phần chênh lệch được nêu rõ; hồ sơ vẫn đóng
được, với phần chênh lệch nằm trong hồ sơ.

### 10.7 Violation
`Open → Under Investigation → Awaiting Club Response → Decision Issued → Corrective Action → Resolved`.
Tác nhân: UC42 xuyên suốt; bước `Awaiting Club Response → Decision Issued` được mở khoá bởi phần
trả lời của CLB, ghi ở UC42 hoặc UC54.

### 10.8 Evaluation
`Draft → Data Ready → Under Review → Finalized → Published`.
Tác nhân: UC44 tới `Data Ready`, UC45 từ `Under Review` trở đi.

### 10.9 Property Booking
| Từ → Đến | Tác nhân |
|---|---|
| Draft → Requested | UC47 |
| Requested → Under Review | UC48 |
| Under Review → Revision Requested | UC48 |
| Revision Requested → Requested (version mới) | UC47 alt |
| Under Review → Approved / Rejected | UC48 |
| Approved → In Use | **Scheduler** (giờ bắt đầu) |
| In Use → Completed | **Scheduler** (giờ kết thúc) |
| Requested / Approved → Cancelled | UC49 |
| Approved → Released | UC28 qua BR35, hoặc UC49 |

### 10.10 Complaint
| Từ → Đến | Tác nhân |
|---|---|
| — → Submitted | UC52 |
| Submitted → Under Triage | UC53 |
| Under Triage → Dismissed / Forwarded / Escalated | UC53 |
| Forwarded → Club Responded | **UC54** |
| Club Responded → Closed / Escalated | UC53 |
| Escalated → Violation Open | UC42 |
| Submitted / Under Triage → Withdrawn | UC52 alt (trạng thái cuối) |

### 10.11 Event Feedback
`Submitted` — và không có gì khác.

```text
(chưa có bản ghi)  --UC50-->  Submitted   [bất biến]
```

`Window Open` và `Window Closed` của v1 là trạng thái của **sự kiện**, suy ra từ thời điểm
check-in và window cấu hình được (BR36), còn `Aggregated` là một khung nhìn trên các bản ghi đã
nộp, không phải trạng thái của một bản ghi. Bản thân bản ghi chỉ có một trạng thái duy nhất vì
BR37 cấm sửa và cấm xoá.

## 11. Quy tắc nghiệp vụ — chỉ phần thay đổi

BR01–BR39 của §14 vẫn giữ nguyên, với các sửa đổi sau:

| Quy tắc | Thay đổi |
|---|---|
| BR15 | Được phát biểu lại thành chính quy tắc xung đột (vốn là UC25 của v1): *trùng thời gian trên cùng một property, nơi một sự kiện hoặc booking đã duyệt chặn lại, cho kết quả `Blocking Conflict`; trùng nhẹ cho `Warning`; ngưỡng được cấu hình ở UC04.* Được đánh giá bên trong UC25 và UC47. |
| BR16 | **Đã đổi.** Duyệt đa cấp theo các rule định tuyến của UC05; một hồ sơ không khớp rule nào thì được quyết định ở một cấp duy nhất. Mọi cấp đều do một ICPDP Officer thực hiện, nhờ đó BR31 vẫn đúng mà không mâu thuẫn. |
| BR19 | Không đổi, nhưng "vai trò đặc biệt" được cấp ở UC03. |
| BR23 | Không đổi — và đó chính là lý do UC37 tồn tại: không có số tiền đã giải ngân thì UC39 không tính được gì. |
| BR35 | Không đổi — và đó chính là lý do UC49 tồn tại: không có việc trả chỗ thì một booking đã duyệt khoá một căn phòng vĩnh viễn. |
| BR36 | **Đã đổi.** Feedback window mở tại thời điểm **check-in** của người tham dự (UC31) và đóng sau khi sự kiện kết thúc một khoảng cấu hình được — không phải sau khi chốt điểm danh (UC54 của v1). |
| BR37 | Không đổi. |
| **BR40** | **Mới.** Bản tổng hợp phản hồi chỉ được hiển thị khi số người phản hồi đạt mức tối thiểu cấu hình được; dưới ngưỡng đó chỉ hiển thị việc có tồn tại phản hồi. Không có quy tắc này thì phản hồi "ẩn danh" trong một sự kiện mười người là không ẩn danh. |
| **BR41** | **Mới.** Một property không được xoá khi còn booking tương lai đã duyệt; thay vào đó là ngừng kích hoạt (UC46). |
| **BR42** | **Mới.** Màn hình cấu hình chỉ bao gồm các giá trị liệt kê ở UC04. Mọi quy tắc khác được đánh dấu "cấu hình được" trong §14 sẽ nằm dưới dạng hằng số trong một tài liệu chính sách. |
| **BR43** | **Đã rút.** Nó từng dùng để giữ bản phát hành đầu độc lập với các use case bị hoãn; nay mọi use case ra cùng một bản phát hành. Số hiệu không được dùng lại. |
| **BR44** | **Mới.** Một sự kiện bắt đầu và kết thúc trong cùng một học kỳ của lịch học kỳ (UC04). |
| **BR45** | **Mới.** Khi một CLB đã có quyết định giải thể (UC15), không sự kiện, đề xuất sự kiện hay booking nào của CLB đó được kết thúc sau học kỳ `Dissolving` của nó. UC25 và UC47 từ chối những hồ sơ như vậy; UC15 huỷ những gì đã tồn tại. |
| **BR46** | **Mới.** Sinh viên có tư cách thành viên `Banned` ở một CLB không được nộp đơn vào (UC17) hay được tiếp nhận lại (UC20) vào CLB đó. |

## 12. Phạm vi phát hành

Cả 54 use case ra trong một bản phát hành. MVP của v1 (§22) nêu 30–34 use case nhưng lại bao gồm
những luồng mà phụ thuộc của chúng đã bị hoãn; việc nhóm theo vòng lặp tránh được điều đó.

| Vòng lặp | Use case |
|---|---|
| Truy cập & cấu hình | UC01, UC02, UC03, UC04, UC05 |
| Thành lập & quản trị CLB | UC06, UC07, UC08, UC09, UC10, UC11, UC12, UC13, UC14, UC15 |
| Tuyển thành viên → thành viên | UC16, UC17, UC18, UC19, UC20, UC21, UC22, UC23, UC24 |
| Duyệt → công bố sự kiện | UC25, UC26, UC27, UC28 |
| Đăng ký → điểm danh | UC29, UC30, UC31, UC32 |
| Trách nhiệm sau sự kiện | UC33, UC34 |
| Tài chính | UC35, UC36, UC37, UC38, UC39 |
| Báo cáo định kỳ | UC40, UC41 |
| Governance intelligence | UC42, UC43, UC44, UC45 |
| Cơ sở vật chất | UC46, UC47, UC48, UC49 |
| Phản hồi & khiếu nại | UC50, UC51, UC52, UC53, UC54 |

Mỗi vòng lặp đều khép kín: không có gì kết thúc ở một trạng thái mà không use case nào rời đi được.

### Nếu buộc phải cắt phạm vi

Cắt trọn vòng lặp, không bao giờ cắt nửa vòng. Theo thứ tự: Governance intelligence (UC42–UC45,
kéo theo cả cơ chế leo thang của UC53 nên Phản hồi & khiếu nại đi cùng) → Báo cáo định kỳ (UC40,
UC41) → Tài chính (UC35–UC39) → Cơ sở vật chất (UC46–UC49). Cắt bất cứ thứ gì trên lằn ranh đó
sẽ làm vỡ vòng sự kiện, vốn là lý do tồn tại của hệ thống.

## 13. Truy vết — pain point → use case

| BP | Use case | Mức phủ |
|---|---|---|
| BP01 trạng thái CLB không tập trung | UC02, UC15 | đầy đủ — câu trả lời là dashboard, không phải lệnh tạm ngừng |
| BP02 số thành viên không chính xác | UC20, UC21, UC24 | đầy đủ |
| BP03 lịch sử ban chủ nhiệm và nhiệm kỳ | UC10, UC11, UC12, UC13 | đầy đủ — lịch sử được ghi lại; UC12 và UC13 gánh phần chuyển giao |
| BP04 hồ sơ thành lập phân tán | UC07, UC08 | đầy đủ |
| BP05 không có workflow sự kiện | UC25, UC26, UC27 | đầy đủ |
| BP06 không phát hiện trùng lịch | BR15 bên trong UC25 và UC47 | đầy đủ — là một quy tắc, luôn bật, không phải use case có thể hoãn |
| BP07 đăng ký tách rời sự kiện | UC29, UC31, UC32 | đầy đủ |
| BP08 sự kiện có thực sự diễn ra không | UC33, UC34 | đầy đủ |
| BP09 ngân sách không liên kết end-to-end | UC35–UC39 | đầy đủ |
| BP10 không phát hiện được chi vượt | UC37, UC38, UC39 | đầy đủ |
| BP11 tuyển thành viên không liên kết | UC16, UC17, UC18, UC20 | đầy đủ |
| BP12 không có lịch sử tuân thủ | UC34, UC42 | đầy đủ — một phát hiện trên báo cáo mở ra một hồ sơ |
| BP13 đánh giá thủ công | UC43, UC44, UC45 | đầy đủ — kỳ đánh giá đầu tiên cần trọn một kỳ dữ liệu |
| BP14 nhắc deadline thủ công | UC04 + scheduler (§19), hiển thị ở UC02 | đầy đủ |
| BP15 không có audit trail | BR05 xuyên suốt; được đọc bên trong UC08, UC26, UC36, UC48 | đầy đủ, không cần use case riêng |
| BP16 mượn cơ sở vật chất qua email | UC46, UC47, UC48, UC49 | đầy đủ |
| BP17 phản hồi không có cấu trúc | UC50, UC51 | đầy đủ |
| BP18 không có kênh khiếu nại | UC52, UC53, UC54 | đầy đủ |
| BP19 phải nhớ thêm mật khẩu | UC01 | đầy đủ |

Mọi pain point đều được phủ. v1 truy vết BP03, BP06, BP12 và BP13 tới những use case mà chính nó
đã đẩy sang V2.

## 14. Các quyết định còn mở của nhóm

| # | Quyết định | Vì sao không thể mặc định ở đây |
|---|---|---|
| D1 | Cấp duyệt thứ hai là một quyền RBAC hay một actor thứ tư (`ICPDP Head`)? | Nó làm thay đổi sơ đồ actor và §11. BR31 như đang viết thì cấm actor thứ tư; Feature nổi bật 1 như đang viết thì đòi cấp thứ hai. |
| D2 | Những giá trị nào của §14 trở nên sửa được ngoài danh sách của UC04? | Mỗi giá trị thêm vào tốn một màn hình, một schema và một đường validate; danh sách phải đến từ quy trình thật của ICPDP. |
| D3 | Số người phản hồi tối thiểu ban đầu cho BR40 (ICPDP có thể đổi sau ở UC04). | Đây là một con số chính sách, không phải con số kỹ thuật. Năm là mức sàn phổ biến. |
| D4 | Một sự kiện đổi lịch có cần một quyết định mới từ UC26, hay chỉ cần thông báo? | Phụ thuộc vào cách ICPDP thực sự xử lý một thay đổi thời gian. |
| D5 | UC54 có hiển thị danh tính người khiếu nại cho CMB không? | Đây là một quy tắc riêng tư mà nhà trường phải đặt ra; mô hình hỗ trợ cả hai hướng. |

## 15. Context diagram — luồng dữ liệu → use case

[`../03-diagrams/UCMS_Context_Diagram_v2.drawio`](../03-diagrams/UCMS_Context_Diagram_v2.drawio)
tuân theo một quy tắc: mọi luồng đều được tạo ra hoặc tiêu thụ bởi ít nhất một use case, và mọi
use case có dữ liệu đi qua biên hệ thống đều xuất hiện trong ít nhất một luồng. Một luồng gom
các dữ liệu cùng loại, nên những use case đứng sau nó được liệt kê ở đây chứ không vẽ lên sơ đồ.

| Từ → Đến | Luồng dữ liệu | Use case |
|---|---|---|
| Student → Hệ thống | Club establishment application | UC07 |
| Student → Hệ thống | Recruitment application | UC17 |
| Student → Hệ thống | Leave club request | UC22 |
| Student → Hệ thống | Event registration | UC29 |
| Student → Hệ thống | Event check-in | UC31 |
| Student → Hệ thống | Event feedback | UC50 |
| Student → Hệ thống | Club complaint | UC52 |
| Hệ thống → Student | Clubs & events information | UC06, UC24 |
| Hệ thống → Student | Student profile information | UC01, UC02 |
| Hệ thống → Student | Application results & revision requests | UC08, UC18 |
| CMB → Hệ thống | Club profile & structure setup | UC09 |
| CMB → Hệ thống | Board nomination | UC10 |
| CMB → Hệ thống | Leadership transition plan | UC12 |
| CMB → Hệ thống | Suspension request | UC14 |
| CMB → Hệ thống | Recruitment configuration | UC16 |
| CMB → Hệ thống | Candidate decisions | UC18, UC19, UC20 |
| CMB → Hệ thống | Member management | UC21, UC23 |
| CMB → Hệ thống | Event proposal | UC25 |
| CMB → Hệ thống | Event publishment | UC27 |
| CMB → Hệ thống | Event cancellation / reschedule | UC28 |
| CMB → Hệ thống | Waitlist & attendance finalization | UC30, UC32 |
| CMB → Hệ thống | Post-event report | UC33 |
| CMB → Hệ thống | Budget request | UC35 |
| CMB → Hệ thống | Expense & evidence | UC38 |
| CMB → Hệ thống | Periodic report | UC40 |
| CMB → Hệ thống | Property booking request / cancellation | UC47, UC49 |
| CMB → Hệ thống | Complaint response | UC54 |
| Hệ thống → CMB | Membership applications | UC17 → UC18 |
| Hệ thống → CMB | Review decisions & revision requests | UC11, UC13, UC26, UC34, UC36, UC41, UC48 |
| Hệ thống → CMB | Event feedback | UC51 |
| Hệ thống → CMB | Forwarded complaint | UC53 → UC54 |
| Hệ thống → CMB | Deadline reminder | UC04 |
| Hệ thống → CMB | Club evaluation result | UC45 |
| ICPDP → Hệ thống | Accounts, policy & routing config | UC03, UC04, UC05 |
| ICPDP → Hệ thống | Review decisions | UC08, UC11, UC13, UC26, UC34, UC36, UC41, UC48 |
| ICPDP → Hệ thống | Club status action | UC15 |
| ICPDP → Hệ thống | Disbursement & reconciliation | UC37, UC39 |
| ICPDP → Hệ thống | Property catalogue | UC46 |
| ICPDP → Hệ thống | Complaint triage | UC53 |
| ICPDP → Hệ thống | Violation cases | UC42 |
| ICPDP → Hệ thống | Evaluation scheme & scoring | UC43, UC45 |
| Hệ thống → ICPDP | Club establishment application | UC07 → UC08 |
| Hệ thống → ICPDP | Board nomination | UC10 → UC11 |
| Hệ thống → ICPDP | Leadership transition plan | UC12 → UC13 |
| Hệ thống → ICPDP | Suspension request | UC14 → UC15 |
| Hệ thống → ICPDP | Event proposal | UC25 → UC26 |
| Hệ thống → ICPDP | Post-event report | UC33 → UC34 |
| Hệ thống → ICPDP | Budget request & expenses | UC35 → UC36, UC38 → UC39 |
| Hệ thống → ICPDP | Periodic reports | UC40 → UC41 |
| Hệ thống → ICPDP | Property booking request | UC47 → UC48 |
| Hệ thống → ICPDP | Club complaint | UC52 → UC53 |
| Hệ thống → ICPDP | Evaluation draft | UC44 |
| Hệ thống → Google OAuth | Authentication request | UC01 |
| Google OAuth → Hệ thống | Authentication data | UC01 |
| Hệ thống → Google SMTP | Send email request | mọi thông báo (nhắc hạn, quyết định, khiếu nại được chuyển xuống) |

`A → B` ở cột cuối nghĩa là luồng đó mang thứ mà use case A nộp lên cho actor của use case B.
