const en = {
  queueTitle: "Leadership transitions", queueDescription: "Confirm the next board without losing obligations or history.",
  openCount: "{{count}} open", waitingSince: "Submitted {{date}}", open: "Review transition",
  empty: "No transitions are waiting", emptyHint: "Plans submitted by club leaders will appear here.",
  loadError: "Could not load leadership transitions.", retry: "Retry", signIn: "Sign in to continue.",
  unauthorized: "Only ICPDP Officers can review leadership transitions.", detailBack: "Back to transition queue",
  pending: "Pending confirmation", confirmed: "Confirmed", returned: "Returned",
  suspendedTitle: "Transition held", suspended: "This club is Suspended. Approval remains blocked until it is reactivated.",
  terms: "Term handover", fromTerm: "Outgoing term", toTerm: "Incoming term", candidates: "Incoming board",
  obligations: "Outstanding obligations", noObligations: "No outstanding obligations were included.",
  followUp: "Continue tracking after approval", handover: "Handover checklist", noHandover: "No checklist items.",
  roleChanges: "Proposed board structure", permissions: "Permissions", claim: "Claim task", claiming: "Claiming…",
  claimedByOther: "Another officer has claimed this task.", decisionTitle: "Decision", approve: "Approve transition",
  return: "Return for revision", reason: "Decision note", returnReason: "A reason is required when returning the plan.",
  confirmPrompt: "Submit this final transition decision?", deciding: "Saving decision…", submitDecision: "Submit decision",
  success: "Transition decision saved.", history: "Decision history", conditional: "{{count}} follow-up obligations",
  readOnly: "This transition has already been decided.", outcomeApprove: "Approved", outcomeReturn: "Returned for revision",
};

const vi: Record<keyof typeof en, string> = {
  queueTitle: "Chuyển giao nhiệm kỳ", queueDescription: "Xác nhận ban mới mà không làm mất nghĩa vụ và lịch sử.",
  openCount: "{{count}} đang chờ", waitingSince: "Nộp lúc {{date}}", open: "Thẩm định chuyển giao",
  empty: "Không có chuyển giao đang chờ", emptyHint: "Kế hoạch do Chủ nhiệm CLB nộp sẽ xuất hiện tại đây.",
  loadError: "Không thể tải danh sách chuyển giao.", retry: "Thử lại", signIn: "Đăng nhập để tiếp tục.",
  unauthorized: "Chỉ ICPDP Officer được thẩm định chuyển giao nhiệm kỳ.", detailBack: "Về hàng đợi chuyển giao",
  pending: "Chờ xác nhận", confirmed: "Đã xác nhận", returned: "Đã trả lại",
  suspendedTitle: "Chuyển giao đang bị giữ", suspended: "CLB đang Suspended. Không thể phê duyệt cho tới khi CLB được kích hoạt lại.",
  terms: "Bàn giao nhiệm kỳ", fromTerm: "Nhiệm kỳ mãn nhiệm", toTerm: "Nhiệm kỳ kế tiếp", candidates: "Ban điều hành mới",
  obligations: "Nghĩa vụ còn tồn đọng", noObligations: "Kế hoạch không có nghĩa vụ tồn đọng.",
  followUp: "Tiếp tục theo dõi sau khi duyệt", handover: "Danh mục bàn giao", noHandover: "Không có mục bàn giao.",
  roleChanges: "Cơ cấu ban điều hành đề xuất", permissions: "Quyền", claim: "Nhận xử lý", claiming: "Đang nhận…",
  claimedByOther: "Officer khác đã nhận tác vụ này.", decisionTitle: "Quyết định", approve: "Phê duyệt chuyển giao",
  return: "Trả lại để chỉnh sửa", reason: "Ghi chú quyết định", returnReason: "Phải nhập lý do khi trả lại kế hoạch.",
  confirmPrompt: "Gửi quyết định chuyển giao cuối cùng?", deciding: "Đang lưu quyết định…", submitDecision: "Gửi quyết định",
  success: "Đã lưu quyết định chuyển giao.", history: "Lịch sử quyết định", conditional: "{{count}} nghĩa vụ cần theo dõi",
  readOnly: "Chuyển giao này đã có quyết định.", outcomeApprove: "Đã phê duyệt", outcomeReturn: "Trả lại chỉnh sửa",
};

export const leadershipTransitions = { en, vi };
