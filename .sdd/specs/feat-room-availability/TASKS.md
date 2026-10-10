# TASKS

- [x] Hiển thị availability cho danh sách phòng và khóa lựa chọn bằng chuột/bàn phím.
- [x] Xoá lựa chọn khi đổi thời gian, chặn đặt khi phòng chưa xác nhận trống; refresh 30 giây và nút thử lại.
- [x] Bổ sung seed 30 phòng tại năm tòa, bỏ tầng trong location; chuyển booking demo sang đặt ngay.
- [x] API đặt ngay trong transaction, snapshot chủ nhiệm và hợp đồng OpenAPI.
- [x] Form chỉ cần phòng/ngày/slot; hiển thị chủ nhiệm chịu trách nhiệm.
- [x] Unit test phân quyền, request tối giản, hạn giờ cũ và chặn allowOverbooking; integration test đồng thời, snapshot và huỷ.
- [x] npm run check, build client, validator tiếng Việt.

## Kiểm chứng
- Bộ integration Mongo booking: 14/14 đạt trên replica set tạm riêng, gồm hai CLB đặt cùng slot chỉ một lượt thành công.
- Build client đạt (cảnh báo kích thước bundle). Validator tiếng Việt sạch.
- Không chạy seed trên database ứng dụng; chưa kiểm thử trực quan bằng browser trong phiên này.

Kiểm tra sau khi chuyển vào branch chính đang mở: `npm run check` đạt 374/374 test
(trong đó có integration Mongo), build frontend đạt.
