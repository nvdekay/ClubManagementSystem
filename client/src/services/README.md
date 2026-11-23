# services/

Tầng API: các hàm bọc `fetch` thuần cho `/api/v1`, mỗi tài nguyên một file. Component và hook
gọi các hàm này — không bao giờ gọi `fetch` trực tiếp. Không axios, không thư viện query.

`apiError.ts` dùng chung cho các service: `apiFetch` giữ nguyên response HTTP và việc huỷ request,
dịch lỗi kết nối; `ApiError` giữ `rawMessage` để chẩn đoán và hiển thị thông báo theo ngôn ngữ hiện tại.
Các lớp lỗi nghiệp vụ kế thừa `ApiError` để giữ nguyên trường chi tiết và kiểm tra `instanceof`.
Thông báo API chưa có bản dịch dùng câu dự phòng tiếng Việt, không đưa nguyên văn tiếng Anh lên UI.
`fetchEventProposalPreviewFile` trong `clubEvents.ts` lấy link truy cập tài liệu đã lưu rồi tải bản gốc
cho bản xem toàn văn; chuyển tiếp AbortSignal khi tải, không gửi cookie sang URL file, giới hạn 10 MB.
`fetchReviewProposalPreviewFile` trong `eventProposalReviews.ts` tải file theo đúng số phiên bản đã nộp
qua API ICPDP để dùng cùng trình xem và hồ sơ trích xuất với CLB, cùng giới hạn 10 MB.
Kiểm thử hồi quy chạy bằng `npm test -w client` và được gọi trong `npm run check` ở thư mục gốc,
dùng Vitest hiện có trong npm workspace.
