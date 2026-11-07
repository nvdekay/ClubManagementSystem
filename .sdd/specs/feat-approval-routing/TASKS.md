# TASKS: feat-approval-routing

- [x] DBML: bảng `routingRuleSets`; `approvalTasks.routingRuleSetId|routingRuleId|requiredLevel|currentLevel`; `approvalDecisions.level` + index `(approvalTaskId, level)`; ghi chú `ICPDP_HEAD`; sinh lại schema, guard 53 bảng; đổi index cũ lúc khởi động.
- [x] Domain `approval-routing.ts`: chuẩn hoá rule, chồng nhau, khớp, route, mô phỏng, bước quyết định.
- [x] `ICPDP_HEAD`: catalogue, bootstrap, UC03 cấp kèm Officer / thu hồi theo Officer.
- [x] Infra dùng chung `approval-routing.ts` (đóng băng route, kiểm Head, bốn mắt, lên cấp 2) + repository `routingRuleSets`.
- [x] Tích hợp UC08 (nộp, nhận, quyết định), UC26, UC46; DTO task có cấp.
- [x] Usecase + route + OpenAPI UC05; stub `openapi.test.ts`.
- [x] Unit test (rule, route, mô phỏng, bước, quyền D1) + integration (UC46 hai cấp/bốn mắt, UC26 hai cấp, UC08 e2e hai cấp, repository định tuyến).
- [x] Client: `RoutingRulesPage`, `ApprovalLevelBadge` ở ba trang thẩm định, claim cấp 2 cho booking, `ICPDP_HEAD` ở trang tài khoản, i18n en/vi, menu.
- [x] Tài liệu: CURRENT_IMPLEMENTATION, UC_CODE_MAPPING, CODE_DIAGRAM_GAPS, HLD, SRS (D1), README.
- [x] `npm run check` xanh.
