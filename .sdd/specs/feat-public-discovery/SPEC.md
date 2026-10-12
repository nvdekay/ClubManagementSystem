# SPEC: feat-public-discovery

## Vấn đề
Guest và Student cần tìm CLB, đợt tuyển và sự kiện công khai theo UC06 mà không phụ thuộc đăng nhập Google. Dữ liệu hiển thị phải tuân theo trạng thái hiện hành, không để lộ CLB đã Dissolved hoặc sự kiện chưa công bố.

## Hành vi
- `GET /api/v1/public/clubs?search=&field=&page=`: tìm tên/mã/mô tả theo từ khoá, lọc lĩnh vực, phân trang. Chỉ `Active` và `Suspended`; trả trạng thái và mô tả ngắn.
- `GET /api/v1/public/clubs/:id`: hồ sơ CLB, ban chủ nhiệm đã xác nhận trong nhiệm kỳ còn hiệu lực, hoạt động công khai đã diễn ra, đợt tuyển đã công bố còn trong khung thời gian, sự kiện công khai `Upcoming`. Với `Suspended`, danh sách đợt tuyển rỗng. ID sai dạng trả 400; ID không có hoặc không công khai trả 404.
- `GET /api/v1/public/events?page=`: sự kiện `PUBLIC`, `Upcoming`, có `publishedAt`, chưa bắt đầu, thuộc CLB `Active`; sắp xếp thời gian tăng dần, phân trang. Mỗi item có liên kết về CLB. Không hiện `Approved` chưa công bố.
- `GET /api/v1/public/events/:id`: chi tiết công khai của sự kiện tương tự điều kiện danh sách; không đưa mã check-in hay trường nội bộ vào response.
- Tất cả endpoint là GET không cần cookie. Dữ liệu vào đi qua zod; response dùng envelope hiện hành. Client có trang danh bạ, chi tiết CLB, danh sách/chi tiết sự kiện với URL mở trực tiếp, tìm kiếm, lọc và các trạng thái loading/error/empty bằng en/vi, light/dark. CTA ứng tuyển/đăng ký giữ đường quay lại nội bộ sau đăng nhập khi UC17/UC29 được triển khai.

## Tiêu chí nghiệm thu
- [ ] Guest đọc được danh bạ và chi tiết, từ khoá/lĩnh vực/phân trang hoạt động; chỉ Active/Suspended, không Dissolved.
- [ ] Suspended có nhãn và không có đợt tuyển; chỉ campaign đã công bố trong khung thời gian được hiện cho Active.
- [ ] Sự kiện Approved chưa công bố, MEMBERS_ONLY, đã huỷ hoặc đã qua không nằm trong danh sách Upcoming; trang chi tiết cũng không lộ chúng.
- [ ] Trang CLB chỉ hiện ban chủ nhiệm đã xác nhận trong nhiệm kỳ hiện hành, hoạt động công khai đã diễn ra; không lộ email cá nhân, check-in code hay dữ liệu quản trị.
- [x] ID/query sai trả 400, tài nguyên không công khai trả 404; OpenAPI và route khớp (unit test; integration Mongo chờ chạy).
- [ ] Client mở trực tiếp URL trang CLB/sự kiện, tìm và lọc, hiển thị loading/error/empty bằng en/vi trên light/dark.

## Ngoài phạm vi
Ghi dữ liệu UC07, UC16–17, UC25–29; đăng ký/ứng tuyển thật chỉ mở khi use case tương ứng được xây. Không tạo dữ liệu giả trong production.

## Changelog
- v0.1.0 (2026-10-03) — phạm vi UC06 theo SRS và DBML hiện hành.
