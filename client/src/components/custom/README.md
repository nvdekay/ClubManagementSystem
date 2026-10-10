# components/custom/

`BookingWorkspace` dùng chung cho UC45/UC47 phía CLB và UC46 phía ICPDP; hai ngữ cảnh dùng
cùng API booking, lịch sử version và quyết định.

Component dùng ở nhiều trang, có hiểu biết nghiệp vụ (không nguyên tử). Không có tiền tố `App`.
Ví dụ: `UserListItem.tsx` khi nó đã được render bởi từ 2 trang trở lên.
