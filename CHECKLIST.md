# MediaFlow Baseline v1 — Bảng Checklist & Nhật ký Lưu vết Công việc

Tài liệu này dùng để lưu vết toàn bộ tiến độ triển khai dự án **MediaFlow Baseline v1**, các tiêu chí hoàn thành, trạng thái các ticket và nhật ký commit.

---

## 1. Nhật ký Thực thi (Execution Log)

| STT | Ngày thực hiện | Mã Ticket | Nội dung công việc đã hoàn thành | Trạng thái | Commit Reference |
|:---:|:--------------:|:---------:|:----------------------------------|:----------:|:----------------|
| 01  | 2026-08-24     | `MF-000`  | Khởi tạo cấu trúc thư mục AI (4 folders) & Monorepo, thiết lập file rules và script verify-no-rhinoq | 🟢 Đã commit & push | `[2026-08-24] Commit #1: Khoi tao cau truc thu muc AI & Monorepo, tao file system rules va checklist luu vet` (c596340) |
| 02  | 2026-08-24     | `MF-003`  | Khởi tạo Monorepo infra (package.json, pnpm-workspace, tsconfig, Docker Compose PostgreSQL/Redis/MinIO) & NestJS/React Vite stack | 🟢 Đã commit & push | `[2026-08-24] Commit #2: Khoi tao monorepo infrastructure voi NestJS Backend va React Vite Frontend` (c607f06) |
| 03  | 2026-08-24     | `MF-101`  | Triển khai Shared Packages (contracts, domain, database 13 schemas), NestJS Auth & Tenant Isolation Modules, và React Web UI Switcher | 🟢 Đã commit & push | `[2026-08-24] Commit #3: Trien khai Shared Packages, Database Schema, NestJS Auth va Tenant Isolation` (02f8e91) |

---

## 2. Checklist Chi tiết theo Milestone

### Milestone 0: Cấu trúc Thư mục & Quality Gates (M0)
- [x] **`MF-001`**: Tạo cấu trúc thư mục AI (`prompts/`, `data/`, `agents/`, `evals/`) kết hợp với Monorepo (`apps/`, `packages/`, `docker/`, `scripts/`, `test/`).
- [x] **`MF-002`**: Tạo tệp quy tắc hệ thống `RULES.md` & `prompts/system/rules.md` (định nghĩa công nghệ NestJS API + React Vite Web).
- [x] **`MF-005`**: Viết script `scripts/verify-no-rhinoq.mjs` kiểm tra cấm tích hợp RhinoQ.
- [x] **`MF-003`**: Khởi tạo `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`.
- [x] **`MF-004`**: Khởi tạo Docker Compose cho PostgreSQL 16, Redis 7, MinIO.
- [x] **`MF-006`**: Cấu hình NestJS API skeleton (`apps/api`) & React Vite UI skeleton (`apps/web`).

---

### Milestone 1: Auth, Tenant & Project Management (M1)
- [x] **`MF-101`**: Schema `workspaces`, `users`, `media_projects` (và toàn bộ 13 schemas theo đặc tả trong `@mediaflow/database`).
- [x] **`MF-102`**: Endpoints `/api/v1/auth/login`, `/auth/logout`, `/auth/me`, `/auth/seed-users` trong NestJS.
- [x] **`MF-103`**: NestJS `TenantGuard` kiểm tra Role & Tenant isolation (`workspace_id`).
- [x] **`MF-104`**: Project CRUD API trong NestJS (`ProjectsService` & `ProjectsController`).
- [x] **`MF-105`**: Seed users cho 2 workspace (`Acme Studio`, `Beta Studio`).
- [x] **`MF-106`**: Giao diện React Vite cho phép chuyển đổi tài khoản seed kiểm thử Tenant Isolation trực quan.

---

### Milestone 2: Multipart Upload tới MinIO (M2)
- [ ] **`MF-201`**: Schema `upload_sessions` & `upload_parts`.
- [ ] **`MF-202`**: MinIO multipart storage adapter (AWS SDK v3).
- [ ] **`MF-203`**: Endpoints initiate/sign/report/complete/abort upload.
- [ ] **`MF-204`**: Trình upload React hỗ trợ resume qua IndexedDB.
- [ ] **`MF-205`**: Cleanup job định kỳ cho upload session hết hạn.
- [ ] **`MF-206`**: Integration & E2E tests cho upload & resume.

---

### Milestone 3: Queue, Transactional Outbox & Pipeline Core (M3)
- [ ] **`MF-301`**: Schemas `processing_runs`, `processing_steps`, `project_events`, `outbox_events`.
- [ ] **`MF-302`**: Transactional create run + outbox event.
- [ ] **`MF-303`**: Outbox dispatcher với deterministic BullMQ `jobId`.
- [ ] **`MF-304`**: BullMQ worker lifecycle, retry policy & graceful shutdown.
- [ ] **`MF-305`**: Realtime updates via SSE stream & state replay từ DB.
- [ ] **`MF-306`**: Operator inspect skeleton API.

---

### Milestone 4: FFmpeg Media Processing (M4)
- [ ] **`MF-401`**: Safe `ffprobe` JSON output parser adapter.
- [ ] **`MF-402`**: Xử lý tính toán SHA-256 nguồn bất đồng bộ.
- [ ] **`MF-403`**: Trích xuất Thumbnail JPEG.
- [ ] **`MF-404`**: Transcode video 720p H.264/AAC.
- [ ] **`MF-405`**: Conditional transcode 1080p (hoặc source-normalized).
- [ ] **`MF-406`**: Realtime FFmpeg progress parser (`-progress pipe:1`) kèm throttle.
- [ ] **`MF-407`**: Upload kết quả transcode với deterministic object key.
- [ ] **`MF-408`**: Cooperative cancellation (lắng nghe cờ hủy, SIGTERM/SIGKILL).
- [ ] **`MF-409`**: Worker media integration tests.

---

### Milestone 5: Output Verification & Reviewer Approval (M5)
- [ ] **`MF-501`**: Verification engine & schema `verification_results`.
- [ ] **`MF-502`**: Processed output checks (duration, codec, resolution, size, integrity).
- [ ] **`MF-503`**: Reviewer inbox UI & endpoints `/runs/:runId/approve`, `/runs/:runId/reject`.
- [ ] **`MF-504`**: Guards chống double approval / race conditions.
- [ ] **`MF-505`**: Revision flow cho producer tải nguồn mới khi bị từ chối.
- [ ] **`MF-506`**: Verification & approval integration tests.

---

### Milestone 6: Publish & Uncertain Recovery (M6)
- [ ] **`MF-601`**: Schema `publish_operations` lưu vết idempotency key & fingerprint.
- [ ] **`MF-602`**: Deterministic copy publisher từ processed bucket ➔ delivery bucket.
- [ ] **`MF-603`**: Giả lập lỗi mất response (Response-loss simulation).
- [ ] **`MF-604`**: Delivery verification (HEAD destination & metadata match).
- [ ] **`MF-605`**: Operator reconcile endpoint `/publish/:operationId/reconcile`.
- [ ] **`MF-606`**: Publish fault tests.

---

### Milestone 7: Failure Lab, Ops CLI & UI Polish (M7)
- [ ] **`MF-701`**: Demo fault configuration & guards (`MEDIAFLOW_DEMO_MODE=true`).
- [ ] **`MF-702`**: UI controls cho kịch bản FL-01 đến FL-05.
- [ ] **`MF-703`**: Outage runbook cho FL-06 (MinIO/Redis stop/start).
- [ ] **`MF-704`**: CLI operator (`apps/ops`) cho các lệnh list/inspect/retry/reconcile/watch.
- [ ] **`MF-705`**: Giao diện Attention UI & hướng dẫn Safe Next Action.
- [ ] **`MF-706`**: Polish giao diện, accessibility & tự động làm mới khi mất mạng.
- [ ] **`MF-707`**: Toàn bộ E2E & Fault test suite.

---

### Milestone 8: Baseline Freeze & Documentation (M8)
- [ ] **`MF-801`**: README quickstart & kiến trúc tổng quan.
- [ ] **`MF-802`**: Tài liệu bảo mật & giới hạn hệ thống (Known Limitations).
- [ ] **`MF-803`**: Demo script & công cụ sinh video mẫu (fixture generator).
- [ ] **`MF-804`**: Kiểm thử Clean-room verification trên môi trường mới.
- [ ] **`MF-805`**: Audit license & dependency.
- [ ] **`MF-806`**: Tạo Git Tag `mediaflow-baseline-v1`.

---

## 3. Quy trình Lưu vết Cập nhật (Workflow Standard)

Khi tiếp tục hoặc làm lại công việc:
1. Tra cứu **Checklist Chi tiết** để biết các hạng mục đã xong (có dấu `[x]`) và chưa xong (`[ ]`).
2. Cập nhật bảng **Execution Log** mỗi khi hoàn thành thêm một bước mới.
3. Nhận **xác nhận của USER** trước khi ghi thông tin commit.
4. Chạy `node scripts/verify-no-rhinoq.mjs` trước mỗi commit để đảm bảo tuân thủ quy tắc.
