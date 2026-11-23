# SPEC: feat-event-proposal-import

## Vấn đề
CLB muốn import đề án Word theo hai file trong `docs/` để tự đọc và hiển thị field,
không sửa thông tin đề án trên web. Người dùng chọn phương án báo thiếu và yêu cầu bổ sung
trong file rồi import lại ngày 17/11/2026.

## Hành vi
- Theo yêu cầu người dùng, hyperlink trong Word và URL viết trực tiếp phải bấm mở được ở cả
  bản xem tài liệu lẫn hồ sơ trích xuất. Giữ đúng nhãn và đích của từng hyperlink, kể cả nhãn giống nhau.
  Link web/email mở tab mới, không thay trang đang soạn; chỉ cho HTTP(S)/mailto, không chạy script URL.
- Bổ sung theo phản hồi UI: phần thông tin trích xuất hiển thị thành hồ sơ có tổng quan,
  trạng thái dữ liệu và các mục nội dung theo đề án. Đọc toàn bộ đoạn văn/bảng theo thứ tự nguồn,
  gồm nhân sự, nội dung, truyền thông, đối ngoại, dự trù kinh phí và hỗ trợ; không chỉ đọc bảng Overview.
  Cho xem từng mục hoặc toàn bộ; giữ nguyên ô gộp và toàn bộ dòng bảng, không cắt nội dung dài.
  Tách rõ số liệu hệ thống xác định được và nguyên văn nguồn; thiếu dữ liệu vẫn hiển thị thiếu.
- Điều chỉnh theo yêu cầu ngày 17/11/2026: bản xem chính phải hiển thị **toàn bộ tài liệu Word**
  dạng trang giấy như PDF, gồm font, tiêu đề, bảng, ảnh, header/footer; không dùng danh sách field
  làm bản xem chính. Có số trang, chuyển trang, thu/phóng, vừa chiều rộng và in/lưu PDF.
  Field trích xuất thu gọn thành mục kiểm tra riêng; tài liệu vẫn chỉ đọc.
  Dựng trang trên trình duyệt; phân trang có thể khác Word/PDF gốc khi máy thiếu font gốc.
- Trích xuất văn bản và bảng từ DOCX trên trình duyệt, không gửi tài liệu tới dịch vụ AI.
- Import thay toàn bộ dữ liệu của đề án đang soạn, không giữ field còn sót từ lần import trước.
- Hiển thị dữ liệu chỉ đọc; sửa hoặc bổ sung bằng cách import lại file. Form tạo và sửa dùng chung luồng này.
- Đọc bảng tổng quan, giờ rõ ràng hoặc khung Agenda ngày diễn ra, mức độ rủi ro,
  nhu cầu CSVC và bảng đề xuất hỗ trợ PDP. Ngân sách xin hỗ trợ khác tổng dự trù tổ chức.
- Không biến số đội, mục tiêu quảng bá, ô trống hoặc placeholder thành sức chứa.
- Thiếu field bắt buộc hoặc giá trị mơ hồ: hiển thị lỗi và chặn lưu/nộp. Giữ validation nghiệp vụ server.
- Không tự chọn booking/property ID từ tên địa điểm; tên địa điểm giữ ở `venueText`.
- DOCX tối đa 10 MB, XML giải nén tối đa 12 MB; file hỏng, mã hoá, sai định dạng hoặc quá giới hạn có lỗi rõ ràng.
- Chỉ DOCX được import tự động trong lần triển khai này. PDF/ảnh scan không được nhận dưới danh nghĩa đã OCR.
- API lưu/nộp/upload hiện tại, quyền, CSRF và vòng đời phiên bản giữ nguyên.

## Tiêu chí nghiệm thu
- [x] File thực tế đọc đúng tên Coding Inspiration 2026, địa điểm, mục đích/nội dung và 8 khoản hỗ trợ PDP.
- [x] Template trống không hiển thị/lưu dữ liệu giả; thiếu dữ liệu được liệt kê.
- [x] Ngày/giờ Việt Nam, khoảng giờ Agenda và ngày không hợp lệ được xử lý đúng.
- [x] Không lấy tổng dự trù hoặc số lượng đội làm ngân sách xin/sức chứa.
- [x] Lỗi đọc file không làm lưu được field cũ với file mới; không cho sửa field trên web.
- [ ] Kiểm tra parser, typecheck, lint, test và build qua; ghi rõ giới hạn nghiệm thu trình duyệt.

Parser, unit test, typecheck, lint và build client đã qua; `npm run check` còn lỗi kết nối
MongoDB ở integration. Chi tiết và giới hạn kiểm thử trình duyệt trong `TASKS.md`.

## Ngoài phạm vi
OCR ảnh/PDF scan, tự suy đoán field, đổi schema, tự nộp hồ sơ sau import.

## Changelog
- v1.3.0 (2026-11-17) — người dùng yêu cầu bấm được liên kết trong tài liệu và nội dung trích xuất.
- v1.2.0 (2026-11-17) — làm lại UI hồ sơ trích xuất và bổ sung toàn bộ thông tin văn bản/bảng theo phản hồi người dùng.
- v1.1.0 (2026-11-17) — người dùng yêu cầu xem toàn văn theo trang, giữ định dạng thay bản liệt kê field.
- v1.0.0 (2026-11-17) — yêu cầu người dùng và lựa chọn xác nhận `1`.
