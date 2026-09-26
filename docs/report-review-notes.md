# Ghi chú review — `report.docx` đối chiếu với file mẫu và baseline UCMS

Ngày: 2026-09-26 · File mẫu nguồn: `docs/Group1_SE1939-NJ_Report_Final_G1.docx`
Sản phẩm đã sinh ra: `report.docx` (thư mục gốc của dự án)

File này ghi lại mọi điểm không nhất quán phát hiện được khi dựng lại báo cáo cuối, việc đã xử
lý ra sao, và những gì nhóm còn phải quyết định. Nó là vết kiểm toán của lần tái sinh báo cáo.

---

## A. Nội dung sót lại từ dự án trước (Bistro Cafe) — đã sửa trong `report.docx`

| # | Nằm ở đâu trong file mẫu | Mâu thuẫn | Đã xử lý |
|---|---|---|---|
| A1 | §III.2.2.2 Bảng III.6 "Descriptions" (95 dòng) | Vẫn là danh sách use case của quán cà phê (Login, POS order, branches, menu, toppings, COGS, loyalty), trong khi §3.2 của cùng chương đã chứa 54 bảng use case của UCMS. Báo cáo mô tả hai sản phẩm khác nhau ở hai mục liền kề. | Thay bằng 54 use case của UCMS, với actor và tóm tắt được sinh ra từ chính nguồn dữ liệu dựng các bảng UC, nên hai bên không thể trôi lệch nhau nữa. |
| A2 | §III.5.1 Bảng III.36 Business Rules (BR-01…BR-79) | Là quy tắc của quán cà phê. **BR-02, BR-70, BR-72, BR-79 bắt buộc băm mật khẩu và cấp mật khẩu tạm — mâu thuẫn trực tiếp với UC01 và BR32, vốn nêu rằng UCMS không lưu mật khẩu nào.** | Thay bằng danh mục BR01–BR46 của UCMS (BR43 đã rút, còn 45 quy tắc hiệu lực), mỗi quy tắc kèm các use case thực thi nó. |
| A3 | §III.4 Yêu cầu phi chức năng | Là NFR của quán cà phê: máy in nhiệt, ngăn kéo tiền, cổng thanh toán VNPay/MoMo, "RDBMS + ORM để chống SQL injection" (dự án dùng MongoDB), băm mật khẩu bằng Bcrypt, uptime "6:00 sáng tới 11:00 tối", "50–100 người dùng đồng thời trên nhiều chi nhánh". | Viết lại cho UCMS: không cần phần cứng chuyên dụng, các giao diện phần mềm là Google OAuth / Google SMTP / Mongoose, HTTPS + REST/JSON, và các thuộc tính chất lượng khớp với tải thật cùng mô hình bảo mật thật. |
| A4 | §IV.2 Bảng IV.6 Thiết kế cơ sở dữ liệu (48 bảng) | Là schema của quán cà phê: Branches, MenuItems, Recipes, Invoices, StockTransactions, LoyaltyRewards… | Thay bằng 44 collection của UCMS kèm mô tả, cộng tập index tối thiểu. |
| A5 | §IV.1.2 Bảng IV.4 Mô tả package | Phần back-end liệt kê **`prisma` — "Prisma ORM migrations"**, mâu thuẫn với §II.6.3 của chính tài liệu đó, vốn ghi database là MongoDB. Các dòng 15–20 còn bị lặp nguyên văn, và số thứ tự nhảy từ 11 sang 15. | Viết lại thành các package clean architecture thật (domain / usecase / interface / infra) phía server và cấu trúc services → hooks → pages phía client. |
| A6 | §IV.3 Detailed Design | Các mục 3.1 Auth … 3.9 POS Service đặc tả một sản phẩm khác (đăng nhập bằng mật khẩu, đăng ký, chi nhánh, menu, topping, kho, bảng lương, ca thu ngân). Sau đó chương này **khởi động lại cách đánh số**: có một "3.1 Event Management" thứ hai sau "3.9 POS Service", và không có mục 3.2 nào cả. | Thay bằng phần thiết kế chi tiết chỉ dành cho UCMS, đánh số lại 3.1–3.6, giữ 17 sequence diagram thật của UCMS và thêm một bảng tóm tắt thiết kế cho các module chưa có sơ đồ. |
| A7 | §VI.1 Gói bàn giao | "Bistro-Cafe-Management-System.zip", "WDP_Report_Final_G2.docx", "WDP_Unit Test Case_G2.xlsx" — sai sản phẩm **và sai cả số nhóm (G2)**. | Sửa lại thành các hạng mục bàn giao của UCMS, nhóm G1. |
| A8 | §VI.2.2 Yêu cầu hosting | "Extract Facility-Management-System.zip" — một tên sản phẩm **thứ ba**, khác cả bìa lẫn §VI.1. | Viết lại thành các bước triển khai thật, gồm cả việc đăng ký callback URL của Google OAuth và cơ chế fail-fast khi cấu hình thiếu. |
| A9 | §VI.3 Hướng dẫn sử dụng | Các vai trò Guest / Member / Staff / Cashier / Admin / Owner, minh hoạ bằng ảnh chụp màn hình POS. UCMS có Guest / Student / Club's Admin / ICPDP Officer. | Viết lại thành bốn phần hướng dẫn theo đúng actor của SRS. |
| A10 | §V.3.1 Bảng V.8 Nhân sự kiểm thử | Danh sách tester là AnhNTM, KhoiND, ThaiND, GiapPV, TuanNM — **không ai trong số đó là thành viên của nhóm này** như đã liệt kê ở §I.1.2 và §II.4.1. | Thay bằng sáu thành viên thật, mỗi người một phần trách nhiệm. |
| A11 | §II.1.1 WBS và §II.1.3 Rủi ro | Mục WBS 2.1 "Business Process Modeling (Bistro Flow)" và 3.4 "Develop UI Front-end (Admin Web & POS Workspace)"; rủi ro nói về kho đa chi nhánh, ranh giới module POS/CRM, tích hợp thanh toán và thanh toán đồng thời ở quầy. | Viết lại cho UCMS, giữ nguyên tổng công sức (3 + 32,5 + 92 + 15 = 142,5 man-day) và mở rộng bảng rủi ro để phủ các rủi ro thật của dự án (quy tắc quản trị còn cấu hình được, phạm vi 54 use case, phụ thuộc bên ngoài hỏng, tương tranh khi đăng ký và đặt chỗ, dữ liệu cá nhân trong khiếu nại). |

## B. Lỗi đánh số và cấu trúc trong file mẫu — đã sửa

| # | Lỗi | Cách sửa |
|---|---|---|
| B1 | Ba heading liên tiếp cùng tên "Hardware interfaces" (4.1.2, 4.1.3, và một mục nữa đánh số "4.1.") — thực chất mục thứ hai là Software interfaces và mục thứ ba là Communication interfaces. | Đánh số lại 4.1.1 User, 4.1.2 Hardware, 4.1.3 Software, 4.1.4 Communication. |
| B2 | "4.2. Safety" đứng sau 4.2.4 Security. | Đánh số lại thành 4.2.5 Safety. |
| B3 | Screen flow đánh số 3.1.1.1, 3.1.1.2, 3.1.1.3 rồi nhảy thẳng tới **3.1.1.6** Guest Flow. | Đánh số lại 3.1.2.1 – 3.1.2.4. |
| B4 | §3.1.3 Screen Authorization đứng ngay trước **§3.1.5** In/Out of scope — không có 3.1.4. | Đánh số lại 3.1.1 – 3.1.5 liền mạch. |
| B5 | Caption "Figure I: Context diagram" nằm trong chương III; caption của use case diagram chạy III.2.1, III.2.2, III.2.3, III.2.4, III 2.5, III.6, III.7, III.8, **III.6.4**. | Đánh số lại thành Figure III.1 và Figure III.2.1 – III.2.9. |
| B6 | Trang bìa liệt kê bốn thành viên với mã sinh viên bị cắt ("Nguyen Dinh Phong - HE18") trong khi §I.1.2 liệt kê sáu người. | Bìa và bảng nhóm nay cùng liệt kê đúng sáu thành viên. |
| B7 | Danh sách màn hình chứa "Recruitment campaign" hai lần (#7 và #17) với hai nghĩa khác nhau; tiêu đề bảng phân quyền viết sai thành "Club Amin". | Tách thành "Recruitment campaign (public)" và "Recruitment campaign detail"; sửa lỗi chính tả. |
| B8 | Các bảng UC trích dẫn mã quy tắc **BR-AUTH** và **BR-DASH**, vốn không tồn tại trong bất kỳ danh mục nào. | Thay bằng mã thật trong danh mục (BR32, BR31 …). Mọi quy tắc được một bảng UC trích dẫn nay đều tồn tại trong Bảng III.6. |
| B9 | Bảng mức kiểm thử đánh dấu Functional Testing chỉ ở mức Unit và Acceptance, còn GUI Testing ở mức Integration nhưng không ở Unit — một ma trận bất thường, mâu thuẫn với §V.1.1. | Sửa lại, và thêm Security Testing thành loại kiểm thử thứ tư. |

## C. Mâu thuẫn ở mức yêu cầu — những điểm đáng nêu với giảng viên

| # | Mâu thuẫn | Trạng thái trong `report.docx` |
|---|---|---|
| C1 | **Ma trận phân quyền màn hình gần như bỏ trống và một phần thì sai.** Các dòng 34–78 của Bảng III.14 hầu như không có dấu tích nào; "Propose new club" được cấp cho **Guest**, mâu thuẫn với UC07 vốn có tiền điều kiện là đã đăng nhập; ICPDP được cấp các màn hình vận hành của CLB (Application comment and result, Club event list) vốn thuộc về Club's Admin. | Toàn bộ ma trận nay được **sinh ra từ actor của các use case**, nên một màn hình không thể được cấp quyền cho một vai trò không sở hữu use case nào đứng sau nó. |
| C2 | **Danh sách màn hình không phủ hết use case model.** Không có màn hình nào cho check-in (UC31), phản hồi (UC50, UC51), khiếu nại (UC52–UC54), ngân sách, khoản chi, giải ngân và đối soát (UC35–UC39), danh mục cơ sở vật chất (UC46), danh sách chờ (UC30), chốt điểm danh (UC32), scheme đánh giá, bản nháp và công bố (UC43–UC45), định tuyến phê duyệt (UC05), tiếp nhận thành viên (UC20) hay phân công chức vụ (UC23). | Mở rộng từ 78 lên **113 màn hình**; thêm một cột "Use case" và một phép kiểm tra tự động nay xác nhận **cả 54 use case đều có ít nhất một màn hình**. |
| C3 | **UC06 tự mâu thuẫn** (review issue I22 còn mở): "Chỉ liệt kê CLB `Active`" rồi lại "CLB `Suspended` vẫn hiển thị nhưng được đánh dấu". | Báo cáo ghi cách xử lý: *liệt kê cả CLB `Active` và `Suspended`; CLB `Suspended` được đánh dấu và không hiện đợt tuyển nào; CLB `Dissolved` không được liệt kê.* **Nhóm phải chốt câu chữ này và cập nhật use case model cùng đặc tả.** |
| C4 | **BR31 và BR16 / UC05.** BR31 nói ICPDP là cấp phê duyệt duy nhất; BR16 và các rule định tuyến lại đưa vào một cấp duyệt thứ hai. Điều này chỉ đúng vì cả hai cấp đều do một ICPDP Officer thực hiện. | Báo cáo trình bày đúng như vậy. **Quyết định còn mở D1: nếu nhóm vẽ một actor `ICPDP Head` lên use case diagram thì BR31 trở thành sai.** Cần chốt trước khi hiện thực UC05. |
| C5 | **Khoảng hai mươi quy tắc tự nhận là "cấu hình được", nhưng thực tế chỉ chín giá trị là cấu hình được** (BR42). | Báo cáo liệt kê tường minh chín giá trị đó ở UC04 và trong Bảng III.6. **Quyết định còn mở D2: cần chốt danh sách với quy trình thật của ICPDP trước khi đóng băng màn hình cấu hình.** |
| C6 | **Một sự kiện được đổi lịch** — nó có cần một quyết định mới từ UC26, hay chỉ cần thông báo? | Được ghi là phụ thuộc chính sách trong UC28. **Quyết định còn mở D4; phải chọn một hướng trước khi code UC28.** |
| C7 | **CLB có thấy danh tính người khiếu nại** trong UC54 không? | Được ghi là "chỉ ở mức chính sách cho phép". **Quyết định còn mở D5; nó thay đổi cả màn hình lẫn quy tắc riêng tư.** |
| C8 | **Ai sở hữu cascade khi giải thể.** UC15 huỷ các sự kiện và booking của CLB, nhưng UC28 và UC49 lại là use case của Club's Admin. | Giữ theo cách giải quyết của v2: đây là một **cascade hệ thống** (UC28 A1 và UC49 A1), ICPDP *không* phải actor của UC28 hay UC49. Do đó use case diagram không được vẽ association từ ICPDP tới hai use case này. |
| C9 | **Feedback window mở tại lúc check-in** (BR36), không phải sau khi chốt điểm danh như tài liệu v1 từng nói. | Báo cáo dùng quy tắc check-in xuyên suốt. Bất kỳ sơ đồ cũ nào còn vẽ "window mở sau khi chốt" đều đã lỗi thời và phải xuất lại. |
| C10 | Bảng actor liệt kê Google OAuth và Google SMTP như actor #4 và #5, trong khi mô hình nói rõ chúng là hệ thống ngoài, không ra quyết định. | Vẫn giữ trong bảng cho đầy đủ nhưng thêm một cột **Loại** phân biệt rõ "Human actor" với "External system". |
| C11 | Review issue cũ I21: UC09 và UC21 trỏ tới UC23 để thu hồi chức vụ, trong khi một ghế ban chủ nhiệm được thay qua UC10/UC11. | Cả hai đường nay được nêu tường minh trong bảng use case tương ứng, nên phụ thuộc không còn mơ hồ. |

## D. Những gì không điền được, và vì sao

| # | Hạng mục | Lý do và việc cần làm |
|---|---|---|
| D1 | **Ảnh chụp màn hình trong hướng dẫn sử dụng (§VI.3)** | File mẫu minh hoạ phần hướng dẫn bằng ảnh chụp của *sản phẩm khác*. Không có ảnh giao diện UCMS nào trong bất kỳ tài liệu nguồn nào, và bịa ra chúng là trình bày sai về sản phẩm. Vì vậy §VI.3 được viết dưới dạng hướng dẫn từng bước theo vai trò. **Hãy chèn một ảnh dưới mỗi gạch đầu dòng khi giao diện đã dựng xong.** |
| D2 | **Class diagram trong §IV.3** | File mẫu ghép một class diagram với một sequence diagram cho mỗi chức năng của quán cà phê. Với UCMS chỉ tồn tại **17 sequence diagram** (event management ×12, báo cáo định kỳ và tuân thủ ×3, đánh giá CLB ×2) và **không có class diagram nào**. Báo cáo dùng 17 sơ đồ thật và phủ các module còn lại bằng một bảng tóm tắt thiết kế. **Nếu giảng viên yêu cầu class diagram cho từng chức năng thì phải vẽ và chèn thêm.** |
| D3 | **Sequence diagram cho các module còn lại** | Định danh, vòng đời CLB, tuyển thành viên, tài chính, cơ sở vật chất và phản hồi/khiếu nại không có sơ đồ nào trong tài liệu nguồn. Xử lý giống D2. |
| D4 | **Sprint backlog / danh sách công việc** | File mẫu liên kết tới một "Task List" bên ngoài. Repo không có hiện vật này, nên §II.3 trình bày cách tiếp cận sprint mà không kèm liên kết. |
| D5 | **Tên tác giả của use case** | File mẫu để `<Author>` làm chỗ trống ở cả 54 bảng. Đã điền bằng BA chịu trách nhiệm (Nguyễn Vũ Đăng Khánh). Hãy đổi nếu các bảng do nhiều người viết. |

## E. Những bảo đảm nhất quán được cài sẵn trong báo cáo đã sinh

- 54 bảng use case ở §III.3.2, danh sách use case ở Bảng III.2 và bảng ánh xạ màn hình ↔ use
  case ở Bảng III.3 đều được **sinh ra từ một nguồn dữ liệu duy nhất**, nên chúng không thể
  nói khác nhau.
- Ma trận phân quyền màn hình (Bảng III.4) được **suy ra từ** danh sách màn hình, nên một màn
  hình không thể xuất hiện ở bảng này mà thiếu ở bảng kia.
- Mọi quy tắc nghiệp vụ được trích dẫn bên trong một bảng use case đều tồn tại trong danh mục
  của Bảng III.6.
- Đã kiểm tra có đủ 54 use case (UC01–UC54, không hụt mã nào), và mọi use case đều có màn hình.
- Tài liệu đã được kiểm tra với schema Office Open XML: **mọi phép kiểm tra đều đạt**, 6.846
  đoạn văn, 83 bảng, 47 hình.
