# SPEC: feat-event-finance

## Vấn đề
UC35 đã ghi dòng tiền; cần khoản chi/chứng từ, quyết toán và đối soát để xác định cấp bù hoặc hoàn trả.

## Hành vi
- `club.expense.record` đọc ngân sách cùng CLB; ghi/sửa khoản chi khi Disbursed/Reconciliation Pending.
- Tiền là số nguyên VND dương; ngày không tương lai. Ngoài hạng mục/vượt hạng mục vẫn ghi và gắn cờ.
- Chứng từ HTTPS thuộc đúng khoản chi; loại INVOICE/RECEIPT/PROOF_OF_PAYMENT. BR25 và số ngày BR58 đang chờ câu trả lời người dùng.
- Nộp quyết toán khi sự kiện kết thúc (Completed/Report Submitted/Closed) hoặc Cancelled; nộp trễ vẫn nhận.
- Submit khoá khoản chi/chứng từ, lưu snapshot bất biến trong audit và tạo task. Return cho bổ sung, nộp lại tạo task mới.
- ICPDP claim, accept/reject từng khoản kèm lý do; thiếu chứng từ luôn loại. Chi hợp lệ có trần số duyệt.
- Chênh lệch = chi hợp lệ − tổng Advance: 0 đóng; dương Reconciled chờ UC35 TopUp; âm Recovery Pending chờ UC35 Refund.
- Quá hạn chưa nộp cho đối soát A2; nộp cạnh tranh đối soát chỉ một bên commit. Tất toán chặn sửa.
- API dưới `/clubs/:clubId/budgets` và `/admin/budgets/:id/reconciliation`.

## Tiêu chí nghiệm thu
- [ ] Quyền/ownership/trạng thái tại commit, không chứng từ mồ côi.
- [ ] Gắn cờ, tính tổng tiền chính xác và snapshot khoá từng lần nộp.
- [ ] Claim/return/finalize có audit/notification/task nguyên tử.
- [ ] Đối soát 0/dương/âm, bổ sung, A2 và UC35 cấp bù/hoàn một phần/hoàn đủ.
- [ ] Test cạnh tranh và UI en/vi, sáng/tối, mobile/desktop.

## Ngoài phạm vi
Hạch toán, thanh toán thật, điều chỉnh số duyệt và UC38/UC39.

## Changelog
- v1.0.0 (2026-10-11) — triển khai theo plan Wave 4; BR25/BR58 chờ chốt.
