# Flow 6 — Quản lý cơ sở vật chất và phân phòng học

| Nội dung | Phạm vi |
|---|---|
| Người trình bày | Người 4 |
| Use case | UC44–UC47, UC58 |
| Thời lượng gợi ý | 150 giây; dành 90 giây còn lại của Người 4 cho flow 11 |
| Thông điệp chính | Cấp đúng tài sản, đúng lịch, giữ lịch sử quyết định và giải phóng tài nguyên khi không còn sử dụng |

## 1. Nghiệp vụ cốt lõi

**ICPDP Officer** quản lý danh mục tài sản, giờ được sử dụng và khoảng khoá bảo trì; thẩm định yêu cầu ngoài `ROOM` và trực tiếp phân phòng học theo kỳ. **Club Leader** gửi, sửa, theo dõi và huỷ yêu cầu thuộc CLB. **Club Member có membership `Active`** được xem phòng đã phân cho đúng CLB, nhưng không được tự xin phòng học hoặc gửi booking tài sản chỉ vì là thành viên.

Hai nhánh có đầu vào và cách quyết định khác nhau:

| Nhánh | Dòng nghiệp vụ |
|---|---|
| `HALL`, `OUTDOOR`, `STAGE`, `EQUIPMENT` | Leader chọn tài sản hoạt động, ngày và một slot, mục đích, số người, thiết bị kèm theo; có thể gắn sự kiện của CLB. Lưu `Draft`, nộp thành `Requested`; ICPDP nhận hồ sơ thành `Under Review`, rồi `Approved`, `Revision Requested` hoặc `Rejected`. |
| `ROOM` | ICPDP chọn học kỳ, CLB, phòng, thứ và slot. Hệ thống tính các buổi còn ở tương lai, bỏ ngày blackout, kiểm tra xung đột từng buổi rồi tạo toàn bộ booking `Approved` trong một transaction. Không có đơn xin phòng và không qua hàng đợi UC46. |

CLB nhận tài sản phải `Active`, hoặc `Dissolving` trong phạm vi học kỳ được phép đóng việc. Tài sản phải đang hoạt động; lịch phải nằm trong học kỳ và giờ được đặt. Booking ngoài `ROOM` phải khớp trọn một slot campus, không nhập khoảng giờ tuỳ ý.

Kết quả là một lịch sử dụng có căn cứ. Với booking đã duyệt, scheduler chuyển `Approved → In Use → Completed` theo giờ. Khi còn đủ điều kiện huỷ, Leader giải phóng nhu cầu; việc huỷ hoặc đổi lịch sự kiện giải phóng các booking tương lai liên quan. Với phòng học, ICPDP thu hồi đợt phân, chỉ giải phóng buổi chưa bắt đầu và giữ buổi cũ làm lịch sử.

## 2. Chuẩn bị demo

Chuẩn bị tài khoản ICPDP Officer, Leader của CLB `Active` và một Member `Active` để mở lịch phòng chỉ đọc. Chuẩn bị danh mục có ít nhất một tài sản ngoài `ROOM` và một phòng học; giờ được đặt phải phủ đúng thứ/slot sẽ demo.

| Route đã có | Dữ liệu cần chuẩn bị |
|---|---|
| `/workspace/properties` | Tài sản đang hoạt động với loại, vị trí, sức chứa, thiết bị, khung giờ; một khoảng blackout minh hoạ |
| `/club/:clubId/bookings` | Booking nháp hợp lệ trong tương lai; một booking `Requested`; một booking `Approved` chưa bắt đầu để minh hoạ huỷ |
| `/workspace/bookings` | Hồ sơ không xung đột để nhận và duyệt; một hồ sơ phát sinh xung đột sau khi nộp để giải thích trả sửa |
| `/workspace/room-allocations` | Học kỳ chưa kết thúc, phòng `ROOM`, lưới thứ × slot; có lịch trống và một ô bị chiếm |
| `/club/:clubId/rooms` | Đợt phân phòng còn các buổi sắp tới để Leader hoặc Member xem |

Các slot theo UTC+7: slot 1 **07:30–09:50**, slot 2 **10:00–12:20**, slot 3 **12:50–15:10**, slot 4 **15:20–17:40**. Trong ngày sử dụng, slot 1–2 phải tạo/sửa/nộp trước 07:30; slot 3 trước 09:50; slot 4 trước 12:20. Đúng mốc là quá hạn. Chọn ngày tương lai khi tập demo để tránh vượt hạn giữa chừng.

Điểm cần trình bày theo code hiện tại:

- Khi nộp UC45, `mongo-facility-booking-repository.ts` đã chặn `Blocking Conflict` nếu chính sách cấm overbooking. Vì vậy không hứa rằng mọi yêu cầu xung đột đều nộp được để chờ ICPDP giải quyết; câu UC45 E1 trong SRS mô tả rộng hơn hành vi này. UC46 vẫn kiểm tra lại để bắt xung đột phát sinh sau lần nộp.
- Tài sản mới có mã tự sinh và ở trạng thái hoạt động. Tài sản đã có booking không xoá được; nên minh hoạ ngừng hoạt động bằng bản riêng nếu cần.
- Phương án thay thế ở UC46 hiện được thể hiện bằng thông tin đề xuất; không có thao tác tự động chấp nhận rồi dời toàn bộ lịch. Leader sửa và nộp lại.
- “Trả tài sản” trong phần này là giải phóng booking trước khi sử dụng theo điều kiện hệ thống. Không trình bày như một nghiệp vụ kiểm kê bàn giao thiết bị, bồi thường hư hỏng hoặc trả sớm giữa trạng thái `In Use`.

## 3. Kịch bản thuyết trình

### 0:00–0:25 — Phân biệt hai loại cấp tài nguyên

“Em tiếp tục với cơ sở vật chất. Hệ thống có hai cách cấp tài nguyên: hội trường, sân, sân khấu và thiết bị đi qua yêu cầu của Leader; phòng học được ICPDP phân theo lịch tuần của học kỳ. Cách tách này phản ánh nhu cầu: một bên phục vụ từng hoạt động, một bên là lịch sinh hoạt ổn định của CLB.”

**Thao tác demo:** Mở `/workspace/properties`, chỉ cột loại tài sản, sức chứa và lịch được đặt; chọn một tài sản ngoài `ROOM`.

### 0:25–1:05 — Gửi yêu cầu và thẩm định

“Leader chọn ngày và một slot, nhập mục đích, số người cùng sự kiện liên quan nếu có. Server kiểm tra tài sản còn hoạt động, giờ cho phép, blackout và xung đột. Yêu cầu hợp lệ được gửi tới ICPDP. Cán bộ nhận hồ sơ, xem tình trạng CLB và lịch rồi duyệt, trả sửa hoặc từ chối, luôn kèm lý do. Duyệt kế hoạch sự kiện trước đó chưa có nghĩa booking này đã được duyệt.”

**Thao tác demo:** Tại `/club/:clubId/bookings`, mở nháp, chỉ ngày/slot và gửi. Chuyển sang `/workspace/bookings`, nhận hồ sơ không xung đột, nhập lý do rồi duyệt; chỉ trạng thái `Approved`.

### 1:05–1:30 — Theo dõi và giải phóng tài sản

“Booking đã duyệt giữ lịch sử dụng, và hệ thống chuyển trạng thái theo thời gian thực tế. Nếu chưa sử dụng mà CLB không cần nữa, Leader huỷ kèm lý do để giải phóng lịch. Khi sự kiện bị huỷ hoặc đổi lịch, booking tương lai liên quan cũng được giải phóng. Tới `In Use` hoặc `Completed` thì không còn thao tác huỷ thủ công này.”

**Thao tác demo:** Chỉ một booking tương lai tại trang CLB và mở hộp thoại huỷ để thấy trường lý do. Dùng bản demo riêng nếu thực hiện huỷ; không huỷ hồ sơ vừa dùng để minh hoạ cho phần khác.

### 1:30–2:10 — Phân phòng theo học kỳ

“Với phòng học, cán bộ chọn học kỳ, CLB, phòng, thứ và slot. Hệ thống kiểm tra từng buổi còn lại của học kỳ. Ngày blackout được bỏ qua; nếu một buổi hợp lệ trùng lịch đã có thì từ chối cả đợt, tránh phân được vài tuần rồi thất bại ở các tuần khác. Khi phân thành công, mỗi ngày có một booking đã duyệt. Phòng học không có ngoại lệ đặt trùng.”

**Thao tác demo:** Mở `/workspace/room-allocations`, chọn phòng và học kỳ, chỉ lưới chiếm dụng. Phân một mẫu tuần trống đã chuẩn bị, xem danh sách buổi tạo ra.

### 2:10–2:30 — Xem kết quả và nối sang sự kiện trường

“Mọi thành viên đang hoạt động của CLB đều xem được lịch phòng này để biết nơi sinh hoạt và xuất trình khi nhận chìa khoá. Nếu cần thay đổi, ICPDP thu hồi các buổi chưa bắt đầu rồi phân lại; lịch sử vẫn được giữ. Tiếp theo, em chuyển sang một nhiệm vụ điều phối khác của ICPDP: tổ chức sự kiện cấp trường và mời các CLB phối hợp.”

**Thao tác demo:** Chuyển sang Member, mở `/club/:clubId/rooms`, chỉ thứ, slot, phòng, toà nhà và các ngày sắp tới; sau đó mở màn chuẩn bị cho flow 11.

## 4. Nhánh thay thế và lỗi đáng trình bày

| Tình huống | Kết quả và cách tiếp tục |
|---|---|
| Leader chọn `ROOM` để gửi booking | Server từ chối; phòng học do ICPDP phân ở UC58. Không đổi loại tài sản để đi vòng. |
| Booking vượt blackout hoặc ngoài giờ được đặt | Bị từ chối; chọn ngày/slot hợp lệ khác. Chính sách overbooking không bỏ qua blackout. |
| Số người lớn hơn sức chứa | Có cảnh báo để ICPDP cân nhắc, không đồng nghĩa với tự chấp nhận hay tự từ chối mọi trường hợp. |
| Có booking khác được duyệt sau khi nộp | UC46 kiểm tra lại khi quyết định. Không có lý do overbooking phù hợp thì có thể trả `Revision Requested`; Leader chọn lịch khác và nộp version mới. |
| Xin đặt trùng ngoài `ROOM` | Chỉ được duyệt khi chính sách cho phép và officer nhập riêng `overbookingReason`; lưu cả lý do và xung đột. |
| Một ngày trong đợt phân phòng bị trùng | Từ chối cả đợt và liệt kê xung đột; chọn phòng/thứ/slot khác. Blackout là ngày được bỏ qua, khác xung đột khiến cả đợt thất bại. |
| CLB bị tạm ngừng hoặc có lịch giải thể | `Suspended` không nhận booking mới. `Dissolving` chỉ được đặt trong phạm vi học kỳ cho phép; không hứa mọi CLB đang đóng hoạt động đều bị chặn cùng một cách. |
| Đã đến giờ sử dụng | Booking `Approved` đã tới giờ bắt đầu cũng không được huỷ thủ công chỉ vì scheduler chưa đổi nhãn thành `In Use`. |

## 5. Q&A bảo vệ

### 1. Vì sao `ROOM` khác hội trường và thiết bị?

“Dạ, phòng học phục vụ mẫu sinh hoạt lặp theo tuần nên nhà trường phân cho cả học kỳ. Hội trường, sân hoặc thiết bị thường gắn một nhu cầu cụ thể nên Leader gửi yêu cầu từng slot. Trong code, `assertRequestableProperty` từ chối `ROOM` ở luồng booking. Đây là hai quy trình nghiệp vụ riêng, không chỉ là hai bộ lọc trên cùng form.”

### 2. Duyệt sự kiện rồi tại sao còn phải duyệt booking?

“Dạ, được phép tổ chức không bảo đảm tài sản còn trống ở lịch yêu cầu. UC26 thẩm định nội dung và kinh phí; UC46 xét nguồn lực, xung đột và điều kiện sử dụng. Booking có thể liên kết với sự kiện để đối chiếu, nhưng mỗi bên có trạng thái và quyết định riêng. Sự kiện nội bộ miễn thẩm định cũng không được miễn quyết định booking.”

### 3. Tại sao kiểm tra lịch lúc tạo yêu cầu vẫn chưa đủ?

“Dạ, giữa lúc nộp và lúc duyệt có thể có hồ sơ khác được chấp nhận. Vì vậy quyết định duyệt phải kiểm tra lại dữ liệu hiện tại. `mongo-facility-booking-repository.ts` dùng transaction, tăng `__v` của property và CLB để các thao tác ghi cùng phạm vi được tuần tự hoá, rồi mới kiểm tra lại và ghi quyết định. Unique index đơn thuần không diễn tả được mọi khoảng thời gian chồng nhau.”

### 4. Bật overbooking thì được đặt trùng mọi tài sản không?

“Dạ không. Ngoại lệ này chỉ áp dụng tài sản ngoài `ROOM`, và vẫn cần ICPDP nhập lý do riêng khi duyệt trùng. Blackout luôn chặn. Phân phòng học UC58 không có ngoại lệ đặt trùng; bất kỳ ngày nào xung đột cũng làm cả đợt bị từ chối. Quy tắc không chỉ nằm ở giao diện mà được kiểm tra phía server.”

### 5. Slot có được nhập giờ linh hoạt hoặc nối hai slot không?

“Dạ, một yêu cầu hiện phải khớp trọn một trong bốn slot campus Hoà Lạc. `bookingSlot` so cả giờ, phút, giây và ngày theo UTC+7; một khoảng tự nhập lệch slot sẽ bị từ chối. Mỗi slot có hạn tạo/sửa/nộp trong ngày riêng, đúng mốc là hết hạn. ICPDP vẫn có thể duyệt sau hạn nộp nếu slot chưa bắt đầu. Bản hiện tại chưa hỗ trợ slot 5 hoặc 6.”

### 6. Phân cả học kỳ có thể tạo được một nửa rồi lỗi không?

“Dạ, `mongo-room-allocation-repository.ts` kiểm tra tất cả ngày trong đợt, sau đó tạo các booking và audit trong cùng transaction. Có một xung đột thì toàn bộ thao tác thất bại, không để lại một đợt phân dở dang. Phần tính lịch chỉ lấy các buổi chưa bắt đầu trong học kỳ; ngày blackout được bỏ qua ngay ở bước lập kế hoạch. Nhóm em cần MongoDB replica set để dùng transaction khi chạy.”

### 7. Ai được xem phòng đã phân? Có phải Leader cấp quyền cho từng người không?

“Dạ, mọi thành viên có membership `Active` của đúng CLB được xem qua `club.room.view` mặc định; không cần Leader gán từng người. Trang là chỉ đọc. Việc phân và thu hồi thuộc ICPDP; việc gửi booking ngoài phòng học cần `club.booking.manage` của Leader. Một Member biết URL quản lý cũng không vượt được kiểm tra quyền server.”

### 8. Huỷ, trả và thu hồi khác nhau thế nào? Có trả sớm khi đang dùng không?

“Dạ, Leader huỷ booking ngoài `ROOM` ở `Requested` hoặc `Approved` chưa bắt đầu, kèm lý do; trạng thái thành `Cancelled`. Khi sự kiện bị huỷ hoặc đổi lịch, hệ thống giải phóng booking liên quan theo điều kiện vòng đời, dùng `Released`. Với đợt phân phòng, ICPDP thu hồi và chỉ chuyển buổi tương lai từ `Approved` sang `Released`. Bản hiện tại không cho huỷ hay trả thủ công booking `In Use` hoặc `Completed`.”

### 9. Ngừng hoạt động hoặc xoá tài sản có làm mất lịch cũ không?

“Dạ, tài sản đã từng có booking bị từ chối xoá; cán bộ có thể ngừng hoạt động để không phát sinh yêu cầu mới. Các quyết định đã có vẫn được giữ. Khi thêm blackout bảo trì, hệ thống hiển thị những lịch bị ảnh hưởng để cán bộ xử lý, không khẳng định rằng việc sửa danh mục đã tự huỷ mọi booking cũ. UCMS chỉ quản lý tài sản nhà trường mở cho hoạt động CLB, không thay toàn bộ hệ thống phòng học của trường.”

### 10. Nếu SRS nói xung đột để ICPDP quyết định mà demo không nộp được thì sao?

“Dạ, nhóm em trình bày đúng hành vi của bản đang chạy: server hiện từ chối nộp khi kết quả là `Blocking Conflict`. Bản nháp vẫn giúp CLB sửa lịch; muốn đi tiếp thì phải chọn phương án hợp lệ. Trường hợp xung đột phát sinh sau khi đã nộp vẫn được UC46 xử lý lúc duyệt. Đây là điểm diễn đạt UC45 trong SRS cần làm rõ; nhóm em không dùng một demo khác với code để che sự khác biệt.”

## 6. Điểm bàn giao

“CSVC đã làm rõ nguồn lực của hoạt động ở [flow 5](flow-05-club-events.md). Em chuyển tiếp sang [sự kiện cấp trường — flow 11](flow-11-school-events.md), nơi ICPDP chủ động tạo sự kiện và mời CLB. Nếu hội đồng hỏi ảnh hưởng của tạm ngừng hoặc giải thể tới booking, nhóm em nối sang [vòng đời CLB — flow 10](flow-10-club-lifecycle.md).”

## 7. Nguồn đối chiếu

- [SRS](../SRS.md): UC44–UC47, UC58; BR15, BR33–BR35, BR41, BR45, BR54, BR62.
- [Phân công flow](../UC_FLOW_GROUPS.md), [phạm vi triển khai](../CURRENT_IMPLEMENTATION.md), [ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md).
- [Router](../../client/src/main.tsx), [danh mục tài sản](../../client/src/pages/icpdp/PropertiesPage.tsx), [booking CLB](../../client/src/pages/club/ClubBookingsPage.tsx), [thẩm định booking](../../client/src/pages/icpdp/BookingReviewPage.tsx), [phân phòng](../../client/src/pages/icpdp/RoomAllocationsPage.tsx), [phòng của CLB](../../client/src/pages/club/ClubRoomsPage.tsx).
- [Quy tắc slot và booking](../../server/src/domain/facility-booking.ts), [kiểm tra quyền booking](../../server/src/usecase/facility-booking.ts), [transaction và quyết định booking](../../server/src/infra/db/mongo-facility-booking-repository.ts).
- [Tính lịch phòng](../../server/src/domain/room-allocation.ts), [quyền phân và xem phòng](../../server/src/usecase/room-allocation.ts), [transaction phân/thu hồi phòng](../../server/src/infra/db/mongo-room-allocation-repository.ts), [huỷ sự kiện liên quan](../../server/src/infra/db/event-cancellation.ts).
