# UCMS — Guide book hướng dẫn sử dụng

Hướng dẫn mọi màn hình đang có trong app, theo ba không gian làm việc: Sinh viên, CLB và
ICPDP. Mỗi luồng ghi nơi bắt đầu, vai trò cần có, từng bước thao tác với đúng tên nút trên
màn hình, và kết quả cần kiểm tra.

Tên nút, bộ lọc và trạng thái trong tài liệu lấy từ giao diện tiếng Việt của bản hiện tại.
Ảnh minh hoạ được chụp từ app với API và MongoDB thật sau khi seed; xem phần **Phụ lục** để
biết ảnh nào chụp trước đợt đổi giao diện 12/10/2026.

## Mục lục

1. Đăng nhập và khám phá CLB, sự kiện.
2. Chọn không gian làm việc và thanh bên.
3. Nộp hồ sơ thành lập CLB và thẩm định.
4. Thiết lập CLB: hồ sơ, cơ cấu, vai trò và phân quyền.
5. Ban chủ nhiệm và chuyển giao nhiệm kỳ.
6. Tuyển thành viên.
7. Thành viên và yêu cầu rời CLB.
8. Sự kiện CLB: đề xuất, thẩm định, công bố, đổi lịch, huỷ.
9. Sự kiện cấp trường.
10. Đăng ký sự kiện, check-in và gửi phản hồi.
11. Chốt điểm danh và xem phản hồi.
12. Cơ sở vật chất: danh mục, phân phòng học, yêu cầu đặt chỗ.
13. Báo cáo sau sự kiện.
14. ICPDP thẩm định báo cáo sau sự kiện.
15. Báo cáo định kỳ.
16. Kinh phí: tạm ứng, quyết toán, đối soát.
17. Hồ sơ vi phạm.
18. Đánh giá CLB.
19. Góp ý của sinh viên.
20. ICPDP quản lý vòng đời CLB.
21. Thiết lập hệ thống: chính sách, lĩnh vực CLB, tài khoản.
22. Xuất dữ liệu.
23. Tổng quan ICPDP và xử lý lỗi thường gặp.

## 1. Đăng nhập và khám phá

**Nơi bắt đầu:** `/login`. Mọi trang, kể cả trang chủ `/`, danh bạ `/clubs` và lịch sự kiện
`/events`, đều yêu cầu đăng nhập. Mở một trang khi chưa đăng nhập, app chuyển về `/login` và
quay lại đúng trang đó sau khi đăng nhập xong.

1. Mở app, chọn **Đăng nhập với Google**.
2. Chọn tài khoản Google thuộc domain mà nhà trường cho phép. Nếu trình duyệt có nhiều tài
   khoản, chọn đúng tài khoản sinh viên hoặc cán bộ.
3. Sau khi đăng nhập, dùng thanh menu **Trang chủ / Câu lạc bộ / Sự kiện** để khám phá.
4. Ở **Câu lạc bộ**, tìm theo tên và lọc theo lĩnh vực; mở một CLB để xem giới thiệu, ban chủ
   nhiệm, đợt tuyển đang mở và hoạt động.
5. Ở **Sự kiện**, mở một sự kiện để xem thời gian, địa điểm, số chỗ và khung đăng ký.
6. Chọn **Không gian làm việc** ở chân trang để vào khu làm việc theo vai trò.

**Kết quả:** email sai domain hoặc tài khoản đã bị khoá sẽ nhận thông báo lỗi và không tạo
phiên đăng nhập. Danh bạ chỉ hiện CLB đang hoạt động; CLB đang tạm ngừng có nhãn riêng.

![Màn hình đăng nhập Google](images/04-login.png)

## 2. Chọn không gian làm việc

**Nơi bắt đầu:** `/workspace`.

Màn hình hiện lời chào và một thẻ cho mỗi không gian mà tài khoản có quyền:

- **Sinh viên**: CLB của tôi, sự kiện đã đăng ký, đơn ứng tuyển, thông báo cá nhân.
- **CLB**: mỗi CLB một thẻ. Chủ nhiệm thấy tiêu đề "Ban chủ nhiệm CLB …"; thành viên thấy tên
  CLB kèm vai trò (Chủ nhiệm, Thành viên hoặc Người sáng lập).
- **ICPDP**: xét duyệt hồ sơ, chính sách và tài khoản.

1. Bấm **Vào workspace →** trên thẻ cần dùng. Tài khoản chỉ có một không gian thì app vào
   thẳng, không hiện màn chọn.
2. Muốn đổi không gian, bấm thẻ ở đầu thanh bên (**Đổi không gian**); không cần đăng nhập lại.
3. Chân thanh bên có nút sáng/tối, nút **EN/VI** và **Đăng xuất**.

Thanh bên chia nhóm theo không gian:

| Không gian | Nhóm | Mục |
|---|---|---|
| Sinh viên | — | Tổng quan |
| Sinh viên | Câu lạc bộ | CLB của tôi · Ứng tuyển CLB · Thành lập CLB |
| Sinh viên | Sự kiện & góp ý | Sự kiện của tôi · Góp ý |
| CLB | Thành viên & tổ chức | Thành viên · Tuyển thành viên · Ban chủ nhiệm · Thiết lập CLB |
| CLB | Sự kiện | Sự kiện CLB · Đăng ký & điểm danh · Phản hồi sự kiện · Báo cáo sau sự kiện |
| CLB | Tài chính & cơ sở vật chất | Khoản chi và quyết toán · Phòng được phân · Yêu cầu cơ sở vật chất |
| CLB | — | Góp ý sinh viên · Trang công khai |
| ICPDP | Câu lạc bộ | Quản lý CLB · Duyệt hồ sơ thành lập · Xác nhận ban chủ nhiệm · Duyệt chuyển giao nhiệm kỳ · Lĩnh vực CLB |
| ICPDP | Sự kiện & cơ sở vật chất | Duyệt đề xuất sự kiện · Báo cáo sau sự kiện · Giải ngân kinh phí · Sự kiện cấp trường · Lịch sự kiện · Phân phòng CLB · Yêu cầu cơ sở vật chất · Phòng & thiết bị |
| ICPDP | Đánh giá & báo cáo | Tiêu chí đánh giá CLB · Báo cáo định kỳ · Đánh giá CLB · Hồ sơ vi phạm · Xuất báo cáo |
| ICPDP | — | Hộp thư góp ý |
| ICPDP | Thiết lập hệ thống | Chính sách nhà trường · Tài khoản & phân quyền |

Sinh viên và CLB còn có phần **Khám phá** (Khám phá CLB, Sự kiện) ở cuối thanh bên.

**Kết quả:** ở không gian CLB, mỗi mục chỉ hiện khi vai trò của bạn trong CLB có quyền tương
ứng (xem chương 4). Không thấy một mục thường có nghĩa là bạn chưa được cấp quyền đó.

## 3. Nộp hồ sơ thành lập CLB

**Vai trò:** Sinh viên. **Nơi bắt đầu:** **Thành lập CLB** (`/workspace/applications`) → tạo
hồ sơ mới.

1. Bước thông tin CLB: nhập tên, lĩnh vực và các mục mà chính sách nhà trường đang bắt buộc.
2. Bước thành viên sáng lập: thêm tài khoản bằng email và gán vai trò. Cơ cấu cố định là
   1 Chủ nhiệm, 1–2 Phó chủ nhiệm và các thành viên; số người tối thiểu lấy từ chính sách.
3. Tải đề án PDF/DOCX (tối đa 10MB) và logo PNG/JPG (tối đa 2MB).
4. Sang bước kiểm tra; xử lý từng mục còn thiếu trong danh sách cảnh báo.
5. Lưu nháp để làm tiếp sau, hoặc nộp khi hồ sơ đủ điều kiện.
6. Theo dõi trạng thái ở danh sách hồ sơ. Khi bị yêu cầu chỉnh sửa, sửa các phần được yêu cầu
   rồi nộp lại; các bản đã nộp trước vẫn được giữ.

**Kết quả:** hồ sơ chuyển `Draft` → `Submitted`. Khi được duyệt, CLB chuyển sang hoạt động
ngay, ban chủ nhiệm trong hồ sơ được xác lập và không gian CLB xuất hiện ở màn chọn workspace.

![Bước thông tin CLB trong hồ sơ thành lập](images/06-founding.png)

**Phía ICPDP:** mở **Duyệt hồ sơ thành lập** (`/workspace/reviews`), chọn hồ sơ, nhận thẩm
định, xem các phần, lịch sử bản nộp và file đính kèm. Ghi lý do rồi chọn duyệt, yêu cầu chỉnh
sửa hoặc từ chối.

![Hàng đợi thẩm định hồ sơ thành lập](images/27-review-queue.png)

## 4. Thiết lập CLB

**Vai trò:** Chủ nhiệm, hoặc thành viên có quyền **Quản lý vai trò**. **Nơi bắt đầu:**
**Thiết lập CLB** (`/club/:clubId/settings`).

### Tab "Hồ sơ & cơ cấu"

1. Phần **Định danh do nhà trường quản lý** (mã CLB, tên, lĩnh vực, trạng thái) chỉ để xem.
2. Ở **Hồ sơ vận hành**, nhập mô tả, phạm vi hoạt động, email, số điện thoại, URL điều lệ.
   Dùng **Thêm kênh** để khai báo kênh công khai (tên kênh, URL). Bấm **Lưu hồ sơ**.
3. Ở **Cơ cấu nội bộ**, chọn **Dùng cơ cấu khởi đầu** (khi chưa có bộ phận nào) hoặc
   **Thêm bộ phận** (tên, mô tả, thứ tự hiển thị) rồi **Lưu bộ phận**. Mỗi bộ phận có **Sửa**
   và **Ngừng dùng**.

### Tab "Vai trò & phân quyền"

1. Chọn **Vai trò mới** (hoặc **Sửa**): nhập tên vai trò, ban/bộ phận, số người giữ (**Một
   người giữ** hoặc **Nhiều người giữ**).
2. Tick các quyền theo nhóm (có **Chọn hết** / **Bỏ chọn**), ghi lý do nếu cần, bấm
   **Lưu vai trò**.
3. Chọn **Giao vai trò**, tìm thành viên đang hoạt động, nhập ngày bắt đầu/kết thúc (không
   bắt buộc), bấm **Giao**. Dùng **Thu hồi** để gỡ người khỏi vai trò.
4. Mở **Lịch sử**, chọn hai phiên bản rồi **So sánh** để xem thay đổi phân quyền.

| Quyền | Mở được |
|---|---|
| Quản lý vai trò | Thiết lập CLB |
| Đề cử ban chủ nhiệm | Ban chủ nhiệm |
| Quản lý hồ sơ CLB | Hồ sơ vận hành và cơ cấu |
| Quản lý tuyển thành viên | Tuyển thành viên |
| Xét đơn ứng tuyển | Xét đơn trong đợt tuyển |
| Quản lý thành viên | Đổi trạng thái thành viên |
| Quản lý sự kiện | Sự kiện CLB |
| Quản lý điểm danh | Đăng ký & điểm danh |
| Nộp báo cáo | Báo cáo sau sự kiện |
| Ghi nhận chi tiêu | Khoản chi và quyết toán |
| Quản lý đặt phòng | Yêu cầu cơ sở vật chất |
| Xem góp ý | Phản hồi sự kiện, Góp ý sinh viên |

**Kết quả:** vai trò Chủ nhiệm luôn có mọi quyền và không sửa được. Vai trò một người giữ
phải thu hồi người cũ trước khi giao người mới. Chỉ giao vai trò được khi CLB có nhiệm kỳ
đang hoạt động. Ghế ban điều hành đến từ đề cử (chương 5), không giao trực tiếp ở đây.

## 5. Ban chủ nhiệm và chuyển giao nhiệm kỳ

### CLB đề cử ban chủ nhiệm

**Vai trò:** Chủ nhiệm (quyền **Đề cử ban chủ nhiệm**). **Nơi bắt đầu:** **Ban chủ nhiệm**
(`/club/:clubId/board`).

1. Xem **Nhiệm kỳ hiện tại** (ngày bắt đầu, kết thúc).
2. Ở **Ghế ban điều hành còn trống**, với từng ghế (kể cả ghế Chủ nhiệm) chọn một thành viên
   đang hoạt động.
3. Bấm **Nộp đề cử**. App báo "Đã gửi đề cử đến ICPDP."

**Kết quả:** phải chọn ít nhất một ghế. App chặn người có nhiệm kỳ Chủ nhiệm bị chồng lấn.
Quyền của người được đề cử chỉ có hiệu lực sau khi ICPDP xác nhận.

### ICPDP xác nhận ban chủ nhiệm

**Nơi bắt đầu:** **Xác nhận ban chủ nhiệm** (`/workspace/board-nominations`).

1. Ở hàng đợi, bấm **Xem đề cử**, rồi **Nhận quyết định**.
2. Với từng ghế, chọn **Xác nhận ghế** hoặc **Trả ghế** (bắt buộc nhập lý do trả ghế).
3. Nhập **Ghi chú quyết định**, bấm **Ghi một quyết định** và xác nhận.

**Kết quả:** ghế chuyển sang Đã xác nhận hoặc Đã trả để đề cử lại. Mỗi đề cử chỉ nhận một
quyết định; trả lại tất cả các ghế thì bắt buộc có ghi chú. Nếu officer khác đã nhận, app báo
và không cho thao tác trùng.

### ICPDP duyệt chuyển giao nhiệm kỳ

**Nơi bắt đầu:** **Duyệt chuyển giao nhiệm kỳ** (`/workspace/leadership-transitions`).

1. Bấm **Thẩm định chuyển giao**; đọc các phần bàn giao, ban điều hành mới, nghĩa vụ còn
   tồn đọng, danh mục bàn giao và cơ cấu đề xuất.
2. Bấm **Nhận xử lý**.
3. Chọn **Phê duyệt chuyển giao** hoặc **Trả lại để chỉnh sửa** (bắt buộc lý do), nhập ghi
   chú và bấm **Gửi quyết định**.

**Kết quả:** khi phê duyệt, nhiệm kỳ cũ đóng, nhiệm kỳ mới có hiệu lực và quyền được cấp lại.
Không phê duyệt được khi CLB đang tạm ngừng. **Hiện trạng:** phía CLB chưa có màn hình lập kế
hoạch chuyển giao; hàng đợi này hiện chỉ có dữ liệu seed.

## 6. Tuyển thành viên

**Vai trò:** CLB có quyền **Quản lý tuyển thành viên** / **Xét đơn ứng tuyển**; Sinh viên
ứng tuyển.

1. CLB mở **Tuyển thành viên** (`/club/:clubId/recruitment`), tạo đợt tuyển: tên, vị trí,
   tiêu chí, thời gian nhận đơn, chỉ tiêu, câu hỏi ứng tuyển và rubric đánh giá.
2. Lưu nháp rồi công bố. Chỉ CLB đang hoạt động mới mở được đợt tuyển mới.
3. Sinh viên mở **Ứng tuyển CLB** (`/workspace/recruitment`) hoặc trang chi tiết CLB, chọn
   đợt tuyển, điền câu trả lời và nộp; có thể rút đơn khi còn cho phép.
4. CLB mở trang xét đơn của đợt (`/club/:clubId/recruitment/:campaignId/review`), đọc đơn,
   chấm theo rubric và ghi nhận xét phỏng vấn.
5. Ra quyết định nhận, từ chối hoặc đưa vào danh sách chờ, kèm lý do.
6. Với ứng viên được nhận, thực hiện tiếp nhận để tạo tư cách thành viên. Kiểm tra trạng thái
   `Onboarded`; `Accepted` chưa có nghĩa là đã thành thành viên.

**Kết quả:** sinh viên theo dõi quyết định trong **Ứng tuyển CLB**. Đợt tuyển của CLB đang
tạm ngừng vẫn hiện nhưng không nhận đơn mới.

![Quản lý đợt tuyển của CLB](images/07-campaign.png)

![Đơn ứng tuyển của sinh viên](images/08-recruitment-apply.png)

## 7. Thành viên và yêu cầu rời CLB

**Nơi bắt đầu:** CLB → **Thành viên** (`/club/:clubId/members`); Sinh viên → **CLB của tôi**
(`/workspace/clubs`).

1. Ở danh sách thành viên, tìm theo tên/email, lọc trạng thái hoặc vai trò. Thành viên thường
   chỉ xem; người có quyền **Quản lý thành viên** mới đổi được trạng thái.
2. Chọn **Đổi trạng thái**, nhập lý do khi được yêu cầu và xác nhận. Loại thành viên bắt buộc
   có lý do.
3. Xem lịch sử trạng thái; dùng **Xuất Excel** khi cần danh sách.
4. Sinh viên mở một CLB trong **CLB của tôi** để vào không gian thành viên: ban chủ nhiệm,
   hoạt động và thông tin thành viên.
5. Muốn rời CLB, tạo yêu cầu rời, ghi lý do và ngày có hiệu lực.

**Kết quả:** trạng thái và lịch sử được cập nhật. Yêu cầu rời đang chờ chưa có nghĩa là đã
rời CLB.

![Danh sách thành viên và yêu cầu rời CLB](images/09-members.png)

![Không gian thành viên](images/10-member-space.png)

## 8. Sự kiện CLB

**Vai trò:** CLB có quyền **Quản lý sự kiện**; ICPDP thẩm định. **Nơi bắt đầu:**
**Sự kiện CLB** (`/club/:clubId/events`).

### Đề xuất và thẩm định

1. Bấm **Tạo đề xuất**. Nhập tên, mục tiêu, kế hoạch hoạt động, thời gian (UTC+7), địa điểm,
   phòng/cơ sở vật chất, đối tượng (Công khai hoặc Thành viên CLB), sức chứa, mức rủi ro,
   ngân sách đề nghị theo hạng mục và biểu mẫu đăng ký.
2. Bấm **Lưu bản nháp**, rà soát rồi **Nộp đề xuất**. Phải nộp trước ngày diễn ra ít nhất
   7 ngày; app kiểm tra trùng lịch khi nộp.
3. ICPDP mở **Duyệt đề xuất sự kiện** (`/workspace/event-proposals`), nhận thẩm định, đối
   chiếu lịch, rủi ro, nghĩa vụ CLB và từng dòng ngân sách; duyệt, yêu cầu chỉnh sửa hoặc
   từ chối kèm lý do.
4. Khi ở trạng thái **Yêu cầu chỉnh sửa**, CLB chọn **Sửa đề xuất** rồi nộp lại. Bản cũ vẫn
   được giữ.

**Kết quả:** duyệt đề xuất thì app tạo ngân sách sự kiện cho phần kinh phí đã duyệt. Đề xuất
quá hạn mà chưa được xử lý sẽ tự chuyển **Hết hạn**.

![Đề xuất sự kiện ở phía CLB](images/11-event-proposal.png)

![Thẩm định đề xuất và ngân sách ở phía ICPDP](images/12-event-review.png)

### Công bố, sức chứa, đổi lịch và huỷ

1. Sự kiện **Đã duyệt**: bấm **Công bố**, đặt thời gian mở/đóng đăng ký và check-in, chọn
   **Cho phép khách vãng lai**, **Bật danh sách chờ** hoặc **Không cần đăng ký**.
2. Sự kiện **Sắp diễn ra**: dùng **Sức chứa** để điều chỉnh số chỗ; ở bảng đăng ký có
   **Đẩy người đầu danh sách chờ lên**.
3. **Đổi lịch** (khi Đã duyệt hoặc Sắp diễn ra) và **Huỷ sự kiện** (khi Đã duyệt, Sắp diễn ra
   hoặc Đang diễn ra và chưa chốt điểm danh) đều bắt buộc nhập lý do rồi **Xác nhận**.

**Kết quả:** sự kiện tự chuyển Sắp diễn ra → Đang diễn ra → Đã kết thúc theo thời gian.
Huỷ trong vòng 24 giờ trước sự kiện được ghi nhận là huỷ muộn. Người đã đăng ký nhận thông
báo khi sự kiện đổi lịch hoặc bị huỷ.

## 9. Sự kiện cấp trường

**Vai trò:** ICPDP. **Nơi bắt đầu:** **Sự kiện cấp trường** (`/workspace/school-events`).

1. Bấm **Tạo sự kiện cấp trường**. Nhập tên, mục tiêu, yêu cầu phối hợp với CLB, thời gian
   bắt đầu/kết thúc, địa điểm (**Phòng trong danh mục** hoặc **Nơi khác**) và số chỗ cho
   sinh viên.
2. Ở **Mời CLB**, chọn **Tất cả CLB đang hoạt động** hoặc **Chọn CLB**. Đặt **Hạn CLB phản
   hồi**; để trống thì hạn là 3 ngày trước khi sự kiện bắt đầu.
3. Bấm **Tạo sự kiện**. Nếu phòng trùng lịch, app chỉ cảnh báo, vẫn cho tạo.
4. Ở trang chi tiết, theo dõi **Phản hồi của CLB** (Chưa trả lời / Nhận lời / Từ chối / Quá
   hạn / Đã thu hồi). Dùng **Thu hồi** cho lời mời đang chờ, hoặc **Mời thêm CLB** →
   **Gửi lời mời**.
5. Bấm **Công bố cho sinh viên** khi sự kiện đang **Chưa công bố**. App mở đăng ký từ lúc
   công bố đến lúc bắt đầu và hiện **Mã check-in**.

**Kết quả:** sự kiện xuất hiện trong lịch sự kiện với đơn vị tổ chức ICPDP; sinh viên đăng
ký, check-in và phản hồi như sự kiện CLB. **Hiện trạng:** phía CLB chưa có màn hình nhận/từ
chối lời mời, nên phản hồi của CLB hiện chỉ có từ dữ liệu seed.

## 10. Đăng ký sự kiện, check-in và gửi phản hồi

**Vai trò:** Sinh viên. **Nơi bắt đầu:** trang sự kiện `/events/:id`; **Sự kiện của tôi**
(`/workspace/event-registrations`).

1. Ở khung **Đăng ký tham gia** trên trang sự kiện, điền biểu mẫu và bấm **Đăng ký**. Khi hết
   chỗ và sự kiện có danh sách chờ, nút đổi thành **Vào danh sách chờ**.
2. Mở **Sự kiện của tôi**, xem các tab Đang hiệu lực / Đã check-in / Đã huỷ. Trạng thái
   "Đang chờ · vị trí n" chưa đảm bảo có chỗ.
3. Trong khung giờ check-in, bấm **Check-in**, nhập **Mã check-in** do ban tổ chức cung cấp
   (hoặc quét QR) và xác nhận.
4. Sau khi check-in, bấm **Gửi phản hồi**: chọn số sao, viết nhận xét, có thể **Gửi ẩn
   danh**, rồi gửi.
5. Không tham dự được thì **Huỷ đăng ký** trước khi sự kiện bắt đầu.

**Kết quả:** đăng ký, check-in và phản hồi là ba bước riêng. Chỉ người đã check-in mới gửi
được phản hồi, trước hạn "Phản hồi mở đến …", và không sửa được sau khi gửi. Sự kiện dành
cho thành viên CLB thì người ngoài không đăng ký được.

![Sự kiện đã đăng ký và đã tham gia của sinh viên](images/26-my-events.png)

## 11. Chốt điểm danh và xem phản hồi

**Vai trò:** CLB có quyền **Quản lý điểm danh** / **Xem góp ý**.

1. Mở **Đăng ký & điểm danh** (`/club/:clubId/event-attendance`), chọn sự kiện.
2. Đối chiếu danh sách đăng ký với dữ liệu check-in; dùng **Điểm danh hộ** khi người tham dự
   không tự check-in được, ghi lý do khi sửa.
3. Khi sự kiện **Đã kết thúc**, bấm **Chốt điểm danh** và **Xác nhận / hiệu chỉnh**.
4. Mở **Phản hồi sự kiện** (`/club/:clubId/event-feedback`), chọn sự kiện để xem số phản hồi,
   điểm trung bình, phân bố và nhận xét.

**Kết quả:** điểm danh đã chốt bị khoá và trở thành đầu vào báo cáo. Khi chưa đủ số phản hồi
tối thiểu theo chính sách, phần tổng hợp được ẩn. CLB không sửa hay xoá được phản hồi.

![Danh sách đăng ký và điểm danh phía CLB](images/13-attendance.png)

![Phản hồi tổng hợp của sự kiện](images/14-event-feedback.png)

## 12. Cơ sở vật chất

Phòng học không do CLB tự đặt: ICPDP phân phòng cho CLB theo học kỳ. CLB chỉ gửi yêu cầu cho
hội trường, sân trường, sân khấu và thiết bị.

### 12.1. ICPDP quản lý danh mục

**Nơi bắt đầu:** **Phòng & thiết bị** (`/workspace/properties`).

1. Bấm **Thêm cơ sở vật chất**, chọn loại: Phòng / Hội trường / Sân trường / Sân khấu / Thiết
   bị. Mã được sinh tự động.
2. Nhập tên, vị trí, sức chứa và thiết bị đi kèm.
3. Đặt **Khung giờ được đặt** cho T2–CN (một khung chung hoặc mỗi ngày một khung).
4. Dùng **Thêm giai đoạn khoá** cho thời gian bảo trì (bắt buộc lý do).
5. Bấm **Tạo cơ sở vật chất**. Mỗi mục có **Sửa**, **Ngừng sử dụng**, **Dùng lại**, **Xoá**.

**Kết quả:** mục đã từng được đặt chỉ ngừng sử dụng được, không xoá được.

### 12.2. ICPDP phân phòng học theo học kỳ

**Nơi bắt đầu:** **Phân phòng CLB** (`/workspace/room-allocations`).

1. Chọn học kỳ (lấy từ lịch năm học của chính sách, chưa kết thúc); lọc theo CLB hoặc toà nhà.
2. Chọn **Tạo phân phòng**: CLB (đang hoạt động hoặc đang giải thể), phòng học, thứ trong
   tuần và slot (1: 07:30–09:50, 2: 10:00–12:20, 3: 12:50–15:10, 4: 15:20–17:40), ghi chú.
3. Xem lưới chiếm dụng của phòng để tránh ô đã có CLB khác hoặc sự kiện.
4. Xác nhận. App tạo một buổi đã duyệt cho mỗi tuần còn lại của học kỳ (bỏ qua ngày phòng bị
   khoá) và thông báo cho ban chủ nhiệm.
5. Nếu có ngày trùng, app từ chối cả đợt và liệt kê các ngày trùng.
6. Muốn đổi, chọn **Thu hồi** (bắt buộc lý do) rồi tạo đợt mới; các buổi chưa diễn ra được
   giải phóng.

**Kết quả:** CLB có lịch phòng cố định cả học kỳ. Sang học kỳ mới phải phân lại.

### 12.3. CLB xem phòng được phân

**Nơi bắt đầu:** **Phòng được phân** (`/club/:clubId/rooms`), mọi thành viên đang hoạt động.

1. Xem lịch tuần của học kỳ hiện tại và sắp tới: thứ, slot, giờ, phòng, toà nhà, ghi chú.
2. Xem danh sách các buổi sắp tới; đưa màn hình này cho bộ phận quản lý phòng khi nhận chìa
   khoá.

**Kết quả:** màn hình chỉ để xem. CLB bị tạm ngừng hoặc giải thể mất các buổi tương lai.

### 12.4. Yêu cầu cơ sở vật chất và thẩm định

**Vai trò:** CLB có quyền **Quản lý đặt phòng**; ICPDP thẩm định.

1. CLB mở **Yêu cầu cơ sở vật chất** (`/club/:clubId/bookings`), chọn tài sản, ngày và slot;
   kiểm tra sức chứa, thiết bị và tình trạng còn trống; lưu nháp rồi gửi.
2. ICPDP mở **Yêu cầu cơ sở vật chất** (`/workspace/bookings`), nhận xử lý, kiểm tra xung đột,
   nhu cầu và nghĩa vụ CLB; duyệt, từ chối hoặc yêu cầu sửa, có thể đề xuất tài sản/giờ khác.
3. Khi bị trả sửa, CLB sửa và nộp lại; app tạo bản mới.
4. Không dùng nữa thì huỷ hoặc trả cơ sở vật chất theo thời hạn app hiển thị.

**Kết quả:** trùng khung giờ đã được giữ thì không duyệt được. CLB đang tạm ngừng không gửi
yêu cầu mới được. Chỉ yêu cầu đã duyệt mới là lịch sử dụng chính thức.

**Hiện trạng ảnh:** hai ảnh dưới chụp trước khi tách phòng học khỏi luồng đặt chỗ, nên còn
hiện phòng học trong màn của CLB.

![Booking đã duyệt của CLB](images/15-booking.png)

![Chi tiết booking phía ICPDP](images/16-booking-review.png)

## 13. Báo cáo sau sự kiện

**Vai trò:** CLB có quyền **Nộp báo cáo**. **Nơi bắt đầu:** **Báo cáo sau sự kiện**
(`/club/:clubId/event-reports`).

1. Chọn sự kiện đã kết thúc và đã chốt điểm danh.
2. Đọc số liệu nạp sẵn: đề xuất, điểm danh, ngân sách, khoản chi và phản hồi đủ ngưỡng.
3. Nhập kết quả thực tế, sự cố, bài học; thêm liên kết HTTPS tới minh chứng.
4. Chọn **Lưu bản nháp**; sửa xong thì lưu lại trước khi **Nộp**.
5. Xác nhận nộp; kiểm tra trạng thái `Submitted` và số liệu snapshot đã đóng băng.
6. Nếu ICPDP trả sửa, đọc lý do, sửa, lưu và nộp lại. App tạo bản mới và giữ lịch sử.

**Kết quả:** sự kiện chuyển `Report Submitted`. Nộp trễ vẫn được nhận nhưng bị đánh dấu trễ.
Sự kiện nội bộ không xin ngân sách và sự kiện nhập từ dữ liệu cũ không phải nộp báo cáo. Màn
này cần chính sách có cấu hình hạn nộp báo cáo sau sự kiện.

![Báo cáo nháp với số liệu điểm danh và phản hồi](images/17-report-draft.png)

![Phần nhập minh chứng, lưu và nộp báo cáo](images/29-report-submit.png)

![Báo cáo được sửa với lịch sử bản trước](images/19-report-correction.png)

## 14. ICPDP thẩm định báo cáo sau sự kiện

**Nơi bắt đầu:** **Báo cáo sau sự kiện** (`/workspace/event-reports`).

1. Chọn sự kiện chờ xét và nhận thẩm định.
2. Đối chiếu snapshot đã nộp với số liệu hiện tại và điều kiện duyệt đề xuất.
3. Nhập lý do, chọn **Chấp nhận** để đóng sự kiện hoặc **Trả về để sửa**.
4. Nếu có sai phạm, chọn mức độ để mở hồ sơ vi phạm (chương 17) kèm quyết định.
5. Khi số liệu điểm danh mâu thuẫn, app chỉ cho trả về để sửa.
6. Với sự kiện quá hạn mà CLB chưa nộp, ghi nhận không nộp từ danh sách báo cáo thiếu.

**Kết quả:** chấp nhận → sự kiện `Closed`; trả sửa → sự kiện quay về `Completed`. Đóng sự
kiện không tự tất toán ngân sách.

![Báo cáo đã nộp ở phía ICPDP](images/18-report-review.png)

![Các quyết định và luồng mở hồ sơ phát hiện](images/30-report-decision.png)

## 15. Báo cáo định kỳ

**Vai trò:** ICPDP. **Nơi bắt đầu:** **Báo cáo định kỳ** (`/workspace/periodic-reports`).

1. Lọc: Tất cả / Chờ thẩm định / Quá hạn / Đã chấp nhận. Mỗi dòng có nhãn Quá hạn, Nộp trễ và
   số lần nộp.
2. Với CLB quá hạn chưa nộp: bấm **Ghi nhận không nộp**, chọn mức độ, ghi chú rồi
   **Ghi nhận**. App mở hồ sơ vi phạm tương ứng.
3. Bấm **Thẩm định**; so sánh **Số liệu** trong báo cáo với số liệu hệ thống hiện tại.
4. Ở **Quyết định của bạn**, chọn **Chấp nhận** (có thể nhập ghi nhận cho kỳ đánh giá) hoặc
   **Trả về để sửa** (bắt buộc nhận xét và chọn ít nhất một phần cần sửa).
5. Bấm **Xác nhận quyết định**.

**Kết quả:** báo cáo chuyển Đã chấp nhận hoặc Đã trả về; báo cáo được chấp nhận là đầu vào
đánh giá CLB. Loại báo cáo và các mốc hạn nộp/nhắc/quá hạn cấu hình trong chính sách.
**Hiện trạng:** phía CLB chưa có màn hình nộp báo cáo định kỳ; dữ liệu hiện có đến từ seed.

## 16. Kinh phí: tạm ứng, quyết toán, đối soát

### 16.1. ICPDP ghi tạm ứng

**Nơi bắt đầu:** **Giải ngân kinh phí** (`/workspace/budgets`).

1. Lọc: Tất cả / Chưa tạm ứng / Đã tạm ứng / Cần đối soát / Cần cấp bù / Chờ CLB hoàn trả /
   Đã tất toán. **Cần đối soát** gồm khoản CLB đã nộp quyết toán và khoản đã quá hạn quyết
   toán mà CLB chưa nộp.
2. Mở một khoản; xem Đã duyệt, Đã chuyển, Còn được tạm ứng, Hạn quyết toán, các hạng mục đã
   duyệt và các lần chuyển tiền.
3. Ở khung bên phải (**Ghi một lần tạm ứng**), nhập số tiền, ngày chuyển, mã tham chiếu, ghi
   chú; bấm **Lưu** và xác nhận.

**Kết quả:** ngân sách sang Đã tạm ứng sau lần đầu; có thể ứng nhiều lần trong giới hạn đã
duyệt. Ngày chuyển không được ở tương lai; sự kiện đã huỷ thì không ghi tạm ứng. CLB phải
quyết toán trong 14 ngày sau khi sự kiện kết thúc. App chỉ ghi nhận, không chuyển tiền.

![Ghi một khoản tạm ứng vào ngân sách đã duyệt](images/23-advance.png)

### 16.2. CLB ghi khoản chi và nộp quyết toán

**Vai trò:** CLB có quyền **Ghi nhận chi tiêu**. **Nơi bắt đầu:** **Khoản chi và quyết toán**
(`/club/:clubId/budgets`).

1. Chọn ngân sách đã tạm ứng hoặc đang chờ bổ sung chứng từ.
2. **Thêm khoản chi**: hạng mục, số tiền VND, ngày chi, mô tả; lưu.
3. Ở từng khoản, thêm chứng từ (loại và liên kết HTTPS).
4. Kiểm tra khoản thiếu chứng từ, ngoài hạng mục hoặc vượt hạng mục đã duyệt.
5. Sau khi sự kiện kết thúc hoặc bị huỷ, nộp quyết toán và xác nhận.

**Kết quả:** ngân sách sang CLB đã nộp quyết toán; khoản chi bị khoá. Khoản thiếu chứng từ
vẫn ghi được nhưng sẽ bị loại khi đối soát.

![Danh sách khoản chi và các số liệu quyết toán](images/20-expenses.png)

![Hộp thoại ghi khoản chi](images/21-expense-dialog.png)

### 16.3. ICPDP đối soát, cấp bù và ghi hoàn trả

**Nơi bắt đầu:** trong chi tiết ngân sách, bấm **Đối soát quyết toán**
(`/workspace/budgets/:id/reconciliation`).

1. Bấm **Nhận thẩm định**, đọc các tổng: duyệt, tạm ứng, chi đã ghi, có/thiếu chứng từ, số dư.
2. Chấp nhận hoặc loại từng khoản chi, luôn ghi lý do; khoản thiếu chứng từ phải bị loại.
3. Chọn **Chấp nhận** hoặc **Trả về để sửa** kèm lý do quyết định.
4. Chênh lệch dương: quay về chi tiết ngân sách, ghi **khoản cấp bù** đúng bằng chênh lệch.
5. Chênh lệch âm: CLB hoàn tiền thực tế, officer ghi **tiền CLB hoàn trả** (có thể nhiều lần,
   không vượt phần còn phải hoàn).
6. Khoản hoàn quá hạn có thể mở hồ sơ ngoại lệ tài chính từ chính ngân sách.

| Chi hợp lệ − tạm ứng | Kết quả | Việc tiếp theo |
|---|---|---|
| Bằng 0 | Đã tất toán | Kiểm tra lịch sử đối soát |
| Lớn hơn 0 | Đã đối soát | Ghi cấp bù đúng chênh lệch |
| Nhỏ hơn 0 | Chờ CLB hoàn trả | Ghi hoàn trả đủ, hạn 14 ngày |

**Hiện trạng:** màn khoản chi của CLB (16.2) và màn đối soát (16.3) đã có giao diện nhưng API
chưa được nối vào server chính (gọi API trả 404 ngày 12/10/2026). Ảnh 16.2–16.3 chụp từ bản
demo riêng. Phần tạm ứng (16.1) chạy trên server chính.

![Xét từng khoản chi khi đối soát](images/22-reconciliation.png)

![Ghi lý do loại khoản thiếu chứng từ và xác nhận chốt đối soát](images/32-reconciliation-finalize.png)

![Kết quả đối soát và nghĩa vụ hoàn trả](images/31-recovery-result.png)

![Ghi cấp bù đúng chênh lệch](images/24-topup.png)

![Ghi nhận CLB hoàn trả và theo dõi phần còn nợ](images/25-refund.png)

## 17. Hồ sơ vi phạm

**Vai trò:** ICPDP. **Nơi bắt đầu:** **Hồ sơ vi phạm** (`/workspace/violations`). Hồ sơ cũng
được mở tự động từ thẩm định báo cáo, báo cáo định kỳ không nộp và đối soát tài chính.

1. Lọc: Đang xử lý / Chờ CLB giải trình / Đang khắc phục / Đã đóng / Tất cả.
2. Bấm **Mở hồ sơ**: chọn CLB, nguồn phát hiện, mức độ (Nhẹ / Trung bình / Nghiêm trọng),
   nhập sự việc, mô tả, sự kiện hoặc kinh phí liên quan.
3. Bấm **Bắt đầu điều tra**, dùng **Thêm chứng cứ** (ghi chú và liên kết).
4. **Yêu cầu CLB giải trình**: nhập nội dung và hạn trả lời (mặc định 7 ngày), bấm
   **Gửi cho CLB**. CLB trả lời ngoài hệ thống thì dùng **Ghi nhận giải trình của CLB** hoặc
   **Ghi nhận CLB không phản hồi**.
5. Ở **Quyết định**, chọn **Có vi phạm** hoặc **Không vi phạm**, nhập lý do và chứng cứ, bấm
   **Ra quyết định**. Có thể **Đóng hồ sơ — không vi phạm** bất cứ lúc nào trước đó (bắt
   buộc lý do).
6. **Giao biện pháp khắc phục** (mỗi biện pháp có hạn, có thể dẫn tới tạm ngừng hoặc giải
   thể); đánh dấu **Đã hoàn thành** / **Không hoàn thành**, rồi **Kết thúc hồ sơ**.

**Kết quả:** kết luận có vi phạm cần ít nhất một chứng cứ và phải qua bước giải trình (hoặc
ghi nhận CLB không phản hồi). Biện pháp tạm ngừng/giải thể chỉ dẫn link sang quản lý CLB
(chương 20), không tự thực hiện. **Hiện trạng:** CLB chưa có màn hình xem hồ sơ và gửi giải
trình trên app.

## 18. Đánh giá CLB

### 18.1. Tiêu chí đánh giá

**Vai trò:** ICPDP. **Nơi bắt đầu:** **Tiêu chí đánh giá CLB**
(`/workspace/evaluation-schemes`).

1. Ở **Tạo scheme**, chọn học kỳ và nguồn (mặc định của hệ thống hoặc một phiên bản cũ), bấm
   **Tạo bản nháp**.
2. Bấm **Sửa**: đặt trọng số (%) cho D1–D8 (có **Chia đều**), chọn tiêu chí ICPDP được chấm
   tay, đặt mức xếp loại Xuất sắc / Tốt / Khá.
3. **Lưu nháp**, rồi **Kích hoạt**. Muốn đổi scheme đang áp dụng, dùng **Tạo bản sửa**.

**Kết quả:** tổng trọng số phải đúng 100%; D1–D3 phải lớn hơn 0; các mức phải giảm dần.
Trạng thái: Bản nháp → Đang áp dụng → Đã thay thế.

### 18.2. Sinh, chốt và công bố kết quả

**Nơi bắt đầu:** **Đánh giá CLB** (`/workspace/evaluations`).

1. Chọn học kỳ; cần có scheme đang áp dụng (nếu chưa, dùng link mở tiêu chí đánh giá).
2. Bấm **Sinh bản nháp** cho mọi CLB đang hoạt động.
3. **Mở** từng CLB, xem dữ liệu nguồn của từng tiêu chí. Với tiêu chí cho chấm tay, nhập điểm
   0–100 và lý giải (bắt buộc), **Lưu điểm**.
4. Bấm **Chốt kết quả** (hoặc **Sinh lại từ dữ liệu hiện tại**); có thể **Mở lại để xem
   xét**.
5. Khi mọi CLB đã chốt, bấm **Công bố kết quả**.

**Kết quả:** xếp loại Xuất sắc / Tốt / Khá / Cần cải thiện. Tiêu chí thiếu dữ liệu ghi "chưa
đủ dữ liệu", không tính 0. Kết quả đã công bố không sửa trực tiếp; dùng **Tạo bản sửa**.

## 19. Góp ý của sinh viên

Góp ý là kênh **một chiều**: sinh viên gửi, CLB hoặc ICPDP đọc. Hiện chưa có luồng phân loại,
trả lời hay theo dõi trạng thái xử lý.

**Sinh viên** — **Góp ý** (`/workspace/feedback`):

1. Chọn **Gửi tới**: **Một câu lạc bộ** hoặc **ICPDP (nhà trường)**.
2. Chọn CLB (bắt buộc khi gửi CLB, không bắt buộc khi gửi ICPDP) và sự kiện liên quan nếu có.
3. Chọn loại: Góp ý / Khen ngợi / Phản ánh; nhập nội dung (tối đa 2000 ký tự); có thể
   **Gửi ẩn danh**.
4. Bấm **Gửi góp ý**; xem lại ở **Góp ý bạn đã gửi**.

**CLB** — **Góp ý sinh viên** (`/club/:clubId/feedback`, quyền **Xem góp ý**) và **ICPDP** —
**Hộp thư góp ý** (`/workspace/student-feedback`): danh sách để đọc, có loại, CLB và sự kiện
liên quan, thời điểm gửi. Người gửi ẩn danh không bao giờ được hiển thị.

**Kết quả:** góp ý không sửa được sau khi gửi.

## 20. ICPDP quản lý vòng đời CLB

**Nơi bắt đầu:** **Quản lý CLB** (`/icpdp/clubs`).

1. Tìm bằng ô tìm kiếm; lọc theo trạng thái (Đang hoạt động / Tạm ngừng / Đang giải thể /
   Đã giải thể) và lĩnh vực.
2. Khung **Sắp hết hạn tạm ngừng** liệt kê CLB sắp tự kích hoạt lại; app nhắc trước 3 ngày.
3. Bấm **Quản lý** trên thẻ CLB; xem **Công việc đang chạy** (đợt tuyển đang mở, sự kiện sắp
   tới, nhiệm kỳ hiện tại).
4. Chọn **Tạm ngừng** (khi đang hoạt động): chọn **Đến một ngày** (nhập ngày tự kích hoạt lại)
   hoặc **Cho tới khi tôi kích hoạt lại**.
5. Hoặc **Kích hoạt lại** (khi đang tạm ngừng), hoặc **Giải thể**.
6. Nhập lý do (bắt buộc) và **Xác nhận**. Xem lại ở **Lịch sử vòng đời**.

**Kết quả:** tạm ngừng huỷ sự kiện sắp tới và booking đã duyệt; đợt tuyển vẫn hiện nhưng
không nhận đơn. CLB tự hoạt động lại khi đến ngày đã đặt. Giải thể có hiệu lực từ học kỳ kế
tiếp; nút bị khoá khi lịch năm học chưa có học kỳ kế tiếp.

## 21. Thiết lập hệ thống

### Chính sách nhà trường

**Nơi bắt đầu:** **Chính sách nhà trường** (`/workspace/policy`).

1. Xem **Chính sách đang hiệu lực**, **Lịch sử phiên bản** (Đã lên lịch / Đã có hiệu lực) và
   **Xem giá trị chính sách**.
2. Ở **Phiên bản chính sách mới**, sửa các nhóm: thành lập CLB (số người sáng lập tối thiểu,
   mục bắt buộc), hồ sơ CLB, sự kiện (hạn phản hồi, số phản hồi tối thiểu, ngưỡng trùng lịch,
   ngoại lệ overbooking), năm học (**Thêm học kỳ** / **Bỏ học kỳ**), báo cáo (**Thêm loại báo
   cáo**, hạn nộp/nhắc/quá hạn/leo thang, chặn đề xuất sự kiện khi CLB còn báo cáo quá hạn).
3. Đặt ngày hiệu lực (để trống = áp dụng ngay) và lý do thay đổi.
4. Bấm **Tạo phiên bản chính sách**.

**Kết quả:** mỗi thao tác dùng chính sách có hiệu lực tại thời điểm đó. Phải giữ ít nhất một
học kỳ và một loại báo cáo. App cảnh báo nếu phiên bản mới làm vô hiệu một quyết định đã ban
hành.

### Lĩnh vực CLB

**Nơi bắt đầu:** **Lĩnh vực CLB** (`/workspace/club-fields`).

1. Ở **Lĩnh vực mới**, nhập tên và thứ tự (số nhỏ hiện trước), bấm **Thêm lĩnh vực**.
2. **Sửa** → **Lưu** để đổi tên; tên mới được cập nhật cho mọi CLB và hồ sơ đang dùng.
3. **Xoá** → xác nhận. Lĩnh vực đang được dùng chỉ bị ẩn (nhãn **Đã ẩn**).

### Tài khoản & phân quyền

**Nơi bắt đầu:** **Tài khoản & phân quyền** (`/icpdp/accounts`).

1. Tìm theo tên hoặc email; mỗi dòng có trạng thái Hoạt động / Đã khóa.
2. Bấm **Quản lý**, chọn vai trò hệ thống (Cán bộ ICPDP, Mở khóa điểm danh).
3. Nhập lý do, bấm **Cấp vai trò**, **Thu hồi vai trò**, **Khóa tài khoản** hoặc **Mở khóa tài
   khoản**.

**Kết quả:** thu hồi, khoá và mở khoá bắt buộc có lý do. Mọi thay đổi quyền được ghi audit.

## 22. Xuất dữ liệu

**Vai trò:** ICPDP. **Nơi bắt đầu:** **Xuất báo cáo** (`/workspace/exports`).

1. Chọn dữ liệu: CLB và trạng thái / Thành viên theo CLB / Sự kiện kèm đăng ký và điểm danh /
   Ngân sách, giải ngân và đối soát / Hồ sơ vi phạm và góp ý / Kết quả đánh giá đã công bố.
2. Chọn thời gian: Toàn bộ / Theo học kỳ / Khoảng ngày; lọc theo CLB và trạng thái.
3. Chọn định dạng Excel, CSV hoặc PDF.
4. Bấm **Đếm số dòng**, rồi **Tải xuống**.

**Kết quả:** không tải được khi kết quả có 0 dòng. Mỗi lần xuất được ghi lại.

## 23. Tổng quan ICPDP và xử lý lỗi thường gặp

ICPDP mở **Tổng quan** (`/icpdp`) để theo dõi việc đang chờ, nghĩa vụ và số liệu chung, rồi
đi vào từng hồ sơ để xử lý. Sinh viên và CLB cũng có trang **Tổng quan** riêng với các thẻ số
liệu và lối tắt.

![Dashboard ICPDP với dữ liệu đã seed](images/28-dashboard.png)

| Tình huống | Cách xử lý |
|---|---|
| Bị chuyển về trang đăng nhập | Mọi trang đều cần đăng nhập; đăng nhập lại, app quay về trang đang xem |
| Không thấy mục quản lý | Đổi đúng không gian; nhờ chủ nhiệm kiểm tra quyền của vai trò |
| "Không thể truy cập workspace" | Bấm **Chọn không gian làm việc** và chọn không gian bạn có quyền |
| Phiên hết hạn | Đăng nhập lại, mở lại hồ sơ và đọc trạng thái mới nhất |
| Hồ sơ đã thay đổi hoặc HTTP 409 | Tải lại trang, đối chiếu dữ liệu mới rồi thao tác lại |
| Officer khác đã nhận task | Chọn task khác hoặc chờ người đó xử lý xong |
| Báo cáo báo thiếu cấu hình hoặc HTTP 503 | Kiểm tra chính sách có loại báo cáo và hạn nộp tương ứng |
| Khoản chi bị khoá | Ngân sách đã nộp quyết toán; chờ ICPDP trả về nếu cần sửa |
| Không thấy tổng hợp phản hồi | Số phản hồi chưa đạt ngưỡng tối thiểu trong chính sách |
| Không cấp bù/hoàn trả được số đã nhập | Đối chiếu đúng chênh lệch hoặc phần còn phải hoàn |

## Phụ lục — Dữ liệu và nguồn ảnh

- Ảnh 04 (đăng nhập) chụp ngày 12/10/2026 theo giao diện mới.
- Các ảnh còn lại chụp ngày 11/10/2026, trước khi đổi giao diện trang chủ, đăng nhập, màn
  chọn workspace và chia nhóm thanh bên của Sinh viên/CLB. Nội dung từng màn không đổi, nhưng
  thanh bên trong ảnh có thể khác bảng ở chương 2.
- Ảnh 01–03 (trang chủ, danh bạ, chi tiết CLB) và 05 (chọn workspace) đã bỏ khỏi guide vì
  giao diện đã thay đổi; cần chụp lại bằng một phiên đăng nhập.
- Ảnh 14, 17–22, 24–25, 29–32 dùng API thật của bản demo, database `ucms_guide_demo`.
- Các màn chưa có ảnh: thiết lập CLB, ban chủ nhiệm, sự kiện cấp trường, phân phòng, báo cáo
  định kỳ, hồ sơ vi phạm, đánh giá CLB, góp ý, quản lý CLB, chính sách, tài khoản, xuất dữ
  liệu.
- Liên kết `example.org` là placeholder demo. Tên và email `@demo.ucms.edu.vn` là nhân vật mẫu.
- Chi tiết URL, nguồn dữ liệu và thao tác chụp ở `images/manifest.json`.

Tài liệu này chỉ hướng dẫn các luồng đã có màn hình. Những phần ghi **Hiện trạng** là chức
năng còn thiếu màn hình hoặc chưa nối API ở server chính tính đến 12/10/2026.
