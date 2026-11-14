# Flow 7 — Kinh phí và quyết toán

**Người phụ trách:** Người 5. **UC chính:** UC35–UC37. **UC bổ trợ:** UC55 ở phần hỏi đáp.
**Thời lượng lời thoại và demo gợi ý:** 150 giây; Q&A nằm ngoài thời lượng này.
Số flow theo [bản phân công bảo vệ](../UC_FLOW_GROUPS.md), không phải số F trong SRS.

## 1. Nghiệp vụ chính

Flow này nhận **ngân sách sự kiện đã được ICPDP duyệt ở UC26**, theo dõi tiền đã tạm ứng,
chi tiêu thực tế, chứng từ và kết quả đối soát để xác định số cần cấp bù hoặc hoàn trả.
App ghi nhận giao dịch đã thực hiện bên ngoài; không chuyển tiền hay làm sổ cái kế toán.

| Nội dung | Cần nắm khi trình bày |
|---|---|
| Actor | ICPDP ghi `Advance`, `TopUp`, `Refund` và đối soát; Club Leader ghi khoản chi, chứng từ và nộp quyết toán |
| Điều kiện | Ngân sách `Approved` để bắt đầu tạm ứng; Leader có `club.expense.record`; sự kiện đã kết thúc hoặc bị huỷ để nộp quyết toán |
| Bước 1 | ICPDP ghi tạm ứng; ngân sách chuyển `Disbursed`, có thể tạm ứng nhiều lần trong trần đã duyệt |
| Bước 2 | Leader ghi khoản chi và liên kết chứng từ, xem khoản ngoài hạng mục hoặc vượt phần được duyệt |
| Bước 3 | Leader nộp quyết toán → `Settlement Submitted`; bộ khoản chi bị khoá để ICPDP thẩm định |
| Bước 4 | ICPDP nhận task, chấp nhận hoặc loại từng khoản kèm lý do; có thể trả bổ sung → `Reconciliation Pending` |
| Bước 5 | Chốt chi hợp lệ và chênh lệch; ghi cấp bù/hoàn trả nếu cần, kết thúc ở `Closed` |
| Kết quả | Có lịch sử dòng tiền, chi tiêu, chứng từ, quyết định từng khoản và nghĩa vụ tài chính còn lại |

**Công thức cần nhớ:** chi hợp lệ = tổng khoản được chấp nhận, tối đa bằng số đã duyệt;
chênh lệch tất toán = chi hợp lệ − tổng tạm ứng.

| Ví dụ: đã duyệt 10 triệu, đã tạm ứng 8 triệu | Kết quả |
|---|---|
| Chi hợp lệ 8 triệu | Chênh lệch 0 → `Closed` |
| Chi hợp lệ 9 triệu | Chênh lệch +1 triệu → `Reconciled`; ghi `TopUp` đúng 1 triệu → `Closed` |
| Chi hợp lệ 7 triệu | Chênh lệch −1 triệu → `Recovery Pending`; ghi `Refund` đủ 1 triệu → `Closed` |

Đây là số liệu minh hoạ để chuẩn bị, không khẳng định database đã có sẵn.

## 2. Chuẩn bị demo

- Chuẩn bị tài khoản ICPDP và Leader của cùng CLB. Thành viên có chức danh Thủ quỹ nhưng
  không thuộc role Leader không tự có quyền ghi chi.
- Chuẩn bị ngân sách A đã duyệt, có tạm ứng 8 triệu và sự kiện đã kết thúc; khoản chi đủ
  chứng từ 7 triệu để đi nhánh hoàn 1 triệu. Nếu muốn thao tác tạm ứng ngay, dùng ngân sách B
  có ngày giao dịch không ở tương lai và không sau thời điểm kết thúc sự kiện.
- Chuẩn bị liên kết HTTPS truy cập được cho hoá đơn/biên lai/chứng từ thanh toán. UI hiện
  nhận liên kết chứng từ tài chính; không giới thiệu thành thao tác tải hoá đơn trực tiếp.
- ICPDP: `/workspace/budgets` → `/workspace/budgets/:id`; đối soát tại
  `/workspace/budgets/:id/reconciliation`. Leader: `/club/:clubId/budgets`.
- Giữ sẵn một quyết toán `Settlement Submitted` để có thể chuyển tới bước đối soát nếu
  thời gian nhập khoản chi dài. Sau khi quyết toán đã nộp, dùng chức năng trả bổ sung để
  mở lại quyền sửa; không giả định có nút sửa trực tiếp khi đang chờ duyệt.
- Hạn quyết toán là **14 ngày sau khi sự kiện kết thúc**; hạn hoàn trả đang chạy trong
  `main.ts` là **7 ngày từ lúc chốt thu hồi**. Bảng 16.3 trong
  [guide cũ](../06-user-guide/GUIDE_BOOK.md) còn ghi hoàn trả 14 ngày; dùng mốc 7 ngày khi bảo vệ.

Các route được đối chiếu tại [router](../../client/src/main.tsx); màn ghi chi và đối soát
dùng chung [FinanceWorkspace](../../client/src/components/custom/FinanceWorkspace.tsx).

## 3. Kịch bản thuyết trình — khoảng 150 giây

### 0–25 giây: nhận ngân sách đã duyệt

“Em tiếp nhận ngân sách đã được duyệt ở phần tổ chức sự kiện. Ở đây nhóm em tách rõ bốn
con số: được duyệt, đã tạm ứng, chi thực tế và chi được chấp nhận sau đối soát. Ví dụ ngân
sách được duyệt là 10 triệu, nhà trường đã tạm ứng 8 triệu. Việc chuyển tiền diễn ra bên
ngoài; ICPDP ghi lại số tiền, ngày giao dịch và mã tham chiếu nếu có.”

**Thao tác demo:** Mở chi tiết ngân sách phía ICPDP, chỉ số duyệt và lịch sử `Advance`.
Nếu đã chuẩn bị ngân sách phù hợp, ghi một tạm ứng nhỏ; nếu không, mở dòng tạm ứng đã có.

### 25–65 giây: ghi chi và nộp quyết toán

“Em chuyển sang Leader để ghi khoản chi, hạng mục và chứng từ. Hệ thống cho ghi trước một
khoản chưa có chứng từ nhưng hiển thị rõ phần còn thiếu. Khoản ngoài hạng mục hoặc vượt
phần được duyệt được gắn cờ để người thẩm định xem xét. Khi sự kiện đã kết thúc hoặc bị
huỷ, Leader kiểm tra tổng chi rồi nộp quyết toán. Sau khi nộp, bộ khoản chi bị khoá; nếu
cần bổ sung thì ICPDP phải trả hồ sơ về.”

**Thao tác demo:** Vào `/club/:clubId/budgets`, mở ngân sách A, chỉ khoản chi và chứng từ;
nộp bản đã chuẩn bị, xác nhận trạng thái `Settlement Submitted`.

### 65–110 giây: đối soát và xác định nghĩa vụ

“Phía ICPDP nhận hồ sơ và quyết định từng khoản, kèm lý do. Khoản thiếu chứng từ không
được chấp nhận. Trong ví dụ này, chi hợp lệ là 7 triệu so với 8 triệu đã tạm ứng, nên CLB
phải hoàn 1 triệu. Ngân sách chuyển sang Recovery Pending và có hạn hoàn trả. CLB chuyển
tiền thực tế, sau đó ICPDP ghi Refund; khi đã hoàn đủ, ngân sách mới Closed.”

**Thao tác demo:** Mở trang đối soát, nhận task nếu cần, xem các khoản và chốt kết quả;
chỉ số phải hoàn, hạn hoàn trả. Chuyển về chi tiết ngân sách và mở mục ghi `Refund` đã
chuẩn bị để minh hoạ kết quả `Closed`.

### 110–150 giây: giải thích hai nhánh còn lại và bàn giao

“Nếu chi hợp lệ đúng bằng tạm ứng thì ngân sách được đóng ngay. Nếu chi hợp lệ là 9 triệu,
hệ thống chờ cấp bù đúng 1 triệu, vẫn trong trần 10 triệu đã duyệt. Như vậy, việc được
duyệt ngân sách không có nghĩa CLB đã nhận tiền, và đã nộp quyết toán cũng chưa có nghĩa
nghĩa vụ đã hoàn thành. Kết quả tài chính này sẽ được dùng khi đánh giá CLB ở phần tiếp
theo.”

**Thao tác demo:** Chỉ bảng số liệu hoặc hai hồ sơ chuẩn bị sẵn cho chênh lệch bằng 0 và
dương; chuyển sang [flow 8](flow-08-reporting-evaluation.md).

## 4. Nhánh ngoại lệ cần giải thích

- **Thiếu chứng từ:** vẫn ghi chi và nộp được; khi chốt, officer phải loại khoản đó hoặc
  trả hồ sơ bổ sung. Không nói hệ thống cấm tạo mọi khoản chi thiếu chứng từ.
- **Chưa hết sự kiện:** chưa nộp quyết toán được, trừ sự kiện `Cancelled`. Code còn nhận
  sự kiện đã kết thúc ở `Report Submitted` hoặc `Closed`, ngoài `Completed`.
- **Nộp trễ:** vẫn nhận và gắn `isSettlementLate` nếu chưa bị chốt theo nhánh quá hạn.
  Khi ICPDP chốt quá hạn trên dữ liệu đang có, chi được chấp nhận có trần là số đã tạm
  ứng; nhánh này không phát sinh cấp bù.
- **Huỷ sự kiện:** chưa tạm ứng thì ngân sách có thể bị huỷ; đã tạm ứng vẫn phải quyết
  toán và hoàn phần chưa chứng minh được bằng chi hợp lệ.
- **Sai số tiền hoặc dữ liệu cũ:** từ chối tạm ứng/cấp bù vượt trần, cấp bù không đúng
  chênh lệch, hoàn quá số còn phải hoàn; thao tác trên `revision` cũ phải tải lại dữ liệu.

## 5. Câu hỏi bảo vệ và câu trả lời

### 1. Vì sao cần cả số đã chi và số chi hợp lệ?

“Số đã chi do CLB ghi nhận để phản ánh thực tế. Số chi hợp lệ là phần ICPDP chấp nhận sau
khi xem chứng từ và lý do. Hai số có thể khác nhau, nên nếu chỉ dùng tổng chi để đóng
ngân sách thì sẽ bỏ qua bước kiểm soát sử dụng kinh phí.”

### 2. Bấm giải ngân có chuyển tiền đến ngân hàng không?

“Không ạ. UC35 ghi nhận dòng tiền đã xảy ra ngoài hệ thống, gồm loại, số tiền, ngày và
tham chiếu nếu có. Nhóm em chưa tích hợp ngân hàng, cổng thanh toán hay nghiệp vụ kế toán.
Vì vậy khi demo, em dùng từ ghi nhận tạm ứng, cấp bù và hoàn trả.”

### 3. Có chứng từ là chắc chắn được chấp nhận không?

“Chứng từ là điều kiện cần. ICPDP vẫn phải xem khoản chi có phù hợp hay không và ghi lý
do chấp nhận hoặc loại. Ngược lại, khoản chưa có chứng từ có thể được nhập để theo dõi,
nhưng không thể được chấp nhận lúc chốt đối soát. Quy tắc này được kiểm tra ở server.”

### 4. Chi vượt mức duyệt có làm app tự cấp thêm ngân sách không?

“Không ạ. Khoản chi được ghi và gắn cờ, nhưng chi hợp lệ dùng để tất toán bị giới hạn bởi
số đã duyệt. Tổng Advance và TopUp cũng không được vượt trần đó. Phiên bản hiện tại
không có quy trình xin điều chỉnh ngân sách để hợp thức hoá phần vượt.”

### 5. Có thể tạm ứng và hoàn tiền nhiều lần không?

“Có thể tạm ứng nhiều lần khi ngân sách cho phép và tổng chưa vượt trần. Hoàn trả cũng
có thể ghi nhiều lần, mỗi lần không vượt phần còn thiếu; chỉ khi đủ mới Closed. Riêng
TopUp sau đối soát phải đúng chênh lệch cần cấp bù, không phải số tuỳ ý.”

### 6. Hạn 14 ngày và 7 ngày khác nhau thế nào?

“14 ngày là hạn nộp quyết toán sau khi sự kiện kết thúc, quy định bởi
`SETTLEMENT_DUE_DAYS`. 7 ngày là hạn hoàn trả sau quyết định thu hồi, cấu hình hiện được
nối vào repository tài chính ở `main.ts`. Bảng guide cũ ghi hoàn trả 14 ngày đã lỗi thời;
khi bảo vệ nhóm em đối chiếu SRS, code và ngày hiển thị trên hồ sơ.”

### 7. CLB không nộp quyết toán thì hệ thống chờ mãi sao?

“Sau hạn, ICPDP có thể chốt đối soát quá hạn dựa trên chứng từ đã có. Chi được chấp nhận
không vượt tạm ứng nên không cấp bù; phần không chứng minh được phải hoàn. Nếu quá hạn
hoàn trả, đây là nghĩa vụ quá hạn và officer có thể mở hồ sơ vi phạm. Không phải cứ
đến hạn là app tự ra kết luận vi phạm.”

### 8. Hai người cùng sửa một ngân sách có ghi đè nhau không? — kỹ thuật

“Mỗi thao tác gửi `revision`. Repository dùng điều kiện `_id` và `__v` để tăng phiên bản
trong transaction; phiên bản không còn khớp thì trả conflict và yêu cầu tải lại.
Quyền người ghi cũng được kiểm tra trong transaction. Điều này tránh ghi đè bằng một
bản form đã cũ.”

### 9. Hệ thống giữ bộ số liệu đã nộp như thế nào? — kỹ thuật

“Khi submit, trạng thái chuyển `Settlement Submitted`, và domain chỉ cho sửa chi/chứng
từ ở `Disbursed` hoặc `Reconciliation Pending`. Audit lưu snapshot tổng tiền và các
khoản chi lúc nộp. Vì vậy cần phân biệt phiên bản chống ghi đè của ngân sách với lịch sử
snapshot, không gọi đây là một bảng version quyết toán riêng.”

### 10. Vì sao server không cho chấp nhận một khoản thiếu chứng từ? — kỹ thuật

“Hàm `reconcileExpenses` yêu cầu mỗi khoản được review đúng một lần, có outcome và lý do.
Nếu outcome là `Accepted` nhưng `hasEvidence` là false thì báo lỗi. Hàm tính chênh lệch
cũng nằm ở domain, nên không phụ thuộc việc UI có ẩn nút hay không.”

### 11. Trên sơ đồ có Reconciled rồi Closed, sao demo đi thẳng Closed?

“Sơ đồ diễn tả việc đối soát xong rồi đóng nghĩa vụ. Code tính trạng thái kết quả ngay:
chênh lệch bằng 0 thì lưu `Closed`; chênh lệch dương mới lưu `Reconciled` để chờ TopUp.
Nhóm em không chờ một lần bấm đóng riêng cho trường hợp bằng 0.”

### 12. UC55 xuất được gì và ai được dùng?

“ICPDP dùng `/workspace/exports` để xem trước và xuất dữ liệu, gồm tài chính, ngân sách
theo CLB, tuân thủ và đánh giá. Các định dạng hiện có là xlsx, csv và pdf; chọn nhiều
loại thì tạo một xlsx với nhiều sheet. Có cả báo cáo tổng kết theo năm. Đây là cách lấy
dữ liệu để tổng hợp, không thay thế quyết định đối soát trên hồ sơ.”

## 6. Điểm bàn giao

- Nhận số ngân sách duyệt và sự kiện từ [Người 3 — flow 5](flow-05-club-events.md).
- Chuyển kết quả tài chính sang [flow 8](flow-08-reporting-evaluation.md).
- Nghĩa vụ tài chính cần xử lý tuân thủ chuyển sang [Người 6 — flow 9](flow-09-complaints-violations.md).
- Khi CLB giải thể, việc giữ nghĩa vụ chưa hoàn thành được giải thích ở [flow 10](flow-10-club-lifecycle.md).

## 7. Nguồn đối chiếu

- [SRS](../SRS.md): UC35–UC37, UC55, BR23–BR26, BR57–BR58, vòng đời ngân sách §6.
- [Hiện trạng triển khai](../CURRENT_IMPLEMENTATION.md) và [ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md).
- [Quy tắc chi và đối soát](../../server/src/domain/event-finance.ts), [dòng tiền và hạn quyết toán](../../server/src/domain/budget-disbursement.ts).
- [Kiểm tra quyền tài chính](../../server/src/usecase/event-finance.ts), [transaction, revision và snapshot](../../server/src/infra/db/mongo-event-finance-repository.ts), [hạn hoàn trả đang dùng](../../server/src/main.ts).
- [Danh mục xuất dữ liệu](../../server/src/domain/data-export.ts), [route xuất dữ liệu](../../server/src/interface/http/export-routes.ts).
