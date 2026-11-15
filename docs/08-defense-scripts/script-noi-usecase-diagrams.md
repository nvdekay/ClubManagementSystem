# Lời thoại bảo vệ USE CASE DIAGRAMS — slide 3–8

**Người trình bày:** người phụ trách phần use case trong buổi bảo vệ WDP301.
**Thời lượng mục tiêu:** khoảng 3 phút 40 giây, mỗi slide 35–40 giây; chưa tính hỏi đáp.
Các mốc bên dưới dùng để tập nói, cần bấm giờ khi tập với slide thực tế.

**Cách dùng:** đọc phần trích dẫn `>`; các dòng **Thao tác** và ghi chú không đọc thành lời.
Chỉ vào nhóm chức năng, không đọc lần lượt mọi oval. Tên use case lấy nguyên văn từ
[nguồn draw.io](../03-diagrams/UCMS_UseCase_ByActor.drawio), nghiệp vụ đối chiếu
[SRS](../SRS.md). Phần Q&A nằm ngoài thời lượng chính.

## 0:00–0:35 — Slide 3: User and Student

**Thao tác:** chỉ trang 01 User bên trái: actor User, Google OAuth và hai oval; sang trang
02 Student bên phải, chỉ tam giác kế thừa về User rồi ba nhóm chức năng của Student.

> Thưa thầy cô, bên trái là User, actor trừu tượng gom `Sign in with Google` và
> `View dashboard`; Google OAuth là hệ thống ngoài hỗ trợ đăng nhập.
>
> Bên phải, Student kế thừa User, rồi bổ sung ba nhóm: `Engage with clubs` để tìm, lập
> hoặc ứng tuyển vào câu lạc bộ; `Attend events` để tham gia sự kiện; và `Submit complaint`
> để gửi khiếu nại tới ICPDP.
>
> Em lưu ý đăng nhập là tiền điều kiện của dashboard, nên hai oval này không nối bằng
> `include`. Từ sinh viên, em chuyển sang thành viên và người lãnh đạo câu lạc bộ.

## 0:35–1:10 — Slide 4: Club Member and Club Leader governance

**Thao tác:** ở trang 03 bên trái, chỉ quan hệ Club Member → Student, nhóm tư cách thành
viên, điểm danh và oval xem phòng; ở trang 04 bên phải, chỉ Club Leader → Club Member,
nhóm quản trị ban chủ nhiệm và oval yêu cầu tạm ngừng.

> Club Member kế thừa Student, nên cũng kế thừa gián tiếp User. Bên trái, em gom thành
> hai mảng: tư cách thành viên qua `Club membership`; hỗ trợ vận hành qua
> `Manage attendance` và `View allocated rooms`.
>
> Bên phải, Club Leader kế thừa Club Member, bổ sung quản trị ban chủ nhiệm qua
> `Manage board` và yêu cầu tạm ngừng qua `Request suspension`.
>
> Điểm cần chú ý là Leader phải là thành viên đang hoạt động, giữ ghế Chủ nhiệm hoặc
> Phó chủ nhiệm được duyệt hoặc xác nhận trong nhiệm kỳ hiện tại; chức danh khác không
> tự cấp thêm quyền. Tiếp theo, em trình bày công việc vận hành của Leader.

## 1:10–1:50 — Slide 5: Club Leader: recruitment, events, bookings and finance

**Thao tác:** chỉ Club Leader → Club Member trên cả hai trang. Ở trang 05 bên trái, lướt
qua hồ sơ, tuyển dụng và quản lý thành viên; sang trang 06 bên phải, chỉ hai oval
`Create internal club event`, `Propose event to ICPDP`, rồi các nhóm đặt cơ sở vật chất,
báo cáo và oval `Record expenses & submit invoice pack`.

> Vẫn là Club Leader kế thừa Club Member. Em gom nội dung thành bốn mảng: hồ sơ câu lạc
> bộ; tuyển và quản lý thành viên; sự kiện và cơ sở vật chất; báo cáo và tài chính.
>
> Bên trái là các nhóm từ `Manage club profile` đến `Manage members`. Bên phải,
> `Create internal club event` dành cho sự kiện chỉ có thành viên, không xin ngân sách
> trường nên không qua duyệt đề xuất; muốn xin kinh phí trường phải dùng
> `Propose event to ICPDP`.
>
> Với `Record expenses & submit invoice pack`, Leader tập hợp đủ bộ hóa đơn theo từng
> hạng mục. Từ phía gửi hồ sơ, em chuyển sang ICPDP, phía thẩm định và ra quyết định.

## 1:50–2:25 — Slide 6: ICPDP Officer: access and club lifecycle

**Thao tác:** trên trang 07, chỉ ICPDP Officer → User, sau đó lần lượt chỉ ba nhóm tài
khoản, cấu hình và vòng đời CLB; dừng ở `Configure approval routing (review SLA)` khi
giải thích ý nghĩa cấu hình định tuyến.

> Thưa thầy cô, ICPDP Officer là cán bộ phụ trách quản lý câu lạc bộ phía nhà trường,
> kế thừa trực tiếp User.
>
> Trang này có ba nhóm: `Manage accounts` quản lý tài khoản và vai trò hệ thống;
> `Manage system configuration` đặt chính sách, hạn xử lý; `Manage club lifecycle`
> xử lý hồ sơ thành lập, xác nhận ban chủ nhiệm, chuyển giao và trạng thái câu lạc bộ.
>
> Điểm em muốn làm rõ là ICPDP phê duyệt một cấp; cấu hình định tuyến chỉ đặt thời hạn
> thẩm định, không thêm cấp duyệt. Tiếp theo là trách nhiệm của ICPDP đối với sự kiện,
> cơ sở vật chất và kinh phí.

## 2:25–3:05 — Slide 7: ICPDP Officer: events, bookings and finance

**Thao tác:** trên trang 08, chỉ ICPDP Officer → User, lướt qua bốn mảng: giám sát sự
kiện CLB, sự kiện cấp trường, cơ sở vật chất và ngân sách. Dừng ở mũi tên `extend` từ
`Hold event defense` tới `Decide event proposal`, rồi chỉ `Review invoices & finalize payable`.

> ICPDP Officer tiếp tục kế thừa User. Em chia trang này thành bốn mảng: giám sát sự
> kiện câu lạc bộ, tổ chức sự kiện cấp trường, cơ sở vật chất và ngân sách.
>
> Điểm nổi bật là `Hold event defense` mở rộng `Decide event proposal`: theo BR63,
> ICPDP có thể yêu cầu bảo vệ khi đề xuất lớn, phức tạp hoặc xin kinh phí cao.
>
> Ở nhóm `Manage budget`, `Review invoices & finalize payable` chốt số được thanh toán
> theo hóa đơn hợp lệ, tối đa bằng trần tài trợ từng hạng mục; tiền được chuyển ngoài
> hệ thống. Sau phần nguồn lực, em chuyển sang tuân thủ và đánh giá.

*Ghi chú khi tập: oval `Record sponsored-item payment` đang nằm ở trang ICPDP, nhưng
SRS UC35 hiện hành giao Club Leader xác nhận nhận tiền. Xem câu hỏi 6 để giải thích
điểm chưa đồng bộ; không diễn giải rằng officer xác nhận thay CLB.*

## 3:05–3:40 — Slide 8: ICPDP Officer: compliance and evaluation

**Thao tác:** trên trang 09, chỉ ICPDP Officer → User và bốn nhóm chức năng. Trong nhóm
đánh giá, chỉ `Generate evaluation draft`, `Finalize evaluation`, rồi `Publish evaluation`
để phân biệt bản nháp và kết quả được công bố.

> Ở trang cuối, ICPDP Officer vẫn kế thừa User. Bốn nhóm chính là `Manage compliance`
> để xử lý khiếu nại và hồ sơ vi phạm; `Review periodic reports` để thẩm định báo cáo
> định kỳ; `Manage evaluation` để đánh giá câu lạc bộ; và `Export data & reports`
> để xuất dữ liệu.
>
> Em lưu ý `Generate evaluation draft` chỉ tạo bản nháp có dữ liệu nguồn; officer còn
> phải xem lại, chốt rồi mới `Publish evaluation`. Các câu lạc bộ trong cùng kỳ dùng
> chung một bộ tiêu chí và trọng số.
>
> Em xin kết thúc phần use case và chuyển sang phần trình bày tiếp theo.

## Câu hỏi hội đồng có thể hỏi

**1. Vì sao dùng `include` và `extend`? Có phải các oval con đều chạy trong một lượt?**

> Dạ, `include` là quan hệ bao hàm hành vi; bộ sơ đồ dùng nó để phân rã nhóm chức năng
> theo Phụ lục B của SRS, nên không đọc các oval con như một chuỗi thao tác phải chạy
> hết mỗi lần. `extend` là nhánh bổ sung theo điều kiện, chẳng hạn `Hold event defense`
> mở rộng `Decide event proposal` trên trang 08 khi ICPDP yêu cầu bảo vệ theo BR63.

*Ghi chú đối chiếu: câu “Không vẽ `«extend»`” ở SRS §14.5 và Phụ lục B chưa khớp nguồn
draw.io hiện tại. Trang 06 có `Confirm event defense` và `Request defense reschedule`
`extend` tới `Propose event to ICPDP`; trang 08 có nhánh bảo vệ nêu trên. Các nhánh này
phù hợp nghiệp vụ UC25–UC26, BR63; khi chỉ mũi tên, bám nguồn draw.io.*

**2. Vì sao Club Leader kế thừa Club Member?**

> Dạ, theo SRS §2.3, Leader vẫn là một thành viên và thành viên vẫn là sinh viên, nên
> chuỗi kế thừa là User ← Student ← Club Member ← Club Leader. Quyền quản lý chỉ phát
> sinh khi thành viên đang hoạt động giữ ghế Chủ nhiệm hoặc Phó chủ nhiệm được duyệt
> hoặc xác nhận trong nhiệm kỳ đang hoạt động của đúng câu lạc bộ, theo BR47 và BR54.

**3. Vì sao không có actor Guest dù khách vẫn xem được câu lạc bộ?**

> Dạ, SRS §2.3 và UC06 quy ước Guest chỉ đọc khu công khai, không sở hữu use case riêng
> và không tạo dữ liệu nên không tách thành actor. Khi ứng tuyển, đăng ký hoặc nộp
> hồ sơ, người dùng phải đăng nhập và thực hiện với vai trò Student.

**4. Vì sao bỏ UC23 về vai trò tùy biến?**

> Dạ, SRS UC23 và BR54–BR55 chốt hai vai trò truy cập cố định là Club Member và
> Club Leader, nên chức năng tạo vai trò hay gán quyền tùy ý đã được rút. Các tên ban,
> bộ phận hoặc chức danh vẫn mô tả cơ cấu nhưng không tạo thêm quyền truy cập.

**5. Club Member xem được phòng thì có tự đặt phòng học không?**

> Dạ không, `View allocated rooms` trên trang 03 chỉ cho xem phòng đã được ICPDP phân;
> theo BR35 và BR62, phòng học được ICPDP phân theo học kỳ qua `Manage room allocations`
> trên trang 08. Club Leader dùng `Request non-room facility booking` trên trang 06
> cho cơ sở vật chất ngoài phòng học, và ICPDP quyết định yêu cầu đó riêng.

**6. Oval thanh toán ở trang ICPDP có nghĩa officer xác nhận nhận tiền thay CLB không?**

> Dạ, oval `Record sponsored-item payment` đang nằm ở trang 08 của ICPDP, nhưng SRS UC35
> hiện hành quy định Club Leader xác nhận đã nhận tiền; đây là điểm sơ đồ chưa đồng bộ
> với SRS. Theo UC35–UC37 và BR23, BR58, ICPDP duyệt bộ hóa đơn và chốt số phải trả,
> kế toán ngoài hệ thống chuyển tiền, rồi CLB xác nhận toàn bộ số đó một lần cho mỗi
> hạng mục.
