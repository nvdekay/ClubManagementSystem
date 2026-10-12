# TASKS: feat-candidate-evaluation

- [x] Đối chiếu UC18/UC19/UC20, rubric của đợt tuyển và collection `candidateEvaluations` có sẵn (không đổi schema).
- [x] Domain `candidate-evaluation.ts`: port, kiểm tra điểm theo rubric/E1, quy tắc `Shortlisted`, tổng hợp mean/min/max/stdDev.
- [x] Usecase `candidate-evaluation.ts`: xem theo đợt tuyển và ghi bản đánh giá của chính người gọi, quyền `club.application.review`.
- [x] Route `candidate-evaluation-routes.ts` + `openapi.ts` + nối dây `server.ts`/`main.ts`.
- [x] Repository Mongo `mongo-candidate-evaluation-repository.ts` (upsert trong transaction, kiểm tra lại `Shortlisted`).
- [x] Unit test cho AC1–AC7, cập nhật `openapi.test.ts` (AC8); integration test cho repository.
- [x] Client: service + hook (`useCandidateEvaluations`, `useSaveCandidateEvaluation`), `CandidateEvaluationPanel`, điểm tổng hợp trong danh sách sàng lọc, i18n en/vi.
- [x] Seed demo: một đơn HEBE `Shortlisted` với hai bản đánh giá.
- [x] `npm run check` xanh.

- [x] Sửa race với quyết định/huỷ campaign: ghi `__v` có sẵn của application và campaign trong transaction; integration test reviewer đồng thời và huỷ sau khi đọc target.
- [x] Kiểm tra sau sửa Wave 1: `npm run check` xanh, 61 test files / 259 tests, gồm integration Mongo (2026-10-10).
