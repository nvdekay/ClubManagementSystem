# Flow 9 — Khiếu nại và xử lý vi phạm

**Người phụ trách:** Người 6. **UC chính:** UC50–UC52 và UC40. **UC bổ trợ:** UC03, UC05
ở phần hỏi đáp. **Thời lượng gợi ý:** 240 giây cho lời thoại và demo; Q&A ngoài thời lượng này.
Số flow theo [bản phân công bảo vệ](../UC_FLOW_GROUPS.md).

## 1. Nghiệp vụ chính

Sinh viên gửi sự việc về một CLB để ICPDP xem xét. ICPDP có thể bác bỏ, chuyển CLB trả
lời hoặc mở hồ sơ vi phạm để điều tra và xử lý. Một khiếu nại chưa đồng nghĩa với một
vi phạm; CLB trả lời khiếu nại cũng chưa phải là quyết định kết thúc của ICPDP.

| Nội dung | Cần nắm khi trình bày |
|---|---|
| Actor | Student gửi/theo dõi/rút khi đủ điều kiện; ICPDP phân loại, quyết định và xử lý vi phạm; Leader trả lời, giải trình và nộp minh chứng khắc phục |
| Điều kiện gửi | Tài khoản đã đăng nhập, không bị khoá; chọn CLB chưa `Dissolved`; nếu chọn sự kiện thì phải thuộc CLB đó |
| UC50 | Chọn CLB, loại, mô tả, liên kết chứng cứ; sự kiện tuỳ chọn → `Submitted`, luôn đến ICPDP trước |
| UC51 | Mở xử lý → `Under Triage`; quyết định có lý do → `Dismissed`, `Forwarded` hoặc `Escalated` |
| UC52 | Khi `Forwarded`, Leader có `club.complaint.respond` trả lời một lần kèm hành động → `Club Responded` |
| Kết thúc khiếu nại | ICPDP xem phản hồi rồi `Closed` hoặc `Escalated`; leo thang tạo hồ sơ UC40 `Open` liên kết với khiếu nại |
| UC40 | Điều tra, yêu cầu giải trình, ghi nhận phản hồi, ra quyết định, giao và kiểm tra biện pháp khắc phục |
| Kết quả | Khiếu nại có quyết định và lịch sử; nếu có vi phạm thì có hồ sơ, căn cứ xử lý và kết quả khắc phục |

Trạng thái khiếu nại dùng đúng tên code:

`Submitted → Under Triage → Forwarded → Club Responded → Closed / Escalated`.
Từ `Under Triage` còn có `Dismissed` hoặc `Escalated` trực tiếp. Tác giả được rút ở
`Submitted`/`Under Triage` → `Withdrawn`.

Nhánh có vi phạm thường đi:

`Open → Under Investigation → Awaiting Club Response → Decision Issued → Corrective Action → Resolved`.
Nếu kết luận không có vi phạm, ICPDP đóng hồ sơ ở `Closed` và ghi lý do. Phản hồi của CLB
được lưu trong hồ sơ; UC40 không có trạng thái tên `Club Responded` như khiếu nại.

## 2. Chuẩn bị demo

- Ba tài khoản: Student gửi đơn, ICPDP xử lý và Leader của CLB bị khiếu nại. Dùng dữ liệu
  minh hoạ không chứa thông tin cá nhân thật trong phần mô tả/chứng cứ.
- Student: `/workspace/complaints`. ICPDP: `/workspace/complaint-review`.
  Leader: `/club/:clubId/complaints`.
- Vi phạm phía ICPDP: `/workspace/violations` và `/workspace/violations/:id`;
  phía Leader: `/club/:clubId/violations`.
- Chuẩn bị một đơn `Submitted`, một đơn đã `Forwarded` và một hồ sơ `Corrective Action`
  có minh chứng để minh hoạ các bước trong 4 phút. Có thể dùng cùng tình huống qua các
  bản ghi riêng; nói rõ khi chuyển sang hồ sơ chuẩn bị sẵn, không giả vờ vừa đi hết luồng.
- Tình huống gợi ý: sinh viên phản ánh CLB thu tiền cho một hoạt động nhưng chưa giải
  thích rõ khoản thu. ICPDP chuyển hỏi CLB; sau phản hồi, nếu cần xác minh tiếp thì mở
  UC40. Nội dung, chứng cứ và kết luận đều là dữ liệu demo do nhóm chuẩn bị.
- Chuẩn bị yêu cầu giải trình có hạn còn hiệu lực, phần trả lời và một biện pháp khắc
  phục cụ thể như bổ sung biên bản/chứng từ; chọn hạn tương lai để không bị từ chối.
- Với nhánh chứng minh quyền riêng tư, mở cùng khiếu nại ở ICPDP và CLB để so sánh:
  payload CLB không có tên/email/id người khiếu nại. Không giới thiệu chức năng tự xoá
  thông tin định danh khỏi văn bản tự do hay chứng cứ, vì code không thực hiện việc đó.
- UC03 ở `/icpdp/accounts`; UC05 ở `/workspace/routing-rules`. Chỉ mở nếu hội đồng hỏi,
  không chen hai màn này vào phần demo chính.

Route được kiểm tra ở [router](../../client/src/main.tsx). Quyền trả lời và dữ liệu
được hiển thị nằm ở [ClubComplaintsPage](../../client/src/pages/club/ClubComplaintsPage.tsx).

## 3. Kịch bản thuyết trình — khoảng 240 giây

### 0–40 giây: gửi khiếu nại

“Phần của em là tiếp nhận khiếu nại và xử lý vi phạm. Điểm đầu tiên là khiếu nại luôn
được gửi tới ICPDP để xem xét trước. Sinh viên chọn CLB, chọn loại sự việc, nhập mô tả
và có thể gửi liên kết chứng cứ. Nếu sự việc gắn với một sự kiện thì chọn thêm sự kiện
của chính CLB đó. Sau khi gửi, sinh viên theo dõi trạng thái đơn của mình; CLB chưa
nhìn thấy đơn ở bước này.”

**Thao tác demo:** Mở `/workspace/complaints`, gửi nội dung mẫu hoặc mở đơn đã chuẩn bị
ở `Submitted`; chỉ CLB, mô tả và trạng thái. Chuyển sang workspace ICPDP.

### 40–85 giây: ICPDP phân loại

“ICPDP mở đơn để phân loại. Có ba hướng: bác bỏ khi không có căn cứ phù hợp, chuyển
CLB trả lời khi cần làm rõ, hoặc leo thang thành hồ sơ vi phạm. Quyết định phải có lý
do, mức độ và đánh giá tính hợp lệ. Trong tình huống này em chọn chuyển CLB, nêu nội
dung cần trả lời và đặt hạn. Đây là yêu cầu giải thích sự việc, chưa phải kết luận
CLB đã vi phạm.”

**Thao tác demo:** Mở đơn tại `/workspace/complaint-review`, chuyển `Under Triage`,
chọn `Forwarded`, nhập lý do và hạn tương lai; xác nhận kết quả.

### 85–125 giây: CLB phản hồi, ICPDP quyết định tiếp

“Leader chỉ thấy nội dung đã được ICPDP chuyển xuống cùng yêu cầu và hạn trả lời.
Hệ thống không cung cấp danh tính người khiếu nại cho CLB. Leader gửi một lần trả lời,
nêu rõ hành động xử lý và bổ sung chứng cứ nếu có. Sau đó đơn ở Club Responded, chờ
ICPDP xem lại. Nếu phản hồi giải quyết được sự việc thì ICPDP đóng đơn; nếu cần xử lý
sâu hơn thì mở hồ sơ UC40, có liên kết để theo dõi nguồn khiếu nại.”

**Thao tác demo:** Vào Leader `/club/:clubId/complaints`, chỉ việc không có trường danh
tính, gửi trả lời và hành động. Trở lại ICPDP, minh hoạ `Closed` bằng hồ sơ sẵn hoặc
chọn `Escalated` để chuyển sang UC40.

### 125–185 giây: điều tra và ra quyết định vi phạm

“Hồ sơ vi phạm mới bắt đầu ở Open. ICPDP thu thập chứng cứ và yêu cầu CLB giải trình.
Leader trả lời ở màn tuân thủ của CLB. Trước khi kết luận có vi phạm, hệ thống yêu cầu
đã ghi nhận phản hồi hoặc đã ghi nhận việc CLB không phản hồi sau hạn. Quyết định có
vi phạm phải kèm lý do và chứng cứ. Nếu điều tra không xác định có vi phạm, ICPDP có
thể đóng hồ sơ với lý do, không cần tạo biện pháp khắc phục.”

**Thao tác demo:** Mở hồ sơ liên kết trong `/workspace/violations/:id`; chỉ nguồn
`COMPLAINT`, bước điều tra và yêu cầu giải trình. Chuyển sang
`/club/:clubId/violations` để gửi phần giải trình đã chuẩn bị, rồi mở quyết định phía ICPDP.

### 185–240 giây: khắc phục và kết thúc

“Sau quyết định, ICPDP giao biện pháp khắc phục kèm hạn. CLB nộp minh chứng hoàn thành;
ICPDP kiểm tra và đánh dấu Verified hoặc Failed. Hệ thống không cho xác nhận hoàn
thành khi CLB chưa gửi minh chứng. Khi mọi biện pháp đều Verified, hồ sơ chuyển
Resolved. Lịch sử này là đầu vào tuân thủ cho đánh giá CLB ở flow 8. Nếu cần tạm ngừng
hay giải thể, ICPDP phải thực hiện riêng ở UC15; nhãn leo thang trên hồ sơ không tự
đổi trạng thái CLB.”

**Thao tác demo:** Chuyển sang hồ sơ `Corrective Action` đã chuẩn bị, mở minh chứng
và kiểm tra một biện pháp; chỉ trạng thái cuối và lịch sử. Dẫn sang
[flow 8](flow-08-reporting-evaluation.md) hoặc [flow 10](flow-10-club-lifecycle.md) khi cần.

## 4. Nhánh ngoại lệ cần giải thích

- **Rút đơn:** chỉ người gửi được rút khi còn `Submitted`/`Under Triage`. Sau quyết
  định phân loại, không có luồng tự rút để xoá kết quả xử lý.
- **Đơn trùng:** ICPDP liên kết thủ công các đơn chưa quyết định của cùng sinh viên về
  cùng CLB khi xác định cùng sự việc. Đơn theo sau dùng kết quả của đơn chính; không có
  cơ chế tự suy luận rồi xoá đơn dựa trên nội dung giống nhau.
- **CLB đã giải thể:** không nhận đơn mới về CLB `Dissolved`; nếu đơn đã tồn tại mà CLB
  giải thể trước lúc phân loại thì ICPDP ghi nhận và `Dismissed` có lý do.
- **Trả lời khiếu nại quá hạn:** job ghi tín hiệu tuân thủ và báo ICPDP một lần. Đây
  không phải tự tạo vi phạm hay tự khoá form; code vẫn chấp nhận trả lời khi đơn còn
  `Forwarded` và chưa có phản hồi.
- **Không giải trình UC40:** ICPDP chỉ ghi `NO_RESPONSE` sau hạn; từ đó có thể tiếp tục
  ra quyết định với căn cứ cần thiết. Không được dùng nhánh này trước hạn để bỏ qua CLB.
- **Khắc phục không đạt:** `Failed` được ghi khi có minh chứng để kiểm tra hoặc đã quá
  hạn mà chưa nộp. Mọi action đều `Verified` thì tự `Resolved`; nếu còn `Failed` nhưng
  không còn `Pending`, officer có thể chốt hồ sơ. `Resolved` không luôn có nghĩa tất cả
  biện pháp đều đạt, cần đọc trạng thái từng action.

## 5. Câu hỏi bảo vệ và câu trả lời

### 1. Khiếu nại khác phản hồi sự kiện thế nào?

“UC48–UC49 thu thập mức độ hài lòng sau tham dự để tổng hợp chất lượng sự kiện.
UC50–UC52 là quy trình đề nghị xử lý sự việc về CLB: có phân loại, người trả lời, hạn và
kết quả. Một điểm phản hồi thấp không tự trở thành khiếu nại hoặc hồ sơ vi phạm.”

### 2. Vì sao không gửi thẳng đơn cho CLB?

“ICPDP cần xem xét phạm vi, mức độ và căn cứ trước khi chuyển. Cách này giữ một đầu
mối xử lý, cho phép bác bỏ hoặc mở điều tra khi cần, và chỉ cung cấp nội dung cho CLB
khi đã quyết định chuyển xuống. Quyết định cuối sau phản hồi cũng vẫn thuộc ICPDP.”

### 3. CLB có xem được người gửi qua API dù UI giấu không? — kỹ thuật

“Payload dành cho CLB dùng `ComplaintForClub`, không có `complainant`. Repository dựng
đúng danh sách trường được phép trả về, còn bản dành cho ICPDP mới có tên, email và id
người gửi. Danh sách CLB cũng lọc theo `clubId` và việc đơn từng được chuyển xuống;
server kiểm tra `club.complaint.respond`, không chỉ ẩn thông tin trên giao diện.”

### 4. Có bảo đảm ẩn danh cả trong mô tả và link chứng cứ không?

“Phần định danh tài khoản không được trả cho CLB. Nội dung mô tả và chứng cứ do người
gửi nhập vẫn được chuyển theo hồ sơ; phiên bản hiện tại không tự che tên có trong văn
bản hay tài liệu. Vì vậy nhóm em chỉ khẳng định việc bảo vệ các trường danh tính do
hệ thống quản lý, không nói đã có bộ lọc tự động mọi thông tin cá nhân.”

### 5. CLB được trả lời nhiều lần để bổ sung không? — kỹ thuật

“UC52 hiện nhận một lần trả lời kèm hành động. Repository chỉ update khi đúng CLB và
trạng thái còn `Forwarded`; thành công thì chuyển `Club Responded`. Gửi lần hai không
còn khớp điều kiện nên bị từ chối. Nếu sự việc được leo thang, phần giải trình và khắc
phục diễn ra ở hồ sơ UC40, không ghi đè phản hồi khiếu nại cũ.”

### 6. Nhiều đơn cùng sự việc có tạo nhiều hồ sơ vi phạm không?

“ICPDP có thể liên kết các đơn chưa quyết định của cùng sinh viên, cùng CLB thành một
nhóm xử lý. Quyết định và phản hồi của đơn chính được áp dụng cho đơn theo sau. Hệ
thống không tự gộp mọi người khiếu nại cùng một CLB; điều kiện cùng người gửi được
kiểm tra, còn việc cùng sự việc do officer nhận định và ghi lý do.”

### 7. Mọi complaint leo thang có lập tức làm CLB bị kết tội không?

“Không ạ. Leo thang tạo hồ sơ vi phạm `Open` với nguồn `COMPLAINT` và liên kết hai
chiều, sau đó vẫn cần điều tra và giải trình. Kết luận có vi phạm phải có lý do cùng
chứng cứ. Nếu kết luận không có vi phạm, hồ sơ được `Closed`; khiếu nại và kết luận
điều tra là các mốc khác nhau.”

### 8. CLB không hợp tác có làm quy trình dừng mãi không?

“Quá hạn UC52 tạo tín hiệu báo ICPDP, không tự kết luận vi phạm. Với UC40, sau hạn
giải trình officer có thể ghi nhận `NO_RESPONSE` rồi tiếp tục xử lý. Biện pháp khắc
phục quá hạn mà chưa có minh chứng có thể bị đánh dấu `Failed`. Mỗi nhánh đều để lại
trạng thái và lịch sử, không giả định im lặng đồng nghĩa đã hoàn thành.”

### 9. Tại sao đã nộp minh chứng chưa được coi là khắc phục xong?

“Nộp minh chứng là xác nhận từ phía CLB; `Verified` là kết quả ICPDP đã kiểm tra.
Domain chặn đánh dấu Verified nếu chưa có submission. Nếu tất cả biện pháp được
Verified, hồ sơ tự Resolved; nếu có Failed thì officer cần xem kết quả từng việc và
chỉ chốt khi không còn Pending.”

### 10. Từ hồ sơ vi phạm có tự tạm ngừng CLB và giảm điểm không?

“Nhãn `linkedLifecycleAction` chỉ ghi đề xuất hướng xử lý `SUSPEND` hoặc `DISSOLVE`.
ICPDP phải thao tác UC15 riêng; hiện chưa có liên kết hai chiều tự thực thi vòng đời.
Với đánh giá, UC42 lấy lịch sử vi phạm làm dữ liệu D8 khi sinh đánh giá, không tự công
bố một điểm mới ngay sau mỗi thao tác xử lý.”

### 11. UC03 khoá tài khoản khác tạm ngừng CLB thế nào?

“Khoá tài khoản tác động một người dùng; tạm ngừng UC15 tác động hoạt động của CLB.
Ở `/icpdp/accounts`, officer khoá có lý do và có thể gắn một hồ sơ UC40 còn mở. Code
ghi audit phía tài khoản và hồ sơ vi phạm, rồi thu hồi session của người bị khoá.
Không được tự khoá chính tài khoản đang thao tác. Đây không phải cách tự thay ban
chủ nhiệm hoặc tự giải thể CLB.”

### 12. UC05 có tạo thêm cấp duyệt hoặc cho mọi officer sửa SLA không?

“Không ạ. Phiên bản hiện tại duyệt một cấp tại ICPDP; UC05 cấu hình SLA thẩm định.
Officer có thể xem và mô phỏng rule trên hồ sơ đã quyết định, nhưng chỉ người có cả
`ICPDP_HEAD` và `ICPDP_OFFICER` mới sửa/kích hoạt. Rule được đánh phiên bản, kiểm tra
chồng lấn, và bản kích hoạt áp dụng cho yêu cầu mới. Không nói UC05 tạo quy trình duyệt
hai cấp hoặc tự thay người có thẩm quyền.”

## 6. Điểm bàn giao

- [Flow 5](flow-05-club-events.md) giải thích phản hồi sự kiện, để phân biệt với khiếu nại.
- [Flow 7](flow-07-event-finance.md) có thể cung cấp nguồn ngoại lệ tài chính cho UC40.
- [Flow 8](flow-08-reporting-evaluation.md) nhận dữ liệu tuân thủ; không demo UC40 lần hai.
- [Người 2 — flow 10](flow-10-club-lifecycle.md) giải thích quyết định tạm ngừng/giải thể
  thực hiện riêng, còn quyền ban chủ nhiệm nằm ở [flow 4](flow-04-leadership-transition.md).

## 7. Nguồn đối chiếu

- [SRS](../SRS.md): UC03, UC05, UC40, UC50–UC52; BR27–BR28, BR38–BR39; SEC-09.
- [Hiện trạng triển khai](../CURRENT_IMPLEMENTATION.md) và [ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md).
- [Trạng thái và payload khiếu nại](../../server/src/domain/complaint.ts), [quyền và thao tác](../../server/src/usecase/complaint.ts), [lọc payload, đơn trùng và transaction](../../server/src/infra/db/mongo-complaint-repository.ts).
- [State machine UC40](../../server/src/domain/violation.ts), [giải trình phía CLB](../../server/src/usecase/club-violation.ts).
- [Khoá tài khoản và thu hồi session](../../server/src/usecase/account-admin.ts), [audit liên kết UC40](../../server/src/infra/db/mongo-account-admin-repository.ts).
- [Quyền cấu hình SLA](../../server/src/usecase/approval-routing.ts), [kiểm tra quy tắc](../../server/src/domain/approval-routing.ts).
