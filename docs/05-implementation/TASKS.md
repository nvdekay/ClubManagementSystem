# UCMS — Danh sách công việc triển khai (Database · Backend · Frontend)

Suy ra từ [`../SRS.md`](../SRS.md). Mỗi task đều trích dẫn use case, yêu cầu chức năng hoặc quy
tắc nghiệp vụ mà nó thoả mãn, nên một task chỉ xong khi yêu cầu đó chứng minh được là đã đạt.

**Definition of Done cho mọi task** — `npm run check` xanh (constitution + lint + typecheck +
test); các quy tắc nghiệp vụ được task trích dẫn đều có unit test trên use case thực thi chúng;
mọi chuyển trạng thái bị từ chối đều có test; không có mã màu hex ngoài `index.css`; mọi task
giao diện đều được kiểm tra ở cả hai ngôn ngữ và cả hai theme.

**Thứ tự** — các vòng lặp theo SRS §15. Chỉ bắt đầu một vòng khi vòng phía trên đã khép lại, vì
mỗi vòng tiêu thụ dữ liệu mà vòng trước sinh ra. Nếu buộc phải cắt phạm vi, cắt trọn vòng từ
dưới lên, không bao giờ cắt nửa vòng.

| Vòng | Phạm vi | Use case | Ước lượng (man-day) |
|---|---|---|---|
| 0 | Nền tảng | — | 12 |
| 1 | Truy cập & cấu hình | UC01–UC05 | 11 |
| 2 | Thành lập & quản trị CLB | UC06–UC15 | 20 |
| 3 | Tuyển thành viên → thành viên | UC16–UC24 | 18 |
| 4 | Duyệt → công bố sự kiện | UC25–UC28 | 14 |
| 5 | Đăng ký → điểm danh | UC29–UC32 | 11 |
| 6 | Trách nhiệm sau sự kiện | UC33, UC34 | 6 |
| 7 | Cơ sở vật chất | UC46–UC49 | 11 |
| 8 | Tài chính | UC35–UC39 | 14 |
| 9 | Báo cáo định kỳ | UC40, UC41 | 6 |
| 10 | Phản hồi & khiếu nại | UC50–UC54 | 10 |
| 11 | Governance intelligence | UC42–UC45 | 12 |
| — | Gia cố & phát hành | — | 8 |
| | | | **153** |

---

## Vòng 0 — Nền tảng

### Database

- [ ] **DB-0.1** Tạo kết nối MongoDB và schema biến môi trường ở `infra/config` (`MONGO_URI`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `SMTP_*`); server phải fail-fast khi cấu hình sai. → NFR-REL-04, CON-04
- [ ] **DB-0.2** Import [`UCMS_Database_Design.dbml`](UCMS_Database_Design.dbml) vào dbdiagram.io, xuất ảnh ERD và gắn vào báo cáo ở Figure IV.4. → SRS §7
- [ ] **DB-0.3** Viết quy ước schema Mongoose: `timestamps: true`, tham chiếu bằng `ObjectId`, `enum` trên mọi trường trạng thái lấy từ SRS §6, không đặt `default` che giấu một quyết định bắt buộc. → SRS §6, §7
- [ ] **DB-0.4** Hiện thực `ensureIndexes()` cho từng repository, gọi lúc khởi động; bắt đầu với unique `users.email`. → DAT-02, DAT-03
- [ ] **DB-0.5** Script seed: một ICPDP officer, một policy version, một lịch học kỳ hai kỳ, ba property, một evaluation scheme. → UC04, UC43, UC46

### Backend

- [ ] **BE-0.1** Dựng khung bốn tầng (`domain`, `usecase`, `interface/http`, `infra`) kèm `README.md` cho mỗi thư mục và phần kiểm tra hướng phụ thuộc trong `scripts/check-constitution.sh`. → CON-02, CON-13, NFR-MNT-05
- [ ] **BE-0.2** Phong bì response `{ data }`, ánh xạ `DomainError` kind → 400/404/409, 401/403/423 cho phần xác thực, 500 cho phần còn lại. → API-02, CON-04
- [ ] **BE-0.3** Validate bằng zod ở biên route trước mọi lời gọi Mongoose, cộng registry `zod-openapi` phục vụ tại `/docs`. → API-03, API-05, SEC-07
- [ ] **BE-0.4** Các bản giả repository in-memory để một usecase unit-test được mà không cần database. → NFR-MNT-01
- [ ] **BE-0.5** `AuditPort` + bản cài Mongo; helper ghi `{entityType, entityId, action, actor, before, after, diff, reason, correlationId}` từ bên trong usecase. → AUD-01, AUD-02
- [ ] **BE-0.6** `NotificationPort` + ghi vào outbox; `EmailPort` dạng stub. Chưa gửi gì cả. → NTF-01, CON-09
- [ ] **BE-0.7** Khung scheduler: interval + lease document trong Mongo để instance thứ hai không chạy trùng. → NFR-REL-05, NTF-07
- [ ] **BE-0.8** Helper phân trang, sắp xếp và lọc theo trạng thái dùng chung cho mọi endpoint danh sách. → API-06

### Frontend

- [ ] **FE-0.1** Thêm `react-router`; ba lớp vỏ workspace (`student`, `club`, `icpdp`) cộng `auth`, với một layout có hiểu vai trò. → SRS §3.1, điều kiện kích hoạt của ADR-002
- [ ] **FE-0.2** Token thiết kế trong `index.css` (`@theme` + `:root.dark`); kiểm tra mọi token ngữ nghĩa đạt ≥ 4.5:1 ở cả hai theme. → UI-01, NFR-USE-01
- [ ] **FE-0.3** Bộ kit `components/ui`: button, input, select, table, card, badge, modal, toast, skeleton, empty state, pagination. → UI-05, UI-06
- [ ] **FE-0.4** `components/custom`: `StatusBadge` (ánh xạ mọi trạng thái của SRS §6 sang một token **kèm nhãn chữ**), `ApprovalTimeline`, `ConflictBanner`, `DeadlineChip`. → UI-02
- [ ] **FE-0.5** Mẫu `services/` + `hooks/` với React Query; mỗi module một service có kiểu, query key khai báo đúng một lần. → CON-03
- [ ] **FE-0.6** i18next với file `en`/`vi` tách theo module; không chuỗi hiển thị nào bị viết cứng. → NFR-I18N-01
- [ ] **FE-0.7** Màn hình lỗi chung, màn 403 và 423; component hộp thoại xác nhận cho các hành động phá huỷ. → UI-03, SA-01

---

## Vòng 1 — Truy cập & cấu hình (UC01–UC05)

### Database
- [ ] **DB-1.1** Các collection `users`, `studentProfiles`, `roles`, `permissions`, `userRoleAssignments`. → SRS §7.1
- [ ] **DB-1.2** Các collection `policyVersions`, `routingRuleSets`, `routingRules`. → UC04, UC05
- [ ] **DB-1.3** Index: unique `users.email`, `users.accountState`, `userRoleAssignments(userId, revokedAt)`, `policyVersions.effectiveFrom`, `routingRules(ruleSetId, requestType, priority)`. → DAT-02, DAT-03
- [ ] **DB-1.4** Bộ phân giải chính sách: "version đang hiệu lực tại ngày D", để một quyết định trong quá khứ đọc đúng giá trị của nó. → FR-UC04-04

### Backend
- [ ] **BE-1.1** Redirect + callback Google OAuth; tạo `User` + `StudentProfile` ở lần đăng nhập đầu; cookie được ký, httpOnly, SameSite. → FR-UC01-01…06
- [ ] **BE-1.2** Kiểm tra domain theo chính sách đang hiệu lực; từ chối và không tạo gì khi không đạt. → FR-UC01-03/09, BR32
- [ ] **BE-1.3** Đồng bộ lại profile ở mỗi lần đăng nhập mà không đụng tới tập vai trò. → FR-UC01-08
- [ ] **BE-1.4** Từ chối tài khoản bị khoá với mã 423 và **ghi audit lần thử đó**. → FR-UC01-10, AUD-03
- [ ] **BE-1.5** Middleware kiểm tra quyền (thô) + helper `assertScope()` dùng bên trong usecase (CLB, chức vụ, nhiệm kỳ đang hoạt động). → SEC-03, CON-06
- [ ] **BE-1.6** `GET /dashboard` — mỗi vai trò một lần đọc tổng hợp, mỗi panel là một truy vấn đi qua index, suy giảm độc lập theo panel. → FR-UC02-01…06
- [ ] **BE-1.7** UC03 quản trị tài khoản và vai trò; vô hiệu hoá phiên khi thay đổi; từ chối việc tự thu hồi vai trò quản trị cuối cùng. → FR-UC03-01…09
- [ ] **BE-1.8** UC04 đánh phiên bản chính sách kèm ngày hiệu lực và chốt chặn "sẽ làm vô hiệu một quyết định đã ra". → FR-UC04-01…07
- [ ] **BE-1.9** UC05 rule định tuyến kèm phần validate tính đầy đủ và không nhập nhằng, và endpoint mô phỏng. → FR-UC05-01…07
- [ ] **BE-1.10** `resolveRequiredLevel(request)` để UC08/26/36/48 dùng về sau. → BR16

### Frontend
- [ ] **FE-1.1** Màn hình đăng nhập, callback OAuth, chọn workspace, màn từ chối truy cập và màn tài khoản bị khoá. → UC01
- [ ] **FE-1.2** Dashboard Student: đơn của tôi, đăng ký, lịch sử check-in, tư cách thành viên, khiếu nại. → FR-UC02-04
- [ ] **FE-1.3** Dashboard CMB: hồ sơ đã nộp và trạng thái, deadline, lịch sự kiện và booking, số thành viên, tình hình ngân sách, phản hồi chờ xem. → FR-UC02-03
- [ ] **FE-1.4** Dashboard ICPDP: hồ sơ chờ duyệt theo loại và độ trễ, CLB theo trạng thái, báo cáo quá hạn, ngân sách chưa đối soát, hồ sơ đang mở, booking sắp tới. → FR-UC02-02
- [ ] **FE-1.5** Trạng thái lỗi theo từng panel — một module hỏng không được làm trắng cả trang. → FR-UC02-06, UI-07
- [ ] **FE-1.6** Màn hình tài khoản & vai trò; cấu hình chính sách & deadline; cấu hình định tuyến phê duyệt kèm khung mô phỏng. → UC03, UC04, UC05

---

## Vòng 2 — Thành lập & quản trị CLB (UC06–UC15)

### Database
- [ ] **DB-2.1** Các collection `clubs`, `clubApplications`, `clubApplicationVersions`, `clubSuspensionRequests`. → SRS §7.1
- [ ] **DB-2.2** Các collection `clubTerms`, `clubPositions`, `clubPositionAssignments`, `boardNominations`, `boardNominationSeats`, `transitionPlans`. → UC09–UC13, UC23
- [ ] **DB-2.3** Index `clubs(state, field)`, `clubApplications(state, submittedAt)`, unique `clubApplicationVersions(applicationId, versionNo)`, `clubTerms(clubId, state)`, `clubTerms(clubId, endAt)`, unique `clubPositions(clubId, code)`. → DAT-02, DAT-03
- [ ] **DB-2.4** Chốt chặn chỉ-ghi-thêm trên `clubApplicationVersions` (từ chối mọi update và delete ở biên repository). → BR04, CON-08

### Backend
- [ ] **BE-2.1** UC06 khám phá công khai: liệt kê CLB Active + CLB Suspended có đánh dấu, không bao giờ Dissolved; dữ liệu tổng hợp cho trang CLB. → FR-UC06-01…07, BR09 · **đang bị chặn bởi quyết định I22**
- [ ] **BE-2.2** UC07 nộp / lưu nháp / nộp lại thành một version mới / rút hồ sơ. → FR-UC07-01…11
- [ ] **BE-2.3** UC08 thẩm định và quyết định với ba kết quả; tạo Club ở `Pending Setup` và cấp quyền sáng lập tạm thời khi phê duyệt. → FR-UC08-01…13
- [ ] **BE-2.4** Scheduler: `Revision Requested → Expired` khi hết deadline. → SCH-04
- [ ] **BE-2.5** UC09 hồ sơ và cơ cấu; từ chối sửa trường thuộc thẩm quyền nhà trường và từ chối xoá chức vụ đang có người giữ. → FR-UC09-01…08
- [ ] **BE-2.6** UC10 đề cử kèm kiểm tra điều kiện và kiểm tra chồng lấn nhiệm kỳ Chủ nhiệm. → FR-UC10-01…07, BR06, BR07
- [ ] **BE-2.7** UC11 xác nhận: kích hoạt nhiệm kỳ, cấp quyền, thu hồi quyền sáng lập, chuyển CLB sang Active; xác nhận một phần. → FR-UC11-01…09
- [ ] **BE-2.8** UC12 kế hoạch chuyển giao với nghĩa vụ nạp sẵn và chốt chặn "không nghĩa vụ nào được thiếu người nhận". → FR-UC12-01…05
- [ ] **BE-2.9** UC13 xác nhận: đóng nhiệm kỳ cũ, kích hoạt nhiệm kỳ mới, chuyển quyền, giữ lịch sử. → FR-UC13-01…07, BR08
- [ ] **BE-2.10** UC14 yêu cầu tạm ngừng kèm chốt chặn "có sự kiện hoặc booking đã duyệt nằm trong giai đoạn". → FR-UC14-01…03
- [ ] **BE-2.11** UC15 tạm ngừng / kích hoạt lại: chặn đợt tuyển, đề xuất và booking; huỷ các đề xuất chưa quyết định; cascade sang UC28 A1 và UC49 A1. → FR-UC15-01…05
- [ ] **BE-2.12** UC15 giải thể: ghi quyết định kèm học kỳ hiệu lực và huỷ mọi thứ kết thúc sau học kỳ đó. → FR-UC15-06/07, BR45
- [ ] **BE-2.13** Scheduler: `→ Dissolving` vào đầu học kỳ kế tiếp, và `→ Dissolved` vào cuối học kỳ đó như một bước tất-cả-hoặc-không-gì, cảnh báo ICPDP khi thất bại. → SCH-05, SCH-06, FR-UC15-09…11
- [ ] **BE-2.14** UC23 phân công chức vụ kèm chốt chặn thành viên phải Active và chức vụ chỉ một người giữ. → FR-UC23-01…06

### Frontend
- [ ] **FE-2.1** Danh bạ CLB công khai, trang CLB, danh sách sự kiện, trang sự kiện. → UC06
- [ ] **FE-2.2** Trình hướng dẫn nộp hồ sơ thành lập, màn xác nhận nộp, khung xem lịch sử version, màn trạng thái và kết quả. → UC07
- [ ] **FE-2.3** Hàng đợi hồ sơ của ICPDP và màn thẩm định-và-quyết định kèm nhận xét theo từng phần. → UC08
- [ ] **FE-2.4** Hồ sơ CLB, thông tin vận hành, cơ cấu tổ chức, phân công chức vụ. → UC09, UC23
- [ ] **FE-2.5** Đề cử ban chủ nhiệm, xác nhận ban chủ nhiệm, kế hoạch chuyển giao, thẩm định chuyển giao, lịch sử lãnh đạo. → UC10–UC13
- [ ] **FE-2.6** Yêu cầu tạm ngừng và trạng thái; quản lý CLB phía ICPDP, chi tiết CLB, hành động vòng đời với hệ quả được nêu rõ trong hộp xác nhận. → UC14, UC15, SA-01

---

## Vòng 3 — Tuyển thành viên → thành viên (UC16–UC24)

### Database
- [ ] **DB-3.1** Các collection `recruitmentCampaigns`, `recruitmentApplications`, `candidateEvaluations`. → SRS §7.1
- [ ] **DB-3.2** Các collection `clubMemberships`, `membershipWithdrawalRequests`. → UC20–UC22
- [ ] **DB-3.3** Unique `recruitmentApplications(campaignId, userId)`; unique `candidateEvaluations(applicationId, reviewerId)`. → BR12, UC19
- [ ] **DB-3.4** Unique **từng phần** `clubMemberships(clubId, userId)` lọc theo `state in [Active, Inactive]`, để một sinh viên đã Left có thể quay lại. → FR-UC21-09, BR46
- [ ] **DB-3.5** Index `recruitmentCampaigns(state, windowStart, windowEnd)`, `recruitmentApplications(campaignId, state)`, `clubMemberships(clubId, state)`. → DAT-03

### Backend
- [ ] **BE-3.1** UC16 tạo / công bố / huỷ đợt tuyển kèm validate khung thời gian và chốt chặn CLB Suspended. → FR-UC16-01…08, BR01, BR09
- [ ] **BE-3.2** Scheduler: mở khung thời gian → `Accepting Applications`, đóng khung thời gian → `Screening`. → SCH-03
- [ ] **BE-3.3** UC17 ứng tuyển / lưu nháp / rút đơn với bốn đường từ chối (khung thời gian, trùng đơn, đang là thành viên, bị cấm). → FR-UC17-01…09
- [ ] **BE-3.4** UC18 sàng lọc và quyết định, thao tác hàng loạt, đẩy từ danh sách chờ, chốt chặn chỉ tiêu. → FR-UC18-01…10
- [ ] **BE-3.5** UC19 đánh giá theo rubric, độ phân tán giữa nhiều người đánh giá, bất biến sau quyết định. → FR-UC19-01…06
- [ ] **BE-3.6** UC20 tiếp nhận, tiếp nhận thủ công kèm lý do, từ chối lời mời, chốt chặn `Banned`. → FR-UC20-01…07, BR13, BR46
- [ ] **BE-3.7** UC21 đổi trạng thái kèm ngày hiệu lực, lý do cấm bắt buộc, thu hồi chức vụ, chốt chặn ghế ban chủ nhiệm, chốt chặn ngày lùi về quá khứ. → FR-UC21-01…10
- [ ] **BE-3.8** UC21 A2 đợt quét đăng ký lại thành viên theo học kỳ trong scheduler. → SCH-08
- [ ] **BE-3.9** UC22 yêu cầu rời CLB và đường thực thi của nó sang UC21. → FR-UC22-01…05
- [ ] **BE-3.10** UC24 dữ liệu tổng hợp cho không gian thành viên (tư cách thành viên, danh sách thành viên, ban chủ nhiệm, sự kiện sắp tới kèm trạng thái của tôi, lịch sử điểm danh, nghĩa vụ còn treo). → FR-UC24-01…09

### Frontend
- [ ] **FE-3.1** Danh sách đợt tuyển, tạo và công bố; danh sách người nộp đơn kèm bộ lọc. → UC16, UC18
- [ ] **FE-3.2** Trang chi tiết đợt tuyển phía sinh viên, biểu mẫu ứng tuyển, màn xác nhận đã nộp, đơn của tôi, chi tiết đơn. → UC17
- [ ] **FE-3.3** Bảng sàng lọc kèm thao tác hàng loạt, biểu mẫu đánh giá ứng viên, màn quyết định và lý do. → UC18, UC19
- [ ] **FE-3.4** Màn tiếp nhận; danh sách thành viên và chi tiết thành viên kèm dòng thời gian lịch sử trạng thái. → UC20, UC21
- [ ] **FE-3.5** Không gian thành viên và luồng gửi yêu cầu rời CLB. → UC24, UC22

---

## Vòng 4 — Duyệt → công bố sự kiện (UC25–UC28)

### Database
- [ ] **DB-4.1** Các collection `events`, `eventProposalVersions`. → SRS §7.1
- [ ] **DB-4.2** Index `events(propertyId, startAt, endAt)` — phía đọc của quy tắc xung đột. → BR15, DAT-03
- [ ] **DB-4.3** Index `events(clubId, state)`, `events(state, startAt)`, unique `eventProposalVersions(eventId, revisionNo)`. → DAT-02, DAT-03

### Backend
- [ ] **BE-4.1** **Quy tắc xung đột BR15 dưới dạng một domain service dùng lại được**, trả về No Conflict / Warning / Blocking Conflict trên cả sự kiện lẫn booking đã duyệt, với ngưỡng lấy từ UC04. → BR15
- [ ] **BE-4.2** UC25 nộp / lưu nháp / nộp lại / chuỗi hoạt động định kỳ, với năm đường từ chối (xung đột chặn, báo cáo quá hạn, CLB bị tạm ngừng, vượt học kỳ, sau khi có quyết định giải thể). → FR-UC25-01…13, BR44, BR45
- [ ] **BE-4.3** UC26 thẩm định và quyết định, định tuyến cấp thứ hai, phê duyệt kèm điều kiện; duyệt một đề xuất **không** đồng nghĩa duyệt booking của nó. → FR-UC26-01…11
- [ ] **BE-4.4** Scheduler: đề xuất `Revision Requested → Expired`. → SCH-04
- [ ] **BE-4.5** UC27 công bố kèm khung thời gian đăng ký và phạm vi đối tượng; biến thể nội bộ và biến thể không cần đăng ký. → FR-UC27-01…08
- [ ] **BE-4.6** Scheduler: `Upcoming → Ongoing → Completed`. → SCH-01
- [ ] **BE-4.7** UC28 huỷ / đổi lịch: đánh giá lại BR15, giải phóng hoặc cập nhật booking, thông báo người đã đăng ký, tính lại nghĩa vụ, ghi nhận huỷ sát giờ là tín hiệu tuân thủ. → FR-UC28-01…09 · **đang bị chặn bởi quyết định D4**
- [ ] **BE-4.8** UC28 A1 cascade hệ thống được UC15 và UC42 gọi tới — ICPDP không phải actor của UC28. → FR-UC28-06

### Frontend
- [ ] **FE-4.1** Biểu mẫu đề xuất kèm banner xung đột theo thời gian thực và bước đính kèm booking. → UC25, UI-02
- [ ] **FE-4.2** Danh sách đề xuất, trang chi tiết kèm lịch sử bản sửa, màn nhận xét và kết quả. → UC25, UC26
- [ ] **FE-4.3** Hàng đợi đề xuất của ICPDP và màn thẩm định-và-quyết định kèm nhận xét có cấu trúc và ô nhập điều kiện. → UC26
- [ ] **FE-4.4** Màn công bố; màn huỷ / đổi lịch với hệ quả được nêu rõ trong hộp xác nhận. → UC27, UC28, SA-01

---

## Vòng 5 — Đăng ký → điểm danh (UC29–UC32)

### Database
- [ ] **DB-5.1** Các collection `eventRegistrations`, `attendances`. → SRS §7.1
- [ ] **DB-5.2** Unique `eventRegistrations(eventId, studentId)` và unique `attendances(eventId, studentId)`. → BR17, BR18, DAT-02
- [ ] **DB-5.3** Index `eventRegistrations(eventId, state, waitlistPosition)` cho thứ tự danh sách chờ. → FR-UC30-06
- [ ] **DB-5.4** Trường đếm số đã xác nhận trên `events`, cập nhật bằng **`findOneAndUpdate` có điều kiện**, không bao giờ đọc-kiểm-ghi. → DAT-04, CON-07

### Backend
- [ ] **BE-5.1** UC29 đăng ký với validate khung thời gian, đối tượng, trùng lặp và sức chứa trong một thao tác ghi nguyên tử. → FR-UC29-01…09
- [ ] **BE-5.2** UC29 A1 danh sách chờ và A2 tự huỷ để giải phóng suất. → FR-UC29-04/05
- [ ] **BE-5.3** UC30 đổi sức chứa và đẩy lên theo chính sách đã cấu hình; từ chối giảm xuống dưới số đã xác nhận. → FR-UC30-01…06
- [ ] **BE-5.4** UC31 check-in: xác minh đăng ký và khung giờ, tạo đúng một bản ghi, **mở feedback window**. → FR-UC31-01…03, BR36
- [ ] **BE-5.5** UC31 A1 check-in thủ công lưu lại ai thực hiện; A2 khách vãng lai tạo kèm bản đăng ký. → FR-UC31-04/05
- [ ] **BE-5.6** UC31 các đường từ chối khi check-in trùng và khi ngoài khung giờ. → FR-UC31-06…08, BR18
- [ ] **BE-5.7** UC32 đánh dấu bản ghi bất thường, sửa kèm lý do, chốt và khoá. → FR-UC32-01…07
- [ ] **BE-5.8** UC32 A1 mở khoá chỉ dành cho vai trò đặc biệt, có ghi audit. → BR19, AUD-03
- [ ] **BE-5.9** Test tương tranh: N lượt đăng ký song song vào một sự kiện sức chứa 1 phải cho ra đúng một bản `Confirmed`. → NFR-PERF-03

### Frontend
- [ ] **FE-5.1** Biểu mẫu đăng ký sự kiện, màn xác nhận, danh sách đăng ký của tôi. → UC29
- [ ] **FE-5.2** Màn check-in (mã / QR) kèm thông điệp cho trường hợp trùng và ngoài khung giờ. → UC31, MSG11
- [ ] **FE-5.3** Màn quản lý đăng ký và danh sách chờ. → UC30
- [ ] **FE-5.4** Màn chốt điểm danh kèm phần xem lại bản ghi bất thường và hộp xác nhận khoá. → UC32, SA-01

---

## Vòng 6 — Trách nhiệm sau sự kiện (UC33, UC34)

### Database
- [ ] **DB-6.1** Collection `postEventReports` với bản chụp `preloadedFigures` bị đóng băng. → DAT-07
- [ ] **DB-6.2** Unique `postEventReports.eventId`; index `(state, submittedAt)`. → DAT-02, DAT-03

### Backend
- [ ] **BE-6.1** UC33 nạp sẵn (đề xuất, điểm danh đã chốt, ngân sách và khoản chi, bản tổng hợp phản hồi) và đóng băng lúc nộp. → FR-UC33-01/04
- [ ] **BE-6.2** UC33 từ chối nộp khi chưa chốt điểm danh; vẫn nhận nhưng đánh dấu báo cáo trễ. → FR-UC33-07/08, BR20, BR21
- [ ] **BE-6.3** UC34 chấp nhận / trả về / ghi nhận một phát hiện mở hồ sơ ở UC42. → FR-UC34-01…06
- [ ] **BE-6.4** UC34 từ chối chấp nhận khi số liệu mâu thuẫn với bảng điểm danh đã chốt. → FR-UC34-05

### Frontend
- [ ] **FE-6.1** Biểu mẫu báo cáo sau sự kiện, hiển thị rõ trường nào là nạp sẵn và trường nào phải nhập tay. → UC33
- [ ] **FE-6.2** Hàng đợi báo cáo của ICPDP, màn đối chiếu kế hoạch–thực tế, màn quyết định, hành động ghi nhận phát hiện. → UC34

---

## Vòng 7 — Cơ sở vật chất (UC46–UC49)

### Database
- [ ] **DB-7.1** Các collection `properties`, `propertyBookings`. → SRS §7.1
- [ ] **DB-7.2** Index `propertyBookings(propertyId, startAt, endAt)` — phía đọc xung đột và chốt chặn lúc phê duyệt. → BR15, BR33
- [ ] **DB-7.3** `findOneAndUpdate` có điều kiện lúc phê duyệt để hai booking chồng lấn không thể cùng trở thành Approved. → DAT-04, BR33
- [ ] **DB-7.4** Index `propertyBookings(state, startAt)` cho scheduler. → SCH-02

### Backend
- [ ] **BE-7.1** UC46 danh mục kèm khung giờ được đặt, giai đoạn khoá, ngừng kích hoạt, và chốt chặn xoá. → FR-UC46-01…08, BR41
- [ ] **BE-7.2** UC47 yêu cầu kèm hiển thị tình trạng trống, đánh giá BR15, đính kèm vào đề xuất, nộp lại. → FR-UC47-01…07
- [ ] **BE-7.3** UC47 các đường từ chối: khung giờ đã có người, giai đoạn khoá, cảnh báo sức chứa, CLB bị tạm ngừng, sau khi có quyết định giải thể. → FR-UC47-08…12, BR33, BR34, BR45
- [ ] **BE-7.4** UC48 quyết định và khoá khung giờ; đề xuất khung giờ thay thế; xử lý tình huống tranh chấp với một lần duyệt song song. → FR-UC48-01…08
- [ ] **BE-7.5** UC49 huỷ / trả chỗ; tự động giải phóng từ UC28; huỷ sát giờ là tín hiệu tuân thủ. → FR-UC49-01…07, BR35
- [ ] **BE-7.6** Scheduler `Approved → In Use → Completed`. → SCH-02

### Frontend
- [ ] **FE-7.1** Màn quản trị danh mục cơ sở vật chất kèm trình sửa khung giờ và giai đoạn khoá. → UC46
- [ ] **FE-7.2** Màn yêu cầu booking kèm lịch hiển thị tình trạng trống và banner xung đột. → UC47
- [ ] **FE-7.3** Hàng đợi booking của ICPDP và màn quyết định. → UC48
- [ ] **FE-7.4** Màn booking của CLB kèm huỷ / trả chỗ và cảnh báo thời hạn báo trước. → UC49

---

## Vòng 8 — Tài chính (UC35–UC39)

### Database
- [ ] **DB-8.1** Các collection `budgetRequests`, `budgetRequestVersions`, `budgetDisbursements`. → SRS §7.1
- [ ] **DB-8.2** Các collection `expenses`, `financialEvidences`, `financialReconciliations`. → UC38, UC39
- [ ] **DB-8.3** Unique `budgetRequestVersions(budgetRequestId, versionNo)`; unique `financialReconciliations.budgetRequestId`. → DAT-02
- [ ] **DB-8.4** Index `expenses(budgetRequestId, hasEvidence)` cho tổng số thiếu chứng từ và lời nhắc bổ sung chứng từ. → UC39, §8.2
- [ ] **DB-8.5** Chốt và ghi rõ kiểu dữ liệu tiền tệ (số nguyên theo đơn vị nhỏ nhất) và dùng thống nhất. → NFR-MNT-02

### Backend
- [ ] **BE-8.1** UC35 nộp kèm chốt chặn mục đích nghiệp vụ; nộp lại giữ **cả** lịch sử version lẫn lịch sử phê duyệt. → FR-UC35-01…07, BR22
- [ ] **BE-8.2** UC36 quyết định với số tiền thấp hơn, phê duyệt từng phần theo hạng mục, định tuyến cấp thứ hai, huỷ khi sự kiện bị từ chối. → FR-UC36-01…09
- [ ] **BE-8.3** UC37 giải ngân kèm chốt chặn tổng luỹ kế và giải ngân từng phần. → FR-UC37-01…06, BR23
- [ ] **BE-8.4** UC38 khoản chi + chứng từ trong một thao tác; cờ ngoài hạng mục và vượt phần còn lại; đường bổ sung chứng từ sau. → FR-UC38-01…08, BR24, BR25
- [ ] **BE-8.5** UC39 đối soát tính đủ bảy con số; kết quả Exception; chốt chặn lúc đóng hồ sơ. → FR-UC39-01…09, BR26
- [ ] **BE-8.6** Read model về tình hình ngân sách dùng cho dashboard CMB. → FR-UC02-03

### Frontend
- [ ] **FE-8.1** Danh sách và biểu mẫu yêu cầu ngân sách kèm bộ chọn mục đích và các dòng theo hạng mục. → UC35
- [ ] **FE-8.2** Hàng đợi ngân sách của ICPDP, màn quyết định kèm phê duyệt theo hạng mục và số tiền đã giảm. → UC36
- [ ] **FE-8.3** Màn ghi nhận giải ngân. → UC37
- [ ] **FE-8.4** Danh sách và biểu mẫu khoản chi kèm đính kèm chứng từ và các cờ ngoại lệ. → UC38
- [ ] **FE-8.5** Màn đối soát hiển thị tách bạch **Đã duyệt / Đã giải ngân / Đã ghi nhận / Có chứng từ / Thiếu chứng từ / Còn lại / Chênh lệch**. → AC13, FR-UC39-01

---

## Vòng 9 — Báo cáo định kỳ (UC40, UC41)

### Database
- [ ] **DB-9.1** Collection `periodicReports`; unique `(clubId, periodCode)`; index `(state, dueAt)`. → DAT-02, DAT-03
- [ ] **DB-9.2** Bộ phân giải kỳ báo cáo từ lịch học kỳ của UC04. → ASM-05

### Backend
- [ ] **BE-9.1** UC40 nạp sẵn sự kiện, thành viên, điểm danh và tài chính của kỳ; đóng băng lúc nộp. → FR-UC40-01…04, DAT-07
- [ ] **BE-9.2** UC40 nhận báo cáo trễ kèm cờ; sửa lại thành một version mới. → FR-UC40-06/07
- [ ] **BE-9.3** UC41 chấp nhận / trả về / chấp nhận kèm ghi nhận / ghi nhận việc không nộp. → FR-UC41-01…06
- [ ] **BE-9.4** Thang nhắc hạn trong scheduler: `T−X` nhắc, `T` đến hạn, `T+Y` quá hạn, `T+Z` leo thang. → SCH-09, NTF-05
- [ ] **BE-9.5** Công tắc cưỡng chế BR21 được UC25 E2 tiêu thụ. → BR21

### Frontend
- [ ] **FE-9.1** Danh sách, biểu mẫu và trạng thái báo cáo định kỳ phía CLB. → UC40
- [ ] **FE-9.2** Màn thẩm định báo cáo của ICPDP với số liệu hệ thống đặt cạnh bên. → UC41

---

## Vòng 10 — Phản hồi & khiếu nại (UC50–UC54)

### Database
- [ ] **DB-10.1** Các collection `eventFeedbacks`, `complaints`. → SRS §7.1
- [ ] **DB-10.2** Unique `eventFeedbacks(eventId, studentId)`; index `(clubId, submittedAt)` cho bản tổng hợp theo CLB. → BR36, DAT-02
- [ ] **DB-10.3** Chốt chặn bất biến trên `eventFeedbacks` (không update, không delete ở biên repository). → BR37
- [ ] **DB-10.4** Index `complaints(state, submittedAt)`, `(clubId, state)`, `(complainantId, state)`. → DAT-03

### Backend
- [ ] **BE-10.1** UC50 nộp trong window đã mở từ lúc check-in; mỗi người một lần; tuỳ chọn ẩn danh vẫn giữ liên kết nội bộ. → FR-UC50-01…09, BR36
- [ ] **BE-10.2** Service tổng hợp ẩn bản tổng hợp khi chưa đạt số người phản hồi tối thiểu. → BR40, FR-UC50-10 · **đang bị chặn bởi quyết định D3**
- [ ] **BE-10.3** Scheduler: đóng feedback window. → SCH-07
- [ ] **BE-10.4** UC51 đọc bản tổng hợp cho CMB — không bao giờ để lộ một phản hồi định danh được. → FR-UC51-01…05, SEC-05
- [ ] **BE-10.5** UC52 tiếp nhận khiếu nại chỉ định tuyến tới ICPDP; rút khiếu nại; liên kết các khiếu nại trùng. → FR-UC52-01…06, BR38
- [ ] **BE-10.6** UC53 phân loại với ba kết quả, lý do bắt buộc, leo thang tạo hồ sơ. → FR-UC53-01…08, BR39
- [ ] **BE-10.7** UC54 phần trả lời của CLB với chính sách hiển thị danh tính và tín hiệu quá hạn trả lời. → FR-UC54-01…06 · **đang bị chặn bởi quyết định D5**

### Frontend
- [ ] **FE-10.1** Biểu mẫu phản hồi mở từ "đăng ký của tôi" / không gian thành viên, kèm công tắc ẩn danh. → UC50
- [ ] **FE-10.2** Bản tổng hợp phản hồi phía CLB, hiển thị thông điệp dưới ngưỡng thay vì nội dung. → UC51, MSG12
- [ ] **FE-10.3** Biểu mẫu khiếu nại và màn khiếu nại của tôi kèm dòng thời gian trạng thái. → UC52
- [ ] **FE-10.4** Hàng đợi khiếu nại của ICPDP và màn phân loại. → UC53
- [ ] **FE-10.5** Màn trả lời khiếu nại được chuyển xuống, phía CLB. → UC54

---

## Vòng 11 — Governance intelligence (UC42–UC45)

### Database
- [ ] **DB-11.1** Các collection `violations`, `correctiveActions`. → SRS §7.1
- [ ] **DB-11.2** Các collection `evaluationSchemes`, `evaluationDimensions`, `evaluations`, `evaluationDimensionResults`. → UC43–UC45
- [ ] **DB-11.3** Unique `evaluationSchemes(periodCode, version)`, `evaluations(clubId, periodCode, revisionNo)`, `evaluationDimensionResults(evaluationId, dimensionCode)`. → DAT-02
- [ ] **DB-11.4** Các aggregation pipeline cấp dữ liệu cho D1–D6 từ các collection vận hành. → EVL-02

### Backend
- [ ] **BE-11.1** UC42 vòng đời hồ sơ với nguồn gốc, mức độ nghiêm trọng, chứng cứ, phần trả lời, quyết định, biện pháp khắc phục. → FR-UC42-01…10, BR27, BR28
- [ ] **BE-11.2** UC42 A1 leo thang sang UC15 và liên kết ngược về hồ sơ. → FR-UC42-07
- [ ] **BE-11.3** Đầu vào tín hiệu tuân thủ từ UC28, UC49, UC34, UC39, UC54. → FR-UC42-01
- [ ] **BE-11.4** UC43 đánh phiên bản scheme kèm validate tổng trọng số và chức năng sao chép. → FR-UC43-01…06, BR29
- [ ] **BE-11.5** UC44 sinh bản nháp, thu thập chín nguồn và lưu lineage cho từng dimension. → FR-UC44-01…06, EVL-02
- [ ] **BE-11.6** UC44 đánh dấu `Insufficient data` thay vì chấm 0. → FR-UC44-06, EVL-03
- [ ] **BE-11.7** UC45 xem lại, dimension chấm tay kèm lý giải, chốt, công bố, bản sửa sau công bố. → FR-UC45-01…07, BR30
- [ ] **BE-11.8** Widget sức khoẻ / rủi ro CLB cho dashboard ICPDP. → §10.1

### Frontend
- [ ] **FE-11.1** Danh sách hồ sơ tuân thủ, trang chi tiết và dòng thời gian, phần trả lời của CLB và thao tác kết luận. → UC42
- [ ] **FE-11.2** Hành động ghi nhận vi phạm ngay từ màn thẩm định báo cáo. → UC34, UC42
- [ ] **FE-11.3** Trình sửa scheme đánh giá với validate tổng trọng số theo thời gian thực. → UC43
- [ ] **FE-11.4** Khung xem bản nháp đánh giá với khả năng **đi sâu vào chứng cứ** của từng dimension. → UC44, EVL-02
- [ ] **FE-11.5** Màn chốt và công bố; màn kết quả và xu hướng đánh giá phía CLB. → UC45
- [ ] **FE-11.6** Trang tổng quan tuân thủ và đánh giá của CLB. → §10.2

---

## Gia cố & phát hành

### Database
- [ ] **DB-R.1** Kiểm tra mọi index của DAT-02 và DAT-03 đều tồn tại trong một database mới sau khi khởi động.
- [ ] **DB-R.2** Chạy `explain()` trên mọi truy vấn của dashboard và danh sách; không được có collection scan.
- [ ] **DB-R.3** Diễn tập sao lưu và khôi phục. → NFR-REL-02
- [ ] **DB-R.4** Xuất ERD cuối cùng từ dbdiagram.io và cập nhật Figure IV.4 của báo cáo.

### Backend
- [ ] **BE-R.1** Bật bộ gửi Google SMTP thật; kiểm tra retry, backoff và `emailDeliveryLogs`. → NTF-02, NTF-03
- [ ] **BE-R.2** Rà soát mức phủ audit theo AUD-03 — mọi quyết định được liệt kê đều ghi một dòng.
- [ ] **BE-R.3** Rà soát phân quyền: với mỗi vai trò, mọi endpoint mà nó không được chạm tới đều trả 403 **và** được ghi audit. → SEC-01, SEC-08, AC17
- [ ] **BE-R.4** Rà soát test quy tắc nghiệp vụ: mỗi BR trong SRS §5 có một test. → NFR-MNT-06
- [ ] **BE-R.5** Rà soát test máy trạng thái: mọi chuyển trạng thái và mọi chuyển trạng thái bị từ chối trong SRS §6. → NFR-MNT-06
- [ ] **BE-R.6** Seed bộ dữ liệu nghiệm thu phủ AC01–AC22.

### Frontend
- [ ] **FE-R.1** Rà soát khả năng tiếp cận: độ tương phản ở cả hai theme, vòng focus, `aria-label` trên nút chỉ có icon, vùng chạm 44×44 px. → NFR-USE-01…03
- [ ] **FE-R.2** Rà soát responsive ở 375 / 768 / 1024 / 1440 px; bảng chuyển thành thẻ xếp chồng dưới `md`. → NFR-USE-04
- [ ] **FE-R.3** Rà soát ngôn ngữ `vi`: không nhãn nào bị cắt, không có chiều rộng cố định quanh giá trị đã dịch. → NFR-I18N-02
- [ ] **FE-R.4** Hộp thoại xác nhận trên mọi hành động phá huỷ liệt kê ở SA-01.
- [ ] **FE-R.5** Trạng thái rỗng và trạng thái tải trên mọi danh sách; không hiển thị trạng thái rỗng khi lần tải đầu còn chạy. → UI-05

---

## Checklist xuyên suốt — áp dụng cho mọi task backend

1. **Kiểm tra phạm vi** chạy bên trong usecase, không chỉ ở route. → SEC-03
2. Mọi chuyển trạng thái đều ghi **một dòng audit từ trong usecase**. → AUD-01, AUD-02
3. Mọi thông báo đều được **đưa vào hàng đợi bên trong transaction đã commit**, không bao giờ gửi đồng bộ. → NTF-01
4. Một lần nộp lại ghi **một document version mới**; không gì ghi đè lên một version đã nộp. → BR04
5. Usecase chỉ ghi aggregate **của chính module mình**; tác động xuyên module đi qua usecase của module sở hữu. → CON-05
6. Không xoá cứng bất cứ thứ gì đã bước vào một workflow; một trạng thái vòng đời thay cho việc xoá. → DAT-08
7. Mọi con số hiển thị trên dashboard là **truy vấn trực tiếp**, không bao giờ là bản sao thứ hai. → FR-UC02-01

## Các task đang bị chặn — nhóm phải chốt quyết định trước

| Task | Bị chặn bởi | Câu hỏi |
|---|---|---|
| BE-2.1 | Review issue I22 | CLB `Suspended` có được liệt kê ở danh bạ công khai hay không? |
| BE-1.9, BE-1.10 | Quyết định D1 | Cấp duyệt thứ hai là một quyền RBAC hay một actor thứ tư? |
| BE-1.8 | Quyết định D2 | Ngoài chín giá trị của UC04, còn giá trị nào trở nên sửa được? |
| BE-10.2 | Quyết định D3 | Số người phản hồi tối thiểu ban đầu cho BR40 là bao nhiêu? |
| BE-4.7 | Quyết định D4 | Một sự kiện đổi lịch có cần một quyết định mới từ UC26 không? |
| BE-10.7 | Quyết định D5 | CLB có thấy danh tính người khiếu nại không? |
