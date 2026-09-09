const en = {
  title: "Users",
  namePlaceholder: "Name",
  emailPlaceholder: "Email",
  createdAtHeader: "Created",
  add: "Add",
  searchPlaceholder: "Search by name or email",
  limitLabel: "Per page",
  columnsLabel: "Columns",
  noUsers: "No users yet.",
  noResults: "No matching users.",
  previousPage: "Previous page",
  nextPage: "Next page",
  loadError: "failed to load users",
};

const vi: Record<keyof typeof en, string> = {
  title: "Người dùng",
  namePlaceholder: "Tên",
  emailPlaceholder: "Email",
  createdAtHeader: "Ngày tạo",
  add: "Thêm",
  searchPlaceholder: "Tìm theo tên hoặc email",
  limitLabel: "Mỗi trang",
  columnsLabel: "Cột",
  noUsers: "Chưa có người dùng nào.",
  noResults: "Không có người dùng phù hợp.",
  previousPage: "Trang trước",
  nextPage: "Trang sau",
  loadError: "không thể tải danh sách người dùng",
};

export const users = { en, vi };
