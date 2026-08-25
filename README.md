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

### Bước 1: Khởi động Toàn bộ Hạ tầng & Ứng dụng bằng 1 Lệnh Duy Nhất (Spec 22)
```bash
docker compose up --build
```
*Lệnh trên sẽ tự động dựng và khởi chạy 7 container services (`postgres`, `redis`, `minio`, `minio-init`, `api`, `worker`, `web`), tự động chạy DB Migration, và khởi tạo 3 storage buckets (`mediaflow-source`, `mediaflow-processed`, `mediaflow-delivery`).*

### Bước 2: Khai báo Biến môi trường
```bash
cp .env.example .env
```

### Bước 3: Kiểm tra Hệ thống & Endpoints Khả Dụng (Spec 20 & 22)
- **React Frontend Dashboard**: `http://localhost:5173`
- **NestJS API Server Base**: `http://localhost:3000`
- **Health Liveness Endpoint**: `http://localhost:3000/health/live` (Spec 20.2: Process liveness)
- **Health Readiness Endpoint**: `http://localhost:3000/health/ready` (Spec 20.2: DB, Redis, MinIO readiness status)
- **Prometheus Metrics Text Endpoint**: `http://localhost:3000/metrics` (Spec 20.3: Upload/Run/Queue/Duration metrics)
- **MinIO Local Console**: `http://localhost:9001` (User: `minioadmin` / Pass: `minioadminpassword`)

### Bước 4: Chạy Kiểm thử & Đánh giá Mã nguồn
```bash
pnpm verify:no-rhinoq         # Kiểm tra CI Gate cấm RhinoQ
node evals/scorecards/eval_code_quality.mjs   # Chạy bộ chấm điểm chất lượng AI Scorecard
pnpm test                     # Chạy toàn bộ Vitest Integration & Exception Suites
```

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

## 🎬 8. Hướng dẫn Kịch bản Demo Hệ thống (Spec Section 29)

### Demo 1 — Happy Path (Luồng Xử Lý & Phê Duyệt Chuẩn)
1. Đăng nhập giao diện web bằng tài khoản **Acme Producer** (`producer@acme.local`).
2. Nhập tên và bấm **"Tạo Project"** mới (ví dụ: `Summer Commercial 2026`).
3. Tải video lớn qua đợt upload nhiều part (Multipart Upload).
4. Quan sát tiến độ % và các bước trên thanh **Pipeline Timeline**.
5. Chuyển sang tài khoản **Acme Reviewer** (`reviewer@acme.local`), mở tab **Reviewer Inbox** và bấm **Approve**.
6. Quan sát tiến trình **Publish Delivery** sao chép tệp sang MinIO Delivery Bucket và kiểm chứng chứng cứ.
7. Tải video hoàn tất xuống máy qua URL đã được ký chữ ký điện tử (**Signed Presigned URL**).

### Demo 2 — Worker Crash (Mô phỏng Worker Đột Ngột Bị Ngắt)
1. Trong Failure Lab Drawer, bật kịch bản lỗi **`FL-02` (Worker crash tại 47% khi nén 720p)**.
2. Khởi chạy đợt xử lý video.
3. Quan sát tiến trình Worker gặp sự cố crash ngắt đột ngột và tự động khởi động lại (Restart).
4. Thực thi lệnh CLI kiểm tra: `pnpm mediaflow runs inspect <run-id>`.
5. Quan sát lượt chạy thử lại (Retry) diễn ra mượt mà và **không tạo ra tệp Output trùng lặp**.

### Demo 3 — Publish Bất Định (Publish Response Loss & Operator Reconcile)
1. Trong Failure Lab Drawer, bật kịch bản lỗi **`FL-04` (Mất response sau khi publish)**.
2. Với tư cách Reviewer, bấm **Approve** lượt chạy.
3. Quan sát trạng thái chuyển sang **`needs_attention` / `uncertain`**.
4. Xác nhận tệp delivery thực sự đã được tạo thành công trên MinIO Delivery Bucket.
5. Thực thi lệnh Reconcile qua CLI: `pnpm mediaflow publish reconcile <operation-id> --reason "HEAD verified"` hoặc trên UI.
6. Quan sát trạng thái hoàn tất thành **`confirmed`** mà không hề copy lại tệp lần thứ hai.

### Demo 4 — Isolation (Kiểm Thử Cách Ly Tenant)
1. Sao chép URL/ID một Project thuộc **Acme Studio**.
2. Chuyển tài khoản đăng nhập sang **Beta Producer** (`producer@beta.local`).
3. Mở URL/truy cập ID project đó trên giao diện/API và xác nhận nhận lại phản hồi **`404 Not Found`**.
4. Thử xin presigned URL download asset hoặc kết nối SSE stream để xác nhận sự kiện hoàn toàn bị cách ly.

---

## ⚠️ 9. Các Giới Hạn Đã Biết (Known Limitations - Spec Section 30)

MediaFlow Baseline v1 là một phiên bản Baseline thử nghiệm / kiểm thử kiến trúc (Evaluation Baseline), cần lưu ý các giới hạn sau:

1. **Chỉ là phiên bản Evaluation/Demo Baseline**: Hệ thống không cam kết SLA vận hành sản xuất (No Production SLA).
2. **Single Media Worker Replica**: Thiết lập mặc định chạy đúng một (1) Media Worker với concurrency local = 2.
3. **Chưa có Distributed Global Resource Limit**: Khi mở rộng scale nhiều worker replicas, giới hạn tài nguyên chưa được quản lý toàn cục qua Distributed Semaphore.
4. **Phụ thuộc Multipart Upload Session**: Tính năng tiếp tục tải (Upload Resume) phụ thuộc vào phiên làm việc Multipart trên S3 chưa bị hết hạn (TTL).
5. **Local MinIO Emulator**: MinIO chạy local phục vụ mô phỏng, không đại diện đầy đủ 100% mọi hành vi dịch vụ S3 thương mại (AWS S3, Cloudflare R2, GCP Cloud Storage).
6. **Chưa có Virus Scanning Sandbox**: Hệ thống chưa tích hợp công cụ quét mã độc sandbox chuyên dụng (như ClamAV).
7. **Phụ thuộc Build FFmpeg**: Danh sách Codec/Container hỗ trợ phụ thuộc trực tiếp vào bản build FFmpeg đi kèm container.
8. **Chưa có Quota & Retention Policy Hoàn Chỉnh**: Chưa tích hợp quản lý gói cước billing, giới hạn dung lượng theo Workspace hoặc chính sách tự động dọn dẹp tệp cũ (Retention Policy).
9. **Delivery Bucket là Target Giả Lập**: MinIO Delivery Bucket đóng vai trò điểm bàn giao mục tiêu mô phỏng, chưa phải hạ tầng CDN thực tế.
10. **Operator CLI Dùng Polling API**: CLI Operator hoạt động theo cơ chế Polling API định kỳ, chưa phải hệ thống thông báo sự kiện độ bền cao (Durable Notification System).
11. **Giả Lập Lỗi Môi Trường Local**: Các kịch bản sự cố Failure Lab chạy trong môi trường Docker Local không chứng minh hoàn toàn độ tin cậy trên môi trường phân tán sản xuất (Production Reliability).

---

## 🚫 10. Quy tắc Cấm tuyệt đối (No RhinoQ Policy)

MediaFlow Baseline v1 là một repository độc lập 100%. CI gate sẽ tự động thất bại nếu phát hiện bất kỳ package hoặc import nào liên quan tới RhinoQ (`@rhinoq/*` hoặc `rhinoq`).

Chạy lệnh kiểm tra thủ công:
```bash
node scripts/verify-no-rhinoq.mjs
```
