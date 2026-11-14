# Phân công 11 flow cho 6 người bảo vệ — UCMS

Cách chia dưới đây giữ nguyên **số thứ tự 11 flow trong danh sách dùng để bảo vệ**.
Đây là số flow của bản phân công, không phải mã F1–F11 trong SRS.
Người 1–6 là vị trí phân công để nhóm điền tên thành viên.

Lời thoại và Q&A cho từng flow nằm tại
[`08-defense-scripts/`](08-defense-scripts/README.md).

Mỗi người phụ trách một nhóm flow liên quan, trình bày cả thao tác phía người gửi và phía
người xử lý. Chia cùng tỷ trọng thời gian trình bày, điều chỉnh độ sâu theo độ phức tạp;
số UC giữa các nhóm không bằng nhau vì giữ nguyên các flow.

## 1. Bảng phân công chính

| Người | Nhóm phụ trách | Flow | UC phụ trách chính |
|---|---|---|---|
| Người 1 | Đăng nhập, thành lập CLB và tuyển thành viên | **1, 2, 3** | UC01, UC02, UC07, UC08, UC09, UC16, UC17, UC18, UC19, UC20, UC21, UC22, UC24 |
| Người 2 | Ban chủ nhiệm và vòng đời CLB | **4, 10** | UC10, UC11, UC12, UC13, UC14, UC15 |
| Người 3 | Tổ chức, tham gia và tổng kết sự kiện CLB | **5** | UC25, UC26, UC27, UC28, UC29, UC30, UC31, UC32, UC33, UC34, UC48, UC49 |
| Người 4 | Cơ sở vật chất và sự kiện cấp trường | **6, 11** | UC44, UC45, UC46, UC47, UC58, UC53, UC54 |
| Người 5 | Kinh phí, báo cáo định kỳ và đánh giá CLB | **7, 8** | UC35, UC36, UC37, UC38, UC39, UC41, UC42, UC43 |
| Người 6 | Khiếu nại và xử lý vi phạm | **9** | UC40, UC50, UC51, UC52 |

**UC40 xuất hiện trong cả flow 8 và flow 9:** Người 6 chịu trách nhiệm giải thích và demo
chi tiết; Người 5 chỉ giải thích dữ liệu tuân thủ được dùng khi đánh giá. Như vậy không
trùng phần trình bày và vẫn giữ được quan hệ giữa hai flow.

## 2. Người 1 — Đăng nhập, thành lập CLB và tuyển thành viên

**Flow 1 + 2 + 3:** từ sinh viên chưa có CLB đến CLB hoạt động và có thành viên.

| Flow | Nội dung trình bày |
|---|---|
| 1. Đăng nhập và chọn workspace | Google OAuth, kiểm tra tài khoản, session và workspace theo quyền |
| 2. Thành lập CLB | Tạo hồ sơ, thành viên sáng lập, tài liệu, nộp và ICPDP thẩm định |
| 3. Tuyển và quản lý thành viên | Mở đợt tuyển, ứng tuyển, đánh giá, quyết định, tiếp nhận và quản lý thành viên |

**Kịch bản demo:** đăng nhập → chọn workspace → nộp hồ sơ thành lập → ICPDP duyệt → vào
workspace CLB → mở đợt tuyển → sinh viên ứng tuyển → Leader đánh giá, nhận và tiếp nhận.

**Điểm cần giải thích khi được hỏi:**

- Duyệt thành lập tạo CLB `Active` và ban chủ nhiệm đã xác nhận ngay.
- Một tài khoản có thể có nhiều workspace theo quyền hiện tại.
- `Accepted` chưa tạo tư cách thành viên; phải qua `Onboarded`.
- Phân biệt đổi trạng thái thành viên, tái xác nhận đầu kỳ và yêu cầu rời CLB.

Nhóm này nhiều UC nên phần đăng nhập trình bày ngắn; dành thời gian chính cho thành lập và
mối nối từ ứng viên sang thành viên. Các nhánh trả sửa, từ chối hoặc rời CLB chuẩn bị để trả
lời, không cần demo lần lượt tất cả trong phần trình bày chính.

## 3. Người 2 — Ban chủ nhiệm và vòng đời CLB

**Flow 4 + 10:** ai điều hành CLB, điều hành trong nhiệm kỳ nào và CLB được phép hoạt động
ở trạng thái nào.

| Flow | Nội dung trình bày |
|---|---|
| 4. Ban chủ nhiệm và chuyển giao nhiệm kỳ | Đề cử, xác nhận người giữ ghế, kế hoạch và xác nhận chuyển giao |
| 10. Tạm ngừng, kích hoạt lại và giải thể | Yêu cầu tạm ngừng, quyết định của ICPDP và tác động tới hoạt động CLB |

**Kịch bản demo:** Leader đề cử → ICPDP xác nhận → lập và duyệt kế hoạch chuyển giao →
xem quyền theo nhiệm kỳ → minh hoạ yêu cầu tạm ngừng và quyết định của ICPDP.

**Điểm cần giải thích khi được hỏi:**

- Khác nhau giữa thay người trong nhiệm kỳ và chuyển sang nhiệm kỳ mới.
- Quyền cố định `Club Leader`/`Club Member`; chức danh khác không tự cấp quyền quản trị.
- Tác động của tạm ngừng, kích hoạt lại và giải thể tới tuyển thành viên, sự kiện, booking.
- Nghĩa vụ báo cáo, tài chính và tuân thủ thuộc CLB qua các nhiệm kỳ.

Chỉ tham chiếu kết quả thành lập của Người 1. Với giải thể, trình bày mốc học kỳ và nghĩa vụ
chưa đóng thay vì chờ scheduler chạy trong buổi bảo vệ.

## 4. Người 3 — Tổ chức, tham gia và tổng kết sự kiện CLB

**Flow 5:** một flow lớn có nhiều trạng thái và actor nên giao riêng một người.

**Kịch bản demo:** Leader lập đề xuất → ICPDP thẩm định, duyệt → Leader công bố → sinh viên
đăng ký/danh sách chờ → check-in → chốt điểm danh → nộp và thẩm định báo cáo sau sự kiện →
xem phản hồi người tham dự.

**Điểm cần giải thích khi được hỏi:**

- Trả sửa, từ chối và bảo vệ đề xuất là các nhánh của giai đoạn thẩm định.
- Công bố, đăng ký, check-in và chốt điểm danh là các bước khác nhau.
- Điều kiện huỷ/đổi lịch, quản lý sức chứa và danh sách chờ.
- Chỉ soạn báo cáo sau sự kiện khi điểm danh đã chốt.
- Phản hồi UC48–UC49 gắn với việc tham dự; không đồng nghĩa với khiếu nại UC50.

Phần ngân sách ở UC25–UC26 chỉ trình bày đề nghị và số tiền được duyệt. Bàn giao ngân sách
đã duyệt cho Người 5 trình bày tạm ứng, chi tiêu và đối soát. Khi nói tới địa điểm, tham chiếu
booking của Người 4.

## 5. Người 4 — Cơ sở vật chất và sự kiện cấp trường

**Flow 6 + 11:** nhà trường điều phối tài nguyên và sự tham gia của các CLB vào hoạt động
cấp trường. Hai flow được gom theo công việc điều phối của ICPDP; chúng không bắt buộc
phải chạy nối tiếp nhau.

| Flow | Nội dung trình bày |
|---|---|
| 6. Cơ sở vật chất | Danh mục, gửi yêu cầu, kiểm tra xung đột, duyệt, sử dụng và trả; phân phòng học theo kỳ |
| 11. Sự kiện cấp trường | ICPDP tạo sự kiện, mời CLB, Leader phản hồi và ICPDP công bố |

**Kịch bản demo:** xem danh mục → Leader xin hội trường/thiết bị → ICPDP duyệt → xem lịch
phòng học được phân → ICPDP tạo sự kiện cấp trường → gửi lời mời → Leader phản hồi.

**Điểm cần giải thích khi được hỏi:**

- `ROOM` đi qua UC58; hội trường/sân/sân khấu/thiết bị đi qua UC45–UC47.
- Kiểm tra xung đột và phân biệt duyệt đề xuất sự kiện với duyệt booking.
- Chấp nhận lời mời CLB UC54 khác với đăng ký cá nhân UC29.
- Theo dõi, thu hồi lời mời; huỷ/trả booking khi đủ điều kiện.

Không demo lại toàn bộ đăng ký và điểm danh sự kiện đã thuộc phần Người 3.

## 6. Người 5 — Kinh phí, báo cáo định kỳ và đánh giá CLB

**Flow 7 + 8:** giải trình việc sử dụng kinh phí và kết quả hoạt động của CLB.

| Flow | Nội dung trình bày |
|---|---|
| 7. Kinh phí và quyết toán | Tạm ứng, khoản chi, chứng từ, quyết toán, đối soát, cấp bù/hoàn trả và tất toán |
| 8. Báo cáo định kỳ và đánh giá CLB | Nộp, thẩm định báo cáo; bộ tiêu chí, dữ liệu đầu vào, chốt và công bố đánh giá |

**Kịch bản demo:** nhận ngân sách đã duyệt từ Người 3 → ghi tạm ứng → ghi chi và chứng từ →
nộp quyết toán → ICPDP đối soát → minh hoạ chênh lệch → nộp/thẩm định báo cáo kỳ → sinh,
chốt và công bố đánh giá.

**Điểm cần giải thích khi được hỏi:**

- Phân biệt số được duyệt, số đã tạm ứng, số đã chi và số chi được chấp nhận.
- Ba trường hợp chi hợp lệ bằng, lớn hơn hoặc nhỏ hơn số đã tạm ứng.
- App ghi nhận giao dịch; dòng tiền thực tế diễn ra bên ngoài.
- Báo cáo sau sự kiện UC33–UC34 thuộc Người 3; báo cáo định kỳ UC38–UC39 thuộc phần này.
- Dữ liệu hoạt động, báo cáo và tuân thủ được dùng để đánh giá; Leader xem kết quả `Published`.

UC40 chỉ được nhắc như nguồn dữ liệu tuân thủ; quy trình mở hồ sơ, giải trình và khắc phục
thuộc Người 6. Trong demo chính chọn một tình huống đối soát, giải thích hai trường hợp còn
lại bằng số liệu ngắn để giữ thời lượng.

## 7. Người 6 — Khiếu nại và xử lý vi phạm

**Flow 9:** một flow ít UC nhưng có nhiều nhánh xử lý, quyền truy cập và yêu cầu bảo vệ
danh tính, phù hợp để một người đi sâu.

**Kịch bản demo:** sinh viên gửi khiếu nại → ICPDP phân loại → chuyển CLB trả lời → CLB
phản hồi → ICPDP xem xét kết quả → minh hoạ mở hồ sơ vi phạm → CLB giải trình, khắc phục và
nộp minh chứng → ICPDP kiểm tra, kết thúc xử lý.

**Điểm cần giải thích khi được hỏi:**

- Khiếu nại luôn tới ICPDP trước; CLB chỉ thấy khi đã được chuyển xuống.
- CLB không thấy danh tính người khiếu nại.
- Phân biệt bác bỏ, chuyển CLB trả lời và chuyển sang hồ sơ vi phạm.
- Không phải mọi khiếu nại đều tạo vi phạm; UC40 cũng có thể phát sinh từ sự việc khác.
- Phân biệt quyết định xử lý, hành động khắc phục, minh chứng và kết thúc hồ sơ.

Người 6 trình bày chi tiết UC40 và bàn giao dữ liệu tuân thủ cho Người 5. Nếu cần xem xét
thay đổi trạng thái CLB, Người 2 giải thích thao tác riêng tại UC15.

## 8. Các UC hỗ trợ ngoài danh sách 11 flow

Năm UC dưới đây chưa được liệt kê riêng trong 11 flow. Giao người phụ trách để toàn bộ
55 UC trong phạm vi đều có đầu mối khi được hỏi; không bắt buộc thêm thành một flow demo.

| UC | Chức năng | Người phụ trách | Lý do |
|---|---|---|---|
| UC03 | Quản lý tài khoản và gán vai trò hệ thống | Người 6 | Liên quan kiểm soát truy cập và xử lý tài khoản; phân biệt với quyền CLB của Người 2 |
| UC04 | Chính sách và deadline nhà trường | Người 2 | Liên quan học kỳ, nhiệm kỳ và các mốc quản lý CLB |
| UC05 | Quy tắc định tuyến phê duyệt | Người 6 | Giải thích quyền cấu hình và SLA thẩm định; không tạo thêm cấp duyệt |
| UC06 | Khám phá CLB và sự kiện | Người 1 | Điểm vào trước đăng nhập, thành lập hoặc ứng tuyển |
| UC55 | Xuất dữ liệu và báo cáo | Người 5 | Gắn với tài chính, báo cáo và kết quả đánh giá |

UC23 đã rút khỏi phạm vi; danh mục hiện hành không có UC56 và UC57.

## 9. Cân đối thời lượng và bàn giao giữa người trình bày

Mỗi người dùng khoảng **1/6 tổng thời gian**. Ví dụ nếu có 24 phút trình bày thì mỗi người
khoảng 4 phút; đây là gợi ý phân bổ, không phải thời lượng đã được ấn định.

| Người | Trọng tâm để cân đối |
|---|---|
| 1 | Đăng nhập ngắn; tập trung thành lập và chuyển ứng viên thành thành viên |
| 2 | Chuyển giao nhiệm kỳ và tác động của trạng thái CLB; chuẩn bị chính sách liên quan |
| 3 | Một sự kiện xuyên suốt; dùng dữ liệu ở từng trạng thái để tránh chờ thời gian thực |
| 4 | Hai nhánh CSVC và lời mời cấp trường; tập trung xung đột và ranh giới quyết định |
| 5 | Một ca đối soát và một kỳ đánh giá; giải thích các kết quả thay thế bằng số liệu |
| 6 | Đi sâu nhánh khiếu nại/vi phạm, bảo vệ danh tính và quyền xử lý; chuẩn bị UC03/UC05 |

Thứ tự trình bày đề xuất: **Người 1 → Người 2 → Người 3 → Người 4 → Người 5 → Người 6**.
Đây là thứ tự kể chuyện, không phải thứ tự bắt buộc của mọi thao tác trong hệ thống.

Các điểm bàn giao cần thống nhất trước buổi bảo vệ:

- Người 1 → Người 2: CLB đã hoạt động, có thành viên và ban chủ nhiệm sáng lập.
- Người 2 → Người 3: Leader và CLB đủ điều kiện thực hiện hoạt động.
- Người 3 ↔ Người 4: sự kiện và nhu cầu CSVC; phân biệt phê duyệt sự kiện với booking.
- Người 3 → Người 5: ngân sách đã duyệt và dữ liệu sự kiện đã diễn ra.
- Người 6 → Người 5: kết quả tuân thủ là một đầu vào đánh giá; dùng hồ sơ đã chuẩn bị khi
  Người 5 trình bày trước.
- Người 6 ↔ Người 2: căn cứ xử lý vi phạm và thao tác quản lý vòng đời CLB là hai phần riêng.

Tất cả thành viên cần nắm mô hình 4 actor, phê duyệt một cấp tại ICPDP và hai role CLB cố
định. Người phụ trách chính trả lời sâu về flow của mình; người khác biết đầu vào, đầu ra
và điểm nối để giải thích toàn hệ thống.

## 10. Nguồn đối chiếu

- [SRS](SRS.md): phạm vi và quy tắc nghiệp vụ hiện hành.
- [Hiện trạng triển khai](CURRENT_IMPLEMENTATION.md): hành vi đã có trong code và giới hạn.
- [Ma trận UC → code](05-implementation/UC_CODE_MAPPING.md): tìm route, màn hình và code
  của từng UC khi chuẩn bị câu hỏi kỹ thuật.
