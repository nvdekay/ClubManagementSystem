import type { Messages } from '../../messages'
import type { eventFeedback as en } from '../en/eventFeedback'

export const eventFeedback = {
  title: 'Phản hồi của bạn',
  intro:
    'Chấm sao cho sự kiện và chia sẻ cảm nhận với ban tổ chức. Phản hồi không sửa được sau khi gửi.',
  ratingLabel: 'Đánh giá chung',
  star_one: '{{count}} sao',
  star_other: '{{count}} sao',
  ratingWord1: 'Tệ',
  ratingWord2: 'Tạm được',
  ratingWord3: 'Tốt',
  ratingWord4: 'Rất tốt',
  ratingWord5: 'Xuất sắc',
  commentLabel: 'Nhận xét của bạn',
  commentPlaceholder: 'Điều gì làm bạn thích? Lần sau nên cải thiện điều gì?',
  anonymous: 'Gửi ẩn danh',
  anonymousHint: 'CLB sẽ không thấy tên bạn. Hệ thống chỉ giữ liên kết nội bộ để chống spam.',
  submit: 'Gửi phản hồi',
  submitting: 'Đang gửi…',
  submitted: 'Cảm ơn bạn — phản hồi đã được gửi.',
  submittedOn: 'Đã gửi lúc {{date}}',
  anonymousTag: 'Ẩn danh',
  closesAt: 'Mở đến {{date}}',
  closed: 'Đã hết hạn gửi phản hồi cho sự kiện này.',
  notAttended: 'Chỉ người đã check-in mới gửi được phản hồi.',
  error: 'Không gửi được phản hồi.',
  loadError: 'Không tải được phản hồi.',
  giveFeedback: 'Gửi phản hồi',
  commentCount: '{{count}} / {{max}}',
} satisfies Messages<typeof en>
