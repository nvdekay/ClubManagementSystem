# pages/icpdp/

Các trang nghiệp vụ chỉ dành cho `ICPDP_OFFICER`. Mỗi trang tự kiểm tra phiên đăng nhập và vai
trò để hiển thị trạng thái phù hợp; API và use case vẫn kiểm tra quyền ở server.

`ApplicationReviewQueuePage` và `ApplicationReviewDetailPage` triển khai UC08 một cấp duyệt:
hàng đợi, nhận task, đọc snapshot bất biến và ghi đúng một quyết định.
