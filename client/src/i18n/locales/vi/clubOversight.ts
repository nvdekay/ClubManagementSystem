import type { Messages } from '../../messages'
import type { clubOversight as en } from '../en/clubOversight'

export const clubOversight = {
  retry: 'Thử lại',
  historyTitle: 'Lịch sử cơ cấu và ban chủ nhiệm',
  historyDescription:
    'Mọi phiên bản cơ cấu role và người giữ từng ghế ban chủ nhiệm theo nhiệm kỳ.',
  historyLoadError: 'Không tải được lịch sử cơ cấu và ban chủ nhiệm.',
  structuresTitle: 'Các phiên bản cơ cấu',
  currentVersion: 'Hiện hành',
  version: 'Phiên bản {{number}}',
  since: 'từ {{date}}',
  source_APPLICATION: 'Hồ sơ thành lập (UC08)',
  source_TRANSITION: 'Chuyển giao ban chủ nhiệm (UC13)',
  source_NOMINATION: 'Đề cử ban chủ nhiệm (UC11)',
  source_ROLE_EDIT: 'Sửa vai trò (đã rút)',
  source_MIGRATION: 'Chuẩn hoá dữ liệu',
  structuresEmpty: 'Chưa có phiên bản cơ cấu nào.',
  termsTitle: 'Ban chủ nhiệm theo nhiệm kỳ',
  termsEmpty: 'Chưa có nhiệm kỳ nào.',
  term_Active: 'Đang hiệu lực',
  term_Planned: 'Dự kiến',
  term_Closed: 'Đã kết thúc',
  seatPeriod: '{{from}} – {{to}}',
  seatOngoing: 'nay',
  confirmedVia: 'Xác nhận ở {{source}}',
  confirmedBy: 'bởi {{name}}',
  seatsEmpty: 'Nhiệm kỳ này chưa có ghế nào.',
  clubHistoryTitle: 'Lịch sử ban chủ nhiệm',
  clubHistoryDescription: 'Các phiên bản cơ cấu role của CLB và ban chủ nhiệm qua từng nhiệm kỳ.',
  clubForbidden: 'Chỉ Club Leader của CLB này mới xem được lịch sử ban chủ nhiệm.',
} satisfies Messages<typeof en>
