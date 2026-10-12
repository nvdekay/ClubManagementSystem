# infra/auth/

Adapter cho Google OAuth và chữ ký phiên/CSRF. Chỉ tầng này giữ chi tiết giao thức,
crypto và cấu hình secret; tầng `interface` nhận các port đã được nối dây ở `main.ts`.
