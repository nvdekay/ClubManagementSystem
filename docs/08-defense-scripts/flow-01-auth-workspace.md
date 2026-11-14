# Flow 1 — Đăng nhập và chọn workspace

**Phụ trách:** Người 1. **Phạm vi:** UC01, UC02; nhắc UC06 để dẫn vào khám phá CLB.
**Thời lượng lời thoại:** khoảng 45 giây, chưa gồm đăng nhập Google, chuyển tài khoản và Q&A.

## Nghiệp vụ chính

- **Actor:** người dùng có tài khoản Google hợp lệ; quyền hiện tại quyết định có workspace Student, CLB hoặc ICPDP.
- **Điều kiện:** email đã được Google xác minh, domain được server cho phép và tài khoản không bị khoá. Danh sách domain nằm ở biến môi trường `ALLOWED_DOMAIN`, không nằm trên màn chính sách UC04.
- **Luồng:** mở đăng nhập → xác thực qua Google → kiểm tra tài khoản → tạo session → nạp vai trò và các CLB đủ điều kiện → vào workspace → xem dashboard tương ứng.
- **Kết quả:** người dùng có phiên hợp lệ và thấy đúng phạm vi dữ liệu. Việc chọn workspace chỉ đổi ngữ cảnh giao diện, không tự cấp thêm quyền.
- **Điểm nối UC06:** khách chưa đăng nhập vẫn xem danh bạ CLB, sự kiện; ứng tuyển hoặc đăng ký sự kiện mới cần đăng nhập.

## Chuẩn bị demo

| Màn hình | Route UI | Dữ liệu cần có |
|---|---|---|
| Danh bạ công khai | `/clubs`, `/events` | Một CLB và sự kiện đang hiển thị công khai |
| Đăng nhập | `/login` | Tài khoản Google hợp lệ cho môi trường demo |
| Chọn workspace | `/workspace` | Tài khoản có ít nhất hai ngữ cảnh; tài khoản chỉ có một ngữ cảnh được chuyển thẳng |
| Dashboard | `/student`, `/icpdp`, `/club/:clubId` | Hồ sơ hoặc công việc chờ xử lý phù hợp với quyền |

Mở sẵn phiên đã đăng nhập để phần trình bày không phụ thuộc thời gian chọn tài khoản Google.
Nếu có demo đăng nhập trực tiếp, thử callback trước buổi bảo vệ. Tài liệu hiện trạng vẫn ghi
nghiệm thu Google thật là việc cần xác nhận; việc đọc code trong kịch bản này không thay cho
nghiệm thu đó. Không dùng tài khoản sinh viên thông thường để minh hoạ workspace ICPDP.

## Kịch bản thuyết trình

**Thao tác demo:** chỉ nhanh danh bạ CLB, mở trang đăng nhập rồi chuyển sang phiên đã xác thực.

> “Em bắt đầu từ đăng nhập. Khách vẫn xem được CLB và sự kiện công khai; khi ứng tuyển hoặc
> đăng ký tham gia mới cần đăng nhập. Nhóm em dùng Google OAuth, nên hệ thống không lưu mật
> khẩu. Server kiểm tra email hợp lệ và trạng thái tài khoản trước khi tạo phiên.”

**Thao tác demo:** mở `/workspace`, chọn một workspace rồi chỉ vào các việc đang chờ trên dashboard.

> “Một người có thể vừa là sinh viên, vừa quản lý CLB. Danh sách workspace được lấy từ quyền
> hiện tại; chọn một ô không có nghĩa là tự được cấp quyền. Dashboard cho biết việc gì đang
> chờ và hồ sơ đã nộp đang ở đâu. Từ workspace sinh viên, em chuyển sang quy trình thành lập
> CLB.”

## Nhánh cần giải thích

- Email chưa xác minh, domain không được phép, tài khoản bị khoá hoặc OAuth thất bại: không có phiên sử dụng hợp lệ; giao diện hiện lỗi phù hợp. Không nói rằng mọi tài khoản Google đều vào được ở mọi môi trường.
- Một người chỉ có workspace Student thì có thể được chuyển thẳng tới `/student`; không cần cố tạo màn chọn trong demo này.
- Thành viên `Inactive` vẫn có thể xem UC24 qua `/workspace/clubs/:clubId`, nhưng không được xem như membership `Active` để cấp workspace CLB và hai quyền mặc định.
- Dashboard là nơi tổng hợp và điều hướng. Phê duyệt hoặc thay đổi trạng thái diễn ra ở use case tương ứng.

## Câu hỏi bảo vệ và câu trả lời

### 1. Vì sao chọn Google OAuth thay vì tự làm đăng ký, mật khẩu?

> “Nhóm em dùng Google để xác minh danh tính và giảm việc người dùng phải quản lý thêm mật
> khẩu. UCMS vẫn chịu trách nhiệm kiểm tra email, tài khoản và quyền nghiệp vụ. Google xác
> thực thành công không đồng nghĩa với được quản lý CLB hay được vào ICPDP.”

### 2. Email hợp lệ có bắt buộc thuộc một domain trường được ghi cứng không?

> “Không ghi cứng một domain trong nghiệp vụ. Server đọc `ALLOWED_DOMAIN`; cấu hình có thể
> là danh sách domain hoặc `*`. Dù cấu hình nào, email vẫn phải được Google xác minh. Đây là
> cấu hình môi trường, không phải trường chỉnh sửa trong UC04.”

### 3. Ai quyết định người dùng là Club Leader?

> “Server suy ra từ membership `Active`, ghế Chủ nhiệm hoặc Phó chủ nhiệm đã được xác nhận,
> và nhiệm kỳ `Active` còn trong khoảng hiệu lực. Một chức danh như Trưởng ban hay Thủ quỹ
> không tự cấp quyền quản trị. Không có màn tạo role tuỳ biến vì UC23 đã rút.”

### 4. Thành viên thường có được làm gì ngoài xem và tham gia?

> “Mọi thành viên `Active` có hai quyền mặc định: `club.attendance.manage` để quản lý danh
> sách chờ, điểm danh và `club.room.view` để xem phòng được phân. Những quyền này không biến
> thành viên thành Leader; quyền quản lý tuyển dụng, kinh phí hay hồ sơ CLB vẫn cần Leader.”

### 5. Sửa URL hoặc dữ liệu workspace trong trình duyệt có vượt quyền được không?

> “Không. Workspace là ngữ cảnh hiển thị; các use case vẫn kiểm tra quyền ở server trên CLB
> được yêu cầu. Lựa chọn được lưu trong `sessionStorage` chỉ để phục vụ điều hướng, không là
> nguồn xác nhận quyền.”

### 6. Về kỹ thuật, hệ thống dùng JWT hay session?

> “Ứng dụng dùng session lưu phía server, không dùng JWT làm phiên ứng dụng. Cookie chứa
> token ngẫu nhiên được ký HMAC-SHA256; cơ sở dữ liệu lưu hash SHA-256 của token. Phiên có
> thời hạn 7 ngày, và đăng xuất thu hồi phiên ở server.”

### 7. Cookie và request thay đổi dữ liệu được bảo vệ thế nào?

> “Cookie `ucms_session` có `httpOnly`, `SameSite=Lax`, giới hạn đường dẫn `/api/v1` và bật
> `Secure` ở production. Request cần bảo vệ CSRF phải gửi `X-CSRF-Token` đúng với phiên.
> OAuth cũng kiểm tra `state`, dùng PKCE và `nonce`; đây là các lớp bảo vệ khác nhau.”

### 8. Người dùng đã đăng nhập rồi mới bị khoá thì sao?

> “Auth guard đọc lại người dùng khi xử lý request và từ chối tài khoản `Locked`. Vì vậy,
> một tab đang mở không có quyền tiếp tục chỉ vì trước đó đã đăng nhập thành công. Người
> dùng phải được xử lý trạng thái tài khoản theo UC03.”

### 9. Dashboard có giữ một bản dữ liệu riêng không?

> “Dashboard đọc dữ liệu từ các module sở hữu hồ sơ và điều hướng về đúng màn xử lý. Nhóm
> em không dùng dashboard như một nơi phê duyệt thứ hai; trạng thái được thay đổi tại use
> case của hồ sơ đó.”

## Bàn giao

> “Sau khi đã xác định đúng tài khoản và workspace, em dùng vai trò sinh viên để đề nghị
> thành lập một CLB.”

Tiếp tục [flow 2 — Thành lập CLB](flow-02-club-founding.md).

## Nguồn đối chiếu

- [SRS — UC01, UC02, UC06 và bảo mật](../SRS.md).
- [Hiện trạng quyền truy cập và giới hạn nghiệm thu](../CURRENT_IMPLEMENTATION.md).
- [Route UI](../../client/src/main.tsx) và [chọn workspace](../../client/src/pages/auth/AuthWorkspacePage.tsx).
- [Đăng nhập và dựng danh sách workspace](../../server/src/usecase/auth.ts).
- [Role cố định và thời hạn quyền](../../server/src/domain/access.ts).
- [Cookie, callback và auth guard](../../server/src/interface/http/auth-routes.ts).
- [Session phía server](../../server/src/infra/auth/session-service.ts) và [Google OIDC](../../server/src/infra/auth/google-oidc.ts).
