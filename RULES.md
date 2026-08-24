# MediaFlow Baseline v1 — System Rules & Guidelines

Tài liệu này định nghĩa các quy tắc hệ thống bắt buộc cho nhà phát triển và các AI Agent khi tham gia phát triển dự án `MediaFlow`.

---

## 1. Ràng buộc cấm tuyệt đối (Non-Negotiable)

### 1.1. Cấm tích hợp RhinoQ (Strict No RhinoQ Policy)
- **KHÔNG** cài đặt package có tên `rhinoq` hoặc `@rhinoq/*`.
- **KHÔNG** import, gọi CLI, Gateway, Task Center hoặc DB function của RhinoQ.
- **KHÔNG** copy source code, schema, UI hoặc contract từ repository RhinoQ.
- **KHÔNG** nhắc tới RhinoQ trong giao diện người dùng hoặc tài liệu sản phẩm.
- CI gate phải chạy `node scripts/verify-no-rhinoq.mjs` và báo lỗi nếu tìm thấy từ khóa cấm.

### 1.2. Độc lập Repository
- MediaFlow nằm trong repository độc lập `t:\MediaFlow`.
- Không nằm trong `examples/`, `demo/`, hay `packages/` của bất kỳ dự án nào khác.

---

## 2. Quy tắc Kiến trúc & Dữ liệu

### 2.1. Phân lập dữ liệu đa người dùng (Multi-Tenancy Isolation)
- Mọi câu lệnh truy vấn dữ liệu (PostgreSQL query/Drizzle) bắt buộc chứa điều kiện `workspace_id`.
- Mọi endpoint, SSE event, và presigned URL đều phải thực hiện kiểm tra quyền truy cập theo `workspace_id`.
- Request truy cập dữ liệu của tenant khác phải trả về `404 Not Found` (không trả `403` để bảo mật thông tin).

### 2.2. Không dual-write Database và Queue (Transactional Outbox Pattern)
- Không ghi database rồi trực tiếp enqueue vào BullMQ mà không qua Outbox.
- Việc ghi trạng thái nghiệp vụ và ghi bảng `outbox_events` phải nằm trong **cùng một database transaction**.
- Job ID của BullMQ phải là deterministic (ví dụ `process:<run-id>`) để tránh trùng lặp execution khi retry dispatch.

### 2.3. Quản lý Video & Object Storage (MinIO)
- **API KHÔNG nhận request body chứa video binary**.
- Browser phải thực hiện multipart upload trực tiếp tới MinIO thông qua **presigned part URLs**.
- Tên tệp của người dùng chỉ lưu dưới dạng metadata; object key trên MinIO do server sinh tự động bằng UUID.

---

## 3. Quy trình Xử lý Media Worker (FFmpeg)

- Worker chạy FFmpeg/ffprobe bằng mảng đối số (`shell: false`), cấm ghép chuỗi câu lệnh shell để tránh lỗ hổng Command Injection.
- Định dạng container/codec chấp nhận dựa trên kết quả của `ffprobe`, không chỉ tin tưởng MIME type từ trình duyệt.
- Xử lý hủy công việc (cancellation) theo cơ chế cooperative: worker kiểm tra cờ hủy tối thiểu 1s/lần khi FFmpeg đang chạy, gửi `SIGTERM` và cleanup tài nguyên tạm.

---

## 4. Quy trình Git Commit & Version Control

- Mỗi khi hoàn thành một nhiệm vụ và được **USER xác nhận/đồng ý**, thực hiện commit theo cú pháp:
  ```text
  [YYYY-MM-DD] Commit #<Lần thứ N>: <Nội dung cập nhật>
  ```
- Ví dụ: `[2026-08-24] Commit #1: Khoi tao cau truc thu muc AI & Monorepo, tao file system rules`
- Không commit file log, video mẫu dung lượng lớn, file cấu hình chứa credentials bí mật (`.env`), hoặc thư mục tạm.
