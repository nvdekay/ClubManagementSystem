# SPEC: feat-budget-reconciliation

## Vấn đề
CLB ghi khoản chi và nộp quyết toán (UC36, do dev phía CLB làm) nhưng ICPDP chưa đối soát được.
UC37 cho officer thấy tách bạch số đã duyệt, đã tạm ứng, đã chi, có/thiếu chứng từ; chấp nhận hoặc
loại từng khoản; chốt chi hợp lệ và chênh lệch tất toán, rồi chuyển ngân sách sang trạng thái kế tiếp
để UC35 cấp bù hoặc ghi tiền hoàn trả.

## Hành vi
- Chỉ `ICPDP_OFFICER`; API dưới `/admin/reconciliations/:budgetId`; giao diện là phần "Đối soát" trong
  trang chi tiết ngân sách (`/workspace/budgets/:id`), cùng bộ lọc mới "Cần đối soát".
- `GET` — tổng: **đã duyệt**, **đã tạm ứng** (tổng `Advance`), **khoản chi đã ghi**, **có chứng từ**,
  **thiếu chứng từ**, **chưa chi** (tạm ứng − đã ghi); danh sách khoản chi kèm chứng từ (link ngoài), cờ
  ngoài hạng mục / vượt phần còn lại, kết quả xét; `mode` khi đối soát được; yêu cầu bổ sung gần nhất;
  kết quả (`financialReconciliations`); cờ quá hạn hoàn trả và hồ sơ UC40 đã mở.
- Đối soát được khi ngân sách `Settlement Submitted` (`mode = settlement`), hoặc `Disbursed` /
  `Reconciliation Pending` đã quá `settlementDueAt` (A2, `mode = overdue`).
- `POST` (chốt đối soát) với `reviews: [{ expenseId, outcome: Accepted|Rejected, reason? }]`:
  - Khoản thiếu chứng từ luôn bị loại ("Thiếu chứng từ"); khoản bị gắn cờ bắt buộc có quyết định + lý
    do; khoản loại bắt buộc lý do; khoản còn lại mặc định chấp nhận.
  - Chi hợp lệ = tổng khoản chấp nhận, trần là số duyệt; chênh lệch = chi hợp lệ − đã tạm ứng.
  - Bằng 0 → `Closed` (đóng ngay, `closedAt`); dương → `Reconciled`, chờ cấp bù ở UC35 A2; âm →
    `Recovery Pending` với `recoveryAmount` và `recoveryDueAt` = nay + 14 ngày (hằng số tài liệu chính
    sách, như BR57). A2 đánh dấu `isSettlementLate` và `isOverdueSettlement`.
  - E1: đã tạm ứng > đã duyệt → 409.
  - Ghi `expenses.reviewOutcome/reviewReason`, upsert `financialReconciliations` (outcome `Reconciled` |
    `Recovery Pending`), cập nhật `eventBudgets` (`acceptedTotal`, `settlementBalance`, …), audit
    `BUDGET_RECONCILED`, thông báo ban chủ nhiệm + người nộp đề xuất — một transaction.
- `POST …/evidence-request` (A1) — chỉ từ `Settlement Submitted` → `Reconciliation Pending`, bắt buộc
  nội dung; audit `BUDGET_EVIDENCE_REQUESTED` (nội dung ở `reason`), thông báo CLB.
- `POST …/case` (E2) — khi `Recovery Pending` đã quá `recoveryDueAt`: mở hồ sơ UC40
  `FINANCIAL_EXCEPTION` (`originRefId` = ngân sách) một lần duy nhất.
- UC35 khi cấp bù/hoàn đủ đóng ngân sách thì ghi `financialReconciliations.closedBy/closedAt` (BR26).

## Hợp đồng dữ liệu cho phía CLB (UC36 — dev phía CLB phải tuân theo)
1. `expenses`: `clubId`, `eventBudgetId`, `eventId`, `category` (trùng tên hạng mục duyệt nếu thuộc
   hạng mục), `amount` (Decimal128, VND), `spentAt`, `description?`, `isOutOfCategory` (BR24),
   `isOverRemaining` (E1), `hasEvidence` (true khi có ≥ 1 chứng từ), `recordedBy`, `createdAt`.
   Không sửa khoản chi khi ngân sách đã `Settlement Submitted` (bộ khoản chi bị khoá).
2. `financialEvidences`: `expenseId`, `type` (`INVOICE` | `RECEIPT` | `PROOF_OF_PAYMENT`),
   `externalLink`, `uploadedBy`, `uploadedAt`.
3. Nộp quyết toán: `eventBudgets.state` `Disbursed` | `Reconciliation Pending` → `Settlement Submitted`,
   `settlementSubmittedAt`, `isSettlementLate = settlementSubmittedAt > settlementDueAt` (BR57).
   Nộp lại sau A1 cũng theo đúng bước này. Không có approval task riêng — hàng đợi của ICPDP lấy theo
   trạng thái ngân sách.
4. CLB đọc kết quả ở `financialReconciliations` và `expenses.reviewOutcome/reviewReason`.

## Tiêu chí nghiệm thu
- [x] Tổng số tách bạch đúng; khoản thiếu chứng từ luôn bị loại; khoản gắn cờ/bị loại cần lý do.
- [x] Chênh lệch 0 → `Closed`; dương → `Reconciled` rồi UC35 cấp bù đúng số → `Closed` (+`closedAt`).
- [x] Quá hạn quyết toán → đối soát A2 thành `Recovery Pending`, đánh dấu trễ.
- [x] Yêu cầu bổ sung chứng từ → `Reconciliation Pending`; quá hạn hoàn trả → mở hồ sơ một lần.
- [ ] Phần đối soát chạy trên desktop/mobile, `en`/`vi`, sáng/tối — typecheck/lint/build đã xanh; còn
  nghiệm thu trực quan thủ công.

## Ngoài phạm vi
UC36 (form ghi khoản chi/nộp quyết toán phía CLB), văn bản điều chỉnh ngân sách (BR23), hạch toán kế
toán, nhắc hạn tự động.

## Changelog
- v0.1.0 (2026-10-10) — backend, API, UI, i18n, seed demo và test tự động; còn visual QA.
- v0.1.1 (2026-10-11) — **Thay thế** khi merge `main`: UC36/UC37 dùng bản của nhóm (`.sdd/specs/feat-event-finance/`, `/admin/budgets/:id/reconciliation`). Code của SPEC này đã gỡ khỏi nhánh hiện hành (giữ bộ lọc "Cần đối soát" ở `BudgetsPage`); bản gốc nằm ở commit `6ff049d`.
