# SPEC: feat-policy-resolution

## Vấn đề
UC01 và UC07 phải dùng chính sách có hiệu lực tại thời điểm thao tác. Truy vấn chỉ lấy phiên bản mới nhất hoặc giá trị từ `.env` có thể áp dụng nhầm một thay đổi trong tương lai hay làm sai quyết định lịch sử.

## Hành vi
- Đọc `policyVersions` theo `effectiveFrom <= thời điểm yêu cầu`, ưu tiên ngày hiệu lực mới nhất. Nếu hai bản cùng ngày hiệu lực, dùng `createdAt` rồi `_id` để kết quả xác định.
- Bản ghi trả về giữ các giá trị BR42 của DBML; người gọi nhận một snapshot và dùng nó trong suốt một quyết định. Không sửa bản ghi khi đọc.
- Khi chưa có phiên bản hiệu lực, use case yêu cầu chính sách trả lỗi `unavailable`. Riêng UC01 tiếp tục dùng `ALLOWED_DOMAIN` đã cấu hình để officer đầu tiên đăng nhập và cấu hình chính sách; khi có phiên bản, domain trong phiên bản đó là nguồn kiểm tra.
- Không tự đặt giá trị ban đầu cho tám trường UC04 còn thiếu quyết định khởi tạo. Người dùng điền credentials và domain trong `.env` sau như đã thống nhất.

## Tiêu chí nghiệm thu
- [ ] Không chọn phiên bản có `effectiveFrom` trong tương lai.
- [ ] Truy vấn lịch sử tại thời điểm D chọn đúng bản đã có hiệu lực ở D; cùng ngày hiệu lực có thứ tự xác định.
- [ ] Khi không có phiên bản hiệu lực, UC07 nhận lỗi rõ ràng và không ghi hồ sơ; UC01 vẫn dùng domain bootstrap từ cấu hình.
- [ ] Adapter Mongo đọc đúng DBML `policyVersions` và không đổi schema/index; integration test dùng Mongo thật khi môi trường cho phép.

## Ngoài phạm vi
Màn hình và thao tác tạo phiên bản UC04, seed tám giá trị chính sách chưa có trong SRS và hồ sơ UC07. Các phần đó có task riêng trong backlog; UC05 đã rút khỏi baseline.

## Changelog
- v0.1.0 (2026-10-03) — tách bộ phân giải theo ngày hiệu lực để chuẩn bị UC07.
