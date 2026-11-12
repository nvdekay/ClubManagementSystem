# ui/chart/

Bộ chart vẽ bằng HTML/SVG thuần cho dashboard, không dùng thư viện. Màu đi qua token
`chart-1-app`, `chart-2-app`, `chart-muted-app`, `chart-grid-app` (đã chạy bộ kiểm tra bảng màu
dataviz ở nền sáng `#ffffff` và nền tối `#0f1115`; bản tối của `chart-1` là `#e06b1e` để nằm trong dải
độ sáng cho nền tối). Tông trạng thái `success`/`warning`/`danger` chỉ dùng để chỉ một trạng thái (quá hạn,
vòng đời CLB) và luôn đi kèm nhãn chữ.

- `AppChartFrame` — khung một chart: tiêu đề, chú giải (khi có từ 2 chuỗi), nội dung và bảng số
  liệu thu gọn để không giá trị nào chỉ đọc được khi rê chuột.
- `AppBarList` — thanh ngang mỗi dòng một hạng mục, giá trị ở đầu thanh, xếp chồng khi có 2 chuỗi;
  dòng có `href` mở luồng tương ứng.
- `AppColumnChart` — cột dọc chung một đường gốc, nhóm 2 cột khi có 2 chuỗi; `emphasized` làm nổi
  một cột và đưa các cột khác về màu xám.
- `AppAreaChart` — một chuỗi theo thời gian: đường 2px trên nền nhạt, nhãn giá trị cuối, crosshair.
- `AppStatTile` — một con số tiêu đề kèm nhãn và dòng ngữ cảnh; `attention` dùng màu đỏ kèm icon;
  `delta` hiện mức tăng/giảm so với kỳ trước (mũi tên + chữ), `chart` đặt một hình nhỏ ở đáy ô.
- `AppDonut` — vòng tỉ lệ phần-trên-tổng, con số chính ở giữa, chú giải ghi giá trị và % bằng chữ;
  chú giải nằm cạnh vòng khi khung đủ rộng, xuống dưới khi khung hẹp (container query).
- `AppSparkline` — đường xu hướng trang trí trong `AppStatTile`; con số và dòng ngữ cảnh mang nghĩa.
- `AppStackBar` — thanh mảnh phần-trên-tổng cho `AppStatTile`, kèm chú giải chữ.
- `AppMeter` — một tỉ lệ so với mức trần (thanh trên rãnh nhạt cùng tông).
- `chartScale.ts` — tông màu được phép và cách làm tròn trục (1, 2, 5 × 10ⁿ).

Mọi cột/thanh/điểm đều focus được bằng bàn phím, tooltip hiện khi rê chuột hoặc focus.
