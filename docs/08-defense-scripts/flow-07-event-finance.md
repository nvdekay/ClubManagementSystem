# Flow 7 — Kinh phí, giải ngân 3 kênh và hoàn trả tạm ứng

**Người phụ trách:** Người 5. **UC chính:** UC35–UC37. **UC bổ trợ:** UC04 (cấu hình STK hoàn trả nhà trường), UC55 ở phần hỏi đáp.
**Thời lượng lời thoại và demo gợi ý:** 150 giây; Q&A nằm ngoài thời lượng này.
Số flow theo [bản phân công bảo vệ](../UC_FLOW_GROUPS.md), không phải số F trong SRS.

## 1. Nghiệp vụ chính

Flow này nhận **ngân sách sự kiện đã được ICPDP duyệt ở UC26** — trong đó mỗi hạng mục ngân sách đã được gán quyết định tài trợ (`fundingDecision`) và duyệt **100% hạn mức đề nghị** nếu được tài trợ — sau đó vận hành theo **3 kênh giải ngân** trên từng hạng mục `sponsoredItems`. App ghi nhận trạng thái, chứng từ và xác nhận hai phía; dòng tiền thực tế diễn ra bên ngoài hệ thống.

| Quyết định UC26 (`fundingDecision`) | Kênh giải ngân (`paymentChannel`) | Luồng trạng thái hạng mục (`InvoiceStatus`) |
|---|---|---|
| `NOT_SPONSORED` | Không có (CLB tự túc) | Không giải ngân, không cần nộp hoá đơn |
| `BEFORE_EVENT` (Tài trợ trả trước) | `VIA_OFFICER_ADVANCE` | `AwaitingAdvance` → ICPDP ghi tạm ứng (`AdvanceSent`) → CLB xác nhận đã nhận (`Draft`) → sau sự kiện nộp hoá đơn (`Submitted`) → ICPDP chốt `validAmount`: đủ → `Reconciled`; thiếu (kể cả `validAmount = 0`) → `RefundPending` → CLB chuyển khoản về STK trường & nộp biên lai (`RefundSubmitted`) → ICPDP xác nhận (`Reconciled`) |
| `AFTER_EVENT` (`< 5.000.000 đ`, mặc định) | `VIA_OFFICER_REIMBURSE` (CLB tự chi trước, hoàn ứng qua cán bộ; có thể chọn `DIRECT_VENDOR`) | `Draft` → sau sự kiện nộp hoá đơn (`Submitted`) → ICPDP chốt `validAmount`: `payable > 0` → `Accepted` → CLB xác nhận đã nhận tiền (`Paid`); `payable = 0` → `Rejected` |
| `AFTER_EVENT` (`≥ 5.000.000 đ`, bắt buộc) | `DIRECT_VENDOR` (Trường trả thẳng nhà cung cấp, bắt buộc nhập `vendorBankInfo`) | `Draft` → nhập `vendorBankInfo` + hợp đồng/hoá đơn → sau sự kiện nộp (`Submitted`) → ICPDP chốt `Accepted` → trường chuyển khoản & ICPDP xác nhận đã trả NCC (`Paid`) |

**Công thức cần nhớ:**
- `payable = min(validAmount, approvedAmount)` với `0 ≤ validAmount ≤ amount` (không cấp vượt trần được duyệt).
- Riêng `BEFORE_EVENT`: `reconciliationDelta = payable − advanceAmount`.
  - `delta ≥ 0` → `Reconciled` ngay (không cấp bù vượt trần tạm ứng).
  - `delta < 0` → `refundAmount = advanceAmount − payable` → `RefundPending` (nếu `validAmount = 0`, CLB phải hoàn trả **100% toàn bộ tiền tạm ứng**).
- Khi **mọi hạng mục được tài trợ** của sự kiện đều đạt trạng thái kết thúc (`Paid`, `Reconciled`, `Rejected`, `Expired` hoặc quá hạn `E + 14 ngày`), `EventBudget.state` tự động chuyển `Approved → Closed`.

| Ví dụ minh hoạ trên 1 sự kiện HEBE Club (đã duyệt 3 loại) | Kết quả xử lý |
|---|---|
| Hạng mục A (`BEFORE_EVENT`, tạm ứng 2.500.000 đ), chi hợp lệ 2.000.000 đ | `delta = −500.000 đ` → `RefundPending` → CLB mở STK nhà trường, chuyển 500.000 đ & nộp biên lai → `RefundSubmitted` → ICPDP `confirmRefund` → `Reconciled` (nếu `validAmount = 0` thì hoàn đủ 2.500.000 đ theo đúng cùng luồng) |
| Hạng mục B (`AFTER_EVENT`, 3.000.000 đ `< 5M`, `VIA_OFFICER_REIMBURSE`), hợp lệ 2.800.000 đ | `Accepted` (`payable = 2.800.000 đ`) → cán bộ trao/chuyển tiền → CLB bấm `confirm receipt` (`pay`) → `Paid` |
| Hạng mục C (`AFTER_EVENT`, 6.000.000 đ `≥ 5M`, `DIRECT_VENDOR`), hợp lệ 6.000.000 đ | CLB bắt buộc nhập `vendorBankInfo` + hợp đồng/hoá đơn → `Accepted` → nhà trường chuyển thẳng NCC → ICPDP bấm `confirmVendorPaid` → `Paid` |
| Hạng mục D (`NOT_SPONSORED`) | Hiển thị tham khảo, không phát sinh giao dịch giải ngân |

## 2. Chuẩn bị demo

- Chuẩn bị tài khoản **ICPDP Officer** và **Club Leader** của cùng CLB (ví dụ **HEBE Club**, đã có sự kiện seed đủ cả `NOT_SPONSORED`, `BEFORE_EVENT`, `AFTER_EVENT < 5M` và `AFTER_EVENT ≥ 5M`). Thành viên có chức danh Thủ quỹ nhưng không thuộc role `Club Leader` không có quyền `club.expense.record`.
- Kiểm tra trước trong `/workspace/policy` (UC04) đã cấu hình **Tài khoản ngân hàng hoàn trả của nhà trường (`schoolRefundAccount`)** để nhánh hoàn trả `BEFORE_EVENT` lấy được STK.
- Chuẩn bị 1–2 tệp chứng từ thật: ảnh **JPG/PNG (≤ 5 MiB)** hoặc **PDF (≤ 10 MiB)** (lưu ý hai tệp khác nhau vì server chặn trùng mã băm SHA-256 trên toàn ngân sách).
- Đường dẫn màn hình:
  - ICPDP: `/workspace/policy` (cấu hình STK hoàn trả), `/workspace/budgets` (có bộ lọc `Awaiting advance`, `Awaiting review`, `Awaiting vendor pay`, `Awaiting refund confirm`) → `/workspace/budgets/:id`.
  - Club Leader: `/club/:clubId/budgets`.
- Mốc thời gian: CLB chỉ nộp bộ chứng từ **sau khi sự kiện kết thúc (`now ≥ eventEndAt`)** và trong **14 ngày (`eventEndAt + 14d`)**; trước hạn có thể lưu nháp và ICPDP có thể trả sửa (`Returned`).

Các route được đối chiếu tại [router](../../client/src/main.tsx) và [sponsored-item-routes.ts](../../server/src/interface/http/sponsored-item-routes.ts); giao diện hạng mục tài trợ dùng chung [SponsoredItems.tsx](../../client/src/components/custom/SponsoredItems.tsx).

## 3. Kịch bản thuyết trình — khoảng 150 giây

### 0–25 giây: nhận ngân sách 3 kênh từ UC26

“Em tiếp nhận ngân sách sự kiện đã được duyệt ở UC26. Thay vì gom chung một cục tạm ứng như cách cũ, hệ thống tách rõ theo từng hạng mục và **3 kênh giải ngân**: tài trợ trả trước (`BEFORE_EVENT`) tạm ứng qua cán bộ; tài trợ trả sau dưới 5 triệu mặc định CLB tự chi trước rồi hoàn ứng (`VIA_OFFICER_REIMBURSE`); và từ 5 triệu trở lên bắt buộc chuyển thẳng nhà cung cấp kèm hợp đồng và thông tin tài khoản NCC (`DIRECT_VENDOR`).”

**Thao tác demo:** Mở `/workspace/budgets` phía ICPDP, chỉ bộ lọc tác vụ (`Awaiting advance`, `Awaiting review`, `Awaiting vendor pay`, `Awaiting refund confirm`), vào `/workspace/budgets/:id` của sự kiện mẫu có đủ 3 loại hạng mục.

### 25–65 giây: tạm ứng trước sự kiện và nộp chứng từ ảnh/PDF

“Với hạng mục `BEFORE_EVENT`, ICPDP bấm ghi nhận đã chuyển tạm ứng (`AwaitingAdvance → AdvanceSent`), sau đó Club Leader xác nhận đã nhận tiền để mở khoá bước nhập chứng từ (`Draft`). Sau khi sự kiện kết thúc, trong vòng 14 ngày, CLB nhập số tiền chi thực tế và tải tối đa 5 tệp hoá đơn định dạng **JPG, PNG (≤ 5 MiB) hoặc PDF (≤ 10 MiB)** — hệ thống tự kiểm tra magic bytes và chặn trùng tệp bằng SHA-256 trên toàn ngân sách — rồi nộp lên ICPDP (`Submitted`).”

**Thao tác demo:** Ở ICPDP bấm ghi tạm ứng (hoặc chỉ dòng đã tạm ứng); chuyển sang `/club/:clubId/budgets`, xác nhận nhận tạm ứng, tải 1 tệp hoá đơn PDF/ảnh (nêu ngắn với hạng mục `≥ 5M` cần nhập `vendorBankInfo`) và bấm nộp.

### 65–115 giây: ICPDP thẩm định chỉ đọc và luồng hoàn trả 2 bước

“Phía ICPDP mở chi tiết ngân sách, xem hoặc tải xuống bản gốc hoá đơn ở chế độ **chỉ đọc** — không thể tự xoá hay chỉnh sửa chứng từ của CLB. Nếu thiếu giấy tờ trước hạn, ICPDP trả sửa (`Returned`); khi đủ căn cứ thì chốt `validAmount` kèm lý do. Trong ví dụ này, hạng mục trả trước tạm ứng 2,5 triệu nhưng chỉ hợp lệ 2 triệu nên phát sinh phần dư 500 nghìn và chuyển `RefundPending` — kể cả trường hợp hợp lệ 0 đồng cũng đi cùng luồng để hoàn đủ 2,5 triệu. Lúc này CLB mới được mở xem **số tài khoản ngân hàng của nhà trường** (do ICPDP cấu hình ở Chính sách và ẩn ở mọi nơi khác), chuyển khoản bên ngoài rồi tải biên lai hoàn trả gửi lên (`RefundSubmitted`). ICPDP đối chiếu biên lai: chưa khớp thì trả lại, khớp thì xác nhận để chốt `Reconciled`.”

**Thao tác demo:** Ở `/workspace/budgets/:id` bấm tải/xem tệp, chốt `validAmount` thấp hơn tạm ứng → `RefundPending`; chuyển sang CLB bấm xem STK hoàn trả, tải biên lai và nộp (`RefundSubmitted`); quay lại ICPDP bấm xác nhận hoàn trả → `Reconciled`.

### 115–150 giây: hai kênh sau sự kiện, đóng ngân sách và bàn giao

“Với hai kênh trả sau, khi ICPDP chốt `Accepted`: hạng mục dưới 5 triệu do **Club Leader** xác nhận đã nhận tiền hoàn ứng (`Paid`), còn hạng mục chuyển thẳng nhà cung cấp do **ICPDP** xác nhận đã thanh toán xong (`Paid`). Khi toàn bộ hạng mục tài trợ đều đã kết thúc, ngân sách tự động chuyển `Closed`, cập nhật tổng `disbursedTotal`, `refundedTotal`, `acceptedTotal` và chuyển sang dữ liệu phục vụ báo cáo, đánh giá ở [flow 8](flow-08-reporting-evaluation.md).”

**Thao tác demo:** Chỉ hai thẻ `AFTER_EVENT` đã ở trạng thái `Accepted`/`Paid` và trạng thái `Closed` của ngân sách; bàn giao sang Flow 8.

## 4. Nhánh ngoại lệ cần giải thích

- **Hoàn trả 100% tạm ứng (`validAmount = 0`):** Khi chứng từ hạng mục `BEFORE_EVENT` bị bác hoàn toàn (`validAmount = 0`), hệ thống không chuyển `Rejected` mà tính `refundAmount = advanceAmount` và chuyển `RefundPending` để đi **cùng luồng hoàn trả 2 bước** cho tới khi ICPDP xác nhận thu hồi đủ.
- **Bảo mật tài khoản hoàn trả nhà trường (`schoolRefundAccount`):** Cấu hình trong `/workspace/policy` (UC04), **không bao giờ** trả ra API policy công khai; endpoint `GET /clubs/:clubId/budgets/:id/items/:itemId/refund-account` gọi `canAccessRefundAccount()` và chỉ trả về khi đúng CLB có hạng mục `BEFORE_EVENT` đang ở `RefundPending` hoặc `RefundSubmitted` với `refundAmount > 0`.
- **Trả lại biên lai hoàn trả (`returnRefund`):** Nếu biên lai hoàn trả mờ/sai số tiền, ICPDP trả về `RefundPending` kèm lý do để CLB xoá/tải lại biên lai (tối đa 5 tệp) và gửi lại.
- **Chưa kết thúc sự kiện / quá hạn 14 ngày:** Trước `eventEndAt` chỉ được lưu nháp, chưa nộp được; quá `eventEndAt + 14 ngày` không sửa/nộp/trả sửa được nữa (hạng mục hết hạn `Expired`).
- **Sự kiện đang huỷ hoặc chờ duyệt huỷ:** Repository chặn mọi thao tác tài chính (HTTP `409`) khi sự kiện không ở trạng thái hoạt động hoặc đang có task `EVENT_CANCELLATION` mở.
- **Trùng tệp hoặc xung đột phiên bản (`revision`):** Tệp trùng SHA-256 trong bất kỳ `images` hay `refundProofs` nào của cùng ngân sách đều bị từ chối (`409`); thao tác gửi `revision` cũ không khớp `__v` trong Mongo transaction bị trả `409` yêu cầu tải lại.

## 5. Câu hỏi bảo vệ và câu trả lời

### 1. Vì sao tách 3 kênh giải ngân và đặt ngưỡng 5.000.000 VND?

“Thực tế vận hành CLB có ba tình huống khác nhau: khoản cần ứng trước để triển khai sự kiện (`BEFORE_EVENT`), khoản nhỏ dưới 5 triệu CLB tự ứng trước rồi hoàn qua cán bộ (`VIA_OFFICER_REIMBURSE`), và khoản lớn từ 5 triệu trở lên rủi ro cao nên nhà trường yêu cầu hợp đồng và chuyển thẳng nhà cung cấp (`DIRECT_VENDOR`). Server ép cứng ngưỡng `DIRECT_VENDOR_THRESHOLD_VND = 5_000_000` ở tầng domain.”

### 2. Tại sao tài khoản ngân hàng của nhà trường không hiển thị công khai trên trang chính sách hay chi tiết sự kiện?

“Để tránh CLB chuyển khoản nhầm khi chưa có quyết định đối soát hoặc lộ thông tin tài khoản không cần thiết. `schoolRefundAccount` chỉ ICPDP xem/sửa ở UC04; phía CLB chỉ nhận được qua endpoint riêng `.../refund-account` khi hàm domain `canAccessRefundAccount()` xác nhận đúng hạng mục `BEFORE_EVENT` đang ở `RefundPending` hoặc `RefundSubmitted` và `refundAmount > 0`.”

### 3. Bấm ghi tạm ứng hay xác nhận thanh toán có tự động chuyển tiền ngân hàng không?

“Không ạ. Hệ thống không tích hợp cổng thanh toán hay ngân hàng; dòng tiền thật diễn ra bên ngoài. Để giảm sai lệch, mọi kênh đều có đối chứng hai phía: tạm ứng và hoàn ứng có bước xác nhận từ CLB, hoàn trả phần dư có biên lai + xác nhận của ICPDP, trả NCC có thông tin tài khoản NCC + chứng từ + xác nhận của ICPDP.”

### 4. Nếu hạng mục trả trước có hoá đơn hợp lệ bằng 0 hoặc thấp hơn tiền tạm ứng thì xử lý thế nào?

“Hệ thống tính `payable = min(validAmount, approvedAmount)` và `reconciliationDelta = payable − advanceAmount`. Nếu âm (kể cả `validAmount = 0` nên `refundAmount = 100%` tiền tạm ứng), trạng thái chuyển sang `RefundPending`. CLB tải 1–5 biên lai chuyển khoản về STK nhà trường và gửi `RefundSubmitted`; ICPDP kiểm tra biên lai rồi trả lại (`returnRefund`) hoặc xác nhận (`confirmRefund`) để chuyển `Reconciled`.”

### 5. Hệ thống kiểm soát tệp chứng từ (ảnh/PDF) như thế nào để chống gian lận?

“Có bốn lớp kiểm soát ở server: (1) kiểm tra **magic bytes** thực tế của JPG/PNG (tối đa 5 MiB) và PDF (tối đa 10 MiB), không chỉ tin tên file; (2) giới hạn tối đa 5 tệp hoá đơn và 5 tệp biên lai hoàn trả mỗi hạng mục; (3) tính băm **SHA-256** và chặn tái sử dụng cùng một tệp trên toàn bộ các hạng mục và biên lai trong ngân sách; (4) tệp lưu private trên Cloudinary, ICPDP chỉ được cấp signed URL xem/tải xuống chỉ đọc (`?download=1`).”

### 6. Ai chịu trách nhiệm bấm hoàn tất thanh toán ở từng kênh?

“Với `VIA_OFFICER_ADVANCE` (`BEFORE_EVENT`): ICPDP ghi tạm ứng, CLB xác nhận đã nhận tạm ứng, và kết thúc bằng ICPDP chốt `Reconciled` (trực tiếp hoặc sau khi xác nhận biên lai hoàn trả). Với `VIA_OFFICER_REIMBURSE`: sau khi ICPDP `Accepted`, **Club Leader** bấm xác nhận đã nhận tiền (`pay`). Với `DIRECT_VENDOR`: sau khi ICPDP `Accepted`, **ICPDP** bấm xác nhận đã chuyển thẳng nhà cung cấp (`confirmVendorPaid`). Domain hàm `isClubAction()` cưỡng chế đúng vai trò cho từng action.”

### 7. Chi thực tế cao hơn mức được duyệt có được nhà trường trả thêm không?

“Không ạ. CLB vẫn ghi đúng số tiền thực chi trên hoá đơn (`amount`), nhưng khi thẩm định `payable = min(validAmount, approvedAmount)`, nên số chi trả không bao giờ vượt hạn mức đã duyệt ở UC26.”

### 8. Hai người cùng thao tác trên một ngân sách có ghi đè dữ liệu không? — kỹ thuật

“Mọi thao tác gửi kèm `revision`. Trong Mongo transaction, `mongoSponsoredItemRepository.act()` cập nhật có điều kiện `{ _id: budgetId, __v: revision }` cùng `$inc: { __v: 1 }` (và bump `events.__v` để chống xung đột khi sự kiện đang bị huỷ). Nếu phiên bản không khớp, server trả `409 Conflict` yêu cầu tải lại.”

### 9. Ngân sách đóng (`Closed`) khi nào và các tổng số tiền được tính ra sao? — kỹ thuật

“Sau mỗi thao tác trong transaction, repository tính lại `disbursedTotal` (tổng tạm ứng đã được CLB xác nhận nhận + tổng `payable` của các hạng mục trả sau đã `Paid`), `refundedTotal` (tổng `refundAmount` của các hạng mục trả trước đã `refundConfirmedAt`), và `acceptedTotal`. Khi mọi hạng mục khác `NOT_SPONSORED` đều đạt trạng thái kết thúc (`Paid`, `Reconciled`, `Rejected`, `Expired` hoặc quá hạn `E + 14 ngày`), `eventBudgets.state` tự động chuyển `Closed`.”

### 10. UC55 xuất được dữ liệu tài chính nào và ai được dùng?

“ICPDP dùng `/workspace/exports` để xem trước và xuất báo cáo `xlsx`, `csv`, `pdf` (gồm dữ liệu tài chính, `CLUB_BUDGETS`, tuân thủ, đánh giá và báo cáo tổng kết năm học). Chọn nhiều loại dữ liệu sẽ xuất thành một workbook `xlsx` nhiều sheet.”

## 6. Điểm bàn giao

- Nhận ngân sách đã duyệt từng hạng mục (`fundingDecision`) từ [Người 3 — flow 5](flow-05-club-events.md).
- Tham chiếu cấu hình `schoolRefundAccount` (UC04) từ [Người 2](flow-04-board-transition.md).
- Chuyển kết quả tài chính sang [flow 8](flow-08-reporting-evaluation.md).
- Nghĩa vụ tài chính vi phạm (nếu cần xử lý tuân thủ) chuyển sang [Người 6 — flow 9](flow-09-complaints-violations.md).

## 7. Nguồn đối chiếu

- [SRS](../SRS.md): UC04, UC26, UC35–UC37, UC55, BR21, BR23–BR26, BR57–BR58, vòng đời ngân sách §6.7.
- [Đặc tả UC](../02-use-cases/UCMS_UseCase_Specification_v2.md), [Hiện trạng triển khai](../CURRENT_IMPLEMENTATION.md) và [ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md).
- Domain & Usecase giải ngân 3 kênh: [sponsored-item.ts](../../server/src/domain/sponsored-item.ts), [usecase/sponsored-item.ts](../../server/src/usecase/sponsored-item.ts), [sponsored-item-routes.ts](../../server/src/interface/http/sponsored-item-routes.ts), [mongo-sponsored-item-repository.ts](../../server/src/infra/db/mongo-sponsored-item-repository.ts).
- Chính sách STK hoàn trả: [policy.ts](../../server/src/domain/policy.ts), [PolicyPage.tsx](../../client/src/pages/icpdp/PolicyPage.tsx).
- Giao diện tài chính: [BudgetsPage.tsx](../../client/src/pages/icpdp/BudgetsPage.tsx), [ClubBudgetsPage.tsx](../../client/src/pages/club/ClubBudgetsPage.tsx), [SponsoredItems.tsx](../../client/src/components/custom/SponsoredItems.tsx).
- Legacy tương thích ngân sách cũ: [budget-disbursement.ts](../../server/src/domain/budget-disbursement.ts), [event-finance.ts](../../server/src/domain/event-finance.ts).
- Xuất dữ liệu UC55: [data-export.ts](../../server/src/domain/data-export.ts), [export-routes.ts](../../server/src/interface/http/export-routes.ts).
