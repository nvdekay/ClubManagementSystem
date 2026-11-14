# Flow 11 — Sự kiện cấp trường và lời mời CLB

| Nội dung | Phạm vi |
|---|---|
| Người trình bày | Người 4 |
| Use case | UC53–UC54 |
| Thời lượng gợi ý | 90 giây, nối sau 150 giây của flow 6 |
| Thông điệp chính | ICPDP điều phối việc các CLB tham gia hoạt động chung, tách phản hồi của tổ chức khỏi đăng ký cá nhân |

## 1. Nghiệp vụ cốt lõi

**ICPDP Officer** tạo sự kiện cấp trường, chọn các CLB được mời, đặt hạn phản hồi, theo dõi kết quả và công bố sự kiện. **Club Leader** xem và phản hồi lời mời của CLB bằng `Accepted` hoặc `Declined`; từ chối bắt buộc có lý do. Member thông thường không có quyền quyết định thay CLB. **Student** chỉ đi vào luồng đăng ký cá nhân sau khi sự kiện được công bố; nghiệp vụ này đã trình bày ở flow 5.

Sự kiện phải nằm gọn trong một học kỳ, có thời gian tương lai, địa điểm và sức chứa hợp lệ. CLB được mời phải `Active`. Hạn phản hồi phải còn ở tương lai và không sau giờ bắt đầu sự kiện. Hệ thống tạo sự kiện với `organizerType = ICPDP`, không gắn `clubId`, ở `Approved`; không tạo đề xuất CLB để ICPDP tự duyệt qua UC26.

Mỗi lời mời thuộc cặp sự kiện–CLB, khởi đầu ở `Pending`. Leader phản hồi trước hạn, khi CLB còn `Active` và sự kiện chưa bắt đầu, còn `Approved` hoặc `Upcoming`. Phản hồi lưu người thực hiện, thời điểm, nội dung phối hợp và thông báo cho cán bộ đã gửi. `Accepted` là sự xác nhận tham gia của tổ chức; không tự tạo danh sách đăng ký hoặc điểm danh cho mọi thành viên.

ICPDP có thể bổ sung lời mời, thu hồi lời mời còn `Pending` trước hạn, và công bố `Approved → Upcoming`. Khi công bố, bản hiện tại mở đăng ký từ lúc công bố đến giờ bắt đầu. Cửa sổ đăng ký cá nhân và hạn trả lời của CLB là hai mốc khác nhau.

## 2. Chuẩn bị demo

Chuẩn bị hai phiên: ICPDP Officer và Leader của CLB `Active`. Chọn tên minh hoạ như “Ngày hội câu lạc bộ” và ngày thuộc học kỳ đã cấu hình; không mặc định dữ liệu seed có đúng tên hoặc mốc giờ đó.

| Route đã xác minh | Dữ liệu cần chuẩn bị |
|---|---|
| `/workspace/school-events` | Form tạo với tên, mục tiêu, thời gian, địa điểm, sức chứa, yêu cầu phối hợp và danh sách CLB |
| `/workspace/school-events/:id` | Sự kiện `Approved` chưa bắt đầu; ít nhất một lời mời `Pending` còn hạn; có thể thêm một lời mời `Declined` hoặc `Expired` để đối chiếu |
| `/club/:clubId/invitations` | Leader có lời mời tương ứng, form nhập ghi chú, đại diện và số người dự kiến |
| `/events/:id` | Màn công khai để chỉ kết quả sau khi ICPDP công bố; không cần demo lại đăng ký, check-in |

Nếu tạo mới trong buổi bảo vệ, dùng thông tin ngắn đã chuẩn bị và danh sách CLB chọn sẵn. Nếu thời gian ngắn, mở hồ sơ đã tạo và nói rõ đó là dữ liệu minh hoạ. Hạn trả lời phải còn đủ xa để Leader thực hiện được trước khi demo kết thúc.

Các giới hạn cần nói đúng: UC53 cảnh báo xung đột với lịch đã có, không chặn tạo sự kiện trường chỉ vì xung đột đó; cảnh báo không chứng minh tài nguyên đã được sắp xếp xong. Lời mời có thông báo in-app; công bố chưa gửi thông báo hàng loạt đến sinh viên. Màn theo dõi hiện đọc dữ liệu qua React Query, không có WebSocket hoặc polling riêng trong `useSchoolEvents.ts`; khi đổi phiên để phản hồi, tải lại màn ICPDP trước khi chỉ số liệu mới. Lời mời hết hạn có thể còn nhãn `Pending` đến khi job chạy, nhưng server đã từ chối phản hồi từ đúng thời điểm deadline.

## 3. Kịch bản thuyết trình

### 0:00–0:30 — ICPDP tạo hoạt động chung

“Tiếp theo là sự kiện do nhà trường tổ chức, ví dụ ngày hội CLB. ICPDP nhập thời gian, địa điểm, yêu cầu phối hợp và chọn các CLB muốn mời. Vì nhà trường là đơn vị tổ chức, sự kiện được tạo ở `Approved`, không đi qua đơn đề xuất của CLB. Hệ thống vẫn kiểm tra lịch học kỳ và hiển thị xung đột địa điểm để cán bộ điều phối.”

**Thao tác demo:** Mở `/workspace/school-events`, chỉ các thông tin đã chuẩn bị, chọn CLB và hạn phản hồi; tạo sự kiện hoặc mở hồ sơ đã tạo tương ứng.

### 0:30–1:00 — Leader phản hồi thay CLB

“Leader nhận lời mời tại đây, xem yêu cầu rồi chọn chấp nhận hoặc từ chối. Khi chấp nhận, CLB có thể cung cấp đại diện, số người và nội dung phối hợp; nếu từ chối thì phải ghi lý do. Hệ thống giữ người phản hồi và thời điểm. Một CLB chấp nhận lời mời không có nghĩa tất cả thành viên đã đăng ký hoặc đã tham dự sự kiện.”

**Thao tác demo:** Chuyển phiên Leader, mở `/club/:clubId/invitations`, nhập nội dung phối hợp ngắn rồi chọn chấp nhận. Chỉ nhãn `Accepted` và form không còn cho sửa quyết định.

### 1:00–1:30 — Theo dõi và công bố

“Quay lại phía ICPDP, cán bộ biết CLB nào đã nhận lời, từ chối hoặc chưa phản hồi để tiếp tục sắp xếp. Lời mời còn chờ có thể thu hồi trước hạn nếu kế hoạch thay đổi. Khi công bố, sự kiện chuyển sang `Upcoming` và sinh viên đăng ký theo luồng cá nhân đã trình bày. Phần này hoàn thành vai trò điều phối của nhà trường, còn dữ liệu hoạt động sẽ được dùng ở phần đánh giá CLB.”

**Thao tác demo:** Tải lại `/workspace/school-events/:id`, chỉ danh sách và số lời mời `Accepted`. Công bố hồ sơ `Approved` đã chuẩn bị rồi mở `/events/:id` để xác nhận xuất hiện công khai.

## 4. Nhánh thay thế và lỗi đáng trình bày

| Tình huống | Hành vi hiện tại |
|---|---|
| CLB từ chối | Bắt buộc `responseNote`; chuyển `Declined`, lưu phản hồi và thông báo cán bộ đã mời. |
| Quá hạn hoặc đúng deadline | Chặn phản hồi vì điều kiện hợp lệ là `now < deadline`; job đổi lời mời còn `Pending` thành `Expired`. Không dựa riêng vào nhãn đang hiển thị. |
| ICPDP thu hồi | Chỉ lời mời `Pending` trước hạn mới thành `Withdrawn`; không thu hồi lời mời đã `Accepted` qua thao tác này. |
| CLB mất trạng thái `Active` hoặc sự kiện đã bắt đầu | Server từ chối phản hồi kể cả lời mời vẫn hiện `Pending`; kiểm tra lại ngay lúc ghi. |
| Gửi lời mời nhiều CLB có mục không hợp lệ | Code xử lý từng CLB và trả kết quả `invited`/`skipped`; CLB không `Active` hoặc đã được mời ở trạng thái còn hiệu lực không được tạo thêm lời mời. |
| Mời lại sau `Withdrawn` hoặc `Expired` | Có thể đưa lời mời đó về `Pending` với deadline mới qua thao tác gửi lời mời; giữ audit của các hành động. Không hứa có thể đổi trực tiếp một quyết định `Accepted` thành `Declined`. |
| Lịch trường trùng lịch đang có | Hiển thị `Warning` để cán bộ xử lý điều phối; không coi đây là sự bảo đảm phòng hoặc thiết bị không có xung đột. |

## 5. Q&A bảo vệ

### 1. Sự kiện cấp trường khác đề xuất của CLB ở đâu?

“Dạ, khác ở đơn vị tổ chức và điểm bắt đầu workflow. Đề xuất CLB do Leader nộp để ICPDP thẩm định. Sự kiện trường do ICPDP tạo, có `organizerType = ICPDP`, không có `clubId`, và bắt đầu ở `Approved`. Hai loại dùng chung mô hình sự kiện cho thông tin thời gian và luồng tham dự, nhưng sự kiện trường không tạo một bước ICPDP tự duyệt chính mình.”

### 2. Tại sao `Accepted` không đăng ký sẵn toàn bộ thành viên CLB?

“Dạ, lời mời xác nhận trách nhiệm phối hợp của tổ chức, ví dụ có gian hàng hoặc tiết mục. Đăng ký cá nhân xác nhận ai dự định đến, còn check-in xác nhận ai thực sự có mặt. Nếu tự đăng ký toàn bộ thành viên từ một phản hồi của Leader thì sức chứa và số liệu tham dự có thể sai. Code UC54 chỉ cập nhật `EventInvitation`, audit và thông báo; không tạo `EventRegistration` cho các thành viên.”

### 3. Ai được phản hồi? Một Member nhập URL có làm được không?

“Dạ, cần `club.event.manage` của Leader thuộc đúng CLB. `usecase/club-invitation.ts` kiểm tra quyền khi đọc và phản hồi; repository kiểm tra lại quyền ghi cùng trạng thái CLB trong transaction. Vì vậy việc biết URL hoặc sửa ID ở client không cấp quyền quyết định thay một CLB khác. Chức danh nội bộ không làm một Member tự có quyền này.”

### 4. Hạn phản hồi mặc định và thời điểm hết hạn được tính thế nào?

“Dạ, mặc định là ba ngày trước giờ bắt đầu. Nếu mốc mặc định đó đã qua lúc tạo lời mời, code dùng giờ bắt đầu làm mốc thay thế; cán bộ có thể đặt deadline khác nhưng phải còn ở tương lai và không sau giờ bắt đầu. Phản hồi chỉ hợp lệ trước deadline, đúng deadline cũng bị từ chối. Nhãn `Expired` được job cập nhật sau đó; server không cần chờ job mới chặn phản hồi muộn.”

### 5. Hai Leader cùng phản hồi khác nhau thì sao?

“Dạ, server ghi trong transaction và dùng điều kiện lời mời vẫn `Pending`, deadline còn hiệu lực. Lần ghi thành công đầu tiên chuyển trạng thái; lần còn lại không sửa được cùng lời mời nữa và nhận lỗi xung đột. Repository cũng khoá ghi sự kiện bằng tăng `__v` rồi kiểm tra sự kiện chưa bắt đầu. Cách làm này bảo vệ quyết định ngay ở server, không chỉ dựa vào việc nút trên giao diện đã bị khoá.”

### 6. Gửi lời mời trùng hoặc mời CLB tạm ngừng có gây lỗi cả đợt không?

“Dạ, bản hiện tại trả danh sách CLB đã mời và bị bỏ qua. CLB không `Active` bị bỏ qua với lý do; lời mời đang `Pending`, đã `Accepted` hoặc `Declined` không được gửi thành bản mới. Với lời mời `Withdrawn` hoặc `Expired`, hệ thống cho mời lại bằng deadline mới. Vì vậy khi trình bày một đợt gửi nhiều CLB, em kiểm tra kết quả từng nhóm, không nói rằng tất cả đều nhận được chỉ vì request thành công.”

### 7. Vì sao sự kiện trường trùng lịch chỉ cảnh báo?

“Dạ, đây là quy tắc hiện hành của UC53 để nhà trường chủ động điều phối hoạt động chung. Server lưu `Warning` cùng thông tin xung đột nhưng không chặn việc tạo sự kiện trường chỉ vì lịch đã có. Điều đó không tự huỷ booking của CLB khác và không chứng minh tài sản đã được bố trí xong. ICPDP vẫn cần xử lý xung đột thực tế; phần CSVC ở flow 6 có quyết định và ràng buộc riêng.”

### 8. Cán bộ có thấy phản hồi ngay theo thời gian thực không? Có gửi email không?

“Dạ, dữ liệu phản hồi được ghi ngay ở server và có thông báo in-app cho cán bộ đã mời. Màn hình hiện dùng query và cập nhật cache sau thao tác; nhóm em không khẳng định có đẩy dữ liệu tức thời giữa hai trình duyệt bằng WebSocket. Khi demo đổi phiên, em tải lại màn cán bộ để xem kết quả mới. Lời mời không gửi email, và bước công bố cũng chưa gửi thông báo hàng loạt tới sinh viên.”

### 9. Phải chờ tất cả CLB đồng ý rồi mới công bố không?

“Dạ, code hiện không đặt điều kiện phải đủ toàn bộ phản hồi. ICPDP công bố khi sự kiện còn `Approved` và chưa bắt đầu. Server chuyển `Upcoming`, mở đăng ký từ thời điểm công bố đến giờ bắt đầu, đồng thời tạo mã check-in. Hạn phản hồi của CLB vẫn là deadline riêng. Việc quyết định thời điểm công bố thuộc quá trình điều phối của cán bộ.”

### 10. Chấp nhận lời mời có đi vào đánh giá CLB không?

“Dạ, kết quả `Accepted` được giữ để đọc như dữ liệu CLB tham gia hoạt động cấp trường. `mongo-evaluation-repository.ts` lấy lời mời đã chấp nhận rồi đối chiếu sự kiện thuộc kỳ đánh giá. Em sẽ tách rõ đây là tín hiệu tham gia của CLB, không phải bằng chứng mọi thành viên có mặt. Cách tính điểm và trọng số cụ thể nằm ở phần đánh giá, còn số cá nhân tham dự phải dựa vào luồng đăng ký, check-in phù hợp.”

## 6. Điểm bàn giao

“Như vậy, [flow 6](flow-06-facilities.md) giải quyết lịch tài nguyên, còn flow 11 giải quyết phản hồi phối hợp của các CLB. Sinh viên tham gia sự kiện tiếp tục dùng nghiệp vụ đã trình bày ở [flow 5](flow-05-club-events.md). Sau phần điều phối này, nhóm em chuyển sang [kinh phí — flow 7](flow-07-event-finance.md) và [báo cáo, đánh giá — flow 8](flow-08-reporting-evaluation.md).”

## 7. Nguồn đối chiếu

- [SRS](../SRS.md): UC53–UC54; BR15, BR44, BR54, BR59.
- [Phân công flow](../UC_FLOW_GROUPS.md), [phạm vi triển khai](../CURRENT_IMPLEMENTATION.md), [ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md).
- [Router](../../client/src/main.tsx), [màn sự kiện trường](../../client/src/pages/icpdp/SchoolEventsPage.tsx), [màn lời mời CLB](../../client/src/pages/club/ClubInvitationsPage.tsx), [query sự kiện trường](../../client/src/hooks/useSchoolEvents.ts).
- [Quy tắc sự kiện và deadline](../../server/src/domain/school-event.ts), [validate phản hồi](../../server/src/domain/club-invitation.ts), [quyền gửi và công bố](../../server/src/usecase/school-event.ts), [quyền phản hồi](../../server/src/usecase/club-invitation.ts).
- [Tạo, mời, thu hồi, công bố và hết hạn](../../server/src/infra/db/mongo-school-event-repository.ts), [transaction phản hồi](../../server/src/infra/db/mongo-club-invitation-repository.ts), [nguồn dữ liệu đánh giá](../../server/src/infra/db/mongo-evaluation-repository.ts).
