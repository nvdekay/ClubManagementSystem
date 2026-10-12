# Giải thích thuật ngữ tiếng Anh — Context Diagram

> Đi kèm [`Context_Diagram_QA.md`](Context_Diagram_QA.md). Sơ đồ:
> [`03-diagrams/UCMS_Context_Diagram_v2.1.drawio`](03-diagrams/UCMS_Context_Diagram_v2.1.drawio) (46 luồng).
> Bảng luồng → use case đầy đủ: [`SRS.md` §14.4](SRS.md#144-luồng-dữ-liệu-context--use-case).

![Context diagram v2.1](03-diagrams/img/UCMS_Context_Diagram_v2.1_01_Context-diagram-v2.2.png)

**Cách đọc:**
- **Phần 1** là các từ khó đứng riêng (triage, disbursement…), tra khi gặp từ lạ.
- **Phần 2** là các thực thể ngoài, hình chữ nhật trên sơ đồ.
- **Phần 3** là từng luồng dữ liệu, mũi tên trên sơ đồ, theo thứ tự trên hình. Cột "Gồm gì" nói luồng
  đó chở dữ liệu cụ thể nào.

---

## 1. Từ vựng khó

| Từ | Phiên âm | Nghĩa trong UCMS |
|---|---|---|
| **establishment** | /ɪˈstæblɪʃmənt/ | sự thành lập (một CLB mới) |
| **application** | /ˌæplɪˈkeɪʃn/ | đơn, hồ sơ xin (thành lập CLB, ứng tuyển thành viên) — *không phải "ứng dụng"* |
| **membership** | /ˈmembəʃɪp/ | tư cách thành viên |
| **registration** | /ˌredʒɪˈstreɪʃn/ | đăng ký (tham gia sự kiện) |
| **check-in** | /ˈtʃek ɪn/ | điểm danh có mặt tại sự kiện |
| **feedback** | /ˈfiːdbæk/ | phản hồi, đánh giá sau sự kiện |
| **complaint** | /kəmˈpleɪnt/ | khiếu nại |
| **outcome** | /ˈaʊtkʌm/ | kết quả xử lý cuối cùng |
| **profile** | /ˈprəʊfaɪl/ | hồ sơ (thông tin mô tả một người hoặc một CLB) |
| **proposal** | /prəˈpəʊzl/ | đề xuất (tổ chức sự kiện) |
| **internal event** | /ɪnˈtɜːnl ɪˈvent/ | sự kiện nội bộ — chỉ thành viên CLB tham gia |
| **periodic report** | /ˌpɪəriˈɒdɪk rɪˈpɔːt/ | báo cáo định kỳ (theo học kỳ / năm học) |
| **expense** | /ɪkˈspens/ | khoản chi |
| **property** | /ˈprɒpəti/ | cơ sở vật chất (phòng, hội trường, thiết bị) — *không phải "tài sản / bất động sản"* |
| **booking** | /ˈbʊkɪŋ/ | đặt chỗ, đặt phòng |
| **response** | /rɪˈspɒns/ | phản hồi, câu trả lời |
| **workspace** | /ˈwɜːkspeɪs/ | không gian làm việc (màn hình riêng của thành viên trong CLB) |
| **review** | /rɪˈvjuː/ | thẩm định, xem xét để ra quyết định |
| **decision** | /dɪˈsɪʒn/ | quyết định (duyệt / yêu cầu sửa / từ chối) |
| **disbursement** | /dɪsˈbɜːsmənt/ | giải ngân — nhà trường chi tiền cho CLB (tạm ứng, cấp bù) |
| **reconciliation** | /ˌrekənsɪliˈeɪʃn/ | đối soát — so số tiền đã cấp với số CLB đã chi |
| **forwarded** | /ˈfɔːwədɪd/ | được chuyển tiếp (ICPDP chuyển khiếu nại xuống CLB) |
| **violation** | /ˌvaɪəˈleɪʃn/ | vi phạm |
| **notice** | /ˈnəʊtɪs/ | thông báo chính thức |
| **evaluation** | /ɪˌvæljuˈeɪʃn/ | đánh giá (hiệu quả hoạt động CLB cuối kỳ) |
| **deadline reminder** | /ˈdedlaɪn rɪˈmaɪndə/ | nhắc hạn |
| **invitation** | /ˌɪnvɪˈteɪʃn/ | lời mời |
| **leadership** | /ˈliːdəʃɪp/ | ban lãnh đạo, ban chủ nhiệm |
| **suspension** | /səˈspenʃn/ | tạm ngừng hoạt động (CLB) |
| **role** | /rəʊl/ | vai trò, chức vụ trong CLB |
| **permission** | /pəˈmɪʃn/ | quyền thao tác (ví dụ quyền tạo sự kiện) |
| **board** | /bɔːd/ | ban chủ nhiệm, ban điều hành |
| **configuration** | /kənˌfɪɡəˈreɪʃn/ | cấu hình (các tham số, quy định của hệ thống) |
| **triage** | /ˈtriːɑːʒ/ | phân loại để xử lý — gốc từ y tế (phân loại bệnh nhân theo mức nặng); ở đây là phân loại khiếu nại |
| **scoring** | /ˈskɔːrɪŋ/ | chấm điểm |
| **submission** | /səbˈmɪʃn/ | hồ sơ đã nộp |
| **statistics** | /stəˈtɪstɪks/ | số liệu thống kê |
| **draft** | /drɑːft/ | bản nháp |
| **history** | /ˈhɪstri/ | lịch sử (các phiên bản cũ) |
| **authentication** | /ɔːˌθentɪˈkeɪʃn/ | xác thực — kiểm tra "bạn có đúng là bạn không" |
| **identity** | /aɪˈdentəti/ | danh tính (email, họ tên, ảnh đại diện) |
| **URL** | /ˌjuː ɑːr ˈel/ | đường dẫn tới một tài nguyên trên mạng |

---

## 2. Thực thể ngoài (hình chữ nhật)

| Tên trên hình | Nghĩa | Là ai / là gì |
|---|---|---|
| **Club Management System** (hình tròn giữa) | Hệ thống quản lý CLB | Chính là UCMS, vẽ thành một khối duy nhất |
| **Student** | Sinh viên | Bất kỳ sinh viên đã đăng nhập |
| **Club Member** | Thành viên CLB | Sinh viên đang là thành viên của một CLB; làm việc vận hành CLB nếu chức vụ có quyền |
| **Club Leader** | Chủ nhiệm CLB | Người giữ ghế Chủ nhiệm đã được ICPDP xác nhận |
| **ICPDP Officer** | Cán bộ ICPDP | Cán bộ phòng quản lý CLB của trường — cơ quan duyệt duy nhất |
| **Google OAuth** | Dịch vụ đăng nhập Google | Cho người dùng đăng nhập bằng tài khoản Google, UCMS không lưu mật khẩu |
| **Google SMTP Service** | Dịch vụ gửi email của Google | SMTP = *Simple Mail Transfer Protocol*, giao thức gửi thư |
| **Cloudinary** | Dịch vụ lưu ảnh | Lưu ảnh tải lên (logo CLB, ảnh sự kiện, ảnh minh chứng) |

---

## 3. Luồng dữ liệu (mũi tên)

Chiều mũi tên: **→ UCMS** là dữ liệu đi vào hệ thống, **UCMS →** là dữ liệu hệ thống gửi ra.

### 3.1 Student — 8 luồng

| Luồng | Chiều | Nghĩa | Gồm gì |
|---|---|---|---|
| **Club establishment application** | → UCMS | Hồ sơ đề nghị thành lập CLB | Tên, lĩnh vực, mục tiêu, thành viên sáng lập, cơ cấu chức vụ dự kiến, tài liệu bắt buộc (UC07) |
| **Membership application** | → UCMS | Đơn ứng tuyển thành viên | Biểu mẫu ứng tuyển vào một đợt tuyển của CLB (UC17) |
| **Event registration, check-in & feedback** | → UCMS | Đăng ký, điểm danh và phản hồi sự kiện | Đăng ký giữ chỗ, quét mã có mặt, điểm và nhận xét sau sự kiện (UC29, UC31, UC48) |
| **Club complaint** | → UCMS | Khiếu nại về CLB | CLB bị khiếu nại, loại khiếu nại, mô tả, chứng cứ (UC50) |
| **Club & event information** | UCMS → | Thông tin CLB và sự kiện | Danh bạ CLB, trang CLB, đợt tuyển đang mở, sự kiện công khai (UC06) |
| **Student profile** | UCMS → | Hồ sơ sinh viên | Thông tin cá nhân tạo từ lần đăng nhập đầu, hiển thị trên dashboard (UC01, UC02) |
| **Application & registration results** | UCMS → | Kết quả hồ sơ và đăng ký | Kết quả thành lập CLB, ứng tuyển, đăng ký sự kiện, được đôn từ danh sách chờ |
| **Complaint outcome** | UCMS → | Kết quả xử lý khiếu nại | Bị bác bỏ / đã chuyển CLB / đã mở vụ việc (UC51) |

### 3.2 Club Member — 15 luồng

| Luồng | Chiều | Nghĩa | Gồm gì |
|---|---|---|---|
| **Club profile & membership data** | → UCMS | Hồ sơ CLB và dữ liệu thành viên | Thông tin CLB, các ban; đợt tuyển; kết quả sàng lọc, chấm điểm ứng viên; tiếp nhận và trạng thái thành viên |
| **Event proposals & internal events** | → UCMS | Đề xuất sự kiện và sự kiện nội bộ | Đề xuất kèm ngân sách; sự kiện nội bộ ghi nhận thẳng; công bố, huỷ, đổi lịch; danh sách chờ; chốt điểm danh |
| **Event & periodic reports** | → UCMS | Báo cáo sự kiện và báo cáo định kỳ | Báo cáo sau từng sự kiện (UC33), báo cáo hoạt động theo kỳ (UC38) |
| **Expenses** | → UCMS | Khoản chi | Từng khoản chi kèm hoá đơn, chứng từ; bản quyết toán (UC36) |
| **Property booking requests** | → UCMS | Yêu cầu đặt cơ sở vật chất | Phòng / thiết bị, thời gian, mục đích; huỷ hoặc trả lại (UC45, UC47) |
| **Complaint response** | → UCMS | Phản hồi khiếu nại | Lời giải trình của CLB kèm chứng cứ cho khiếu nại được chuyển xuống (UC52) |
| **Leave request** | → UCMS | Yêu cầu rời CLB | Lý do xin rời (UC22) |
| **Event invitation response** | → UCMS | Trả lời lời mời sự kiện | Chấp nhận (kèm gian hàng / tiết mục / người đại diện) hoặc từ chối (kèm lý do) (UC54) |
| **Member workspace** | UCMS → | Không gian thành viên | Tư cách thành viên, chức vụ, sự kiện của CLB, lịch sử điểm danh (UC24) |
| **Member applications & event registrations** | UCMS → | Đơn ứng tuyển và danh sách đăng ký | Đơn mới cần sàng lọc, danh sách người đăng ký sự kiện |
| **Review decisions & disbursements** | UCMS → | Quyết định thẩm định và giải ngân | Kết quả duyệt đề xuất, báo cáo, booking; các lần tạm ứng, cấp bù, số tiền phải hoàn |
| **Event feedback & forwarded complaints** | UCMS → | Phản hồi sự kiện và khiếu nại được chuyển xuống | Feedback dạng tổng hợp (UC49); khiếu nại ICPDP chuyển cho CLB trả lời |
| **Violation notices & evaluation results** | UCMS → | Thông báo vi phạm và kết quả đánh giá | Vụ việc vi phạm liên quan đến CLB (UC40); kết quả đánh giá cuối kỳ (UC43) |
| **Deadline reminders** | UCMS → | Nhắc hạn | Nhắc trước hạn, đến hạn, quá hạn báo cáo / quyết toán / hoàn trả (do scheduler gửi) |
| **Event invitations** | UCMS → | Lời mời sự kiện | Lời mời tham gia sự kiện cấp trường do ICPDP tổ chức (UC53) |

### 3.3 Club Leader — 3 luồng

| Luồng | Chiều | Nghĩa | Gồm gì |
|---|---|---|---|
| **Leadership & suspension requests** | → UCMS | Đề xuất về ban chủ nhiệm và xin tạm ngừng | Đề cử ban (UC10), kế hoạch bàn giao nhiệm kỳ (UC12), xin tạm ngừng CLB (UC14) |
| **Club roles & permissions** | → UCMS | Chức vụ và quyền trong CLB | Tạo / sửa chức vụ, chọn quyền cho chức vụ, gán thành viên (UC23) |
| **Leadership & club status decisions** | UCMS → | Quyết định về ban chủ nhiệm và trạng thái CLB | Xác nhận ban, xác nhận bàn giao, quyết định tạm ngừng / kích hoạt lại / giải thể (UC11, UC13, UC15) |

### 3.4 ICPDP Officer — 15 luồng

| Luồng | Chiều | Nghĩa | Gồm gì |
|---|---|---|---|
| **System configuration** | → UCMS | Cấu hình hệ thống | Tài khoản và vai trò, chính sách và deadline, quy tắc duyệt cấp 2, bộ tiêu chí đánh giá, danh mục cơ sở vật chất |
| **Review decisions** | → UCMS | Quyết định thẩm định | Duyệt / yêu cầu sửa / từ chối: hồ sơ thành lập, ban chủ nhiệm, bàn giao, đề xuất sự kiện, báo cáo, booking |
| **Club status & violation decisions** | → UCMS | Quyết định trạng thái CLB và xử lý vi phạm | Tạm ngừng, kích hoạt lại, giải thể CLB (UC15); mở, quyết định, giải quyết vụ việc (UC40) |
| **Disbursements & reconciliation** | → UCMS | Giải ngân và đối soát | Ghi nhận tạm ứng / cấp bù / tiền CLB hoàn (UC35); chấp nhận hoặc loại từng khoản chi (UC37) |
| **Complaint triage** | → UCMS | Phân loại khiếu nại | Bác bỏ, chuyển CLB, hoặc leo thang thành vụ việc — kèm lý do (UC51) |
| **Evaluation scoring** | → UCMS | Chấm điểm đánh giá | Điểm chấm tay, điều chỉnh, quyết định công bố kết quả (UC43) |
| **University events & invitations** | → UCMS | Sự kiện cấp trường và lời mời | Sự kiện do ICPDP tổ chức, danh sách CLB được mời, hạn trả lời (UC53) |
| **Export criteria** | → UCMS | Tiêu chí xuất dữ liệu | Loại dữ liệu, bộ lọc (kỳ, CLB, trạng thái), định dạng xlsx / csv / pdf (UC55) |
| **Submissions for review** | UCMS → | Hồ sơ chờ thẩm định | Mọi hồ sơ CLB đã nộp đang chờ ICPDP quyết định |
| **Club complaints** | UCMS → | Khiếu nại về CLB | Khiếu nại sinh viên gửi, chờ phân loại |
| **Internal event records** | UCMS → | Bản ghi sự kiện nội bộ | Sự kiện nội bộ CLB đã tự ghi nhận, kèm điểm danh — chỉ xem (BR53) |
| **Club statistics & evaluation draft** | UCMS → | Số liệu CLB và bản nháp đánh giá | Số liệu tổng hợp trên dashboard; bản nháp điểm đánh giá hệ thống tự sinh (UC42) |
| **Club role structure & board history** | UCMS → | Cơ cấu chức vụ và lịch sử ban chủ nhiệm | Các phiên bản cơ cấu chức vụ và ai giữ ghế nào qua từng nhiệm kỳ — chỉ xem (BR56) |
| **Event invitation responses** | UCMS → | Các phản hồi lời mời sự kiện | Tổng hợp CLB nào chấp nhận, từ chối, chưa trả lời |
| **Exported data & reports** | UCMS → | Dữ liệu và báo cáo đã xuất | File xlsx / csv / pdf: danh sách CLB, thành viên, sự kiện và điểm danh, tài chính, vi phạm, bảng điểm đánh giá (UC55) |

### 3.5 Hệ thống ngoài — 5 luồng

| Luồng | Chiều | Nghĩa | Gồm gì |
|---|---|---|---|
| **Authentication request** | UCMS → Google OAuth | Yêu cầu xác thực | UCMS chuyển người dùng sang trang đăng nhập Google |
| **Identity data** | Google OAuth → UCMS | Dữ liệu danh tính | Email, họ tên, ảnh đại diện Google trả về sau khi đăng nhập |
| **Email message** | UCMS → Google SMTP | Thư điện tử | Nội dung thông báo cần gửi qua email |
| **Image file** | UCMS → Cloudinary | Tệp ảnh | Ảnh người dùng tải lên |
| **Image URL** | Cloudinary → UCMS | Đường dẫn ảnh | Địa chỉ ảnh đã lưu; UCMS chỉ lưu đường dẫn này |

---

## 4. Các cặp dễ nhầm

| Cặp | Khác nhau ở đâu |
|---|---|
| **Review decisions** (ICPDP → UCMS) vs **Review decisions & disbursements** (UCMS → Club Member) | Cùng một quyết định nhìn từ hai phía: ICPDP *nhập* quyết định vào; hệ thống *gửi* kết quả cho CLB, kèm thông tin giải ngân |
| **Club complaint** (Student →) vs **Club complaints** (→ ICPDP) | Sinh viên gửi một khiếu nại; ICPDP nhận danh sách các khiếu nại chờ phân loại |
| **Complaint triage** vs **Complaint outcome** vs **Complaint response** | *Triage*: ICPDP phân loại. *Outcome*: kết quả gửi lại cho sinh viên. *Response*: lời giải trình của CLB |
| **Event invitations** vs **Event invitation response(s)** | Lời mời gửi xuống CLB → CLB trả lời (số ít) → ICPDP nhận tổng hợp các câu trả lời (số nhiều) |
| **Disbursement** vs **Reconciliation** | *Disbursement*: ghi nhận tiền đã chi cho CLB. *Reconciliation*: so tiền đã cấp với chi tiêu thực tế để chốt cấp bù hay thu hồi |
| **Leadership & suspension requests** vs **Leadership & club status decisions** | Chủ nhiệm *đề xuất*; ICPDP *quyết định*, hệ thống gửi quyết định lại cho chủ nhiệm |
| **Application** (trong Club establishment / Membership application) | Luôn là **đơn, hồ sơ xin**, không phải "ứng dụng phần mềm" |
| **Property** | Luôn là **cơ sở vật chất** (phòng, thiết bị), không phải "tài sản / bất động sản" |
