# Handoff dự án UCMS — 2026-10-09

Tài liệu này là ảnh chụp trạng thái để chia sẻ với đồng đội hoặc mở session mới. Nguồn chân lý
vẫn là `docs/SRS.md`, `.sdd/specs/feat-*/SPEC.md`, source và `.rules/`; nếu có khác biệt, kiểm tra
source/SPEC mới nhất. Không ghi đè các thay đổi chưa commit, không sửa sơ đồ trong lúc tiếp tục.

## Bắt đầu session mới

1. Đọc `.rules/README.md`, sau đó đọc file quy tắc tầng sắp làm.
2. Chạy `git status --short` và giữ nguyên toàn bộ thay đổi hiện có. Worktree đang có nhiều thay
   đổi chưa commit thuộc các luồng trước và phần QA UI; không dùng `reset`, `checkout` hay dọn file.
3. Đọc handoff này, `docs/05-implementation/IMPLEMENTATION_BACKLOG.md`, rồi SPEC/TASKS của luồng
   nhận tiếp. `docs/05-implementation/SESSION_HANDOFF.md` là snapshot ngày 2026-10-08, một phần
   thông tin trong đó đã cũ; không thay thế file đó bằng snapshot này.
4. Không chỉnh các sơ đồ. Trước khi sửa một file hiện đang modified, kiểm tra diff và chỉ thay đổi
   phần cần thiết.

## Quyết định business đã chốt

- ICPDP chỉ có **một role** `ICPDP_OFFICER`, không tách `ICPDP_HEAD`. UC08 và UC11 dùng một review
  task và một quyết định cho mỗi lần duyệt; không dựng thêm cấp duyệt.
- UC10: người được đề cử cần membership `Active`; không cho nhiệm kỳ Chủ nhiệm bị chồng lấn.
  Xác nhận một phần ghế được hỗ trợ, nhưng không tạo cấp duyệt mới.
- Một recruitment campaign phải nằm trọn trong đúng một kỳ trong `academicCalendar` đang hiệu lực.
- Campaign trùng vị trí/thời gian: cảnh báo rồi cho người quản lý xác nhận tạo/công bố campaign
  riêng; không gộp campaign vì chưa có quy tắc dữ liệu cho việc gộp.
- UC21: tạm chặn mọi ngày hiệu lực trước hôm nay theo `Asia/Ho_Chi_Minh`.
- Membership unique từng phần theo `(clubId,userId)` chỉ khi state `Active`/`Inactive`: `Left`
  có thể quay lại bằng membership mới; `Banned` không được tiếp nhận lại theo BR46.
- Student gửi withdrawal request không tự đổi membership. Ngày xin có thể ở tương lai; nếu CLB
  thực thi sau ngày xin thì dùng ngày thực thi hiện tại, không hồi tố. Membership giữ ghế BCN đã
  xác nhận thì request ở `Held` cho tới khi ghế được thay.
- Người dùng đã xác nhận được sửa DBML/generator/generated index để partial unique khớp thiết kế.

## Tình trạng các luồng theo tiêu chí full-stack

“Đã nối” dưới đây nghĩa là đã thấy UI → service/hook → API → use case/repository → Mongo cho
đường chính. Nó không đồng nghĩa đã đóng nghiệm thu trực quan, mọi nhánh SRS đã đủ, hay tích hợp
bên ngoài đã được xác minh.

### Có đường business chính full-stack trong source

- **Thành lập CLB UC07→UC11:** Student nộp hồ sơ → ICPDP review/decision → founder cấu hình hồ sơ
  và cơ cấu → đề cử BCN → ICPDP xác nhận → CLB Active. UI, API, nghiệp vụ, Mongo và automated
  tests đã có. Các module tương ứng: `feat-club-applications`, `feat-club-application-review`,
  `feat-club-profile-structure`, `feat-board-nomination-confirmation`.
- **Public discovery UC06:** trang public gọi API Mongo cho danh bạ CLB/chi tiết/sự kiện. Code
  của slice này end-to-end; dữ liệu còn giới hạn (một số CLB chưa có tên/ảnh, sự kiện sắp tới
  chưa có trong snapshot) và visual QA còn mở.
- **Tuyển thành viên UC16→UC17→UC18→UC20:** campaign được tạo/công bố → Student nộp/rút/theo dõi
  đơn → CLB review/quyết định → onboard/decline. UI/API/Mongo đều đã có cho đường quyết định trực
  tiếp. **Chưa coi toàn bộ nghiệp vụ tuyển là full:** UC19 đánh giá rubric chưa triển khai; UC18
  còn thiếu test tập trung cho capacity và bulk/waitlist; member space UC24 chưa có.

### Có code nhưng còn thiếu để gọi là hoàn chỉnh

- **UC01 / workspace / UC03:** Google OAuth, session, quyền, workspace và UC03 account management
  có code. Chưa hoàn tất callback Google thật bằng credentials phù hợp và nghiệm thu UI thật.
- **UC04 policy:** màn ICPDP và API/version Mongo có; FR-UC04-06 (liên kết quyết định với policy
  snapshot và chặn policy làm vô hiệu quyết định đã ra) còn thiếu.
- **UC07 upload:** Cloudinary adapter/route đã có, nhưng chưa nghiệm thử bằng credentials thật;
  xử lý asset mồ côi khi upload thành công nhưng ghi Mongo thất bại còn mở.
- **UC21–UC22:** domain/use case, API/OpenAPI, Mongo, test cho trạng thái/leave/board-seat guard,
  audit/notification và partial index đã có. Chưa có UI, client service/hook, i18n hay entry point;
  xem `.sdd/specs/feat-membership-lifecycle/TASKS.md`.
- **UI đã có nhưng chưa được visual QA thủ công:** UC06–UC11, UC16–UC20 và một số trang nền tảng.
  Cần kiểm tra desktop/mobile, `en`/`vi`, light/dark, loading/error/empty, quyền và luồng điều hướng.

### Chưa có workflow full-stack

- **UC02:** workspace homes hiện chủ yếu là điều hướng/cards, chưa phải dashboard nghiệp vụ có
  dữ liệu/panel theo actor như yêu cầu.
- **UC12–UC15:** chuyển giao nhiệm kỳ, suspension/reactivation/dissolution chưa có đường workflow.
- **UC19:** đánh giá ứng viên theo rubric, tổng hợp/độ phân tán, bất biến sau quyết định chưa có.
- **UC23–UC24:** quản lý role CLB và member space chưa có.
- **UC25 trở đi:** proposal/approval/công bố sự kiện, booking/cơ sở vật chất, đăng ký/điểm danh,
  báo cáo, tài chính, đánh giá, feedback/khiếu nại chưa có các workflow UI/API tương ứng.

DBML/generated schema có nhiều collection cho các use case sau, nhưng **schema đơn lẻ không có
nghĩa workflow đã được triển khai**.

## Kiểm chứng gần nhất

- Lint, typecheck và build server/client đã pass trên source được kiểm tra. Client build cảnh báo
  bundle JavaScript lớn hơn 500 kB.
- `MONGO_URI= npm run check`: constitution/lint/typecheck xanh, **113 unit tests pass**; 28
  integration test bị skip có chủ đích do URI rỗng.
- `npm run check` với `MONGO_URI` hiện có trong môi trường audit bị timeout kết nối Mongo ở 13
  integration suites; đây chưa phải bằng chứng integration xanh trên snapshot hiện tại. Trước
  đó integration test đã chạy pass trên Mongo replica set trong phiên làm việc khác, nhưng cần
  xác minh lại khi kết nối Mongo khả dụng.
- Baseline thiết kế Mongo hiện tại là **49 collection**. Khi cần xác minh DB thật, chỉ dùng cùng
  `MONGO_URI` đã cấu hình và `npm run db:verify`; không in giá trị secret.

## Ưu tiên tiếp theo

1. Đọc kết quả Claude/UI QA và giữ nguyên các chỉnh sửa hiện có ở `client/`; phân biệt lỗi QA với
   thay đổi code mới trước khi chỉnh tiếp.
2. Hoàn thiện UI UC21–UC22 (roster/action/history cho CMB; membership/leave request/status cho
   Student) để khép backend slice đã có.
3. Triển khai UC19, nối assessment vào review UC18; sau đó UC24 để hoàn thành luồng tuyển → thành
   viên theo SRS. Trước khi gọi luồng tuyển “full”, bổ sung test capacity/bulk/waitlist.
4. Chạy integration test với Mongo replica set khả dụng; rồi `npm run check`, `npm run build -w
   server` và `npm run build -w client`. Ghi rõ integration nào pass/skip.
5. Đối chiếu/refresh implementation tracking sau khi có kết quả QA. Không sửa sơ đồ trong phạm vi
   handoff này.
