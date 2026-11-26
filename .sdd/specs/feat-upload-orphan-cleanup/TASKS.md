# TASKS: feat-upload-orphan-cleanup

| Công việc | Người phụ trách | Trạng thái |
|-----------|-----------------|------------|
| Usecase: xoá asset khi lưu mẫu đề xuất / thêm tài liệu hồ sơ lỗi | — | xong |
| Schema: bảng `uploadedAssets` trong DBML + sinh lại schema | — | xong |
| Domain: port `remove` cho kho ảnh minh chứng + port `UploadedEvidenceRepository` | — | xong |
| Infra: `remove` trên Cloudinary + `mongo-uploaded-evidence-repository.ts` | — | xong |
| Usecase: theo dõi upload ảnh minh chứng + `cleanupOrphanedEvidence` | — | xong |
| Job: `evidence-cleanup-job.ts` mỗi 24 giờ, nối ở `main.ts` | — | xong |
| Test: unit (storage giả) + integration (truy vấn tham chiếu) | — | xong |
