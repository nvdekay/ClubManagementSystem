# SPEC: feat-school-events

> UC53 — Tạo sự kiện cấp trường và mời câu lạc bộ tham gia. Người dùng duyệt các quyết định (2026-10-10),
> kể cả thay đổi schema (`clubId` không bắt buộc ở `eventRegistrations`, `attendances`, `eventFeedbacks`).

## Vấn đề
Nhà trường tự tổ chức sự kiện quy mô toàn trường (ngày hội CLB, hội thao, lễ vinh danh, tập huấn) và cần
mời các CLB phối hợp, theo dõi CLB nào nhận lời, rồi mở cho sinh viên đăng ký như một sự kiện bình thường.

## Quyết định
- Màn `/workspace/school-events` (danh sách + form tạo) và `/workspace/school-events/:id` (lời mời, mời thêm,
  công bố).
- Sự kiện: `organizerType = "ICPDP"`, không có `clubId`, `clubName = "ICPDP"`, `audienceScope = PUBLIC`,
  `allowWalkIn = true`, có danh sách chờ. Tạo xong ở `Approved`. Học kỳ lấy từ lịch học kỳ của policy,
  sự kiện phải nằm gọn trong một học kỳ (BR44). Mục tiêu và yêu cầu phối hợp lưu ở bản ghi
  `eventProposalVersions` số 1 (`payload.objective`, `payload.plan`).
- Địa điểm: chọn phòng trong danh mục (UC44, đang hoạt động) hoặc gõ nơi khác. Trùng lịch (BR15) với sự
  kiện `Approved/Upcoming/Ongoing` hoặc booking `Approved/In Use` cùng phòng chỉ **cảnh báo**, không chặn;
  kết quả lưu ở `conflictResult` + `conflictDetail`. Form kiểm tra ngay khi chọn phòng và giờ.
- Lời mời: "Tất cả CLB đang hoạt động" hoặc chọn từng CLB. CLB không `Active` bị bỏ qua (E1, BR59) và
  được báo lại. Hạn phản hồi mặc định **3 ngày trước khi bắt đầu** (`INVITATION_DEADLINE_DAYS_BEFORE`),
  phải ở tương lai và không sau giờ bắt đầu. Mỗi CLB một lời mời (index duy nhất); mời lại được CLB đã bị
  thu hồi hoặc quá hạn (đặt lại `Pending`). Thu hồi chỉ khi `Pending` và chưa tới hạn. Ban điều hành CLB
  nhận thông báo khi được mời và khi bị thu hồi.
- Job `event-lifecycle` (mỗi giờ) chuyển lời mời `Pending` quá hạn → `Expired`.
- **Công bố** (A2): `Approved → Upcoming`, `publishedAt`, mở đăng ký từ lúc công bố tới giờ bắt đầu, sinh
  mã check-in 6 ký tự. Chỉ khi sự kiện chưa bắt đầu.
- Sinh viên: sự kiện cấp trường hiện trong danh sách sự kiện công khai ("Tổ chức bởi: ICPDP", không có
  trang CLB), đăng ký, check-in và gửi phản hồi như sự kiện CLB. Để làm được, `clubId` ở
  `eventRegistrations`, `attendances`, `eventFeedbacks` không còn bắt buộc (null với sự kiện cấp trường).
- Audit `Event`: `SCHOOL_EVENT_CREATED`, `SCHOOL_EVENT_CLUBS_INVITED`, `SCHOOL_EVENT_INVITATION_WITHDRAWN`,
  `SCHOOL_EVENT_PUBLISHED`. Chỉ `ICPDP_OFFICER`.

## Hành vi
- `GET /admin/school-events` · `GET /admin/school-events/:id` ·
  `GET /admin/school-events/conflicts?propertyId&startAt&endAt`.
- `POST /admin/school-events` → 201 `{ detail, outcome: { invited, skipped } }`.
- `POST /admin/school-events/:id/invitations` `{ clubIds?, allActiveClubs?, deadline? }`.
- `POST /admin/school-events/:id/invitations/:invitationId/withdraw` · `POST /admin/school-events/:id/publish`.

## Hợp đồng dữ liệu cho phía CLB (UC54 — dev phía CLB làm)
CLB thấy lời mời của mình ở `eventInvitations` (`clubId` = CLB). Khi `status = "Pending"` và
`now < deadline`, người có `club.event.manage` hoặc Chủ nhiệm cập nhật trong một transaction:
- Nhận lời: `status: "Accepted"`, `respondedAt`, `respondedBy`, `responseDetails` (object phẳng các giá trị
  chuỗi/số, ví dụ `{ representative, members, booth, performance }` — ICPDP hiển thị các giá trị này),
  `responseNote` tuỳ chọn.
- Từ chối: `status: "Declined"`, `responseNote` **bắt buộc**, `respondedAt`, `respondedBy`.
- `updatedAt = now`; audit `EventInvitation` `EVENT_INVITATION_ACCEPTED|DECLINED`; thông báo cho người mời
  (`invitedBy`). Quá hạn → không cho phản hồi (job đã/ sẽ chuyển `Expired`); `Withdrawn` → không cho phản hồi.

## Tiêu chí nghiệm thu
- [x] Không phải ICPDP → 403.
- [x] Tạo: thời gian tương lai, kết thúc sau bắt đầu, nằm trong một học kỳ, có địa điểm, số chỗ ≥ 1; hạn
  phản hồi mặc định 3 ngày trước, nằm giữa hiện tại và giờ bắt đầu.
- [x] Trùng phòng với booking/sự kiện đã duyệt → `Warning` kèm chi tiết, vẫn tạo được.
- [x] Mời: CLB không hoạt động bị bỏ qua; CLB đã mời bị bỏ qua; CLB đã thu hồi được mời lại; ban điều hành
  nhận thông báo.
- [x] Thu hồi chỉ lời mời đang chờ trước hạn; job chuyển lời mời quá hạn → `Expired`.
- [x] Công bố → `Upcoming` + mở đăng ký + mã check-in; công bố lần hai → 409.
- [x] Sinh viên thấy sự kiện trong danh sách công khai, đăng ký và check-in được (không có `clubId`).
- [ ] Kiểm tra trực quan (desktop/mobile, `en`/`vi`, sáng/tối).

## Ngoài phạm vi
UC54 (CLB phản hồi — phía CLB), sửa/huỷ sự kiện cấp trường, đặt phòng tự động cho sự kiện của trường.

## Changelog
- v1.0.0 (2026-10-10) — được người dùng duyệt (kể cả đổi schema `clubId` không bắt buộc ở 3 bảng).
