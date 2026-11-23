# TASKS: feat-event-proposal-import

## Liên kết trong đề án
- [x] Đọc đích hyperlink từ DOCX relationships và giữ vị trí link trong đoạn văn/ô bảng/field.
- [x] Cho bấm link trong hồ sơ và bản xem phân trang, mở tab mới; giữ nguyên nội dung nguồn.
- [x] Kiểm tra URL thường, nhãn hyperlink, nhãn trùng khác đích, scheme không hợp lệ và trình duyệt thật.
- [x] Cập nhật tài liệu, test, lint/typecheck/build.

Kiểm chứng link: 61 test client qua (12 test link mới); lint/typecheck/build client qua.
Trên Edge, link URL và nhãn Word cùng tên/khác đích đúng ở Overview, toàn văn và frame;
đích local nhận đủ hai lượt mở tab mới, không opener/referrer, trang soạn còn nguyên.
URL thực thi mã không được tạo link hoạt động. Đối chiếu 110 hyperlink thật trong đề án,
giữ đúng từng nhãn/đích và toàn bộ văn bản/29 bảng; template không có hyperlink.
Không kiểm thử quyền truy cập website bên ngoài. Full check backend vẫn có giới hạn integration đã ghi trước,
không thay backend hoặc schema trong tác vụ này.

## Hồ sơ thông tin trích xuất đầy đủ
- [x] Giữ thứ tự đoạn văn/bảng và ô gộp, nhóm toàn bộ đề án theo các mục nguồn.
- [x] Thiết kế lại tổng quan, trạng thái thiếu, số liệu, điều hướng các mục và bảng chi tiết.
- [x] Đọc được đầy đủ nội dung từ file import và file gốc đã lưu, không đổi field nghiệp vụ.
- [x] Kiểm tra toàn văn hai file, giao diện desktop/mobile/en/vi/theme, test parser và build/lint/typecheck.

Kiểm chứng hồ sơ trích xuất:
- 6 mục chính, 29 bảng, 197 ô gộp trong đề án Coding Inspiration; giữ cả phần mở đầu.
  Đối chiếu từng đoạn văn của cả hai file DOCX không thiếu nội dung; giữ xuống dòng/tab nguồn.
- App thật với trưởng HEBE: hồ sơ tổng quan có số liệu/tài liệu nguồn/các mục cần làm rõ;
  Toàn bộ nội dung có 29 bảng và phần hỗ trợ CSVC cuối tài liệu; đã xem ảnh desktop.
- Form React với API giả lập: kiểm tra menu các mục/Toàn bộ nội dung, đủ 29 bảng, import lại,
  file lỗi, chặn lưu khi thiếu; en/vi, sáng/tối ở 492 px không tràn ngang.
- 49 test client qua (thêm 2 test giữ thứ tự/toàn bộ block nguồn); lint, typecheck, build client qua.
  Không chạy lại integration backend không liên quan; giới hạn full check đã ghi ở phần kiểm chứng trước.
- Hồ sơ đã lưu tái đọc file DOCX qua nguồn đã tải ở viewer; nếu không lấy được nguồn hoặc là PDF cũ,
  hiển thị thông báo giới hạn thay vì khẳng định đã trích xuất đủ nội dung.

## Bản xem tài liệu theo trang
- [x] Dựng đầy đủ DOCX, phân trang theo chiều cao, giữ bảng/ảnh/font/tiêu đề.
- [x] Toolbar chuyển trang, thu/phóng, vừa chiều rộng, in; field trích xuất thu gọn.
- [x] Xem được file vừa import và tài liệu đã lưu; trạng thái đọc/lỗi và thay file không giữ bản xem cũ.
- [x] Kiểm tra hai file thật trên trình duyệt, toàn văn/trang cuối, desktop/mobile và theme/ngôn ngữ.
- [x] Lint, typecheck, test, build client và cập nhật tài liệu; kiểm tra toàn repo còn giới hạn integration như ghi dưới.

Kiểm chứng bản xem phân trang:
- Edge đọc toàn bộ file đề án: 43 trang, 2 ảnh/logo, 68 mảnh bảng sau phân trang (29 bảng nguồn),
  đối chiếu mọi đoạn văn với XML nguồn không thiếu đoạn nào. Template: 6 trang, 2 ảnh, đủ toàn văn.
- Sửa việc clipping ký tự đầu các heading có hanging indent; quan sát được A. NHÂN SỰ / B. NỘI DUNG.
- Kiểm thử form có API giả lập: chuyển trang, zoom, thay file, import lỗi, giữ chặn lưu khi thiếu;
  en/vi và sáng/tối không tràn ngang ở 492 px.
- Nghiệm thu trên app thật bằng session test trưởng HEBE: 43 trang, có nội dung phần cuối,
  giấy trắng, field thu gọn, không tràn ngang ở desktop; session tạm được thu hồi sau kiểm tra.
- Client 47 test qua (thêm 3 test tải bản gốc đã lưu), lint/typecheck qua; build gồm `index.html`
  và `proposal-preview.html` thành công, cảnh báo kích thước bundle vẫn còn.
- `npm run check`: constitution/lint/typecheck qua, lượt integration song song trên Windows bị timeout;
  dừng cây tiến trình check sau lỗi để không tiếp tục gây tải lên MongoDB đang dùng test UI.
  Không khẳng định toàn bộ check xanh. Bản xem file đã lưu kiểm tra service với API giả lập,
  chưa nghiệm thu upload/tải Cloudinary thật hoặc thao tác chọn máy in của người dùng.

- [x] Đọc hai file Word, đối chiếu form và chốt hành vi thiếu field.
- [x] Trích xuất DOCX có giới hạn và ánh xạ dữ liệu theo mẫu.
- [x] Giao diện import, field chỉ đọc, trạng thái đọc/lỗi và chặn lưu/nộp khi thiếu.
- [x] Chuỗi en/vi và tài liệu hướng dẫn điền file.
- [x] Kiểm chứng với hai file thật, các trường hợp biên và bộ kiểm tra dự án (kết quả bên dưới).

## Kiểm chứng ngày 17/11/2026

- Constitution, lint hai workspace, typecheck hai workspace thành công.
- Server: 424 unit test qua. Client: 44 test qua, gồm 11 test import mới; đã nối vào `npm test`.
- `npm run build -w client` thành công, còn cảnh báo kích thước bundle có sẵn.
- Edge headless đọc hai DOCX thật: đúng tên, giờ Việt Nam, 8 khoản hỗ trợ tổng 24.845.000 VND,
  báo thiếu capacity/risk với file mẫu; template trống báo thiếu, không hiển thị giá trị đoán.
- Kiểm thử form React thật trên Edge với API giả lập: field chỉ đọc, template trống,
  import đầy đủ, import lỗi xoá giá trị cũ, chặn lưu khi thiếu, lưu rồi upload đúng file và CSRF.
  en/vi, sáng/tối không tràn ngang ở viewport 492 px.
- **`npm run check` chưa xanh:** 51 file integration lỗi hook timeout khi kết nối MongoDB;
  199 test bên trong không chạy. `.env` đã được cập nhật bên ngoài tác vụ, không còn trống như
  ở lần cài đặt. Không thay đổi `.env` hay schema. Cần MongoDB replica set để nghiệm thu integration
  và upload Cloudinary thật; kiểm thử API giả lập không thay thế phần này.
