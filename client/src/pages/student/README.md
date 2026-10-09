# pages/student/

Các trang nghiệp vụ Student. Mỗi trang gọi dữ liệu qua hook React Query; trang hồ sơ thành lập dùng policy hiện hành, giữ draft riêng, lưu lịch sử version đã nộp và mở được bằng URL.

`RecruitmentApplicationPage` triển khai UC17: xem form campaign đang mở, lưu draft, tải file riêng
tư, submit/rút đơn; danh sách đơn tuyển được hiển thị riêng khỏi hồ sơ thành lập CLB.

`StudentHomePage` triển khai dashboard UC02: số liệu cá nhân theo module, lỗi từng panel độc lập
và liên kết tới luồng nghiệp vụ đang có.

`MyEventRegistrationsPage` (UC29, UC31, UC48) liệt kê đăng ký sự kiện của Student, lọc đang hiệu lực/đã
check-in/đã huỷ, cho huỷ trước giờ bắt đầu và check-in bằng mã hoặc QR deep link (`?checkin=&code=`); panel đăng ký trên event detail nằm ở `components/custom/EventRegistrationPanel`.
Tab “Đã check-in” còn cho gửi phản hồi sao + nhận xét (UC48) qua `components/custom/EventFeedbackForm`.

`StudentFeedbackPage` (UC50, góp ý một chiều) cho Student gửi góp ý tới một CLB hoặc ICPDP, tuỳ chọn ẩn
danh, và xem lại danh sách đã gửi.
