# Flow 4 — Ban chủ nhiệm và chuyển giao nhiệm kỳ

**Phụ trách:** Người 2. **Phạm vi:** UC10, UC11, UC12, UC13; nối từ kết quả UC08.
**Thời lượng lời thoại:** khoảng 150 giây; dành thời gian cho quyền theo nhiệm kỳ và nghĩa vụ bàn giao.

## Nghiệp vụ chính

- **Actor:** Club Leader đề cử và lập kế hoạch; ICPDP Officer nhận task, xác nhận ghế hoặc chuyển giao; thành viên đủ điều kiện được chọn làm ứng viên.
- **Điều kiện quyền:** membership `Active`, ghế Chủ nhiệm/Phó chủ nhiệm đã xác nhận và nhiệm kỳ `Active` còn hiệu lực. Chức danh hiển thị không thay thế các điều kiện này.
- **UC10–UC11:** bổ sung ghế đủ điều kiện trong nhiệm kỳ hiện tại. Đề cử `Pending Confirmation`; officer quyết định từng ghế `Confirmed` hoặc `Returned`. Không tạo nhiệm kỳ mới qua UC11.
- **UC12–UC13:** lập `Draft`, chọn ban mới và người nhận từng nghĩa vụ → nộp `Pending Confirmation` → officer trả `Returned` hoặc duyệt `Confirmed`. Duyệt đóng nhiệm kỳ cũ, mở nhiệm kỳ mới và lưu lịch sử.
- **Kết quả:** quyền quản trị đi theo người giữ ghế hợp lệ; sự kiện, ngân sách, báo cáo, hồ sơ vi phạm và việc bàn giao không mất đi khi đổi người điều hành.

## Chuẩn bị demo

| Màn hình | Route UI | Chuẩn bị |
|---|---|---|
| Đề cử phía CLB | `/club/:clubId/board` | CLB `Active`, nhiệm kỳ còn hạn, một vị trí cho phép đề cử và một thành viên `Active` chưa giữ/đang chờ ghế khác |
| Xác nhận đề cử | `/workspace/board-nominations`, `/workspace/board-nominations/:id` | Tài khoản ICPDP; hồ sơ chưa được officer khác nhận |
| Lập kế hoạch | `/club/:clubId/transition-plans` | Ban mới đủ ghế; một nghĩa vụ đang mở để minh hoạ phân công; thông tin bàn giao đã chuẩn bị |
| Xác nhận chuyển giao | `/workspace/leadership-transitions`, `/workspace/leadership-transitions/:id` | Kế hoạch đúng CLB; có thể đánh dấu nghĩa vụ tiếp tục theo dõi |
| Lịch sử | `/club/:clubId/board-history` | Mở bằng Leader còn quyền sau chuyển giao hoặc Leader mới |

CLB mới từ flow 2 đã có ban sáng lập. Không cố đề cử lại ghế Chủ nhiệm đang có người. Có thể
dùng CLB demo riêng với một ghế hợp lệ đang trống hoặc ghế nhiều người giữ cho phép bổ sung;
kiểm tra danh sách ứng viên trước khi trình bày.

Chuẩn bị kế hoạch nháp đầy đủ và lưu mọi thay đổi trước khi nộp: UI vô hiệu nút nộp khi còn
thay đổi chưa lưu. Ngày bắt đầu trên form hiện yêu cầu từ ngày mai; nếu trước ngày kết thúc
nhiệm kỳ cũ thì phải nêu lý do chuyển giao sớm.

**Hành vi cần nói đúng:** khi ICPDP phê duyệt, code đặt `startAt` của nhiệm kỳ mới bằng thời
điểm duyệt, đóng nhiệm kỳ cũ ngay. Đây không phải cơ chế xếp lịch tự chuyển quyền vào ngày
tương lai đã nhập. Chuẩn bị phiên của Leader mới để xem kết quả, không dùng Leader cũ cho
các thao tác quản trị sau bàn giao nếu người đó không còn ghế hợp lệ. Không phải chờ scheduler.

## Kịch bản thuyết trình

**Thao tác demo:** mở ban chủ nhiệm và chỉ nhiệm kỳ hiện hành, sau đó mở màn đề cử.

> “Em tiếp nhận CLB đã được duyệt ở phần trước. Ban sáng lập đã có hiệu lực ngay tại UC08;
> flow này xử lý việc bổ sung ghế và chuyển sang nhiệm kỳ khác. Nhóm em tách hai việc vì
> bổ sung một người trong nhiệm kỳ hiện tại không giống bàn giao cả bộ máy điều hành.”

**Thao tác demo:** chọn thành viên đủ điều kiện cho một ghế đang cho phép đề cử và nộp.

> “Ở đề cử, hệ thống dùng nhiệm kỳ `Active` hiện tại. Người được chọn phải là thành viên
> `Active`, không được đồng thời chiếm hai ghế; với Chủ nhiệm còn kiểm tra nhiệm kỳ chồng
> lấn ở CLB khác. Em gửi đề cử, nhưng người này chưa có quyền chỉ vì đã có tên trong hồ sơ.”

**Thao tác demo:** officer nhận task, xác nhận ghế; chỉ chỗ trả ghế kèm lý do.

> “ICPDP nhận hồ sơ rồi quyết định từng ghế. Có thể xác nhận một phần và trả lại phần còn
> lại với lý do. Khi xác nhận, hệ thống ghi người giữ ghế và quyết định làm căn cứ. Quyền
> Leader chỉ có khi membership, ghế đã xác nhận và nhiệm kỳ còn hiệu lực cùng thoả mãn.
> Một chức danh như Thủ quỹ không tự có quyền quản trị.”

**Thao tác demo:** mở kế hoạch chuyển giao đã lưu; chỉ ban mới, nghĩa vụ và người nhận.

> “Với chuyển giao nhiệm kỳ, em chọn ban mới và phân công người nhận các việc chưa xong.
> Hệ thống nạp những sự kiện, ngân sách, báo cáo và hồ sơ vi phạm đang mở. Mỗi nghĩa vụ phải
> có người nhận thuộc ban mới; nếu thiếu thì không được nộp. Các mục bàn giao khác có thể
> bổ sung vào danh mục. Điều này giúp trách nhiệm tiếp tục gắn với CLB khi người điều hành
> thay đổi.”

**Thao tác demo:** officer nhận kế hoạch, chỉ lựa chọn theo dõi nghĩa vụ, duyệt rồi mở lịch sử bằng Leader mới.

> “ICPDP có thể trả lại để sửa hoặc phê duyệt, kèm các nghĩa vụ cần theo dõi tiếp. Trong
> code hiện tại, việc chuyển giao có hiệu lực ngay lúc duyệt: nhiệm kỳ cũ đóng, nhiệm kỳ
> mới hoạt động và quyền được tính lại. Lịch sử vẫn giữ ai đã giữ ghế ở nhiệm kỳ nào. Nếu
> CLB đang tạm ngừng thì chưa duyệt chuyển giao; đây là điểm nối sang phần vòng đời CLB.”

## Nhánh cần giải thích

- UC10 không nhập ngày nhiệm kỳ trên UI; dùng nhiệm kỳ `Active` hiện hành. Một lượt nộp chỉ có một ứng viên cho mỗi `positionId`, kể cả ghế nhiều người giữ; đây là giới hạn hiện tại.
- Ghế đơn đã có người hoặc đang chờ xác nhận không được đề cử chồng. UC10 không phải nút ghi đè người đang giữ ghế; demo chọn ghế hợp lệ hoặc dùng chuyển giao nhiệm kỳ.
- Nếu ứng viên mất membership `Active` trước UC11, repository tự trả ghế dự kiến xác nhận về cùng lý do. Nhiệm kỳ hết hạn trước quyết định thì không được xác nhận.
- UC12 chưa hỗ trợ đổi danh sách ghế trong kế hoạch. Luồng hiện tại giữ cơ cấu, không sinh phiên bản cơ cấu mới chỉ vì chuyển giao.
- CLB `Suspended` bị giữ việc phê duyệt chuyển giao cho tới khi được kích hoạt lại.
- Phê duyệt có điều kiện không xoá nghĩa vụ và không thay cho đối soát ngân sách, thẩm định báo cáo hoặc kết thúc hồ sơ vi phạm.

## Câu hỏi bảo vệ và câu trả lời

### 1. UC10–UC11 khác UC12–UC13 ở đâu?

> “UC10–UC11 xác nhận người vào ghế đủ điều kiện của nhiệm kỳ đang chạy; nhiệm kỳ đó không
> bị tạo lại. UC12–UC13 bàn giao sang nhiệm kỳ mới, có ban mới và nghĩa vụ đi kèm. Khi duyệt
> chuyển giao mới đóng nhiệm kỳ cũ và tạo hiệu lực cho nhiệm kỳ mới.”

### 2. Vì sao phải xác nhận khi Leader đã chọn ứng viên?

> “Đề cử là đề nghị từ CLB, còn ICPDP xác nhận tư cách điều hành. Trước xác nhận, người
> được đề cử chưa có quyền quản trị từ ghế đó. Cách này cũng lưu được ai đã xác nhận, vào
> lúc nào, dựa trên đề cử nào.”

### 3. Phó chủ nhiệm có quyền khác Chủ nhiệm không?

> “Trong mô hình truy cập hiện tại, cả Chủ nhiệm và Phó chủ nhiệm hợp lệ đều là Club Leader
> và có cùng danh mục 15 quyền cố định. Ràng buộc không làm Chủ nhiệm ở các nhiệm kỳ chồng
> lấn là kiểm tra riêng cho ghế Chủ nhiệm, không nên diễn đạt thành cấm mọi Phó chủ nhiệm
> tham gia lãnh đạo nhiều CLB.”

### 4. Có thể xác nhận một người và trả lại người khác không?

> “Có. Mỗi ghế đang chờ phải nhận đúng một quyết định. Ghế bị trả cần lý do; nếu trả tất
> cả thì cần lý do chung. Một hồ sơ tổng thể có thể mang trạng thái `Returned` nhưng vẫn
> có ghế `Confirmed`, nên khi đọc kết quả cần xem từng ghế.”

### 5. Có được đề cử hai Phó chủ nhiệm trong một lần không?

> “UC10 hiện chỉ cho một người trên mỗi `positionId` trong một lần nộp; unique index
> `uq_nom_seat` cũng bảo vệ điều đó. Ghế nhiều người giữ có thể cho đề cử thêm qua lượt
> riêng khi đủ điều kiện. UC12 là form khác: kế hoạch chuyển giao hỗ trợ số ứng viên theo
> giới hạn ghế, tối đa hai với ghế nhiều người giữ.”

### 6. Người đang giữ ghế xin rời CLB thì sao?

> “UC22 vẫn nhận yêu cầu, nhưng không được thực thi việc rời hoặc đưa người đó về
> `Inactive`/`Banned` khi ghế đã xác nhận còn hiệu lực. Phải giải quyết việc bàn giao ghế
> trước. UC10 hiện không ghi đè ghế đơn đang có người; với chuyển cả ban, nhóm em dùng
> UC12–UC13 để đóng các bản gán cũ rõ ràng.”

### 7. Những nghĩa vụ nào được tự nạp vào kế hoạch?

> “Code hiện nạp sự kiện còn mở theo trạng thái, ngân sách chưa đóng/huỷ, báo cáo định kỳ
> chưa `Accepted` và hồ sơ vi phạm chưa `Resolved` hoặc `Closed`. Người lập bổ sung các mục
> bàn giao khác bằng nội dung mô tả. Nhóm em không khẳng định hệ thống tự kiểm kê mọi tài
> sản thực tế; dữ liệu nào được quản lý thì phải theo đúng module sở hữu.”

### 8. Nếu còn ngân sách chưa đối soát thì có cấm chuyển giao không?

> “Không tự cấm chỉ vì có nghĩa vụ đang mở. Kế hoạch phải phân người nhận trong ban mới;
> ICPDP có thể duyệt và đánh dấu nghĩa vụ để theo dõi tiếp. Chuyển giao không làm ngân sách
> được tất toán và không xoá trách nhiệm báo cáo của CLB.”

### 9. Nhập ngày bắt đầu tương lai thì quyền sẽ đợi tới ngày đó phải không?

> “Không phải với code hiện tại. Form thu thập ngày dự kiến, nhưng repository UC13 đặt
> `startAt` nhiệm kỳ mới và `endAt` nhiệm kỳ cũ bằng thời điểm phê duyệt. Vì vậy, quyền
> chuyển ngay khi duyệt. Nếu nghiệp vụ muốn hẹn lịch hiệu lực trong tương lai thì cần bổ
> sung cơ chế khác; kịch bản này không mô tả cơ chế đó như đã có.”

### 10. Về kỹ thuật, quyền cũ được thu hồi bằng cách nào?

> “Quyền không được chép cố định vào một JWT. Khi duyệt, các assignment cũ được đặt
> `effectiveTo`, nhiệm kỳ cũ thành `Closed`; nhiệm kỳ và assignment mới được xác nhận.
> Resolver kiểm tra membership, thời hạn nhiệm kỳ và assignment ở thời điểm request. Nếu
> người cũ vẫn là thành viên `Active` thì còn quyền mặc định của Member, không còn toàn bộ
> quyền Leader nếu không có ghế mới.”

### 11. Về kỹ thuật, nếu lỗi giữa lúc đóng nhiệm kỳ cũ và tạo ghế mới thì sao?

> “Repository thực hiện quyết định trong transaction MongoDB, gồm thay đổi nhiệm kỳ,
> assignment, trạng thái kế hoạch, task, audit và thông báo. Nếu giao dịch thất bại thì
> không để lại một nửa cuộc chuyển giao. Quyền cũng chỉ được tính từ dữ liệu đã ghi thành
> công.”

### 12. Về kỹ thuật, dữ liệu thay đổi sau lúc mở form được xử lý thế nào?

> “Kế hoạch dùng `revision` để từ chối lưu trên bản đã thay đổi. Khi nộp, server đọc lại
> nghĩa vụ và kiểm tra người nhận; khi duyệt, server kiểm tra lại task, nhiệm kỳ, ứng viên
> `Active` và xung đột Chủ nhiệm. Do đó, kết quả kiểm tra trên UI lúc mở form không thay
> thế kiểm tra ở thời điểm ghi dữ liệu.”

## Bàn giao

> “Phần này xác định ai đang có quyền điều hành và nghĩa vụ nào được bàn giao. Tiếp theo,
> em trình bày khi CLB cần tạm ngừng, hoạt động trở lại hoặc giải thể thì hệ thống xử lý
> trạng thái và công việc đang mở như thế nào.”

Theo thứ tự của Người 2, tiếp tục [flow 10 — Vòng đời CLB](flow-10-club-lifecycle.md).
Các nghĩa vụ cụ thể được giải thích ở [flow 5 — Sự kiện](flow-05-club-events.md),
[flow 7 — Kinh phí](flow-07-event-finance.md), [flow 8 — Báo cáo](flow-08-reporting-evaluation.md)
và [flow 9 — Vi phạm](flow-09-complaints-violations.md).

## Nguồn đối chiếu

- [SRS — UC10–UC13, BR06–BR08, BR47, BR55–BR56](../SRS.md) và [hiện trạng, giới hạn đề cử](../CURRENT_IMPLEMENTATION.md).
- [Route UI](../../client/src/main.tsx), [đề cử phía CLB](../../client/src/pages/club/BoardNominationPage.tsx), [form kế hoạch](../../client/src/pages/club/ClubTransitionPlanEditor.tsx).
- [Kiểm tra đề cử và quyết định từng ghế](../../server/src/usecase/board-nomination.ts), [transaction xác nhận](../../server/src/infra/db/mongo-board-nomination-repository.ts).
- [Nội dung kế hoạch](../../server/src/domain/club-transition-plan.ts), [revision và kiểm tra khi nộp](../../server/src/infra/db/mongo-club-transition-plan-repository.ts).
- [Nguồn nghĩa vụ tự nạp](../../server/src/infra/db/club-obligations.ts).
- [Quyết định chuyển giao](../../server/src/usecase/leadership-transition.ts), [transaction và mốc hiệu lực thực tế](../../server/src/infra/db/mongo-leadership-transition-repository.ts).
- [Điều kiện Leader và resolver quyền](../../server/src/domain/access.ts).
