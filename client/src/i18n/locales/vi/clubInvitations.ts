import type { Messages } from '../../messages'
import type { clubInvitations as en } from '../en/clubInvitations'

export const clubInvitations = {
  title: 'Lời mời sự kiện cấp trường',
  description: 'Thay mặt CLB phản hồi lời mời tham gia từ ICPDP.',
  denied: 'Chức năng này yêu cầu quyền Club Leader.',
  empty: 'CLB chưa có lời mời nào.',
  deadline: 'Hạn phản hồi',
  accept: 'Nhận lời',
  decline: 'Từ chối',
  note: 'Nội dung phản hồi hoặc lý do từ chối',
  representative: 'Người đại diện',
  members: 'Số người dự kiến tham gia',
  retry: 'Thử lại',
  success: 'Đã gửi phản hồi.',
  Pending: 'Chờ phản hồi',
  Accepted: 'Đã nhận lời',
  Declined: 'Đã từ chối',
  Expired: 'Quá hạn',
  Withdrawn: 'Đã thu hồi',
  declineReasonRequired: 'Vui lòng nêu lý do từ chối lời mời.',
} satisfies Messages<typeof en>
