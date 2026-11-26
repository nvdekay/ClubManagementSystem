import type { Messages } from '../../messages'
import type { users as en } from '../en/users'

export const users = {
  title: 'Người dùng',
  namePlaceholder: 'Tên',
  emailPlaceholder: 'Email',
  createdAtHeader: 'Ngày tạo',
  add: 'Thêm',
  searchPlaceholder: 'Tìm theo tên hoặc email',
  limitLabel: 'Mỗi trang',
  columnsLabel: 'Cột',
  noUsers: 'Chưa có người dùng nào.',
  noResults: 'Không có người dùng phù hợp.',
  previousPage: 'Trang trước',
  nextPage: 'Trang sau',
  paginationLabel: 'Phân trang',
  gotoPage: 'Trang {{page}}',
  loadError: 'không thể tải danh sách người dùng',
} satisfies Messages<typeof en>
