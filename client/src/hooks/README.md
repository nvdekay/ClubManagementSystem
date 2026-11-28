# hooks/

Các React hook tái sử dụng được, mỗi hook một file `use<Name>.ts` — lấy dữ liệu, logic có state
dùng chung. Chỉ dùng state gốc của React (không thư viện state); gọi `services/` để truy cập
API, không bao giờ gọi `fetch` trực tiếp trong component.

`useProposalReasonDraft` gộp nhận xét theo mục vào Lý do quyết định, dùng chung giữa xét duyệt và phòng bảo vệ.
Bản nháp được giữ trong sessionStorage theo tài khoản, sự kiện và bản nộp; chỉ lưu chính thức bằng API
quyết định hiện có và xóa bản nháp sau khi gửi thành công. Không tạo kho nhận xét độc lập.
Thẻ nháp và vị trí đoạn lý do cũng được giữ lại để sửa/xóa. Sửa trực tiếp Lý do sẽ dịch vị trí
các thẻ không bị ảnh hưởng và bỏ thẻ đã bị thay đổi nội dung, tránh xóa nhầm văn bản người dùng.

`useEventProposalPreview` trong `useClubEvents.ts` lấy tài liệu đã lưu qua service, cache theo CLB,
sự kiện và ID tài liệu. Khi có file vừa import thì dùng file local thay vì tải bản cũ.
`useReviewProposalPreview` trong `useEventProposalReviews.ts` cache riêng theo sự kiện, số phiên bản
đã nộp và ID tài liệu cho ICPDP, chỉ tải khi có quyền ICPDP và đủ định danh tài liệu.

`usePageTransition` là hook giao diện thuần (không gọi API): `WorkspaceShell` và `PublicLayout` gắn ref
của nó vào vùng nội dung để khi đổi đường dẫn thì cuộn về đầu trang và chạy hiệu ứng mờ-trượt nhẹ
(bỏ qua lần render đầu và khi người dùng bật giảm chuyển động).

`useNow` trả về thời điểm hiện tại (ms) và tự cập nhật theo chu kỳ (mặc định mỗi phút), dùng cho các kiểm tra
theo khung thời gian (báo trước 24/72 giờ, cửa sổ check-in) để chúng không bị "đóng băng" ở lần render đầu.

`useUnsavedChangesGuard(dirty)` hỏi lại trước khi rời một form còn thay đổi chưa lưu: điều hướng trong ứng dụng đi qua
`useBlocker` + hộp xác nhận của `useConfirm`, đóng/tải lại tab đi qua `beforeunload` của trình duyệt. Gọi
`allowNavigation()` ngay trước khi tự điều hướng sau khi lưu thành công. Dùng ở `ClubEventProposalPage` và `PolicyEditor`.

`useWorkspacePermission(clubId, permission)` trả về người dùng có permission đó trong workspace CLB hay không (đọc từ
`/auth/me`, chỉ để ẩn/hiện giao diện — server vẫn tự kiểm tra); `useClubWorkspace(clubId)` trả về chính workspace CLB
khi trang cần nhiều permission hoặc tên CLB. Đừng tự viết lại `auth.data?.workspaces.find(...)` ở từng trang.

`useFormat()` trả về `date`/`day`/`money` đã gắn ngôn ngữ giao diện hiện tại (bọc `formatDate`, `formatDay`,
`formatMoney`), để trang không phải tự viết lại hàm `date(value)` gọi `formatDate(value, i18n.language)`.

`useInvalidatingMutation(mutationFn, keys, seed?)` là dạng chung của mutation "gọi service rồi làm mới cache": khi thành
công, `seed(data, vars)` (nếu có) ghi trước một mục cache từ response, rồi lần lượt invalidate từng query key trong `keys`
(mảng, hoặc hàm `(data, vars) => keys`) theo đúng thứ tự. Dùng các key gốc đã export (`authKeyRoot`, `dashboardKeyRoot`,
`eventRegistrationsKeyRoot`, `eventProposalKey`) thay vì viết lại `['auth']`, `['dashboard']`.

`useDismissibleMenu()` giữ trạng thái mở/đóng và hai ref (`root`, `trigger`) của một menu thả xuống: bấm ra ngoài thì đóng,
Esc thì đóng và trả focus về nút mở. Dùng ở `UserMenu` và `SidebarAccountMenu`.
