# MediaFlow Baseline v1 — Đặc tả triển khai dành cho thực tập sinh

> Trạng thái: sẵn sàng giao việc  
> Đối tượng: thực tập sinh Full-stack/Backend có người review  
> Mục tiêu repository: một repository độc lập tên `MediaFlow`  
> Cập nhật gần nhất: 2026-08-24  
> Quy tắc quan trọng nhất: **giai đoạn này tuyệt đối không tích hợp RhinoQ**

---

## 1. Cách sử dụng tài liệu này

Tài liệu này là nguồn yêu cầu chính cho MediaFlow Baseline v1. Thực tập sinh
phải đọc toàn bộ trước khi viết code và triển khai các milestone theo đúng thứ
tự. Nếu một yêu cầu chưa rõ, phải ghi câu hỏi vào pull request; không tự đoán
business rule có thể làm thay đổi dữ liệu, quyền truy cập hoặc hành vi retry.

Mỗi pull request phải nêu:

1. ticket/milestone đang giải quyết;
2. hành vi đã hoàn thành;
3. test đã chạy và kết quả;
4. test chưa chạy cùng lý do;
5. migration hoặc biến môi trường mới;
6. rủi ro và việc còn lại.

Không được đánh dấu xong chỉ vì UI đã hiển thị. Một luồng chỉ hoàn thành khi API,
database, worker, lỗi, quyền truy cập và test tương ứng đều đã được xử lý.

---

## 2. Ràng buộc không được thương lượng

### 2.1. Không sử dụng RhinoQ

Trong toàn bộ baseline:

- không cài package có tên `rhinoq` hoặc `@rhinoq/*`;
- không gọi RhinoQ CLI, Gateway hoặc database function;
- không copy source, migration, schema, UI hay contract từ repository RhinoQ;
- không dùng Task Center, Workbench hoặc runtime của RhinoQ;
- không tạo adapter giả mang interface giống RhinoQ để chuẩn bị tích hợp sẵn;
- không đặt entity theo thuật ngữ riêng của RhinoQ nếu sản phẩm không cần;
- không nhắc đến RhinoQ trong giao diện hoặc README của MediaFlow;
- không thêm RhinoQ dưới dạng dependency tùy chọn hoặc dependency phát triển.

CI phải có một gate tìm dependency/import bị cấm:

```bash
rg -n -i "(@rhinoq/|from ['\"]rhinoq|require\(['\"]rhinoq)" \
  package.json pnpm-lock.yaml apps packages
```

Gate phải thất bại nếu tìm thấy kết quả ngoài chính script kiểm tra.

### 2.2. Baseline phải công bằng

- Sử dụng BullMQ đúng khả năng công khai của nó: job ID, attempts, backoff,
  progress, concurrency và graceful shutdown.
- Không cố tình bỏ retry, idempotency, validation hoặc error handling chỉ để
  phiên bản tích hợp về sau trông tốt hơn.
- Không tự xây một workflow engine tổng quát. Chỉ viết orchestration tối thiểu
  mà chính MediaFlow cần.
- Không đưa ra claim throughput, latency, độ bền hoặc khả năng production nếu
  chưa có script và kết quả đo tái lập.
- Mọi giới hạn của baseline phải được ghi thẳng trong README.

### 2.3. Repository độc lập

MediaFlow phải sống trong repository riêng, dự kiến:

```text
C:\Users\Thu Ha\Desktop\rhinoq\MediaFlow
```

Không đặt source MediaFlow bên trong `examples/`, `demo/` hoặc `packages/` của
repository RhinoQ. Tài liệu hiện tại chỉ là bản giao việc tạm thời.

---

## 3. Bài toán sản phẩm

Agency, editor và đội marketing thường nhận video gốc dung lượng lớn, sau đó
phải kiểm tra, chuyển mã, tạo thumbnail, gửi bản xem trước, chờ duyệt và bàn giao
output. Quá trình này có thể kéo dài, bị mất kết nối hoặc bị gián đoạn bởi worker
restart. Người gửi cần biết video đang ở bước nào mà không phải hỏi kỹ thuật.

MediaFlow Baseline v1 cung cấp một cổng nhỏ để:

1. tải video lớn trực tiếp lên object storage;
2. xử lý video bất đồng bộ bằng FFmpeg;
3. xem tiến độ và lịch sử xử lý;
4. duyệt hoặc từ chối output;
5. publish output đã duyệt sang vùng bàn giao;
6. phát hiện output không đạt yêu cầu;
7. tái hiện lỗi có kiểm soát để đánh giá hệ thống.

### 3.1. Người dùng mục tiêu

- **Producer:** tạo project, tải video và theo dõi tiến độ.
- **Reviewer:** xem output, duyệt hoặc từ chối.
- **Operator:** điều tra run lỗi, retry hoặc đối soát publish bất định.

Một user có thể có nhiều role trong workspace. Baseline chỉ cần user seed sẵn;
không cần signup, quên mật khẩu, OAuth hoặc billing.

### 3.2. Giá trị phải nhìn thấy được

Người dùng phải trả lời được các câu hỏi sau chỉ từ trang chi tiết project:

- video đã upload được bao nhiêu phần trăm;
- pipeline đang ở bước nào;
- bước nào đã chạy, chạy bao lâu và lỗi vì sao;
- output nào đã được tạo;
- ai đã duyệt hoặc từ chối;
- publish đã được xác nhận, thất bại hay chưa xác định;
- kiểm chứng output đã pass hay fail;
- hành động an toàn tiếp theo là gì.

---

## 4. Phạm vi v1

### 4.1. Bắt buộc có

- đăng nhập bằng tài khoản seed;
- cô lập dữ liệu theo workspace;
- tạo và đổi tên media project;
- multipart upload trực tiếp từ browser tới MinIO;
- tiếp tục upload sau refresh hoặc mất mạng;
- hủy upload và cleanup multipart session;
- kiểm tra loại file bằng `ffprobe`, không chỉ tin MIME từ browser;
- trích xuất duration, codec, resolution, frame rate và kích thước;
- tạo thumbnail JPEG;
- tạo video MP4 H.264/AAC 720p;
- tạo video MP4 H.264/AAC 1080p khi nguồn đủ độ phân giải;
- cập nhật progress gần realtime;
- retry có backoff cho lỗi tạm thời;
- hủy xử lý theo cơ chế cooperative cancellation;
- giới hạn tối đa hai pipeline transcode đồng thời trong cấu hình baseline;
- duyệt hoặc từ chối output;
- publish output đã duyệt vào delivery bucket;
- đối soát publish nếu kết quả không xác định;
- kiểm chứng metadata và checksum của output;
- lịch sử event dạng append-only;
- CLI operator tối thiểu để list/inspect/retry/reconcile;
- Failure Lab chỉ bật trong môi trường demo;
- test unit, integration, end-to-end và fault theo ma trận bên dưới;
- Docker Compose và dữ liệu seed để chạy local.

### 4.2. Không làm trong v1

- social feed, comment, follower hoặc chức năng mạng xã hội;
- tích hợp TikTok, YouTube, Vimeo hay nền tảng nội dung thật;
- cổng thanh toán hoặc subscription;
- AI moderation, speech-to-text hoặc tạo phụ đề thật;
- chỉnh sửa video trên timeline;
- livestream;
- upload từ URL bên ngoài;
- native mobile app;
- multi-region, Kubernetes hoặc autoscaling;
- SSO, OAuth, MFA hoặc quy trình mời thành viên;
- xóa cứng dữ liệu từ giao diện;
- publish ra CDN công cộng thật;
- SLA hoặc claim production-ready.

---

## 5. Luồng người dùng chuẩn

### 5.1. Happy path

```text
Đăng nhập
  → tạo project
  → chọn video
  → browser multipart upload thẳng lên MinIO
  → hoàn tất upload
  → API tạo processing run và enqueue qua outbox
  → worker probe nguồn
  → worker tạo thumbnail
  → worker transcode 720p
  → worker transcode 1080p nếu phù hợp
  → worker verify outputs
  → project chuyển sang chờ duyệt
  → reviewer duyệt
  → publish job copy output sang delivery bucket
  → worker xác minh object đích
  → project hoàn tất
```

### 5.2. Video nguồn dưới 1080p

- Không upscale mặc định.
- Bước 1080p chuyển sang `skipped` với reason `source_resolution_too_low`.
- 720p vẫn được tạo nếu nguồn cao hơn 720p.
- Nếu nguồn thấp hơn hoặc bằng 720p, tạo một bản normalized MP4 giữ kích thước
  hợp lý và đặt profile là `source-normalized`, không giả nhãn 720p.

### 5.3. Reviewer từ chối

- Reviewer bắt buộc nhập lý do từ 10 đến 1.000 ký tự.
- Run chuyển sang `rejected`; project chuyển sang `needs_changes`.
- V1 không có trình chỉnh sửa. Producer có thể upload một source mới và tạo run
  mới. Run cũ và asset cũ vẫn giữ để audit.

### 5.4. Hủy xử lý

- API chỉ ghi `cancel_requested_at`, actor và reason.
- Worker kiểm tra yêu cầu hủy tối thiểu mỗi giây khi FFmpeg đang chạy.
- Worker gửi `SIGTERM`, chờ tối đa 10 giây rồi mới `SIGKILL` nếu cần.
- Không xóa source upload.
- Xóa temp file local; output object chưa hoàn tất phải bị xóa hoặc đánh dấu
  `abandoned` để cleanup job xử lý.
- Không được publish sau khi cancellation đã được chấp nhận.

---

## 6. Kiến trúc baseline

```text
┌──────────────────── Browser / React ────────────────────┐
│ login, project UI, multipart uploader, SSE/polling      │
└──────────────┬──────────────────────────┬───────────────┘
               │ JSON/SSE                 │ presigned part URLs
               ▼                          ▼
┌──────────────── Fastify API ───────┐  ┌────── MinIO ──────┐
│ auth, tenant scope, project API    │  │ source bucket      │
│ upload signing, commands, events   │  │ processed bucket   │
└──────────────┬───────────┬─────────┘  │ delivery bucket    │
               │           │            └─────────▲──────────┘
               ▼           ▼                      │
        ┌ PostgreSQL ┐  ┌ Redis/BullMQ ┐          │
        │ app state  │  │ job transport│          │
        │ outbox     │  └──────┬───────┘          │
        │ events     │         ▼                  │
        └────────────┘  ┌── Media Worker ─────────┘
                        │ ffprobe, FFmpeg, verify
                        └──────────────────────────
```

### 6.1. Quyền sở hữu dữ liệu

- PostgreSQL là nguồn sự thật cho project, run, step, approval, publish state
  và user-visible event.
- BullMQ là transport và execution queue; UI không đọc BullMQ trực tiếp.
- MinIO là nguồn lưu binary; PostgreSQL chỉ giữ object key và metadata.
- Local disk của worker chỉ là scratch space, có thể mất bất cứ lúc nào.
- Redis pub/sub nếu dùng chỉ là wake-up hint. Client reconnect phải đọc lại
  state/event từ PostgreSQL.

### 6.2. Không dual-write database và queue

Khi tạo run hoặc publish request:

1. transaction ghi business state;
2. cùng transaction ghi `outbox_events`;
3. outbox dispatcher claim row;
4. enqueue BullMQ bằng deterministic `jobId`;
5. đánh dấu outbox đã dispatch.

Nếu enqueue thành công nhưng cập nhật outbox thất bại, lần dispatch sau sử dụng
cùng `jobId`; duplicate enqueue không được tạo thêm một execution logic mới.

### 6.3. Ranh giới module

- Web không truy cập Redis, PostgreSQL hoặc MinIO credential.
- API không chạy FFmpeg.
- Worker không tự quyết quyền của user.
- Repository không chứa query thiếu `workspace_id` trên dữ liệu tenant-scoped.
- Object key được tạo server-side; không ghép trực tiếp từ filename người dùng.
- Operator command phải qua API/application service, không update table trực tiếp.

---

## 7. Stack kỹ thuật bắt buộc

| Phần | Lựa chọn |
|---|---|
| Runtime | Node.js 22 |
| Package manager | pnpm workspace |
| Ngôn ngữ | TypeScript strict mode |
| Frontend | React + Vite |
| API | Fastify |
| Validation | Zod |
| Database | PostgreSQL 16 |
| SQL/migration | Drizzle ORM + drizzle-kit |
| Queue | BullMQ + Redis |
| Object storage | MinIO qua AWS SDK v3 |
| Media | `ffmpeg` và `ffprobe` binary |
| Logging | Pino JSON logs |
| Unit/integration | Vitest |
| Browser E2E | Playwright |
| Container local | Docker Compose |

Không dùng wrapper FFmpeg xây command bằng shell string. Gọi binary bằng argument
array thông qua `execa` hoặc `node:child_process.spawn` với `shell: false`.

---

## 8. Cấu trúc repository

```text
MediaFlow/
├─ apps/
│  ├─ web/                 # React UI
│  ├─ api/                 # Fastify HTTP/SSE
│  ├─ worker/              # BullMQ consumers + FFmpeg
│  └─ ops/                 # CLI gọi operator API
├─ packages/
│  ├─ contracts/           # DTO/Zod schemas dùng chung
│  ├─ database/            # schema, migrations, repositories
│  ├─ domain/              # pure rules/state transitions
│  ├─ application/         # use cases, transaction boundaries
│  ├─ object-storage/      # MinIO/S3 adapter
│  ├─ queue/               # BullMQ producer/consumer adapter
│  ├─ media/               # ffprobe/FFmpeg command builder
│  ├─ observability/       # logger, correlation context
│  └─ test-support/        # fixtures, factories, fault helpers
├─ docker/
│  ├─ api.Dockerfile
│  ├─ worker.Dockerfile
│  └─ minio-init/
├─ scripts/
│  ├─ verify-no-rhinoq.mjs
│  ├─ wait-for-services.mjs
│  └─ demo-fixtures.mjs
├─ test/
│  ├─ integration/
│  ├─ fault/
│  └─ e2e/
├─ .env.example
├─ compose.yaml
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md
```

### 8.1. Dependency direction

```text
web → contracts
api → contracts → application → domain
worker → application + media
application → domain + repository/storage/queue ports
adapters → ports
database/object-storage/queue/media không import web hoặc api
```

`domain` không import Fastify, Drizzle, BullMQ, Redis, MinIO hoặc FFmpeg.

---

## 9. Mô hình dữ liệu

Mọi ID dùng UUID v7 hoặc UUID ngẫu nhiên do server sinh. Tất cả timestamp lưu
UTC bằng `timestamptz`. Không lưu local time trong database.

### 9.1. `workspaces`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | server generated |
| `slug` | text unique | lowercase |
| `name` | text | 1–120 ký tự |
| `created_at` | timestamptz | not null |

### 9.2. `users`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | server generated |
| `workspace_id` | uuid FK | tenant boundary |
| `email` | citext | unique trong workspace |
| `password_hash` | text | Argon2id |
| `display_name` | text | 1–120 ký tự |
| `roles` | text[] | `producer`, `reviewer`, `operator` |
| `created_at` | timestamptz | not null |

Unique index: `(workspace_id, email)`.

### 9.3. `media_projects`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid PK | project ID |
| `workspace_id` | uuid FK | bắt buộc trong mọi query |
| `created_by` | uuid FK | user |
| `name` | text | 1–160 ký tự |
| `status` | text | state bên dưới |
| `active_run_id` | uuid nullable | run hiện tại |
| `version` | bigint | optimistic concurrency |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Project states:

```text
draft
uploading
uploaded
queued
processing
awaiting_approval
needs_changes
publishing
completed
failed
needs_attention
cancelling
cancelled
```

Không được cập nhật state bằng string tùy ý. Transition nằm trong domain module
và có unit test.

### 9.4. `upload_sessions`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid PK | public upload session ID |
| `workspace_id` | uuid FK | tenant scope |
| `project_id` | uuid FK | |
| `provider_upload_id` | text | MinIO multipart ID, không trả về browser |
| `bucket` | text | source bucket |
| `object_key` | text | server generated |
| `original_filename` | text | display only |
| `declared_media_type` | text | không dùng làm trust boundary |
| `declared_size_bytes` | bigint | giới hạn trước khi sign |
| `part_size_bytes` | integer | mặc định 16 MiB |
| `status` | text | state bên dưới |
| `expires_at` | timestamptz | mặc định sau 24 giờ |
| `completed_at` | timestamptz nullable | |
| `created_at` | timestamptz | |

Upload states:

```text
initiated → uploading → completing → completed
          ↘ aborted
          ↘ expired
          ↘ failed
```

### 9.5. `upload_parts`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `upload_session_id` | uuid FK | |
| `workspace_id` | uuid FK | defense in depth |
| `part_number` | integer | 1–10.000 |
| `etag` | text | từ provider |
| `size_bytes` | integer | |
| `reported_at` | timestamptz | |

Primary key: `(upload_session_id, part_number)`.

### 9.6. `media_assets`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `project_id` | uuid FK | |
| `run_id` | uuid nullable FK | source có thể có trước run |
| `kind` | text | `source`, `thumbnail`, `video`, `delivery` |
| `profile` | text | `source`, `720p`, `1080p`, `source-normalized` |
| `bucket` | text | |
| `object_key` | text | unique trong bucket |
| `media_type` | text | verified type |
| `size_bytes` | bigint | |
| `sha256` | text nullable | lowercase hex |
| `duration_ms` | bigint nullable | |
| `width` | integer nullable | |
| `height` | integer nullable | |
| `video_codec` | text nullable | |
| `audio_codec` | text nullable | |
| `state` | text | `available`, `abandoned`, `deleted` |
| `created_at` | timestamptz | |

Unique index: `(bucket, object_key)`. Index `(workspace_id, project_id)`.

### 9.7. `processing_runs`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `project_id` | uuid FK | |
| `source_asset_id` | uuid FK | immutable cho run |
| `sequence` | integer | tăng trong project |
| `status` | text | state bên dưới |
| `queue_job_id` | text | deterministic: `process:<run-id>` |
| `attempt_count` | integer | observation, không thay BullMQ truth |
| `progress_percent` | numeric(5,2) | 0–100 |
| `current_step` | text nullable | display hint |
| `cancel_requested_at` | timestamptz nullable | |
| `cancel_requested_by` | uuid nullable | |
| `cancel_reason` | text nullable | |
| `started_at` | timestamptz nullable | |
| `finished_at` | timestamptz nullable | |
| `error_code` | text nullable | stable machine code |
| `error_message` | text nullable | sanitized |
| `created_at` | timestamptz | |

Run states:

```text
queued
running
awaiting_approval
approved
rejected
publishing
succeeded
failed
needs_attention
cancelling
cancelled
```

Unique index: `(project_id, sequence)`.

### 9.8. `processing_steps`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `run_id` | uuid FK | |
| `name` | text | enum logic bên dưới |
| `ordinal` | integer | stable order |
| `status` | text | `pending/running/succeeded/failed/skipped/cancelled` |
| `attempt_count` | integer | |
| `progress_percent` | numeric(5,2) | |
| `started_at` | timestamptz nullable | |
| `finished_at` | timestamptz nullable | |
| `output_asset_id` | uuid nullable | |
| `error_code` | text nullable | |
| `error_message` | text nullable | sanitized |
| `metadata` | jsonb | bounded, không chứa secret/payload lớn |

Unique index: `(run_id, name)`.

Các step name v1:

```text
probe_source
checksum_source
create_thumbnail
transcode_720p
transcode_1080p
verify_outputs
await_approval
publish_outputs
verify_delivery
```

### 9.9. `approvals`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `run_id` | uuid FK | một quyết định cuối cùng |
| `decision` | text | `approved` hoặc `rejected` |
| `reason` | text nullable | bắt buộc nếu reject |
| `decided_by` | uuid FK | reviewer |
| `decided_at` | timestamptz | |

Unique index `(run_id)` để tránh double approval. API phải xử lý conflict
idempotently: cùng decision trả lại record; decision khác trả `409`.

### 9.10. `publish_operations`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `run_id` | uuid FK | |
| `source_asset_id` | uuid FK | |
| `destination_bucket` | text | delivery bucket |
| `destination_key` | text | deterministic |
| `idempotency_key` | text | server generated |
| `request_fingerprint` | text | hash input bất biến |
| `state` | text | state bên dưới |
| `provider_evidence` | jsonb | bounded HEAD/copy evidence |
| `requested_at` | timestamptz nullable | |
| `confirmed_at` | timestamptz nullable | |
| `last_error_code` | text nullable | |
| `last_error_message` | text nullable | sanitized |
| `created_at` | timestamptz | |

States:

```text
pending → requested → confirmed
                    ↘ failed
                    ↘ uncertain
uncertain → confirmed    (sau reconcile có evidence)
uncertain → failed       (sau reconcile chứng minh không tồn tại)
```

Unique index `(workspace_id, idempotency_key)` và
`(destination_bucket, destination_key)`.

Nếu copy có thể đã xảy ra nhưng response thất lạc, bắt buộc chuyển `uncertain`.
Không tự động copy lại cho tới khi đã HEAD destination và so sánh checksum/
metadata.

### 9.11. `verification_results`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `run_id` | uuid FK | |
| `scope` | text | `processed_output` hoặc `delivery` |
| `status` | text | `pending/passed/failed/unverifiable` |
| `checks` | jsonb | danh sách check có schema |
| `observed_at` | timestamptz | |

Mỗi check chứa `name`, `expected`, `actual`, `status`, `message`. Không chỉ lưu
một boolean tổng hợp.

### 9.12. `project_events`

Append-only, dùng cho timeline và SSE replay:

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | bigserial PK | SSE event ID |
| `workspace_id` | uuid FK | |
| `project_id` | uuid FK | |
| `run_id` | uuid nullable | |
| `type` | text | stable event type |
| `actor_type` | text | `user/system/worker/operator` |
| `actor_id` | uuid nullable | |
| `data` | jsonb | sanitized, versioned |
| `schema_version` | integer | bắt đầu từ 1 |
| `occurred_at` | timestamptz | database time |

Index `(workspace_id, project_id, id)`. Không update hoặc delete event trong v1.

### 9.13. `outbox_events`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid PK | |
| `topic` | text | queue target |
| `dedupe_key` | text unique | deterministic |
| `payload` | jsonb | ID/reference nhỏ |
| `available_at` | timestamptz | retry scheduling |
| `attempt_count` | integer | |
| `claimed_until` | timestamptz nullable | dispatcher lease |
| `dispatched_at` | timestamptz nullable | |
| `last_error` | text nullable | sanitized |
| `created_at` | timestamptz | |

Outbox payload không chứa video, credential hoặc presigned URL.

---

## 10. API contract

Tất cả endpoint nằm dưới `/api/v1`. JSON error envelope:

```json
{
  "error": {
    "code": "UPLOAD_EXPIRED",
    "message": "Upload session has expired",
    "requestId": "req_...",
    "details": {}
  }
}
```

`message` an toàn để hiển thị. Stack trace, SQL, bucket credential và provider
response thô không được trả về client.

### 10.1. Authentication

| Method | Path | Hành vi |
|---|---|---|
| POST | `/auth/login` | email/password, tạo secure session cookie |
| POST | `/auth/logout` | revoke session |
| GET | `/auth/me` | user, workspace, roles |

Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` ngoài local HTTP. State-changing
request phải có CSRF protection bằng origin check và CSRF token.

### 10.2. Projects

| Method | Path | Role |
|---|---|---|
| POST | `/projects` | producer |
| GET | `/projects` | mọi user trong workspace |
| GET | `/projects/:projectId` | mọi user trong workspace |
| PATCH | `/projects/:projectId` | producer |
| POST | `/projects/:projectId/process` | producer |
| POST | `/projects/:projectId/cancel` | producer/operator |
| POST | `/projects/:projectId/retry` | operator |

Create request:

```json
{ "name": "Summer campaign — cut 01" }
```

List hỗ trợ cursor pagination, `status` filter và search theo name. Không dùng
offset pagination làm contract chính.

### 10.3. Multipart uploads

| Method | Path | Hành vi |
|---|---|---|
| POST | `/projects/:projectId/uploads` | khởi tạo multipart |
| POST | `/uploads/:uploadId/parts/:partNumber/url` | sign một part |
| GET | `/uploads/:uploadId` | state + provider parts để resume |
| POST | `/uploads/:uploadId/parts/report` | lưu ETag/size sau upload |
| POST | `/uploads/:uploadId/complete` | complete multipart |
| DELETE | `/uploads/:uploadId` | abort multipart |

Initiate request:

```json
{
  "filename": "campaign-master.mov",
  "sizeBytes": 2147483648,
  "mediaType": "video/quicktime"
}
```

Initiate response:

```json
{
  "uploadId": "uuid",
  "partSizeBytes": 16777216,
  "expiresAt": "2026-08-25T10:00:00Z"
}
```

Complete request:

```json
{
  "parts": [
    { "partNumber": 1, "etag": "...", "sizeBytes": 16777216 }
  ]
}
```

API phải so sánh parts client gửi với `ListParts` từ provider trước khi complete.
Complete được gọi lại với cùng parts phải trả lại kết quả cũ, không tạo source
asset thứ hai.

### 10.4. Approval

| Method | Path | Role |
|---|---|---|
| POST | `/runs/:runId/approve` | reviewer |
| POST | `/runs/:runId/reject` | reviewer |

Approve body:

```json
{ "note": "Ready for delivery" }
```

Reject body:

```json
{ "reason": "The title card uses the previous campaign logo." }
```

### 10.5. Assets

| Method | Path | Hành vi |
|---|---|---|
| GET | `/assets/:assetId` | metadata tenant-scoped |
| POST | `/assets/:assetId/download-url` | presigned GET 5 phút |

Không trả bucket credential hoặc object storage admin endpoint.

### 10.6. Events và realtime

| Method | Path | Hành vi |
|---|---|---|
| GET | `/projects/:projectId/events` | cursor-paginated history |
| GET | `/projects/:projectId/events/stream` | SSE |

SSE event:

```text
id: 1842
event: step.progressed
data: {"schemaVersion":1,"projectId":"...","runId":"...","step":"transcode_720p","progressPercent":47.2,"occurredAt":"..."}
```

Server chấp nhận `Last-Event-ID`, replay từ PostgreSQL rồi tiếp tục stream.
Frontend polling snapshot mỗi 10 giây là fallback khi SSE disconnect lâu.

### 10.7. Operator API

Endpoint dưới `/api/v1/operator` yêu cầu role `operator`:

| Method | Path | Hành vi |
|---|---|---|
| GET | `/runs` | list theo status/attention |
| GET | `/runs/:runId` | run + steps + attempts + evidence |
| POST | `/runs/:runId/retry` | retry khi hợp lệ |
| POST | `/publish/:operationId/reconcile` | HEAD và đối soát destination |
| POST | `/uploads/:uploadId/expire` | demo cleanup có kiểm soát |

Mọi mutation operator bắt buộc có `{ "reason": "..." }`, ghi actor và event.

---

## 11. Multipart upload chi tiết

### 11.1. Quy tắc

- Kích thước part mặc định 16 MiB, cấu hình được từ 8–64 MiB.
- File tối đa mặc định 5 GiB trong local demo; cấu hình bằng env.
- Browser upload tối đa ba part đồng thời.
- Presigned URL cho mỗi part hết hạn sau 10 phút.
- Browser chỉ xin URL ngay trước khi upload part, không sign hàng nghìn URL trước.
- State resume lưu `uploadId`, project ID và parts hoàn thành trong IndexedDB.
- Server/provider là authority; IndexedDB chỉ giúp UX.
- Khi resume, browser gọi GET upload và hợp nhất danh sách part từ server.
- ETag không được coi là SHA-256 toàn file.
- SHA-256 nguồn do worker tính sau complete.

### 11.2. Không proxy file qua API

API không nhận request body chứa video. Thêm integration test bảo đảm endpoint
upload chỉ trả presigned URL và không có route generic nhận binary video.

### 11.3. Expiration và cleanup

Cleanup job chạy định kỳ:

1. tìm upload `initiated/uploading` quá `expires_at`;
2. gọi abort multipart;
3. nếu provider trả not-found, coi là đã cleanup;
4. đánh dấu `expired`;
5. ghi project event;
6. không xóa project.

---

## 12. Media pipeline chi tiết

### 12.1. Queue

Queues:

```text
media-processing
media-publishing
maintenance
```

Job names:

```text
process-media
publish-media
cleanup-expired-uploads
cleanup-abandoned-assets
dispatch-outbox
```

Job payload chỉ chứa version và IDs:

```json
{
  "schemaVersion": 1,
  "workspaceId": "uuid",
  "runId": "uuid"
}
```

Worker phải kiểm tra workspace/run relationship từ database; không tin payload
một mình.

### 12.2. Retry classification

Retry tự động tối đa ba attempts với exponential backoff và jitter cho:

- timeout tạm thời tới MinIO/Redis/PostgreSQL;
- HTTP/provider 429 hoặc 5xx từ mock publisher;
- FFmpeg process bị terminate ngoài ý muốn mà không phải cancellation;
- transient filesystem I/O.

Không retry tự động cho:

- file không phải video;
- codec không hỗ trợ;
- source bị hỏng;
- validation fail;
- cancellation;
- publish `uncertain`;
- output verification mismatch;
- permission/configuration error.

Error class phải có stable `code`, `retryable`, `publicMessage`, `cause` nội bộ.

### 12.3. Step idempotency

Trước mỗi step:

1. lock run/step trong transaction;
2. nếu step đã `succeeded`, xác minh output asset vẫn tồn tại;
3. nếu evidence hợp lệ, skip execution;
4. nếu thiếu object, chuyển `needs_attention`, không giả success;
5. đánh dấu running và tăng attempt;
6. thực hiện công việc ngoài transaction;
7. persist result bằng compare-and-set trên status/attempt.

Object key deterministic:

```text
workspaces/<workspaceId>/projects/<projectId>/runs/<runId>/source/<safe-id>
workspaces/<workspaceId>/projects/<projectId>/runs/<runId>/outputs/720p.mp4
workspaces/<workspaceId>/projects/<projectId>/runs/<runId>/outputs/1080p.mp4
workspaces/<workspaceId>/projects/<projectId>/runs/<runId>/outputs/thumbnail.jpg
```

Filename người dùng chỉ là metadata, không nằm nguyên dạng trong object key.

### 12.4. Probe source

Chạy:

```text
ffprobe -v error -print_format json -show_format -show_streams <input>
```

Parser phải giới hạn output, validate schema và từ chối:

- không có video stream;
- duration bằng 0 hoặc vượt giới hạn cấu hình;
- kích thước/duration không hợp lý;
- codec/container không được FFmpeg build hiện tại hỗ trợ.

Không truyền filename người dùng vào shell command.

### 12.5. Transcode

Profile 720p:

```text
H.264 + yuv420p + AAC, giữ aspect ratio, không upscale
```

Profile 1080p tương tự và chỉ chạy khi source height > 720. Dùng argument array
được kiểm soát trong `packages/media`; API không cho user gửi raw FFmpeg flags.

FFmpeg phải dùng `-progress pipe:1`. Parse `out_time_ms` và tính progress dựa
trên duration đã probe. Ghi database/SSE tối đa mỗi một giây hoặc khi thay đổi
ít nhất 1%, tránh write storm.

### 12.6. Scratch directory

```text
/tmp/mediaflow/<runId>/<attemptId>/
```

- validate resolved path nằm dưới `/tmp/mediaflow`;
- cleanup trong `finally`;
- worker startup dọn directory cũ vượt TTL;
- local temp file không phải durable checkpoint;
- retry tải lại source nếu temp file đã mất.

### 12.7. Concurrency baseline

Chạy đúng **một media worker replica** với BullMQ worker concurrency `2` trong
compose baseline. Đây là giới hạn có chủ đích và phải ghi trong README:

- đảm bảo tối đa hai pipeline trong local baseline;
- nếu scale nhiều worker replicas, giới hạn không còn global;
- v1 không tự xây distributed resource semaphore;
- không quảng bá khả năng scale ngang cho media worker.

### 12.8. Graceful shutdown

Khi nhận SIGTERM:

1. ngừng nhận job mới;
2. báo FFmpeg hiện tại dừng an toàn;
3. chờ tối đa cấu hình shutdown timeout;
4. giữ run ở trạng thái có thể retry;
5. đóng DB/Redis connections;
6. không ghi success khi output chưa upload/verify xong.

---

## 13. Verification

### 13.1. Processed output checks

Mỗi output video phải kiểm tra:

- object tồn tại;
- size lớn hơn 0 và trong giới hạn hợp lý;
- SHA-256 đã tính được;
- ffprobe đọc được;
- có video stream;
- duration lệch không quá `max(1 giây, 1% source duration)`;
- codec video là H.264;
- pixel format tương thích phổ biến;
- width/height đúng profile và aspect ratio hợp lý;
- audio stream là AAC nếu source có audio;
- thumbnail là JPEG và kích thước lớn hơn 0.

Không đánh dấu run `awaiting_approval` nếu verification fail hoặc unverifiable.

### 13.2. Delivery checks

Sau publish:

- HEAD destination object;
- so sánh size;
- so sánh checksum metadata do app ghi khi copy;
- so sánh source asset ID/run ID metadata;
- lưu provider request ID hoặc ETag nếu có;
- chỉ `confirmed` khi evidence đủ.

HTTP 200 của một wrapper không tự động thay thế kiểm tra destination.

---

## 14. Publish và kết quả bất định

Publish v1 copy asset từ processed bucket sang delivery bucket. Mock publisher
phải có thể mô phỏng ba kết quả:

1. copy thất bại trước khi có side effect;
2. copy thành công và trả response;
3. copy thành công nhưng client nhận network error.

Trường hợp 3:

- ghi operation `uncertain`;
- project/run chuyển `needs_attention`;
- không auto-retry copy;
- timeline giải thích rằng destination có thể đã được tạo;
- operator chạy reconcile;
- reconcile HEAD deterministic destination key;
- nếu checksum đúng, xác nhận operation;
- nếu object chắc chắn không tồn tại, đánh dấu failed rồi mới cho retry;
- nếu evidence vẫn thiếu, giữ `uncertain`.

Idempotency key ví dụ:

```text
publish:<workspaceId>:<runId>:<sourceAssetId>:<profile>
```

Request fingerprint hash từ destination, source checksum và profile. Cùng key
nhưng fingerprint khác phải trả conflict, không ghi đè.

---

## 15. Failure Lab

Failure Lab chỉ xuất hiện khi:

```text
MEDIAFLOW_DEMO_MODE=true
NODE_ENV!=production
```

API khởi động phải fail nếu `MEDIAFLOW_DEMO_MODE=true` cùng `NODE_ENV=production`.
Không mount Docker socket vào app và không cho UI chạy arbitrary command.

### 15.1. Failure scenarios bắt buộc

#### FL-01 — Ngắt upload ở phần trăm cấu hình

- Browser abort các request part khi tổng byte đạt ngưỡng.
- Upload session vẫn còn để resume.
- Sau refresh, UI đọc parts từ server và tiếp tục phần thiếu.

#### FL-02 — Worker crash giữa transcode

- Fault flag gắn với `runId`, `step`, threshold và `remainingUses=1`.
- Khi FFmpeg progress vượt threshold, worker tự thoát với exit code khác 0.
- Supervisor/container restart worker.
- BullMQ retry job theo policy.
- Fault đã consume nên attempt tiếp theo không crash lặp vô hạn.
- Timeline phải thể hiện attempt trước bị mất.

#### FL-03 — Corrupt output

- Sau upload processed output nhưng trước verification, demo adapter truncate hoặc
  thay object bằng bytes không hợp lệ.
- Verification phải fail; không chuyển sang approval.

#### FL-04 — Publish thành công nhưng mất response

- Mock publisher copy object xong rồi throw timeout.
- Operation chuyển `uncertain`.
- Auto retry bị chặn.
- Reconcile xác minh và hoàn tất mà không copy lần hai.

#### FL-05 — Cancel khi FFmpeg đang chạy

- UI gửi cancel với reason.
- FFmpeg được terminate.
- Không xuất hiện publish job.
- Source vẫn download được.
- Temp/output dở được cleanup.

#### FL-06 — MinIO/Redis outage

Không cho UI dừng container. Cung cấp script/manual runbook:

```bash
docker compose stop minio
docker compose start minio
docker compose stop redis
docker compose start redis
```

Test phải xác nhận lỗi được phân loại và hệ thống không báo success giả.

### 15.2. Fault configuration table

Tạo `demo_faults` table hoặc adapter tương đương với:

```text
id, workspace_id, project_id, run_id, scenario, step,
threshold, remaining_uses, enabled, created_by, created_at
```

Fault phải tenant-scoped, audit được và tự disable khi `remaining_uses=0`.

---

## 16. Giao diện

### 16.1. Screens

1. **Login** — chọn/tự nhập tài khoản seed.
2. **Projects** — list, trạng thái, progress, updated time, create button.
3. **New project** — name và upload dropzone.
4. **Project detail** — source, progress, step timeline, outputs, approval,
   verification, events và safe next action.
5. **Reviewer inbox** — các run đang chờ duyệt.
6. **Operator attention** — failed/uncertain/mismatch và action hợp lệ.
7. **Failure Lab drawer** — chỉ demo mode.

### 16.2. Project detail layout

```text
[Project name] [status badge] [safe action]

Upload/Source card
Overall progress
Pipeline timeline
  ✓ Probe
  ✓ Thumbnail
  ↻ 720p 47%
  ○ 1080p
  ○ Verify
  ○ Approval
  ○ Publish

Outputs gallery
Verification evidence
Approval panel
Event history
```

### 16.3. UX rules

- Không chỉ dùng màu để biểu thị trạng thái.
- Status có label rõ: `Processing`, `Needs review`, `Needs attention`.
- Không hiện stack trace.
- Retry/cancel/reconcile yêu cầu confirmation và reason khi có rủi ro.
- Khi state conflict, reload snapshot và giải thích thay vì ghi đè.
- Refresh trang không mất upload hoặc pipeline state.
- Upload hỗ trợ keyboard và có progress text cho screen reader.
- Nút không hợp lệ phải disabled kèm lý do.
- Thời gian hiển thị theo timezone browser, tooltip có UTC.

---

## 17. CLI operator

CLI `mediaflow` trong `apps/ops` gọi operator API, không truy cập DB trực tiếp.

Commands:

```bash
pnpm mediaflow projects list --status processing
pnpm mediaflow runs list --attention
pnpm mediaflow runs inspect <run-id>
pnpm mediaflow runs retry <run-id> --reason "transient storage outage resolved"
pnpm mediaflow publish reconcile <operation-id> --reason "verify destination after timeout"
pnpm mediaflow watch --severity warning
```

`watch` có thể poll endpoint event/operator list trong baseline. Nó phải reconnect,
dedupe theo event ID và không suy luận state chỉ từ log text.

CLI output không in password, cookie, presigned URL hoặc provider credential.

---

## 18. Authentication, authorization và tenant isolation

### 18.1. Seed users

Tạo hai workspaces để test isolation:

```text
Acme Studio
  producer@acme.local
  reviewer@acme.local
  operator@acme.local

Beta Studio
  producer@beta.local
  reviewer@beta.local
  operator@beta.local
```

Password demo lấy từ env/seed script và ghi trong local README, không hardcode
password production trong source.

### 18.2. Authorization matrix

| Action | Producer | Reviewer | Operator |
|---|---:|---:|---:|
| Create/upload/process | yes | no | yes |
| View workspace projects | yes | yes | yes |
| Approve/reject | no | yes | yes |
| Cancel own workspace run | yes | no | yes |
| Retry failed | no | no | yes |
| Reconcile uncertain publish | no | no | yes |
| Configure demo fault | yes | no | yes |

Tất cả role chỉ hoạt động trong workspace của session.

### 18.3. Isolation requirements

- Query repository bắt buộc nhận `workspaceId`.
- Route lookup bằng ID của tenant khác trả `404`, không trả `403` để tránh lộ tồn tại.
- Presigned URL chỉ được tạo sau tenant authorization.
- SSE filter theo workspace và project.
- Operator không phải global super-admin trong v1.
- Integration test cố đọc, cancel, approve, sign download và stream project của
  tenant khác.

---

## 19. Bảo mật file và worker

- Chỉ cho phép container dự kiến: MOV, MP4, MKV, WebM; quyết định cuối dựa trên
  ffprobe, không dựa vào extension.
- Không nhận remote URL để tránh SSRF.
- Không dùng user filename làm filesystem path.
- Tất cả path local phải được resolve và kiểm tra nằm dưới scratch root.
- FFmpeg/ffprobe chạy non-root trong container.
- Container worker có resource limit local hợp lý và không mount Docker socket.
- Giới hạn duration, resolution, file size và thời gian chạy theo env.
- Giới hạn ffprobe stdout/stderr và timeout.
- Presigned URL thời hạn ngắn; không log query string.
- MinIO access/secret chỉ ở server/worker env.
- Log phải redact `authorization`, `cookie`, `set-cookie`, access key và URL query.
- Dependency audit chạy trong CI.
- Không commit `.env`, video thật của khách hàng hoặc object storage data.

---

## 20. Observability và health

### 20.1. Structured logs

Mọi log JSON quan trọng gồm nếu có:

```text
requestId, workspaceId, projectId, runId, stepName,
jobId, attempt, operationId, eventType, errorCode
```

Không dùng message text làm field duy nhất để query.

### 20.2. Health endpoints

```text
GET /health/live   # process sống, không gọi dependency
GET /health/ready  # DB + Redis + MinIO basic check có timeout
```

Readiness trả component status nhưng không lộ endpoint/credential.

### 20.3. Metrics tối thiểu

Expose Prometheus text endpoint hoặc structured metrics cho:

- upload sessions theo status;
- processing runs theo status;
- queue waiting/active/failed;
- step duration histogram;
- retry count;
- active transcodes;
- publish uncertain count;
- verification failed count;
- SSE connection count.

Metrics không chứa project/user ID làm high-cardinality label.

---

## 21. Configuration

`.env.example` phải chứa tên biến, mô tả và default local an toàn:

```text
NODE_ENV=development
DATABASE_URL=postgres://...
REDIS_URL=redis://...
MINIO_ENDPOINT=http://minio:9000
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_SOURCE_BUCKET=mediaflow-source
MINIO_PROCESSED_BUCKET=mediaflow-processed
MINIO_DELIVERY_BUCKET=mediaflow-delivery
SESSION_SECRET=replace-me
APP_ORIGIN=http://localhost:5173
API_ORIGIN=http://localhost:3000
UPLOAD_PART_SIZE_BYTES=16777216
MAX_UPLOAD_SIZE_BYTES=5368709120
MAX_VIDEO_DURATION_SECONDS=7200
MEDIA_WORKER_CONCURRENCY=2
FFMPEG_TIMEOUT_SECONDS=10800
MEDIAFLOW_DEMO_MODE=true
LOG_LEVEL=info
```

Startup validation phải fail fast nếu thiếu biến bắt buộc hoặc giá trị không hợp
lệ. Không silently fallback sang credential yếu ngoài development.

---

## 22. Docker Compose local

Services:

```text
postgres
redis
minio
minio-init
api
worker
web
```

Yêu cầu:

- named volumes cho PostgreSQL, Redis và MinIO;
- healthchecks;
- `depends_on` dùng health condition nơi hỗ trợ;
- API migration command rõ ràng, không để nhiều replica tự migrate đồng thời;
- worker image chứa pinned FFmpeg build/version;
- service chạy non-root nếu có thể;
- port public tối thiểu;
- MinIO console chỉ local development;
- một lệnh khởi động:

```bash
docker compose up --build
```

Sau khi sẵn sàng, README phải chỉ rõ URL web, API, MinIO console và tài khoản seed.

---

## 23. Test strategy

### 23.1. Unit tests

- mọi valid/invalid project transition;
- upload state transitions;
- run/step transition guards;
- retry classification;
- progress aggregation;
- output profile selection theo source resolution;
- approval conflict/idempotency;
- publish idempotency key/fingerprint;
- verification tolerance;
- safe object key/path generation;
- FFmpeg progress parser;
- redaction và public error mapping.

### 23.2. Database integration tests

- migration từ database trống;
- unique constraints;
- transaction tạo run + outbox;
- outbox duplicate dispatch với cùng job ID;
- concurrent complete upload chỉ tạo một source asset;
- concurrent approval chỉ có một decision;
- optimistic project version conflict;
- tenant-scoped repository không đọc tenant khác;
- append-only project events;
- uncertain publish không thể auto-transition thành requested lần hai.

### 23.3. MinIO integration tests

- create/sign/upload/list/complete multipart;
- resume từ parts đã có;
- abort;
- expired upload cleanup;
- presigned URL hết hạn;
- processed asset upload và HEAD;
- deterministic delivery copy;
- checksum metadata comparison;
- tenant không thể xin download URL asset tenant khác.

### 23.4. Worker integration tests

Dùng video fixture nhỏ tự tạo trong test setup bằng FFmpeg, không commit binary lớn.

- ffprobe parse;
- thumbnail thật;
- 720p output thật;
- skip 1080p khi source thấp;
- run progress monotonic;
- retry không tạo asset duplicate;
- cancel terminate child process;
- restart attempt skip step đã hoàn tất và còn evidence;
- missing succeeded output chuyển attention;
- corrupted output fail verification.

### 23.5. API integration tests

- login/logout/session;
- validation/error envelope;
- role matrix;
- tenant boundary trả 404;
- create project/upload/process;
- process khi upload chưa complete trả conflict;
- cancel/retry guards;
- approval/rejection guards;
- operator reconcile;
- CSRF/origin protection;
- rate limit trên login/sign URL.

### 23.6. SSE tests

- stream chỉ nhận project đúng tenant;
- event IDs tăng;
- reconnect với `Last-Event-ID` replay event bị lỡ;
- duplicate wake-up không tạo duplicate event;
- disconnect không ảnh hưởng pipeline;
- payload không chứa credential hoặc internal error.

### 23.7. Browser E2E

- login → create → upload fixture → process → approve → completed;
- refresh giữa upload rồi resume;
- refresh giữa processing vẫn thấy progress;
- reject và upload revision mới;
- cancel từ UI;
- tenant A không thấy project tenant B;
- reviewer inbox;
- operator attention/reconcile;
- accessibility smoke scan cho các screen chính.

### 23.8. Fault tests

- FL-01 đến FL-06;
- kill worker process giữa transcode rồi restart;
- API restart trong khi worker chạy;
- Redis restart trước/sau enqueue;
- MinIO timeout trước upload output;
- publish copy thành công nhưng response mất;
- duplicate outbox dispatch;
- duplicate approval/cancel request;
- corrupted source/output.

### 23.9. Test commands dự kiến

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:fault
pnpm test:e2e
pnpm verify:no-rhinoq
pnpm build
```

CI phải chạy lint, typecheck, unit, integration, no-RhinoQ gate và build. Fault/E2E
có thể là job riêng nhưng bắt buộc chạy trước tag baseline.

---

## 24. Acceptance scenarios

### AS-01 — Video lớn và resume

**Given** user bắt đầu upload một video nhiều part  
**When** mạng bị ngắt sau ít nhất ba part và trang được refresh  
**Then** các part đã hoàn thành không upload lại, phần còn thiếu tiếp tục, và chỉ
một source asset được tạo sau complete.

### AS-02 — Worker crash

**Given** run đang transcode 720p  
**When** Failure Lab kill worker tại khoảng 47%  
**Then** run không báo success, worker mới retry theo policy, timeline giữ evidence
attempt cũ, và không tạo duplicate final asset.

### AS-03 — Verification mismatch

**Given** output bị corrupt sau transcode  
**When** verification chạy  
**Then** run chuyển `needs_attention`, không mở approval, UI hiển thị check thất bại
và operator inspect được expected/actual.

### AS-04 — Unknown publish result

**Given** reviewer đã approve  
**When** publisher copy thành công nhưng response bị mất  
**Then** state là `uncertain`, không auto-copy lần nữa, reconcile xác nhận object
đúng checksum và hoàn tất bằng evidence.

### AS-05 — Cancellation

**Given** FFmpeg đang chạy  
**When** producer yêu cầu cancel  
**Then** process bị terminate, không publish, source còn tồn tại, run kết thúc
`cancelled` và temp output được cleanup.

### AS-06 — Tenant isolation

**Given** user Acme biết ID project/asset/run của Beta  
**When** user gọi GET, cancel, approve, sign download hoặc SSE  
**Then** mọi bề mặt trả 404/không event và không tạo side effect.

---

## 25. Milestone triển khai

Không làm nhiều milestone trong cùng PR lớn. Mỗi milestone phải pass gate trước
khi bắt đầu milestone tiếp theo.

### M0 — Repository và quality gates

Tickets:

- `MF-001` scaffold pnpm monorepo và TypeScript strict;
- `MF-002` lint, format, typecheck, Vitest, Playwright skeleton;
- `MF-003` Docker Compose PostgreSQL/Redis/MinIO;
- `MF-004` config validation và structured logging;
- `MF-005` script `verify-no-rhinoq` và CI.

Exit gate:

- clone sạch chạy được compose infrastructure;
- CI xanh;
- không có application feature giả.

### M1 — Auth, tenant và project

- `MF-101` schema workspace/user/session;
- `MF-102` login/logout/me;
- `MF-103` role/tenant middleware;
- `MF-104` project CRUD/list cursor;
- `MF-105` seed hai workspace;
- `MF-106` tenant isolation integration tests.

Exit gate: user hai workspace không thể nhìn thấy dữ liệu của nhau.

### M2 — Multipart upload

- `MF-201` upload session schema/state machine;
- `MF-202` MinIO multipart adapter;
- `MF-203` signing/report/list/complete/abort endpoints;
- `MF-204` React multipart uploader + IndexedDB resume;
- `MF-205` expiration cleanup;
- `MF-206` upload integration/E2E tests.

Exit gate: refresh và mất mạng không làm upload lại part đã hoàn thành.

### M3 — Queue, outbox và pipeline core

- `MF-301` run/step/event/outbox schemas;
- `MF-302` transactional create run + outbox;
- `MF-303` outbox dispatcher với dedupe job ID;
- `MF-304` BullMQ worker lifecycle/retry/shutdown;
- `MF-305` project snapshot và SSE replay;
- `MF-306` operator inspect skeleton.

Exit gate: job không mất khi crash giữa DB commit và enqueue; UI replay state được.

### M4 — FFmpeg và artifacts

- `MF-401` safe ffprobe adapter;
- `MF-402` checksum source;
- `MF-403` thumbnail;
- `MF-404` 720p/source-normalized;
- `MF-405` conditional 1080p;
- `MF-406` progress parser/throttle;
- `MF-407` deterministic output upload/idempotency;
- `MF-408` cancellation và cleanup;
- `MF-409` media integration tests.

Exit gate: pipeline thật tạo output hợp lệ và resume an toàn sau worker restart.

### M5 — Verification và approval

- `MF-501` verification schema/check engine;
- `MF-502` processed output checks;
- `MF-503` reviewer inbox;
- `MF-504` approve/reject concurrency guards;
- `MF-505` revision/source replacement flow;
- `MF-506` verification/approval tests.

Exit gate: corrupt output không thể tới publish; double approval được xử lý.

### M6 — Publish và uncertain recovery

- `MF-601` publish operation ledger dành riêng MediaFlow;
- `MF-602` deterministic copy publisher;
- `MF-603` response-loss simulation;
- `MF-604` delivery verification;
- `MF-605` operator reconcile;
- `MF-606` publish fault tests.

Exit gate: lost response không gây duplicate copy và chỉ hoàn tất sau evidence.

### M7 — Failure Lab, ops và UX hoàn thiện

- `MF-701` demo fault config/guards;
- `MF-702` FL-01..FL-05 UI controls;
- `MF-703` outage runbook FL-06;
- `MF-704` operator CLI list/inspect/retry/reconcile/watch;
- `MF-705` attention UI và safe-next-action copy;
- `MF-706` accessibility/error/reconnect polish;
- `MF-707` full E2E/fault suite.

Exit gate: sáu acceptance scenarios pass từ environment sạch.

### M8 — Baseline freeze

- `MF-801` README quickstart và architecture overview;
- `MF-802` security/known limitations;
- `MF-803` demo script và fixture generator;
- `MF-804` full clean-room verification;
- `MF-805` dependency/license audit;
- `MF-806` tag `mediaflow-baseline-v1`.

Không tạo branch tích hợp khác trước khi M8 hoàn tất và tag đã được review.

---

## 26. Git và pull request rules

- Branch: `feat/mf-xxx-short-name`, `fix/mf-xxx-short-name`.
- Không commit trực tiếp lên main.
- PR nhỏ, một vertical slice hoặc một ticket rõ ràng.
- Migration đã merge không được sửa lại; tạo migration mới.
- Commit không chứa generated video, MinIO volume, `.env`, credential hoặc log lớn.
- Không bypass test bằng `.skip`, timeout cực lớn hoặc catch rỗng.
- Không dùng `any` nếu không có comment giải thích boundary.
- Mọi TODO phải có ticket ID; không để TODO chung chung.
- Reviewer phải kiểm tra error/failure path, không chỉ happy path.

---

## 27. Definition of Done cho mỗi ticket

- [ ] Acceptance criteria của ticket được ghi trong PR.
- [ ] Code đúng module và dependency direction.
- [ ] Input validation và authorization có test.
- [ ] Happy path có test.
- [ ] Ít nhất một failure path phù hợp có test.
- [ ] Không dual-write DB/queue.
- [ ] External write có idempotency và cách xác minh kết quả.
- [ ] Log có correlation fields và đã redact secret.
- [ ] Docs/env/example được cập nhật nếu contract thay đổi.
- [ ] Migration có rollback/recovery note.
- [ ] Lint, typecheck và relevant tests pass.
- [ ] `verify:no-rhinoq` pass.
- [ ] Không có claim hiệu năng chưa đo.
- [ ] PR nêu rủi ro/test chưa chạy.

---

## 28. Definition of Done cho Baseline v1

- [ ] `docker compose up --build` chạy từ clone sạch.
- [ ] Hai workspace seed đăng nhập được.
- [ ] Multipart upload video nhiều part chạy và resume được.
- [ ] API không proxy binary video.
- [ ] FFprobe/FFmpeg chạy thật trong worker.
- [ ] Thumbnail và output video được lưu MinIO.
- [ ] Progress, timeline và SSE/polling hoạt động sau refresh.
- [ ] Retry, cancellation và graceful shutdown hoạt động.
- [ ] Verification phân biệt pass/fail/unverifiable.
- [ ] Approval/rejection có audit actor/reason.
- [ ] Publish có idempotency và uncertain reconciliation.
- [ ] Operator UI và CLI xử lý attention flow.
- [ ] FL-01..FL-06 có evidence tái lập.
- [ ] Tenant isolation pass trên API, asset, SSE và operator surface.
- [ ] Unit/integration/fault/E2E suites pass.
- [ ] README mô tả giới hạn một worker replica/concurrency local.
- [ ] Không có RhinoQ dependency/import/contract/UI.
- [ ] Không có secret hoặc user media trong Git.
- [ ] Clean-room run đã được một người khác thực hiện.
- [ ] Tag `mediaflow-baseline-v1` được tạo sau review.

---

## 29. Demo script sau khi baseline hoàn tất

### Demo 1 — Happy path

1. Login Acme Producer.
2. Tạo project.
3. Upload fixture nhiều part.
4. Mở progress/timeline.
5. Login Reviewer và approve.
6. Xem publish + delivery verification.
7. Download output bằng signed URL.

### Demo 2 — Worker crash

1. Bật FL-02 ở 47% cho 720p.
2. Bắt đầu run.
3. Quan sát worker chết/restart.
4. Dùng CLI inspect.
5. Quan sát retry và output không duplicate.

### Demo 3 — Publish bất định

1. Bật FL-04.
2. Approve run.
3. Quan sát `needs_attention/uncertain`.
4. Xác nhận delivery object thực sự đã tồn tại.
5. Chạy CLI/UI reconcile.
6. Quan sát completed không copy lần hai.

### Demo 4 — Isolation

1. Copy URL project Acme.
2. Login Beta.
3. Mở URL và xác nhận 404.
4. Thử asset/download/SSE tương tự trong automated test evidence.

---

## 30. Known limitations phải ghi trong README MediaFlow

- Chỉ là evaluation/demo baseline, không có production SLA.
- Một media worker replica với concurrency local bằng hai.
- Không có distributed global resource limit khi scale worker replicas.
- Upload resume phụ thuộc multipart session chưa hết hạn.
- Local MinIO không đại diện đầy đủ hành vi mọi S3 provider.
- Không có virus scanning sandbox chuyên dụng.
- Codec/container hỗ trợ phụ thuộc FFmpeg build đi kèm.
- Không có billing, quota theo workspace hoặc retention policy hoàn chỉnh.
- Delivery bucket là publish target giả lập, không phải CDN thật.
- Operator CLI dùng API polling, chưa phải durable notification system.
- Local Docker fault scenarios không chứng minh production reliability.

---

## 31. Các quyết định đã khóa, không yêu cầu thực tập sinh chọn lại

| Chủ đề | Quyết định |
|---|---|
| Queue baseline | BullMQ + Redis |
| Business state | PostgreSQL |
| File lớn | multipart trực tiếp MinIO |
| Media engine | FFmpeg/ffprobe thật |
| API | Fastify |
| UI | React + Vite |
| Realtime | SSE replay từ DB + polling fallback |
| Queue consistency | transactional outbox |
| Publish unknown result | `uncertain`, không retry mù |
| Concurrency v1 | một worker replica, concurrency 2 |
| Auth v1 | seed users + secure cookie session |
| Multi-tenancy | workspace-scoped trên mọi surface |
| Production claim | không có |
| RhinoQ | bị cấm trong baseline |

Thay đổi quyết định trên phải có đề xuất ngắn gồm lý do, trade-off, migration và
cách rollback; cần reviewer chấp thuận trước khi code.

---

## 32. Câu hỏi review bắt buộc trước khi merge baseline

1. Video bytes có đi qua API không? Nếu có, thiết kế sai.
2. Có transaction nào commit database rồi enqueue trực tiếp mà không outbox không?
3. Worker restart có thể tạo duplicate asset/publish không?
4. Response publish mất có bị retry mù không?
5. State hiển thị có được đọc từ database hay chỉ từ memory/Redis event?
6. Refresh/mất SSE có tự phục hồi snapshot không?
7. Tenant A có thể đoán ID để đọc tenant B không?
8. User filename có thể trở thành shell/path injection không?
9. Cancellation có thực sự dừng FFmpeg và chặn publish không?
10. Verification có kiểm tra output thật hay chỉ kiểm tra command exit code?
11. Failure Lab có bị bật trong production không?
12. Có package/import/code RhinoQ nào trong baseline không?
13. Có claim hiệu năng/production nào không có evidence không?
14. Clone sạch có chạy được bằng README không?

Chỉ tag baseline khi cả 14 câu đều có câu trả lời và evidence rõ ràng.

---

## 33. Bàn giao cuối cùng của thực tập sinh

Thực tập sinh phải bàn giao:

1. repository MediaFlow độc lập;
2. README quickstart đã clean-room verify;
3. compose environment;
4. migrations và seed;
5. source web/api/worker/ops;
6. test suites và CI logs;
7. failure-lab runbook;
8. demo fixture generator;
9. security và known-limitations document;
10. danh sách dependency/license;
11. evidence cho AS-01..AS-06;
12. tag Git `mediaflow-baseline-v1`.

Sau bàn giao, baseline phải được đóng băng. Mọi thử nghiệm tích hợp hệ thống khác
về sau phải thực hiện trên branch hoặc repository fork riêng, giữ nguyên input,
UI, FFmpeg profiles, MinIO, Failure Lab và acceptance scenarios để phép so sánh
không bị thay đổi giữa chừng.
