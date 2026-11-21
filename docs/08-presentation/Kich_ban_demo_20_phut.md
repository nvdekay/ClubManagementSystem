# Kịch bản demo UCMS — 20 phút

Demo đi theo **vòng đời của một CLB**: một nhóm sinh viên lập CLB → CLB tuyển người → CLB tổ chức sự kiện
→ ICPDP kiểm soát tiền, đánh giá và báo cáo. Mỗi bước có một việc phía CLB/sinh viên và một quyết định phía
ICPDP, để thầy thấy được thông điệp chính của hệ thống: **mọi việc của CLB đi qua một luồng duyệt có trạng
thái, có lý do và có lịch sử**.

Mã UC dưới đây theo SRS và Final Report (UC01–UC55, UC58).

## 1. Phân bổ thời gian

| Phút | Phần | UC | Tài khoản |
|---|---|---|---|
| 0:00–1:30 | Đăng nhập, chọn workspace, dashboard ICPDP | UC01, UC02 | ICPDP |
| 1:30–5:00 | Thành lập CLB: nộp hồ sơ → ICPDP duyệt → CLB Active | UC07, UC08 | Sinh viên D, ICPDP |
| 5:00–8:30 | Tuyển thành viên: tạo đợt → ứng tuyển → nhận → tiếp nhận | UC16, UC17, UC18, UC20 | Chủ nhiệm B, Sinh viên D |
| 8:30–12:30 | Sự kiện mới: import đề án → ICPDP duyệt → công bố → đăng ký | UC25, UC26, UC27, UC29 | Chủ nhiệm B, ICPDP, Sinh viên D |
| 12:30–15:30 | Sự kiện đang chạy và đã xong: check-in → phản hồi → chốt điểm danh | UC31, UC48, UC32, UC49 | Thành viên C, Chủ nhiệm B |
| 15:30–17:30 | Kinh phí: CLB nộp chứng từ → ICPDP đối soát | UC36, UC37 | Chủ nhiệm B, ICPDP |
| 17:30–19:00 | Đánh giá CLB và xuất báo cáo | UC43, UC55 | ICPDP |
| 19:00–20:00 | Tổng kết, mở hỏi đáp | — | — |

Nếu chậm giờ, bỏ theo thứ tự: phần kinh phí (15:30) → xuất báo cáo → UC16 tạo đợt tuyển (dùng đợt đã công
bố sẵn). Không bỏ phần sự kiện vì đó là luồng lớn nhất.

## 2. Chuẩn bị trước buổi demo (làm trước ít nhất 1 ngày, kiểm tra lại 2 giờ trước)

### 2.1 Bốn tài khoản Google thật

Hệ thống chỉ đăng nhập bằng Google OAuth, không có đăng nhập giả. Mỗi tài khoản mở ở **một Chrome profile
riêng** đã đăng nhập sẵn, để chuyển vai chỉ bằng cách đổi cửa sổ.

| Ký hiệu | Vai | Ghi chú |
|---|---|---|
| ICPDP | ICPDP Officer | Email trong `BOOTSTRAP_ICPDP_EMAIL` (hoặc owner của `seed:demo`) |
| B | Chủ nhiệm "CLB Sáng tạo Công nghệ FPTU" | Truyền vào `--leader` của `seed:defense:p3/p5`; không được đang là Chủ nhiệm CLB khác |
| C | Thành viên Active của CLB đó | Truyền vào `--member`; dùng để check-in và gửi phản hồi |
| D | Sinh viên "mới" | Chưa từng là thành viên CLB của B; không đang làm Chủ nhiệm CLB nào |

- Domain của cả bốn email phải nằm trong `ALLOWED_DOMAIN`.
- Mỗi tài khoản đăng nhập vào app **một lần trước khi chạy seed**, vì seed cần tài khoản đã tồn tại.

### 2.2 Dữ liệu

1. `docker compose up -d --wait`, khởi động server một lần để tạo vai trò, rồi dừng.
2. Sao lưu DB: `mongodump --uri "mongodb://127.0.0.1:27017/ucms" --archive=ucms-truoc-demo.archive`.
3. `npm run seed:demo -w server -- --owner=<email ICPDP>`: policy học kỳ, 16 sinh viên demo (dùng làm
   đồng sáng lập ở UC07), các hồ sơ đang chờ cho hàng đợi của ICPDP.
4. `npm run seed:dashboard -w server`: dữ liệu 12 tháng cho biểu đồ dashboard.
5. `npm run seed:defense:p5 -w server -- --leader=<B> --officer=<ICPDP> --member=<C>`: kinh phí và đánh
   giá. Thêm `--report-submitted` nếu muốn có báo cáo định kỳ đang chờ duyệt.
6. **Trong vòng 2 giờ trước giờ demo**: `npm run seed:defense:p3 -w server -- --leader=<B> --officer=<ICPDP> --member=<C>`.
   Script tạo "Talkshow: AI trong học tập và nghiên cứu" **đang diễn ra** (bắt đầu khoảng 30 phút trước lúc
   chạy, kéo dài 2,5 giờ) và "Workshop Docker cơ bản" **đã kết thúc**. Ghi lại `checkInCode` mà script in ra.
   Chạy lại không làm mới sự kiện cũ; muốn đổi giờ thì khôi phục bản sao lưu rồi chạy lại.
7. Khởi động lại server ngay trước giờ demo để job vòng đời sự kiện cập nhật trạng thái (Ongoing/Completed).

### 2.3 File cần có trên máy

- **Logo CLB**: PNG hoặc JPG, dưới 2 MB (không nhận SVG).
- **Đề án thành lập CLB**: PDF hoặc DOCX, dưới 10 MB.
- **Đề án sự kiện** `.docx`: sửa từ `docs/Đề án sự kiện.docx`. Ngày diễn ra phải **cách ngày demo ít nhất
  7 ngày** và còn trong học kỳ; "Đối tượng" ghi "sinh viên"; thời gian dạng `dd/mm/yyyy HH:mm`. Import thử
  một lần trước để chắc file qua được bộ đọc.
- **1–2 ảnh hoá đơn** JPG/PNG dưới 5 MB cho phần kinh phí.

### 2.4 Kiểm tra cuối

- Cloudinary đã cấu hình (`CLOUDINARY_*`); thiếu thì mọi bước tải file báo "file storage is not configured".
- Mở sẵn các tab ở trang bắt đầu của mỗi phần (bảng ở mục 3).
- Có video dự phòng trong `docs/07-demo-videos/` nếu mạng hoặc Google login lỗi.
- Tắt thông báo hệ điều hành, phóng to trình duyệt 110–125% cho thầy dễ nhìn.

## 3. Kịch bản chi tiết

Mỗi bước ghi: **ai làm**, **đi đâu**, **bấm gì**, và **câu nói**. Phần in nghiêng là lời thuyết minh gợi ý.

### Phần 1 — Đăng nhập và dashboard (0:00–1:30) · UC01, UC02

1. Cửa sổ ICPDP, mở `/login`, bấm **"Đăng nhập với Google"**.
   *"Hệ thống chỉ cho email Google đã xác minh và thuộc domain ICPDP cho phép. Không có mật khẩu riêng."*
2. Trang **"Chào …, bạn muốn vào workspace nào?"**: chỉ các thẻ **Sinh viên**, **ICPDP**, **Ban chủ nhiệm CLB …**.
   *"Một người có thể vừa là sinh viên vừa là cán bộ ICPDP hay chủ nhiệm CLB. Quyền đi theo workspace, và đổi
   workspace không cần đăng nhập lại."* Chọn **ICPDP**.
3. Dashboard **"Tổng quan"**: chỉ ô **"Đang chờ xử lý"**, **"CLB đang hoạt động"**, biểu đồ
   **"Sự kiện theo tháng"**, **"Tỷ lệ duyệt đúng hạn"**, khối **"Cần chú ý"**.
   *"Đây là màn hình đầu tiên cán bộ ICPDP thấy mỗi sáng: hôm nay có gì cần duyệt, CLB nào đang có vấn đề."*

### Phần 2 — Thành lập CLB (1:30–5:00) · UC07, UC08

**Sinh viên D nộp hồ sơ**

1. Cửa sổ D: sidebar **"Câu lạc bộ" › "Thành lập CLB"** → **"Tạo hồ sơ thành lập CLB"**.
2. Bước **"Thông tin CLB"**: nhập **Tên CLB**, chọn **Lĩnh vực**, **Giới thiệu ngắn**, **Mục tiêu hoạt động** →
   **"Lưu và tiếp tục"**. (Gõ sẵn nội dung ra notepad rồi dán cho nhanh.)
3. Bước **"Nhóm sáng lập & chức vụ"**: thêm 2 email sinh viên demo bằng ô **"Email đồng sáng lập"** → **"Thêm"**.
   Gán D là **Chủ nhiệm**, hai người kia là **Phó chủ nhiệm**.
   *"Chính sách hiện hành yêu cầu ít nhất 3 người sáng lập, đúng 1 Chủ nhiệm và tối đa 2 Phó chủ nhiệm. Con số
   này ICPDP cấu hình được ở UC04, không cứng trong code."*
4. Bước **"Hồ sơ đính kèm"**: tải **logo** và **đề án thành lập**. Bước **"Xem lại & nộp"** → **"Nộp hồ sơ"**.

**ICPDP duyệt**

5. Cửa sổ ICPDP: **"Câu lạc bộ" › "Duyệt hồ sơ thành lập"** → **"Mở thẩm định"** trên hồ sơ vừa nộp.
6. Bấm **"Nhận thẩm định"**.
   *"Hồ sơ phải được một cán bộ nhận trước. Chỉ người đã nhận mới ghi được quyết định, nên không có chuyện hai
   người duyệt chồng nhau."*
7. Chọn **"Phê duyệt"** → **"Xác nhận quyết định"**.
   *"Nếu yêu cầu chỉnh sửa hay từ chối thì bắt buộc có lý do và hạn sửa. Khi duyệt, CLB chuyển Active ngay và
   nhóm sáng lập thành Ban chủ nhiệm."*
8. Cửa sổ D: bấm **"Đổi không gian"** → giờ có thêm thẻ **"Ban chủ nhiệm CLB <tên mới>"**. Không cần vào sâu.

### Phần 3 — Tuyển thành viên (5:00–8:30) · UC16, UC17, UC18, UC20

**Chủ nhiệm B tạo đợt tuyển**

1. Cửa sổ B, workspace CLB Sáng tạo Công nghệ: **"Thành viên & tổ chức" › "Tuyển thành viên"** → **"Tạo đợt tuyển"**.
2. Nhập **Tên đợt tuyển**, **Vị trí cần tuyển**, **"Mở nhận đơn" = bây giờ hoặc sớm hơn**, **"Đóng nhận đơn"**
   trong học kỳ, **Tổng chỉ tiêu**, 1 **vòng tuyển**, 1–2 câu hỏi **biểu mẫu** → **"Công bố đợt tuyển"**.
   *"Khung nhận đơn phải nằm trong một học kỳ, và hệ thống cảnh báo nếu trùng đợt tuyển khác."*

**Sinh viên D ứng tuyển**

3. Cửa sổ D, workspace Sinh viên: **"Khám phá" › "Khám phá CLB"** → thẻ CLB Sáng tạo Công nghệ → **"Tuyển thành viên"**
   → chọn vị trí, trả lời câu hỏi → **"Nộp đơn ứng tuyển"**.

**Chủ nhiệm B xét và tiếp nhận**

4. Cửa sổ B: trên đợt tuyển bấm **"Xét duyệt đơn"** → **"Xem xét"** đơn của D.
5. Lần lượt **"Bắt đầu sàng lọc"** → **"Vào danh sách rút gọn"** (nhập lý do) → **"Chấp nhận"**.
   *"Mỗi bước chuyển trạng thái đều có lịch sử. Số người được nhận không vượt chỉ tiêu; đủ chỉ tiêu thì vào
   danh sách chờ."*
6. Bấm **"Tiếp nhận thành viên"** → xác nhận. D trở thành thành viên Active.
   *"Chấp nhận và tiếp nhận là hai bước riêng: ứng viên có thể được nhận nhưng từ chối tham gia."*

### Phần 4 — Sự kiện mới, từ đề án đến đăng ký (8:30–12:30) · UC25, UC26, UC27, UC29

**Chủ nhiệm B nộp đề xuất**

1. Cửa sổ B: **"Sự kiện" › "Sự kiện CLB"** → **"Tạo đề xuất sự kiện"**.
2. **"Import đề án"**: chọn file `.docx` đã chuẩn bị. Form tự điền tên, mục đích, thời gian, địa điểm, số người,
   đối tượng và kinh phí.
   *"Các CLB vốn đã viết đề án bằng Word theo mẫu của PDP. Thay vì bắt nhập lại, hệ thống đọc thẳng file đó.
   File gốc được lưu làm hồ sơ đính kèm."*
3. **"Lưu & nộp đề xuất"**.
   *"Đề xuất phải nộp trước ngày diễn ra ít nhất 7 ngày, phải nằm trong học kỳ, và bị chặn nếu trùng địa điểm
   hoặc CLB còn nghĩa vụ quá hạn như quyết toán hay báo cáo."*

**ICPDP duyệt**

4. Cửa sổ ICPDP: **"Sự kiện & cơ sở vật chất" › "Duyệt đề xuất sự kiện"** → **"Mở"** → **"Nhận duyệt đề xuất này"**.
5. Nếu có kinh phí: với từng hạng mục chọn **"Quyết định tài trợ"** (Tài trợ · Trả trước / Trả sau, hoặc Không
   tài trợ kèm lý do). Chọn **"Phê duyệt"** → **"Lưu quyết định"**.
   *"Với sự kiện lớn, ICPDP có thể xếp lịch bảo vệ trực tiếp trước khi quyết định. Trong demo chúng em bỏ qua
   bước đó vì lịch bảo vệ phải đặt trước ít nhất 48 giờ."*

**Chủ nhiệm B công bố, sinh viên D đăng ký**

6. Cửa sổ B: trên sự kiện vừa được duyệt bấm **"Công bố"**. Giữ mặc định **Mở đăng ký** = bây giờ,
   **Đóng đăng ký** = giờ bắt đầu, khung **check-in** = giờ diễn ra; tick **"Bật danh sách chờ"** → xác nhận.
   Chỉ dòng **"Mã check-in: …"** vừa sinh.
7. Cửa sổ D: **"Khám phá" › "Sự kiện"** → mở sự kiện → **"Đăng ký"**.
   *"Hết chỗ thì nút đổi thành 'Vào danh sách chờ'. Khi có người huỷ, người đầu danh sách chờ được đẩy lên
   tự động."*

### Phần 5 — Sự kiện đang diễn ra và đã kết thúc (12:30–15:30) · UC31, UC48, UC32, UC49

*"Sự kiện vừa tạo phải 7 ngày nữa mới diễn ra, nên phần check-in em dùng một sự kiện đã chuẩn bị đang diễn ra."*

**Thành viên C check-in và gửi phản hồi**

1. Cửa sổ C: **"Sự kiện & góp ý" › "Sự kiện của tôi"** → "Talkshow: AI trong học tập và nghiên cứu" →
   **"Check-in sự kiện này"** → nhập **Mã check-in** → **"Check-in"**.
   *"Mã chỉ dùng được trong khung giờ check-in. Ban tổ chức cũng có thể điểm danh hộ, nhưng ngoài khung giờ thì
   phải ghi lý do."*
2. Lọc **"Đã check-in"**, ở chính Talkshow vừa check-in bấm **"Gửi phản hồi"**: chọn sao, **"Nhận xét của bạn"**,
   tick **"Gửi ẩn danh"** → **"Gửi phản hồi"**.
   *"Chỉ người đã check-in mới được phản hồi: cửa sổ mở từ lúc check-in đến 72 giờ sau khi sự kiện kết thúc,
   và gửi rồi thì không sửa."*

**Chủ nhiệm B chốt điểm danh và xem phản hồi**

3. Cửa sổ B: **"Đăng ký & điểm danh"** → "Workshop Docker cơ bản" → **"Xác nhận / hiệu chỉnh"** người vắng →
   **"Xác nhận vắng mặt"** → **"Chốt điểm danh"** → xác nhận.
   *"Sau khi chốt, CLB không sửa được nữa; chỉ ICPDP có quyền mở khoá. Số liệu điểm danh này đi vào báo cáo và
   đánh giá CLB."*
4. **"Phản hồi sự kiện"** → chọn sự kiện: chỉ điểm trung bình và phân bố sao.
   *"Thống kê chỉ hiện khi có đủ 3 người phản hồi, và CLB không thấy danh tính người gửi ẩn danh."*

### Phần 6 — Kinh phí (15:30–17:30) · UC36, UC37

Dùng hạng mục tài trợ do `seed:defense:p5` tạo sẵn.

1. Cửa sổ B: **"Tài chính & cơ sở vật chất" › "Khoản chi và quyết toán"** → hạng mục được tài trợ → nhập
   **"Tổng giá trị hóa đơn"**, **"Nội dung khoản chi"**, **"Thêm ảnh"** hoá đơn → **"Lưu khoản chi"** →
   **"Nộp bộ chứng từ đầy đủ"**.
   *"Hạn nộp chứng từ là 14 ngày sau sự kiện. Mỗi hạng mục nộp một bộ hoá đơn, không nộp thêm để nhận lần hai."*
2. Cửa sổ ICPDP: **"Sự kiện & cơ sở vật chất" › "Giải ngân kinh phí"** → mở khoản → nhập
   **"Giá trị hóa đơn hợp lệ"** và **"Lý do / nhận xét"** → **"Duyệt đối soát"**.
   *"Hệ thống so số đã duyệt, số chứng từ và số hợp lệ, nên chênh lệch lộ ra ngay thay vì đến cuối kỳ mới thấy."*
3. Cửa sổ B: **"Xác nhận đã nhận tiền"** (nếu còn thời gian).

### Phần 7 — Đánh giá CLB và báo cáo (17:30–19:00) · UC43, UC55

1. Cửa sổ ICPDP: **"Đánh giá & báo cáo" › "Đánh giá CLB"** → chọn **Học kỳ** → **"Mở"** một CLB.
   *"Bản nháp đánh giá được hệ thống tự sinh khi ICPDP chấp nhận báo cáo định kỳ. Điểm tính từ dữ liệu thật:
   sự kiện, điểm danh, phản hồi, tài chính, báo cáo đúng hạn và vi phạm, theo bộ tiêu chí ICPDP cấu hình."*
   Chỉ các nhóm điểm; nếu CLB chưa chốt thì bấm **"Chốt kết quả"**.
2. **"Đánh giá & báo cáo" › "Xuất báo cáo"**: chọn **"CLB và trạng thái"** + **"Sự kiện kèm đăng ký và điểm danh"**
   → **"Đếm số dòng"** → **"Tải xuống"**, mở file Excel vừa tải.
   *"Mọi số liệu nhập trong năm đều xuất được ra Excel để ICPDP làm báo cáo tổng kết."*

### Phần 8 — Tổng kết (19:00–20:00)

*"Vừa rồi là vòng đời của một CLB trong hệ thống: thành lập, tuyển người, tổ chức sự kiện, dùng kinh phí và
được đánh giá. Ở mỗi bước, CLB làm việc của mình và ICPDP ra quyết định có lý do, có lịch sử. Các luồng còn lại
như chuyển giao ban chủ nhiệm, tạm ngừng CLB, đặt cơ sở vật chất, khiếu nại và hồ sơ vi phạm đều chạy cùng
mô hình này; chúng em có video và sẵn sàng demo thêm nếu thầy muốn."*

