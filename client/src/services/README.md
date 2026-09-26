# services/

Tầng API: các hàm bọc `fetch` thuần cho `/api/v1`, mỗi tài nguyên một file. Component và hook
gọi các hàm này — không bao giờ gọi `fetch` trực tiếp. Không axios, không thư viện query.
