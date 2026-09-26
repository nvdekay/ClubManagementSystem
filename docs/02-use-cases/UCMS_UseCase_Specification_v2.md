# UCMS — Đặc tả chi tiết Use Case v2

> **Phạm vi:** đặc tả đầy đủ của cả 54 use case trong
> [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md). Tài liệu này thay thế §9 của
> [`UCMS_Business_System_Analysis.md`](../01-business-analysis/UCMS_Business_System_Analysis.md)
> (UC01–UC57) và mở rộng §6 của tài liệu mô hình. Tài liệu mô hình giữ danh sách use case, ánh
> xạ v1 → v2, các vòng đời, quy tắc nghiệp vụ và phạm vi phát hành; tài liệu này giữ phần đặc tả.
> Sơ đồ: [`../03-diagrams/UCMS_UseCase_ByActor.drawio`](../03-diagrams/UCMS_UseCase_ByActor.drawio).

Mọi mục đều dùng cùng một mẫu, theo đúng thứ tự này:

```text
Actor chính · Hỗ trợ · Module · Mục tiêu nghiệp vụ · Kích hoạt · Tiền điều kiện · Dữ liệu vào
Luồng chính · Luồng thay thế · Ngoại lệ · Hậu điều kiện · Quy tắc nghiệp vụ · Đầu ra
Use case liên quan · Pain point
```

Một trường chỉ bị bỏ trống khi use case thực sự không có gì cho trường đó (không có hệ thống
ngoài, không có pain point riêng). Cả 54 use case ra trong một bản phát hành — xem §12 của tài
liệu mô hình.

---

## Mục lục

| UC | Tên | Actor chính | Module |
|---|---|---|---|
| UC01 | Xác thực qua Google OAuth và vào workspace theo vai trò | Tất cả | M01 |
| UC02 | Mở dashboard theo vai trò của tôi | Tất cả | M01 |
| UC03 | Quản lý tài khoản và gán vai trò | ICPDP | M01 |
| UC04 | Cấu hình chính sách và deadline của nhà trường | ICPDP | M01 |
| UC05 | Cấu hình quy tắc định tuyến phê duyệt | ICPDP | M01 |
| UC06 | Khám phá CLB và hoạt động đang mở | Student | M02 |
| UC07 | Nộp hồ sơ đề nghị thành lập CLB | Student | M02 |
| UC08 | Thẩm định và quyết định hồ sơ thành lập CLB | ICPDP | M02 |
| UC09 | Cấu hình hồ sơ và cơ cấu tổ chức CLB | CMB | M02/M03 |
| UC10 | Đề xuất ban chủ nhiệm CLB | CMB | M03 |
| UC11 | Xác nhận ban chủ nhiệm | ICPDP | M03 |
| UC12 | Lập kế hoạch chuyển giao nhiệm kỳ | CMB | M03 |
| UC13 | Xác nhận chuyển giao nhiệm kỳ | ICPDP | M03 |
| UC14 | Yêu cầu tạm ngừng hoạt động CLB | CMB | M02 |
| UC15 | Tạm ngừng, kích hoạt lại hoặc giải thể CLB | ICPDP | M02 |
| UC16 | Tạo và công bố đợt tuyển thành viên | CMB | M04 |
| UC17 | Nộp đơn ứng tuyển vào CLB | Student | M04 |
| UC18 | Sàng lọc và quyết định đơn ứng tuyển | CMB | M04 |
| UC19 | Ghi nhận đánh giá ứng viên | CMB | M04 |
| UC20 | Tiếp nhận ứng viên trúng tuyển | CMB | M04 |
| UC21 | Quản lý trạng thái thành viên | CMB | M04 |
| UC22 | Xin rời CLB | Student | M04 |
| UC23 | Phân công chức vụ trong CLB | CMB | M03/M04 |
| UC24 | Sử dụng không gian thành viên của tôi | Student | M04 |
| UC25 | Nộp đề xuất tổ chức sự kiện | CMB | M05 |
| UC26 | Thẩm định và quyết định đề xuất sự kiện | ICPDP | M05 |
| UC27 | Công bố sự kiện và mở đăng ký | CMB | M05 |
| UC28 | Huỷ hoặc đổi lịch sự kiện | CMB | M05 |
| UC29 | Đăng ký tham gia sự kiện | Student | M06 |
| UC30 | Quản lý sức chứa và danh sách chờ | CMB | M06 |
| UC31 | Check-in vào sự kiện | Student | M06 |
| UC32 | Chốt điểm danh sự kiện | CMB | M06 |
| UC33 | Nộp báo cáo sau sự kiện | CMB | M08 |
| UC34 | Thẩm định và đóng báo cáo sự kiện | ICPDP | M08 |
| UC35 | Gửi yêu cầu ngân sách | CMB | M07 |
| UC36 | Thẩm định và quyết định yêu cầu ngân sách | ICPDP | M07 |
| UC37 | Ghi nhận giải ngân | ICPDP | M07 |
| UC38 | Ghi nhận khoản chi kèm chứng từ | CMB | M07 |
| UC39 | Đối soát ngân sách và chi tiêu | ICPDP | M07 |
| UC40 | Nộp báo cáo hoạt động định kỳ | CMB | M08 |
| UC41 | Thẩm định báo cáo hoạt động định kỳ | ICPDP | M08 |
| UC42 | Quản lý hồ sơ vi phạm và tuân thủ | ICPDP | M08 |
| UC43 | Cấu hình scheme đánh giá | ICPDP | M09 |
| UC44 | Sinh bản nháp đánh giá hiệu quả CLB | ICPDP | M09 |
| UC45 | Xem lại, chốt và công bố đánh giá | ICPDP | M09 |
| UC46 | Quản lý danh mục cơ sở vật chất | ICPDP | M11 |
| UC47 | Gửi yêu cầu đặt cơ sở vật chất | CMB | M11 |
| UC48 | Thẩm định và quyết định yêu cầu đặt cơ sở vật chất | ICPDP | M11 |
| UC49 | Theo dõi và huỷ / trả cơ sở vật chất đã đặt | CMB | M11 |
| UC50 | Gửi phản hồi sau sự kiện | Student | M12 |
| UC51 | Xem phản hồi sự kiện | CMB | M12 |
| UC52 | Gửi khiếu nại về một CLB | Student | M12 |
| UC53 | Phân loại khiếu nại | ICPDP | M12 |
| UC54 | Trả lời khiếu nại được chuyển xuống | CMB | M12 |

---

# M01 — Định danh, truy cập và cấu hình

## UC01 – Xác thực qua Google OAuth và vào workspace theo vai trò

- **Actor chính:** Tất cả (Student, CMB, ICPDP Officer)
- **Hệ thống hỗ trợ:** Google OAuth (ES1)
- **Module:** M01
- **Mục tiêu nghiệp vụ:** Cho mỗi người dùng truy cập đúng phần dữ liệu và chức năng mà vai trò
  của họ cho phép, mà UCMS không quản lý mật khẩu nào.
- **Kích hoạt:** Người dùng chọn đăng nhập.
- **Tiền điều kiện:** Người dùng có một tài khoản Google thuộc domain mà nhà trường cho phép (UC04).
- **Dữ liệu vào:** Authorization code do Google trả về.
- **Luồng chính:**
  1. Hệ thống gửi một `Authentication request` tới Google OAuth.
  2. Người dùng xác thực với Google.
  3. Google OAuth trả `Authentication data` — email, họ tên, ảnh đại diện.
  4. Hệ thống đối chiếu domain email với chính sách cấu hình ở UC04.
  5. Hệ thống ánh xạ email tới một User; ở lần đăng nhập đầu tiên, nó tạo User và StudentProfile.
  6. Hệ thống nạp tập vai trò và quyền hiện tại, gồm cả các ngữ cảnh CLB.
  7. Hệ thống tạo phiên và điều hướng người dùng tới workspace tương ứng
     (Student / Club's Admin / ICPDP).
- **Luồng thay thế:**
  - **A1 Nhiều ngữ cảnh:** người dùng vừa là Student vừa là thành viên CMB của một hoặc nhiều
    CLB sẽ chọn workspace; lựa chọn được ghi nhớ và có thể đổi bất cứ lúc nào.
  - **A2 Người dùng quay lại:** StudentProfile được đồng bộ lại từ dữ liệu OAuth, và tên hiển
    thị hay ảnh đại diện đã đổi được cập nhật mà không đụng tới tập vai trò.
- **Ngoại lệ:**
  - **E1** email nằm ngoài domain được phép → từ chối truy cập, không tạo gì cả;
  - **E2** tài khoản bị khoá ở UC03 → từ chối, và lần thử được ghi audit;
  - **E3** Google OAuth không truy cập được hoặc trả lỗi → hiển thị lỗi, không tạo phiên, không
    ghi User dở dang.
- **Hậu điều kiện:** Tồn tại một phiên hợp lệ; StudentProfile đã đồng bộ; lần đăng nhập được audit.
- **Quy tắc nghiệp vụ:** BR32. UCMS không lưu mật khẩu nào của riêng mình, và không tồn tại
  đường đăng nhập nội bộ.
- **Đầu ra:** Session, User, StudentProfile, bản ghi audit.
- **Use case liên quan:** UC02, UC03, UC04
- **Pain point:** BP19

## UC02 – Mở dashboard theo vai trò của tôi

- **Actor chính:** Tất cả
- **Module:** M01 (đọc M02–M12)
- **Mục tiêu nghiệp vụ:** Mỗi vai trò một màn hình trả lời hai câu hỏi — việc gì cần tôi hành
  động, và hồ sơ tôi đã nộp giờ ra sao.
- **Kích hoạt:** Người dùng vào một workspace sau UC01, hoặc quay lại nó.
- **Tiền điều kiện:** Có một phiên hợp lệ (UC01).
- **Luồng chính:**
  1. Hệ thống xác định vai trò và ngữ cảnh CLB của người gọi.
  2. Hệ thống nạp các mục thuộc về vai trò đó: việc đang chờ, deadline, trạng thái.
  3. Hệ thống hiển thị nội dung theo vai trò:
     - **ICPDP:** hồ sơ chờ duyệt theo loại và độ trễ, CLB theo trạng thái, báo cáo quá hạn,
       ngân sách chưa đối soát, hồ sơ đang mở, booking sắp tới;
     - **CMB:** hồ sơ của chúng tôi và trạng thái, deadline sắp tới, lịch sự kiện và booking,
       số lượng thành viên, tình hình ngân sách, phản hồi đang chờ xem;
     - **Student:** đơn của tôi và trạng thái, đăng ký của tôi, lịch sử check-in, tư cách thành
       viên, khiếu nại của tôi.
  4. Người dùng mở một mục bất kỳ, và nó đi tiếp vào use case của chính mục đó.
- **Luồng thay thế:**
  - **A1 Trạng thái rỗng:** người dùng không có gì đang chờ sẽ thấy các điểm bắt đầu của vai trò
    mình (UC06 với sinh viên, UC25/UC47 với CMB) thay vì một danh sách trống.
  - **A2 Đổi ngữ cảnh:** người dùng có nhiều ngữ cảnh CLB đổi CLB mà không cần xác thực lại.
- **Ngoại lệ:** **E1** một module nguồn không khả dụng → panel đó báo lỗi; phần còn lại của
  dashboard vẫn hiển thị.
- **Hậu điều kiện:** Không có. Không có chuyển trạng thái nào xảy ra ở đây.
- **Quy tắc nghiệp vụ:** Chỉ đọc. Mọi con số là truy vấn trực tiếp vào module sở hữu, không bao
  giờ là bản sao thứ hai của dữ liệu. Người dùng chỉ thấy những CLB và bản ghi mà vai trò của họ
  cho phép.
- **Đầu ra:** Dashboard được hiển thị; không ghi dữ liệu.
- **Use case liên quan:** tất cả — mọi use case đều đi tới từ đây
- **Pain point:** BP01, BP14, và trách nhiệm "theo dõi trạng thái đơn" của §4

## UC03 – Quản lý tài khoản và gán vai trò

- **Actor chính:** ICPDP Officer
- **Module:** M01
- **Mục tiêu nghiệp vụ:** Kiểm soát ai được hành động trong hệ thống, tách biệt với việc ai được
  đăng nhập vào nó.
- **Kích hoạt:** Có một officer mới, cần thu hồi một vai trò, hoặc cần khoá một tài khoản.
- **Tiền điều kiện:** Người gọi có quyền quản trị tài khoản.
- **Dữ liệu vào:** Người dùng đích, vai trò cần cấp hoặc thu hồi, ngữ cảnh CLB nếu vai trò gắn
  CLB, lý do khi khoá hoặc mở khoá.
- **Luồng chính:**
  1. Officer tìm người dùng theo email hoặc tên.
  2. Hệ thống hiển thị vai trò, ngữ cảnh CLB và trạng thái tài khoản hiện tại của người đó.
  3. Officer cấp hoặc thu hồi một vai trò ICPDP hoặc CMB, hoặc khoá / mở khoá tài khoản.
  4. Officer nhập lý do khi thay đổi là khoá, mở khoá hoặc thu hồi.
  5. Hệ thống áp dụng thay đổi, vô hiệu hoá các phiên bị ảnh hưởng và ghi bản ghi audit.
- **Luồng thay thế:**
  - **A1 Khoá khẩn cấp:** một tài khoản bị khoá mà không đổi vai trò, khi một hồ sơ (UC42) yêu
    cầu; lệnh khoá và hồ sơ được liên kết với nhau.
- **Ngoại lệ:**
  - **E1** officer cố thu hồi vai trò quản trị cuối cùng của chính mình → từ chối;
  - **E2** đối tượng đang giữ một ghế ban chủ nhiệm đã xác nhận → hệ thống cảnh báo rằng
    UC10/UC11 mới là đường đi đúng, và ghi nhận việc ghi đè nếu officer vẫn tiếp tục.
- **Hậu điều kiện:** Tập vai trò hoặc trạng thái tài khoản đã đổi và được audit; một tài khoản
  bị khoá sẽ bị từ chối ở UC01 (ngoại lệ E2 tại đó).
- **Quy tắc nghiệp vụ:** Một vai trò CMB cấp ở đây là thứ cấp so với ban chủ nhiệm được xác nhận
  ở UC11 và bị thu hồi tự động khi một nhiệm kỳ đóng lại (UC13). Phân cấp bên trong ICPDP được
  biểu diễn bằng quyền, không bao giờ bằng một actor mới. "Vai trò đặc biệt" của BR19 được cấp
  tại đây.
- **Đầu ra:** Bản gán vai trò, trạng thái tài khoản, bản ghi audit.
- **Use case liên quan:** UC01, UC11, UC13, UC42

## UC04 – Cấu hình chính sách và deadline của nhà trường

- **Actor chính:** ICPDP Officer
- **Module:** M01
- **Mục tiêu nghiệp vụ:** Đổi một quy tắc nghiệp vụ mà không cần một lần phát hành.
- **Kích hoạt:** Một quy định của trường thay đổi, hoặc một kỳ học mới bắt đầu.
- **Tiền điều kiện:** Người gọi có quyền cấu hình chính sách.
- **Dữ liệu vào:**
  - domain email được phép (BR32);
  - số thành viên sáng lập tối thiểu (BR03);
  - các tài liệu bắt buộc của hồ sơ thành lập (BR02);
  - deadline báo cáo và các mốc nhắc (BR20, §19);
  - ngưỡng xung đột (BR15);
  - feedback window và số người phản hồi tối thiểu (BR36, BR40);
  - chính sách overbooking (BR33);
  - các công tắc cưỡng chế (BR21);
  - lịch học kỳ — ngày bắt đầu và kết thúc của từng học kỳ (dùng cho việc giải thể ở UC15).
- **Luồng chính:**
  1. Officer mở bộ chính sách của kỳ hiện tại.
  2. Officer sửa một hoặc nhiều giá trị.
  3. Hệ thống validate từng giá trị và từ chối một tổ hợp mâu thuẫn.
  4. Officer xác nhận.
  5. Hệ thống lưu một phiên bản chính sách mới, có hiệu lực từ một ngày nêu rõ, và ghi audit.
- **Luồng thay thế:**
  - **A1 Thay đổi có lịch:** một giá trị được đặt ngày hiệu lực trong tương lai và chỉ có hiệu
    lực từ ngày đó.
- **Ngoại lệ:** **E1** một giá trị sẽ làm vô hiệu một quyết định đã ra → từ chối, kèm danh sách
  các bản ghi bị ảnh hưởng.
- **Hậu điều kiện:** Một phiên bản chính sách mới đang có hiệu lực; những quyết định đã ra giữ
  nguyên các giá trị mà chúng được ra theo.
- **Quy tắc nghiệp vụ:** BR42 — màn hình cấu hình chỉ phơi ra đúng danh sách trên. Mọi quy tắc
  khác được đánh dấu "cấu hình được" ở §14 sẽ nằm dưới dạng hằng số trong một tài liệu chính
  sách và chỉ trở nên sửa được khi có nhu cầu thật (§14 của tài liệu mô hình, quyết định D2).
- **Đầu ra:** Phiên bản chính sách, bản ghi audit.
- **Use case liên quan:** UC01, UC07, UC25, UC33, UC40, UC47, UC50
- **Pain point:** BP14

## UC05 – Cấu hình quy tắc định tuyến phê duyệt

- **Actor chính:** ICPDP Officer
- **Module:** M01
- **Mục tiêu nghiệp vụ:** Quyết định hồ sơ nào cần một cấp duyệt thứ hai trong nội bộ ICPDP, mà
  không hard-code các ngưỡng.
- **Kích hoạt:** ICPDP thay đổi phân cấp thẩm quyền nội bộ của mình.
- **Tiền điều kiện:** Người gọi có quyền cấu hình định tuyến.
- **Dữ liệu vào:** Loại hồ sơ, ngưỡng số tiền, mức rủi ro sự kiện, hạng cơ sở vật chất, lịch sử
  tuân thủ của CLB → cấp duyệt yêu cầu và SLA của nó.
- **Luồng chính:**
  1. Officer mở bộ quy tắc định tuyến.
  2. Officer thêm hoặc sửa một rule: một điều kiện và cấp duyệt mà điều kiện đó đòi hỏi.
  3. Hệ thống validate rằng bộ rule là đầy đủ và không nhập nhằng — mỗi hồ sơ khớp đúng một rule.
  4. Officer kích hoạt bộ rule.
  5. Hệ thống đánh phiên bản và ghi audit; các hồ sơ mới đi theo bộ rule đó.
- **Luồng thay thế:**
  - **A1 Mô phỏng:** officer chạy bộ rule nháp trên N hồ sơ đã quyết định gần nhất và xem hồ sơ
    nào lẽ ra đã cần cấp duyệt thứ hai.
- **Ngoại lệ:** **E1** hai rule chồng nhau hoặc một loại hồ sơ không có rule nào → từ chối kích hoạt.
- **Hậu điều kiện:** Tồn tại một bộ rule định tuyến đang hoạt động; UC08, UC26, UC36 và UC48 tra
  cứu nó.
- **Quy tắc nghiệp vụ:** Đây chính là use case mà Feature nổi bật 1 còn thiếu ở v1. Nó là thứ
  làm BR16 cưỡng chế được: một hồ sơ không khớp rule nào thì được quyết định ở một cấp duy nhất
  (§11 của tài liệu mô hình). Việc cấp thứ hai là một quyền hay một actor thứ tư là quyết định
  còn mở D1.
- **Đầu ra:** Bộ rule định tuyến, bản ghi audit.
- **Use case liên quan:** UC08, UC26, UC36, UC48

---

# M02 / M03 — Vòng đời CLB, quản trị và nhiệm kỳ

## UC06 – Khám phá CLB và hoạt động đang mở

- **Actor chính:** Student
- **Module:** M02
- **Mục tiêu nghiệp vụ:** Cho sinh viên tìm được một CLB, một đợt tuyển hoặc một sự kiện đáng
  tham gia — điểm vào của cả sản phẩm.
- **Kích hoạt:** Sinh viên muốn tham gia một CLB hoặc một hoạt động.
- **Tiền điều kiện:** Có một phiên hợp lệ (UC01).
- **Dữ liệu vào:** Từ khoá tìm kiếm, lĩnh vực, loại hoạt động.
- **Luồng chính:**
  1. Sinh viên duyệt hoặc tìm các CLB đang hoạt động theo lĩnh vực hoặc từ khoá.
  2. Hệ thống liệt kê các CLB khớp kèm trạng thái và một mô tả ngắn.
  3. Sinh viên mở trang một CLB: hồ sơ, ban chủ nhiệm, lịch sử hoạt động, các đợt tuyển đang mở,
     các sự kiện công khai sắp tới.
  4. Sinh viên đi tiếp sang UC17 (ứng tuyển) hoặc UC29 (đăng ký).
- **Luồng thay thế:**
  - **A1 Bắt đầu từ sự kiện:** sinh viên duyệt các sự kiện công khai sắp tới của mọi CLB và đi
    ngược từ sự kiện về CLB.
- **Ngoại lệ:** **E1** không có CLB nào khớp → hệ thống gợi ý bỏ bớt bộ lọc và hiển thị các CLB
  đang hoạt động mới nhất.
- **Hậu điều kiện:** Không có; không có gì đổi trạng thái.
- **Quy tắc nghiệp vụ:** Chỉ liệt kê các CLB `Active`. Một CLB `Suspended` vẫn thấy được nhưng
  có đánh dấu và không hiện đợt tuyển nào (BR09). Một CLB `Dissolved` không được liệt kê.
- **Đầu ra:** Không ghi dữ liệu.
- **Use case liên quan:** UC16, UC17, UC27, UC29

## UC07 – Nộp hồ sơ đề nghị thành lập CLB

- **Actor chính:** Student
- **Module:** M02
- **Mục tiêu nghiệp vụ:** Cho sinh viên đề xuất một CLB mới qua một quy trình chuẩn, truy vết được.
- **Kích hoạt:** Một nhóm sinh viên muốn lập một CLB.
- **Tiền điều kiện:** Đã đăng nhập và đủ điều kiện theo chính sách cấu hình ở UC04.
- **Dữ liệu vào:** Tên CLB, lĩnh vực, mục tiêu; các thành viên sáng lập; các tài liệu bắt buộc.
- **Luồng chính:**
  1. Sinh viên nhập tên CLB, lĩnh vực và mục tiêu.
  2. Sinh viên khai báo các thành viên sáng lập.
  3. Sinh viên tải lên các tài liệu bắt buộc (BR02).
  4. Hệ thống validate tính đầy đủ và số thành viên sáng lập tối thiểu (BR03).
  5. Sinh viên xác nhận.
  6. Hệ thống tạo version 1 của hồ sơ.
  7. Trạng thái chuyển sang `Submitted`.
  8. ICPDP nhận một review task, hiển thị trong UC02.
- **Luồng thay thế:**
  - **A1 Bản nháp:** sinh viên lưu hồ sơ ở `Draft` và làm tiếp sau.
  - **A2 Nộp lại sau khi bị yêu cầu chỉnh sửa (UC05 của v1):** từ `Revision Requested`, người
    nộp sửa các phần bị đánh dấu và nộp lại; hệ thống tạo một **version mới** và đưa hồ sơ về
    `Submitted`. Version trước vẫn đọc được.
  - **A3 Rút hồ sơ:** sinh viên rút một hồ sơ chưa có quyết định (`Submitted`, `Under Review`
    hoặc `Revision Requested`) → `Withdrawn`; mọi review task đang mở được đóng lại.
- **Ngoại lệ:**
  - **E1** thiếu một tài liệu bắt buộc → từ chối nộp, hồ sơ ở lại `Draft`;
  - **E2** số thành viên sáng lập ít hơn mức BR03 cho phép → từ chối;
  - **E3** đã có một CLB đang hoạt động trùng tên → cảnh báo, và officer quyết định ở UC08.
- **Hậu điều kiện:** Hồ sơ ở `Submitted`, với một version bất biến và một review task.
- **Quy tắc nghiệp vụ:** BR02, BR03, BR04 — một version đã nộp không bao giờ bị ghi đè.
- **Đầu ra:** ClubApplication, ApplicationVersion, ApprovalTask, thông báo.
- **Use case liên quan:** UC08, UC02
- **Pain point:** BP04

## UC08 – Thẩm định và quyết định hồ sơ thành lập CLB

- **Actor chính:** ICPDP Officer
- **Module:** M02
- **Mục tiêu nghiệp vụ:** Một phiên thẩm định duy nhất kết thúc bằng một trong ba kết quả, với
  lập luận được lưu lại.
- **Kích hoạt:** Một review task từ UC07.
- **Tiền điều kiện:** Hồ sơ đang ở `Submitted`; người gọi có quyền thẩm định.
- **Dữ liệu vào:** Ghi chú thẩm định của officer, các phần bị đánh dấu, quyết định và lý do.
- **Luồng chính:**
  1. Officer mở hồ sơ; trạng thái chuyển sang `Under Review`.
  2. Officer kiểm tra thông tin CLB, các thành viên sáng lập, các tài liệu và lịch sử version.
  3. Officer ghi lại ghi chú thẩm định, gồm cả ý kiến lấy được từ ngoài hệ thống.
  4. Officer chọn một kết quả:
     - **Yêu cầu chỉnh sửa** — đánh dấu các phần chưa đạt, nhập nhận xét có cấu trúc, đặt một
       deadline → `Revision Requested`, người nộp được thông báo;
     - **Phê duyệt** → `Approved`; một Club được tạo ở `Pending Setup`, và người nộp nhận một
       quyền CMB sáng lập tạm thời cho CLB đó;
     - **Từ chối** — bắt buộc có lý do → `Rejected`; không tạo Club nào.
  5. Hệ thống ghi bản ghi audit và thông báo cho người nộp.
- **Luồng thay thế:**
  - **A1 Cấp thứ hai:** khi các rule định tuyến của UC05 yêu cầu, quyết định được leo thang
    trong nội bộ ICPDP trước khi có hiệu lực.
- **Ngoại lệ:**
  - **E1** người nộp rút hồ sơ trong lúc đang thẩm định (UC07 A3) → phiên thẩm định đóng lại và
    hồ sơ chuyển `Withdrawn`;
  - **E2** hết deadline chỉnh sửa mà không có bản nộp lại → scheduler chuyển hồ sơ sang
    `Expired`, và người nộp có thể làm một hồ sơ mới.
- **Hậu điều kiện:** Hồ sơ ở `Revision Requested`, `Approved` hoặc `Rejected`; khi phê duyệt,
  tồn tại một Club ở `Pending Setup`, và người nộp giữ quyền CMB sáng lập tạm thời, chỉ dùng
  được cho UC09 và UC10 khi CLB còn `Pending Setup`, để ban chủ nhiệm sáng lập có thể được cấu
  hình và đề cử.
- **Quy tắc nghiệp vụ:** BR05 — actor, thời điểm và, nếu áp dụng, lý do được lưu cho mọi kết
  quả. ICPDP không bao giờ sửa dữ liệu thay cho người nộp. Lịch sử quyết định gắn liền với hồ sơ
  và được đọc tại đây, và đó chính là thứ thoả mãn BP15 mà không cần một use case audit riêng.
  BR31 — ICPDP là cấp phê duyệt duy nhất.
- **Đầu ra:** ApprovalDecision, Club (khi phê duyệt), bản ghi audit, thông báo.
- **Use case liên quan:** UC07, UC09, UC10, UC05
- **Pain point:** BP04, BP15

## UC09 – Cấu hình hồ sơ và cơ cấu tổ chức CLB

- **Actor chính:** CMB
- **Module:** M02 / M03
- **Mục tiêu nghiệp vụ:** Hoàn thiện thông tin vận hành của một CLB đã được công nhận và mô hình
  hoá các đơn vị nội bộ của nó.
- **Kích hoạt:** CLB được tạo ở `Pending Setup`, hoặc cơ cấu của nó thay đổi.
- **Tiền điều kiện:** CLB tồn tại; người gọi có quyền quản trị CLB, hoặc có quyền CMB sáng lập
  tạm thời từ UC08 khi CLB còn `Pending Setup`.
- **Dữ liệu vào:** Mô tả, liên hệ, điều lệ, kênh truyền thông, phạm vi hoạt động; các ban, bộ
  phận, và những chức vụ mà mỗi đơn vị có thể nắm.
- **Luồng chính:**
  1. Thành viên CMB mở hồ sơ CLB.
  2. Thành viên hoàn thiện hoặc sửa thông tin vận hành.
  3. Thành viên định nghĩa cơ cấu nội bộ — ban, bộ phận, chức vụ.
  4. Hệ thống validate theo template của trường ở nơi template được áp dụng.
  5. Thành viên lưu lại; hệ thống ghi audit thay đổi.
- **Luồng thay thế:**
  - **A1 Template:** CLB nhận cơ cấu mặc định của trường và chỉnh sửa từ đó.
- **Ngoại lệ:**
  - **E1** một trường thuộc thẩm quyền nhà trường bị sửa → từ chối; các trường đó thuộc về ICPDP;
  - **E2** một chức vụ đang được một tư cách thành viên đang hiệu lực nắm giữ bị xoá → từ chối
    cho tới khi UC23 phân công lại.
- **Hậu điều kiện:** Hồ sơ và cơ cấu CLB là hiện hành; CLB có thể rời `Pending Setup` sau khi
  UC11 xác nhận ban chủ nhiệm của nó.
- **Quy tắc nghiệp vụ:** Các trường thuộc thẩm quyền nhà trường chỉ ICPDP sửa được. Cơ cấu có
  thể bị ràng buộc bởi template của trường.
- **Đầu ra:** Hồ sơ CLB, các bản ghi chức vụ và bộ phận, bản ghi audit.
- **Use case liên quan:** UC10, UC23, UC11

## UC10 – Đề xuất ban chủ nhiệm CLB

- **Actor chính:** CMB
- **Module:** M03
- **Mục tiêu nghiệp vụ:** Đề cử bộ máy lãnh đạo của một nhiệm kỳ để được xác nhận.
- **Kích hoạt:** Một CLB vừa được duyệt, một nhiệm kỳ bắt đầu, hoặc một ghế ban chủ nhiệm trống.
- **Tiền điều kiện:** CLB tồn tại; người gọi là CMB, hoặc giữ quyền CMB sáng lập tạm thời từ
  UC08 khi CLB còn `Pending Setup`; người được đề cử là thành viên (hoặc thành viên sáng lập,
  với ban chủ nhiệm đầu tiên).
- **Dữ liệu vào:** Thành viên, chức vụ, ngày bắt đầu và kết thúc nhiệm kỳ.
- **Luồng chính:**
  1. Thành viên mở phần đề cử ban chủ nhiệm cho một nhiệm kỳ.
  2. Với mỗi ghế, thành viên chọn một thành viên và một chức vụ đã định nghĩa ở UC09.
  3. Hệ thống kiểm tra điều kiện (BR07) và sự chồng lấn (BR06).
  4. Thành viên nộp bản đề cử.
  5. Trạng thái chuyển sang `Pending Confirmation`; ICPDP nhận một task.
- **Luồng thay thế:**
  - **A1 Ban chủ nhiệm một phần:** chỉ đề cử các ghế đang trống; các ghế đã xác nhận không bị
    đụng tới.
- **Ngoại lệ:**
  - **E1** một người được đề cử không đủ điều kiện theo BR07 → ghế đó bị từ chối;
  - **E2** người được đề cử đã giữ một nhiệm kỳ Chủ nhiệm chồng lấn → từ chối trừ khi chính sách
    cho phép (BR06).
- **Hậu điều kiện:** Bản đề cử ở `Pending Confirmation`.
- **Quy tắc nghiệp vụ:** BR06, BR07. Một hồ sơ thành lập được duyệt ở UC08 sẽ đề cử ban chủ
  nhiệm đầu tiên của mình tại đây.
- **Đầu ra:** Bản đề cử ban chủ nhiệm, ApprovalTask, thông báo.
- **Use case liên quan:** UC11, UC09
- **Pain point:** BP03

## UC11 – Xác nhận ban chủ nhiệm

- **Actor chính:** ICPDP Officer
- **Module:** M03
- **Mục tiêu nghiệp vụ:** Trao quyền quản lý cho một ban chủ nhiệm cụ thể trong một nhiệm kỳ cụ thể.
- **Kích hoạt:** Một task đề cử từ UC10.
- **Tiền điều kiện:** Bản đề cử đang ở `Pending Confirmation`.
- **Dữ liệu vào:** Quyết định và lý do.
- **Luồng chính:**
  1. Officer mở bản đề cử.
  2. Officer kiểm tra điều kiện, xung đột lợi ích và các mốc thời gian nhiệm kỳ.
  3. Officer phê duyệt hoặc từ chối, kèm lý do ở nơi cần thiết.
  4. Khi phê duyệt, hệ thống kích hoạt ban chủ nhiệm, cấp các quyền tương ứng và cho CLB rời
     `Pending Setup`.
  5. Hệ thống ghi audit quyết định và thông báo cho CLB.
- **Luồng thay thế:**
  - **A1 Xác nhận một phần:** từng ghế được xác nhận riêng và các ghế khác được trả về để đề cử lại.
- **Ngoại lệ:** **E1** tư cách thành viên của người được đề cử kết thúc giữa lúc đề cử và xác
  nhận → ghế đó được trả về UC10.
- **Hậu điều kiện:** Ban chủ nhiệm hoạt động trong nhiệm kỳ; các quyền có hiệu lực; CLB chuyển
  `Active` nếu đây là ban chủ nhiệm sáng lập của nó.
- **Quy tắc nghiệp vụ:** BR05, BR07. Quyền đến từ lần xác nhận này, không phải từ UC03. Với ban
  chủ nhiệm sáng lập, lần xác nhận này thay thế quyền CMB sáng lập tạm thời đã cấp ở UC08: quyền
  đó bị thu hồi và chỉ ban chủ nhiệm đã xác nhận mới giữ quyền CMB.
- **Đầu ra:** ClubTerm, các bản gán chức vụ, quyền, bản ghi audit.
- **Use case liên quan:** UC10, UC03, UC13
- **Pain point:** BP03

## UC12 – Lập kế hoạch chuyển giao nhiệm kỳ

- **Actor chính:** CMB
- **Module:** M03
- **Mục tiêu nghiệp vụ:** Chuẩn bị một cuộc bàn giao mang theo cả nghĩa vụ của nó thay vì đánh rơi.
- **Kích hoạt:** Nhiệm kỳ sắp kết thúc.
- **Tiền điều kiện:** Có một nhiệm kỳ đang hoạt động.
- **Dữ liệu vào:** Nhiệm kỳ mới; các ứng viên lãnh đạo; sự kiện còn dở; ngân sách còn treo; báo
  cáo chưa xong; tài sản và trách nhiệm cần bàn giao.
- **Luồng chính:**
  1. Ban chủ nhiệm sắp mãn nhiệm mở kế hoạch chuyển giao.
  2. Hệ thống nạp sẵn các nghĩa vụ còn tồn đọng từ M05, M07 và M08.
  3. Ban chủ nhiệm nêu tên các ứng viên cho nhiệm kỳ mới và hoàn thiện danh mục bàn giao.
  4. Ban chủ nhiệm nộp kế hoạch → `Pending Confirmation`.
- **Luồng thay thế:**
  - **A1 Chuyển giao sớm:** kế hoạch được nộp trước khi nhiệm kỳ kết thúc, kèm một lý do nêu rõ.
- **Ngoại lệ:** **E1** một nghĩa vụ không có người nhận trong ban chủ nhiệm mới → không nộp được
  kế hoạch cho tới khi có người được nêu tên.
- **Hậu điều kiện:** Kế hoạch chuyển giao ở `Pending Confirmation`.
- **Quy tắc nghiệp vụ:** Các nghĩa vụ vẫn gắn với CLB, không bao giờ gắn với các cá nhân sắp rời đi.
- **Đầu ra:** Kế hoạch chuyển giao, ApprovalTask.
- **Use case liên quan:** UC13, UC10
- **Pain point:** BP03

## UC13 – Xác nhận chuyển giao nhiệm kỳ

- **Actor chính:** ICPDP Officer
- **Module:** M03
- **Mục tiêu nghiệp vụ:** Chuyển giao quyền mà không đánh mất trách nhiệm giải trình.
- **Kích hoạt:** Một task chuyển giao từ UC12.
- **Tiền điều kiện:** Kế hoạch chuyển giao đang ở `Pending Confirmation`.
- **Luồng chính:**
  1. Officer xem lại kế hoạch và các nghĩa vụ còn tồn đọng.
  2. Officer phê duyệt hoặc trả lại kế hoạch.
  3. Khi phê duyệt, hệ thống đóng nhiệm kỳ cũ, kích hoạt nhiệm kỳ mới, thu hồi các quyền cũ, cấp
     các quyền mới và lưu lại lịch sử.
  4. Hệ thống ghi audit lần chuyển giao và thông báo cho cả hai ban chủ nhiệm.
- **Luồng thay thế:**
  - **A1 Phê duyệt có điều kiện:** việc chuyển giao được phê duyệt kèm các nghĩa vụ được đánh
    dấu để theo dõi tiếp, và chúng xuất hiện trên UC02 của ban chủ nhiệm mới.
- **Ngoại lệ:** **E1** CLB đang `Suspended` → việc chuyển giao bị giữ lại cho tới khi UC15 kích
  hoạt lại CLB.
- **Hậu điều kiện:** Nhiệm kỳ mới đang hoạt động; nhiệm kỳ cũ đã đóng và vẫn đọc được; các quyền
  phản ánh đúng ban chủ nhiệm mới.
- **Quy tắc nghiệp vụ:** BR08 — các quyền mới chỉ có hiệu lực khi việc chuyển giao được xác nhận.
- **Đầu ra:** Lịch sử ClubTerm, các quyền, bản ghi audit.
- **Use case liên quan:** UC12, UC03, UC11
- **Pain point:** BP03

## UC14 – Yêu cầu tạm ngừng hoạt động CLB

- **Actor chính:** CMB
- **Module:** M02
- **Mục tiêu nghiệp vụ:** Cho một CLB tạm dừng một cách hợp thức thay vì lặng lẽ biến mất.
- **Kích hoạt:** CLB không thể hoạt động trong một giai đoạn.
- **Tiền điều kiện:** CLB đang `Active`.
- **Dữ liệu vào:** Lý do, thời lượng dự kiến, các nghĩa vụ còn tồn đọng, kế hoạch phục hồi.
- **Luồng chính:**
  1. Ban chủ nhiệm mở yêu cầu tạm ngừng.
  2. Ban chủ nhiệm nêu lý do, giai đoạn và cách xử lý các nghĩa vụ còn tồn đọng.
  3. Ban chủ nhiệm nộp; ICPDP nhận một task.
- **Ngoại lệ:** **E1** một sự kiện hoặc booking đã duyệt rơi vào giai đoạn xin tạm ngừng → nó
  phải được huỷ trước qua UC28 hoặc UC49.
- **Hậu điều kiện:** Yêu cầu chờ quyết định ở UC15.
- **Đầu ra:** Yêu cầu tạm ngừng, ApprovalTask.
- **Use case liên quan:** UC15

## UC15 – Tạm ngừng, kích hoạt lại hoặc giải thể CLB

- **Actor chính:** ICPDP Officer
- **Module:** M02
- **Mục tiêu nghiệp vụ:** Kiểm soát vòng đời CLB từ một chỗ duy nhất, với lý do được lưu lại.
- **Kích hoạt:** Một yêu cầu (UC14), tình trạng không hoạt động, kết quả một hồ sơ (UC42), hoặc
  chính sách.
- **Tiền điều kiện:** CLB tồn tại; người gọi có quyền về vòng đời.
- **Dữ liệu vào:** Trạng thái đích, lý do, ngày hiệu lực, giai đoạn nếu là tạm ngừng.
- **Luồng chính:**
  1. Officer mở CLB và xem lại trạng thái, các nghĩa vụ và lịch sử của nó.
  2. Officer chọn `Tạm ngừng`, `Kích hoạt lại` hoặc `Giải thể` và nhập lý do.
  3. Hệ thống áp dụng thay đổi trạng thái và các hệ quả của nó:
     - **Tạm ngừng** — chặn đợt tuyển mới, đề xuất sự kiện mới và booking mới; các đề xuất sự
       kiện chưa được quyết định chuyển `Cancelled`; các sự kiện và booking tương lai đã duyệt
       bị huỷ thông qua UC28 và UC49;
     - **Kích hoạt lại** — CLB quay về `Active` với lịch sử giữ nguyên;
     - **Giải thể** — quyết định được ghi nhận kèm học kỳ hiệu lực của nó: học kỳ kế tiếp trong
       lịch học kỳ (UC04). Các sự kiện, đề xuất và booking kết thúc sau học kỳ đó bị huỷ ngay
       lập tức thông qua UC28 (A1) và UC49 (BR45). CLB giữ nguyên trạng thái và hoạt động bình
       thường cho tới lúc đó, kể cả việc tạo việc mới.
  4. Hệ thống ghi audit quyết định và thông báo cho CLB.
  5. *(Chỉ với giải thể)* Vào đầu học kỳ kế tiếp, scheduler chuyển CLB sang `Dissolving`: không
     mở đợt tuyển nào, không nộp đề xuất sự kiện nào và không nhận booking mới nào. Công việc đã
     được tạo — kể cả các đề xuất còn đang thẩm định — vẫn chạy tới hết, và CMB giữ quyền truy
     cập chỉ để đóng chúng lại (báo cáo sự kiện ở UC33 và UC34, ngân sách, báo cáo định kỳ).
  6. *(Chỉ với giải thể)* Vào cuối học kỳ đó, trước khi học kỳ tiếp theo bắt đầu, scheduler đóng
     mọi thứ còn mở, như một bước duy nhất. Lúc đó không còn sự kiện nào đang chạy, vì mọi sự
     kiện đều gọn trong một học kỳ (BR44) và không cái nào được kết thúc muộn hơn (BR45):
     - các đề xuất sự kiện và yêu cầu booking chưa được quyết định đều bị huỷ;
     - các nghĩa vụ chưa hoàn thành (một báo cáo chưa nộp, một ngân sách chưa đối soát) được ghi
       là còn tồn đọng trong hồ sơ lưu trữ;
     - lịch sử quản trị được lưu trữ, quyền quản lý bị thu hồi, và CLB chuyển `Dissolved`.

     Nếu bất kỳ phần nào thất bại, CLB ở lại `Dissolving` và ICPDP được cảnh báo.
- **Luồng thay thế:**
  - **A1 Từ một hồ sơ:** quyết định được đưa ra như biện pháp khắc phục của một hồ sơ (UC42) và
    được liên kết với hồ sơ đó.
- **Ngoại lệ:**
  - **E1** giải thể được quyết định trong lúc một ngân sách chưa được đối soát → officer được
    cảnh báo; việc đối soát phải xong trước khi kết thúc học kỳ `Dissolving` (bước 6).
- **Hậu điều kiện:** CLB ở `Suspended` hoặc `Active`, hoặc mang một quyết định giải thể có hiệu
  lực từ học kỳ sau và kết thúc ở `Dissolved` sau bước 6; lý do và actor được lưu lại. Khi tạm
  ngừng hoặc giải thể, các sự kiện và booking nêu ở bước 3 chuyển `Cancelled` và khung giờ của
  chúng được giải phóng — đây là một cascade hệ thống (UC28 A1, UC49 A1), không phải một bước mà
  officer thực hiện trong UC28 hay UC49.
- **Quy tắc nghiệp vụ:** BR09, BR10, BR34 — một CLB `Suspended` không mở đợt tuyển nào, không
  nộp đề xuất sự kiện nào và không nhận booking mới nào. BR44, BR45 — không sự kiện hay booking
  nào sống lâu hơn học kỳ `Dissolving`.
- **Đầu ra:** Trạng thái CLB hoặc lịch giải thể, bản ghi audit, các thông báo; ở bước 6, các sự
  kiện và booking đã huỷ cùng hồ sơ lưu trữ kèm các nghĩa vụ còn tồn đọng.
- **Use case liên quan:** UC14, UC42, UC28, UC49, UC02
- **Pain point:** BP01

---

# M04 — Tuyển thành viên và quản lý thành viên

## UC16 – Tạo và công bố đợt tuyển thành viên

- **Actor chính:** CMB
- **Module:** M04
- **Mục tiêu nghiệp vụ:** Tuyển thành viên qua một quy trình có liên kết thay vì một biểu mẫu rời.
- **Kích hoạt:** CLB cần thành viên cho một nhiệm kỳ hoặc một bộ phận.
- **Tiền điều kiện:** CLB đang `Active` (BR01); người gọi có quyền tuyển thành viên.
- **Dữ liệu vào:** Vị trí cần tuyển, tiêu chí, khung thời gian nhận đơn, chỉ tiêu, các vòng
  tuyển, các trường của biểu mẫu ứng tuyển.
- **Luồng chính:**
  1. Thành viên tạo đợt tuyển và nêu vị trí cùng tiêu chí.
  2. Thành viên đặt khung thời gian nhận đơn và chỉ tiêu.
  3. Thành viên định nghĩa các vòng tuyển và biểu mẫu ứng tuyển.
  4. Hệ thống validate khung thời gian theo chính sách lịch học kỳ.
  5. Thành viên công bố → `Published`; đợt tuyển xuất hiện ở UC06.
- **Luồng thay thế:**
  - **A1 Bản nháp:** đợt tuyển được lưu ở `Draft` và công bố sau.
  - **A2 Huỷ:** một đợt tuyển đã công bố mà chưa có đơn nào thì bị huỷ; nếu đã có đơn thì nó
    được đóng lại và những người đã nộp được thông báo.
- **Ngoại lệ:**
  - **E1** CLB đang `Suspended` → từ chối (BR09);
  - **E2** đã tồn tại một đợt tuyển chồng lấn cho cùng vị trí → cảnh báo, và thành viên xác nhận
    hoặc gộp lại.
- **Hậu điều kiện:** Đợt tuyển ở `Published` và nhận đơn trong khung thời gian của nó.
- **Quy tắc nghiệp vụ:** BR01, BR09, BR11.
- **Đầu ra:** RecruitmentCampaign, thông báo tới người theo dõi.
- **Use case liên quan:** UC06, UC17, UC18
- **Pain point:** BP11

## UC17 – Nộp đơn ứng tuyển vào CLB

- **Actor chính:** Student
- **Module:** M04
- **Mục tiêu nghiệp vụ:** Ứng tuyển vào một CLB qua một kênh có liên kết với tư cách thành viên
  mà nó dẫn tới.
- **Kích hoạt:** Sinh viên tìm thấy một đợt tuyển đang mở ở UC06.
- **Tiền điều kiện:** Đợt tuyển đang trong khung thời gian nhận đơn; sinh viên đủ điều kiện.
- **Dữ liệu vào:** Đợt tuyển, vị trí ứng tuyển, các câu trả lời trong biểu mẫu, tệp đính kèm.
- **Luồng chính:**
  1. Sinh viên chọn một đợt tuyển.
  2. Sinh viên điền biểu mẫu và đính kèm những gì đợt tuyển yêu cầu.
  3. Hệ thống validate điều kiện dự tuyển, khung thời gian (BR11) và việc trùng lặp (BR12).
  4. Sinh viên nộp → `Submitted`.
  5. CLB nhận được đơn; sinh viên theo dõi nó ở UC02.
- **Luồng thay thế:**
  - **A1 Bản nháp:** đơn được lưu lại và hoàn thiện trước khi khung thời gian đóng.
  - **A2 Rút đơn:** sinh viên rút một đơn chưa có quyết định (`Submitted`, `Screening` hoặc
    `Shortlisted`) → `Withdrawn`.
- **Ngoại lệ:**
  - **E1** khung thời gian đã đóng → từ chối;
  - **E2** sinh viên đã nộp đơn vào đợt tuyển này → từ chối (BR12);
  - **E3** sinh viên đã có một tư cách thành viên đang hiệu lực ở CLB này → từ chối (BR13);
  - **E4** tư cách thành viên của sinh viên ở CLB này là `Banned` → từ chối (BR46).
- **Hậu điều kiện:** Đơn ở `Submitted` và CLB nhìn thấy được.
- **Quy tắc nghiệp vụ:** BR11, BR12, BR13, BR46.
- **Đầu ra:** RecruitmentApplication, thông báo.
- **Use case liên quan:** UC18, UC02, UC06
- **Pain point:** BP11

## UC18 – Sàng lọc và quyết định đơn ứng tuyển

- **Actor chính:** CMB
- **Module:** M04
- **Mục tiêu nghiệp vụ:** Đưa toàn bộ đơn của một đợt tuyển từ `Submitted` tới quyết định trong
  một phiên, và giữ lại lập luận.
- **Kích hoạt:** Khung thời gian nhận đơn đóng lại, hoặc đơn dồn lại.
- **Tiền điều kiện:** Đợt tuyển có đơn; người gọi có quyền tuyển thành viên.
- **Dữ liệu vào:** Kết quả sàng lọc từng đơn, quyết định và lý do.
- **Luồng chính:**
  1. Thành viên mở danh sách đơn của đợt tuyển và lọc chúng.
  2. Thành viên xem xét một đơn theo tiêu chí → `Screening`.
  3. Thành viên đưa vào danh sách rút gọn hoặc từ chối đơn đó.
  4. Với một ứng viên trong danh sách rút gọn, có thể đính kèm một bản đánh giá (UC19).
  5. Thành viên quyết định: `Accepted`, `Rejected` hoặc `Waitlisted`.
  6. Hệ thống ghi nhận quyết định, thông báo cho ứng viên và hiển thị nó trong UC02 của họ.
- **Luồng thay thế:**
  - **A1 Thao tác hàng loạt:** nhiều đơn cùng bị từ chối hoặc cùng được đưa vào danh sách rút
    gọn, với một lý do dùng chung.
  - **A2 Đẩy từ danh sách chờ:** một ứng viên trong danh sách chờ được nhận khi có suất trống.
- **Ngoại lệ:**
  - **E1** số lượng nhận vượt chỉ tiêu của đợt tuyển → hệ thống chặn phần vượt và gợi ý đưa vào
    danh sách chờ;
  - **E2** ứng viên đã rút đơn (UC17 A2) → đơn được đóng lại mà không có quyết định.
- **Hậu điều kiện:** Mọi đơn đều mang một quyết định; những đơn được nhận đủ điều kiện sang UC20.
- **Quy tắc nghiệp vụ:** Lý do từ chối có thể là bắt buộc theo chính sách. Việc sàng lọc và ra
  quyết định là một use case vì chúng là một phiên làm việc trên cùng một thực thể — v1 đã tách
  chúng thành UC17 và UC19.
- **Đầu ra:** Các quyết định trên đơn, thông báo.
- **Use case liên quan:** UC17, UC19, UC20
- **Pain point:** BP11

## UC19 – Ghi nhận đánh giá ứng viên

- **Actor chính:** CMB
- **Module:** M04
- **Mục tiêu nghiệp vụ:** Làm cho việc tuyển chọn có căn cứ bằng một bản đánh giá có cấu trúc.
- **Kích hoạt:** Một ứng viên trong danh sách rút gọn được phỏng vấn hoặc kiểm tra.
- **Tiền điều kiện:** Đơn đang ở `Shortlisted`.
- **Dữ liệu vào:** Kết quả phỏng vấn, điểm rubric theo từng tiêu chí, nhận xét của người đánh giá.
- **Luồng chính:**
  1. Người đánh giá mở đơn trong danh sách rút gọn.
  2. Người đánh giá chấm từng tiêu chí rubric và thêm nhận xét.
  3. Hệ thống lưu bản đánh giá gắn với đơn và với người đánh giá.
  4. Điểm tổng hợp được hiển thị trong UC18.
- **Luồng thay thế:**
  - **A1 Nhiều người đánh giá:** mỗi người nộp bản đánh giá riêng và hệ thống hiển thị độ phân tán.
- **Ngoại lệ:** **E1** đợt tuyển không có rubric → ghi nhận một bản đánh giá dạng văn bản tự do.
- **Hậu điều kiện:** Bản đánh giá được gắn vào đơn và trở nên bất biến ngay khi quyết định được
  đưa ra.
- **Quy tắc nghiệp vụ:** Rubric được cấu hình theo từng đợt tuyển.
- **Đầu ra:** CandidateEvaluation.
- **Use case liên quan:** UC18

## UC20 – Tiếp nhận ứng viên trúng tuyển

- **Actor chính:** CMB
- **Module:** M04
- **Mục tiêu nghiệp vụ:** Biến một quyết định trúng tuyển thành một bản ghi tư cách thành viên thật.
- **Kích hoạt:** Ứng viên nhận lời mời, hoặc CLB xác nhận việc nhận.
- **Tiền điều kiện:** Đơn đang ở `Accepted`.
- **Dữ liệu vào:** Ngày gia nhập, vai trò mặc định, bộ phận.
- **Luồng chính:**
  1. Thành viên mở danh sách ứng viên đã được nhận của đợt tuyển.
  2. Thành viên xác nhận việc nhận.
  3. Hệ thống tạo ClubMembership với một vai trò mặc định và một ngày gia nhập → `Active`.
  4. Đơn chuyển sang `Onboarded`.
  5. Thành viên mới có quyền truy cập UC24.
- **Luồng thay thế:**
  - **A1 Tiếp nhận thủ công:** một thành viên có thẩm quyền tạo một tư cách thành viên mà không
    qua đợt tuyển, kèm một lý do được ghi lại (BR13).
  - **A2 Từ chối lời mời:** ứng viên từ chối; đơn được đóng lại và suất được trả về danh sách chờ.
- **Ngoại lệ:**
  - **E1** đã tồn tại một tư cách thành viên đang hiệu lực cho sinh viên đó và CLB đó → từ chối;
  - **E2** tư cách thành viên của sinh viên ở CLB này là `Banned` → từ chối, kể cả với tiếp nhận
    thủ công (BR46).
- **Hậu điều kiện:** Tồn tại một ClubMembership đang hiệu lực; số lượng thành viên thay đổi.
- **Quy tắc nghiệp vụ:** BR13 — một tư cách thành viên chỉ đến từ một ứng viên trúng tuyển hoặc
  một lần tiếp nhận thủ công có thẩm quyền; không có hai tư cách thành viên đang hiệu lực trùng
  nhau. BR46 — một sinh viên `Banned` không bao giờ được tiếp nhận lại vào CLB đó.
- **Đầu ra:** ClubMembership, thông báo.
- **Use case liên quan:** UC18, UC21, UC24
- **Pain point:** BP02, BP11

## UC21 – Quản lý trạng thái thành viên

- **Actor chính:** CMB
- **Module:** M04
- **Mục tiêu nghiệp vụ:** Giữ danh sách thành viên đúng thực tế tại mọi thời điểm, kể cả khi kết
  thúc một tư cách thành viên.
- **Kích hoạt:** Một học kỳ bắt đầu, một thành viên ngừng tham gia, bị buộc rời đi, hoặc xin rời
  (UC22).
- **Tiền điều kiện:** Tư cách thành viên tồn tại; người gọi có quyền quản lý thành viên.
- **Dữ liệu vào:** Trạng thái mới, ngày hiệu lực, lý do khi cấm.
- **Luồng chính:**
  1. Thành viên mở danh sách thành viên.
  2. Thành viên đổi trạng thái của một tư cách thành viên:
     - `Active` ⇄ `Inactive` — thành viên ngừng tham gia, hoặc tham gia trở lại;
     - `Banned` — CLB buộc thành viên rời đi.
  3. Thành viên nhập ngày hiệu lực và, với lệnh cấm, một lý do bắt buộc.
  4. Hệ thống áp dụng thay đổi, thu hồi mọi chức vụ đang giữ (UC23) và ghi audit.
  5. Thành viên bị ảnh hưởng được thông báo và thấy thay đổi đó trong UC24.
- **Luồng thay thế:**
  - **A1 Thực thi một yêu cầu rời CLB:** thành viên chấp nhận yêu cầu mà sinh viên đã nộp ở
    UC22; tư cách thành viên chuyển sang `Left` và liên kết với yêu cầu đó.
  - **A2 Đăng ký lại theo học kỳ:** vào đầu mỗi học kỳ của lịch học kỳ (UC04), thành viên xác
    nhận ai còn hoạt động. Hệ thống chuyển mọi tư cách `Active` chưa được xác nhận sang
    `Inactive` và mọi tư cách `Inactive` được xác nhận sang `Active`, hiệu lực từ đầu học kỳ.
- **Ngoại lệ:**
  - **E1** thành viên đang giữ một ghế ban chủ nhiệm đã xác nhận → tư cách thành viên không thể
    chuyển sang `Inactive`, `Left` hay `Banned` cho tới khi UC10/UC11 thay người; trong A2, một
    thành viên ban chủ nhiệm được tính là đã xác nhận;
  - **E2** một ngày hiệu lực lùi về quá khứ sẽ làm thay đổi một bảng điểm danh hoặc một kỳ đánh
    giá đã chốt → từ chối.
- **Hậu điều kiện:** Tư cách thành viên mang trạng thái mới kèm ngày hiệu lực, và lịch sử đọc được.
- **Quy tắc nghiệp vụ:** Mọi thay đổi đều mang một ngày hiệu lực; một lệnh cấm luôn quy được
  trách nhiệm. `Left` và `Banned` là trạng thái cuối — một sinh viên đã `Left` quay lại bằng một
  tư cách thành viên mới (UC20); một sinh viên `Banned` thì không (BR46).
  Việc kết thúc một tư cách thành viên nằm ở đây bất kể ai khởi xướng — đây chính là thứ loại bỏ
  vấn đề hai actor chính của UC23 trong v1.
- **Đầu ra:** Lịch sử trạng thái thành viên, bản ghi audit, thông báo.
- **Use case liên quan:** UC20, UC22, UC23
- **Pain point:** BP02

## UC22 – Xin rời CLB

- **Actor chính:** Student
- **Module:** M04
- **Mục tiêu nghiệp vụ:** Cho một thành viên kết thúc tư cách thành viên của mình một cách có
  ghi nhận thay vì biến mất.
- **Kích hoạt:** Thành viên không còn muốn tham gia.
- **Tiền điều kiện:** Một tư cách thành viên `Active` hoặc `Inactive`.
- **Dữ liệu vào:** Lý do, ngày hiệu lực đề nghị.
- **Luồng chính:**
  1. Sinh viên mở tư cách thành viên trong UC24.
  2. Sinh viên gửi yêu cầu rời CLB kèm lý do và ngày.
  3. CLB được thông báo và thực thi nó ở UC21.
  4. Sinh viên theo dõi yêu cầu ở UC02.
- **Ngoại lệ:** **E1** sinh viên đang giữ một ghế ban chủ nhiệm đã xác nhận → yêu cầu được nhận
  nhưng chỉ có hiệu lực khi UC10/UC11 thay người.
- **Hậu điều kiện:** Một yêu cầu rời CLB đang chờ; tư cách thành viên chỉ thay đổi ở UC21.
- **Quy tắc nghiệp vụ:** Sinh viên khởi xướng, CLB thực thi — mỗi use case một actor.
- **Đầu ra:** Yêu cầu rời CLB, thông báo.
- **Use case liên quan:** UC21, UC24
- **Pain point:** BP02

## UC23 – Phân công chức vụ trong CLB

- **Actor chính:** CMB
- **Module:** M03 / M04
- **Mục tiêu nghiệp vụ:** Trao thẩm quyền nội bộ cho các thành viên dưới cấp ban chủ nhiệm.
- **Kích hoạt:** CLB bổ nhiệm trưởng bộ phận, thủ quỹ hoặc điều phối viên.
- **Tiền điều kiện:** Thành viên đang `Active`; chức vụ đã được định nghĩa ở UC09.
- **Dữ liệu vào:** Thành viên, chức vụ, khoảng thời gian hiệu lực.
- **Luồng chính:**
  1. Thành viên mở cơ cấu tổ chức.
  2. Thành viên gán một chức vụ cho một thành viên đang hoạt động.
  3. Hệ thống áp dụng các quyền gắn với chức vụ đó.
  4. Thay đổi được ghi audit và hiển thị trong UC24.
- **Luồng thay thế:**
  - **A1 Chức vụ nhạy cảm:** một chức vụ được đánh dấu nhạy cảm sẽ được đưa qua UC11 để xác nhận
    trước khi có hiệu lực.
- **Ngoại lệ:** **E1** thành viên không ở trạng thái `Active` → từ chối; **E2** chức vụ đã có
  người giữ và chỉ cho phép một người → từ chối.
- **Hậu điều kiện:** Thành viên giữ chức vụ đó và các quyền của nó.
- **Quy tắc nghiệp vụ:** Một chức vụ chỉ tồn tại nếu UC09 đã định nghĩa nó; một chức vụ nhạy cảm
  cần tới UC11.
- **Đầu ra:** Bản gán chức vụ, các quyền, bản ghi audit.
- **Use case liên quan:** UC09, UC11, UC21

## UC24 – Sử dụng không gian thành viên của tôi

- **Actor chính:** Student (với tư cách thành viên)
- **Module:** M04 (đọc M05, M06, M07, M12)
- **Mục tiêu nghiệp vụ:** Cho tư cách thành viên một lý do tồn tại bên trong hệ thống — v1 cho
  một thành viên đúng những use case y như một người không phải thành viên.
- **Kích hoạt:** Thành viên mở một CLB mà mình thuộc về.
- **Tiền điều kiện:** Có một tư cách thành viên đang hiệu lực ở CLB đó.
- **Luồng chính:**
  1. Sinh viên mở một CLB mà mình có tư cách thành viên.
  2. Hệ thống hiển thị: bản ghi tư cách thành viên và chức vụ; danh sách thành viên và ban chủ
     nhiệm của CLB; các sự kiện sắp tới của CLB kèm trạng thái đăng ký của sinh viên; lịch sử
     điểm danh của họ; các nghĩa vụ còn treo — phản hồi chưa gửi, một yêu cầu rời đang chờ.
  3. Màn hình có liên kết tới UC29 (đăng ký), UC31 (check-in), UC50 (phản hồi) và UC22 (xin rời).
     Đây chỉ là điều hướng giao diện: mỗi cái là một use case độc lập của Student, không phải
     quan hệ «extend» của UC24.
- **Luồng thay thế:**
  - **A1 Nhiều CLB:** sinh viên chuyển qua lại giữa các CLB mình thuộc về.
- **Ngoại lệ:** **E1** tư cách thành viên kết thúc → quyền truy cập hạ về chế độ công khai của UC06.
- **Hậu điều kiện:** Không có; chỉ đọc.
- **Quy tắc nghiệp vụ:** Giới hạn trong các CLB có tư cách thành viên đang hiệu lực. Nó không
  tạo thực thể mới và không tạo dữ liệu mới — mọi trường đều đã do một use case khác sinh ra.
  Nhắn tin nội bộ, chat và chia sẻ file nằm ngoài phạm vi (§5.2).
- **Đầu ra:** Không ghi dữ liệu.
- **Use case liên quan:** UC20, UC22, UC29, UC31, UC50
- **Pain point:** BP02

---

# M05 — Sự kiện và hoạt động

## UC25 – Nộp đề xuất tổ chức sự kiện

- **Actor chính:** CMB
- **Module:** M05
- **Mục tiêu nghiệp vụ:** Xin phép tổ chức một sự kiện qua một workflow duy nhất, truy vết được.
- **Kích hoạt:** CLB lên kế hoạch một hoạt động.
- **Tiền điều kiện:** CLB đang `Active` (BR10) và người gọi có quyền về sự kiện.
- **Dữ liệu vào:** Mục tiêu, thời gian, địa điểm, đối tượng, sức chứa, kế hoạch, mức rủi ro, dự
  toán ngân sách, nhu cầu cơ sở vật chất.
- **Luồng chính:**
  1. Thành viên nhập nội dung đề xuất.
  2. Hệ thống validate tính đầy đủ và thời gian báo trước mà chính sách yêu cầu.
  3. Hệ thống đánh giá quy tắc xung đột BR15 và hiển thị `No Conflict`, `Warning` hoặc
     `Blocking Conflict`.
  4. Thành viên có thể đính kèm một yêu cầu đặt cơ sở vật chất (UC47).
  5. Thành viên nộp → `Pending Approval`.
  6. ICPDP nhận một review task.
- **Luồng thay thế:**
  - **A1 Bản nháp:** đề xuất được lưu ở `Draft`.
  - **A2 Nộp lại sau khi bị yêu cầu chỉnh sửa (UC28 của v1):** từ `Revision Requested`, thành
    viên sửa và nộp lại; hệ thống tạo một **bản sửa mới** và đưa đề xuất về `Pending Approval`.
    Bản sửa trước không bao giờ bị ghi đè.
  - **A3 Hoạt động định kỳ:** một chuỗi hoạt động được nộp như một đề xuất duy nhất, liệt kê các
    lần diễn ra của nó.
- **Ngoại lệ:**
  - **E1** có xung đột chặn trong khi chính sách cấm chồng lịch → từ chối nộp;
  - **E2** một báo cáo bắt buộc đã quá hạn và công tắc cưỡng chế BR21 đang bật → từ chối, kèm
    tên nghĩa vụ đó;
  - **E3** CLB đang `Suspended` → từ chối (BR10);
  - **E4** sự kiện không bắt đầu và kết thúc trong cùng một học kỳ → từ chối (BR44);
  - **E5** CLB đã có quyết định giải thể và sự kiện kết thúc sau học kỳ `Dissolving` của nó →
    từ chối (BR45).
- **Hậu điều kiện:** Đề xuất ở `Pending Approval` với một bản sửa bất biến; tồn tại một review task.
- **Quy tắc nghiệp vụ:** BR10, BR15, BR21, BR44, BR45. Phát hiện xung đột là một quy tắc được
  đánh giá tại đây, không phải một use case (v1 từng đếm nó thành UC25 với actor là `System`).
- **Đầu ra:** EventProposal, bản sửa, ApprovalTask, yêu cầu PropertyBooking nếu có.
- **Use case liên quan:** UC26, UC47, UC04
- **Pain point:** BP05, BP06

## UC26 – Thẩm định và quyết định đề xuất sự kiện

- **Actor chính:** ICPDP Officer
- **Module:** M05
- **Mục tiêu nghiệp vụ:** Một phiên thẩm định duy nhất kết thúc bằng một trong ba kết quả, với
  lập luận của nhà trường được lưu lại.
- **Kích hoạt:** Một review task từ UC25.
- **Tiền điều kiện:** Đề xuất đang ở `Pending Approval`.
- **Dữ liệu vào:** Ghi chú thẩm định, các nhận xét có cấu trúc, quyết định và lý do.
- **Luồng chính:**
  1. Officer mở đề xuất → `Under Review`.
  2. Officer xem xét mức độ tuân thủ, địa điểm, thời gian, dự toán ngân sách, mức rủi ro, các
     nghĩa vụ quá hạn của CLB và yêu cầu booking đính kèm.
  3. Officer ghi lại ghi chú thẩm định, gồm cả ý kiến của Cơ sở vật chất, An ninh hay Tài chính
     lấy từ ngoài hệ thống.
  4. Officer chọn một kết quả:
     - **Yêu cầu chỉnh sửa** — bắt buộc nhận xét có cấu trúc → `Revision Requested`;
     - **Phê duyệt** → `Approved`;
     - **Từ chối** — bắt buộc có lý do → `Rejected`.
  5. Hệ thống ghi audit quyết định và thông báo cho CLB.
- **Luồng thay thế:**
  - **A1 Cấp thứ hai:** một sự kiện rủi ro cao hoặc quy mô lớn được định tuyến lên cấp ICPDP thứ
    hai theo UC05 và BR16.
  - **A2 Phê duyệt kèm điều kiện:** việc phê duyệt mang theo các điều kiện mà CLB phải đáp ứng;
    chúng được kiểm tra lại ở UC34.
- **Ngoại lệ:**
  - **E1** CLB bị tạm ngừng giữa lúc nộp và lúc quyết định → đề xuất chuyển `Cancelled` bởi UC15;
  - **E2** hết deadline chỉnh sửa → scheduler chuyển đề xuất sang `Expired`; CLB phải nộp một đề
    xuất mới.
- **Hậu điều kiện:** Đề xuất ở `Revision Requested`, `Approved` hoặc `Rejected`; chỉ một sự kiện
  đã duyệt mới công bố được ở UC27.
- **Quy tắc nghiệp vụ:** BR05, BR14, BR31. Việc duyệt một đề xuất có kèm yêu cầu booking
  **không** đồng nghĩa duyệt booking đó — UC48 quyết định nó riêng.
- **Đầu ra:** ApprovalDecision, bản ghi audit, thông báo.
- **Use case liên quan:** UC25, UC27, UC48, UC05
- **Pain point:** BP05, BP15

## UC27 – Công bố sự kiện và mở đăng ký

- **Actor chính:** CMB
- **Module:** M05
- **Mục tiêu nghiệp vụ:** Cho khán giả thấy sự kiện và tham gia được.
- **Kích hoạt:** Sự kiện đã được phê duyệt.
- **Tiền điều kiện:** Sự kiện đang `Approved` (BR14).
- **Dữ liệu vào:** Khung thời gian đăng ký, mô tả công khai, phạm vi đối tượng, sức chứa.
- **Luồng chính:**
  1. Thành viên mở sự kiện đã được duyệt.
  2. Thành viên đặt khung thời gian đăng ký, phạm vi đối tượng và thông tin công khai.
  3. Thành viên công bố → `Upcoming`.
  4. Sự kiện xuất hiện ở UC06 và UC24; khung thời gian đăng ký được cưỡng chế ở UC29.
- **Luồng thay thế:**
  - **A1 Sự kiện nội bộ:** phạm vi đối tượng giới hạn trong thành viên CLB, và chỉ UC24 hiển thị nó.
  - **A2 Không cần đăng ký:** một sự kiện mở tự do được công bố mà không có khung thời gian đăng
    ký; việc check-in vẫn áp dụng.
- **Ngoại lệ:** **E1** sự kiện chưa `Approved` → từ chối (BR14); **E2** khung thời gian đăng ký
  kết thúc sau khi sự kiện bắt đầu → từ chối.
- **Hậu điều kiện:** Sự kiện ở `Upcoming` và hiển thị công khai.
- **Quy tắc nghiệp vụ:** BR14, BR17. Scheduler chuyển sự kiện sang `Ongoing` và `Completed` theo
  chính mốc giờ của nó (§7 của tài liệu mô hình).
- **Đầu ra:** Event đã công bố, các thông báo.
- **Use case liên quan:** UC26, UC29, UC06, UC24
- **Pain point:** BP05

## UC28 – Huỷ hoặc đổi lịch sự kiện

- **Actor chính:** CMB
- **Module:** M05
- **Mục tiêu nghiệp vụ:** Thay đổi một sự kiện đã duyệt mà không mất vết và không để rò rỉ một
  căn phòng đã đặt.
- **Kích hoạt:** CLB không thể tổ chức sự kiện như đã được duyệt.
- **Tiền điều kiện:** Sự kiện đang `Approved`, `Upcoming` hoặc `Ongoing`.
- **Dữ liệu vào:** Lý do; với việc đổi lịch là thời gian và địa điểm mới.
- **Luồng chính:**
  1. Thành viên mở sự kiện và chọn `Huỷ` hoặc `Đổi lịch`.
  2. Thành viên nhập lý do.
  3. Với việc đổi lịch, hệ thống đánh giá lại BR15 và, ở nơi chính sách yêu cầu, đưa sự kiện
     quay lại UC26 để có một quyết định mới.
  4. Hệ thống cập nhật hoặc giải phóng booking liên quan (UC49).
  5. Hệ thống thông báo cho mọi người đã đăng ký.
  6. Hệ thống tính lại các nghĩa vụ báo cáo và ngân sách.
- **Luồng thay thế:**
  - **A1 Bị huỷ bởi một quyết định vòng đời:** khi UC15 (tạm ngừng, giải thể) hoặc UC42 (kết quả
    hồ sơ) yêu cầu, hệ thống huỷ sự kiện mà không cần một bước của CMB, ghi quyết định đó làm lý
    do và liên kết tới nó, rồi chạy các bước 4–6. Ngoại lệ E2 không áp dụng. ICPDP không phải
    actor của UC28; đây chính là thứ loại bỏ actor chính thứ hai của UC35 trong v1.
- **Ngoại lệ:**
  - **E1** sự kiện đã có bảng điểm danh được chốt → từ chối huỷ; sự kiện được đóng lại qua UC33
    và UC34;
  - **E2** việc huỷ rơi vào thời hạn báo trước cấu hình được → được ghi nhận là một tín hiệu
    tuân thủ cho UC42.
- **Hậu điều kiện:** Sự kiện ở `Cancelled`, hoặc đã đổi lịch với booking và danh sách đăng ký
  được cập nhật; lý do được ghi audit.
- **Quy tắc nghiệp vụ:** BR35 — huỷ một sự kiện sẽ giải phóng booking đã duyệt của nó. Quyết
  định còn mở D4 chi phối việc một lần đổi lịch có cần một quyết định mới từ UC26 hay không.
- **Đầu ra:** Trạng thái sự kiện, booking được giải phóng, các thông báo, bản ghi audit.
- **Use case liên quan:** UC27, UC49, UC42, UC15

---

# M06 — Đăng ký và điểm danh

## UC29 – Đăng ký tham gia sự kiện

- **Actor chính:** Student
- **Module:** M06
- **Mục tiêu nghiệp vụ:** Ghi nhận người tham gia ngay trên chính hồ sơ sự kiện, không phải trên
  một biểu mẫu riêng.
- **Kích hoạt:** Sinh viên tìm thấy một sự kiện đã công bố ở UC06 hoặc UC24.
- **Tiền điều kiện:** Sự kiện đang `Upcoming` và nằm trong khung thời gian đăng ký.
- **Dữ liệu vào:** Sự kiện, và mọi câu trả lời mà biểu mẫu đăng ký của sự kiện yêu cầu.
- **Luồng chính:**
  1. Sinh viên mở sự kiện và chọn đăng ký.
  2. Hệ thống validate khung thời gian, điều kiện tham gia, việc trùng lặp và sức chứa.
  3. Hệ thống tạo bản đăng ký → `Confirmed`.
  4. Sinh viên thấy nó ở UC02 và UC24 và nhận được xác nhận.
- **Luồng thay thế:**
  - **A1 Danh sách chờ:** sự kiện đã đầy và danh sách chờ được bật → `Waitlisted`. Việc đẩy lên
    từ danh sách chờ được xử lý sau ở UC30.
  - **A2 Huỷ đăng ký:** sinh viên huỷ trước khi sự kiện bắt đầu, và suất đó được giải phóng.
- **Ngoại lệ:**
  - **E1** khung thời gian đã đóng → từ chối;
  - **E2** đã đạt sức chứa và không có danh sách chờ → đăng ký đóng lại và sinh viên được thông báo;
  - **E3** sinh viên không thuộc phạm vi đối tượng của sự kiện → từ chối.
- **Hậu điều kiện:** Tồn tại một bản đăng ký ở `Confirmed` hoặc `Waitlisted`.
- **Quy tắc nghiệp vụ:** BR17 — số đăng ký đã xác nhận không bao giờ vượt sức chứa trừ khi chính
  sách cho phép overbooking. Khi sự kiện không có danh sách chờ, đạt sức chứa nghĩa là đóng đăng ký.
- **Đầu ra:** EventRegistration, thông báo.
- **Use case liên quan:** UC27, UC30, UC31
- **Pain point:** BP07

## UC30 – Quản lý sức chứa và danh sách chờ

- **Actor chính:** CMB
- **Module:** M06
- **Mục tiêu nghiệp vụ:** Lấp đầy chỗ khi danh sách đăng ký biến động.
- **Kích hoạt:** Một suất trống ra, hoặc CLB thay đổi sức chứa.
- **Tiền điều kiện:** Sự kiện đang `Upcoming`, trong khung thời gian đăng ký, và có danh sách chờ.
- **Luồng chính:**
  1. Thành viên mở danh sách đăng ký của sự kiện.
  2. Thành viên điều chỉnh sức chứa hoặc đẩy một sinh viên từ danh sách chờ lên.
  3. Hệ thống áp dụng chính sách đẩy lên đã cấu hình và thông báo cho những người bị ảnh hưởng.
- **Luồng thay thế:**
  - **A1 Đẩy lên tự động:** một lần huỷ sẽ đẩy sinh viên đầu danh sách chờ lên mà không cần thao
    tác thủ công.
- **Ngoại lệ:** **E1** sức chứa bị giảm xuống dưới số đã xác nhận → hệ thống từ chối và nêu rõ
  những bản đăng ký sẽ phải bị huỷ.
- **Hậu điều kiện:** Danh sách đã xác nhận khớp với sức chứa; thứ tự danh sách chờ được giữ nguyên.
- **Quy tắc nghiệp vụ:** BR17. Việc đẩy lên theo chính sách đã cấu hình, không bao giờ theo ưu
  ái thủ công mà không ghi vết.
- **Đầu ra:** Trạng thái các bản đăng ký, thông báo.
- **Use case liên quan:** UC29

## UC31 – Check-in vào sự kiện

- **Actor chính:** Student
- **Actor hỗ trợ:** CMB (check-in thủ công)
- **Module:** M06
- **Mục tiêu nghiệp vụ:** Chứng minh việc có mặt ngay tại nơi sự kiện diễn ra.
- **Kích hoạt:** Người tham dự đến địa điểm.
- **Tiền điều kiện:** Sự kiện đang `Ongoing` hoặc nằm trong khung giờ check-in cấu hình được;
  sinh viên có một bản đăng ký đã xác nhận, hoặc sự kiện là loại mở tự do.
- **Dữ liệu vào:** Mã check-in hoặc QR của sự kiện, hoặc định danh người tham dự khi check-in
  thủ công.
- **Luồng chính:**
  1. Sinh viên mở sự kiện và quét hoặc nhập mã check-in.
  2. Hệ thống xác minh bản đăng ký và khung giờ.
  3. Hệ thống tạo bản ghi điểm danh kèm dấu thời gian.
  4. Feedback window mở ra cho chính người tham dự đó (BR36).
- **Luồng thay thế:**
  - **A1 Check-in thủ công:** một thành viên CMB có quyền check-in hộ một người tham dự bằng
    cách tra cứu; bản ghi lưu lại ai đã thực hiện.
  - **A2 Khách vãng lai:** một sinh viên chưa đăng ký được check-in ở nơi sự kiện cho phép, và
    một bản đăng ký được tạo kèm theo bản ghi điểm danh.
- **Ngoại lệ:**
  - **E1** check-in trùng → không tạo bản ghi thứ hai, và bản đầu tiên vẫn giữ nguyên (BR18);
  - **E2** ngoài khung giờ check-in → từ chối, và một lần check-in thủ công kèm lý do là con
    đường duy nhất;
  - **E3** không có bản đăng ký với một sự kiện chỉ dành cho người đã đăng ký → từ chối.
- **Hậu điều kiện:** Tồn tại đúng một bản ghi điểm danh cho người tham dự đó và sự kiện đó.
- **Quy tắc nghiệp vụ:** BR18. Student là actor chính — CMB chỉ hỗ trợ, và đây chính là thứ loại
  bỏ vấn đề hai actor chính của UC33 trong v1.
- **Đầu ra:** Attendance, feedback window đã mở.
- **Use case liên quan:** UC29, UC32, UC50
- **Pain point:** BP07

## UC32 – Chốt điểm danh sự kiện

- **Actor chính:** CMB
- **Module:** M06
- **Mục tiêu nghiệp vụ:** Tạo ra bộ dữ liệu điểm danh chính thức mà báo cáo và kỳ đánh giá dựa vào.
- **Kích hoạt:** Sự kiện đã kết thúc.
- **Tiền điều kiện:** Sự kiện đang `Completed`; điểm danh chưa được chốt.
- **Dữ liệu vào:** Các hiệu chỉnh cho lượt check-in bất thường, kèm lý do.
- **Luồng chính:**
  1. Thành viên mở danh sách điểm danh của sự kiện.
  2. Hệ thống đánh dấu các bản ghi bất thường — vắng mặt, khách vãng lai, check-in thủ công,
     check-in ngoài khung giờ.
  3. Thành viên sửa hoặc xác nhận từng bản ghi bị đánh dấu, kèm lý do.
  4. Thành viên chốt; hệ thống khoá bộ dữ liệu.
- **Luồng thay thế:**
  - **A1 Mở khoá:** người giữ vai trò đặc biệt mở khoá bộ dữ liệu kèm lý do, và lần mở khoá được
    ghi audit (BR19).
- **Ngoại lệ:** **E1** sự kiện đã bị huỷ → không có gì để chốt.
- **Hậu điều kiện:** Bộ dữ liệu điểm danh chính thức bị khoá và là đầu vào của UC33 và UC44.
- **Quy tắc nghiệp vụ:** BR18, BR19. Việc chốt **không** điều khiển feedback window — BR36 đã mở
  nó từ lúc check-in, và đây là phần sửa của v2 so với UC54 của v1.
- **Đầu ra:** Bộ Attendance chính thức, bản ghi audit.
- **Use case liên quan:** UC31, UC33, UC44
- **Pain point:** BP07

---

# M08 — Trách nhiệm giải trình sau sự kiện

## UC33 – Nộp báo cáo sau sự kiện

- **Actor chính:** CMB
- **Module:** M08
- **Mục tiêu nghiệp vụ:** Khép vòng trách nhiệm giải trình của một sự kiện đã được duyệt.
- **Kích hoạt:** Sự kiện đang `Completed`, hoặc deadline báo cáo của nó đến gần.
- **Tiền điều kiện:** Điểm danh đã được chốt (UC32).
- **Dữ liệu vào:** Kết quả thực tế so với mục tiêu, minh chứng, sự cố, bài học rút ra.
- **Luồng chính:**
  1. Hệ thống nạp sẵn đề xuất đã duyệt, bảng điểm danh đã chốt, ngân sách và các khoản chi, và
     bản tổng hợp phản hồi khi UC51 đã có dữ liệu.
  2. Thành viên nhập kết quả thực tế, các sự cố và bài học rút ra.
  3. Thành viên đính kèm minh chứng.
  4. Thành viên nộp → `Report Submitted`; ICPDP nhận một task.
- **Luồng thay thế:**
  - **A1 Bản nháp:** báo cáo được lưu lại và hoàn thiện trước deadline.
  - **A2 Sửa lại:** một báo cáo bị UC34 trả về được sửa và nộp lại dưới dạng một version mới.
- **Ngoại lệ:**
  - **E1** điểm danh chưa được chốt → từ chối nộp;
  - **E2** đã quá deadline → báo cáo vẫn được nhận nhưng bị đánh dấu trễ, và dữ liệu này đi vào
    BR21 cùng kỳ đánh giá.
- **Hậu điều kiện:** Báo cáo ở `Report Submitted` với các số liệu nạp sẵn đã bị đóng băng.
- **Quy tắc nghiệp vụ:** BR20 — deadline đến từ UC04; một báo cáo quá hạn đi vào BR21.
- **Đầu ra:** Báo cáo sau sự kiện, ApprovalTask.
- **Use case liên quan:** UC32, UC34, UC38, UC51
- **Pain point:** BP08

## UC34 – Thẩm định và đóng báo cáo sự kiện

- **Actor chính:** ICPDP Officer
- **Module:** M08
- **Mục tiêu nghiệp vụ:** Xác định xem sự kiện đã duyệt có thực sự diễn ra đúng như đã duyệt hay
  không, và kết thúc vòng đời của nó.
- **Kích hoạt:** Một task báo cáo từ UC33.
- **Tiền điều kiện:** Báo cáo đang ở `Report Submitted`.
- **Dữ liệu vào:** Ghi chú thẩm định, quyết định, yêu cầu sửa hoặc phát hiện vi phạm.
- **Luồng chính:**
  1. Officer mở báo cáo và đối chiếu kế hoạch với thực tế — điểm danh, ngân sách, mục tiêu, các
     điều kiện đã gắn ở UC26.
  2. Officer chọn một kết quả:
     - **Chấp nhận** → sự kiện chuyển `Closed`;
     - **Trả về để sửa** → sự kiện quay về `Completed` và báo cáo quay lại UC33 (A2);
     - **Ghi nhận một phát hiện** → báo cáo được chấp nhận kèm phát hiện, và phát hiện đó mở một
       hồ sơ ở UC42.
  3. Hệ thống ghi audit quyết định và thông báo cho CLB.
- **Luồng thay thế:**
  - **A1 Không có báo cáo nào được nộp:** officer ghi nhận việc không nộp báo cáo, và dữ liệu
    này đi vào BR21 cùng kỳ đánh giá.
- **Ngoại lệ:** **E1** số liệu mâu thuẫn với bảng điểm danh đã chốt → officer trả báo cáo về
  thay vì chấp nhận nó.
- **Hậu điều kiện:** Sự kiện ở `Closed`, hoặc báo cáo đã quay về với CLB.
- **Quy tắc nghiệp vụ:** BR05, BR21.
- **Đầu ra:** Quyết định về báo cáo, sự kiện `Closed`, bản ghi audit, phát hiện.
- **Use case liên quan:** UC33, UC42, UC44
- **Pain point:** BP08, BP15

---

# M07 — Tài chính và ngân sách

## UC35 – Gửi yêu cầu ngân sách

- **Actor chính:** CMB
- **Module:** M07
- **Mục tiêu nghiệp vụ:** Xin kinh phí gắn với một mục đích nghiệp vụ được nêu rõ.
- **Kích hoạt:** CLB cần tiền cho một sự kiện, một kế hoạch học kỳ hoặc một hoạt động đã duyệt.
- **Tiền điều kiện:** CLB đang `Active`; người gọi có quyền về tài chính.
- **Dữ liệu vào:** Hạng mục, số tiền, mục đích, các dòng chi dự kiến, sự kiện hoặc kế hoạch liên quan.
- **Luồng chính:**
  1. Thành viên tạo yêu cầu và liên kết nó với mục đích của nó (BR22).
  2. Thành viên nhập các hạng mục, số tiền và các dòng chi dự kiến.
  3. Hệ thống validate tổng số và mối liên kết tới một mục đích hợp lệ.
  4. Thành viên nộp → `Submitted`; ICPDP nhận một task.
- **Luồng thay thế:**
  - **A1 Bản nháp:** yêu cầu được lưu lại và hoàn thiện sau.
  - **A2 Sửa và nộp lại (UC40 của v1):** từ `Revision Requested`, thành viên sửa và nộp lại;
    hệ thống tạo một **version mới** và đưa yêu cầu về `Submitted`; **cả lịch sử version lẫn
    lịch sử phê duyệt đều được giữ lại**.
- **Ngoại lệ:**
  - **E1** không có mục đích hợp lệ nào được liên kết → từ chối (BR22);
  - **E2** đã tồn tại một yêu cầu cho cùng sự kiện và cùng hạng mục → cảnh báo, và officer quyết
    định về việc trùng lặp ở UC36.
- **Hậu điều kiện:** Yêu cầu ở `Submitted` với một version bất biến.
- **Quy tắc nghiệp vụ:** BR22.
- **Đầu ra:** BudgetRequest, version, ApprovalTask.
- **Use case liên quan:** UC36, UC25
- **Pain point:** BP09

## UC36 – Thẩm định và quyết định yêu cầu ngân sách

- **Actor chính:** ICPDP Officer
- **Module:** M07
- **Mục tiêu nghiệp vụ:** Mỗi yêu cầu một quyết định cấp kinh phí, với số tiền và lập luận được
  lưu lại.
- **Kích hoạt:** Một task từ UC35.
- **Tiền điều kiện:** Yêu cầu đang ở `Submitted`.
- **Dữ liệu vào:** Ghi chú thẩm định, số tiền được duyệt, quyết định và lý do.
- **Luồng chính:**
  1. Officer mở yêu cầu → `Under Review`.
  2. Officer xem xét điều kiện, hạn mức còn lại, khả năng trùng lặp và trạng thái của hoạt động
     liên quan.
  3. Officer chọn một kết quả:
     - **Yêu cầu chỉnh sửa** → `Revision Requested`;
     - **Phê duyệt** — có thể với số tiền thấp hơn số xin → `Approved`;
     - **Từ chối** — bắt buộc có lý do → `Rejected`.
  4. Hệ thống ghi audit quyết định và thông báo cho CLB.
- **Luồng thay thế:**
  - **A1 Cấp thứ hai:** một số tiền vượt ngưỡng được định tuyến lên cấp ICPDP thứ hai theo UC05
    và BR16.
  - **A2 Phê duyệt từng phần theo hạng mục:** từng dòng được duyệt và các dòng khác bị từ chối,
    mỗi dòng kèm lý do của nó.
- **Ngoại lệ:**
  - **E1** sự kiện liên quan bị từ chối hoặc bị huỷ → yêu cầu chuyển `Cancelled`;
  - **E2** hạn mức của kỳ đã cạn → officer từ chối hoặc hoãn lại, kèm lý do được ghi nhận.
- **Hậu điều kiện:** Yêu cầu ở `Revision Requested`, `Approved` kèm một số tiền duyệt, hoặc
  `Rejected`.
- **Quy tắc nghiệp vụ:** BR05 bắt buộc audit; số tiền duyệt có thể khác số tiền xin ở nơi chính
  sách cho phép.
- **Đầu ra:** ApprovalDecision, số tiền duyệt, bản ghi audit.
- **Use case liên quan:** UC35, UC37, UC05
- **Pain point:** BP09

## UC37 – Ghi nhận giải ngân

- **Actor chính:** ICPDP Officer
- **Module:** M07
- **Mục tiêu nghiệp vụ:** Theo dõi số tiền thực sự được cấp so với số đã duyệt.
- **Kích hoạt:** Kinh phí được chuyển cho CLB.
- **Tiền điều kiện:** Yêu cầu đang ở `Approved`.
- **Dữ liệu vào:** Số tiền duyệt, số tiền giải ngân, ngày, mã tham chiếu thanh toán.
- **Luồng chính:**
  1. Officer mở yêu cầu đã được duyệt.
  2. Officer ghi số tiền giải ngân, ngày và mã tham chiếu.
  3. Hệ thống đối chiếu số tiền với phần đã duyệt (BR23).
  4. Trạng thái chuyển sang `Disbursed`; CLB được thông báo.
- **Luồng thay thế:**
  - **A1 Giải ngân từng phần:** nhiều lần giải ngân cộng dồn vào một lần duyệt, mỗi lần được ghi
    riêng.
- **Ngoại lệ:** **E1** tổng giải ngân sẽ vượt số tiền đã duyệt → từ chối khi chưa có văn bản
  điều chỉnh (BR23).
- **Hậu điều kiện:** Tổng số đã giải ngân là xác định và là đầu vào của UC39.
- **Quy tắc nghiệp vụ:** BR23. Chỉ theo dõi — đây không phải một hệ thống kế toán (§5.2). Không
  có nó thì UC39 không tính được gì.
- **Đầu ra:** Bản ghi giải ngân.
- **Use case liên quan:** UC36, UC39
- **Pain point:** BP10

## UC38 – Ghi nhận khoản chi kèm chứng từ

- **Actor chính:** CMB
- **Module:** M07
- **Mục tiêu nghiệp vụ:** Theo dõi chi tiêu thực tế và chứng minh nó trong cùng một thao tác.
- **Kích hoạt:** CLB chi tiền.
- **Tiền điều kiện:** Có một ngân sách hoặc sự kiện liên quan; người gọi có quyền về tài chính.
- **Dữ liệu vào:** Hạng mục, số tiền, ngày, ngân sách hoặc sự kiện liên quan, mô tả; hoá đơn,
  biên lai hoặc chứng từ thanh toán.
- **Luồng chính:**
  1. Thành viên ghi khoản chi vào dòng ngân sách hoặc sự kiện của nó.
  2. Thành viên đính kèm chứng từ mà hạng mục yêu cầu (BR25).
  3. Hệ thống validate hạng mục theo phần đã duyệt và gắn cờ ngoại lệ cho khoản chi ngoài hạng
     mục (BR24).
  4. Hệ thống lưu khoản chi cùng chứng từ của nó.
- **Luồng thay thế:**
  - **A1 Chứng từ bổ sung sau:** khoản chi được ghi mà chưa có chứng từ và xuất hiện dưới dạng
    *thiếu chứng từ* trong UC39 cho tới khi chứng từ được bổ sung.
  - **A2 Sửa lại:** một khoản chi được sửa trước khi việc đối soát đóng lại; thay đổi được ghi audit.
- **Ngoại lệ:**
  - **E1** khoản chi vượt phần đã duyệt còn lại → được ghi nhận và gắn cờ ngoại lệ;
  - **E2** chứng từ không tham chiếu tới một khoản chi nào → bất khả thi về mặt cấu trúc, và đó
    chính là lý do UC43 và UC44 của v1 gộp thành một use case ở đây.
- **Hậu điều kiện:** Khoản chi tồn tại, có hoặc chưa có chứng từ, và là đầu vào của UC39.
- **Quy tắc nghiệp vụ:** BR24, BR25. Mỗi chứng từ tham chiếu đúng một khoản chi.
- **Đầu ra:** Expense, FinancialEvidence.
- **Use case liên quan:** UC37, UC39, UC33
- **Pain point:** BP09, BP10

## UC39 – Đối soát ngân sách và chi tiêu

- **Actor chính:** ICPDP Officer
- **Module:** M07
- **Mục tiêu nghiệp vụ:** Xác lập rằng số đã duyệt, đã giải ngân, đã chi và đã có chứng từ cùng
  kể một câu chuyện.
- **Kích hoạt:** Hoạt động kết thúc, hoặc đến hạn đối soát.
- **Tiền điều kiện:** Yêu cầu đang ở `Disbursed`; đã có khoản chi được ghi nhận.
- **Luồng chính:**
  1. Officer mở hồ sơ ngân sách.
  2. Hệ thống tính: đã duyệt, đã giải ngân, khoản chi đã ghi nhận, khoản chi có chứng từ, khoản
     chi thiếu chứng từ, số dư còn lại, chênh lệch.
  3. Officer xem xét các ngoại lệ do UC38 gắn cờ.
  4. Officer đánh dấu hồ sơ `Reconciled`, hoặc `Exception` kèm phần chênh lệch được nêu rõ.
  5. Hệ thống ghi audit kết quả; CLB thấy nó ở UC02.
- **Luồng thay thế:**
  - **A1 Trả về để bổ sung chứng từ:** officer yêu cầu phần chứng từ còn thiếu, và hồ sơ chờ ở
    `Reconciliation Pending`.
- **Ngoại lệ:** **E1** số tiền đã giải ngân vượt số tiền đã duyệt → hồ sơ không đối soát được
  cho tới khi có một văn bản điều chỉnh (BR23).
- **Hậu điều kiện:** Hồ sơ ở `Reconciled` hoặc `Exception`; sau đó officer đóng nó tại đây →
  `Closed` (BR26). Một hồ sơ `Exception` vẫn đóng được, với phần chênh lệch nằm trong hồ sơ.
- **Quy tắc nghiệp vụ:** BR23, BR24, BR26. ICPDP là actor chính duy nhất; CMB đọc cùng bộ số
  liệu qua UC02, và đó chính là thứ loại bỏ vấn đề hai actor chính của UC45 trong v1.
- **Đầu ra:** Kết quả đối soát, bản ghi audit; đầu vào cho UC44.
- **Use case liên quan:** UC37, UC38, UC44
- **Pain point:** BP10

---

# M08 — Báo cáo và tuân thủ

## UC40 – Nộp báo cáo hoạt động định kỳ

- **Actor chính:** CMB
- **Module:** M08
- **Mục tiêu nghiệp vụ:** Hoàn thành nghĩa vụ báo cáo từ chính dữ liệu hệ thống đã có.
- **Kích hoạt:** Kỳ báo cáo kết thúc, hoặc deadline của nó đến gần.
- **Tiền điều kiện:** CLB đang `Active`, hoặc `Suspended` nhưng còn nghĩa vụ; kỳ báo cáo được
  định nghĩa ở UC04.
- **Dữ liệu vào:** Phần thuyết minh và minh chứng mà hệ thống chưa có.
- **Luồng chính:**
  1. Thành viên mở báo cáo cho kỳ tương ứng — học kỳ, năm học hoặc một kỳ cấu hình được.
  2. Hệ thống nạp sẵn các sự kiện, số liệu thành viên, điểm danh và tình hình tài chính.
  3. Thành viên thêm phần thuyết minh, kế hoạch kỳ sau và mọi minh chứng bên ngoài.
  4. Thành viên nộp → `Submitted`; ICPDP nhận một task.
- **Luồng thay thế:**
  - **A1 Bản nháp:** được lưu lại và hoàn thiện trước deadline.
  - **A2 Sửa lại:** một báo cáo bị UC41 trả về được nộp lại dưới dạng một version mới.
- **Ngoại lệ:** **E1** đã quá deadline → vẫn được nhận nhưng bị đánh dấu trễ, và dữ liệu này đi
  vào BR21 cùng kỳ đánh giá.
- **Hậu điều kiện:** Báo cáo ở `Submitted` với các số liệu nạp sẵn đã bị đóng băng.
- **Quy tắc nghiệp vụ:** BR20 — deadline và các mốc nhắc đến từ UC04 và §19.
- **Đầu ra:** Báo cáo định kỳ, ApprovalTask.
- **Use case liên quan:** UC41, UC04
- **Pain point:** BP14

## UC41 – Thẩm định báo cáo hoạt động định kỳ

- **Actor chính:** ICPDP Officer
- **Module:** M08
- **Mục tiêu nghiệp vụ:** Xác nhận báo cáo để nó dùng được làm đầu vào đánh giá.
- **Kích hoạt:** Một task từ UC40.
- **Tiền điều kiện:** Báo cáo đang ở `Submitted`.
- **Luồng chính:**
  1. Officer mở báo cáo và đối chiếu nó với số liệu của chính hệ thống.
  2. Officer chấp nhận báo cáo, hoặc trả về để sửa kèm nhận xét có cấu trúc.
  3. Hệ thống ghi audit kết quả và thông báo cho CLB.
- **Luồng thay thế:**
  - **A1 Chấp nhận kèm ghi nhận:** báo cáo được chấp nhận kèm một ghi nhận được lưu lại cho kỳ
    đánh giá.
- **Ngoại lệ:** **E1** không có báo cáo nào được nộp đúng hạn → officer ghi nhận việc không nộp,
  và dữ liệu này đi vào BR21 cùng kỳ đánh giá.
- **Hậu điều kiện:** Một báo cáo được chấp nhận trở thành đầu vào đánh giá cho UC44.
- **Quy tắc nghiệp vụ:** BR05, BR21.
- **Đầu ra:** Quyết định về báo cáo, bản ghi audit.
- **Use case liên quan:** UC40, UC44
- **Pain point:** BP14

## UC42 – Quản lý hồ sơ vi phạm và tuân thủ

- **Actor chính:** ICPDP Officer
- **Module:** M08
- **Mục tiêu nghiệp vụ:** Xử lý một vi phạm như một hồ sơ có trạng thái, có người phụ trách và
  có vết xử lý.
- **Kích hoạt:** Một khiếu nại được leo thang (UC53), một phát hiện từ báo cáo (UC34), một báo
  cáo quá hạn, một ngoại lệ tài chính (UC39), một sự kiện không phép, hoặc một lần huỷ booking
  sát giờ (UC49).
- **Tiền điều kiện:** Người gọi có quyền về tuân thủ.
- **Dữ liệu vào:** Nguồn gốc, mức độ nghiêm trọng, mô tả, chứng cứ, CLB liên quan, biện pháp
  khắc phục.
- **Luồng chính:**
  1. Officer mở một hồ sơ và ghi nhận nguồn gốc cùng mức độ nghiêm trọng của nó (BR27).
  2. Hồ sơ chuyển sang `Under Investigation`; officer thu thập chứng cứ.
  3. Officer yêu cầu CLB giải trình → `Awaiting Club Response`.
  4. CLB trả lời, trong chính use case này hoặc qua UC54 khi nguồn gốc là một khiếu nại.
  5. Officer đưa ra quyết định kèm lý do và chứng cứ (BR28) → `Decision Issued`.
  6. Officer ghi nhận biện pháp khắc phục và hạn của nó → `Corrective Action`.
  7. Khi biện pháp được xác minh, hồ sơ chuyển `Resolved`.
- **Luồng thay thế:**
  - **A1 Leo thang sang vòng đời:** biện pháp khắc phục là tạm ngừng hoặc giải thể, được thực
    hiện ở UC15 và liên kết với hồ sơ.
  - **A2 Đóng không kèm biện pháp:** điều tra kết luận không có vi phạm; hồ sơ đóng lại với lý
    do được ghi nhận.
- **Ngoại lệ:** **E1** CLB không trả lời đúng hạn → officer tiếp tục và ghi nhận việc không phản hồi.
- **Hậu điều kiện:** Hồ sơ ở `Resolved` hoặc đã đóng; lịch sử của nó là đầu vào cho UC44.
- **Quy tắc nghiệp vụ:** BR27, BR28. Mỗi hồ sơ ghi lại nguồn gốc của nó, và một hồ sơ mở từ một
  khiếu nại sẽ liên kết ngược lại khiếu nại đó.
- **Đầu ra:** Violation, CorrectiveAction, bản ghi audit.
- **Use case liên quan:** UC53, UC34, UC39, UC49, UC15, UC44
- **Pain point:** BP12

---

# M09 — Đánh giá hiệu quả

## UC43 – Cấu hình scheme đánh giá

- **Actor chính:** ICPDP Officer
- **Module:** M09
- **Mục tiêu nghiệp vụ:** Định nghĩa cách chấm điểm CLB, trước khi bất cứ thứ gì được chấm.
- **Kích hoạt:** Một kỳ đánh giá mới, hoặc một thay đổi trong chính sách chấm điểm.
- **Tiền điều kiện:** Người gọi có quyền cấu hình đánh giá.
- **Dữ liệu vào:** Các dimension của §17 (D1–D6), trọng số, ngưỡng cho từng mức xếp loại, kỳ áp
  dụng, trạng thái kích hoạt.
- **Luồng chính:**
  1. Officer tạo hoặc mở một version scheme.
  2. Officer đặt các dimension, trọng số và ngưỡng xếp loại.
  3. Hệ thống validate tổng trọng số (BR29).
  4. Officer kích hoạt scheme cho một kỳ.
  5. Hệ thống đánh phiên bản và ghi audit.
- **Luồng thay thế:**
  - **A1 Sao chép:** scheme của kỳ trước được sao chép và điều chỉnh.
- **Ngoại lệ:** **E1** tổng trọng số không hợp lệ → từ chối kích hoạt (BR29); **E2** scheme đã
  được một kỳ đánh giá đã công bố sử dụng → tạo một version mới thay vì sửa.
- **Hậu điều kiện:** Có đúng một scheme đang hoạt động cho mỗi kỳ.
- **Quy tắc nghiệp vụ:** BR29, BR30. v1 validate một scheme mà không use case nào cấu hình.
- **Đầu ra:** Version EvaluationScheme, bản ghi audit.
- **Use case liên quan:** UC44
- **Pain point:** BP13

## UC44 – Sinh bản nháp đánh giá hiệu quả CLB

- **Actor chính:** ICPDP Officer
- **Module:** M09
- **Mục tiêu nghiệp vụ:** Biến trọn một kỳ dữ liệu vận hành thành dữ liệu quản trị, không cần
  tổng hợp thủ công.
- **Kích hoạt:** Kỳ đánh giá kết thúc.
- **Tiền điều kiện:** Có một scheme đang hoạt động (UC43); các báo cáo của kỳ đã được thẩm định
  (UC41).
- **Dữ liệu vào:** Kỳ đánh giá và danh sách CLB trong phạm vi.
- **Luồng chính:**
  1. Officer khởi động việc sinh bản nháp cho một kỳ.
  2. Hệ thống thu thập các đầu vào: hoạt động (UC26–UC34), điểm danh (UC32), thành viên (UC21),
     tài chính (UC39), báo cáo (UC41), vi phạm (UC42), phản hồi (UC50), kết quả khiếu nại
     (UC53), mức tuân thủ về booking (UC48, UC49).
  3. Hệ thống áp dụng scheme đang hoạt động và tính điểm cho từng dimension kèm chứng cứ phía
     sau mỗi dimension.
  4. Trạng thái chuyển sang `Data Ready`.
- **Luồng thay thế:**
  - **A1 Một CLB riêng lẻ:** bản nháp được sinh lại cho một CLB sau một lần hiệu chỉnh muộn.
- **Ngoại lệ:** **E1** một nguồn dữ liệu không đầy đủ → dimension đó được đánh dấu
  `Insufficient data` thay vì bị chấm 0.
- **Hậu điều kiện:** Mỗi CLB có một bản nháp đánh giá kèm chứng cứ và data lineage của nó.
- **Quy tắc nghiệp vụ:** BR29. Bản nháp không bao giờ được công bố khi chưa qua UC45.
- **Đầu ra:** Bản nháp đánh giá, data lineage.
- **Use case liên quan:** UC43, UC45, UC41, UC39, UC42
- **Pain point:** BP13

## UC45 – Xem lại, chốt và công bố đánh giá

- **Actor chính:** ICPDP Officer
- **Module:** M09
- **Mục tiêu nghiệp vụ:** Công bố một kết quả chính thức mà CLB đọc được và phản biện được.
- **Kích hoạt:** Một bản nháp đang ở `Data Ready`.
- **Tiền điều kiện:** Bản nháp của kỳ đó tồn tại.
- **Dữ liệu vào:** Cách xử lý các bất thường, các dimension chấm tay được phép, mức xếp loại cuối.
- **Luồng chính:**
  1. Officer xem lại bản nháp và dữ liệu nguồn của nó.
  2. Officer xử lý các bất thường và các dimension `Insufficient data`.
  3. Officer thêm các dimension chấm tay mà scheme cho phép, kèm một lý giải.
  4. Officer chốt → `Finalized`.
  5. Officer công bố → `Published`; các CLB được thông báo và xem được kết quả.
- **Luồng thay thế:**
  - **A1 Bản sửa sau khi công bố:** một bản sửa hoặc bản chụp mới được tạo; bản đã công bố không
    bao giờ bị sửa (BR30).
- **Ngoại lệ:** **E1** một CLB phản biện kết quả → việc phản biện được xử lý như một hồ sơ
  (UC42), và mọi hiệu chỉnh trở thành một bản sửa mới.
- **Hậu điều kiện:** Mỗi CLB có một kỳ đánh giá đã công bố cho kỳ đó, kèm lịch sử của nó.
- **Quy tắc nghiệp vụ:** BR30.
- **Đầu ra:** Evaluation đã công bố, thông báo, bản ghi audit.
- **Use case liên quan:** UC44
- **Pain point:** BP13

---

# M11 — Cơ sở vật chất và đặt chỗ

## UC46 – Quản lý danh mục cơ sở vật chất

- **Actor chính:** ICPDP Officer
- **Module:** M11
- **Mục tiêu nghiệp vụ:** Định nghĩa những gì CLB được phép đặt — tiền điều kiện còn thiếu của
  UC51 trong v1.
- **Kích hoạt:** Nhà trường mở một phòng hoặc thiết bị cho hoạt động CLB, hoặc thông tin của nó
  thay đổi.
- **Tiền điều kiện:** Người gọi có quyền quản trị cơ sở vật chất.
- **Dữ liệu vào:** Mã và tên property, loại (phòng, hội trường, thiết bị), sức chứa, vị trí,
  thiết bị đi kèm, khung giờ được đặt, các giai đoạn khoá, trạng thái hoạt động.
- **Luồng chính:**
  1. Officer thêm một property hoặc mở một property đã có.
  2. Officer đặt sức chứa, vị trí, khung giờ được đặt và các giai đoạn khoá của nó.
  3. Officer kích hoạt nó; nó trở nên chọn được ở UC47.
- **Luồng thay thế:**
  - **A1 Ngừng kích hoạt:** một property không còn được đặt nữa thì bị ngừng kích hoạt; các
    booking đã duyệt hiện có vẫn giữ nguyên.
  - **A2 Giai đoạn khoá:** một giai đoạn bị chặn để bảo trì, và các yêu cầu xung đột với nó được
    hiển thị ra.
- **Ngoại lệ:** **E1** cố xoá trong khi còn booking tương lai đã duyệt → từ chối; ngừng kích
  hoạt là con đường duy nhất (BR41).
- **Hậu điều kiện:** Danh mục phản ánh đúng những gì đặt được, và từ khi nào.
- **Quy tắc nghiệp vụ:** BR41. Việc đổi khung giờ được đặt không bao giờ làm vô hiệu một quyết
  định đã ra. UCMS chỉ giữ những property được mở cho hoạt động CLB và không thay thế hệ thống
  đặt phòng riêng của trường (§5.2).
- **Đầu ra:** Các bản ghi Property, bản ghi audit.
- **Use case liên quan:** UC47, UC48
- **Pain point:** BP16

## UC47 – Gửi yêu cầu đặt cơ sở vật chất

- **Actor chính:** CMB
- **Module:** M11
- **Mục tiêu nghiệp vụ:** Xin một phòng hoặc thiết bị qua một quy trình truy vết được và gắn với
  sự kiện.
- **Kích hoạt:** CLB cần địa điểm hoặc thiết bị cho một sự kiện hoặc một hoạt động định kỳ.
- **Tiền điều kiện:** CLB đang `Active` (BR34); người gọi có quyền tương ứng; property đang hoạt
  động trong UC46.
- **Dữ liệu vào:** Property, mục đích sử dụng, thời điểm bắt đầu và kết thúc, số người dự kiến,
  thiết bị đi kèm, sự kiện liên quan nếu có.
- **Luồng chính:**
  1. Thành viên chọn một property từ danh mục mà ICPDP duy trì (UC46).
  2. Hệ thống hiển thị tình trạng còn trống của nó.
  3. Thành viên nhập thông tin sử dụng.
  4. Hệ thống đánh giá quy tắc xung đột BR15.
  5. Thành viên nộp → `Requested`; ICPDP nhận một review task.
- **Luồng thay thế:**
  - **A1 Bản nháp:** được lưu ở `Draft`.
  - **A2 Đính kèm vào một đề xuất:** yêu cầu được đính kèm vào một đề xuất sự kiện đang soạn (UC25).
  - **A3 Sửa và nộp lại:** từ `Revision Requested`, thành viên sửa và nộp lại; hệ thống tạo một
    **version mới** và đưa booking về `Requested` — chính là luồng đối xứng mà v1 có ở bước 3
    của UC52 nhưng không bao giờ cấp cho nó một use case.
- **Ngoại lệ:**
  - **E1** khung giờ đã có người đặt và chính sách cấm overbooking → từ chối (BR33);
  - **E2** thời gian yêu cầu rơi vào một giai đoạn khoá → từ chối;
  - **E3** số người dự kiến vượt sức chứa của property → cảnh báo, và officer quyết định ở UC48;
  - **E4** CLB đã có quyết định giải thể và booking kết thúc sau học kỳ `Dissolving` của nó →
    từ chối (BR45).
- **Hậu điều kiện:** Booking ở `Requested`.
- **Quy tắc nghiệp vụ:** BR15, BR33, BR34, BR45.
- **Đầu ra:** PropertyBooking, ApprovalTask.
- **Use case liên quan:** UC25, UC46, UC48
- **Pain point:** BP16

## UC48 – Thẩm định và quyết định yêu cầu đặt cơ sở vật chất

- **Actor chính:** ICPDP Officer
- **Module:** M11
- **Mục tiêu nghiệp vụ:** Cấp phát nguồn lực của nhà trường một cách có kiểm soát, với lý do
  được lưu lại.
- **Kích hoạt:** Một task từ UC47.
- **Tiền điều kiện:** Booking đang ở `Requested`.
- **Dữ liệu vào:** Ghi chú thẩm định, quyết định và lý do.
- **Luồng chính:**
  1. Officer mở yêu cầu → `Under Review`.
  2. Officer kiểm tra trạng thái CLB, mục đích, các xung đột và các nghĩa vụ quá hạn.
  3. Officer chọn: **yêu cầu chỉnh sửa**, **phê duyệt**, hoặc **từ chối** — hai kết quả sau bắt
     buộc có lý do.
  4. Hệ thống ghi audit quyết định, cập nhật trạng thái và gửi `Property booking status` cho CMB.
- **Luồng thay thế:**
  - **A1 Duyệt một khung giờ khác:** officer đề xuất một thời gian hoặc property thay thế, và
    CLB chấp nhận qua UC47 A3.
- **Ngoại lệ:** **E1** một booking khác đã được duyệt cho cùng khung giờ trong lúc chờ → yêu cầu
  được trả lại do xung đột.
- **Hậu điều kiện:** Booking ở `Approved`, `Rejected` hoặc `Revision Requested`; một booking đã
  duyệt khoá khung giờ.
- **Quy tắc nghiệp vụ:** BR33, BR34, BR35, BR31 — chỉ ICPDP quyết định; một CLB `Suspended`
  không nhận booking mới.
- **Đầu ra:** ApprovalDecision, khung giờ bị khoá, bản ghi audit, thông báo.
- **Use case liên quan:** UC47, UC49, UC26
- **Pain point:** BP16

## UC49 – Theo dõi và huỷ / trả cơ sở vật chất đã đặt

- **Actor chính:** CMB
- **Module:** M11
- **Mục tiêu nghiệp vụ:** Giải phóng một nguồn lực không còn cần tới để một CLB khác đặt được.
- **Kích hoạt:** Sự kiện bị huỷ hoặc đổi lịch (UC28), hoặc CLB không còn cần property đó.
- **Tiền điều kiện:** Booking đang ở `Requested` hoặc `Approved`.
- **Dữ liệu vào:** Lý do huỷ.
- **Luồng chính:**
  1. Thành viên mở booking.
  2. Thành viên chọn `Huỷ` và nhập lý do.
  3. Hệ thống giải phóng khung giờ.
  4. ICPDP được thông báo; khung giờ trở nên đặt được ở UC47.
- **Luồng thay thế:**
  - **A1 Tự động giải phóng:** sự kiện liên quan bị huỷ ở UC28, và hệ thống giải phóng booking
    mà không cần thao tác thủ công (BR35). Khi việc huỷ đó đến từ UC15 hoặc UC42, một booking
    đang `In Use` cũng được giải phóng và ngoại lệ E2 không áp dụng.
- **Ngoại lệ:** **E1** booking đã `In Use` hoặc `Completed` → từ chối huỷ; **E2** việc huỷ rơi
  vào thời hạn báo trước cấu hình được → được ghi nhận là một tín hiệu tuân thủ cho UC42.
- **Hậu điều kiện:** Booking ở `Cancelled` hoặc `Released`; khung giờ đã trống.
- **Quy tắc nghiệp vụ:** BR35. Không có nó, một booking đã duyệt sẽ khoá một căn phòng vĩnh viễn.
- **Đầu ra:** Trạng thái booking, khung giờ được giải phóng, thông báo; tín hiệu tuân thủ.
- **Use case liên quan:** UC28, UC48, UC42
- **Pain point:** BP16

---

# M12 — Phản hồi và khiếu nại

## UC50 – Gửi phản hồi sau sự kiện

- **Actor chính:** Student
- **Module:** M12
- **Mục tiêu nghiệp vụ:** Thu thập đánh giá của người tham dự làm dữ liệu cải tiến và dữ liệu
  đánh giá.
- **Kích hoạt:** Feedback window mở ra tại thời điểm check-in của người tham dự (BR36).
- **Tiền điều kiện:** Sinh viên có một bản ghi điểm danh của sự kiện đó.
- **Dữ liệu vào:** Điểm theo từng tiêu chí, nhận xét tự do, tuỳ chọn ẩn danh.
- **Luồng chính:**
  1. Sinh viên mở một sự kiện mình đã tham dự, từ UC02 hoặc UC24.
  2. Sinh viên điền biểu mẫu phản hồi.
  3. Sinh viên nộp.
  4. Hệ thống lưu lại và cập nhật thống kê tổng hợp.
- **Luồng thay thế:**
  - **A1 Ẩn danh:** danh tính bị ẩn khỏi CMB; một liên kết nội bộ được giữ lại chỉ để chống spam.
- **Ngoại lệ:**
  - **E1** đã gửi phản hồi cho sự kiện đó rồi → từ chối (BR36);
  - **E2** window đã đóng → từ chối;
  - **E3** không có bản ghi điểm danh → biểu mẫu không được hiển thị.
- **Hậu điều kiện:** Tồn tại một bản ghi EventFeedback và nó là bất biến.
- **Quy tắc nghiệp vụ:** BR36 — mỗi người tham dự một phản hồi cho một sự kiện, nhận từ lúc
  **check-in** cho tới khi window cấu hình được đóng lại. Đây là phần sửa của v2: v1 mở window
  sau khi chốt điểm danh ở UC32, nên một CLB chốt muộn — đúng cái hành vi mà BP08 mô tả — đẩy tỉ
  lệ phản hồi về 0 và làm dimension D1, D2 chết đói dữ liệu. BR37 — không bao giờ bị sửa hay
  xoá, và CMB chỉ thấy ở dạng tổng hợp. BR40 — không hiển thị bản tổng hợp khi chưa đạt số người
  phản hồi tối thiểu.
- **Đầu ra:** EventFeedback, bản tổng hợp được cập nhật.
- **Use case liên quan:** UC31, UC51, UC44
- **Pain point:** BP17

## UC51 – Xem phản hồi sự kiện

- **Actor chính:** CMB
- **Module:** M12
- **Mục tiêu nghiệp vụ:** Dùng đánh giá của người tham dự để cải thiện hoạt động kế tiếp.
- **Kích hoạt:** Feedback window đóng lại, hoặc CLB chuẩn bị báo cáo sau sự kiện.
- **Tiền điều kiện:** Sự kiện có phản hồi, và số người phản hồi đạt mức tối thiểu của BR40.
- **Luồng chính:**
  1. Thành viên mở bản tổng hợp của một sự kiện.
  2. Thành viên đọc điểm trung bình theo từng tiêu chí, phân bố điểm và các nhận xét.
  3. Thành viên mang kết luận vào báo cáo sau sự kiện (UC33).
- **Luồng thay thế:**
  - **A1 So sánh nhiều sự kiện:** CLB so sánh bản tổng hợp giữa các sự kiện của chính mình trong
    một giai đoạn.
- **Ngoại lệ:** **E1** số người phản hồi ít hơn mức BR40 yêu cầu → chỉ hiển thị việc có tồn tại
  phản hồi, không bao giờ hiển thị nội dung.
- **Hậu điều kiện:** Không có; chỉ đọc. Bài học rút ra được ghi ở UC33.
- **Quy tắc nghiệp vụ:** BR37, BR40. CMB không được sửa hay xoá phản hồi của người tham dự.
- **Đầu ra:** Bản tổng hợp phản hồi; đầu vào cho UC33 và UC44.
- **Use case liên quan:** UC50, UC33, UC44
- **Pain point:** BP17

## UC52 – Gửi khiếu nại về một CLB

- **Actor chính:** Student
- **Module:** M12
- **Mục tiêu nghiệp vụ:** Cho sinh viên một kênh khiếu nại chính thức có vết xử lý.
- **Kích hoạt:** Một sinh viên gặp vấn đề với một CLB hoặc một hoạt động của CLB.
- **Tiền điều kiện:** Có một phiên hợp lệ (UC01).
- **Dữ liệu vào:** CLB liên quan, sự kiện liên quan nếu có, loại khiếu nại, mô tả, chứng cứ.
- **Luồng chính:**
  1. Sinh viên chọn CLB, và sự kiện nếu có.
  2. Sinh viên chọn loại khiếu nại.
  3. Sinh viên mô tả vấn đề và đính kèm chứng cứ.
  4. Sinh viên nộp → `Submitted`; ICPDP nhận một task.
  5. Sinh viên theo dõi tiến trình ở UC02.
- **Luồng thay thế:**
  - **A1 Rút khiếu nại:** sinh viên rút một khiếu nại chưa có quyết định (`Submitted` hoặc
    `Under Triage`) → `Withdrawn`.
- **Ngoại lệ:** **E1** cùng một sinh viên gửi khiếu nại trùng về cùng sự việc → các khiếu nại
  được liên kết với nhau và phân loại chung.
- **Hậu điều kiện:** Khiếu nại ở `Submitted` và theo dõi được.
- **Quy tắc nghiệp vụ:** BR38 — khiếu nại đi thẳng tới ICPDP; CLB chỉ tiếp cận được sau khi UC53
  chuyển nó xuống.
- **Đầu ra:** Complaint, ApprovalTask, thông báo.
- **Use case liên quan:** UC53, UC02
- **Pain point:** BP18

## UC53 – Phân loại khiếu nại

- **Actor chính:** ICPDP Officer
- **Module:** M12
- **Mục tiêu nghiệp vụ:** Lọc khiếu nại và chỉ mở một hồ sơ ở nơi thực sự có căn cứ.
- **Kích hoạt:** Một task từ UC52.
- **Tiền điều kiện:** Khiếu nại đang ở `Submitted`.
- **Dữ liệu vào:** Mức độ nghiêm trọng, đánh giá tính hợp lệ, quyết định và lý do.
- **Luồng chính:**
  1. Officer mở khiếu nại → `Under Triage`.
  2. Officer phân loại mức độ nghiêm trọng và tính hợp lệ.
  3. Officer chọn một kết quả:
     - **Dismissed** — không có căn cứ, lý do được ghi lại;
     - **Forwarded** — chuyển cho CLB trả lời qua UC54;
     - **Escalated** — một hồ sơ được mở ở UC42 và liên kết ngược lại khiếu nại.
  4. Hệ thống ghi audit quyết định và thông báo cho người khiếu nại.
- **Luồng thay thế:**
  - **A1 Đóng sau khi có phản hồi:** một khiếu nại đã chuyển xuống mà phần trả lời của CLB làm
    officer hài lòng thì được đóng lại; ngược lại nó được leo thang.
- **Ngoại lệ:** **E1** khiếu nại liên quan tới một CLB đã giải thể → được ghi nhận và đóng lại,
  lịch sử được giữ nguyên.
- **Hậu điều kiện:** Khiếu nại ở `Dismissed`, `Forwarded`, `Escalated` hoặc `Closed`; khi leo
  thang thì tồn tại một Violation liên kết ngược lại.
- **Quy tắc nghiệp vụ:** BR39 — mọi quyết định đều mang một lý do và được ghi audit; chỉ ICPDP
  được bác bỏ hoặc leo thang. Việc leo thang cần tới UC42 — v1 đặt UC56/UC57 vào MVP còn UC48
  vào V2, nên một khiếu nại được leo thang không có chỗ nào để đi.
- **Đầu ra:** Quyết định phân loại, Violation (khi leo thang), bản ghi audit, thông báo.
- **Use case liên quan:** UC52, UC54, UC42, UC44
- **Pain point:** BP18

## UC54 – Trả lời khiếu nại được chuyển xuống

- **Actor chính:** CMB
- **Module:** M12
- **Mục tiêu nghiệp vụ:** Cho CLB giải trình chính thức — chủ sở hữu mà chuyển trạng thái
  `Forwarded → Club Responded` của v1 chưa từng có.
- **Kích hoạt:** ICPDP chuyển một khiếu nại xuống ở UC53.
- **Tiền điều kiện:** Khiếu nại đang ở `Forwarded`.
- **Dữ liệu vào:** Phần trả lời, chứng cứ, hành động CLB đã hoặc sẽ thực hiện.
- **Luồng chính:**
  1. Ban chủ nhiệm mở khiếu nại được chuyển xuống; danh tính người khiếu nại chỉ hiển thị ở mức
     chính sách cho phép (quyết định còn mở D5).
  2. Ban chủ nhiệm nhập phần trả lời và đính kèm chứng cứ.
  3. Ban chủ nhiệm nộp → `Club Responded`.
  4. ICPDP đóng hoặc leo thang nó ở UC53.
- **Luồng thay thế:**
  - **A1 Đã có hành động:** phần trả lời nêu một hành động cụ thể, mà ICPDP có thể xác minh
    trước khi đóng.
- **Ngoại lệ:** **E1** quá hạn trả lời → việc không phản hồi được ghi nhận là một tín hiệu tuân
  thủ cho UC42.
- **Hậu điều kiện:** Khiếu nại ở `Club Responded` và trở về với ICPDP.
- **Quy tắc nghiệp vụ:** CMB không bao giờ tự sửa hay tự đóng khiếu nại. Phải trả lời trong thời
  hạn cấu hình được.
- **Đầu ra:** Phần trả lời của CLB, bản ghi audit, thông báo.
- **Use case liên quan:** UC53, UC42
- **Pain point:** BP18

---

## Phụ lục — Kiểm tra mức phủ

| Hạng mục kiểm tra | Kết quả |
|---|---|
| Use case đã được đặc tả | 54 trên 54 (UC01–UC54) |
| Use case có đúng một actor chính | 54 trên 54 — UC31 là use case duy nhất có actor hỗ trợ |
| Use case có Luồng chính | 54 trên 54 |
| Use case mà thực thể của nó có vòng đời, và trạng thái được nêu tên | UC07, UC08, UC15, UC16, UC17, UC18, UC20, UC21, UC25, UC26, UC27, UC28, UC29, UC31, UC32, UC33, UC34, UC35, UC36, UC37, UC39, UC40, UC41, UC42, UC43, UC44, UC45, UC47, UC48, UC49, UC50, UC52, UC53, UC54 |
| Pain point có ít nhất một use case | 19 trên 19 (§13 của tài liệu mô hình) |
