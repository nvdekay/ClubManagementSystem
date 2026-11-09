# services/

Tầng API: các hàm bọc `fetch` thuần cho `/api/v1`, mỗi tài nguyên một file. Component và hook
gọi các hàm này — không bao giờ gọi `fetch` trực tiếp. Không axios, không thư viện query.

`apiError.ts` dùng chung cho các service: `apiFetch` giữ nguyên response HTTP và việc huỷ request,
dịch lỗi kết nối; `ApiError` giữ `rawMessage` để chẩn đoán và hiển thị thông báo theo ngôn ngữ hiện tại.
Các lớp lỗi nghiệp vụ kế thừa `ApiError` để giữ nguyên trường chi tiết và kiểm tra `instanceof`.
Thông báo API chưa có bản dịch dùng câu dự phòng tiếng Việt, không đưa nguyên văn tiếng Anh lên UI.
Kiểm thử hồi quy chạy bằng `npm test -w client` và được gọi trong `npm run check` ở thư mục gốc,
dùng Vitest hiện có trong npm workspace.
