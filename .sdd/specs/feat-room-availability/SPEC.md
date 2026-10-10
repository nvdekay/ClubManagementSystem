# SPEC: feat-room-availability

## Vấn đề
Người đặt cần biết phòng đã có lịch sử dụng trước khi chọn. Danh mục demo hiện chỉ có ba phòng Delta và lặp thông tin tầng.

## Hành vi
- Chọn ngày và slot trước khi chọn phòng; dùng API availability hiện có cho từng phòng đang hoạt động.
- Hiển thị trạng thái đang kiểm tra, trống, đã có lịch sử dụng hoặc không khả dụng. Phòng có conflict booking/event hoặc lỗi kiểm tra không được chọn qua chuột hay bàn phím.
- Khi đổi thời gian, xoá lựa chọn phòng và thiết bị; chỉ lưu khi kết quả kiểm tra hiện tại xác nhận phòng trống. Kiểm tra lại định kỳ và khi quay lại cửa sổ.
- Đặt mới chỉ nhận phòng/ngày/slot, thành công giữ phòng ngay ở trạng thái Approved, không tạo approval task. Không áp dụng hạn nộp trước ca của luồng cũ.
- Người chịu trách nhiệm tự lấy từ chủ nhiệm có assignment đã xác nhận, membership Active và nhiệm kỳ đang hiệu lực; chưa có chủ nhiệm thì không đặt được. Lưu snapshot id/tên/email vào audit của lần đặt (không đổi schema), hiển thị ở form và chi tiết.
- Kiểm tra xung đột và ghi booking cùng transaction, tuần tự hoá bằng property/club; luôn chặn trùng lịch dù allowOverbooking bật. Lịch Approved/In Use và sự kiện Approved/Upcoming/Ongoing chiếm phòng; Requested cũ chưa giữ phòng.
- Giữ API thẩm định cũ cho lịch sử và request cũ; giao diện tạo mới chỉ dùng đặt ngay. Huỷ booking giải phóng phòng như hiện có.
- Seed demo bổ sung 30 phòng ở Alpha/Beta/Gamma/Delta/Epsilon; mã AL/BE/GA/DE/EP là quy ước demo, số phòng và capacity là giả lập. Location chỉ ghi tên tòa. Chạy lại giữ cấu hình phòng đã được người dùng sửa.

## Tiêu chí nghiệm thu
- [ ] Danh sách phòng thể hiện availability và khóa phòng có lịch hoặc chưa kiểm tra được.
- [ ] Đổi ngày/slot làm mất lựa chọn cũ; lưu bị chặn khi availability chưa hợp lệ.
- [ ] Seed có 30 phòng, giữ DE312/DE222/DE223 và không ghi tầng trong location.
- [ ] npm run check xanh.

## Nguồn
- https://viewdaihoc.fpt.edu.vn/fpt-ha-noi/ xác nhận Epsilon tại campus Hà Nội.
- https://daihoc.fpt.edu.vn/sustainability/fpt-university-provides-affordable-housing-for-students/ liệt kê năm giảng đường Alpha, Beta, Gamma, Delta, Epsilon và tám Dom A–H.

## Ngoài phạm vi
Không đổi schema; luồng đặt ngay luôn chặn xung đột, không sửa policy toàn hệ thống; không đưa Omega Hub vào phòng đặt khi chưa xác nhận vận hành. Không seed database đang chạy trong phiên sửa code.

## Tiêu chí bổ sung
- [ ] Form chỉ cần ngày, slot, phòng; tự hiển thị chủ nhiệm chịu trách nhiệm.
- [ ] Đặt ngay trả Approved, không tạo task; chặn xung đột khi allowOverbooking=true.
- [ ] Hai người đặt cùng slot chỉ một người thành công; giữ snapshot chủ nhiệm khi đổi nhiệm kỳ.
- [ ] Chưa có chủ nhiệm, membership/assignment hết hiệu lực và người không có quyền đều bị chặn.

## Changelog
- v1.0.0 (2026-10-11) — theo yêu cầu người dùng trên branch hiện tại.
- v1.1.0 (2026-10-11) — người dùng xác nhận đặt xong giữ phòng ngay và chủ nhiệm chịu trách nhiệm.
