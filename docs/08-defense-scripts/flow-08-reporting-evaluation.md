# Flow 8 — Báo cáo định kỳ và đánh giá CLB

**Người phụ trách:** Người 5. **UC chính:** UC38, UC39, UC41–UC43. **UC40:** chỉ nhắc như
nguồn dữ liệu tuân thủ; phần xử lý chi tiết thuộc [flow 9](flow-09-complaints-violations.md).
**Thời lượng gợi ý:** 90 giây cho lời thoại và demo, không tính Q&A.
Số flow theo [bản phân công](../UC_FLOW_GROUPS.md).

## 1. Nghiệp vụ chính

Leader tổng kết hoạt động theo kỳ; ICPDP thẩm định báo cáo rồi dùng dữ liệu hoạt động,
tài chính và tuân thủ để đánh giá theo một bộ tiêu chí chung. Báo cáo được chấp nhận và
kết quả đánh giá được công bố là hai quyết định khác nhau.

| Nội dung | Cần nắm khi trình bày |
|---|---|
| Actor | Leader nộp/sửa báo cáo và xem đánh giá đã công bố; ICPDP mở đợt nộp, thẩm định, cấu hình scheme, sinh/chốt/công bố đánh giá |
| Điều kiện báo cáo | CLB `Active`, `Suspended` hoặc `Dissolving`; có kỳ hợp lệ, Leader có `club.report.submit`; để demo UI cần đợt nộp đang mở và chưa hết hạn |
| Nộp và thẩm định | `Draft → Submitted → Accepted`; nếu thiếu thì `Returned for correction → Submitted` bằng version mới |
| Cấu hình đánh giá | Scheme `Draft → Active`; D1–D3 bắt buộc, tổng trọng số 100%; dùng cùng phiên bản cho các CLB trong kỳ |
| Sinh và chốt | Sinh kết quả `Data Ready`, ICPDP xem dữ liệu nguồn/chấm tay khi được phép rồi chốt `Finalized`; thao tác chấm tay đưa kết quả sang `Under Review` |
| Công bố | Công bố theo kỳ khi các bản mới nhất của mọi CLB trong phạm vi đã `Finalized` hoặc `Published`, và còn ít nhất một bản `Finalized` |
| Kết quả | Báo cáo và lịch sử nộp lại; đánh giá có điểm, xếp loại, dữ liệu nguồn và phiên bản; Leader chỉ thấy `Published` |

## 2. Chuẩn bị demo

- Leader: `/club/:clubId/periodic-reports` và `/club/:clubId/evaluations`.
- ICPDP: `/workspace/periodic-reports`, `/workspace/periodic-reports/:id`,
  `/workspace/evaluation-schemes`, `/workspace/evaluations`, `/workspace/evaluations/:id`.
- Tại trang báo cáo ICPDP, chuẩn bị đợt nộp mở và hạn còn hiệu lực; chuẩn bị nội dung,
  danh sách thành viên, hoạt động, minh chứng và các mục bổ sung bắt buộc của đợt nộp.
  UI chỉ liệt kê kỳ có thể tạo khi `isOpen` và chưa quá hạn.
- Chuẩn bị báo cáo `Submitted` để thẩm định, một báo cáo `Returned for correction` để
  giải thích version, scheme đã `Active` và dữ liệu hoạt động cùng kỳ.
- Sinh đánh giá theo kỳ bị chặn nếu còn báo cáo định kỳ `Submitted` chưa qua UC39.
  Để bấm công bố trong 90 giây, chuẩn bị trước các CLB khác đã chốt; không chỉ chuẩn bị
  một CLB trong khi toàn kỳ còn bản chưa hoàn tất.
- Chuẩn bị một kết quả `Published` cho Leader xem nếu không demo công bố trực tiếp.
  Phiên bản hiện tại **không có chức năng CLB phản biện kết quả đánh giá**.

Route đối chiếu tại [main.tsx](../../client/src/main.tsx); điều kiện tạo báo cáo trên UI
nằm ở [ClubPeriodicReportsPage](../../client/src/pages/club/ClubPeriodicReportsPage.tsx).

## 3. Kịch bản thuyết trình — khoảng 90 giây

### 0–35 giây: báo cáo theo kỳ

“Sau phần tài chính, em chuyển sang báo cáo định kỳ. Báo cáo này tổng hợp một kỳ hoạt
động của CLB, khác với báo cáo sau một sự kiện. Leader chọn kỳ nhà trường đang mở, kiểm
tra dữ liệu có sẵn rồi hoàn thiện các mục và minh chứng. Khi nộp, hệ thống giữ snapshot
của lần nộp đó. ICPDP có thể chấp nhận hoặc trả sửa, chỉ rõ phần cần bổ sung. Mỗi lần
nộp lại tạo version mới để giữ lịch sử.”

**Thao tác demo:** Mở báo cáo Leader đã chuẩn bị, chỉ dữ liệu và minh chứng; chuyển sang
chi tiết báo cáo ICPDP, chấp nhận bản `Submitted` hoặc mở lịch sử quyết định đã có.

### 35–65 giây: sinh và xem đánh giá

“Khi đánh giá, ICPDP dùng scheme chung của kỳ, với tổng trọng số 100 phần trăm và ba
nhóm tiêu chí bắt buộc: người tham gia, tầm ảnh hưởng và mức độ hài lòng. Hệ thống tổng
hợp dữ liệu thành bản nháp có nguồn đối chiếu. Tài chính ở phần trước và hồ sơ tuân thủ
ở phần sau cũng là đầu vào. Tiêu chí thiếu dữ liệu được đánh dấu để người thẩm định
nhận biết, không tự coi là điểm 0.”

**Thao tác demo:** Chỉ scheme đang dùng, mở chi tiết đánh giá `Data Ready`, xem một
dimension và dữ liệu nguồn; không nhập lại toàn bộ scheme.

### 65–90 giây: chốt và công bố

“ICPDP xem lại, chấm tay ở tiêu chí được scheme cho phép và ghi giải thích, sau đó chốt.
Khi toàn bộ CLB trong kỳ đủ điều kiện, ICPDP công bố kết quả. Leader chỉ xem được bản
đã Published. Nhóm em giữ phiên bản công bố để khi điều chỉnh vẫn đối chiếu được kết
quả trước đó.”

**Thao tác demo:** Chốt bản đã chuẩn bị, chỉ nút công bố theo kỳ; chuyển sang Leader mở
kết quả `Published`. Nếu toàn kỳ chưa sẵn sàng, dùng bản đã công bố để minh hoạ đầu ra.

## 4. Nhánh ngoại lệ và giới hạn

- **Trả báo cáo:** bắt buộc lý do và các phần cần sửa; báo cáo trả về chưa được tính là
  báo cáo đã chấp nhận. Hạn nộp lại nếu đã qua cũng chặn thao tác.
- **Hạn báo cáo:** đợt nộp có cấu hình deadline thì quá hạn bị từ chối. Nhánh server
  không có đợt nộp vẫn có thể nhận bài trễ và gắn `lateFlag`; UI tạo mới hiện chỉ mở các
  kỳ đã mở đợt. Không hứa mọi trường hợp nộp trễ đều được nhận trên màn hình.
- **Thiếu dữ liệu:** giữ cờ `insufficientData`; tổng điểm phân bổ lại trọng số trên các
  dimension có điểm. Nếu không có dimension có điểm và trọng số dương thì không sinh
  tổng điểm/xếp loại; không tự bịa dữ liệu để đủ điểm.
- **Scheme:** kích hoạt sai tổng trọng số hoặc D1–D3 có trọng số 0 bị chặn; kỳ đã có
  đánh giá không được đổi sang phiên bản scheme khác.
- **Sau công bố:** ICPDP điều chỉnh bằng revision mới. CLB không có workflow phản biện
  kết quả UC43 E1 ở phiên bản hiện tại.

## 5. Câu hỏi bảo vệ và câu trả lời

### 1. Báo cáo định kỳ khác báo cáo sau sự kiện thế nào?

“UC33–UC34 chốt kết quả của một sự kiện và thuộc flow 5. UC38–UC39 tổng hợp hoạt động
CLB trong một kỳ, gồm thành viên, hoạt động và các mục nhà trường yêu cầu. Hai nguồn
cùng giúp đánh giá, nhưng nộp báo cáo sau sự kiện không thay nghĩa vụ báo cáo định kỳ.”

### 2. Vì sao cần ICPDP kiểm tra khi hệ thống đã nạp sẵn số liệu?

“Số liệu có sẵn chỉ là một phần. ICPDP còn xem báo cáo có đúng mẫu, đủ nội dung và minh
chứng không. Việc chấp nhận xác nhận bản báo cáo dùng được cho kỳ đánh giá; nếu thiếu
thì phải trả lại có lý do và chỉ rõ phần cần sửa.”

### 3. CLB tạm ngừng có phải báo cáo không?

“Có ạ. Flow báo cáo cho phép CLB `Active`, `Suspended` và `Dissolving`, vì tạm ngừng
hoạt động mới không làm mất nghĩa vụ giải trình việc đã xảy ra. Quyền gửi vẫn thuộc
Leader hợp lệ của CLB.”

### 4. Nộp lại có làm mất bản đã bị trả không? — kỹ thuật

“Không. `PeriodicReportVersion` giữ nội dung, `preloadedFigures`, thời điểm nộp và quyết
định của từng version. Khi nộp lại, bản mới giữ snapshot mới; người thẩm định vẫn xem
được các lần nộp trước. `revision` còn được dùng để phát hiện form đã cũ khi sửa/nộp.”

### 5. Hệ thống tính điểm bằng AI hay quy tắc?

“Hiện tại là công thức xác định trong domain, không dùng AI. Ví dụ D5 dựa trên tỷ lệ
báo cáo đúng hạn và số lần bị trả sửa; D8 dựa trên hồ sơ vi phạm. Mỗi dimension có nguồn
số liệu để người thẩm định kiểm tra. Scheme cho phép đặt trọng số, ngưỡng xếp loại và
quyền chấm tay, không cho viết một công thức tuỳ ý.”

### 6. Thiếu phản hồi sự kiện có bị 0 điểm hài lòng không? — kỹ thuật

“Không. D3 cần số phản hồi đạt ngưỡng `feedbackMinRespondents`; không đủ thì kết quả là
thiếu dữ liệu. Hàm `totalOf` chỉ cộng các dimension có điểm và trọng số dương, rồi chia
cho tổng trọng số của chính các dimension đó. Thiếu dữ liệu và hoạt động kém là hai
tình huống được thể hiện khác nhau.”

### 7. ICPDP có thể tự sửa mọi điểm để có xếp loại mong muốn không?

“Chỉ dimension mà scheme cho `allowsManual` mới chấm tay được. Điểm phải từ 0 đến 100
và có giải thích. Hệ thống giữ điểm tính toán cùng thông tin chấm tay để kiểm tra, nên
phần người thẩm định can thiệp vẫn nhìn thấy được.”

### 8. Làm sao các CLB trong một kỳ được chấm cùng thước đo? — kỹ thuật

“Scheme bắt buộc đủ D1–D3 và tổng trọng số 100. Khi kỳ đã có đánh giá, server không cho
kích hoạt phiên bản scheme khác cho kỳ đó; thao tác sinh lại cũng dùng `schemeId` đã
gắn. Cơ chế này tránh CLB chấm trước dùng một bộ trọng số còn CLB chấm sau dùng bộ khác.”

### 9. Khiếu nại nào cũng làm giảm điểm CLB sao?

“Không ạ. D8 lấy hồ sơ vi phạm, gồm mức độ và hồ sơ còn mở. Khiếu nại được leo thang
đi vào đánh giá thông qua hồ sơ UC40, không trừ thêm lần nữa chỉ vì có complaint.
Huỷ sát giờ ở phiên bản hiện tại chỉ được đánh dấu, chưa tự tính vào điểm đánh giá.
Quy trình xác minh sự việc được Người 6 giải thích ở flow 9.”

### 10. Kết quả đã công bố sai thì ai sửa, CLB có khiếu nại không?

“ICPDP có thể tạo revision mới, kiểm tra, chốt và công bố lại; bản Published cũ vẫn
đọc được. Leader xem được các kết quả đã công bố, còn Member không có quyền này.
Workflow CLB phản biện kết quả UC43 E1 đang ngoài phạm vi, nên nhóm em không demo một
nút khiếu nại đánh giá chưa có.”

## 6. Điểm bàn giao

- Nhận dữ liệu sự kiện từ [flow 5](flow-05-club-events.md), booking từ
  [flow 6](flow-06-facilities.md) và tài chính từ [flow 7](flow-07-event-finance.md).
- UC40 do [Người 6 — flow 9](flow-09-complaints-violations.md) trình bày chi tiết;
  dùng hồ sơ đã chuẩn bị khi Người 5 trình bày trước Người 6.
- Kỳ báo cáo và lịch học kỳ được giải thích thêm trong UC04 tại
  [flow 10](flow-10-club-lifecycle.md); UC55 nằm trong Q&A [flow 7](flow-07-event-finance.md).

## 7. Nguồn đối chiếu

- [SRS](../SRS.md): UC38–UC43, BR20, BR29–BR30, BR51, BR60, mô hình đánh giá §9.
- [Hiện trạng triển khai](../CURRENT_IMPLEMENTATION.md) và [ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md).
- [Báo cáo và version](../../server/src/domain/periodic-report.ts), [kiểm tra nội dung](../../server/src/domain/club-periodic-report.ts), [lưu và nộp báo cáo](../../server/src/infra/db/mongo-club-periodic-report-repository.ts).
- [Scheme](../../server/src/domain/evaluation-scheme.ts), [khoá scheme theo kỳ](../../server/src/infra/db/mongo-evaluation-scheme-repository.ts).
- [Công thức điểm](../../server/src/domain/evaluation.ts), [sinh/chốt/công bố](../../server/src/usecase/evaluation.ts), [nguồn số liệu](../../server/src/infra/db/mongo-evaluation-repository.ts).
- [Quyền xem kết quả CLB](../../server/src/usecase/club-evaluation.ts), [lọc kết quả Published](../../server/src/infra/db/mongo-club-evaluation-repository.ts).
