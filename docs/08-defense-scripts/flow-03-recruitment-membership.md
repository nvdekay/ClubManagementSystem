# Flow 3 — Tuyển và quản lý thành viên

**Phụ trách:** Người 1. **Phạm vi:** UC16–UC22, UC24; đi vào từ UC06. UC23 đã rút.
**Thời lượng lời thoại:** khoảng 105 giây; ưu tiên mối nối `Accepted → Onboarded`.

## Nghiệp vụ chính

- **Actor:** Club Leader mở đợt tuyển, xét đơn, đánh giá và tiếp nhận; Student ứng tuyển; Club Member xem không gian thành viên, xác nhận đầu kỳ hoặc gửi yêu cầu rời CLB.
- **Điều kiện:** CLB `Active`; đợt tuyển đã công bố và đang trong khung nhận đơn. Sinh viên không có membership `Active`, `Inactive` hoặc `Banned` tại CLB đó.
- **Tuyển chọn:** đợt tuyển `Draft → Published`; đơn `Draft → Submitted → Screening → Shortlisted → Accepted / Rejected / Waitlisted`. Các nhánh rút đơn, đẩy từ danh sách chờ và ứng viên từ chối được xử lý riêng.
- **Tiếp nhận:** `Accepted` mới là quyết định trúng tuyển. UC20 tạo membership `Active`, chuyển đơn `Onboarded` và mở quyền thành viên. Nếu ứng viên từ chối, Leader ghi nhận `Declined`.
- **Duy trì thành viên:** quản lý `Active`/`Inactive`, cấm với lý do, thực thi yêu cầu rời; xác nhận lại đầu kỳ trong 14 ngày. `Left` và `Banned` là trạng thái cuối của bản ghi membership.
- **Kết quả:** danh sách thành viên có nguồn tiếp nhận và lịch sử trạng thái; UC24 cho xem tư cách thành viên, danh sách CLB, hoạt động và nghĩa vụ liên quan.

## Chuẩn bị demo

| Màn hình | Route UI | Chuẩn bị |
|---|---|---|
| Đợt tuyển của Leader | `/club/:clubId/recruitment` | Bản nháp đầy đủ: vị trí, thời gian, chỉ tiêu, form, rubric nếu có |
| Ứng tuyển của sinh viên | `/workspace/recruitment/:campaignId` | Sinh viên đủ điều kiện, form đã điền gần xong |
| Theo dõi đơn | `/workspace/recruitment` | Có thể hiện đơn vừa nộp |
| Xét đơn và đánh giá | `/club/:clubId/recruitment/:campaignId/review` | Cùng đợt tuyển, có ứng viên `Shortlisted` để mở phần chấm điểm nhanh |
| Quản lý thành viên | `/club/:clubId/members` | Có thể tìm ứng viên sau khi tiếp nhận |
| CLB của tôi và không gian thành viên | `/workspace/clubs`, `/workspace/clubs/:clubId` | Tài khoản ứng viên sau tiếp nhận; mẫu yêu cầu rời hoặc xác nhận đầu kỳ cho Q&A |

Khung nhận đơn phải bao trọn thời điểm demo và nằm trong một học kỳ của chính sách hiệu lực.
Không chỉ nhìn nhãn `Published`: sau khi quá hạn, nhãn này có thể còn giữ nguyên nhưng nộp
đơn vẫn bị chặn. Chuẩn bị các tab theo đúng tài khoản, hoặc dùng phiên trình duyệt tách biệt.

Để đủ thời gian, trình bày trên một ứng viên chính và mở nhanh bản `Shortlisted` đã chuẩn bị
nếu không kịp thao tác qua mọi bước. Nêu rõ khi chuyển sang dữ liệu chuẩn bị, không nói đó
là kết quả của thao tác vừa làm. Form tiếp nhận từ đơn trên UI hiện dùng ngày hiện tại và
chưa có ô chọn ngày gia nhập/ban; không hứa demo hai trường đó. Thao tác hàng loạt nên chọn
các đơn cùng trạng thái vì hiện trạng ghi nhận lỗi khi trộn trạng thái.

## Kịch bản thuyết trình

**Thao tác demo:** Leader mở bản nháp đợt tuyển, chỉ chỉ tiêu, thời gian và form rồi công bố.

> “Sau khi CLB hoạt động, em mở một đợt tuyển với vị trí, chỉ tiêu, thời gian nhận đơn và
> form ứng tuyển. Khung thời gian phải nằm trong một học kỳ. Công bố xong, sinh viên có
> thể tìm thấy đợt tuyển từ trang CLB.”

**Thao tác demo:** chuyển sang sinh viên, nộp đơn; về màn xét đơn, chuyển qua sàng lọc và rút gọn.

> “Sinh viên điền và nộp đơn tại đây. Hệ thống chặn nộp trùng trong cùng đợt tuyển, chặn
> người đã là thành viên hoặc đã bị cấm ở CLB. Phía Leader, em sàng lọc rồi đưa ứng viên
> phù hợp vào danh sách rút gọn. Nếu có rubric, em chấm theo từng tiêu chí; điểm là căn cứ
> để xem xét, còn quyết định nhận, từ chối hay chờ vẫn do Leader thực hiện.”

**Thao tác demo:** mở đánh giá, quyết định nhận, chỉ `Accepted`, rồi thực hiện tiếp nhận.

> “Điểm chính của flow này là `Accepted` chưa phải thành viên. Đây mới là kết quả trúng
> tuyển. Khi CLB xác nhận tiếp nhận, hệ thống mới tạo membership `Active` và chuyển đơn
> sang `Onboarded`. Em mở danh sách thành viên để kiểm tra người vừa được tiếp nhận.”

**Thao tác demo:** mở `/workspace/clubs/:clubId` của thành viên, chỉ tư cách và yêu cầu rời.

> “Thành viên xem hoạt động và tư cách của mình ở đây. Đầu kỳ, thành viên cần xác nhận lại;
> quá hạn có thể chuyển sang `Inactive`. Khi xin rời, hệ thống tạo yêu cầu để Leader xử lý,
> chưa lập tức xoá tư cách. Phần tiếp theo sẽ giải thích cách xác nhận người điều hành và
> bàn giao nhiệm kỳ.”

## Nhánh cần giải thích

- Đủ chỉ tiêu: không nhận thêm vượt sức chứa; dùng `Waitlisted`, sau đó đẩy lên khi có suất. Số chỗ tính cả `Accepted` và `Onboarded`.
- Hết hạn hoặc CLB bị tạm ngừng: không được tiếp tục nộp mới dù vẫn mở được trang đã lưu trước đó.
- Rút đơn chỉ áp dụng trước quyết định ở `Submitted`, `Screening`, `Shortlisted`; sau `Accepted`, Leader ghi nhận ứng viên từ chối bằng `Declined`.
- Người đang giữ ghế ban chủ nhiệm đã xác nhận: có thể gửi yêu cầu rời nhưng không được thực thi thành `Left`, `Inactive` hoặc `Banned` khi ghế còn hiệu lực.
- Thành viên `Inactive` vẫn đọc UC24 và xin rời được; không tự quay lại `Active` chỉ bằng xác nhận đầu kỳ đã quá hạn.
- Huỷ đợt tuyển là `Cancelled`; `Completed` cần mọi đơn có kết quả cuối theo luồng xét và đã hết cửa sổ nhận đơn hoặc đủ chỉ tiêu.

## Câu hỏi bảo vệ và câu trả lời

### 1. Vì sao tách Accepted và Onboarded?

> “Trúng tuyển và thực sự gia nhập là hai thời điểm khác nhau. `Accepted` giữ kết quả xét
> tuyển; `Onboarded` xác nhận CLB đã tiếp nhận và tạo membership. Việc tách này xử lý được
> trường hợp ứng viên trúng tuyển nhưng từ chối mà không làm tăng sai số thành viên.”

### 2. Một sinh viên có được ứng tuyển nhiều CLB không?

> “Có, điều kiện trùng lặp được xét theo CLB và đợt tuyển. Hệ thống chặn đơn thứ hai trong
> cùng campaign, chặn người đang `Active` hoặc `Inactive` tại CLB đó, và chặn người từng bị
> `Banned` ở chính CLB đó. Đây không phải lệnh cấm tham gia tất cả CLB.”

### 3. Đợt tuyển Published có luôn nhận đơn không?

> “Không. Server còn kiểm tra thời gian nhận đơn và trạng thái CLB. Nhãn `Published` có
> thể chưa đổi ngay khi hết hạn vì đợt tuyển không có scheduler tự đóng riêng. Nhóm em dựa
> vào kiểm tra nghiệp vụ khi nộp, không dựa riêng nhãn hiển thị.”

### 4. Đánh giá có tự quyết định ứng viên được nhận không?

> “Không. Leader ghi điểm và nhận xét cho đơn `Shortlisted`, rồi ra quyết định riêng ở
> UC18. Mỗi người đánh giá có bản riêng; sau khi có quyết định, bản đánh giá bị khoá. Nếu
> không có rubric thì dùng nhận xét văn bản, không tự thêm thang điểm.”

### 5. Ứng viên được nhận rồi từ chối thì xử lý suất tuyển thế nào?

> “Leader ghi nhận đơn thành `Declined`. Suất đó không còn được tính như `Accepted` hoặc
> `Onboarded`, nên có thể đẩy ứng viên trong `Waitlisted` lên nếu còn chỗ. Hệ thống không
> tự chọn người thay thế theo điểm.”

### 6. Có tiếp nhận người không đi qua một đợt tuyển không?

> “Có nhánh UC20 A1: Leader nhập email của người đã đăng nhập hệ thống trước đó và lý do
> tiếp nhận. Tài khoản phải hoạt động; vẫn kiểm tra membership và lệnh cấm. Nhánh này có
> audit, không phải nhập một dòng vào danh sách rồi bỏ qua điều kiện.”

### 7. Inactive, Left và Banned khác nhau ra sao?

> “`Inactive` là tạm không hoạt động và có thể được Leader kích hoạt lại. `Left` kết thúc
> membership hiện tại; nếu quay lại phải tạo membership mới qua tiếp nhận. `Banned` cũng
> kết thúc membership nhưng cấm quay lại CLB đó, kể cả bằng tiếp nhận thủ công, và bắt buộc
> có lý do.”

### 8. Sinh viên bấm xin rời là mất quyền ngay không?

> “Chưa. UC22 tạo yêu cầu, còn UC21 do Leader thực thi mới chuyển sang `Left`. Người đang
> giữ ghế ban chủ nhiệm được gửi yêu cầu nhưng chưa thể rời khi ghế còn hiệu lực; cần xử
> lý việc bàn giao ghế trước. Ngày xin rời không được ở quá khứ.”

### 9. Xác nhận đầu kỳ hoạt động thế nào?

> “Job mở yêu cầu cho membership `Active` theo lịch học kỳ và hạn 14 ngày. Leader đương
> nhiệm được miễn; job cũng bảo vệ người giữ ghế ban chủ nhiệm đã xác nhận. Sinh viên tự
> xác nhận tại CLB của tôi. Quá hạn, membership chuyển `Inactive` tại thời điểm job chạy;
> muốn hoạt động lại thì Leader xử lý qua UC21.”

### 10. Về kỹ thuật, làm sao tránh một ứng viên được tiếp nhận hai lần?

> “Repository chỉ nhận đơn đang `Accepted`, kiểm tra membership hiện có và tạo membership
> cùng chuyển đơn sang `Onboarded` trong một transaction. Lệnh cập nhật còn kiểm tra trạng
> thái cũ; xung đột dữ liệu hoặc vi phạm unique index được trả về lỗi nghiệp vụ.”

### 11. Về kỹ thuật, kiểm soát chỉ tiêu có chỉ nằm ở giao diện không?

> “Không. Repository kiểm tra số đơn `Accepted` và `Onboarded` khi nhận thêm, trong luồng
> transaction xử lý quyết định. Form và nút trên UI chỉ hỗ trợ thao tác; gọi API trực tiếp
> vẫn phải qua quyền xét tuyển và quy tắc sức chứa.”

### 12. Xem danh sách thành viên có đồng nghĩa được dùng API quản lý thành viên không?

> “Không. UC24 cho membership `Active` hoặc `Inactive` đọc danh sách trong member space.
> API quản trị membership yêu cầu `club.member.manage`. Thành viên `Active` chỉ có hai
> quyền mặc định về điểm danh và xem phòng; không được sửa trạng thái thành viên khác.”

## Bàn giao

> “Như vậy, hệ thống nối từ đơn ứng tuyển đến một tư cách thành viên có lịch sử. Em bàn
> giao cho phần ban chủ nhiệm: ai được quản lý CLB, trong nhiệm kỳ nào và bàn giao trách
> nhiệm ra sao.”

Tiếp tục [flow 4 — Ban chủ nhiệm và chuyển giao nhiệm kỳ](flow-04-leadership-transition.md).
Quyền điểm danh được minh hoạ ở [flow 5](flow-05-club-events.md); phòng học ở
[flow 6](flow-06-facilities.md).

## Nguồn đối chiếu

- [SRS — UC16–UC22, UC24](../SRS.md) và [hiện trạng cùng các giới hạn UI](../CURRENT_IMPLEMENTATION.md).
- [Route UI](../../client/src/main.tsx), [màn xét tuyển](../../client/src/pages/club/RecruitmentReviewPage.tsx), [không gian thành viên](../../client/src/pages/student/MemberSpacePage.tsx).
- [Đợt tuyển](../../server/src/usecase/recruitment-campaign.ts), [nộp đơn](../../server/src/usecase/recruitment-application.ts), [xét tuyển và tiếp nhận](../../server/src/usecase/recruitment-review.ts).
- [Transaction, chỉ tiêu, membership và trạng thái đơn](../../server/src/infra/db/mongo-recruitment-application-repository.ts).
- [Đánh giá ứng viên](../../server/src/usecase/candidate-evaluation.ts).
- [Thay đổi trạng thái và yêu cầu rời](../../server/src/usecase/membership.ts), [lưu và kiểm tra membership](../../server/src/infra/db/mongo-membership-repository.ts).
- [Xác nhận đầu kỳ](../../server/src/usecase/membership-reconfirmation.ts), [job và xử lý quá hạn](../../server/src/infra/db/mongo-membership-reconfirmation-repository.ts).
- [Phạm vi UC24](../../server/src/usecase/member-space.ts) và [quyền mặc định](../../server/src/domain/access.ts).
