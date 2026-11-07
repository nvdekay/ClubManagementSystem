const en = {
  title: "Approval routing", description: "Decide which requests need a second approval by the ICPDP head. Requests that match no rule are decided at one level.",
  readOnly: "Only the ICPDP head can change routing rules.", active: "Active rules (version {{version}})", noActive: "No active rules: every request is decided at one level.",
  draft: "Draft (version {{version}})", newDraft: "New draft from the active rules", addRule: "Add rule", removeRule: "Remove",
  saveDraft: "Save draft", activate: "Activate", activateConfirm: "Activate this version? Only new requests use it.",
  saved: "Saved.", activated: "Activated.", noRules: "No rules.", history: "Earlier versions",
  requestType: "Request", type_CLUB_APPLICATION: "Club founding (UC08)", type_EVENT_PROPOSAL: "Event proposal (UC26)",
  type_PROPERTY_BOOKING: "Facility request (UC46)", ruleId: "Rule code", minAmount: "Budget from (VND)", maxAmount: "Budget below (VND)",
  risks: "Event risk", risk_LOW: "Low", risk_MEDIUM: "Medium", risk_HIGH: "High", propertyTypes: "Facility type",
  property_HALL: "Hall", property_OUTDOOR: "Outdoor", property_STAGE: "Stage", property_EQUIPMENT: "Equipment",
  minViolations: "Open cases from", maxViolations: "Open cases below", level: "Approval levels", level_1: "One level", level_2: "Two levels (head)",
  sla: "SLA (hours)", anyValue: "Any", simulate: "Simulate on recent decisions", simulationTitle: "{{second}} of {{total}} recent requests would need a second level",
  simulationEmpty: "No decided requests yet.",
  levelBadge: "Level {{current}} of {{total}}", levelOneHint: "An approval here moves it to the ICPDP head.",
  levelTwoHint: "Only the ICPDP head can take and decide this level.", loadError: "Could not load routing rules.", retry: "Retry",
};

const vi: Record<keyof typeof en, string> = {
  title: "Định tuyến phê duyệt", description: "Quyết định hồ sơ nào cần Trưởng ICPDP duyệt cấp hai. Hồ sơ không khớp rule nào được quyết định ở một cấp.",
  readOnly: "Chỉ Trưởng ICPDP được sửa rule định tuyến.", active: "Rule đang áp dụng (phiên bản {{version}})",
  noActive: "Chưa có rule nào: mọi hồ sơ được quyết định ở một cấp.", draft: "Bản nháp (phiên bản {{version}})",
  newDraft: "Tạo bản nháp từ rule đang áp dụng", addRule: "Thêm rule", removeRule: "Xoá", saveDraft: "Lưu nháp", activate: "Kích hoạt",
  activateConfirm: "Kích hoạt phiên bản này? Chỉ hồ sơ mới áp dụng.", saved: "Đã lưu.", activated: "Đã kích hoạt.", noRules: "Chưa có rule.",
  history: "Các phiên bản trước", requestType: "Loại hồ sơ", type_CLUB_APPLICATION: "Thành lập CLB (UC08)",
  type_EVENT_PROPOSAL: "Đề xuất sự kiện (UC26)", type_PROPERTY_BOOKING: "Yêu cầu cơ sở vật chất (UC46)", ruleId: "Mã rule",
  minAmount: "Ngân sách từ (VND)", maxAmount: "Ngân sách dưới (VND)", risks: "Mức rủi ro", risk_LOW: "Thấp", risk_MEDIUM: "Trung bình",
  risk_HIGH: "Cao", propertyTypes: "Loại cơ sở vật chất", property_HALL: "Hội trường", property_OUTDOOR: "Ngoài trời",
  property_STAGE: "Sân khấu", property_EQUIPMENT: "Thiết bị", minViolations: "Hồ sơ vi phạm mở từ", maxViolations: "Hồ sơ vi phạm mở dưới",
  level: "Số cấp duyệt", level_1: "Một cấp", level_2: "Hai cấp (Trưởng ICPDP)", sla: "SLA (giờ)", anyValue: "Bất kỳ",
  simulate: "Mô phỏng trên các hồ sơ đã quyết định", simulationTitle: "{{second}}/{{total}} hồ sơ gần đây sẽ cần cấp hai",
  simulationEmpty: "Chưa có hồ sơ nào đã quyết định.",
  levelBadge: "Cấp {{current}}/{{total}}", levelOneHint: "Duyệt ở đây sẽ chuyển hồ sơ lên Trưởng ICPDP.",
  levelTwoHint: "Chỉ Trưởng ICPDP được nhận và quyết định cấp này.", loadError: "Không tải được rule định tuyến.", retry: "Thử lại",
};

export const routing = { en, vi };
