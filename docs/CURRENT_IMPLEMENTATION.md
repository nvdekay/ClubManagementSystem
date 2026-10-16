# Hiện trạng triển khai và ánh xạ use case

> Đối chiếu với `origin/main` tại commit `60fc2db` ngày 14/10/2026. Đây là nguồn hiện hành để
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
để tương thích dữ liệu nhưng không cấp quyền. UC23 đã rút và giữ số hiệu để không đánh lại UC.

## 2. Ánh xạ theo actor

Ma trận đủ 56 mã UC với link route/UI: [UC_CODE_MAPPING.md](05-implementation/UC_CODE_MAPPING.md).
Danh mục có 52 UC còn trong phạm vi và 4 mã đã rút; số lượng này không phải số UC đã hoàn thành.

Ký hiệu: **Có** = route/use case/UI hiện hành; **Một phần** = có một phía hoặc còn thiếu nhánh
nghiệp vụ; **Đã rút/đổi scope** = không còn là chức năng như đặc tả cũ.

| Actor | Use case | Hiện trạng |
|---|---|---|
| Mọi user | UC01 đăng nhập Google | Có; cần nghiệm thu callback Google thật |
| Mọi user | UC02 dashboard | Có |
| Student | UC06 khám phá CLB/sự kiện | Có; API `/public/*` không cần auth, nhưng `PublicLayout.tsx` yêu cầu đăng nhập |
| Student | UC07 hồ sơ thành lập CLB | Có; hồ sơ quá hạn sửa tự chuyển `Expired`; còn QA Cloudinary thật và dọn asset mồ côi |
| Student | UC17 ứng tuyển thành viên | Có |
| Club Member | UC21 A2 tái xác nhận thành viên đầu kỳ | Có, tại `/workspace/clubs`; quá 14 ngày chuyển `Inactive` |
| Student | UC29 đăng ký sự kiện | Có |
| Student | UC31 check-in | Có |
| Student | UC48 phản hồi sự kiện | Có |
| Student | UC50 góp ý | Có; một chiều cho CLB/ICPDP theo quyết định 09/10/2026 |
| Club Member | UC22 xin rời CLB | Có |
| Club Member | UC24 member space | Có |
| Club Member | Xem danh sách thành viên | Có, qua `member-space`; không truy cập API quản trị `/memberships` |
| Club Member | Xem phòng được phân | **Chưa được phép**: API và menu yêu cầu `club.booking.manage`, chỉ Leader có quyền |
| Club Leader | UC09 hồ sơ/cơ cấu CLB | Có |
| Club Leader | UC10 đề cử ban chủ nhiệm | Có |
| Club Leader | UC12 lập kế hoạch chuyển giao | Có, tại `/club/:clubId/transition-plans` |
| Club Leader | UC14 xin tạm ngừng | Có, tại `/club/:clubId/suspension-requests`, kèm xác nhận sự kiện/booking bị ảnh hưởng |
| Club Leader | UC16, UC18–UC21 tuyển và quản lý thành viên | Có, gồm job tái xác nhận đầu kỳ UC21 A2 (Leader được miễn) |
| Club Leader | UC23 quản lý role | **Đã rút** |
| Club Leader | UC25, UC27, UC28, UC30, UC32 sự kiện | Có |
| Club Leader | UC33 báo cáo sau sự kiện | Có |
| Club Leader | UC36 khoản chi/quyết toán | Có, đã nối vào app chính; chứng từ bắt buộc (BR25), hạn hoàn trả 7 ngày (BR58) |
| Club Leader | UC38 báo cáo định kỳ | Có, tại `/club/:clubId/periodic-reports`; mỗi lần nộp lưu snapshot riêng |
| Club Leader | UC40 giải trình và khắc phục vi phạm | Có, tại `/club/:clubId/violations` |
| Club Leader | UC43 xem kết quả đánh giá | Có, tại `/club/:clubId/evaluations`; chỉ thấy kết quả `Published` |
| Club Leader | UC45, UC47 booking ngoài `ROOM` | Có |
| Club Leader | UC49 xem tổng hợp feedback | Có |
| Club Leader | UC52 phản hồi complaint | Đã rút theo việc đổi UC50 thành góp ý một chiều |
| ICPDP | UC03, UC04 tài khoản/chính sách | Có; UC05 đã rút |
| ICPDP | UC08, UC11, UC13, UC15 vòng đời CLB | Có; UC13/UC15 nhận đầu vào UC12/UC14 từ phía CLB; UC15 duyệt yêu cầu tại `/workspace/suspension-requests` |
| ICPDP | UC26, UC34, UC35 | Có route/UI và đã nối vào app chính |
| ICPDP | UC37 đối soát | Có, đã nối vào app chính; A2 đối soát tối đa bằng số đã tạm ứng, không cấp bù |
| ICPDP | UC39–UC44, UC46 | Có; vòng trả sửa–nộp lại UC38/UC39 chạy end-to-end |
| ICPDP | UC51 complaint triage | Đã rút theo scope góp ý một chiều |
| ICPDP | UC53 sự kiện cấp trường | Có |
| Club Leader | UC54 phản hồi lời mời | Có, tại `/club/:clubId/invitations`; từ chối phải kèm lý do |
| ICPDP | UC55 xuất dữ liệu | Có |
| ICPDP/Club Leader | UC58 phân/xem phòng học theo học kỳ | Có; Club Member hiện bị từ chối ở API |

## 3. Khoảng trống phải xử lý

UC12, UC14, UC21 A2, UC36–UC38, UC40, UC43, UC54 và job hết hạn hồ sơ UC07/08 đã hoàn thành
ngày 15/10/2026 (xem `.sdd/specs/feat-club-transition-plans`, `feat-suspension-requests`,
`feat-membership-reconfirmation`, `feat-event-finance`, `feat-club-periodic-submission`,
`feat-club-compliance`, `feat-club-invitations`, `feat-application-expiry`). Còn lại:

1. UC50 đã đổi scope theo quyết định 09/10/2026 trong `feat-student-feedback`: giữ góp ý một
   chiều; UC51/UC52 ngoài phạm vi. Không coi đây là UC còn phải triển khai.
2. Nghiệm thu callback Google và Cloudinary thật; dọn asset mồ côi.
3. Seed demo chưa tạo ngân sách sự kiện, nên chưa thử trọn luồng chi, quyết toán, đối soát
   UC36/UC37 trên giao diện với dữ liệu demo.
4. Mail delivery worker và inbox notification tổng quát chưa được nối như thiết kế đích.

## 4. Các điểm cần đọc đúng khi đối chiếu

- UC08 hiện tạo CLB `Active` ngay, nhiệm kỳ và membership founder cùng assignment Chủ nhiệm/Phó
  chủ nhiệm đã xác nhận. `Pending Setup` và founder tạm vẫn được resolver hỗ trợ cho dữ liệu cũ.
- `StudentFeedback` là giao diện domain; collection vật lý vẫn là `complaints`, lưu `Submitted`,
  `recipient`, `type`, `isAnonymous`, `complainantId`. Field ticket cũ được giữ nhưng không dùng.
- API public còn mở, trong khi client yêu cầu đăng nhập cho cả trang chủ/danh bạ. Đây là khác biệt
  giữa API và UI hiện hành, không phải bằng chứng Guest dùng được UI.
- `club.transition.plan` (UC12) và `club.suspension.request` (UC14) đã có route nghiệp vụ.
  `club.complaint.respond` nay dùng cho màn tuân thủ UC40 phía CLB; complaint response UC52 vẫn đã rút.
- `isBoardSeat` là cờ kỹ thuật: resolver cấp quyền cho mọi vị trí active mang cờ này và assignment
  đã xác nhận. Cơ cấu chuẩn hiện tạo Chủ nhiệm/Phó chủ nhiệm; dữ liệu cũ gắn cờ cho ghế khác cũng
  được resolver coi là Leader.
- UI thiết lập CLB chỉ cho Leader; server GET profile/departments vẫn cho membership Active/Inactive
  đọc qua `assertClubSettingsRead`. Mutation yêu cầu Leader. Không ghi “mọi API thiết lập đều 403 với Member”.

## 5. Cổng kiểm chứng

Lần đối chiếu ngày 15/10/2026: `npm run check` xanh. Chạy kèm `MONGO_URI` tới một Mongo replica
set riêng: 438 test đều qua, không skip. Các màn mới đã nghiệm thu trên trình duyệt với database QA
riêng, ở `en`/sáng/desktop và `vi`/tối/mobile: không lỗi console hay API, không tràn ngang, và
Member bị từ chối ở cả menu lẫn API. Khi code hoặc phạm vi thay đổi, cập nhật file này cùng SRS, SPEC/TASKS liên quan và sơ đồ.
