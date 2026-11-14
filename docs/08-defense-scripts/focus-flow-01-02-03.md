# Trọng tâm ôn bảo vệ flow 1, 2, 3

Tài liệu dành cho người phụ trách **đăng nhập, thành lập CLB, tuyển và quản lý thành viên**.
Đối chiếu tài liệu và các phần code chính ngày **14/11/2026**; đây là hướng dẫn ôn tập,
không phải biên bản nghiệm thu chạy app hoặc dịch vụ Google/Cloudinary thật.

## 1. Cần tập trung vào đâu?

Với mỗi thao tác, bạn cần trả lời được năm câu:

1. **Ai được làm?** Actor và quyền cụ thể.
2. **Điều kiện là gì?** Trạng thái tài khoản, CLB, hồ sơ, thời gian, chính sách.
3. **Trạng thái thay đổi thế nào?** Trước và sau thao tác; nhánh bị từ chối.
4. **DB thay đổi gì?** Tạo hoặc cập nhật bản ghi nào; có lịch sử/version không.
5. **Nếu thao tác thất bại hoặc bị lặp thì sao?** Kiểm tra quyền, trạng thái, transaction và xung đột.

| Ưu tiên | Nội dung cần nắm | Dấu hiệu đã ôn đủ |
|---|---|---|
| 1 — Bắt buộc | Actor, điều kiện, luồng thành công và trạng thái của cả ba flow | Kể lại được toàn bộ luồng mà không nhìn màn hình |
| 2 — Đào sâu | Phân quyền ở server; transaction khi duyệt thành lập và tiếp nhận | Mở đúng code và giải thích được vì sao cần kiểm tra đó |
| 3 — Q&A | Trả sửa, nộp trùng, hết hạn, đủ chỉ tiêu, xử lý lặp | Nêu được kết quả và lý do nghiệp vụ của từng tình huống |
| 4 — Bổ trợ | Dashboard, hồ sơ CLB, trạng thái thành viên, xác nhận đầu kỳ, xin rời | Giải thích được điểm nối với flow chính |

Ba câu quan trọng nhất cần nhớ:

> **Flow 1:** Đăng nhập xác định danh tính; quyền thao tác được kiểm tra riêng ở server.
>
> **Flow 2:** Phê duyệt thành lập tạo CLB `Active` cùng nhiệm kỳ, founder và ban chủ nhiệm trong một transaction.
>
> **Flow 3:** `Accepted` là trúng tuyển; `Onboarded` mới xác nhận tiếp nhận và tạo membership `Active`.

## 2. Flow 1 — Đăng nhập và chọn workspace

**Phạm vi:** UC01, UC02; nhắc UC06 để nối sang khám phá CLB. Actor là người dùng có tài khoản
Google hợp lệ; quyền hiện tại quyết định workspace có thể truy cập.

### Luồng cần kể được

```text
Người dùng chọn đăng nhập Google
  → Google xác minh danh tính
  → Server kiểm tra email đã xác minh và domain được phép
  → Tìm hoặc tạo user, kiểm tra trạng thái tài khoản
  → Tạo session
  → Nạp vai trò, membership, nhiệm kỳ và ghế đang giữ
  → Hiển thị workspace phù hợp và dashboard
```

### Những điểm phải nắm chắc

| Điểm | Cách giải thích khi bảo vệ |
|---|---|
| Google OAuth và quyền nghiệp vụ | Google xác minh danh tính. UCMS quyết định người đó có được vào hệ thống và thực hiện nghiệp vụ hay không. Hệ thống không lưu mật khẩu. |
| Domain email | Đọc từ cấu hình `ALLOWED_DOMAIN`; không khẳng định một domain trường cố định hay mọi Gmail đều dùng được. Email vẫn phải được Google xác minh. |
| Session | Phiên ứng dụng lưu phía server, thời hạn 7 ngày. Cookie chứa token ngẫu nhiên được ký HMAC-SHA256; DB lưu hash SHA-256 của token. Đăng xuất thu hồi session. |
| Workspace | Chọn workspace chỉ đổi ngữ cảnh giao diện. Sửa URL hoặc dữ liệu lưu trên trình duyệt không tự cấp quyền. |
| Club Leader | Phải có membership `Active`, giữ ghế Chủ nhiệm/Phó chủ nhiệm đã xác nhận trong nhiệm kỳ `Active` còn hiệu lực. Chức danh Trưởng ban hay Thủ quỹ không tự cấp permission. |
| Club Member | Mọi membership `Active` có hai permission mặc định: `club.attendance.manage` và `club.room.view`. Các quyền này không cho phép quản lý tuyển dụng hay thay đổi trạng thái thành viên khác. |
| Tài khoản bị khoá sau đăng nhập | Auth guard đọc lại user và từ chối tài khoản `Locked`; tab đã mở không giữ quyền chỉ vì từng đăng nhập thành công. |
| Guest | Có thể xem danh bạ và chi tiết CLB/sự kiện công khai. Ứng tuyển và các workspace cần đăng nhập. |

Về bảo mật, cần giải thích được mục đích của cookie `httpOnly`, `SameSite=Lax`, `Secure`
ở production và header `X-CSRF-Token`. Nếu được hỏi sâu về OAuth, đọc thêm cách kiểm tra
`state`, PKCE và `nonce`; phân biệt chúng với session và CSRF của ứng dụng.

**Câu trả lời mẫu khi được hỏi về sửa URL để vượt quyền:**

> “Server kiểm tra session, trạng thái tài khoản và quyền trên đúng CLB của request.
> Workspace chỉ phục vụ điều hướng. Vì vậy, có tài khoản hợp lệ chưa đồng nghĩa với có
> quyền quản lý CLB.”

**Demo tối thiểu:** vào workspace bằng tài khoản hợp lệ, giải thích các ngữ cảnh được cấp,
chỉ dashboard rồi chuyển sang hồ sơ thành lập. Chuẩn bị sẵn phiên đã đăng nhập; nếu demo
Google trực tiếp, kiểm tra callback trước buổi bảo vệ.

## 3. Flow 2 — Thành lập CLB

**Phạm vi:** UC07, UC08, UC09. Student soạn và nộp; ICPDP Officer nhận và quyết định;
Club Leader hoàn thiện hồ sơ vận hành sau phê duyệt.

### Trạng thái và người thực hiện

| Từ trạng thái | Thao tác | Actor | Kết quả |
|---|---|---|---|
| `Draft` | Nộp hồ sơ hợp lệ | Student sở hữu hồ sơ | `Submitted`, lưu version nội dung |
| `Submitted` | Nhận task xử lý | ICPDP Officer | `Under Review` |
| `Under Review` | Phê duyệt | Officer đã nhận task | `Approved`, tạo CLB và cơ cấu sáng lập |
| `Under Review` | Yêu cầu sửa | Officer đã nhận task | `Revision Requested`, kèm phần cần sửa, lý do và hạn sửa |
| `Revision Requested` | Sửa và nộp lại trong hạn | Student sở hữu hồ sơ | `Submitted`, thêm version mới |
| `Under Review` | Từ chối | Officer đã nhận task | `Rejected`, không tạo CLB |
| `Submitted` / `Under Review` / `Revision Requested` | Rút hồ sơ | Student sở hữu hồ sơ | `Withdrawn`, đóng task liên quan |
| `Revision Requested` quá hạn | Job xử lý hết hạn | Hệ thống | `Expired`; muốn tiếp tục phải tạo hồ sơ mới |

**Mở xem hồ sơ không tự chuyển sang `Under Review`.** Thao tác nhận xử lý (`claim`) mới
chuyển trạng thái. Code hiện tại phê duyệt một cấp; rule định tuyến đặt SLA thẩm định,
không tạo thêm vòng phê duyệt cấp hai.

### Điều kiện cần nhớ trước khi nộp

- Người nộp phải nằm trong danh sách founder nhưng không bắt buộc làm Chủ nhiệm.
- Founder không được lặp; phải có đúng một Chủ nhiệm, một hoặc hai Phó chủ nhiệm.
- Số founder tối thiểu và các yêu cầu hồ sơ lấy từ chính sách hiệu lực. Kiểm tra cấu hình
  demo trước khi trả lời bằng một con số cụ thể.
- Chủ nhiệm không được đồng thời lãnh đạo CLB khác; xung đột còn được kiểm tra lại lúc duyệt.
- Gợi ý CLB tương tự/cảnh báo trùng tên hỗ trợ officer thẩm định; không tự quyết định từ chối.

### Bước phê duyệt thay đổi dữ liệu gì?

Trong cùng transaction MongoDB, hệ thống tạo hoặc ghi:

1. CLB với trạng thái `Active`.
2. Nhiệm kỳ sáng lập `Active`.
3. Membership `Active` cho các founder.
4. Các vị trí và assignment Chủ nhiệm/Phó chủ nhiệm đã xác nhận.
5. Phiên bản cơ cấu ban đầu, quyết định phê duyệt, trạng thái hồ sơ và lịch sử liên quan.

Nếu một bước thất bại, transaction không để lại một CLB được tạo dở. MongoDB của môi
trường demo phải hỗ trợ transaction; cấu hình local của repo dùng replica set.

CLB mới được duyệt **hoạt động ngay**, không bắt buộc chờ `Pending Setup` rồi đề cử ban
chủ nhiệm lần nữa. `Pending Setup` còn được hỗ trợ để tương thích dữ liệu cũ.

Sau đó, UC09 cho Leader hoàn thiện thông tin vận hành và các ban/bộ phận. Trang này không
dùng để tự đổi trạng thái pháp lý CLB hoặc cấp thêm quyền qua tên ban, chức danh.

### Vì sao phải có version hồ sơ?

Version trả lời được câu hỏi: **“Officer đã duyệt dựa trên nội dung nào?”** Bản từng nộp
được giữ nguyên; sinh viên chỉnh bản làm việc và nộp thành version mới. Officer nhận xét
và yêu cầu sửa, không sửa nội dung thay người nộp.

**Câu trả lời mẫu về transaction:**

> “Phê duyệt tác động tới nhiều collection. Nhóm em đặt việc tạo CLB, nhiệm kỳ, membership,
> ghế ban chủ nhiệm và ghi quyết định trong cùng transaction. Nếu một bước lỗi thì giao
> dịch không hoàn tất, tránh trạng thái có CLB nhưng thiếu thành viên sáng lập.”

**Demo tối thiểu:** mở bản nháp đầy đủ → nộp → chuyển officer → nhận xử lý → duyệt → mở
workspace CLB mới. Chuẩn bị riêng một hồ sơ trả sửa có version để trả lời Q&A. Nạp lại
thông tin tài khoản sau khi duyệt để thấy workspace CLB được cấp.

## 4. Flow 3 — Tuyển và quản lý thành viên

**Phạm vi:** UC16–UC22, UC24. Club Leader công bố đợt tuyển, xét và tiếp nhận; Student ứng
tuyển; Club Member sử dụng không gian thành viên. UC23 đã rút khỏi phạm vi.

### Phân biệt ba thực thể

| Thực thể | Đại diện cho | Trạng thái cần nhớ |
|---|---|---|
| Recruitment campaign | Một đợt tuyển với thời gian, chỉ tiêu, vị trí, form và rubric | `Draft`, `Published`, `Completed`, `Cancelled` |
| Recruitment application | Đơn của một ứng viên trong một đợt tuyển | `Draft`, `Submitted`, `Screening`, `Shortlisted`, `Accepted`, `Rejected`, `Waitlisted`, `Withdrawn`, `Declined`, `Onboarded` |
| Membership | Tư cách thành viên của một người trong CLB | `Active`, `Inactive`, `Left`, `Banned` |

Luồng thành công chính của **đơn ứng tuyển**:

```text
Draft → Submitted → Screening → Shortlisted → Accepted → Onboarded
                                                            ↓
                                               Tạo membership Active
```

`Published` thuộc đợt tuyển; `Accepted`/`Onboarded` thuộc đơn; `Active` thuộc membership.
Khi trình bày, luôn nói rõ đang đổi trạng thái của thực thể nào.

### Các điểm cần đào sâu

| Điểm | Nội dung phải giải thích được |
|---|---|
| Mở đợt tuyển | Leader cấu hình vị trí, chỉ tiêu, thời gian, form ứng tuyển và rubric nếu có. Khung nhận đơn phải nằm trong một học kỳ theo chính sách. |
| Điều kiện ứng tuyển | CLB `Active`, đợt tuyển đã công bố và đang trong khung nhận đơn. Nhãn `Published` không đủ để khẳng định còn nhận đơn. |
| Trùng đơn và tư cách thành viên | Không có đơn thứ hai trong cùng campaign. Người đang `Active`/`Inactive` hoặc đã bị `Banned` tại CLB đó không được ứng tuyển. |
| Đánh giá | Chấm theo rubric hoặc nhận xét ở bước phù hợp; điểm là căn cứ tham khảo. Leader ra quyết định nhận, từ chối hoặc chờ riêng. |
| Chỉ tiêu | Kiểm tra tại server, tính cả đơn `Accepted` và `Onboarded`. Hết suất thì dùng `Waitlisted`. |
| Từ chối gia nhập | Sau `Accepted`, Leader ghi nhận ứng viên từ chối bằng `Declined`; suất được giải phóng để xét người chờ. |
| Tiếp nhận | Chỉ tiếp nhận đơn `Accepted`; tạo membership `Active` cùng chuyển đơn `Onboarded` trong một transaction. |
| Thao tác lặp | Repository kiểm tra trạng thái đơn cũ, membership hiện có và ràng buộc DB; request sau không mặc nhiên tạo thêm membership. |

### Điểm quan trọng nhất: Accepted khác Onboarded

> “Accepted là kết quả trúng tuyển, nhưng ứng viên vẫn có thể không gia nhập. Chỉ khi CLB
> xác nhận tiếp nhận, hệ thống mới tạo membership Active và chuyển đơn sang Onboarded.
> Cách tách này giữ số thành viên phản ánh người đã được tiếp nhận.”

Nhánh bổ sung UC20 A1 cho phép Leader tiếp nhận thủ công bằng email và lý do. Người được
tiếp nhận phải có tài khoản hợp lệ trong hệ thống; vẫn kiểm tra tư cách thành viên, lệnh
cấm và ghi audit.

### Phần quản lý thành viên cần ôn thêm

| Nội dung | Ý nghĩa |
|---|---|
| `Active` | Đang hoạt động; có quyền tương ứng tư cách hiện tại |
| `Inactive` | Tạm không hoạt động; Leader có thể kích hoạt lại; vẫn đọc được member space UC24 |
| `Left` | Membership hiện tại đã kết thúc; quay lại cần tiếp nhận để tạo membership mới |
| `Banned` | Membership kết thúc và chặn quay lại chính CLB đó, kể cả qua tiếp nhận thủ công; cần lý do |
| Xin rời CLB | Sinh viên tạo yêu cầu UC22; Leader thực thi UC21 mới chuyển `Left` |
| Người giữ ghế ban chủ nhiệm | Có thể gửi yêu cầu rời, nhưng chưa được thực thi `Left`/`Inactive`/`Banned` khi ghế được xác nhận còn hiệu lực |
| Xác nhận đầu kỳ | Yêu cầu có hạn 14 ngày; Leader đương nhiệm được miễn. Quá hạn chuyển `Inactive` khi job chạy; sinh viên không tự khôi phục bằng xác nhận muộn |

**Demo tối thiểu:** công bố đợt tuyển → sinh viên nộp → Leader sàng lọc/rút gọn → nhận
`Accepted` → tiếp nhận `Onboarded` → mở danh sách thành viên để thấy membership mới.
Nếu chuyển sang đơn đã chuẩn bị ở trạng thái trung gian, nói rõ đó là dữ liệu chuẩn bị.

## 5. Code cần đọc và cách trình bày kỹ thuật

Bạn nên tập lần theo một thao tác hoàn chỉnh, chẳng hạn **tiếp nhận ứng viên**, từ UI tới DB:

```text
UI → service gọi API → route/auth guard → usecase kiểm tra quyền và đầu vào
   → repository kiểm tra dữ liệu, thực hiện transaction → response → UI cập nhật
```

Đây là trình tự xử lý request. Về phụ thuộc kiến trúc, repo dùng
`interface → usecase → domain ← infra`: usecase gọi repository qua interface trong domain,
còn infra hiện thực thao tác MongoDB.

| Cần giải thích | File nên mở | Điểm cần tìm |
|---|---|---|
| Đăng nhập, dựng workspace | [usecase/auth.ts](../../server/src/usecase/auth.ts) | `completeGoogleLogin()`, `currentUser()` |
| Quyền Leader và Member | [domain/access.ts](../../server/src/domain/access.ts) | `isClubLeader()`, `resolveClubPermissions()` |
| Session và thu hồi | [session-service.ts](../../server/src/infra/auth/session-service.ts) | `issue()`, `resolve()`, `revoke()` |
| Cookie, callback, CSRF | [auth-routes.ts](../../server/src/interface/http/auth-routes.ts) | `authGuard()`, callback và cookie options |
| Nộp hồ sơ thành lập | [usecase/club-application.ts](../../server/src/usecase/club-application.ts) | `submitApplication()`, kiểm tra chính sách và điều kiện nộp |
| Thẩm định hồ sơ | [usecase/club-application-review.ts](../../server/src/usecase/club-application-review.ts) | Quyền ICPDP, `claimApplicationReview()`, `decideApplicationReview()` |
| Transaction duyệt thành lập | [mongo-club-application-review-repository.ts](../../server/src/infra/db/mongo-club-application-review-repository.ts) | `claim()`, `decide()`, các bản ghi được tạo trong transaction |
| Công bố đợt tuyển | [usecase/recruitment-campaign.ts](../../server/src/usecase/recruitment-campaign.ts) | `publishRecruitmentCampaign()`, điều kiện công bố |
| Xét tuyển và tiếp nhận | [usecase/recruitment-review.ts](../../server/src/usecase/recruitment-review.ts) | Quyền `club.application.review`, `reviewRecruitmentApplications()`, `onboardAcceptedRecruitmentApplication()` |
| Chỉ tiêu và tạo membership | [mongo-recruitment-application-repository.ts](../../server/src/infra/db/mongo-recruitment-application-repository.ts) | `transition()`, `onboard()`, điều kiện trạng thái cũ và transaction |

Các endpoint tiêu biểu, đều có tiền tố `/api/v1`:

| Thao tác | Method và đường dẫn |
|---|---|
| Nạp user và workspace | `GET /auth/me` |
| Nộp hồ sơ thành lập | `POST /applications/:id/submit` |
| Nhận hồ sơ thẩm định | `POST /admin/application-reviews/:id/claim` |
| Quyết định thành lập | `POST /admin/application-reviews/:id/decision` |
| Nộp đơn ứng tuyển | `POST /applications/recruitment/:id/submit` |
| Tiếp nhận ứng viên | `POST /clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/onboard` |

Khi được yêu cầu mở code, ưu tiên chỉ đúng nơi kiểm tra **quyền**, **trạng thái**, **ghi dữ
liệu**. Với một lỗi, giải thích điều kiện nào bị vi phạm và response trả về; không cần đọc
từng dòng của toàn bộ file.

## 6. Câu hỏi nên tự luyện

| Câu hỏi | Ý trả lời cần có |
|---|---|
| Google xác thực thành công có được quản lý CLB ngay không? | Không; phải kiểm tra membership, ghế đã xác nhận và nhiệm kỳ tại server. |
| Dùng JWT hay session cho phiên ứng dụng? | Session phía server; cookie token được ký, DB lưu hash; logout thu hồi phiên. |
| Người nộp hồ sơ có bắt buộc là Chủ nhiệm không? | Phải là founder; chức danh do cơ cấu hợp lệ trong hồ sơ xác định. |
| Hai officer cùng mở một hồ sơ thì sao? | Mở xem không chiếm quyền; phải claim. Quyết định kiểm tra task còn mở và đúng assignee. |
| Trả sửa khác từ chối thế nào? | Trả sửa cho phép chỉnh và nộp lại trong hạn, thêm version; từ chối kết thúc hồ sơ. |
| Tạo CLB xong nhưng tạo membership thất bại thì sao? | Các bước cùng transaction, tránh lưu kết quả từng phần. |
| Duyệt thành lập xong có phải xác nhận ban chủ nhiệm lại không? | Không với CLB mới; phê duyệt đã tạo CLB Active và xác nhận ban sáng lập. |
| Accepted có được tính là thành viên không? | Chưa có membership qua đơn đó; Onboarded mới tạo membership Active. Accepted vẫn giữ suất tuyển. |
| Đợt tuyển Published đã quá hạn có nộp được không? | Không; server kiểm tra thời gian và trạng thái CLB ngoài nhãn Published. |
| Điểm rubric cao có tự động được nhận không? | Không; Leader ra quyết định riêng. |
| Ứng viên được nhận nhưng từ chối thì sao? | Leader ghi Declined, giải phóng suất; có thể xét đẩy người Waitlisted lên. |
| Bấm tiếp nhận hai lần thì sao? | Lần sau phải qua kiểm tra trạng thái Accepted, membership và ràng buộc DB; không tạo thêm tuỳ ý. |
| Sinh viên bấm xin rời có mất tư cách ngay không? | Chưa; tạo yêu cầu trước, Leader thực thi mới đổi trạng thái. |

Khi trả lời về cạnh tranh dữ liệu, chỉ rõ cơ chế của từng thao tác: điều kiện cập nhật
trạng thái cũ, unique index, hoặc ghi chung một bản ghi trong transaction. **Chỉ có
transaction không đủ để kết luận mọi kiểu race condition đều được xử lý.**

## 7. Kịch bản demo khoảng 4 phút

| Thời gian | Thao tác | Ý chính cần nói |
|---|---|---|
| 0:00–0:45 | Đăng nhập/chọn workspace, chỉ dashboard | Google xác minh danh tính; UCMS quyết định quyền |
| 0:45–1:15 | Mở hồ sơ đã chuẩn bị, chỉ founder và tài liệu, nộp | Kiểm tra điều kiện và lưu version |
| 1:15–2:15 | Officer nhận task, duyệt; mở workspace CLB | Duyệt tạo Active, nhiệm kỳ và ban sáng lập trong transaction |
| 2:15–3:00 | Công bố đợt tuyển, sinh viên nộp, Leader mở xét | Đúng quyền, đúng hạn, không trùng đơn |
| 3:00–3:40 | Nhận Accepted, thực hiện tiếp nhận | Phân biệt quyết định trúng tuyển và tạo membership |
| 3:40–4:00 | Mở danh sách thành viên/member space, bàn giao | Có thành viên mới và lịch sử; nối sang quản lý ban chủ nhiệm |

Mốc này chỉ phù hợp khi đã chuẩn bị dữ liệu và các phiên tài khoản. Nếu phải nhập đầy đủ
hồ sơ hoặc đăng nhập Google trực tiếp, cần thêm thời gian.

**Câu mở đầu có thể tập nói:**

> “Phần của em gồm ba flow nối tiếp: xác định tài khoản và quyền, thành lập một CLB hợp
> lệ, rồi tuyển và tiếp nhận thành viên. Em sẽ minh hoạ các điều kiện, bước chuyển trạng
> thái và kết quả được ghi nhận sau mỗi quyết định.”

**Câu bàn giao:**

> “Đến đây CLB đã hoạt động và có thành viên được tiếp nhận với lịch sử rõ ràng. Phần
> tiếp theo trình bày ai được điều hành CLB, quyền có hiệu lực trong nhiệm kỳ nào và cách
> bàn giao trách nhiệm.”

## 8. Checklist trước buổi bảo vệ

- [ ] Tự kể lại ba flow, phân biệt trạng thái CLB, hồ sơ thành lập, đợt tuyển, đơn và membership.
- [ ] Đọc cấu hình chính sách để biết số founder tối thiểu, yêu cầu hồ sơ và lịch học kỳ thực tế.
- [ ] Chuẩn bị tài khoản Student, ICPDP Officer và Leader; dùng các phiên trình duyệt tách biệt.
- [ ] Founder trong hồ sơ đã có tài khoản; Chủ nhiệm được đề xuất không lãnh đạo CLB khác.
- [ ] Có hồ sơ nháp đầy đủ; có hồ sơ trả sửa với version để minh hoạ khi được hỏi.
- [ ] Đợt tuyển bao trọn thời điểm demo; có ứng viên đủ điều kiện và đơn ở trạng thái cần trình bày.
- [ ] Nạp lại thông tin quyền sau duyệt thành lập và sau tiếp nhận thành viên.
- [ ] MongoDB hỗ trợ transaction; kiểm tra Google callback và mở tài liệu đính kèm trên đúng môi trường demo.
- [ ] Mở sẵn các file code chính, tập tìm hàm kiểm tra quyền và transaction.
- [ ] Thử một nhánh lỗi cho mỗi flow: sai quyền, thiếu điều kiện nộp, hoặc nộp trùng/hết hạn.
- [ ] Tập demo có bấm giờ; nói rõ khi chuyển sang dữ liệu đã chuẩn bị.

### Các giới hạn cần trình bày đúng

- Tài liệu hiện trạng còn ghi việc nghiệm thu Google callback, Cloudinary thật và dọn
  asset mồ côi. Đọc code không thay thế việc chạy kiểm tra trên môi trường demo.
- UI tiếp nhận hiện không có ô chọn ngày gia nhập/ban; không hứa demo các ô đó.
- Thao tác xét tuyển hàng loạt còn vấn đề khi trộn trạng thái; chuẩn bị đơn cùng trạng thái.
- Đợt tuyển quá hạn có thể còn nhãn `Published`; server vẫn chặn nộp theo thời gian.
- Quyền CLB là cố định; tên ban hoặc chức danh tổ chức không tạo role/permission tuỳ biến.

### Nếu được hỏi về kiểm thử

Bạn có thể mở các test minh hoạ sau và giải thích tình huống mà chúng kiểm chứng:

- [auth.test.ts](../../server/tests/unit/auth.test.ts),
  [auth-http.test.ts](../../server/tests/unit/auth-http.test.ts): domain email, tài khoản bị
  khoá, workspace, OAuth state, cookie và CSRF.
- [club-application.test.ts](../../server/tests/unit/club-application.test.ts),
  [club-founding-e2e.test.ts](../../server/tests/integration/club-founding-e2e.test.ts): cơ cấu
  founder, hồ sơ thiếu, version, claim, trả sửa, duyệt và quyền ban sáng lập.
- [recruitment-application.test.ts](../../server/tests/unit/recruitment-application.test.ts),
  [mongo-recruitment-application-repository.test.ts](../../server/tests/integration/mongo-recruitment-application-repository.test.ts):
  dữ liệu ứng tuyển, điều kiện tư cách thành viên và luồng lưu/xử lý đơn.

Unit test dùng repository giả lập để kiểm tra nghiệp vụ. Integration test kiểm tra với
Mongo thật. Integration test **bị bỏ qua khi thiếu `MONGO_URI`** và cần Mongo replica set;
không lấy kết quả xanh có skip để khẳng định đã kiểm chứng transaction.

## 9. Tài liệu đọc tiếp

- [Kịch bản và Q&A flow 1](flow-01-auth-workspace.md).
- [Kịch bản và Q&A flow 2](flow-02-club-founding.md).
- [Kịch bản và Q&A flow 3](flow-03-recruitment-membership.md).
- [Phân công các flow](../UC_FLOW_GROUPS.md).
- [Hiện trạng triển khai](../CURRENT_IMPLEMENTATION.md).
- [Ma trận UC → code](../05-implementation/UC_CODE_MAPPING.md).
- [SRS hiện hành](../SRS.md).
