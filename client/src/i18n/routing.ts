const en = {
  title: "Approval routing", description: "Set the review SLA for requests that match a rule. Every request is decided at one level by an ICPDP officer.",
  readOnly: "Only the ICPDP head can change routing rules.", active: "Active rules (version {{version}})", noActive: "No active rules: requests get no rule SLA.",
  draft: "Draft (version {{version}})", newDraft: "New draft from the active rules", addRule: "Add rule", removeRule: "Remove",
  saveDraft: "Save draft", activate: "Activate", activateConfirm: "Activate this version? Only new requests use it.",
  saved: "Saved.", activated: "Activated.", noRules: "No rules.", history: "Earlier versions",
  requestType: "Request", type_CLUB_APPLICATION: "Club founding (UC08)", type_EVENT_PROPOSAL: "Event proposal (UC26)",
  type_PROPERTY_BOOKING: "Facility request (UC46)", ruleId: "Rule code", minAmount: "Budget from (VND)", maxAmount: "Budget below (VND)",
  risks: "Event risk", risk_LOW: "Low", risk_MEDIUM: "Medium", risk_HIGH: "High", propertyTypes: "Facility type",
  property_HALL: "Hall", property_OUTDOOR: "Outdoor", property_STAGE: "Stage", property_EQUIPMENT: "Equipment",
  minViolations: "Open cases from", maxViolations: "Open cases below",
  sla: "SLA (hours)", anyValue: "Any", simulate: "Simulate on recent decisions", simulationTitle: "{{matched}} of {{total}} recent requests would match a rule",
  simulationEmpty: "No decided requests yet.",
  loadError: "Could not load routing rules.", retry: "Retry",
};

const vi: Record<keyof typeof en, string> = {
  title: "Định tuyến phê duyệt", description: "Đặt SLA thẩm định cho hồ sơ khớp rule. Mọi hồ sơ đều do một cán bộ ICPDP quyết định ở một cấp.",
  readOnly: "Chỉ Trưởng ICPDP được sửa rule định tuyến.", active: "Rule đang áp dụng (phiên bản {{version}})",
  noActive: "Chưa có rule nào: hồ sơ không có SLA theo rule.", draft: "Bản nháp (phiên bản {{version}})",
  newDraft: "Tạo bản nháp từ rule đang áp dụng", addRule: "Thêm rule", removeRule: "Xoá", saveDraft: "Lưu nháp", activate: "Kích hoạt",
  activateConfirm: "Kích hoạt phiên bản này? Chỉ hồ sơ mới áp dụng.", saved: "Đã lưu.", activated: "Đã kích hoạt.", noRules: "Chưa có rule.",
  history: "Các phiên bản trước", requestType: "Loại hồ sơ", type_CLUB_APPLICATION: "Thành lập CLB (UC08)",
  type_EVENT_PROPOSAL: "Đề xuất sự kiện (UC26)", type_PROPERTY_BOOKING: "Yêu cầu cơ sở vật chất (UC46)", ruleId: "Mã rule",
  minAmount: "Ngân sách từ (VND)", maxAmount: "Ngân sách dưới (VND)", risks: "Mức rủi ro", risk_LOW: "Thấp", risk_MEDIUM: "Trung bình",
  risk_HIGH: "Cao", propertyTypes: "Loại cơ sở vật chất", property_HALL: "Hội trường", property_OUTDOOR: "Ngoài trời",
  property_STAGE: "Sân khấu", property_EQUIPMENT: "Thiết bị", minViolations: "Hồ sơ vi phạm mở từ", maxViolations: "Hồ sơ vi phạm mở dưới",
  sla: "SLA (giờ)", anyValue: "Bất kỳ",
  simulate: "Mô phỏng trên các hồ sơ đã quyết định", simulationTitle: "{{matched}}/{{total}} hồ sơ gần đây khớp một rule",
  simulationEmpty: "Chưa có hồ sơ nào đã quyết định.",
  loadError: "Không tải được rule định tuyến.", retry: "Thử lại",
};

export const routing = { en, vi };
