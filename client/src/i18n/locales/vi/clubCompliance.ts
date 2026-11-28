import type { Messages } from '../../messages'
import type { clubCompliance as en } from '../en/clubCompliance'

export const clubCompliance = {
  violations: 'Tuân thủ và giải trình',
  evaluations: 'Kết quả đánh giá đã công bố',
  denied: 'Chức năng này yêu cầu quyền Club Leader.',
  empty: 'Chưa có hồ sơ được công bố.',
  response: 'Nội dung giải trình',
  submit: 'Nộp giải trình',
  note: 'Nội dung đã thực hiện',
  urls: 'URL minh chứng (mỗi dòng một URL)',
  submitAction: 'Nộp để kiểm chứng',
  awaiting: 'Chờ ICPDP kiểm chứng',
  verified: 'ICPDP đã xác nhận đạt',
  failed: 'ICPDP xác nhận chưa đạt',
  score: 'Tổng điểm',
  version: 'Bản sửa',
  history: 'Lịch sử đã công bố',
  sources: 'Nguồn tính điểm',
  missing: 'Chưa đủ dữ liệu',
  due: 'Hạn',
  request: 'Yêu cầu ICPDP',
} satisfies Messages<typeof en>
