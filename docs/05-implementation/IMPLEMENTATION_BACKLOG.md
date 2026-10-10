# UCMS — Backlog triển khai theo SRS và mockup

> Trạng thái đối chiếu: nhánh `khanhnvd`, `docs/SRS.md`, `docs/04-design/FPT_Club.html`, thiết kế DBML và source hiện tại. `[x]` là phần đã cài và có test phù hợp; `[ ]` là chưa xong. Ghi chú dưới từng nhóm nêu rõ phần đã code nhưng còn chờ kiểm chứng. Khi bắt đầu code một tính năng, tạo `SPEC.md` và `TASKS.md` trong `.sdd/specs/feat-*/` theo `.rules/README.md`; đánh dấu tiến độ ở đó.

## 1. Điểm xuất phát và nguyên tắc ưu tiên

- Server dùng Express 5 + TypeScript + Mongoose 8; Auth/Authz UC01/UC03 đã có bản đầu, API demo User đã gỡ mount. Các module nghiệp vụ sau Auth chưa triển khai.
- Client dùng React 19 + Vite 6, Tailwind v4, React Query, TanStack Table v9, i18next `en`/`vi`; đã có màn login/workspace và quản lý tài khoản bản đầu, chưa có router hay các màn nghiệp vụ.
- MongoDB trong `docker-compose.yml` là cơ sở dữ liệu duy nhất. Schema/index của 49 collection từ DBML đã được tạo bằng công cụ bootstrap; Auth dùng thêm `authSessions`. Kiểm chứng integration với Mongo thật vẫn chưa chạy được trong sandbox này.
- `FPT_Club.html` là bundle mockup ba ứng dụng: Public/Student, Club Admin và ICPDP. Dùng để đối chiếu **màn hình, điều hướng, trạng thái và thao tác**. Dữ liệu mẫu, `location.hash`, các nút đổi role giả lập và nội dung demo không phải hợp đồng nghiệp vụ. SRS quyết định hành vi; `design-guidelines.md` quyết định token màu, typography, hai theme và accessibility. Không mang runtime/React bundle của mockup vào client.
- Ưu tiên đầu tiên là **Auth + Authz chạy xuyên suốt server, MongoDB và client**. Chỉ sau khi có lớp bảo vệ route/use case mới mở các module ghi dữ liệu khác. Guest vẫn xem UC06. Mọi chức năng còn lại thuộc cùng bản phát hành theo SRS §15; thứ tự dưới đây là thứ tự xây dựng, không phải cắt phạm vi.

### Các lệch cần xử lý ngay trong kế hoạch

| Nguồn | Phát hiện | Cách xử lý khi code |
|---|---|---|
| `docs/05-implementation/TASKS.md` BE-0.2 và SRS §3.3 | Ghi response thành công `{data}` | `server/src/interface/http/response.ts` và `.rules/backend.md` ARCH-02 đang bắt `{statusCode,message,data,timestamp}`; dùng hợp đồng hiện hành và đồng bộ SRS/backlog khi nhóm duyệt thay đổi hợp đồng. |
| Backlog cũ BE-2.1 | Ghi UC06 bị chặn bởi I22 | SRS hiện cho hiển thị `Suspended` có nhãn, không hiện đợt tuyển; chỉ ẩn `Dissolved`. Bỏ blocker I22. |
| Backlog cũ | Lặp mã task `BE-4.8`, có task nền tảng đã xong | Dùng mã duy nhất trong file này; kiểm tra source trước khi nhận việc, không dựng lại nền tảng. |
| Mockup | Có nhãn thành viên “Thử việc”, “Đình chỉ”, báo cáo quý và chuyển role bằng nút demo | Trạng thái membership theo SRS §6.5 (`Active`, `Inactive`, `Left`, `Banned`); kỳ báo cáo theo policy UC04; role lấy từ server. |
| SRS §16.1 | D1–D5 còn mở | Ghi quyết định vào SRS trước khi hoàn tất UC bị ảnh hưởng; triển khai phần độc lập trước. D1 tác động UC05, D2 UC04, D3 UC48/49, D4 UC28, D5 UC52. |

## 2. Đợt A — Authentication và Authorization trước tiên

**Đích nghiệm thu:** người dùng đăng nhập bằng Google, email ngoài domain và tài khoản khoá bị từ chối; session có thể thu hồi; client mở đúng workspace; một request vào CLB khác hoặc thiếu permission bị chặn ở **use case**, kể cả khi gọi API trực tiếp; route ghi dữ liệu không có session bị 401. UC01, UC03, BR19, BR32, BR47, BR54–BR56, SEC-02/03.

### A0 — Chốt hợp đồng và loại bỏ cửa hậu demo

- [x] **A0.1** Viết SPEC `feat-auth-access`: ma trận endpoint public/authenticated/system role/club permission, trạng thái 401/403/423, redirect sau đăng nhập, session expiry/logout/revoke; bổ sung các ca nhiều CLB và hết nhiệm kỳ. Không giả định quyết định D1 là actor thứ tư.
- [x] **A0.2** Quyết định cách xử lý `POST /api/v1/users` và `GET /api/v1/users` demo trước khi bật SEC-02: bỏ khỏi app nghiệp vụ hoặc chuyển sang UC03 có quyền ICPDP; không giữ đường tự tạo User bằng email ngoài OAuth. Cập nhật OpenAPI/test theo quyết định.
- [ ] **A0.3** Chốt Google OAuth callback URL, domain cho phép, cookie `Secure`/`SameSite` theo môi trường, TTL, chiến lược CSRF với cookie session, redirect hợp lệ, logout và lỗi OAuth. Ghi ADR cho lựa chọn session/CSRF nếu có quyết định kiến trúc mới; không đưa secret vào repo.

### A1 — MongoDB và backend auth

- [ ] **A1.1** Từ DBML cài `users`, `studentProfiles`, `roles`, `permissions`, `userRoleAssignments` và session store/revocation phù hợp thiết kế A0.3; phân biệt system role với club position; email chuẩn hoá và unique; index tra email, trạng thái, user-role còn hiệu lực, session TTL/revocation. Có `ensureIndexes()` lúc boot và integration test unique/concurrent first login.
- [ ] **A1.2** Cài policy version tối thiểu cho allowed domain của UC04; chốt cơ chế bootstrap đúng một ICPDP officer bằng email cấu hình (kể cả khi người đó chưa từng đăng nhập) và policy khởi tạo idempotent. Bootstrap không tự tạo phiên hay bypass OAuth. Quyền `ATTENDANCE_UNLOCK` có grant/revoke và audit.
- [ ] **A1.3** Tạo port domain cho OAuth identity, session, actor resolution, audit; infra triển khai Google OAuth + Mongo; `infra/config` là nơi duy nhất đọc env. Validate `state`/nonce, xác thực token với Google, kiểm tra email đã xác minh và domain theo policy **trước** khi đọc/tạo User; lỗi OAuth không để lại User/Profile dở dang.
- [ ] **A1.4** UC01: first login upsert đúng một User + StudentProfile; login sau đồng bộ tên/ảnh nhưng giữ role; kiểm tra `Locked`; nạp system roles và club contexts; tạo session cookie ký `httpOnly`, `SameSite=Lax`, `Secure` ở production; audit login thành công/thất bại/từ chối. Không thêm password/reset-password.
- [ ] **A1.5** Cài `/api/v1/auth/login`, `/callback`, `/me`, `/logout` (tên endpoint chốt trong SPEC), `requireAuth`, `requireSystemPermission`, actor context; tất cả response nghiệp vụ theo envelope hiện hành. Chỉ allowlist các route public thực sự cần (health, OAuth callback, UC06 read, tài liệu API theo policy triển khai).
- [x] **A1.6** Cài resolver quyền CLB lấy từ `ClubPositionAssignment ∩ ClubTerm` đang hoạt động, áp dụng catalog 11 permission cấp được + 4 quyền chỉ Club Leader; quyền founder tạm UC08 chỉ cho UC09/10/23 khi CLB `Pending Setup`; role `Members` mặc định không có quyền. Không lưu permission CLB trên `UserRoleAssignment`.
- [ ] **A1.7** Mọi use case ghi/đọc riêng tư nhận `actor` và tự kiểm tra owner/club scope/permission, không chỉ dựa vào middleware hoặc menu client. Khi khoá user, thu hồi role hoặc hết nhiệm kỳ: quyền và session bị vô hiệu ngay theo SRS; kiểm tra lại trạng thái/quyền tại request cần thiết.
- [ ] **A1.8** UC03: tìm user, cấp/thu hồi system role, lock/unlock với lý do, chặn tự thu hồi quyền quản trị cuối, không cấp CMB ở màn này; audit before/after/reason; revoke session chịu ảnh hưởng. Tạo API và OpenAPI cho từng thao tác.
- [ ] **A1.9** Kích hoạt kiểm tra SEC-02 trong `scripts/check-constitution.sh` khi auth lên: test duyệt tất cả Express route POST/PUT/PATCH/DELETE, fail nếu route không có auth mà không nằm allowlist. Unit test cho domain/policy, integration test cookie/OAuth giả lập và Mongo, test chéo CLB/role, account locked và CSRF.

**Tiến độ A1:** A1.1/A1.3/A1.4/A1.8 đã có code và unit test; cần integration với Mongo thật, replica set và Google credentials để nghiệm thu. A1.2 đã có bootstrap ICPDP, nhưng `policyVersions` chưa có đủ giá trị khởi tạo UC04. A1.5 đã có route/middleware và OpenAPI, nhưng chưa kiểm thử luồng Google thật. A1.7 mới áp dụng vào Auth/UC03 và helper quyền CLB; các use case nghiệp vụ chưa được viết. A1.9 đã có route walk SEC-02, test HTTP cho cookie, callback lỗi, 401/403/423 và CSRF; integration Mongo vẫn chờ chạy.

### A2 — Client auth và khung điều hướng

- [ ] **A2.1** Thêm router khi tạo trang thứ hai thực sự; dựng route public, Student, Club Member/Leader, ICPDP; `AuthLayout`, shell responsive, 403, 423, lỗi callback và loading. URL có thể bookmark và refresh; Guest được điều hướng về đúng trang đích sau login.
- [ ] **A2.2** `services/auth.ts` → `hooks/useAuth.ts` → trang: `me`, login, logout, workspace switch; React Query giữ server state, xoá cache nhạy cảm khi logout/đổi tài khoản; frontend không tự tin vào role lưu localStorage. Nút role-switch của mockup được thay bằng workspace picker từ `/me`.
- [ ] **A2.3** Làm trang login, chọn workspace khi nhiều CLB/ngữ cảnh, profile cơ bản, trạng thái locked/domain denied. Menu chỉ hiện chức năng theo permission nhưng API/use case vẫn là nguồn kiểm tra cuối cùng.
- [ ] **A2.4** Dùng UI kit có sẵn, thêm `StatusBadge`, `ApprovalTimeline`, `DeadlineChip` khi có ít nhất hai nơi dùng; bổ sung i18n `en`/`vi`, kiểm tra light/dark, mobile, keyboard/focus và nhãn dài.

**Gate A:** `npm run check` xanh; thử thủ công Guest → Google → Student/ICPDP → logout, thử workspace CLB và quyền chéo CLB bằng fixture kiểm thử cho tới khi đợt C có CLB thật; test 401/403/423, session revoke, concurrent first login; OpenAPI khớp route. Sau gate này mới mở route ghi dữ liệu của các module tiếp theo.

## 3. Đợt B — Nền tảng nghiệp vụ dùng chung và dashboard

- [ ] **B1** Mongo: cài `policyVersions`, `approvalTasks`, `approvalDecisions`, `auditLogs`, `notifications`, `emailDeliveryLogs`; index theo DBML cho effective date, actor/subject, queue trạng thái/deadline, idempotency. Version đã kích hoạt/chốt là append-only. UC04, §8. **Đã thêm resolver `policyVersions` theo ngày hiệu lực, nối UC01 vào cùng truy vấn, và viết adapter tạo phiên bản kèm audit; integration Mongo thật còn chờ.**
- [ ] **B2** Backend: policy resolver theo thời điểm, validate cấu hình/deadline; UC04 chỉ phơi đúng danh sách giá trị SRS; mỗi lần nộp tạo một review task và nhận đúng một quyết định ICPDP (BR16). **UC04 đã hoàn tất GET/POST, chín nhóm giá trị, RBAC, ngày hiệu lực, OpenAPI và FR-UC04-06; UC05 đã rút.**
- [ ] **B3** AuditPort ghi actor, entity/version, before/after, lý do và correlation ID từ use case; NotificationPort + outbox Mongo, SMTP worker retry/idempotency, in-app inbox, scheduler lease để tránh chạy trùng, deadline/escalation. Có cơ chế phát hiện và bù khi ghi aggregate thành công nhưng audit/outbox lỗi, theo CON-07 không dùng transaction đa document bản đầu.
- [ ] **B4** Backend/client: UC02 dashboard Student, CMB theo permission, Leader, ICPDP; panel độc lập để một nguồn hỏng không làm hỏng dashboard; bộ lọc CLB/kỳ, chỉ đọc lịch sử cơ cấu/BCN, sự kiện nội bộ theo BR53. Shell/menu và review inbox từ mockup dựa trên dữ liệu thật.
- [ ] **B5** Frontend: màn ICPDP quản lý user/role, policy/deadline, audit log, thông báo; màn profile/thông báo phía Student và CLB. Dùng `services/<domain>.ts` + `hooks/use<Domain>.ts`, fetch gốc và query keys đầy đủ. **Màn policy/deadline đã có form, bộ giá trị hiện hành và lịch sử; chờ kiểm tra trực quan, các màn khác chưa làm.**
- [ ] **B6** Tích hợp Cloudinary qua port lưu tệp cho hồ sơ thành lập, đề xuất, chứng từ và chứng cứ: kiểm tra loại/dung lượng tệp, quyền truy cập, metadata và chính sách xoá; không tin URL do client tự gửi. Chuẩn hoá phân trang/lọc/sắp xếp, Zod validation, OpenAPI và upload error envelope cho các module sau. **UC07 đã có adapter authenticated upload, kiểm tra loại/kích thước/chữ ký nội dung, metadata trong draft/version và URL tải có thời hạn sau owner check; credentials để trống, chưa test với Cloudinary thật. Chính sách dọn asset mồ côi vẫn cần hoàn thiện.**

## 4. Đợt C — Thành lập, quản trị và nhiệm kỳ CLB (UC06–UC15, UC23)

- [x] **C0 · UC06 bản đầu** API công khai danh bạ/chi tiết CLB và sự kiện, lọc trạng thái theo SRS; client có trang home/clubs/club/events/event, URL mở trực tiếp và i18n. Unit test và build xanh. Xem `.sdd/specs/feat-public-discovery/TASKS.md` để theo dõi bước còn thiếu.
- [ ] **C0.1 · UC06 nghiệm thu** Chạy integration Mongo thật; kiểm tra UI bằng trình duyệt desktop/mobile ở hai ngôn ngữ và hai theme; nối CTA UC17/UC29 khi hai use case đó mở. Môi trường agent hiện không truy cập được Mongo local hoặc mở cổng Vite.

- [ ] **C1 · Mongo** `clubs`, `clubApplications`, `clubApplicationVersions`, `clubSuspensionRequests`, `clubTerms`, `clubPositions`, `clubPositionAssignments`, `clubRoleStructureVersions`, `boardNominations`, `boardNominationSeats`, `transitionPlans`; unique tên/mã và version theo scope, index trạng thái/kỳ/club. Giữ version nộp và cơ cấu bất biến; mọi membership/position có lịch sử hiệu lực.
- [ ] **C2 · UC06–08** Danh bạ công khai/CLB/sự kiện/đợt tuyển; hồ sơ thành lập Draft → Submitted → review/Revision Requested/Approved/Rejected/Withdrawn/Expired; tài liệu bắt buộc, founder tối thiểu, cơ cấu role/permission phiên bản 1; ICPDP ghi quyết định, tạo một Club `Pending Setup` và founder tạm duy nhất khi approve. UI Public/Student: home, clubs/club, found/form/confirm/status/result; ICPDP: applications/application.
- [ ] **C3 · UC09–11** Founder/Leader cấu hình profile và cơ cấu, đề cử BCN theo term, ICPDP xác nhận/chỉnh sửa/từ chối; khi xác nhận bật CLB, role/assignment có hiệu lực, thu hồi founder tạm. UI CLB: profile/structure/leadership/assign; ICPDP: leaders-confirm.
- [ ] **C4 · UC12–15** Kế hoạch chuyển giao, duyệt/chốt term và role assignment mới; xin tạm ngừng, ICPDP suspend/reactivate/dissolve, cascade sự kiện/booking/quyền theo SRS, không xoá cứng lịch sử. UI CLB: transition/suspend/status; ICPDP: transition/clubs/club/leaders. **UC13 phía ICPDP đã hoàn tất full-stack và test Mongo; UC12, UC14–UC15 còn mở.**
- [ ] **C5 · UC23** Leader quản lý role CLB thường, danh mục 11 quyền và 4 quyền giữ riêng, gán/thu hồi role, version cơ cấu mới cho mỗi lần đổi, không tự sửa quyền ban điều hành ngoài luồng chuyển giao; hiển thị lịch sử cơ cấu và người giữ role. Test ranh giới quyền trước/sau term và khác CLB.

## 5. Đợt D — Tuyển thành viên và tư cách thành viên (UC16–UC24)

- [ ] **D1 · Mongo** `recruitmentCampaigns`, `recruitmentApplications`, `candidateEvaluations`, `clubMemberships`, `membershipWithdrawalRequests`; unique applicant/campaign và membership còn hiệu lực, index trạng thái/đợt/club; snapshot rubric và kết quả.
- [ ] **D2 · UC16–20** Tạo/công bố/đóng đợt tuyển; Student nộp/rút/sửa đơn theo trạng thái; CMB có quyền sàng lọc, chấm rubric, quyết định, waitlist; tiếp nhận thành viên và tự gán role `Members`. Test quota, trùng đơn, quyết định trái trạng thái, CLB tạm ngừng. UI Public/Student: recruit/apply/my-apps/my-app; CLB: recruit-home/campaign-new/publish/apps/app/rubric/result/onboarding.
- [ ] **D3 · UC21–24** Quản lý `Active`/`Inactive`/`Left`/`Banned`, yêu cầu rời CLB và hậu quả role/registration, member space của chính người dùng; kiểm tra quyền đọc danh sách/chi tiết theo club scope. UI CLB: members/member; Student: my-clubs/member-space/leave/leave-sent.

## 6. Đợt E — Sự kiện, đặt chỗ, đăng ký và điểm danh (UC25–UC32, UC44–UC47)

- [ ] **E1 · Mongo** `events`, `eventProposalVersions`, `eventRegistrations`, `attendances`, `properties`, `propertyBookings`, `eventBudgets` và các index unique event/student, attendance/event/student, slot booking, event status/date/club. Dùng update có điều kiện + unique index cho capacity và slot cạnh tranh, không đọc-kiểm-ghi.
- [x] **E2 · UC44–47** ICPDP quản lý danh mục property/lịch khoá; CLB gửi booking, hiển thị trống/xung đột; ICPDP duyệt độc lập với event proposal, giữ slot nguyên tử, trả về/huỷ/giải phóng. UI CLB: `/club/:clubId/bookings` (AppDialog tạo/sửa, bảng phân trang); ICPDP: `/workspace/bookings`. Hoàn tất Wave 2 ngày 2026-10-10, bốn slot và hạn nộp theo [WAVE_2_BOOKING.md](WAVE_2_BOOKING.md); cascade UC28 dùng port release đã có khi làm E3.
- [ ] **E3 · UC25–28** Đề xuất event Draft/version nộp, kiểm tra xung đột BR15 và nghĩa vụ báo cáo; đề xuất ngân sách theo dòng đi cùng version; ICPDP duyệt/đòi sửa/từ chối và chốt số ngân sách từng dòng; sự kiện nội bộ không ngân sách theo BR53 tự duyệt; công bố/mở đăng ký; huỷ/đổi lịch có cascade booking, người đăng ký, nghĩa vụ tài chính. D4 cần chốt trước khi hoàn tất đổi lịch. UI CLB: events/proposals/proposal-new/confirm/detail/result/event-publish/reschedule; ICPDP: proposals/proposal.
- [ ] **E4 · UC29–32** Đăng ký theo đối tượng/window/quota, waitlist FIFO và tự đẩy suất, tự huỷ; check-in self/manual/walk-in trong window, chống trùng, mở feedback từ lúc check-in; CMB chốt/sửa điểm danh có lý do, `ATTENDANCE_UNLOCK` mới được mở khoá. Sự kiện nội bộ không ngân sách đóng sau chốt điểm danh (BR53). UI Student: register/my-regs/checkin; CLB: regs/attendance; ICPDP đọc attendance qua dashboard.

## 7. Đợt F — Trách nhiệm sau sự kiện và tài chính (UC33–UC37)

- [ ] **F1 · Mongo** `postEventReports`, `budgetDisbursements`, `expenses`, `financialEvidences`, `financialReconciliations`; index event/club/state/due/evidence, append-only dòng tiền và snapshot report; kiểm soát duplicate chứng từ và version quyết toán.
- [ ] **F2 · UC33–34** Báo cáo sau sự kiện nạp số liệu kế hoạch, điểm danh đã chốt, tài chính, phản hồi; snapshot khi nộp; nhận báo cáo trễ có cờ; ICPDP đối chiếu kế hoạch-thực tế, trả sửa/chấp nhận/ghi nhận phát hiện UC40. UI CLB: post-report; ICPDP: reports/post-review/plan-actual/report-result/raise-case.
- [ ] **F3 · UC35–37** ICPDP ghi Advance/TopUp/Refund; CLB ghi khoản chi/chứng từ, bổ sung chứng từ, nộp quyết toán; ICPDP chấp nhận/loại từng khoản, đối soát số duyệt, đã ứng, đã chi, hợp lệ, còn lại, số phải hoàn; khoá ngân sách đúng trạng thái và phát tín hiệu quá hạn. UI CLB: budgets/budget-new/expenses/budget-status; ICPDP: budgets/budget/disburse/reconcile. Kiểm thử nhiều dòng tiền, vượt hạng mục, thiếu chứng từ và idempotency.

## 8. Đợt G — Báo cáo định kỳ, tuân thủ và đánh giá (UC38–UC43)

- [ ] **G1 · Mongo** `periodicReports`, `violations`, `correctiveActions`, `evaluationSchemes`, `evaluationDimensions`, `evaluations`, `evaluationDimensionResults`; index club/kỳ/version/state và provenance của từng dimension. Không ghi đè báo cáo, scheme, evaluation đã công bố.
- [ ] **G2 · UC38–39** CLB lập báo cáo theo kỳ policy UC04, nạp dữ liệu thực, snapshot lúc nộp, sửa thành version mới; ICPDP thẩm định, trả lại/chấp nhận/ghi nhận không nộp; dashboard và BR21 dùng đúng trạng thái trễ. UI CLB: reports/report-form/status; ICPDP: reports/periodic-review.
- [ ] **G3 · UC40** Hồ sơ vi phạm từ review, tài chính, booking, khiếu nại và thao tác nhập tay; timeline, chứng cứ, giải trình, quyết định, corrective action, liên kết UC15; quyền riêng tư và audit. UI CLB: compliance/cases/case/forwarded; ICPDP: compliance/case/case-resolve.
- [ ] **G4 · UC41–43** ICPDP version scheme và validate trọng số, sinh draft từ các nguồn có lineage; thiếu dữ liệu là `Insufficient data`, không chấm 0; chấm tay có lý do, chốt/công bố, sửa sau công bố theo version; CLB xem kết quả/xu hướng. UI ICPDP: eval-scheme/draft/publish; CLB: evaluation.

## 9. Đợt H — Phản hồi và khiếu nại (UC48–UC52)

- [ ] **H1 · Mongo** `eventFeedbacks`, `complaints`; unique feedback/event/attendee, index window/club/status/assignee và cờ anonymous; lưu identity nội bộ nhưng không lộ trong aggregate cho CLB.
- [ ] **H2 · UC48–49** Student gửi một feedback từ lúc check-in tới lúc đóng window; CMB có `club.feedback.view` chỉ thấy tổng hợp ẩn danh khi đủ ngưỡng BR40; D3 chốt giá trị policy ban đầu. UI Student: feedback; CLB: feedback-sum.
- [ ] **H3 · UC50–52** Student gửi/rút/theo dõi complaint; trước triage chỉ ICPDP thấy; ICPDP dismiss/forward/escalate UC40 có lý do; CLB chỉ được trả lời complaint đã forward trong deadline, hiển thị identity theo D5. UI Student: complaint/my-complaints; ICPDP: complaints/complaint; CLB: forwarded.

## 10. Kiểm thử cuối, phát hành và định nghĩa hoàn thành

- [ ] **R1** Lập ma trận truy vết UC01–UC52 → route/use case/Mongoose collection/màn hình/mockup/test; mọi nhánh chính, A1 và E1 có quyết định rõ. Đối chiếu toàn bộ BR01–BR58 đang hiệu lực, đặc biệt BR43 không còn hiệu lực.
- [ ] **R2** E2E tối thiểu: Google login → lập CLB → duyệt → BCN/role → tuyển → event + booking + ngân sách → đăng ký/check-in → báo cáo/quyết toán → phản hồi/khiếu nại → đánh giá. Chạy thêm ca denied, khác CLB, cạnh tranh slot/capacity, quá hạn scheduler, callback OAuth lỗi.
- [ ] **R3** Mongo: kiểm tra `explain` cho inbox/list/dashboard, unique/partial/TTL index, atomic update khi ghi đồng thời, dữ liệu seed idempotent, khôi phục sau restart, giới hạn document và phân trang. Không dùng multi-document transaction trong release đầu theo CON-07; ghi rõ điểm cần reconciliation/outbox recovery.
- [ ] **R4** UI: đối chiếu ba shell và mọi màn tương ứng trong mockup, responsive desktop/mobile, loading/error/empty, keyboard/focus, nhãn trạng thái có chữ, `en`/`vi`, light/dark, contrast theo `design-guidelines.md`; quyền menu phản ánh `/me` nhưng không thay thế kiểm tra API.
- [ ] **R5** OpenAPI và env example/runbook được đồng bộ; log không chứa secret/token/PII nhạy cảm; health/readiness, graceful shutdown, worker lease, SMTP retry, backup/restore Mongo; `npm run check` xanh trước mỗi merge và cuối release.

### Quy tắc cho từng task khi bắt đầu code

1. Đọc `.rules/README.md`, quy tắc tầng tương ứng và `README.md` của thư mục sẽ ghi; tạo `.sdd/specs/feat-*/SPEC.md` + `TASKS.md` trước code. Nếu đụng schema, dependency hoặc `.env*`, thực hiện bước hỏi theo `.rules/backend.md` sau khi có phương án cụ thể để review.
2. Server giữ `interface → usecase → domain ← infra`; route validate đầu vào, use case kiểm tra quyền và trạng thái, repository Mongo bảo đảm index/atomic write; OpenAPI và test đi cùng endpoint.
3. Client dùng `services` → `hooks` → `pages/components`, fetch gốc, React Query; mọi màn có trạng thái loading/error/empty và i18n hai ngôn ngữ.
4. Một task chỉ hoàn thành khi có bằng chứng test cho quy tắc và đường từ chối mà task sở hữu, UI đối chiếu mockup + SRS, và `npm run check` xanh.
