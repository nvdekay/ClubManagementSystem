# services/

Tầng API: các hàm bọc `fetch` thuần cho `/api/v1`, mỗi tài nguyên một file. Component và hook
gọi các hàm này — không bao giờ gọi `fetch` trực tiếp. Không axios, không thư viện query.

`apiError.ts` dùng chung cho các service: `apiFetch` giữ nguyên response HTTP và việc huỷ request,
dịch lỗi kết nối; `ApiError` giữ `rawMessage` để chẩn đoán và hiển thị thông báo theo ngôn ngữ hiện tại.
`ApiError.status` giữ mã HTTP của response lỗi (không có với lỗi mạng), để chính sách retry/401 dùng chung trong
`main.tsx` phân biệt lỗi 4xx với lỗi máy chủ.
Các lớp lỗi nghiệp vụ kế thừa `ApiError` để giữ nguyên trường chi tiết và kiểm tra `instanceof`.

`apiRequest.ts` — `apiRequest<T>(url, { method, body, csrfToken, signal, headers, toError })` là helper duy nhất gọi
`/api/v1`: gửi body JSON (hoặc `FormData`/`Blob` nguyên vẹn), gắn `X-CSRF-Token`, mở phong bì `{ data }` (body rỗng/204
→ `undefined`) và ném `ApiError` kèm `status`. Module cần lớp lỗi riêng truyền `toError(failure)`; `failure` có
`status`, `message` thô, `details` và body đã đọc — lớp lỗi riêng luôn chuyển tiếp `status` cho `ApiError`, và chỉ tạo
lớp riêng khi có thêm trường chi tiết (kiểm tra mã HTTP thì dùng `instanceof ApiError && error.status === …`). Mỗi file
service khai báo `const request = apiClient('<đường dẫn gốc>', toError?)` — không tự viết lại việc đọc lỗi, header hay
phong bì. `postFile(url, body, csrfToken, fallbackName)` dùng cho các POST trả file thô (tải export, báo cáo năm), đọc
tên file từ Content-Disposition; `downloadSignedFile` trong `clubEvents.ts` tải tài liệu qua URL có chữ ký.
Thông báo API chưa có bản dịch dùng câu dự phòng tiếng Việt, không đưa nguyên văn tiếng Anh lên UI.
`fetchEventProposalPreviewFile` trong `clubEvents.ts` lấy link truy cập tài liệu đã lưu rồi tải bản gốc
cho bản xem toàn văn; chuyển tiếp AbortSignal khi tải, không gửi cookie sang URL file, giới hạn 10 MB.
`fetchReviewProposalPreviewFile` trong `eventProposalReviews.ts` tải file theo đúng số phiên bản đã nộp
qua API ICPDP để dùng cùng trình xem và hồ sơ trích xuất với CLB, cùng giới hạn 10 MB.
Kiểm thử hồi quy chạy bằng `npm test -w client` và được gọi trong `npm run check` ở thư mục gốc,
dùng Vitest hiện có trong npm workspace.
