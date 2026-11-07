# Hiện trạng triển khai và ánh xạ use case

> Đối chiếu `main` tại `655cad3` (code) ngày 17/10/2026. Đây là nguồn hiện hành để
> đọc phạm vi **đã có trong code**. `SRS.md` mô tả phạm vi nghiệp vụ đích; các tài liệu kế hoạch
> theo wave và review issue chỉ giữ giá trị lịch sử.

## 1. Mô hình truy cập phía CLB

Code theo đúng BR47, BR54, BR55 của SRS hiện hành — hai role cố định (`server/src/domain/access.ts`):

- **Club Leader**: membership `Active`, giữ ghế Chủ nhiệm (`isLeaderRole`) hoặc Phó chủ nhiệm
  (`isBoardSeat` với mã `VICE_LEADER`/`VICE`) đã được ICPDP xác nhận (`confirmedBy`) trong nhiệm kỳ
  `Active` còn hiệu lực. Có toàn bộ 15 permission của danh mục cố định (`CLUB_PERMISSIONS`).
- **Club Member**: mọi membership `Active` khác. Có hai permission mặc định `club.attendance.manage`
  (UC30, UC32) và `club.room.view` (UC58); ngoài ra chỉ xem và tham gia.
- **Chức danh khác** (Trưởng ban, Thủ quỹ…, kể cả ghế ban điều hành khác đã xác nhận): chỉ để hiển thị,
  không cấp permission (BR55). Không có RBAC tuỳ biến theo CLB.
- **Approved founder khi CLB `Pending Setup`**: chỉ có `club.profile.manage` và
  `club.board.nominate` — quy tắc tương thích cho dữ liệu cũ; UC08 hiện tạo CLB `Active` nên không
  CLB mới nào rơi vào trường hợp này.

Workspace CLB trong `/auth/me` mang `role = "leader"` chỉ khi người dùng giữ ghế Chủ nhiệm / Phó chủ
nhiệm hợp lệ. UC23 đã rút: API `/clubs/:clubId/roles*`, `/clubs/:clubId/role-directory`, trang
`/club/:clubId/roles` và resolver permission theo role đã gỡ khỏi code ngày 07/11/2026; quyền
`club.role.manage` bị xoá khỏi danh mục. Phiên bản cơ cấu `ROLE_EDIT` / `MIGRATION` ghi trong lúc UC23 còn
trong code (07/11/2026) vẫn nằm trong lịch sử, không ảnh hưởng quyền.

## 2. Ánh xạ theo actor

Ma trận đủ 56 mã UC với link route/UI: [UC_CODE_MAPPING.md](05-implementation/UC_CODE_MAPPING.md).
Danh mục có 56 mã, **55 trong phạm vi**: UC05, UC51, UC52 được khôi phục; UC23 đã rút theo quyết
định role cố định. Số này không phải số UC đã hoàn thành.

Ký hiệu: **Có** = route/use case/UI hiện hành; **Một phần** = có một phía hoặc còn thiếu nhánh
nghiệp vụ; **Chưa làm** = thuộc phạm vi nhưng code chưa theo kịp mô hình đã duyệt.

| Actor | Use case | Hiện trạng |
|---|---|---|
| Mọi user | UC01 đăng nhập Google | Có; cần nghiệm thu callback Google thật |
| Mọi user | UC02 dashboard | Có; từ 19/10 có danh sách sự kiện nội bộ cho ICPDP và lịch sử cơ cấu/ban chủ nhiệm theo CLB (ICPDP và Club Leader) |
| Student | UC06 khám phá CLB/sự kiện | Có; Guest xem được danh bạ/chi tiết (chỉ đọc), ứng tuyển/đăng ký mới yêu cầu đăng nhập; E1 gợi ý CLB mới nhất (19/10) |
| Student | UC07 hồ sơ thành lập CLB | Có; hồ sơ quá hạn sửa tự chuyển `Expired`; còn QA Cloudinary thật và dọn asset mồ côi |
| Student | UC17 ứng tuyển thành viên | Một phần; thành viên `Inactive` vẫn nộp được (E3/BR13) |
| Club Member | UC21 A2 tái xác nhận thành viên đầu kỳ | Có, tại `/workspace/clubs`; quá hạn chuyển `Inactive`, Leader kích hoạt lại qua UC21 |
| Student | UC29 đăng ký sự kiện | Có |
| Student | UC31 check-in | Có |
| Student | UC48 phản hồi sự kiện | Có; một điểm tổng (chấm theo tiêu chí ngoài phạm vi) |
| Student | UC50 khiếu nại | Có (07/11/2026), tại `/workspace/complaints`: chọn CLB (bắt buộc), sự kiện (tuỳ chọn), loại, mô tả, liên kết chứng cứ; luôn gửi ICPDP (BR38); theo dõi trạng thái, rút khi chưa có quyết định; ICPDP gộp tay khiếu nại cùng sự việc của cùng sinh viên về cùng CLB (UC50 E1) |
| Club Member | UC22 xin rời CLB | Có; sinh viên theo dõi yêu cầu rời ở dashboard và trang "CLB của tôi" (19/10) |
| Club Member | UC24 member space | Có |
| Club Member | Xem danh sách thành viên | Có, qua `member-space`; không truy cập API quản trị `/memberships` |
| Club Member | UC58 xem phòng được phân | Có (07/11/2026): mọi thành viên `Active` có `club.room.view` mặc định (BR54); tạo booking UC45 vẫn cần `club.booking.manage` |
| Club Member | UC30 danh sách chờ, UC32 chốt điểm danh | Có (07/11/2026): mọi thành viên `Active` có `club.attendance.manage` mặc định (BR54); payload lược nội dung quản trị sự kiện |
| Club Leader | UC09 hồ sơ/cơ cấu CLB | Có; GET và mutation đều yêu cầu `club.profile.manage` |
| Club Leader | UC10 đề cử ban chủ nhiệm | Một phần; CLB không thấy trạng thái/lý do trả lại |
| Club Leader | UC12 lập kế hoạch chuyển giao | Có, tại `/club/:clubId/transition-plans` (A2 đổi danh sách ghế ngoài phạm vi) |
| Club Leader | UC14 xin tạm ngừng | Có, tại `/club/:clubId/suspension-requests`, kèm xác nhận sự kiện/booking bị ảnh hưởng |
| Club Leader | UC16, UC18–UC21 tuyển và quản lý thành viên | Có, gồm job tái xác nhận đầu kỳ UC21 A2 (Leader được miễn); UC20 A1 tiếp nhận thủ công (email + lý do) có từ 17/10 |
| Club Leader | UC23 quản lý role và phân quyền | **Đã rút** (SRS hiện hành, role cố định); code UC23 đã gỡ 07/11/2026 |
| Club Leader | UC25, UC27, UC28, UC30, UC32 sự kiện | Có |
| Club Leader | UC33 báo cáo sau sự kiện | Có |
| Club Leader | UC36 khoản chi/quyết toán | Có, đã nối vào app chính; chứng từ bắt buộc (BR25), hạn hoàn trả 7 ngày (BR58) |
| Club Leader | UC38 báo cáo định kỳ | Có, tại `/club/:clubId/periodic-reports`; mỗi lần nộp lưu snapshot riêng |
| Club Leader | UC40 giải trình và khắc phục vi phạm | Có, tại `/club/:clubId/violations` |
| Club Leader | UC43 xem kết quả đánh giá | Có, tại `/club/:clubId/evaluations`; chỉ thấy kết quả `Published` |
| Club Leader | UC45, UC47 booking ngoài `ROOM` | Có |
| Club Leader | UC49 xem tổng hợp feedback | Có; điểm tổng kèm trung bình và phân bố (tổng hợp theo tiêu chí ngoài phạm vi) |
| Club Leader | UC52 trả lời khiếu nại được chuyển xuống | Có (07/11/2026), tại `/club/:clubId/complaints` (`club.complaint.respond`): chỉ thấy khiếu nại đã `Forwarded`, không bao giờ thấy danh tính người khiếu nại (D5); trả lời một lần kèm hành động; quá hạn có tín hiệu tuân thủ |
| ICPDP | UC03, UC04 tài khoản/chính sách | Có; UC03 chưa nối khoá tài khoản với hồ sơ UC40 |
| ICPDP | UC08, UC11, UC13, UC15 vòng đời CLB | Có; UC13/UC15 nhận đầu vào UC12/UC14 từ phía CLB; UC15 duyệt yêu cầu tại `/workspace/suspension-requests`; UC15 giải thể dọn việc còn mở, lưu nghĩa vụ tồn đọng và cảnh báo đối soát (A1 liên kết hồ sơ UC40 ngoài phạm vi) |
| ICPDP | UC26, UC34, UC35 | Có route/UI và đã nối vào app chính |
| ICPDP | UC37 đối soát | Có, đã nối vào app chính; A2 đối soát tối đa bằng số đã tạm ứng, không cấp bù |
| ICPDP | UC39–UC44, UC46 | Có; vòng trả sửa–nộp lại UC38/UC39 chạy end-to-end; UC42 **Một phần** (nguồn dữ liệu bản nháp); UC43 có (E1 khiếu nại kết quả ngoài phạm vi) |
| ICPDP | UC05 định tuyến phê duyệt | Có (07/11/2026), tại `/workspace/routing-rules`: bộ rule đánh phiên bản `Draft → Active`, từ chối rule chồng nhau, mô phỏng trên hồ sơ đã quyết định; UC08/UC26/UC46 khớp rule cần cấp 2 do `ICPDP_HEAD` quyết định (cấp kèm `ICPDP_OFFICER`, D1); cấp 1 duyệt không có hiệu lực cuối |
| ICPDP | UC51 phân loại khiếu nại | Có (07/11/2026), tại `/workspace/complaint-review`: mở xem xét, quyết định Dismissed / Forwarded (kèm hạn trả lời) / Escalated (mở hồ sơ UC40 liên kết hai chiều), lý do bắt buộc; sau khi CLB trả lời thì đóng hoặc leo thang. Kết quả đi vào UC42 qua hồ sơ vi phạm (D8) |
| ICPDP | UC53 sự kiện cấp trường | Có |
| Club Leader | UC54 phản hồi lời mời | Có, tại `/club/:clubId/invitations`; từ chối phải kèm lý do |
| ICPDP | UC55 xuất dữ liệu | Có |
| ICPDP/Club Member | UC58 phân/xem phòng học theo học kỳ | Có; mọi thành viên `Active` xem được (`club.room.view`) |

## 3. Khoảng trống phải xử lý

Đã sửa ngày 07/11/2026: mỗi lần người dùng đã đăng nhập bị 403 vì thiếu quyền được ghi một dòng
`auditLogs` `ACCESS_DENIED` (SEC-08, AC17), xem `.sdd/specs/feat-forbidden-access-audit`.

UC12, UC14, UC21 A2, UC36–UC38, UC40, UC43, UC54 và job hết hạn hồ sơ UC07/08 đã hoàn thành
ngày 15/10/2026; `655cad3` (16/10) vá các lỗ hổng tìm thấy khi đi hết luồng nghiệp vụ. Kiểm toán
ngày 17/10/2026 còn ghi nhận các luồng thiếu dưới đây (chưa sửa).

Đã sửa ngày 17/10/2026 (nhánh `agent/fix-business-gaps`): panel sự kiện nội bộ UC02 đếm sự kiện
`MEMBERS_ONLY`; BR21 coi kỳ đã quá hạn mà CLB chưa mở báo cáo là nghĩa vụ quá hạn
([periodic-report-obligations.ts](../server/src/infra/db/periodic-report-obligations.ts), chỉ tính kỳ
bắt đầu sau khi CLB được tạo); UC17 E3 chặn cả thành viên `Inactive`; UC35 từ chối tạm ứng có ngày
chi sau khi sự kiện kết thúc; UC10 chặn một người ở hai ghế; trang sự kiện CLB nêu rõ nghĩa vụ quá
hạn, số đăng ký bị ảnh hưởng và số xung đột (UC25 E2, UC30 E1). Cũng ngày 17/10: UC06 cho Guest xem
trang khám phá; UC20 A1 tiếp nhận thủ công (`POST /clubs/:clubId/memberships`, xem
`.sdd/specs/feat-manual-onboarding`).

Đã quyết định ngày 17/10/2026: CLB `Dissolving` được đặt CSVC trong học kỳ giải thể (BR45); SRS và
đặc tả UC15 đã sửa cho khớp.

**Dashboard và khám phá** — đã xử lý ngày 19/10/2026 (nhánh `agent/gaps-dashboard`): UC02 có trang
sự kiện nội bộ cho ICPDP (`/workspace/internal-events`, lọc CLB/học kỳ, chi tiết + điểm danh chỉ
đọc) và lịch sử cơ cấu/ban chủ nhiệm theo CLB (hộp quản lý CLB của ICPDP, `/club/:clubId/board-history`
cho Club Leader); UC22 hiện yêu cầu rời trên dashboard Student và trang "CLB của tôi"; UC06 E1 gợi ý
CLB mới nhất khi tìm không ra.

**Tài khoản và vòng đời CLB**

4. ~~UC03: khoá tài khoản chưa nối với hồ sơ UC40 (A1); tìm kiếm không hiện ngữ cảnh CLB.~~ Đã
   làm 19/10/2026: tìm kiếm hiện CLB, trạng thái thành viên và ghế đang giữ; khi khoá, officer có thể
   chọn một hồ sơ UC40 đang mở — audit `ACCOUNT_LOCKED` ghi `violationId`, hồ sơ có mục lịch sử
   `VIOLATION_ACCOUNT_LOCKED`.
5. ~~UC07 E3: cảnh báo trùng tên không hiển thị cho người thẩm định ICPDP.~~ Đã làm 19/10/2026: trang
   thẩm định UC08 cảnh báo khi đã có CLB `Active` trùng tên (không phân biệt hoa thường).
6. ~~UC10: phía CLB không thấy trạng thái đề cử/lý do trả lại; chỉ có một ghế Phó chủ nhiệm.~~ Đã làm
   19/10/2026: trang đề cử liệt kê các đề cử đã nộp, trạng thái từng ghế và lý do trả lại; ghế nhiều
   người giữ (`isSingleHolder: false`) vẫn mở sau khi đã có người giữ/đang chờ, mỗi người chỉ một ghế.
   Còn lại: một lần nộp chỉ đề cử một người cho mỗi ghế, vì index `uq_nom_seat`
   (`nominationId`, `positionId`) là unique; muốn đề cử hai Phó chủ nhiệm cùng lúc phải đổi schema.
7. ~~UC15: giải thể cuối kỳ không huỷ đề xuất đang chờ/lưu trữ nghĩa vụ; job lỗi chỉ log console;
   E1 không cảnh báo ngân sách chưa đối soát.~~ Đã sửa 19/10/2026 (nhánh `agent/gaps-lifecycle`): bước 6
   huỷ đề xuất (kể cả `Draft`) và yêu cầu booking chưa quyết định, ghi `dissolution.outstanding` (báo cáo
   định kỳ/sau sự kiện chưa nộp, ngân sách chưa đối soát) cùng `archivedAt`, báo ICPDP; mỗi CLB một
   transaction, lỗi thì CLB ở lại `Dissolving` và ICPDP nhận `CLUB_LIFECYCLE_FAILED` (audit + thông báo,
   tối đa một lần/ngày; job hỏng toàn bộ cũng báo); E1 liệt kê ngân sách chưa đối soát khi chọn giải thể.

**Thành viên**


**Sự kiện, ngân sách, cơ sở vật chất**

8. ~~UC44 A2: blackout chỉ liệt kê yêu cầu đang chờ bị trùng, không liệt kê booking đã duyệt hay
   buổi phân phòng UC58.~~ Đã sửa 19/10/2026: danh sách gồm yêu cầu đang chờ, booking `Approved`/`In Use`
   và buổi phân phòng UC58 chưa kết thúc; quyết định đã ra vẫn giữ nguyên (ICPDP xử lý tay).

**Báo cáo, tuân thủ, đánh giá**

9. ~~UC42: bản nháp đếm cả báo cáo `Returned`/chưa chấp nhận; sinh nháp không đòi báo cáo kỳ đã
    thẩm định; không đọc tuân thủ booking; D5 thiếu số lần trả sửa.~~ Đã sửa 19/10/2026: D5 chỉ tính báo cáo được
    chấp nhận, kỳ chưa mở báo cáo vẫn đến hạn, trừ điểm theo số lần trả sửa; D4 đọc booking CSVC được duyệt/đã dùng;
    sinh nháp từ chối khi còn báo cáo `Submitted` chờ UC39.
10. ~~UC41/UC42 BR51/BR60: kích hoạt phiên bản scheme mới giữa kỳ có thể trộn phiên bản trong một kỳ.~~ Đã sửa
    19/10/2026: học kỳ đã có đánh giá không kích hoạt được phiên bản mới; sinh lại dùng phiên bản đã chấm.

**Hạ tầng bên ngoài**

11. Nghiệm thu callback Google và Cloudinary thật; dọn asset mồ côi. Cả hai cần credential thật nên chưa làm; dọn
    asset mồ côi cố ý chưa viết vì code xoá asset trên Cloudinary không kiểm thử được khi không có tài khoản thật (19/10).
12. ~~Mail delivery worker và inbox notification tổng quát.~~ Đã làm 19/10/2026 (`.sdd/specs/feat-notification-inbox`):
    chuông + hộp thông báo in-app ở mọi workspace (`/notifications/mine`, đánh dấu đã đọc), worker outbox SCH-10 có
    claim/lease, `emailDeliveryLogs` và retry backoff; email theo ma trận SRS §8.2. Từ 07/11/2026 gửi thật qua Google SMTP
    (`nodemailer`) khi đủ biến `SMTP_*`/`MAIL_FROM` (bắt buộc ở production); khi phát triển không cấu hình thì chỉ ghi log. Từ 01/11/2026 chuông lọc theo
    workspace: `GET /notifications/mine`, `/mine/unread-count` và `POST /mine/read-all` nhận `scope=student|icpdp|club`
    (+ `clubId` cho `club`); mỗi `eventCode` thuộc đúng một audience theo danh sách ở `server/src/domain/notification.ts`
    (mã chưa phân loại tính là của sinh viên). Các mã từng gửi cho hai nhóm đã được tách: bản cho ICPDP là
    `CLUB_DISSOLUTION_COMPLETED`, `REPORT_ESCALATED_TO_ICPDP`, `REFUND_OVERDUE_TO_ICPDP`.

### Ngoài phạm vi bản hiện tại (quyết định 17/10/2026)

- UC12 A2: kế hoạch không đổi danh sách ghế ban chủ nhiệm, nên UC13 không sinh phiên bản cơ cấu mới
  từ kế hoạch.
- UC27/UC53: không gửi thông báo công bố sự kiện cho sinh viên; UC16 không báo người theo dõi (không
  có khái niệm follower).
- UC28 E2 / UC47 E2: huỷ sát giờ chỉ đánh dấu `isLateCancellation`, không tự tạo hồ sơ UC40 và không
  vào chấm điểm UC42; ngưỡng huỷ muộn booking cố định 24 giờ, không phải trường policy.
- UC48/UC49: một điểm tổng 1–5 (`FEEDBACK_CRITERION = "overall"`) kèm trung bình và phân bố, không
  chấm theo tiêu chí.
- UC40 A1 (và UC15 A1): leo thang tạm ngừng/giải thể chỉ là nhãn (`linkedLifecycleAction`) trên hồ
  sơ; ICPDP thực hiện UC15 riêng, không liên kết hai chiều.
- UC43 E1: CLB không phản biện kết quả đánh giá đã công bố.

### Lỗi UI nhỏ

- UC20 hộp thoại tiếp nhận không đặt được `joinedAt`/ban; UC16 bước tuyển không có mô tả/ngày;
  UC18 thao tác hàng loạt lỗi khi trộn trạng thái.
- UC16 đợt tuyển quá hạn vẫn `Published` đến khi có thao tác xét duyệt; UC54 lời mời quá hạn vẫn
  `Pending` đến khi job hết hạn chạy.
- ~~UC09 audit ghi `actorRole` "Club Member" cho thao tác của Leader; thông báo chỉ-xem trong
  `ClubSettingsPage` không bao giờ hiện.~~ Đã sửa 19/10/2026: audit ghi "Club Leader"; bỏ thông báo
  chỉ-xem vì UC09 E3 từ chối người không có `club.profile.manage`.
- UC14 checkbox xác nhận bắt buộc kể cả khi không có gì để xác nhận.
- UC40 thẻ hồ sơ phía CLB thiếu trạng thái/mức độ/nguồn.
- UC46 phương án thay thế chỉ là văn bản. (Lưới UC58 đánh dấu ô vướng sự kiện/booking đã duyệt từ 19/10.)
- `window.confirm` còn dùng ở vài trang khác (sự kiện, thành viên, tuyển, báo cáo, tài chính);
  `PropertiesPage`/`BookingWorkspace` đã chuyển sang `AppConfirmDialog` ngày 19/10.
- Tên tiêu chí đánh giá tiếng Việt khi ở `en`; so sánh feedback gồm cả sự kiện `Draft`/`Pending`;
  nhãn "active clubs" trên bộ lọc suspended ở `/icpdp/clubs`; lỗi form tuyển không nêu tên trường.
- `seed-guide.ts:60` và `seed-wave4.ts:82` dùng `recoveryDueDays` 14 (prod 7, BR58).

## 4. Các điểm cần đọc đúng khi đối chiếu

- UC08 hiện tạo CLB `Active` ngay, nhiệm kỳ và membership founder cùng assignment Chủ nhiệm/Phó
  chủ nhiệm đã xác nhận; luồng `Pending Setup` → UC10 → UC11 không dùng cho CLB mới. `Pending Setup`
  và founder tạm vẫn được resolver hỗ trợ cho dữ liệu cũ. Mở hồ sơ không chuyển `Under Review`;
  chỉ thao tác nhận hồ sơ (claim) mới chuyển.
- UC04: domain email cho phép lấy từ env `ALLOWED_DOMAIN`, không có trên màn chính sách.
- UC10: nhiệm kỳ = nhiệm kỳ `Active` hiện tại (không nhập ngày); E1 từ chối cả lượt nộp.
- UC15: tạm ngừng giữ đợt tuyển mở nhưng chặn ứng tuyển (quyết định 10/10/2026); từ `655cad3`
  tạm ngừng huỷ các đề xuất đang chờ.
- UC16 A2: huỷ đợt tuyển luôn ra `Cancelled`. Từ `655cad3`, đợt tuyển chỉ `Completed` khi đã đóng
  cửa sổ hoặc đã đủ chỉ tiêu.
- UC21 A2: sinh viên tự xác nhận (không phải phía CLB); quá hạn thì `Inactive` tính từ lúc job chạy,
  không hồi tố đầu kỳ; sinh viên không tự khôi phục từ `Inactive`, Leader kích hoạt lại qua UC21
  (quyết định 15/10, `feat-membership-reconfirmation`). Ngày hiệu lực UC21 chỉ là hôm nay.
- UC28: sự kiện `Ongoing` huỷ được nhưng không đổi lịch được.
- `audienceScope` dùng `PUBLIC`/`MEMBERS_ONLY`, đặc tả ghi Public/Internal.
- UC33 (`655cad3`): chỉ soạn báo cáo sau sự kiện khi điểm danh đã chốt
  ([post-event-report.ts](../server/src/domain/post-event-report.ts#L46)); no-show chỉ gắn cờ sau khi
  sự kiện kết thúc.
- UC40 (`655cad3`): ICPDP chỉ đánh dấu biện pháp khắc phục hoàn thành khi CLB đã nộp minh chứng
  ([violation.ts](../server/src/domain/violation.ts#L268)).
- UC43: chỉ Leader xem kết quả đã công bố.
- UC44: từ chối xoá nếu từng có booking; mã tự sinh; tài sản mới ở trạng thái active.
- UC46: thông báo quyết định chỉ gửi người nộp gần nhất. UC55: mọi loại xuất đều có PDF.
- Khiếu nại (`domain/complaint.ts`) lưu ở `complaints`. Bản ghi góp ý một chiều cũ (trước 07/11/2026) vẫn
  giữ trường `recipient` và loại `suggestion`/`praise`/`issue`; chúng hiện trong hàng đợi ICPDP như khiếu
  nại `Submitted` để ICPDP bác bỏ có lý do, và được xuất dưới nhãn "Góp ý gửi CLB/ICPDP".
- Guest (chưa đăng nhập) dùng được khu Public của client, chỉ đọc: Home, Clubs, Club detail, Events,
  Event detail và Not found (`PublicLayout` trong `client/src/main.tsx`), gọi API `/public/*` của
  `public-discovery-routes.ts`; mọi màn hình khác nằm sau UC01 (sửa 02/11/2026).
- `club.transition.plan` (UC12) và `club.suspension.request` (UC14) đã có route nghiệp vụ.
  `club.complaint.respond` dùng cho màn tuân thủ UC40 phía CLB và trả lời khiếu nại UC52.
- `isBoardSeat` là cờ kỹ thuật: resolver cấp quyền cho mọi vị trí active mang cờ này và assignment
  đã xác nhận. Cơ cấu chuẩn hiện tạo Chủ nhiệm/Phó chủ nhiệm; dữ liệu cũ gắn cờ cho ghế khác cũng
  được resolver coi là Leader.
- UC09: cả GET thiết lập (`getClubSettings`) lẫn mutation đều yêu cầu `club.profile.manage`
  ([club-profile.ts](../server/src/usecase/club-profile.ts#L100)), tức chỉ Leader (hoặc founder khi
  `Pending Setup`). `assertClubSettingsRead` trong `usecase/access.ts` không còn được gọi.

## 5. Cổng kiểm chứng

Lần đối chiếu ngày 17/10/2026: `npm run check` xanh, 442 test đều qua, không skip (chạy kèm
`MONGO_URI` tới một Mongo replica set riêng). Các màn mới đã nghiệm thu trên trình duyệt với database QA
riêng, ở `en`/sáng/desktop và `vi`/tối/mobile: không lỗi console hay API, không tràn ngang, và
Member bị từ chối ở cả menu lẫn API. Khi code hoặc phạm vi thay đổi, cập nhật file này cùng SRS, SPEC/TASKS liên quan và sơ đồ.
