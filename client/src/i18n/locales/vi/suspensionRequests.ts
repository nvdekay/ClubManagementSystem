import type { Messages } from '../../messages'
import type { suspensionRequests as en } from '../en/suspensionRequests'

export const suspensionRequests = {
  title: 'Yêu cầu tạm ngừng',
  description:
    'Gửi yêu cầu tạm ngừng kèm kế hoạch phục hồi. CLB chỉ tạm ngừng khi ICPDP phê duyệt.',
  reviewDescription:
    'Xem yêu cầu tạm ngừng của các CLB và ảnh hưởng tới lịch, rồi phê duyệt hoặc từ chối kèm lý do.',
  denied: 'Chức năng này yêu cầu Club Leader hoặc Cán bộ ICPDP.',
  reason: 'Lý do',
  until: 'Ngày dự kiến kết thúc',
  obligations: 'Phương án xử lý nghĩa vụ tồn đọng',
  recovery: 'Kế hoạch phục hồi',
  impact: 'Các sự kiện và booking tương lai này sẽ bị huỷ nếu được duyệt',
  acknowledge: 'Tôi xác nhận các tác động huỷ đã liệt kê',
  submit: 'Nộp yêu cầu',
  approve: 'Duyệt và tạm ngừng',
  reject: 'Từ chối',
  decision: 'Lý do quyết định',
  retry: 'Thử lại',
  empty: 'Chưa có yêu cầu tạm ngừng.',
  previousPage: 'Trang trước',
  nextPage: 'Trang sau',
  pageNumber: 'Trang {{page}}',
  pagination: 'Phân trang yêu cầu tạm ngừng',
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Đã từ chối',
  acknowledgeRequired: 'Vui lòng xác nhận các tác động huỷ trước khi nộp.',
} satisfies Messages<typeof en>
