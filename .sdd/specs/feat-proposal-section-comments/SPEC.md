# SPEC Nhận xét theo mục đề án sự kiện

## Vấn đề
ICPDP cần ghi rõ phần đề án cần sửa ngay cạnh nội dung và dùng cùng nhận xét khi bảo vệ.
Lịch bảo vệ cần nằm cùng cột thao tác xét duyệt bên phải.

## Hành vi
- Chuyển toàn bộ lịch, thao tác và lịch sử bảo vệ sang cột phải, trong một mục riêng.
- Mỗi mục trích xuất có nút Nhận xét mở ô nhập, Hủy và Gửi. Hiện tác giả, thời gian, nội dung.
- Nhận xét được gộp vào Lý do dưới tên mục, giữ nguyên lý do đã nhập; không thêm schema.
- Bản nháp lý do giữ trong sessionStorage theo tài khoản, eventId và revisionNo khi chuyển màn xét duyệt/phòng bảo vệ.
- Chỉ người được phân công ghi nhận xét vào bản nháp quyết định; không ghi thay người khác.
- Giới hạn từng nhận xét 2000 ký tự và lý do tổng 5000 ký tự; không cắt mất dữ liệu khi vượt giới hạn.
- Lý do được lưu qua API quyết định hiện có, CLB xem theo lịch sử quyết định hiện có. Không coi nhập nhận xét là đã gửi quyết định.
- Thẻ nhận xét nháp có Sửa/Xóa ngay tại mục; cập nhật đúng đoạn Lý do theo vị trí, không thay nhầm nhận xét trùng nội dung.
- Tải lại vẫn khôi phục các thẻ nhận xét nháp. Khi sửa trực tiếp Lý do, chỉ các thẻ có đoạn nguồn còn nguyên vẹn được giữ lại.

## Tiêu chí nghiệm thu
- [ ] Lịch bảo vệ nằm ở cột thao tác bên phải.
- [ ] Nhận xét được mở, nhập, hủy và gửi ngay cạnh mục nội dung.
- [ ] Lý do nháp giữ trong tab khi tải lại/chuyển màn, không lẫn hai tài khoản, phiên bản hoặc sự kiện.
- [ ] Màn xét duyệt và phòng bảo vệ có cùng tài liệu và nhận xét.
- [ ] Quyết định gửi bằng API hiện có, giữ nguyên kiểm tra quyền và version phía server.
- [ ] Chuỗi Việt Anh, trạng thái gửi, lỗi và thử lại đầy đủ.
- [ ] Sửa/xóa nhận xét cập nhật đúng đoạn lý do, giữ nhận xét trùng khác và nội dung nhập tay.

## Ngoài phạm vi
Bôi đen từng ký tự, sửa file Word trực tiếp, nhắc người dùng qua @, gửi email, trả lời dạng luồng.

## Changelog
- 23/11/2026: khởi tạo theo yêu cầu người dùng.
- 23/11/2026: người dùng yêu cầu gộp trong Lý do, thay lưu nhận xét độc lập bằng bản nháp lý do và API quyết định hiện có.
- 23/11/2026: bổ sung sửa/xóa thẻ nhận xét và khôi phục thẻ trong bản nháp.
