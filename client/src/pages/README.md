# pages/

Router nằm ở `client/src/main.tsx` (React Router); `App.tsx` chỉ render `AuthWorkspacePage`.
Mỗi nhóm trang một thư mục, chứa component của trang cộng các component con chỉ trang đó dùng:

- `public/` — trong `PublicLayout`: `/`, `/clubs`, `/clubs/:id`, `/events`, `/events/:id`, trang 404. Hiện `PublicLayout` chuyển khách chưa đăng nhập về `/login` dù API `/public` mở.
- `student/` — trong `WorkspaceShell`: `/student` và các route `/workspace/...` của Student.
- `club/` — trong `WorkspaceShell`: `/club/:clubId/...`, theo ngữ cảnh một CLB.
- `icpdp/` — trong `WorkspaceShell`: `/icpdp`, `/icpdp/clubs`, `/icpdp/accounts` và các route `/workspace/...` của ICPDP.
- `auth/` — `/login` và `/workspace` (qua `App`): đăng nhập và chọn workspace.

Component dùng ở từ 2 trang trở lên chuyển sang `components/custom/`.
