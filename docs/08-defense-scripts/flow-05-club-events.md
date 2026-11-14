# Flow 5 — Tổ chức, tham gia và tổng kết sự kiện CLB

| Nội dung | Phạm vi |
|---|---|
| Người trình bày | Người 3 |
| Use case | UC25–UC34, UC48–UC49 |
| Thời lượng gợi ý | 240 giây cho lời thoại và thao tác chính; Q&A dùng riêng khi hội đồng hỏi |
| Thông điệp chính | Theo dõi được một hoạt động từ đề xuất, quyết định, người tham dự đến dữ liệu điểm danh và báo cáo cuối cùng |

## 1. Nghiệp vụ cốt lõi

**Club Leader** lập, nộp, công bố và điều chỉnh sự kiện; nộp báo cáo sau sự kiện và xem tổng hợp phản hồi. **ICPDP Officer** thẩm định đề xuất và báo cáo ở một cấp. **Student** đăng ký, check-in và gửi phản hồi cho hoạt động đã tham dự. Riêng quản lý sức chứa, danh sách chờ, check-in thủ công và chốt điểm danh thuộc tập quyền cố định của mọi **Club Member có membership `Active`**, nên Leader cũng thực hiện được. Chức danh “điều phối sự kiện” không tự tạo thêm quyền quản trị.

Để bắt đầu, CLB phải `Active`, người nộp có `club.event.manage`, lịch sự kiện nằm gọn trong một học kỳ và đáp ứng thời gian báo trước. Server kiểm tra địa điểm, xung đột và nghĩa vụ quá hạn khi công tắc cưỡng chế được bật. Phần ngân sách, nếu có, nằm trong cùng đề xuất; booking CSVC liên quan vẫn cần quyết định riêng.

Luồng chính bắt đầu từ `Draft → Pending Approval`. ICPDP nhận hồ sơ, thẩm định ở `Under Review`, rồi duyệt, yêu cầu chỉnh sửa hoặc từ chối. Hồ sơ được duyệt mới công bố thành `Upcoming`. Sinh viên đăng ký trong cửa sổ đăng ký; danh sách xác nhận và danh sách chờ được quản lý theo sức chứa. Tại sự kiện, check-in tạo dữ liệu có mặt. Sau khi sự kiện `Completed`, CLB xử lý bất thường và chốt điểm danh. Leader lập báo cáo, ICPDP thẩm định để đóng sự kiện ở `Closed`, hoặc trả báo cáo về để bổ sung.

UC48–UC49 chạy theo điều kiện tham dự: người đã check-in có thể phản hồi ngay từ thời điểm check-in đến khi cửa sổ phản hồi đóng. Phản hồi là một điểm tổng 1–5 kèm nhận xét; Leader chỉ xem dữ liệu tổng hợp đủ ngưỡng ẩn danh. Đây là đầu vào cải thiện hoạt động, không phải workflow khiếu nại.

## 2. Chuẩn bị demo

Chuẩn bị ba phiên đăng nhập: Leader của một CLB `Active`, ICPDP Officer và một sinh viên. Có thể dùng thêm phiên Member `Active` để chứng minh quyền điểm danh. Không cần đổi vai trò trên cùng tài khoản trong lúc trình bày.

| Màn hình đã có trong router | Dữ liệu cần chuẩn bị |
|---|---|
| `/club/:clubId/events` | Đề xuất nháp với mục tiêu, kế hoạch, thời gian tương lai, địa điểm, sức chứa; một hồ sơ có lịch sử trả sửa; một hồ sơ đã `Approved` để công bố |
| `/workspace/event-proposals` và `/workspace/event-proposals/:id` | Hồ sơ chờ ICPDP nhận; có phần ngân sách nếu muốn minh hoạ số xin và số duyệt |
| `/events/:id` | Sự kiện `PUBLIC`, `Upcoming`, đang mở đăng ký; có một bản gần đầy để minh hoạ danh sách chờ |
| `/workspace/event-registrations` | Một đăng ký `Confirmed` đang trong khung check-in; một lượt tham dự chưa gửi phản hồi |
| `/club/:clubId/event-attendance` | Một sự kiện `Completed` có bản ghi bất thường đã chuẩn bị và một sự kiện đã đủ điều kiện chốt |
| `/club/:clubId/event-reports` và `/workspace/event-reports` | Sự kiện `Completed` đã chốt điểm danh; báo cáo nộp sẵn để ICPDP thẩm định |
| `/club/:clubId/event-feedback` | Một sự kiện đủ số phản hồi tối thiểu và một sự kiện chưa đủ ngưỡng |
| `/workspace/event-proposals/:id/defense` | Chỉ dùng nếu mở nhánh bảo vệ: buổi bảo vệ hợp lệ, tài khoản ICPDP và hồ sơ đúng trạng thái |

Thay `:clubId` và `:id` bằng ID lấy từ giao diện. Các tên như “Workshop kỹ năng làm việc nhóm” chỉ là tên minh hoạ, không khẳng định dữ liệu seed có sẵn. Chuẩn bị nhiều hồ sơ ở các mốc thời gian khác nhau; khi chuyển hồ sơ, nói rõ đang minh hoạ giai đoạn kế tiếp. Không chờ scheduler hoặc đổi giờ hệ thống để làm một sự kiện đi qua toàn bộ vòng đời trong bốn phút.

Kiểm tra trước ngày demo các khung đăng ký, check-in, hạn sửa và feedback window. Khung check-in do CLB đặt khi công bố, mặc định theo giờ bắt đầu/kết thúc sự kiện; không dùng một “mốc 15 phút” cố định. Nếu demo đủ chỗ rồi vào danh sách chờ, phải chuẩn bị chính sách không cho overbooking và bật waitlist.

Điểm cần nói đúng với bản hiện tại: công bố không gửi thông báo hàng loạt tới sinh viên; feedback không chấm theo nhiều tiêu chí. Live Defense Room là màn hỗ trợ cán bộ xem hồ sơ, ghi chú và điều khiển trạng thái buổi bảo vệ trực tiếp, không phải phòng gọi video. Một số câu “Club Member/CMB” trong phần tóm tắt cũ của SRS chưa phản ánh rõ quyền hiện hành; đối chiếu bảng actor UC và code: Member quản lý điểm danh, Leader quản lý đề xuất, báo cáo và feedback.

## 3. Kịch bản thuyết trình

### 0:00–0:25 — Nêu bài toán và phạm vi

“Ở phần này, em trình bày vòng đời một sự kiện do CLB tổ chức. Trước đây, đề xuất, danh sách đăng ký và báo cáo có thể nằm ở nhiều nơi. Nhóm em nối các bước đó vào cùng hồ sơ, để biết sự kiện đã được duyệt thế nào, ai thực sự tham dự và kết quả cuối cùng ra sao.”

**Thao tác demo:** Mở `/club/:clubId/events`, chọn hồ sơ nháp đã chuẩn bị; chỉ vào mục tiêu, lịch, phạm vi đối tượng và sức chứa.

### 0:25–1:05 — Nộp đề xuất và quyết định

“Leader nhập kế hoạch, địa điểm và phần kinh phí nếu cần, rồi nộp đề xuất. Hệ thống kiểm tra điều kiện của CLB, lịch học kỳ và xung đột trước khi gửi sang ICPDP. Cán bộ nhận hồ sơ để thẩm định. Ở đây có thể yêu cầu sửa, từ chối hoặc phê duyệt; lý do và phiên bản được giữ lại. Nếu có ngân sách, số được duyệt lưu riêng với số CLB đã xin. Nhà trường chỉ có một cấp phê duyệt.”

“Trường hợp cần trao đổi trực tiếp, cán bộ có thể xếp lịch bảo vệ trong giai đoạn này. Đây là một nhánh thẩm định, không phải cấp duyệt thứ hai.”

**Thao tác demo:** Nộp nháp hợp lệ, chuyển sang ICPDP tại `/workspace/event-proposals/:id`, nhận hồ sơ và chỉ vào lịch sử/nhận xét. Dùng hồ sơ đã chuẩn bị đủ nội dung để ra quyết định. Chỉ chỉ vào khu vực lịch bảo vệ; không mở toàn bộ nhánh này trong thời lượng chính.

### 1:05–1:35 — Công bố và mở đăng ký

“Sau khi được duyệt, Leader mới công bố. Lúc này CLB đặt khung đăng ký và check-in. Sinh viên mở chi tiết sự kiện để đăng ký; còn chỗ thì nhận `Confirmed`, hết chỗ và có danh sách chờ thì nhận `Waitlisted`. Công bố, đăng ký và check-in là ba bước riêng: đăng ký mới thể hiện dự định tham gia.”

**Thao tác demo:** Tại hồ sơ `Approved`, mở form công bố và chỉ các khung giờ. Chuyển sang sinh viên tại `/events/:id`, gửi form đăng ký rồi mở `/workspace/event-registrations` để xem kết quả.

### 1:35–2:15 — Danh sách chờ và xác nhận có mặt

“CLB theo dõi số đã xác nhận và thứ tự danh sách chờ tại đây. Khi có suất trống trong thời gian đăng ký, người đầu danh sách được đẩy lên; không chọn một người bất kỳ để bỏ qua thứ tự. Khi đến sự kiện, sinh viên nhập mã check-in trong khung giờ cho phép. Hệ thống ghi nhận một lần có mặt. Mọi Member đang `Active` của CLB đều có quyền hỗ trợ điểm danh, nhưng không vì thế được sửa đề xuất.”

**Thao tác demo:** Mở `/club/:clubId/event-attendance`, chỉ thứ tự waitlist của hồ sơ sắp diễn ra. Sau đó chuyển sang hồ sơ đang mở check-in; nhập mã tại `/workspace/event-registrations`, chỉ thời điểm ghi nhận. Có thể nhấn lại để minh hoạ không tạo bản ghi thứ hai.

### 2:15–2:50 — Chốt dữ liệu tham dự

“Tiếp theo là hồ sơ đã kết thúc em chuẩn bị trước. Hệ thống phân biệt người có mặt với người đăng ký nhưng vắng mặt; các trường hợp check-in thủ công hoặc bất thường cần được xác nhận kèm lý do. Khi đã xử lý hết, CLB chốt điểm danh. Bộ dữ liệu này bị khoá và trở thành căn cứ chính thức cho báo cáo, nên không thể vừa báo cáo xong vừa tự ý thay số người tham dự.”

**Thao tác demo:** Chọn sự kiện `Completed`, mở bản ghi cần hiệu chỉnh, chỉ trường lý do, hoàn tất rồi chốt điểm danh. Chỉ trạng thái đã chốt và thao tác sửa không còn khả dụng.

### 2:50–3:30 — Báo cáo sau sự kiện

“Leader chỉ soạn được báo cáo khi sự kiện đã hoàn tất và điểm danh đã chốt. Báo cáo lấy dữ liệu liên quan, bổ sung kết quả so với mục tiêu, minh chứng, sự cố và bài học. Khi nộp, số liệu được chụp lại theo phiên bản. ICPDP đối chiếu kế hoạch với thực tế rồi chấp nhận để đóng sự kiện, hoặc trả về để sửa. Nếu có phát hiện vi phạm, kết quả còn nối sang phần tuân thủ.”

**Thao tác demo:** Mở `/club/:clubId/event-reports`, chọn sự kiện đủ điều kiện và chỉ dữ liệu nạp sẵn. Chuyển `/workspace/event-reports`, mở báo cáo đã nộp, chỉ quyết định và trạng thái kết thúc.

### 3:30–4:00 — Phản hồi và bàn giao

“Người đã check-in được gửi điểm hài lòng từ 1 đến 5 kèm nhận xét. Leader chỉ xem tổng hợp khi đủ số phản hồi tối thiểu, và không thấy danh tính người gửi. Như vậy, sự kiện kết thúc với cả dữ liệu tham dự và bài học cải thiện. Phần địa điểm sẽ nối sang quản lý CSVC; phần tiền đã duyệt sẽ được trình bày tiếp ở luồng kinh phí và quyết toán.”

**Thao tác demo:** Chỉ form phản hồi ở mục đã tham dự của `/workspace/event-registrations`, sau đó mở `/club/:clubId/event-feedback` với bản đủ ngưỡng. Nếu còn thời gian, đổi sang bản chưa đủ ngưỡng để thấy nội dung bị ẩn.

## 4. Các nhánh nên chuẩn bị để trả lời

| Tình huống | Cách giải thích và kết quả cần chỉ ra |
|---|---|
| Hồ sơ bị trả sửa | `Revision Requested` giữ nhận xét và hạn bổ sung; nộp lại tạo bản sửa mới. Hết hạn sửa thì thao tác lưu/nộp bị từ chối, scheduler xử lý `Expired`. Nếu còn lịch bảo vệ hiệu lực, bản nộp lại có thể vào thẳng `Under Review`. |
| Nội bộ không ngân sách | `MEMBERS_ONLY` và không có dòng ngân sách được ghi nhận thẳng `Approved`, có audit; vẫn kiểm tra điều kiện CLB, lịch và xung đột. Không sinh nghĩa vụ báo cáo sau sự kiện; chốt điểm danh thì `Closed`. Booking đính kèm vẫn cần UC46. |
| Huỷ hoặc đổi lịch | Cần lý do. `Ongoing` còn có thể huỷ nếu chưa chốt điểm danh, nhưng không đổi lịch. Đổi lịch chỉ áp dụng `Approved`/`Upcoming`, chưa check-in; sự kiện thông thường quay lại thẩm định, booking tương lai được giải phóng. |
| Đầy chỗ, giảm sức chứa hoặc đẩy waitlist sai thứ tự | Không có overbooking thì không vượt sức chứa; không giảm dưới số `Confirmed`. Việc đẩy waitlist chỉ trong cửa sổ đăng ký và chỉ chọn đầu hàng. |
| Check-in sai mã, ngoài giờ hoặc chưa xác nhận | Server từ chối. Walk-in chỉ khi sự kiện cho phép; check-in thủ công ngoài giờ cần lý do và vẫn chịu các kiểm tra đối tượng/sức chứa. |
| Chưa xử lý hết bất thường | Chốt điểm danh bị từ chối, chỉ rõ người cần xử lý. Mở khoá cần vai trò `ATTENDANCE_UNLOCK` và lý do; lịch sử báo cáo đã nộp có thể chặn mở khoá. |
| Thiếu dữ liệu phản hồi | Dưới ngưỡng, không trình bày điểm trung bình, phân bố hoặc nội dung nhận xét. Đủ ngưỡng vẫn không có danh tính người phản hồi trong bản tổng hợp của CLB. |

## 5. Q&A bảo vệ

### 1. Tại sao tách duyệt đề xuất, công bố, check-in và chốt điểm danh?

“Dạ, mỗi bước xác nhận một việc khác nhau. Duyệt xác nhận kế hoạch được phép tổ chức; công bố mở thông tin và cách tham gia; check-in ghi nhận từng người có mặt; chốt điểm danh xác nhận bộ số liệu chính thức. Nếu gộp các bước, một người đăng ký nhưng vắng mặt có thể bị tính thành đã tham dự, hoặc kế hoạch vừa duyệt đã xuất hiện khi CLB chưa chuẩn bị xong.”

### 2. Ai được quản lý sự kiện? Member có chốt điểm danh được không?

“Dạ có. Leader có `club.event.manage`, `club.report.submit` và `club.feedback.view`. Mọi membership `Active` có `club.attendance.manage`, nên được xử lý danh sách chờ và điểm danh. Đây là quyền cố định của hệ thống, không do Leader gán theo chức danh.” Code kiểm tra ở `usecase/club-event.ts`, chọn permission theo hành động; việc ẩn nút trên client chỉ hỗ trợ trải nghiệm, không thay kiểm tra quyền server.

### 3. Có phải mọi sự kiện đều cần ICPDP phê duyệt và nộp báo cáo?

“Dạ không. Theo BR53, sự kiện nội bộ `MEMBERS_ONLY` không có dòng ngân sách được ghi nhận thẳng `Approved`. Hệ thống vẫn giữ đề xuất và audit để nhà trường theo dõi. Khi kết thúc và chốt điểm danh, sự kiện đóng luôn. Nếu có ngân sách, dù chỉ dành cho thành viên, vẫn đi qua UC26 và báo cáo theo luồng thông thường.” Nhánh này nằm ở `submitVersion` trong `mongo-club-event-repository.ts`; việc đóng sau điểm danh nằm ở `event-attendance-actions.ts`.

### 4. Bảo vệ đề xuất có phải một cấp duyệt bổ sung? Live Defense Room làm được gì?

“Dạ, bảo vệ là nhánh trao đổi trực tiếp trong UC26; quyết định phía trường vẫn ở một cấp ICPDP. Cán bộ xếp phòng `ROOM`, CLB xác nhận hoặc xin dời lịch. Màn Live Defense Room hỗ trợ xem hồ sơ, ghi chú và theo dõi buổi bảo vệ. Sau khi kết thúc mới quyết định, có thể cho bảo vệ lại. Bản hiện tại không có gọi video hay WebSocket; hook `useEventDefense.ts` lấy lại dữ liệu buổi bảo vệ bằng polling mỗi 3 giây.” Khi lịch còn hiệu lực, server khoá các quyết định kết thúc hồ sơ theo quy tắc BR63.

### 5. Vì sao duyệt sự kiện không đồng thời duyệt phòng hoặc ngân sách thực chi?

“Dạ, UC26 quyết định kế hoạch và số kinh phí được cấp, còn UC46 quyết định quyền sử dụng tài sản ở lịch cụ thể. Việc đã được cấp kinh phí cũng chưa có nghĩa tiền đã được chuyển hoặc mọi khoản chi đều hợp lệ. Tạm ứng, chứng từ, đối soát và hoàn trả thuộc flow 7. Tách các quyết định giúp việc cấp tài nguyên có căn cứ và người chịu trách nhiệm rõ ràng.”

### 6. Hai sinh viên cùng đăng ký suất cuối thì xử lý thế nào?

“Dạ, server không chỉ đọc số chỗ rồi cộng bằng một lần ghi khác. `mongo-event-registration-repository.ts` dùng `findOneAndUpdate` có điều kiện số `Confirmed` nhỏ hơn `capacity`, rồi tăng bộ đếm trong transaction. Khi chính sách không cho overbooking, chỉ thao tác lấy được suất mới trở thành `Confirmed`; người còn lại vào waitlist nếu được bật. Unique index theo cặp sự kiện–sinh viên chặn đăng ký trùng, nhưng không thay thế kiểm tra sức chứa.”

### 7. Có thể đẩy người quen ở cuối danh sách chờ lên trước không?

“Dạ không. `promoteEventWaitlist` lấy đầu hàng theo `waitlistPosition` và kiểm tra ID được yêu cầu có đúng người đó không. Việc đẩy lên chỉ thực hiện khi sự kiện `Upcoming`, chưa bắt đầu, đang mở đăng ký và còn suất. Với sự kiện nội bộ, hệ thống còn kiểm tra lại membership; người không còn đủ điều kiện bị loại khỏi hàng chờ có audit. Huỷ một suất xác nhận có thể kích hoạt đẩy đầu hàng tự động trong những điều kiện này.”

### 8. Check-in hai lần hoặc ngoài giờ có làm tăng số người tham dự không?

“Dạ, check-in lại trả bản ghi đầu tiên, không tạo lần có mặt thứ hai. Tự check-in cần đúng mã, đúng cửa sổ và đăng ký `Confirmed`, trừ trường hợp cho phép walk-in. Khi ngoài khung giờ, thành viên có quyền điểm danh chỉ có thể xử lý thủ công kèm lý do. Vì mã có thể được chia sẻ, bản hiện tại không khẳng định xác minh vị trí GPS hay nhận diện khuôn mặt; các trường hợp bất thường còn phải được rà soát trước khi chốt.”

### 9. Vì sao phải chốt điểm danh trước cả khi soạn báo cáo?

“Dạ, báo cáo cần một bộ dữ liệu tham dự đã được xác nhận. `assertReportSubmission` trong `domain/post-event-report.ts` kiểm tra sự kiện `Completed`, đã chốt điểm danh và không thuộc ngoại lệ nội bộ miễn báo cáo; repository cũng áp dụng điều kiện này khi tạo nháp. Khi nộp, hệ thống giữ snapshot và version để đối chiếu về sau. Mở khoá điểm danh không phải quyền mặc định của Leader, và code còn từ chối nếu đã có lịch sử báo cáo nộp, chấp nhận hoặc trả sửa.”

### 10. Huỷ sự kiện có xoá hết nghĩa vụ tài chính không?

“Dạ không. Booking chưa diễn ra được giải phóng, người đăng ký được thông báo, nhưng tiền đã tạm ứng vẫn phải quyết toán. Ngân sách chưa tạm ứng có thể chuyển `Cancelled`; đã tạm ứng thì tiếp tục xử lý chứng từ và khoản cần thu hồi. Huỷ sát giờ hiện chỉ có cờ `isLateCancellation`, chưa tự mở hồ sơ vi phạm hoặc tự đưa cờ đó vào điểm đánh giá.”

### 11. Feedback có thật sự ẩn danh? Có sửa hoặc xoá được không?

“Dạ, phía CLB chỉ nhận bản tổng hợp không kèm danh tính. Dưới số phản hồi tối thiểu, điểm và nhận xét đều bị ẩn để giảm khả năng suy ra người gửi. Phản hồi được gắn với người tham dự ở phía server để bảo đảm đúng một lượt và đủ điều kiện; vì vậy nhóm em không gọi đây là dữ liệu hoàn toàn không có liên kết danh tính trong toàn hệ thống. Người dùng gửi một lần, không sửa hoặc xoá. Bản hiện tại dùng một điểm `overall` nguyên từ 1 đến 5 và bắt buộc nhận xét.”

### 12. Feedback mở lúc nào và khác khiếu nại như thế nào?

“Dạ, feedback mở ngay khi người đó check-in, không đợi chốt điểm danh. Nếu chính sách có giới hạn, cửa sổ đóng sau giờ kết thúc sự kiện cộng `feedbackWindowHours`; server kiểm tra thời gian khi gửi. Feedback dùng để đo sự hài lòng và rút kinh nghiệm. Khiếu nại ở UC50–UC52 có hồ sơ, người xử lý và quyết định riêng, luôn gửi ICPDP trước; một nhận xét chưa tốt không tự biến thành hồ sơ vi phạm.”

## 6. Điểm bàn giao

“Phần của em kết thúc ở dữ liệu sự kiện đã được xác nhận. Tiếp theo, phần [CSVC — flow 6](flow-06-facilities.md) giải thích việc xin tài sản và phân phòng. Ngân sách được duyệt sẽ nối sang [kinh phí và quyết toán — flow 7](flow-07-event-finance.md). Dữ liệu hoạt động và mức hài lòng là đầu vào của [đánh giá CLB — flow 8](flow-08-reporting-evaluation.md); nếu có phát hiện cần xử lý chính thức thì chuyển sang [khiếu nại và vi phạm — flow 9](flow-09-complaints-violations.md).”

## 7. Nguồn đối chiếu

- [SRS](../SRS.md): UC25–UC34, UC48–UC49; BR17–BR22, BR31, BR35–BR40, BR53–BR55, BR63.
- [Phân công flow](../UC_FLOW_GROUPS.md), [phạm vi triển khai](../CURRENT_IMPLEMENTATION.md), [ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md).
- [Router client](../../client/src/main.tsx), [màn sự kiện CLB](../../client/src/pages/club/ClubEventsPage.tsx), [đăng ký và tham dự của sinh viên](../../client/src/pages/student/MyEventRegistrationsPage.tsx), [hook buổi bảo vệ](../../client/src/hooks/useEventDefense.ts).
- [Kiểm tra quyền sự kiện](../../server/src/usecase/club-event.ts), [đề xuất và vòng đời](../../server/src/infra/db/mongo-club-event-repository.ts), [quy tắc công bố](../../server/src/domain/club-event-rules.ts).
- [Ghi đăng ký và sức chứa](../../server/src/infra/db/mongo-event-registration-repository.ts), [thứ tự waitlist](../../server/src/infra/db/event-waitlist.ts), [check-in](../../server/src/usecase/event-checkin.ts), [chốt và hiệu chỉnh điểm danh](../../server/src/infra/db/event-attendance-actions.ts).
- [Điều kiện báo cáo](../../server/src/domain/post-event-report.ts), [ghi báo cáo](../../server/src/infra/db/mongo-post-event-report-repository.ts), [quy tắc phản hồi](../../server/src/domain/event-feedback.ts), [đọc dữ liệu sự kiện và tổng hợp](../../server/src/infra/db/club-event-readers.ts).
