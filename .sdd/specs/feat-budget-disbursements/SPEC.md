# SPEC: feat-budget-disbursements

> UC35 — Ghi nhận giải ngân. Người dùng duyệt các quyết định (2026-10-10).

## Vấn đề
UC26 tạo `eventBudgets` khi ICPDP duyệt đề xuất sự kiện có kinh phí, nhưng chưa có chỗ ghi tiền đã
chuyển cho CLB. UC35 cho officer ghi mọi dòng tiền của một ngân sách đã duyệt — tạm ứng trước sự kiện,
cấp bù sau đối soát, tiền CLB hoàn trả — và luôn biết số còn được chuyển. Chỉ theo dõi, không hạch toán
và không thực hiện thanh toán (FR-UC35-06).

## Quyết định
- Màn `/workspace/budgets`: danh sách ngân sách (lọc theo trạng thái), chi tiết gồm các dòng duyệt, các
  dòng tiền đã ghi và đúng một loại dòng tiền được phép ghi lúc đó.
- **Tạm ứng** (`Advance`): số tiền mặc định = phần còn lại có thể tạm ứng, ngày mặc định hôm nay, mã
  tham chiếu và ghi chú không bắt buộc. Tổng `Advance + TopUp` không vượt `approvedTotal` (BR23, E1).
  Lần đầu `Approved → Disbursed` (FR-02), các lần sau giữ `Disbursed` (A1).
- **Hạn quyết toán** (BR57, hằng số `SETTLEMENT_DUE_DAYS = 14`): `settlementDueAt = endAt sự kiện +
  14 ngày`, đặt ở lần tạm ứng đầu, gửi kèm thông báo (FR-03).
- **Cấp bù** (`TopUp`, A2): chỉ khi `Reconciled` và `settlementBalance > 0`; số tiền phải đúng bằng
  chênh lệch (E2) → `Closed`.
- **CLB hoàn trả** (`Refund`, A3): chỉ khi `Recovery Pending`; không vượt phần còn phải hoàn (E2); hoàn
  đủ `recoveryAmount` → `Closed`, chưa đủ thì hiển thị phần còn lại.
- `Reconciled` / `Recovery Pending` do UC37 (chưa làm) tạo ra; giao diện chỉ hiện nút tương ứng khi ngân
  sách ở đúng trạng thái.
- Không tạm ứng khi sự kiện đã `Cancelled` / `Rejected` / `Expired`.
- Mỗi dòng tiền: một bản ghi `budgetDisbursements`, cập nhật `eventBudgets`, audit `EventBudget`
  (`BUDGET_ADVANCE_RECORDED` / `BUDGET_TOPUP_RECORDED` / `BUDGET_REFUND_RECORDED`) và thông báo cho ban
  điều hành đương nhiệm của CLB — trong một transaction.
- Chỉ `ICPDP_OFFICER`. Không đổi schema.

## Hành vi
- `GET /admin/budgets` → danh sách tóm tắt, mới trước.
- `GET /admin/budgets/:id` → chi tiết + `flows` + `allowed { kind, max, exact }` (hoặc không có).
- `POST /admin/budgets/:id/flows` `{ kind, amount, disbursedAt?, paymentReference?, note? }`:
  số nguyên VND > 0, ngày không ở tương lai; sai loại so với trạng thái → 409; vượt giới hạn → 400.

## Tiêu chí nghiệm thu
- [x] Không phải ICPDP → 403.
- [x] Tạm ứng đầu chuyển `Disbursed`, đặt hạn quyết toán = kết thúc + 14 ngày; tạm ứng lần hai cộng dồn.
- [x] Tạm ứng vượt số duyệt → 400; sự kiện đã huỷ → 409.
- [x] Cấp bù khác chênh lệch → 400; đúng chênh lệch → `Closed`.
- [x] Hoàn trả vượt phần còn lại → 400; hoàn đủ → `Closed`, hoàn một phần giữ `Recovery Pending`.
- [x] Mỗi dòng tiền ghi audit và thông báo cho ban điều hành CLB.
- [ ] Kiểm tra trực quan (desktop/mobile, `en`/`vi`, sáng/tối).

## Ngoài phạm vi
UC36 (CLB ghi khoản chi, nộp quyết toán), UC37 (đối soát), văn bản điều chỉnh số duyệt (BR23), hạch toán.

## Changelog
- v1.0.0 (2026-10-10) — được người dùng duyệt.
