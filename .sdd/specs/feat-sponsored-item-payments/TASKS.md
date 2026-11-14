# Công việc

- [x] Rà code hiện tại và ghi SPEC theo kế hoạch được duyệt.
- [x] Bổ sung quyết định tài trợ từng dòng, schema và hợp đồng API.
- [x] Triển khai khoản chi/bộ ảnh, cửa sổ nộp và phiên bản hồ sơ.
- [x] Triển khai đối soát và thanh toán một lần, thông báo/audit.
- [x] Upload ảnh riêng tư, kiểm tra quyền và giới hạn đồng thời.
- [x] Tích hợp UI vào thông tin đề xuất và trang thẩm định.
- [x] Unit/integration test, kiểm tra UI và npm run check.
- [x] Đồng bộ tài liệu và báo cáo kết quả.

## Kết quả kiểm tra

- npm run check: constitution, lint, typecheck đạt; 588 test server + 27 test client đạt. Integration test thực sự chạy với MongoDB replica set.
- Sau chỉnh UI cuối: lint/typecheck client đạt; test tích hợp duyệt đề xuất (4 test) đạt.
- Playwright dựng component thật với API mô phỏng: tiếng Việt, desktop 1100px/mobile 390px, sáng/tối không tràn ngang; chọn 6 ảnh bị chặn trước khi upload; không có lỗi trang.
- Test quyền ảnh: chưa đăng nhập, CLB không có quyền, officer bị khóa/thiếu role và ảnh sai hạng mục đều bị chặn.
- Test giao dịch: upload đồng thời chỉ giữ tối đa 5 ảnh, gửi không cần ứng tiền, khóa hồ sơ, chỉ ghi nhận một thanh toán khi có hai request trùng.
- Không sửa seed hoặc tự chuyển dữ liệu ứng tiền cũ.

## Giới hạn xác minh

Chưa thực hiện upload thật lên Cloudinary trong lượt này. Adapter dùng kho riêng tư hiện có và URL có thời hạn; test quyền dùng storage giả. Thanh toán là ghi nhận giao dịch đã chuyển, không gọi ngân hàng.

## Điều chỉnh vị trí thao tác

- [x] Chuyển ghi chi/ảnh của CLB sang /club/:clubId/budgets và đối soát/thanh toán của ICPDP sang /workspace/budgets/:id.
- [x] Giữ quyết định tài trợ ở duyệt sự kiện; thay khối chứng từ trong đề xuất bằng liên kết tài chính.
- [x] Giữ giao diện cũ cho ngân sách legacy; tổng tiền hồ sơ mới tính từ các hạng mục, không hiển thị form tạm ứng cũ.
- [x] Thông báo chọn đúng ngân sách; cập nhật cache tổng tiền sau thao tác.
- [x] Kiểm tra trực tiếp hai trang bằng tài khoản CLB/ICPDP; thêm 4 test liên kết thông báo.
