# Hiện trạng triển khai và ánh xạ use case

> Đối chiếu `main` tại `655cad3` (code) ngày 17/10/2026. Đây là nguồn hiện hành để
> đọc phạm vi **đã có trong code**. `SRS.md` mô tả phạm vi nghiệp vụ đích; các tài liệu kế hoạch
> theo wave và review issue chỉ giữ giá trị lịch sử.

## 1. Mô hình truy cập phía CLB

Phía CLB chỉ có hai role cố định:

- **Club Leader**: membership `Active`, giữ ghế Chủ nhiệm (`isLeaderRole`) hoặc Phó chủ nhiệm
  (`isBoardSeat`) đã được ICPDP xác nhận (`confirmedBy`) trong nhiệm kỳ `Active` còn hiệu lực.
  Chủ nhiệm và Phó chủ nhiệm nhận cùng toàn bộ 14 permission trong
  `server/src/domain/access.ts`.
- **Club Member**: mọi membership `Active` còn lại. Không nhận permission quản lý; chỉ xem và
  tham gia trong member space, xem danh sách thành viên chỉ đọc, xin rời CLB, cùng
  các chức năng Student.
- **Approved founder khi CLB `Pending Setup`**: chỉ có `club.profile.manage` và
  `club.board.nominate`.

Không còn role tự tạo, không cấu hình permission theo role và không gán permission lẻ cho thành
viên. API `/clubs/:clubId/roles*`, `/clubs/:clubId/role-directory` và UI “Vai trò & phân quyền”
đã bị gỡ. `clubPositions.permissionCodes` và `clubRoleStructureVersions` vẫn tồn tại trong schema
để tương thích dữ liệu nhưng không cấp quyền. UC23 đã rút ngày 13/10/2026 vì role CLB cố định; giữ số hiệu để không đánh lại UC.

## 2. Ánh xạ theo actor

Ma trận đủ 56 mã UC với link route/UI: [UC_CODE_MAPPING.md](05-implementation/UC_CODE_MAPPING.md).
Danh mục có 56 mã; 4 mã UC05, UC23, UC51, UC52 đã rút nên còn **52 UC trong phạm vi**. Số này không phải số UC đã hoàn thành.

Ký hiệu: **Có** = route/use case/UI hiện hành; **Một phần** = có một phía hoặc còn thiếu nhánh
nghiệp vụ; **Đã rút** = không còn trong phạm vi, giữ số hiệu để không đánh lại UC.

| Actor | Use case | Hiện trạng |
|---|---|---|
| Mọi user | UC01 đăng nhập Google | Có; cần nghiệm thu callback Google thật |
| Mọi user | UC02 dashboard | Một phần; panel sự kiện nội bộ luôn 0, chưa có danh sách sự kiện nội bộ và lịch sử cơ cấu/ban chủ nhiệm theo CLB |
| Student | UC06 khám phá CLB/sự kiện | Một phần; API `/public/*` không cần auth, nhưng `PublicLayout.tsx` yêu cầu đăng nhập; E1 chưa gợi ý CLB mới |
| Student | UC07 hồ sơ thành lập CLB | Có; hồ sơ quá hạn sửa tự chuyển `Expired`; còn QA Cloudinary thật và dọn asset mồ côi |
| Student | UC17 ứng tuyển thành viên | Một phần; thành viên `Inactive` vẫn nộp được (E3/BR13) |
| Club Member | UC21 A2 tái xác nhận thành viên đầu kỳ | Một phần, tại `/workspace/clubs`; quá hạn chuyển `Inactive`, nhưng `Inactive` không tái xác nhận để về `Active` được |
| Student | UC29 đăng ký sự kiện | Có |
| Student | UC31 check-in | Có |
| Student | UC48 phản hồi sự kiện | Một phần; chỉ một điểm tổng, chưa chấm theo tiêu chí |
| Student | UC50 góp ý | Có; một chiều cho CLB/ICPDP theo quyết định 09/10/2026 |
| Club Member | UC22 xin rời CLB | Một phần; chưa theo dõi yêu cầu rời trên dashboard UC02 |
| Club Member | UC24 member space | Có |
| Club Member | Xem danh sách thành viên | Có, qua `member-space`; không truy cập API quản trị `/memberships` |
| Club Member | Xem phòng được phân | **Chưa được phép**: API và menu yêu cầu `club.booking.manage`, chỉ Leader có quyền |
| Club Leader | UC09 hồ sơ/cơ cấu CLB | Có; GET và mutation đều yêu cầu `club.profile.manage` |
| Club Leader | UC10 đề cử ban chủ nhiệm | Một phần; một người có thể được đề cử hai ghế, CLB không thấy trạng thái/lý do trả lại |
| Club Leader | UC12 lập kế hoạch chuyển giao | Một phần, tại `/club/:clubId/transition-plans`; A2 chưa đổi được danh sách ghế ban chủ nhiệm |
| Club Leader | UC14 xin tạm ngừng | Có, tại `/club/:clubId/suspension-requests`, kèm xác nhận sự kiện/booking bị ảnh hưởng |
| Club Leader | UC16, UC18–UC21 tuyển và quản lý thành viên | Có, gồm job tái xác nhận đầu kỳ UC21 A2 (Leader được miễn); UC20 **Một phần**: chưa có tiếp nhận thủ công (A1) |
| Club Leader | UC23 quản lý role | **Đã rút** (role cố định, 13/10/2026) |
| Club Leader | UC25, UC27, UC28, UC30, UC32 sự kiện | Có |
| Club Leader | UC33 báo cáo sau sự kiện | Có |
| Club Leader | UC36 khoản chi/quyết toán | Có, đã nối vào app chính; chứng từ bắt buộc (BR25), hạn hoàn trả 7 ngày (BR58) |
| Club Leader | UC38 báo cáo định kỳ | Có, tại `/club/:clubId/periodic-reports`; mỗi lần nộp lưu snapshot riêng |
| Club Leader | UC40 giải trình và khắc phục vi phạm | Có, tại `/club/:clubId/violations` |
| Club Leader | UC43 xem kết quả đánh giá | Có, tại `/club/:clubId/evaluations`; chỉ thấy kết quả `Published` |
| Club Leader | UC45, UC47 booking ngoài `ROOM` | Có |
| Club Leader | UC49 xem tổng hợp feedback | Một phần; chỉ điểm tổng, chưa tổng hợp theo tiêu chí |
| Club Leader | UC52 phản hồi complaint | **Đã rút** (UC50 là góp ý một chiều, 09/10/2026) |
| ICPDP | UC03, UC04 tài khoản/chính sách | Có; UC05 đã rút; UC03 chưa nối khoá tài khoản với hồ sơ UC40 |
| ICPDP | UC08, UC11, UC13, UC15 vòng đời CLB | Có; UC13/UC15 nhận đầu vào UC12/UC14 từ phía CLB; UC15 duyệt yêu cầu tại `/workspace/suspension-requests`; UC15 **Một phần**: giải thể chưa dọn nghĩa vụ/cảnh báo đối soát |
| ICPDP | UC26, UC34, UC35 | Có route/UI và đã nối vào app chính |
| ICPDP | UC37 đối soát | Có, đã nối vào app chính; A2 đối soát tối đa bằng số đã tạm ứng, không cấp bù |
| ICPDP | UC39–UC44, UC46 | Có; vòng trả sửa–nộp lại UC38/UC39 chạy end-to-end; UC42/UC43 **Một phần** (nguồn dữ liệu bản nháp, chưa khiếu nại kết quả) |
| ICPDP | UC51 complaint triage | **Đã rút** (UC50 là góp ý một chiều, 09/10/2026) |
| ICPDP | UC53 sự kiện cấp trường | Có |
| Club Leader | UC54 phản hồi lời mời | Có, tại `/club/:clubId/invitations`; từ chối phải kèm lý do |
| ICPDP | UC55 xuất dữ liệu | Có |
| ICPDP/Club Leader | UC58 phân/xem phòng học theo học kỳ | Có; Club Member hiện bị từ chối ở API |

## 3. Khoảng trống phải xử lý

UC12, UC14, UC21 A2, UC36–UC38, UC40, UC43, UC54 và job hết hạn hồ sơ UC07/08 đã hoàn thành
ngày 15/10/2026; `655cad3` (16/10) vá các lỗ hổng tìm thấy khi đi hết luồng nghiệp vụ. Kiểm toán
ngày 17/10/2026 còn ghi nhận các luồng thiếu dưới đây (chưa sửa).

**Dashboard và khám phá**

1. UC02: panel sự kiện nội bộ đếm `audienceScope: "ICPDP_INTERNAL"`
   ([mongo-dashboard-repository.ts](../server/src/infra/db/mongo-dashboard-repository.ts#L155))
   nhưng không code nào ghi giá trị này (chỉ `PUBLIC`/`MEMBERS_ONLY`) → luôn 0. Chưa có danh sách
   sự kiện nội bộ cho ICPDP (FR-UC02-02, BR53) và lịch sử cơ cấu/ban chủ nhiệm theo từng CLB (BR56).
2. UC22: yêu cầu rời CLB không hiện trên dashboard; `GET /memberships/withdrawal-requests/mine`
   không được client gọi.
3. UC06: Guest không duyệt được UI (`PublicLayout.tsx` chuyển về `/login`) dù `/public/*` mở;
   E1 không gợi ý CLB mới nhất.

**Tài khoản và vòng đời CLB**

4. UC03: khoá tài khoản chưa nối với hồ sơ UC40 (A1); tìm kiếm không hiện ngữ cảnh CLB.
5. UC07 E3: cảnh báo trùng tên không hiển thị cho người thẩm định ICPDP.
6. UC10: một người có thể được đề cử hai ghế; phía CLB không thấy trạng thái đề cử/lý do trả lại;
   chỉ có một ghế Phó chủ nhiệm.
7. UC12 A2: kế hoạch không đổi được danh sách ghế (`proposedBoardRoles` chỉ có từ seed) → UC13
   không bao giờ sinh phiên bản cơ cấu mới từ dữ liệu thật.
8. UC15: giải thể cuối kỳ không huỷ đề xuất đang chờ/lưu trữ nghĩa vụ; job lỗi chỉ log console;
   E1 không cảnh báo ngân sách chưa đối soát; A1 tạm ngừng/giải thể không gắn hồ sơ UC40; booking
   vẫn được nhận khi CLB `Dissolving` (BR44/45).

**Thành viên**

9. UC17 E3/BR13: thành viên `Inactive` vẫn nộp đơn được (chỉ chặn `Active`), lỗi muộn ở unique
   index khi tiếp nhận.
10. UC20 A1 / FR-UC20-03: chưa có tiếp nhận thủ công (tạo membership không cần đơn được chấp nhận).
11. UC21 A2: thành viên `Inactive` không tái xác nhận về `Active` được (job/xác nhận chỉ cho
    `Active`); mốc `Inactive` là ngày chạy, không phải đầu kỳ.

**Sự kiện, ngân sách, cơ sở vật chất**

12. UC28 E2 và UC47 E2: cờ `isLateCancellation` (sự kiện/booking) được lưu nhưng không chảy vào
    UC40 hay UC42; ngưỡng huỷ muộn booking cố định 24 giờ, không lấy từ policy.
13. UC35: vẫn ghi tạm ứng được sau khi sự kiện kết thúc.
14. UC27/UC53: công bố sự kiện không gửi thông báo cho sinh viên; UC16 công bố đợt tuyển không báo
    người theo dõi (không có khái niệm follower).
15. UC44 A2: blackout chỉ liệt kê yêu cầu đang chờ bị trùng, không liệt kê booking đã duyệt hay
    buổi phân phòng UC58.
16. UC48/UC49: chỉ một điểm tổng (`overall`); đặc tả yêu cầu điểm theo từng tiêu chí.

**Báo cáo, tuân thủ, đánh giá**

17. BR21 / UC38 E1 / UC39 E1: CLB không hề tạo báo cáo định kỳ thì không bao giờ bị coi là quá hạn
    (chặn sự kiện chỉ xét báo cáo `Draft`/`Returned` đã có).
18. UC40 A1: leo thang tạm ngừng/giải thể chỉ là nhãn (`linkedLifecycleAction`), không nối UC15.
19. UC42: bản nháp đếm cả báo cáo `Returned`/chưa chấp nhận; sinh nháp không đòi báo cáo kỳ đã
    thẩm định; không đọc tuân thủ booking; D5 thiếu số lần trả sửa.
20. UC41/UC42 BR51/BR60: kích hoạt phiên bản scheme mới giữa kỳ có thể trộn phiên bản trong một kỳ.
21. UC43 E1: CLB không khiếu nại được kết quả đánh giá đã công bố.

**Hạ tầng bên ngoài**

22. Nghiệm thu callback Google và Cloudinary thật; dọn asset mồ côi.
23. Mail delivery worker và inbox notification tổng quát chưa được nối như thiết kế đích.

### Lỗi UI nhỏ

- `ClubEventsPage` bỏ mất chi tiết lỗi server (tên nghĩa vụ, đăng ký bị ảnh hưởng, xung đột) — UC25 E2, UC30 E1.
- Panel dashboard phần lớn không bấm được; panel CLB active/suspended của ICPDP dẫn tới `/clubs` công khai.
- UC20 hộp thoại tiếp nhận không đặt được `joinedAt`/ban; UC16 bước tuyển không có mô tả/ngày;
  UC18 thao tác hàng loạt lỗi khi trộn trạng thái.
- UC16 đợt tuyển quá hạn vẫn `Published` đến khi có thao tác xét duyệt; UC54 lời mời quá hạn vẫn
  `Pending` đến khi job hết hạn chạy.
- UC09 audit ghi `actorRole` "Club Member" cho thao tác của Leader; thông báo chỉ-xem trong
  `ClubSettingsPage` không bao giờ hiện.
- UC14 checkbox xác nhận bắt buộc kể cả khi không có gì để xác nhận.
- UC38 editor hiện số liệu trực tiếp sau khi nộp; không có số liệu tài chính.
- UC40 thẻ hồ sơ phía CLB thiếu trạng thái/mức độ/nguồn.
- UC46 phương án thay thế chỉ là văn bản; lưới UC58 không đánh dấu sự kiện đã duyệt.
- `window.confirm` còn dùng ở `PropertiesPage`/`BookingWorkspace`.
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
- UC21 A2: sinh viên tự xác nhận (không phải phía CLB); ngày hiệu lực UC21 chỉ là hôm nay.
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
- `StudentFeedback` là giao diện domain; collection vật lý vẫn là `complaints`, lưu `Submitted`,
  `recipient`, `type`, `isAnonymous`, `complainantId`. Field ticket cũ được giữ nhưng không dùng.
- API public còn mở, trong khi client yêu cầu đăng nhập cho cả trang chủ/danh bạ. Đây là khác biệt
  giữa API và UI hiện hành, không phải bằng chứng Guest dùng được UI.
- `club.transition.plan` (UC12) và `club.suspension.request` (UC14) đã có route nghiệp vụ.
  `club.complaint.respond` nay dùng cho màn tuân thủ UC40 phía CLB; complaint response UC52 đã rút.
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
