# Flow 10 — Tạm ngừng, kích hoạt lại và giải thể CLB

**Người phụ trách:** Người 2. **UC chính:** UC14–UC15. **UC bổ trợ:** UC04 trong Q&A.
**Thời lượng gợi ý:** 90 giây cho lời thoại và demo, không tính Q&A.
Số flow theo [bản phân công bảo vệ](../UC_FLOW_GROUPS.md).

## 1. Nghiệp vụ chính

Leader đề nghị tạm ngừng kèm kế hoạch xử lý nghĩa vụ; ICPDP quyết định tạm ngừng, kích
hoạt lại hoặc lập lịch giải thể. Trạng thái CLB quyết định hoạt động nào được phép mở
mới, còn lịch sử và nghĩa vụ đã có vẫn phải được theo dõi.

| Nội dung | Cần nắm khi trình bày |
|---|---|
| Actor | Leader có `club.suspension.request` nộp UC14; ICPDP quyết định UC15; job vòng đời xử lý mốc thời gian |
| Điều kiện UC14 | CLB đang `Active`; có lý do, ngày kết thúc tương lai, kế hoạch nghĩa vụ, kế hoạch phục hồi và xác nhận các hoạt động bị ảnh hưởng |
| Nộp yêu cầu | Yêu cầu `Pending`; CLB chưa tự chuyển `Suspended` |
| Quyết định | ICPDP chấp nhận → yêu cầu `Approved`, CLB `Suspended`; từ chối → yêu cầu `Rejected`, CLB giữ trạng thái |
| Tạm ngừng | Huỷ các đề xuất đang chờ thẩm định, sự kiện tương lai đã duyệt và booking tương lai đã duyệt; giải phóng buổi phòng học tương lai; chặn hoạt động mới theo quy tắc |
| Kích hoạt lại | `Suspended → Active`, giữ lịch sử; sự kiện/booking đã huỷ không tự khôi phục |
| Giải thể | Ghi lịch từ học kỳ kế tiếp, chưa đổi trạng thái ngay; tới đầu kỳ → `Dissolving`, tới cuối kỳ → `Dissolved` |
| Kết quả | Quyết định có lý do/lịch sử, hệ quả với hoạt động liên quan, và hồ sơ nghĩa vụ chưa hoàn thành khi đóng CLB |

Mốc giải thể phải nói đúng: quyết định trong học kỳ A chọn học kỳ B kế tiếp theo lịch
UC04. CLB bước vào `Dissolving` khi B bắt đầu và `Dissolved` khi B kết thúc. Ngay lúc
ra quyết định, hệ thống huỷ các đề xuất/sự kiện/booking thuộc phạm vi cascade mà kết
thúc sau cuối B. Nếu trước quyết định CLB đang `Suspended`, việc lập lịch giải thể
không tự kích hoạt lại CLB.

## 2. Chuẩn bị demo

- Leader: `/club/:clubId/suspension-requests`. ICPDP duyệt yêu cầu tại
  `/workspace/suspension-requests`, quản lý vòng đời tại `/icpdp/clubs`.
- Chuẩn bị một CLB `Active`, một yêu cầu `Pending`, sự kiện/booking tương lai và một
  đợt tuyển còn mở để minh hoạ tác động khác nhau. Dữ liệu ví dụ cần thuộc môi trường
  demo, vì thao tác duyệt tạm ngừng thực sự huỷ các hoạt động liên quan.
- Form UC14 cần kế hoạch nghĩa vụ và kế hoạch phục hồi, không chỉ lý do. UI hiện yêu
  cầu tích xác nhận ngay cả khi danh sách ảnh hưởng rỗng; hoàn tất bước này trước khi nộp.
- Chuẩn bị một CLB `Suspended` nếu muốn minh hoạ kích hoạt lại, và một CLB đã có
  `dissolution` để chỉ học kỳ/mốc thời gian mà không phải chờ job.
- Kiểm tra `/workspace/policy` có lịch học kỳ tiếp theo trước khi demo giải thể. Không
  có kỳ tương lai thì server từ chối; không tự chọn “sau 30 ngày” hoặc ngày nhập tuỳ ý.
- Chỉ rõ ngân sách chưa đối soát trong hộp quản lý CLB. Đây là cảnh báo và nghĩa vụ cần
  xử lý, không giới thiệu thành cơ chế cấm tuyệt đối quyết định giải thể.

Các route đối chiếu tại [router](../../client/src/main.tsx); màn quản lý vòng đời là
[IcpdpClubsPage](../../client/src/pages/icpdp/IcpdpClubsPage.tsx).

## 3. Kịch bản thuyết trình — khoảng 90 giây

### 0–30 giây: yêu cầu và quyết định tạm ngừng

“Sau phần ban chủ nhiệm, em trình bày trạng thái hoạt động của CLB. Leader có thể xin
tạm ngừng, nhưng phải nêu thời hạn, kế hoạch xử lý nghĩa vụ và cách phục hồi. Hệ thống
cho xem các sự kiện, booking sẽ bị ảnh hưởng để Leader xác nhận. Nộp yêu cầu chỉ tạo
hồ sơ chờ; CLB chuyển Suspended khi ICPDP chấp nhận.”

**Thao tác demo:** Mở yêu cầu UC14 đã chuẩn bị, chỉ kế hoạch và danh sách ảnh hưởng;
chuyển ICPDP `/workspace/suspension-requests`, duyệt hoặc mở quyết định đã có.

### 30–55 giây: tác động và kích hoạt lại

“Tạm ngừng chặn mở tuyển, nộp đề xuất sự kiện và booking mới. Đợt tuyển đang mở được
giữ lại nhưng sinh viên không thể ứng tuyển trong thời gian CLB bị tạm ngừng. Các
hoạt động tương lai thuộc diện huỷ được xử lý theo quyết định. Khi kích hoạt lại,
CLB trở về Active; các sự kiện và booking đã huỷ không tự phục hồi.”

**Thao tác demo:** Mở CLB ở `/icpdp/clubs`, chỉ `Suspended` và lịch sử; dùng CLB đã
chuẩn bị để minh hoạ thao tác kích hoạt lại có lý do.

### 55–90 giây: lịch giải thể và nghĩa vụ

“Giải thể có lộ trình theo học kỳ. Quyết định hôm nay chưa đổi trạng thái ngay. Đầu
học kỳ kế tiếp CLB chuyển Dissolving để hoàn tất việc còn lại; cuối học kỳ đó mới
Dissolved. Hệ thống cảnh báo ngân sách chưa đối soát, giữ nghĩa vụ chưa hoàn thành
trong hồ sơ lưu trữ và thu hồi quyền quản lý khi đóng CLB. Vì vậy giải thể không làm
mất lịch sử tài chính hay trách nhiệm đã phát sinh.”

**Thao tác demo:** Mở CLB có lịch giải thể, chỉ `effectiveSemester`, mốc bắt đầu/kết
thúc và cảnh báo ngân sách. Dùng trạng thái đã chuẩn bị, không chờ scheduler tại buổi bảo vệ.

## 4. Nhánh ngoại lệ và tác động cần nói rõ

- Chỉ `Active` được tạm ngừng; chỉ `Suspended` được kích hoạt lại. Giải thể nhận
  `Active` hoặc `Suspended` chưa có quyết định giải thể. Quyết định cần lý do.
- Yêu cầu UC14 hết ngày kết thúc hoặc không còn `Pending` không được duyệt lại.
- ICPDP có thể chủ động tạm ngừng tại UC15, không bắt buộc phải có đơn UC14. Tạm ngừng
  có ngày kết thúc được job kích hoạt lại khi đến hạn; không có ngày kết thúc thì chờ
  ICPDP chủ động kích hoạt lại.
- Trong `Dissolving`, không mở tuyển hay nộp đề xuất sự kiện mới; booking CSVC mới vẫn
  được nhận nếu đáp ứng điều kiện và kết thúc trong học kỳ giải thể. Không nói “cấm
  mọi booking khi đang giải thể”.
- Bước đóng cuối kỳ huỷ đề xuất chưa quyết định, gồm `Draft`, và booking chưa quyết
  định; đóng đợt tuyển/nhiệm kỳ, kết thúc assignment quản lý, lưu nghĩa vụ chưa hoàn
  thành. Không khẳng định ngân sách tự được đối soát hoặc nợ tự được xoá.
- Nếu bước đóng thất bại, transaction rollback, CLB còn `Dissolving` và ICPDP được
  cảnh báo. Đây là lỗi cần xử lý, không phải một CLB đã giải thể thành công.

## 5. Câu hỏi bảo vệ và câu trả lời

### 1. Leader có tự tạm ngừng được CLB không?

“Leader chỉ nộp UC14, gồm lý do, thời hạn và kế hoạch xử lý. ICPDP ra quyết định UC15;
chỉ khi duyệt thì trạng thái CLB mới đổi. ICPDP cũng có thể quyết định chủ động dựa
trên tình hình quản lý, không cần luôn có một yêu cầu từ Leader.”

### 2. Vì sao giữ đợt tuyển đang mở khi tạm ngừng?

“Đó là hành vi đã chốt của bản hiện tại: đợt tuyển giữ trạng thái, nhưng thao tác ứng
tuyển bị chặn theo trạng thái CLB. Nó khác với huỷ đợt tuyển. Khi kích hoạt lại, vẫn
phải xét cửa sổ thời gian và các điều kiện của đợt tuyển, không mặc nhiên gia hạn ngày
đóng đơn.”

### 3. Tạm ngừng có huỷ mọi sự kiện và toàn bộ dữ liệu CLB không?

“Không. Cascade nhắm vào đề xuất đang chờ thẩm định, sự kiện tương lai đã duyệt,
booking tương lai đã duyệt và các buổi phòng học tương lai. Lịch sử hoạt động đã diễn
ra vẫn giữ. Nếu sự kiện bị huỷ đã có tạm ứng, nghĩa vụ quyết toán còn tiếp tục ở flow
7; tạm ngừng không coi số tiền đó là đã xử lý xong.”

### 4. Kích hoạt lại có khôi phục sự kiện, booking và phòng học không?

“Không ạ. Kích hoạt lại đổi trạng thái CLB về Active và ghi lịch sử. Các quyết định
huỷ trước đó vẫn giữ nguyên; muốn tổ chức lại phải thực hiện thủ tục phù hợp. Các
buổi phòng học đã giải phóng cần ICPDP phân lại ở UC58.”

### 5. Tạm ngừng có ngày kết thúc có tự trở lại Active không? — kỹ thuật

“Có. `runClubLifecycleJob` đọc các tạm ngừng đã hết hạn rồi gọi `reactivate` với actor
hệ thống; tạm ngừng không có ngày kết thúc phải do ICPDP mở lại. Đây là một job theo
thời gian, nên demo dùng dữ liệu đã chuẩn bị thay vì sửa đồng hồ hoặc chờ tới hạn.”

### 6. Chọn Giải thể thì bao giờ CLB ngừng tồn tại? — kỹ thuật

“Hàm `nextSemester` chọn kỳ có ngày bắt đầu sớm nhất nhưng sau thời điểm ra quyết
định. Usecase lưu `effectiveFrom` và `effectiveTo` từ kỳ đó, chưa đổi trạng thái ngay.
Job chuyển Dissolving khi tới `effectiveFrom`, rồi đóng tại `effectiveTo`. Vì vậy phải
đọc lịch học kỳ, không nói giải thể ngay hoặc tính một số ngày cố định từ quyết định.”

### 7. Trong học kỳ Dissolving, CLB còn được làm gì?

“CLB tập trung hoàn tất hoạt động và nghĩa vụ đã có, không mở tuyển hoặc nộp đề xuất
sự kiện mới. Booking CSVC mới là ngoại lệ được cho phép nếu vẫn nằm trong giới hạn
học kỳ giải thể và đủ điều kiện booking. Quyền nộp báo cáo, giải trình và xử lý nghĩa
vụ còn cần thiết cho việc đóng CLB.”

### 8. Còn nợ ngân sách thì hệ thống có chặn giải thể không?

“Hiện tại hệ thống cảnh báo ngân sách chưa đối soát khi ra quyết định. Đến bước đóng
cuối kỳ, nghĩa vụ chưa hoàn thành được lưu vào `dissolution.outstanding`, không tự
biến thành đã thanh toán và cũng không âm thầm biến mất. Không nên trình bày cảnh báo
này thành điều kiện chặn tuyệt đối vì code không thực hiện như vậy.”

### 9. Job lỗi giữa lúc giải thể thì dữ liệu có đóng một nửa không? — kỹ thuật

“Bước hoàn tất chạy một transaction riêng cho từng CLB. Việc đổi trạng thái, huỷ các
yêu cầu còn mở, đóng nhiệm kỳ, kết thúc quyền quản lý và lưu nghĩa vụ thuộc cùng bước;
lỗi thì rollback, CLB giữ Dissolving. Kết quả lỗi được báo cho ICPDP; cơ chế cảnh báo
giới hạn một lần mỗi ngày cho cùng CLB và bước để tránh gửi lặp.”

### 10. UC04 và hồ sơ vi phạm UC40 liên quan gì tới quyết định này?

“UC04 cung cấp lịch học kỳ để tính mốc giải thể và các chính sách, deadline có thể cấu
hình trên màn `/workspace/policy`. Không phải mọi hằng số nghiệp vụ đều sửa được ở
đây; chẳng hạn domain email cho đăng nhập lấy từ env. UC40 có thể là căn cứ xem xét
tạm ngừng/giải thể, nhưng nhãn `linkedLifecycleAction` chưa tự chạy UC15 và chưa liên
kết hai chiều. Officer thực hiện quyết định vòng đời riêng, có lý do.”

## 6. Điểm bàn giao

- Nối từ [flow 4](flow-04-leadership-transition.md): người điều hành phải có quyền hợp
  lệ, đồng thời CLB phải ở trạng thái cho phép hoạt động.
- [Flow 3](flow-03-recruitment-membership.md), [flow 5](flow-05-club-events.md) và
  [flow 6](flow-06-facilities.md) giải thích tác động đến tuyển, sự kiện và cơ sở vật chất.
- Nghĩa vụ còn lại tham chiếu [flow 7](flow-07-event-finance.md) và
  [flow 8](flow-08-reporting-evaluation.md).
- Căn cứ xử lý vi phạm do [Người 6 — flow 9](flow-09-complaints-violations.md) trình bày;
  không nói UC40 tự thay trạng thái CLB.

## 7. Nguồn đối chiếu

- [SRS](../SRS.md): UC04, UC14–UC15, BR09–BR10, BR34, BR44–BR45, vòng đời CLB §6.
- [Hiện trạng triển khai](../CURRENT_IMPLEMENTATION.md) và [ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md).
- [Dữ liệu yêu cầu tạm ngừng](../../server/src/domain/suspension-request.ts), [xử lý UC14](../../server/src/usecase/suspension-request.ts).
- [Lịch và trạng thái vòng đời](../../server/src/domain/club-lifecycle.ts), [quyết định và job](../../server/src/usecase/club-lifecycle.ts), [cascade và transaction](../../server/src/infra/db/mongo-club-lifecycle-repository.ts).
- [Điều kiện booking khi Dissolving](../../server/src/domain/facility-booking.ts), [dữ liệu chính sách](../../server/src/domain/policy.ts), [màn chính sách](../../client/src/pages/icpdp/PolicyPage.tsx).
