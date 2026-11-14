# SPEC: feat-sponsored-item-payments

## Vấn đề

Luồng cũ yêu cầu giải ngân trước khi ghi chi phí, dùng link chứng từ và đối soát toàn ngân sách. Luồng mới quyết định tài trợ, xét ảnh hóa đơn và thanh toán một lần theo từng hạng mục.

## Hành vi

- UC26 yêu cầu quyết định rõ từng dòng: NOT_SPONSORED, BEFORE_EVENT, AFTER_EVENT; lưu trần, lý do và phiên bản quyết định.
- Club Leader ghi chi ngay sau duyệt. Bộ chứng từ nằm trong trang Khoản chi và quyết toán của CLB; ICPDP đối soát/thanh toán ở Giải ngân kinh phí; tối đa 5 ảnh JPG/PNG mỗi hạng mục, mỗi ảnh tối đa 5 MiB, cho chọn nhiều ảnh. Kiểm tra nội dung file và số lượng tại server.
- Ảnh lưu riêng tư qua Cloudinary; truy cập qua kiểm tra quyền CLB/ICPDP. Không nhận URL tùy ý cho hồ sơ mới.
- BEFORE_EVENT nộp từ lúc duyệt đến E+14 ngày; AFTER_EVENT từ E đến E+14 ngày. Không hạn bổ sung riêng. Hồ sơ Submitted đúng hạn tiếp tục được xét/thanh toán sau hạn.
- Mỗi hạng mục nộp một bộ đầy đủ có phiên bản. Chỉ sửa nháp hoặc Returned trong hạn; khóa Submitted/Accepted/Paid.
- ICPDP chốt payable=min(chi hợp lệ, trần hạng mục); thanh toán toàn bộ payable một lần, chống thao tác đồng thời và thanh toán trùng.
- Thông báo kết quả về dashboard CLB với liên kết ngân sách; dùng các trang tài chính hiện có.
- Dữ liệu cũ giữ lịch sử, không chuyển tạm ứng cũ thành thanh toán mới. Hủy/đổi lịch có tài chính chưa có chính sách mới: không tự gia hạn hoặc ghi lại thanh toán; bảo toàn hồ sơ.

## Tiêu chí nghiệm thu

- [x] Duyệt bị chặn nếu thiếu quyết định tài trợ hoặc trần/lý do không hợp lệ.
- [x] Ghi chi ngay sau duyệt, đúng quyền và phạm vi CLB.
- [x] Upload nhiều ảnh, tổng tối đa 5 ảnh mỗi hạng mục, kể cả request đồng thời; loại file sai, quá 5 MiB.
- [x] Ảnh riêng tư không đọc được bằng quyền CLB khác.
- [x] Cửa sổ nộp và sửa đúng hai nhóm, kiểm tra cả thời điểm biên.
- [x] Trần 10 triệu, chi hợp lệ 8 triệu chỉ trả 8 triệu một lần; chi 12 triệu trả tối đa 10 triệu.
- [x] Không sửa bộ đã khóa, không trả hai lần; audit và thông báo cùng giao dịch.
- [x] Giao diện có preview, tiến độ/lỗi upload, đếm ảnh, tiếng Việt/Anh, sáng/tối.
- [x] Dữ liệu seed cũ được bảo toàn; npm run check đạt.

## Ngoài phạm vi

Chuyển tiền qua ngân hàng, OCR tự đọc giá trị hóa đơn, tự quyết định chính sách hoàn trả khi hủy/đổi lịch.

## Changelog

- v1.0.0 (2026-11-14) — người dùng duyệt kế hoạch và yêu cầu triển khai, gồm JPG/PNG 5 MiB/ảnh.

- v1.1.0 (2026-11-14) — chỉnh vị trí theo yêu cầu mới: CLB /club/:clubId/budgets, ICPDP /workspace/budgets/:id; duyệt tài trợ vẫn ở UC26.
