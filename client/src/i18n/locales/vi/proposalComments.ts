import type { Messages } from '../../messages'
import type { proposalComments as en } from '../en/proposalComments'

export const proposalComments = {
  edit: 'Sửa',
  delete: 'Xóa',
  save: 'Lưu thay đổi',
  reasonHint: 'Nhận xét được ghép vào Lý do, lưu khi bạn gửi quyết định.',
  reasonTooLong: 'Tổng Lý do vượt 5.000 ký tự. Hãy rút gọn lý do hoặc nhận xét này.',
  add: 'Nhận xét',
  submit: 'Nhận xét',
  cancel: 'Hủy',
  saving: 'Đang lưu…',
  forSection: 'Nhận xét mục {{title}}',
  count: '{{count}} nhận xét',
  placeholder: 'Ghi rõ nội dung còn thiếu hoặc cần chỉnh sửa trong mục này…',
  saveError: 'Chưa lưu được nhận xét. Nội dung đã được giữ lại, bạn hãy thử gửi lại.',
  loadError: 'Không tải được nhận xét.',
  retry: 'Thử lại',
} satisfies Messages<typeof en>
