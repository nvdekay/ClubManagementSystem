# Lời thoại bảo vệ flow 1, 2, 3

**Người trình bày:** người phụ trách đăng nhập, thành lập CLB, tuyển và quản lý thành viên.
**Thời lượng mục tiêu:** khoảng 4 phút lời thoại, chưa tính thời gian chờ đăng nhập, nhập liệu
hoặc hội đồng hỏi. Các mốc bên dưới là mốc tập nói; cần bấm giờ khi tập với app thực tế.

**Cách dùng:** đọc phần trích dẫn `>`; các dòng **Thao tác** là chỉ dẫn, không đọc thành lời.
Chỉ nói một thao tác đã thành công khi màn hình hiện kết quả tương ứng.

## Chuẩn bị trước khi tập

- Mở các phiên trình duyệt riêng cho sinh viên nộp hồ sơ, ICPDP Officer, Leader và ứng viên.
  Sinh viên ứng tuyển phải đủ điều kiện, không phải founder/thành viên của CLB đang tuyển.
- Có hồ sơ thành lập đã điền đủ, founder hợp lệ và tài liệu mở được; phiên officer có thể
  nhận đúng hồ sơ đó.
- Chuẩn bị một CLB đã được duyệt trước với đợt tuyển `Draft`, form và thời gian hợp lệ.
  Script nói rõ lúc chuyển sang CLB chuẩn bị, vì CLB vừa được duyệt chưa có sẵn đợt tuyển.
- Nếu cần rút ngắn phần xét tuyển, chuẩn bị thêm một đợt tuyển đã công bố trước, cùng CLB,
  có đơn `Shortlisted`. Khi dùng, nói rõ việc đổi đợt tuyển và ứng viên theo câu chuyển mẫu.
- Kiểm tra Google callback, tài liệu đính kèm và MongoDB hỗ trợ transaction trước buổi demo.
  Tài liệu hiện trạng còn ghi giới hạn nghiệm thu Google/Cloudinary thật.

## 0:00–0:45 — Đăng nhập và chọn workspace

**Thao tác:** mở `/login`, chỉ nút Google, sau đó chuyển sang phiên đã đăng nhập.

> Thưa thầy cô, em trình bày ba luồng: đăng nhập, thành lập câu lạc bộ và tuyển thành viên.
>
> Đầu tiên, hệ thống dùng Google OAuth để xác minh danh tính nên không lưu mật khẩu.
> Server kiểm tra email được phép và trạng thái tài khoản trước khi tạo phiên. Ở đây,
> em dùng phiên đã đăng nhập sẵn để tiếp tục phần demo.

**Thao tác:** mở `/workspace`, chọn Student, chỉ dashboard. Nếu tài khoản chỉ có một ngữ
cảnh và được chuyển thẳng thì nói “Sau đăng nhập, em vào workspace sinh viên” thay câu đầu.

> Một người có thể có nhiều không gian làm việc theo quyền hiện tại. Việc chọn workspace
> chỉ đổi ngữ cảnh giao diện; quyền thao tác vẫn được kiểm tra ở server.
>
> Dashboard giúp theo dõi hồ sơ và công việc đang chờ. Từ workspace sinh viên, em chuyển
> sang đề nghị thành lập câu lạc bộ.

## 0:45–2:15 — Thành lập câu lạc bộ

**Thao tác:** mở `/workspace/applications/:id` với bản nháp đã chuẩn bị; chỉ thông tin CLB,
founder và tài liệu, rồi nộp.

> Đây là hồ sơ em đã chuẩn bị, gồm thông tin câu lạc bộ, thành viên sáng lập và tài liệu.
> Cơ cấu phải có một Chủ nhiệm, một hoặc hai Phó chủ nhiệm; người nộp cũng phải là founder.
> Số founder tối thiểu và yêu cầu hồ sơ lấy theo chính sách hiệu lực.
>
> Em nộp hồ sơ. Hệ thống kiểm tra điều kiện, chuyển sang Submitted và lưu một phiên bản
> nội dung để đối chiếu khi thẩm định.

**Thao tác:** chuyển sang phiên ICPDP, mở `/workspace/reviews/:id`, nhận xử lý và chỉ ba
lựa chọn quyết định. Dừng ngắn ở trạng thái `Under Review`.

> Phía ICPDP, em nhận xử lý thì hồ sơ mới sang Under Review. Chỉ officer đã nhận task
> mới được quyết định.
>
> Officer có thể phê duyệt, yêu cầu chỉnh sửa hoặc từ chối. Khi trả sửa, phải nêu phần
> cần sửa, lý do và hạn sửa. Sinh viên nộp lại thành phiên bản mới; bản cũ vẫn được giữ.

**Thao tác:** phê duyệt hồ sơ hợp lệ; chuyển sang tài khoản được xác nhận làm Leader, nạp
lại thông tin tài khoản, mở workspace CLB vừa tạo và chỉ trang thiết lập.

> Em phê duyệt hồ sơ này. Hệ thống tạo câu lạc bộ Active, nhiệm kỳ và membership cho các
> founder, đồng thời xác nhận ban chủ nhiệm sáng lập.
>
> Các bước được ghi trong cùng transaction để tránh tạo câu lạc bộ dở dang khi có lỗi.
> Leader có thể hoàn thiện hồ sơ vận hành và bắt đầu tuyển thành viên.

## 2:15–4:00 — Tuyển và tiếp nhận thành viên

**Thao tác:** chuyển sang CLB đã chuẩn bị với đợt tuyển nháp tại `/club/:clubId/recruitment`.
Nếu thực hiện được toàn bộ trên CLB vừa tạo, thay đoạn chuyển mẫu bằng “Em mở đợt tuyển
cho câu lạc bộ vừa được duyệt.”

> Để giảm thời gian nhập liệu, em chuyển sang một câu lạc bộ đã được duyệt trước và có
> đợt tuyển nháp. Quy trình áp dụng tương tự cho câu lạc bộ vừa tạo.

**Thao tác:** chỉ vị trí, thời gian, chỉ tiêu và form; công bố đợt tuyển.

> Leader thiết lập vị trí, chỉ tiêu, thời gian và form ứng tuyển rồi công bố. Khung nhận
> đơn phải nằm trong một học kỳ theo chính sách.

**Thao tác:** chuyển sang ứng viên đủ điều kiện, mở `/workspace/recruitment/:campaignId`,
điền các trường đã chuẩn bị và nộp. Nếu nhập liệu lâu, dùng đơn mẫu theo phần thay thế bên dưới.

> Ở phía sinh viên, em điền và nộp đơn. Server kiểm tra đợt tuyển còn hạn và câu lạc bộ
> đang hoạt động; đồng thời chặn đơn trùng, người đã là thành viên hoặc bị cấm tại câu
> lạc bộ đó.

**Thao tác:** về phiên Leader tại `/club/:clubId/recruitment/:campaignId/review`, sàng lọc,
rút gọn và mở phần đánh giá. Điền lý do khi được yêu cầu. Nếu chuyển đơn `Shortlisted`
chuẩn bị trước, đọc câu chuyển mẫu ở phần thay thế.

> Leader sàng lọc, đưa ứng viên phù hợp vào danh sách rút gọn và ghi đánh giá. Điểm hỗ trợ
> việc xem xét; quyết định nhận, từ chối hoặc đưa vào danh sách chờ vẫn do Leader thực hiện.

**Thao tác:** nhận ứng viên, dừng ở `Accepted`; sau đó thực hiện tiếp nhận và chờ `Onboarded`.

> Em chọn nhận ứng viên. Điểm cần phân biệt là Accepted mới thể hiện trúng tuyển, chưa
> tạo tư cách thành viên.
>
> Khi em xác nhận tiếp nhận, hệ thống mới tạo membership Active và chuyển đơn sang
> Onboarded. Hai thay đổi được ghi trong cùng transaction. Cách tách này xử lý được trường
> hợp ứng viên trúng tuyển nhưng không gia nhập.

**Thao tác:** mở `/club/:clubId/members`, tìm đúng người vừa được tiếp nhận. Nếu còn thời
gian, chuyển sang member space của người đó tại `/workspace/clubs/:clubId`.

> Đây là thành viên vừa được tiếp nhận. Thành viên có thể xem tư cách của mình và gửi
> yêu cầu rời câu lạc bộ; Leader xử lý yêu cầu rồi mới đổi trạng thái.
>
> Em xin bàn giao sang phần quản lý ban chủ nhiệm và chuyển giao nhiệm kỳ.

## Các đoạn thay thế khi demo

Chỉ dùng đoạn phù hợp với thao tác thực tế, không đọc toàn bộ phần này vào bài 4 phút.

| Tình huống | Câu nói có thể dùng |
|---|---|
| Muốn chỉ nhanh phần khám phá công khai | “Khách chưa đăng nhập vẫn xem được câu lạc bộ và sự kiện công khai. Khi ứng tuyển hoặc vào workspace thì cần đăng nhập.” |
| Chuyển sang đơn đã nộp để bỏ phần nhập form | “Để tiết kiệm thời gian nhập liệu, em chuyển sang một đợt tuyển đã mở trước và chọn đơn đã nộp. Tiếp theo, em minh hoạ phần xét tuyển của Leader.” |
| Chuyển sang ứng viên `Shortlisted` đã chuẩn bị | “Em chuyển sang một đợt tuyển đã mở trước của cùng câu lạc bộ, chọn ứng viên đã qua sàng lọc và vào danh sách rút gọn để minh hoạ quyết định và tiếp nhận.” |
| Phê duyệt lỗi và cần dùng CLB mẫu | “Thao tác vừa rồi chưa hoàn tất. Em ghi nhận lỗi này và chuyển sang một câu lạc bộ đã được duyệt trước để trình bày phần tuyển thành viên.” |
| Cần chuyển mẫu sau lỗi tiếp nhận | “Lần tiếp nhận vừa rồi chưa thành công. Em mở một trường hợp đã tiếp nhận trước để minh hoạ tư cách thành viên sau bước này.” |
| Nhận lỗi xung đột dữ liệu | “Dữ liệu đã thay đổi so với lúc em mở hồ sơ. Em tải lại để đối chiếu trạng thái hiện tại trước khi thao tác tiếp.” |
| Hội đồng yêu cầu rút ngắn | “Em xin tập trung vào bước tiếp nhận: Accepted ghi nhận trúng tuyển; Onboarded mới tạo membership Active. Sau đây em mở danh sách thành viên để đối chiếu kết quả.” |

Nếu bị lỗi, nêu đúng kết quả đang thấy. Không nói đã phê duyệt hoặc đã tiếp nhận khi API
chưa thành công; cũng không gọi dữ liệu chuẩn bị là kết quả của thao tác vừa làm.

## Câu trả lời nói ngay khi được hỏi

Các đoạn này nằm ngoài thời lượng chính. Nói câu trả lời trước, rồi mở code nếu được yêu cầu.

**Nếu được hỏi “Sửa URL có vượt quyền không?”**

> Dạ, server kiểm tra quyền trên đúng câu lạc bộ của request. Workspace chỉ phục vụ
> điều hướng, nên sửa URL không tự cấp quyền. Với Leader, hệ thống kiểm tra membership,
> ghế được xác nhận và nhiệm kỳ còn hiệu lực.

**Nếu được hỏi “Dùng JWT hay session?”**

> Dạ, phiên ứng dụng dùng session lưu phía server. Cookie chứa token được ký, DB lưu
> hash của token. Phiên có hạn bảy ngày và đăng xuất sẽ thu hồi phiên ở server.

**Nếu được hỏi “Hai officer cùng duyệt thì sao?”**

> Dạ, mở xem chưa có quyền xử lý. Officer phải nhận task; khi quyết định, server kiểm
> tra task còn mở, đúng người nhận và hồ sơ còn ở trạng thái được thẩm định.

**Nếu được hỏi “Vì sao cần transaction?”**

> Dạ, phê duyệt thành lập tạo nhiều dữ liệu liên quan. Nếu tạo câu lạc bộ thành công
> nhưng tạo membership lỗi thì dữ liệu bị thiếu. Transaction giúp các bước hoàn tất
> cùng nhau hoặc không ghi kết quả từng phần.

**Nếu được hỏi “Trả sửa khác từ chối thế nào?”**

> Dạ, trả sửa cho phép sinh viên chỉnh và nộp lại trong hạn, thành một version mới.
> Từ chối kết thúc hồ sơ và không tạo câu lạc bộ. Hồ sơ quá hạn sửa được job chuyển
> Expired, không tự phê duyệt.

**Nếu được hỏi “Accepted có được tính vào chỉ tiêu không?”**

> Dạ có. Chỉ tiêu tính cả Accepted và Onboarded. Accepted giữ suất tuyển nhưng chưa
> tạo membership. Nếu ứng viên từ chối, Leader ghi Declined để giải phóng suất và có
> thể xét người trong danh sách chờ.

**Nếu được hỏi “Nhận ứng viên hai lần thì sao?”**

> Dạ, repository chỉ tiếp nhận đơn đang Accepted và kiểm tra membership hiện có.
> Việc tạo membership cùng chuyển đơn sang Onboarded nằm trong một transaction;
> lệnh cập nhật còn kiểm tra trạng thái cũ để xử lý thao tác lặp hoặc xung đột.

## Nguồn đối chiếu và tài liệu tập tiếp

- [Trọng tâm ôn bảo vệ flow 1–3](focus-flow-01-02-03.md): bảng trạng thái, code cần mở và checklist.
- [Flow 1](flow-01-auth-workspace.md), [flow 2](flow-02-club-founding.md),
  [flow 3](flow-03-recruitment-membership.md): phạm vi UC, ngoại lệ và Q&A đầy đủ.
- [Hiện trạng triển khai](../CURRENT_IMPLEMENTATION.md): phạm vi đã có và các giới hạn demo.
- [Phân công và thời lượng](../UC_FLOW_GROUPS.md).
