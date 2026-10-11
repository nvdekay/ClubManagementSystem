# pages/icpdp/

`BookingReviewPage` (UC46) dùng `BookingWorkspace`: danh sách và chi tiết yêu cầu, nhận thẩm định
độc quyền, quyết định có lý do, xem nghĩa vụ quá hạn và đề xuất phòng/thời gian thay thế.
`PropertyBookingConflicts` nối UC44 FR-05, hiển thị yêu cầu đang chờ vướng blackout trong danh mục.
`RoomOverbookingForm` cho ICPDP chọn CLB/phòng/ngày/slot trùng lịch và nhập lý do ngoại lệ;
chỉ ghi khi policy bật, có conflict và có Chủ nhiệm hợp lệ. Server kiểm tra lại trong transaction.

Các trang nghiệp vụ chỉ dành cho `ICPDP_OFFICER`. Mỗi trang tự kiểm tra phiên đăng nhập và vai
trò để hiển thị trạng thái phù hợp; API và use case vẫn kiểm tra quyền ở server.

`ApplicationReviewQueuePage` và `ApplicationReviewDetailPage` triển khai UC08 một cấp duyệt:
hàng đợi, nhận task, đọc snapshot bất biến và ghi đúng một quyết định.

`BoardNominationQueuePage` và `BoardNominationDetailPage` triển khai UC11: một ICPDP Officer nhận
task và ghi đúng một quyết định xác nhận toàn phần hoặc một phần cho các ghế ban điều hành.

`IcpdpHomePage` triển khai dashboard UC02: hàng đợi, SLA, trạng thái CLB, báo cáo, tài chính,
vi phạm, lịch đặt, sự kiện nội bộ và lịch sử cơ cấu/ban điều hành.

`StudentFeedbackInboxPage` (UC50) là hộp thư góp ý sinh viên gửi cho ICPDP; chỉ ICPDP Officer đọc.

`PolicyPage` + `PolicyEditor` (UC04) chia chính sách theo luồng nghiệp vụ (Thành lập CLB, Hồ sơ CLB,
Sự kiện, Năm học, Báo cáo); ICPDP bật/tắt field bắt buộc của form cố định, mỗi lần lưu tạo phiên bản mới.

`ClubFieldsPage` quản lý danh mục lĩnh vực CLB sinh viên chọn khi lập hồ sơ: thêm, đổi tên/thứ tự,
xoá (chưa ai dùng thì xoá hẳn, đang dùng thì ẩn khỏi danh sách chọn).

`PropertiesPage` + `PropertyEditor` (UC44) quản lý danh mục cơ sở vật chất: mã tự sinh theo loại, sức
chứa, thiết bị đi kèm, khung giờ được đặt (chung hoặc từng ngày), giai đoạn khoá; ngừng sử dụng/dùng lại;
chỉ xoá được khi chưa từng có booking.

`EvaluationSchemesPage` + `SchemeEditor` (UC41) cấu hình scheme đánh giá theo học kỳ của lịch năm học: bật
D4–D8 (D1–D3 luôn có), trọng số % (tổng 100, có "Chia đều"), cho phép chấm tay, 3 mốc xếp loại; nháp sửa/xoá
được, kích hoạt thay thế scheme đang áp dụng của kỳ, scheme đã kích hoạt chỉ "tạo bản sửa".

`DataExportPage` (UC55) xuất dữ liệu ra `xlsx`/`csv`/`pdf`: chọn loại dữ liệu, thời gian (toàn bộ, học kỳ,
khoảng ngày), CLB, trạng thái; đếm số dòng trước khi tải; không có dòng nào thì không tạo file.

`IcpdpClubsPage` (route `/icpdp/clubs`) là màn CLB duy nhất của ICPDP: giao diện lưới thẻ như Khám phá CLB
nhưng gồm mọi CLB ở mọi trạng thái, lọc theo tên/lĩnh vực/trạng thái, khối "Sắp hết hạn tạm ngừng"; nút Quản lý
mở `ClubManageDialog` (dialog gốc của trình duyệt) chứa `ClubLifecyclePanel` (UC15): công việc đang chạy, lịch sử,
tạm ngừng/kích hoạt lại/giải thể — mọi quyết định bắt buộc lý do.

`EventProposalQueuePage` + `EventProposalReviewPage` (UC26) duyệt đề xuất sự kiện CLB gửi lên: hàng đợi kèm
tổng tiền xin và mức rủi ro; chi tiết gồm thời gian, địa điểm, xung đột, nghĩa vụ quá hạn của CLB, booking đính
kèm (chỉ xem), kinh phí xin theo hạng mục và kinh phí CLB đã được duyệt trong kỳ; quyết định Yêu cầu sửa / Phê
duyệt (kèm điều kiện và số duyệt từng hạng mục) / Từ chối.

`BudgetsPage` (UC35) gồm `BudgetsPage` (danh sách kinh phí sự kiện đã duyệt, lọc theo trạng thái) và
`BudgetDetailPage`: số duyệt, đã chuyển, còn được tạm ứng, hạn quyết toán, hạng mục duyệt, các lần chuyển
tiền và form ghi đúng một loại dòng tiền mà kinh phí đang nhận (tạm ứng / cấp bù / CLB hoàn trả).

`ViolationsPage` (UC40) gồm `ViolationsPage` (danh sách hồ sơ vi phạm theo nhóm trạng thái, form mở hồ sơ:
CLB, nguồn phát hiện, mức độ, sự việc, sự kiện/kinh phí liên quan, chứng cứ) và `ViolationDetailPage`: chứng
cứ, giải trình của CLB, quyết định, biện pháp khắc phục, lịch sử, và khung "Bước tiếp theo" chỉ hiện những bước
hợp lệ ở trạng thái hiện tại.

`SchoolEventsPage` (UC53) gồm `SchoolEventsPage` (danh sách sự kiện cấp trường kèm số CLB nhận lời/chưa trả
lời, form tạo: thời gian, phòng trong danh mục hoặc nơi khác với cảnh báo trùng lịch BR15, số chỗ, CLB mời,
hạn phản hồi) và `SchoolEventDetailPage`: danh sách lời mời (thu hồi lời mời đang chờ), mời thêm CLB, công bố
cho sinh viên (mở đăng ký, sinh mã check-in).

`EvaluationsPage` (UC42 + UC43) gồm `EvaluationsPage` (chọn học kỳ, sinh bản nháp cho mọi CLB chưa có, bảng
trạng thái/tổng điểm/xếp loại, công bố cả kỳ khi mọi CLB đã chốt) và `EvaluationDetailPage`: điểm từng tiêu chí
D1–D8 kèm dữ liệu nguồn, chấm tay (có lý giải) ở tiêu chí cho phép, sinh lại, chốt/mở lại, tạo bản sửa sau
công bố, các bản và xu hướng các học kỳ trước.
