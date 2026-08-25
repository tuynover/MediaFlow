# 🎬 MediaFlow Baseline v1

> **Cổng xử lý và phê duyệt video bất đồng bộ cho Agency, Editor và Marketing**  
> **Phiên bản:** `mediaflow-baseline-v1`  
> **Repository:** `https://github.com/tuynover/MediaFlow.git`

---

## 📌 1. Tổng quan Kiến trúc (Architecture Overview)

MediaFlow Baseline v1 là một hệ thống độc lập xử lý video lớn bất đồng bộ được xây dựng theo kiến trúc Monorepo:

```text
┌──────────────────── Browser / React (Vite) ────────────────┐
│ Dashboard UI, Multipart Uploader (Presigned URLs), SSE Timeline │
└──────────────┬──────────────────────────┬──────────────────┘
               │ JSON/SSE                 │ Direct part PUT
               ▼                          ▼
┌──────────────── NestJS API Server ──┐  ┌────── MinIO S3 Storage ─────┐
│ Auth, Tenant Scope, Projects API    │  │ mediaflow-source Bucket    │
│ Upload Signing, Commands, Realtime  │  │ mediaflow-processed Bucket │
└──────────────┬───────────┬──────────┘  │ mediaflow-delivery Bucket  │
               │           │            └─────────▲──────────────────┘
               ▼           ▼                      │
        ┌ PostgreSQL 16 ┐┌ Redis 7 / BullMQ ┐     │
        │ App State     ││ Queue Transport  │     │
        │ Outbox Events │└─────────┬────────┘     │
        │ Project Events│          ▼              │
        └───────────────┘┌── Media Worker ────────┘
                         │ ffprobe, FFmpeg, Verify
                         └─────────────────────────
```

### Tech Stack Chuẩn:
- **Backend API (`apps/api`)**: NestJS (TypeScript) tích hợp Auth, Tenant Isolation Guard, và Realtime SSE.
- **Frontend Web (`apps/web`)**: React 18 + Vite + TypeScript + Tailwind CSS (hỗ trợ Tenant Switcher trực quan).
- **Media Worker (`apps/worker`)**: Node.js + `ffprobe` / `FFmpeg` binary (argument array `shell: false`).
- **Shared Packages (`packages/`)**: `@mediaflow/contracts`, `@mediaflow/domain`, `@mediaflow/database` (13 Drizzle schemas), `@mediaflow/object-storage`, `@mediaflow/queue`, `@mediaflow/media`.
- **Infrastructure**: PostgreSQL 16, Redis 7, MinIO Object Storage (Docker Compose).

---

## ⚡ 2. Hướng dẫn Khởi chạy Nhanh (Quickstart)

### Yêu cầu môi trường:
- Node.js >= 22.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose

### Bước 1: Khởi động Hạ tầng Docker Services
```bash
docker compose up -d
```
*Lệnh trên sẽ tự động khởi tạo PostgreSQL (port 5432), Redis (port 6379), MinIO API (port 9000), MinIO Console (port 9001), và tạo 3 storage buckets (`mediaflow-source`, `mediaflow-processed`, `mediaflow-delivery`).*

### Bước 2: Khai báo Biến môi trường
```bash
cp .env.example .env
```

### Bước 3: Chạy Kiểm thử & Đánh giá Mã nguồn
```bash
pnpm verify:no-rhinoq         # Kiểm tra CI Gate cấm RhinoQ
node evals/scorecards/eval_code_quality.mjs   # Chạy bộ chấm điểm chất lượng AI Scorecard
pnpm test                     # Chạy toàn bộ 33 Unit & Integration Tests
```

### Bước 4: Khởi chạy Ứng dụng ở Môi trường Dev
```bash
pnpm dev
```
- **React Frontend**: http://localhost:5173
- **NestJS API Server**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (User: `minioadmin` / Pass: `minioadminpassword`)

---

## 🔒 3. Tài khoản Seed Kiểm thử cách ly Tenant (Seed Users)

Dự án cung cấp sẵn tài khoản seed cho 2 Workspace độc lập để kiểm thử tính năng **Tenant Isolation**:

### Workspace 1: Acme Studio (ID: `a0000000-0000-7000-a000-000000000001`)
- Producer: `producer@acme.local`
- Reviewer: `reviewer@acme.local`
- Operator: `operator@acme.local`

### Workspace 2: Beta Studio (ID: `b0000000-0000-7000-b000-000000000002`)
- Producer: `producer@beta.local`
- Reviewer: `reviewer@beta.local`
- Operator: `operator@beta.local`

---

## 🛠️ 4. Operator CLI Commands

CLI `mediaflow` trong `apps/ops` cung cấp các công cụ quản trị:

```bash
# Danh sách project theo status
pnpm mediaflow projects list --status processing

# Danh sách runs cần can thiệp (Attention runs)
pnpm mediaflow runs list --attention

# Kiểm tra chi tiết 1 run
pnpm mediaflow runs inspect <run-id>

# Cho phép retry run bị lỗi với lý do
pnpm mediaflow runs retry <run-id> --reason "Transient storage outage resolved"

# Đối soát trạng thái publish bất định bằng bằng chứng HEAD
pnpm mediaflow publish reconcile <operation-id> --reason "HEAD destination key verified object exists"

# Lắng nghe dòng sự kiện
pnpm mediaflow watch --severity warning
```

---

## ⚙️ 6. Giới hạn Concurrency Baseline & Khuyến cáo Scaling (Spec 12.7)

Hệ thống MediaFlow Baseline v1 được thiết kế với giới hạn tài nguyên có chủ đích:

- **Single Worker Replica Baseline**: Trong môi trường Docker Compose Baseline (`docker/compose.yaml`), hệ thống chạy **đúng một (1) Media Worker Replica** với cấu hình **BullMQ Worker Concurrency: 2**.
- **Giới hạn Tối đa 2 Pipeline Song Song**: Đảm bảo tại một thời điểm tối đa chỉ có 2 pipeline transcode video chạy đồng thời để tối ưu hóa tài nguyên phần cứng local.
- **Scaling Disclaimers & Không Có Distributed Semaphore**:
  - Khi scale mở rộng sang nhiều worker replicas, giới hạn concurrency = 2 **sẽ không còn mang tính toàn cục (not global)** do v1 không xây dựng cơ chế Distributed Resource Semaphore qua Redis/Consul.
  - **Tuyên bố Giới hạn V1**: Không quảng bá hay cam kết khả năng tự động Scale Ngang (Horizontal Scaling) cho Media Worker trong phiên bản V1 này.

---

## 💥 7. MinIO / Redis Outage Manual Runbook (Spec 15.1 FL-06)

Theo Spec Section 15.1 FL-06, UI tuyệt đối **không được cấp quyền ngắt các container Docker trực tiếp**. Kỹ sư vận hành (Operator) thực thi mô phỏng sự cố dừng hạ tầng MinIO hoặc Redis qua các lệnh Docker Compose tiêu chuẩn:

```bash
# Mô phỏng sự cố gián đoạn kết nối MinIO Storage Outage:
docker compose stop minio
docker compose start minio

# Mô phỏng sự cố gián đoạn kết nối Redis Outage:
docker compose stop redis
docker compose start redis
```

- **Phân loại Lỗi**: Hệ thống tự động phân loại sự cố gián đoạn hạ tầng sang nhóm lỗi có thể thử lại `StorageTimeoutError` (`retryable: true`) và tuyệt đối **không báo cáo thành công giả (No Fake Success)**.

---

## 🚫 8. Quy tắc Cấm tuyệt đối (No RhinoQ Policy)

MediaFlow Baseline v1 là một repository độc lập 100%. CI gate sẽ tự động thất bại nếu phát hiện bất kỳ package hoặc import nào liên quan tới RhinoQ (`@rhinoq/*` hoặc `rhinoq`).

Chạy lệnh kiểm tra thủ công:
```bash
node scripts/verify-no-rhinoq.mjs
```
