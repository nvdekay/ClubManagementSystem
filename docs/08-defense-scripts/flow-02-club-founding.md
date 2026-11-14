# Flow 2 — Thành lập CLB

**Phụ trách:** Người 1. **Phạm vi:** UC07, UC08, UC09.
**Thời lượng lời thoại:** khoảng 90 giây; chuẩn bị hồ sơ trước, không nhập lại toàn bộ khi nói.

## Nghiệp vụ chính

- **Actor:** Student lập hồ sơ; ICPDP Officer nhận và quyết định; Club Leader hoàn thiện hồ sơ CLB sau khi được duyệt.
- **Điều kiện:** người nộp đã đăng nhập, tài khoản không bị khoá; đủ thành viên sáng lập và tài liệu theo chính sách hiệu lực. Người nộp phải nằm trong danh sách sáng lập.
- **Cơ cấu sáng lập:** đúng một Chủ nhiệm, một hoặc hai Phó chủ nhiệm, các thành viên còn lại là Members; không lặp người, không tự tạo role/permission.
- **Luồng:** lưu `Draft` → kiểm tra và nộp `Submitted` → ICPDP nhận hồ sơ để chuyển `Under Review` → phê duyệt, trả sửa hoặc từ chối → nếu duyệt, vào workspace CLB và hoàn thiện thông tin vận hành.
- **Kết quả khi duyệt:** hồ sơ `Approved`; tạo CLB `Active`, nhiệm kỳ sáng lập, membership `Active` cho các founder, ghế Chủ nhiệm/Phó chủ nhiệm đã xác nhận và phiên bản cơ cấu `1`. Không có bước `Pending Setup` bắt buộc cho CLB mới.

## Chuẩn bị demo

| Màn hình | Route UI | Chuẩn bị |
|---|---|---|
| Hồ sơ của sinh viên | `/workspace/applications`, `/workspace/applications/new`, `/workspace/applications/:id` | Một bản nháp đầy đủ, founder đã có tài khoản trong hệ thống, tài liệu theo yêu cầu |
| Thẩm định ICPDP | `/workspace/reviews`, `/workspace/reviews/:id` | Tài khoản officer và đúng hồ sơ sẽ nộp |
| Workspace CLB | `/club/:clubId` | Dùng ID CLB được tạo sau phê duyệt |
| Hồ sơ và ban/bộ phận | `/club/:clubId/settings` | Tài khoản Chủ nhiệm hoặc Phó chủ nhiệm được duyệt |

Chuẩn bị thêm một hồ sơ `Revision Requested` có lịch sử version để trả lời nhánh sửa, không
cần chạy thêm vòng này trong 90 giây. Dùng tên minh hoạ như “CLB Sáng tạo số”; tên đó không
khẳng định đã có dữ liệu seed. Kiểm tra tài liệu Cloudinary đã mở được trước buổi demo;
nghiệm thu upload thật và dọn asset mồ côi vẫn là giới hạn được ghi trong tài liệu hiện trạng.

Nếu cần nối liền flow 3, chuẩn bị sẵn CLB đã được duyệt với đợt tuyển nháp để chuyển nhanh.
Sau phê duyệt, tải lại thông tin tài khoản hoặc mở lại `/workspace` để thấy ngữ cảnh CLB mới.

## Kịch bản thuyết trình

**Thao tác demo:** mở bản nháp; chỉ thông tin CLB, danh sách founder và tài liệu, rồi nộp.

> “Ở flow này, em đóng vai sinh viên muốn thành lập CLB. Hồ sơ gom thông tin, mục tiêu,
> thành viên sáng lập và tài liệu vào cùng một nơi. Cơ cấu ban đầu có một Chủ nhiệm, một
> hoặc hai Phó chủ nhiệm; người nộp cũng phải là thành viên sáng lập. Hệ thống kiểm tra đủ
> điều kiện trước khi nhận hồ sơ. Khi nộp, bản nội dung này được lưu thành một version để
> sau này đối chiếu.”

**Thao tác demo:** chuyển sang officer, mở hồ sơ, nhận xử lý rồi chỉ ba lựa chọn quyết định.

> “Phía ICPDP, việc mở xem chưa chuyển trạng thái. Em phải nhận hồ sơ thì hồ sơ mới sang
> `Under Review`, và chỉ người đã nhận mới quyết định. Officer có thể phê duyệt, yêu cầu
> chỉnh sửa hoặc từ chối. Trả sửa cần nêu phần chưa đạt, lý do và hạn sửa; sinh viên nộp lại
> thành version mới, còn bản cũ vẫn được giữ.”

**Thao tác demo:** phê duyệt hồ sơ hợp lệ; mở workspace CLB và trang cài đặt hồ sơ.

> “Em chọn phê duyệt. Hệ thống tạo CLB `Active` ngay, đồng thời tạo thành viên sáng lập,
> nhiệm kỳ và xác nhận ban chủ nhiệm. Vì vậy, CLB mới không phải chờ thêm vòng đề cử ban
> đầu. Leader có thể hoàn thiện liên hệ, mô tả và các ban ở đây. Ban tổ chức nội bộ không
> phải role cấp quyền. CLB đã sẵn sàng chuyển sang tuyển thành viên.”

## Nhánh cần giải thích

- Thiếu tài liệu, thiếu founder, sai cơ cấu hoặc Chủ nhiệm đang lãnh đạo CLB khác: không được nộp; kiểm tra xung đột Chủ nhiệm còn được thực hiện lại khi phê duyệt.
- Trùng tên hoặc có CLB tương tự: hệ thống cảnh báo/gợi ý để tham khảo; ICPDP vẫn ra quyết định, không tự động từ chối bằng điểm tương tự.
- Trả sửa: code hiện tại bắt buộc deadline tương lai. Hồ sơ quá hạn được job chuyển `Expired`; sinh viên phải tạo hồ sơ mới.
- Rút hồ sơ trước quyết định: chuyển `Withdrawn` và đóng task; officer không được duyệt bản đã rút.
- UC09 chỉ sửa thông tin vận hành được phép. Không dùng trang này để đổi trạng thái pháp lý CLB hoặc gán quyền quản trị.

## Câu hỏi bảo vệ và câu trả lời

### 1. Đủ bao nhiêu founder và cần những tài liệu gì?

> “Số founder tối thiểu và các yêu cầu hồ sơ lấy theo chính sách hiệu lực, nên em kiểm tra
> cấu hình trên môi trường demo thay vì khẳng định một con số cố định. Riêng cơ cấu sáng
> lập phải có đúng một Chủ nhiệm, một hoặc hai Phó chủ nhiệm và không lặp người.”

### 2. Người nộp có bắt buộc làm Chủ nhiệm không?

> “Không. Người nộp bắt buộc là một founder, nhưng có thể được chọn làm Phó chủ nhiệm hoặc
> Member. Sau duyệt, quyền quản trị phụ thuộc ghế đã được xác nhận; không phụ thuộc ai bấm
> nộp hồ sơ.”

### 3. Duyệt thành lập xong có phải đề cử và xác nhận ban chủ nhiệm lại không?

> “Không với CLB mới. UC08 đã tạo CLB `Active` và xác nhận ban sáng lập trong cùng lần duyệt.
> Nhánh founder tạm ở `Pending Setup` chỉ còn để tương thích dữ liệu cũ. UC10–UC11 dùng cho
> bổ sung ghế đủ điều kiện ở nhiệm kỳ hiện tại; chuyển cả nhiệm kỳ đi qua UC12–UC13.”

### 4. Hai officer cùng mở hồ sơ thì ai có quyền quyết định?

> “Mở xem không chiếm quyền xử lý. Officer phải nhận task; quyết định kiểm tra task còn mở
> và đúng người nhận. Nếu hồ sơ đã được rút hoặc quyết định trước đó, thao tác tiếp theo bị
> từ chối để không tạo hai kết quả.”

### 5. Vì sao lưu version thay vì sửa trực tiếp bản đã nộp?

> “Để biết chính xác ICPDP đã xem và quyết định dựa trên nội dung nào. Sinh viên sửa bản
> làm việc rồi nộp thành version mới; bản từng nộp không bị ghi đè. Officer ghi nhận xét và
> yêu cầu sửa, không sửa nội dung thay sinh viên.”

### 6. Trả sửa khác từ chối như thế nào?

> “Trả sửa giữ cơ hội tiếp tục hồ sơ trong hạn đã đặt, với phần cần sửa và lý do rõ ràng.
> Từ chối kết thúc hồ sơ và không tạo CLB. Với trả sửa, nếu quá hạn mà không nộp lại, job
> chuyển hồ sơ sang `Expired`, không tự phê duyệt.”

### 7. Gợi ý CLB tương tự có phải AI ra quyết định không?

> “Không. Code tính điểm so khớp theo tên, nội dung và lĩnh vực, rồi đưa ra gợi ý tham khảo.
> Công thức có trọng số tên 40, nội dung 40, lĩnh vực 20. Gợi ý không chặn nộp và không chọn
> thay kết quả cho officer. Phía sinh viên cũng không được thấy hồ sơ thành lập của người
> khác.”

### 8. Nếu tạo CLB thành công nhưng tạo membership thất bại thì sao?

> “Phê duyệt chạy trong transaction MongoDB: tạo CLB, nhiệm kỳ, membership, các ghế, phiên
> bản cơ cấu và ghi quyết định cùng một giao dịch. Nếu giao dịch thất bại thì không để lại
> CLB được tạo dở. Môi trường chạy nghiệp vụ này cần MongoDB hỗ trợ transaction.”

### 9. Leader có tự tạo role Thủ quỹ rồi cấp quyền chi tiêu không?

> “Không. Hệ thống dùng hai role truy cập cố định là Club Leader và Club Member. Các ban,
> bộ phận hay chức danh tổ chức không tạo thêm permission. UC23 đã rút; chỉnh hồ sơ hoặc
> đặt tên ban không phải cách thay đổi quyền.”

### 10. Nhiệm kỳ sáng lập bắt đầu và kết thúc khi nào?

> “Code hiện tại đặt ngày bắt đầu bằng thời điểm phê duyệt và ngày kết thúc sau một năm.
> Đây là cách triển khai nhiệm kỳ sáng lập hiện tại, không phải một trường nhập trên form
> UC07 hay giá trị tự thay đổi qua UC04. Lịch sử vẫn lưu được nguồn hồ sơ và người xác nhận.”

## Bàn giao

> “CLB đã được công nhận và có ban chủ nhiệm hợp lệ. Em dùng workspace của Leader để mở
> một đợt tuyển, rồi theo dõi ứng viên đến khi trở thành thành viên.”

Tiếp tục [flow 3 — Tuyển và quản lý thành viên](flow-03-recruitment-membership.md).
Phần thay đổi ban chủ nhiệm xem [flow 4](flow-04-leadership-transition.md).

## Nguồn đối chiếu

- [SRS — UC07–UC09, BR03–BR06, BR55–BR56](../SRS.md) và [hiện trạng UC08](../CURRENT_IMPLEMENTATION.md).
- [Route UI](../../client/src/main.tsx), [form hồ sơ](../../client/src/pages/student/ApplicationEditorPage.tsx), [màn thẩm định](../../client/src/pages/icpdp/ApplicationReviewDetailPage.tsx).
- [Cơ cấu founder và kiểm tra hồ sơ](../../server/src/domain/club-application.ts).
- [Kiểm tra nộp hồ sơ](../../server/src/usecase/club-application.ts) và [snapshot/version](../../server/src/infra/db/mongo-club-application-repository.ts).
- [Quyết định, lý do, deadline](../../server/src/usecase/club-application-review.ts).
- [Transaction duyệt thành lập](../../server/src/infra/db/mongo-club-application-review-repository.ts).
- [Gợi ý CLB tương tự](../../server/src/domain/similar-club.ts).
- [Phạm vi chỉnh hồ sơ và ban/bộ phận](../../server/src/usecase/club-profile.ts).
