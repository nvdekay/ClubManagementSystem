# SPEC: feat-sponsored-item-payments

## Vấn đề

Luồng cũ yêu cầu giải ngân trước khi ghi chi phí, dùng link chứng từ và đối soát toàn ngân sách. Luồng mới quyết định tài trợ, xét ảnh hóa đơn và thanh toán một lần theo từng hạng mục.

## Hành vi

- UC26 yêu cầu quyết định rõ từng dòng: NOT_SPONSORED, BEFORE_EVENT, AFTER_EVENT; trả trước/trả sau luôn duyệt toàn bộ số tiền xin, không được sửa tiền tại bước duyệt; không tài trợ duyệt 0 và có lý do. Lưu trần, lý do và phiên bản quyết định.
- Việc thanh toán diễn ra ngoài hệ thống; CLB không nhận tiền trực tiếp từ nhà trường mà qua một trong ba kênh giải ngân theo hạng mục (`paymentChannel`), với ngưỡng `5.000.000 VNĐ` tính theo trần duyệt (`approvedAmount`):
  - **`BEFORE_EVENT` (`VIA_OFFICER_ADVANCE`)**: Trường chuyển tiền về tài khoản cán bộ ICPDP phụ trách mà không cần hóa đơn trước, cán bộ chuyển cho CLB (`AwaitingAdvance` → ICPDP `recordAdvance` → `AdvanceSent` → CLB `confirmAdvanceReceived` → `Draft`, ghi nhận giải ngân ứng bằng `approvedAmount`). Sau sự kiện (từ `eventEndAt` đến `eventEndAt + 14 ngày`), CLB vẫn bắt buộc nộp đầy đủ hóa đơn/chứng từ đối soát (`Submitted`). ICPDP đối soát (`return` trong hạn hoặc `review` nhập `validAmount`):
    - Nếu `payable === advanceAmount` → `Reconciled` (khớp đủ).
    - Nếu `payable < advanceAmount` (kể cả khi `validAmount = 0`, hoàn 100%) → chuyển **`RefundPending`** với `refundAmount = advanceAmount - payable`. STK ngân hàng của nhà trường được ICPDP cấu hình tại `/workspace/policy` (`policyVersions.schoolRefundAccount`) và **chỉ được trả về qua endpoint riêng khi CLB chủ động bấm "Thực hiện hoàn trả"** cho hạng mục ở trạng thái `RefundPending`/`RefundSubmitted`. CLB chuyển khoản ngoài hệ thống, tải lên 1–5 tệp biên lai hoàn trả (JPG/PNG/PDF) và gửi (`submitRefund` → `RefundSubmitted`); ICPDP kiểm tra/tải biên lai rồi xác nhận đã hoàn đủ (`confirmRefund` → `Reconciled`, cập nhật `refundedTotal`) hoặc trả lại biên lai (`returnRefund` → `RefundPending`). Ngân sách chỉ đóng `Closed` sau khi mọi khoản hoàn trả đã được ICPDP xác nhận.
  - **`AFTER_EVENT` dưới `5.000.000 VNĐ`**: Mặc định theo kênh CLB tự chi trước (`VIA_OFFICER_REIMBURSE`), nhưng khi còn `Draft`/`Returned` CLB có thể chọn chuyển sang lập hợp đồng với nhà cung cấp (`DIRECT_VENDOR`). Nếu tự chi trước: CLB nộp chứng từ sau sự kiện → ICPDP đối soát (`Accepted`) → trường chuyển về tài khoản cán bộ ICPDP rồi cán bộ chuyển cho CLB → CLB bấm xác nhận đã nhận tiền (`pay`) → `Paid`.
  - **`AFTER_EVENT` từ `5.000.000 VNĐ` trở lên** *(bắt buộc)* hoặc **`< 5.000.000 VNĐ` chọn lập hợp đồng (`DIRECT_VENDOR`)**: CLB không tự chi trước mà lập hợp đồng với nhà cung cấp, điền bắt buộc thông tin chuyển khoản nhà cung cấp (`vendorBankInfo`: tên nhà cung cấp, chủ tài khoản, số tài khoản, tên ngân hàng, chi nhánh/nội dung chuyển khoản) cùng chứng từ hợp đồng/hóa đơn gửi ICPDP. ICPDP kiểm tra & duyệt (`Accepted`) → gửi hồ sơ lên nhà trường để nhà trường chuyển trực tiếp cho nhà cung cấp → chính cán bộ ICPDP xác nhận hoàn tất thanh toán (`confirmVendorPaid`) → `Paid` (CLB không bấm bước này).
- Bộ chứng từ nằm trong trang Khoản chi và quyết toán của CLB (`/club/:clubId/budgets`); ICPDP đối soát/giải ngân ở Giải ngân kinh phí (`/workspace/budgets/:id`). Tối đa 5 tệp mỗi hạng mục, hỗ trợ ảnh JPG/PNG (tối đa 5 MiB/tệp) và PDF hợp đồng/hóa đơn điện tử (tối đa 10 MiB/tệp), kiểm tra magic bytes, chống trùng SHA-256 trên toàn ngân sách.
- Tệp lưu riêng tư qua Cloudinary; truy cập xem trực tiếp (`inline=true`) và tải về máy (`download=1`, `attachment=true`) đều qua kiểm tra quyền CLB/ICPDP. Phía frontend cho phép cán bộ ICPDP tải/lưu các ảnh chứng từ, hóa đơn, hợp đồng PDF mà CLB tải lên.
- Cửa sổ nộp chứng từ: sau sự kiện (`eventEndAt` đến `eventEndAt + 14 ngày`); CLB được lưu nháp và tải sẵn chứng từ khi ở `Draft`/`Returned` trước hạn. Hồ sơ `Submitted` đúng hạn tiếp tục được đối soát/thanh toán sau hạn.
- Dữ liệu cũ giữ lịch sử, không chuyển tạm ứng legacy thành thanh toán mới. Hủy/đổi lịch có tài chính chưa có chính sách mới: không tự gia hạn hoặc ghi lại thanh toán; bảo toàn hồ sơ.

## Tiêu chí nghiệm thu

- [x] Duyệt bị chặn nếu thiếu quyết định tài trợ hoặc trần/lý do không hợp lệ.
- [x] `BEFORE_EVENT` khởi tạo `AwaitingAdvance` (`VIA_OFFICER_ADVANCE`), cho ICPDP ghi đã chuyển ứng và CLB xác nhận đã nhận ứng mà không cần hóa đơn trước, sau đó bắt buộc nộp chứng từ sau sự kiện và ghi nhận `reconciliationDelta` khi đối soát (`Reconciled`/`Rejected`).
- [x] `AFTER_EVENT < 5.000.000 VNĐ` cho phép CLB chọn giữa tự chi trước (`VIA_OFFICER_REIMBURSE`, CLB xác nhận nhận tiền từ cán bộ ICPDP) và lập hợp đồng nhà cung cấp (`DIRECT_VENDOR`).
- [x] `AFTER_EVENT >= 5.000.000 VNĐ` khóa cứng `DIRECT_VENDOR`, bắt buộc thông tin chuyển khoản nhà cung cấp trước khi nộp, và chỉ cán bộ ICPDP được xác nhận nhà trường đã thanh toán cho nhà cung cấp (`confirmVendorPaid`).
- [x] Upload nhiều tệp (JPG/PNG tối đa 5 MiB, PDF tối đa 10 MiB), tổng tối đa 5 tệp/hạng mục, kiểm tra magic bytes và chống trùng SHA-256.
- [x] Tệp riêng tư không đọc/tải được bằng quyền CLB khác; cán bộ ICPDP có thể xem và lưu/tải xuống từng tệp chứng từ từ giao diện.
- [x] Trần 10 triệu, chi hợp lệ 8 triệu chỉ duyệt 8 triệu; chi 12 triệu duyệt tối đa 10 triệu.
- [x] Không sửa bộ đã khóa, không trả hai lần; audit và thông báo cùng giao dịch.
- [x] Giao diện có preview ảnh/thẻ PDF, nút lưu chứng từ, tiến độ/lỗi upload, tiếng Việt/Anh, sáng/tối.
- [x] Dữ liệu seed cũ được bảo toàn; `npm run check` đạt.

## Ngoài phạm vi

Chuyển tiền qua ngân hàng, OCR tự đọc giá trị hóa đơn, luồng thu hồi/hoàn trả tiền ứng trên hệ thống, tự quyết định chính sách hoàn trả khi hủy/đổi lịch.

## Changelog

- v1.0.0 (2026-11-14) — người dùng duyệt kế hoạch và yêu cầu triển khai, gồm JPG/PNG 5 MiB/ảnh.
- v1.1.0 (2026-11-14) — chỉnh vị trí theo yêu cầu mới: CLB /club/:clubId/budgets, ICPDP /workspace/budgets/:id; duyệt tài trợ vẫn ở UC26.
- v1.2.0 (2026-11-14) — ICPDP chỉ duyệt tiền (`Accepted` = "Đã duyệt"); việc chuyển tiền do kế toán ngoài hệ thống; CLB xác nhận đã nhận tiền mới sang `Paid`. Bỏ nhập số tiền/ngày/mã tham chiếu.
- v2.0.0 (2026-11-23) — đổi nghiệp vụ sang 3 kênh giải ngân (`VIA_OFFICER_ADVANCE`, `VIA_OFFICER_REIMBURSE`, `DIRECT_VENDOR`), mốc 5.000.000 VNĐ theo trần duyệt, hỗ trợ PDF hợp đồng/hóa đơn điện tử, thông tin chuyển khoản nhà cung cấp, ICPDP xác nhận thanh toán nhà cung cấp và tải lưu chứng từ trên frontend.
- v2.1.0 (2026-11-23) — bổ sung luồng hoàn trả tiền dư tạm ứng `BEFORE_EVENT` về STK nhà trường (kể cả khi hóa đơn hợp lệ = 0), cấu hình STK nhà trường trong `/workspace/policy` (`policyVersions.schoolRefundAccount`), chỉ hiển thị STK khi CLB bấm thực hiện hoàn trả, xác nhận 2 bước kèm biên lai (`RefundPending` → `RefundSubmitted` → `Reconciled`).
