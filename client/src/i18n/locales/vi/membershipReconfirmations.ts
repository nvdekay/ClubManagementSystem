import type { Messages } from '../../messages'
import type { membershipReconfirmations as en } from '../en/membershipReconfirmations'

export const membershipReconfirmations = {
  title: 'Xác nhận thành viên đầu học kỳ',
  description: 'Xác nhận trong 14 ngày từ đầu học kỳ để giữ tư cách thành viên Active.',
  confirm: 'Tôi vẫn đang hoạt động',
  retry: 'Thử lại',
  deadline: 'Hạn xác nhận',
  Pending: 'Cần xác nhận',
  Confirmed: 'Đã xác nhận',
  Exempt: 'Miễn xác nhận (Leader đã được xác nhận)',
  Expired: 'Quá hạn — liên hệ Club Leader',
} satisfies Messages<typeof en>
