# Import đề án sự kiện

CLB tạo/sửa đề xuất bằng **Import đề án** tại trang đề xuất. Các field trên web chỉ để xem.
Sửa nội dung trong Word rồi import lại. Hệ thống chỉ tải tài liệu lên khi bấm lưu/nộp;
việc trích xuất diễn ra trên trình duyệt, không gửi tài liệu tới dịch vụ AI.

## Xem toàn bộ tài liệu

Sau import, bản xem chính bên phải hiển thị **toàn bộ DOCX theo trang giấy**: font chữ, tiêu đề,
bảng và ô gộp, ảnh/logo, header/footer và số trang. Thanh công cụ cho phép chuyển trang,
thu/phóng, vừa chiều rộng và mở hộp thoại In để chọn Lưu PDF. Hồ sơ thông tin được trích xuất
nằm bên dưới, không thay thế tài liệu gốc. Bảng trong bản xem được phân trang theo chiều cao nội dung.
Trên màn nhỏ, điều khiển tự xuống dòng; có thể thu nhỏ hoặc cuộn trong bản xem.

Trang sửa đề xuất tải lại **file gốc đã lưu** để xem, không dựng tài liệu từ các field trong DB.
PDF đã lưu từ dữ liệu cũ được xem bằng trình xem PDF của trình duyệt. Tự đọc field vẫn chỉ hỗ trợ DOCX.

Renderer và bộ phân trang được đóng gói ở entry riêng `proposal-preview.html`, chỉ tải khi mở bản xem,
không gửi tài liệu tới Google/Microsoft. Frame cách ly CSS tài liệu với theme ứng dụng;
script/HTML đính kèm và URL thực thi mã bị vô hiệu hoá. Link HTTP(S)/email mở được ở tab mới. Giấy vẫn giữ nền sáng và màu gốc
để đọc/in; khung bao đổi theo theme. Nếu máy thiếu font gốc, font thay thế và cách ngắt trang có thể khác Word
hoặc PDF xuất trực tiếp từ Word. Bản xem HTML phân trang không cam kết tái tạo từng pixel của PDF gốc.

## Hồ sơ thông tin được trích xuất

Hồ sơ có tên sự kiện, số mục/bảng đã đọc, tổng ngân sách xin hỗ trợ, tài liệu nguồn và các mục
cần làm rõ. Mục Tổng quan trình bày lịch trình, địa điểm, đối tượng, số người, rủi ro, các nội dung
tổng quan và bảng ngân sách. Giá trị số người dạng đội/nhóm vẫn hiện nguyên văn và được đánh dấu
cần làm rõ, không tự chuyển thành một số người phỏng đoán.

Các nút theo mục nguồn cho phép đọc đầy đủ Nhân sự, Nội dung, Truyền thông, Đối ngoại,
Dự trù kinh phí và Đề xuất hỗ trợ. Nút **Toàn bộ nội dung** hiển thị cả phần mở đầu và mọi mục.
Giữ thứ tự đoạn văn/bảng, ô gộp ngang/dọc, xuống dòng và toàn bộ dòng bảng; không cắt nội dung dài.
Bảng nhiều cột cuộn ngang trong vùng riêng để không làm tràn màn hình.
Hyperlink giữ nguyên tên và địa chỉ từ Word, kể cả nhiều link cùng tên nhưng khác đích. URL viết trực tiếp
cũng được nhận diện để bấm mở. Cả bản xem dạng trang và hồ sơ trích xuất dùng tab mới, không chuyển khỏi
trang đang soạn; tab đích không có quyền truy cập cửa sổ nguồn. Việc xem được nội dung ở trang đích
vẫn theo quyền truy cập của tài khoản trên trang đó.
Hồ sơ đã lưu đọc lại file DOCX gốc để có đủ các mục, không dựng nội dung còn thiếu từ field DB.
Nếu chưa lấy được file hoặc file là PDF cũ, UI ghi rõ chỉ có dữ liệu đã lưu thay vì báo đã đọc đầy đủ.

Kiểm chứng file mẫu: 6 mục chính, 29 bảng nguồn, 197 ô gộp; đối chiếu mọi đoạn văn của cả hai DOCX
không mất nội dung. Ngân sách xin hỗ trợ vẫn là 8 khoản, tổng 24.845.000 VND, tách khỏi bảng dự trù.

## Điền bảng Tổng quan chương trình

Dùng cấu trúc bảng trong `docs/template-de-an-su-kien.docx`: cột STT, Hạng mục, Nội dung.
Giữ bảng thay vì đổi sang ảnh. Thêm các dòng chưa có vào **chính bảng Tổng quan**:

| Hạng mục | Nội dung và ánh xạ |
|---|---|
| Tên sự kiện | Tên đề xuất |
| Mục đích, Mục tiêu | Ghép vào mục tiêu đề xuất |
| Nội dung sự kiện / Nội dung cuộc thi | Kế hoạch hoạt động |
| Thời gian diễn ra sự kiện | Ngày `dd/mm/yyyy` |
| Thời gian bắt đầu | `dd/mm/yyyy HH:mm`, hoặc `HH:mm` nếu đã ghi ngày diễn ra |
| Thời gian kết thúc | Như thời gian bắt đầu; phải sau bắt đầu |
| Địa điểm | Tên địa điểm, không tự chọn ID phòng/booking |
| Đối tượng | Phải ghi rõ (Sinh viên trường / Công khai, hoặc Thành viên CLB / Nội bộ CLB); đề xuất luôn được lưu là công khai (`PUBLIC`) vì sự kiện nội bộ đã gỡ 19/11/2026 |
| Số lượng người tham gia | Một số nguyên cụ thể, ví dụ `120 người`; không dùng số đội hoặc khoảng 3–5 người/đội |
| Ghi chú rủi ro | Giải thích bổ sung, tuỳ chọn |

Nếu có một ngày diễn ra duy nhất nhưng chưa ghi giờ, hệ thống đọc khung giờ sớm nhất–muộn nhất
trong bảng **AGENDA SỰ KIỆN** hoặc **AGENDA D - DAY**, bao gồm chuẩn bị và thu dọn.
Với sự kiện nhiều ngày hoặc qua đêm, cần ghi rõ cả ngày lẫn giờ bắt đầu/kết thúc trong bảng Tổng quan.
Múi giờ luôn là Việt Nam (`UTC+07:00`). Giữ các kiểm tra nghiệp vụ: ngày tương lai, báo trước,
học kỳ đang cấu hình, xung đột lịch và ngân sách. Học kỳ do server xác định theo lịch, không tự đoán trên client.

## Ngân sách và CSVC

Chỉ bảng **ĐỀ XUẤT HỖ TRỢ TỪ PHÒNG PDP** được chuyển thành các khoản xin ngân sách.
Giữ thứ tự cột của mẫu: STT, Đầu mục, Đơn vị, Số lượng, Đơn giá, Thành tiền.
Lấy tiền từ cột Thành tiền; không nhân lại hoặc lấy dòng Tổng. Khoản có tên nhưng tiền không đọc
được sẽ chặn lưu/nộp.
Các bảng BUDGET TỔ CHỨC và BUDGET TRUYỀN THÔNG không được coi là tiền xin trường.
Phần văn bản sau tiêu đề Hỗ trợ cơ sở vật chất thành nhu cầu CSVC.

## Kết quả với hai file nguồn

- `Đề án sự kiện.docx`: tên Coding Inspiration 2026; ngày 04/07/2026, khung Agenda 06:00–18:00;
  8 khoản xin hỗ trợ, tổng **24.845.000 VND**. Chưa có sức chứa dạng số người cụ thể
  trong bảng Tổng quan nên cần bổ sung. Ngày trong file đã qua so với ngày triển khai 17/11/2026,
  vì vậy không thể dùng nguyên file để tạo đề xuất mới.
- `Template Đề án sự kiện.docx`: mẫu trống, cần điền thông tin; không hiển thị/lưu tên, ngày hay 40 người mặc định.

## Giới hạn

Chỉ nhận DOCX có văn bản/bảng, tối đa 10 MB, XML sau giải nén tối đa 12 MB, trình duyệt hiện đại
có `DecompressionStream` hỗ trợ `deflate-raw`. Không hỗ trợ DOC cũ, PDF hoặc ảnh scan trong luồng import này.
File hỏng, không theo mẫu, field thiếu hoặc mơ hồ được báo rõ. Import lại thay toàn bộ dữ liệu đang soạn,
không trộn với lần import trước. Các lịch/booking/câu hỏi đăng ký của hồ sơ cũ giữ khi chỉ xem/lưu;
import file mới tạo dữ liệu từ file, không kế thừa các lựa chọn cũ không có trong file.
