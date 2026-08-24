# System Rules Prompt — MediaFlow Baseline v1

Bạn là AI Assistant / Agent phát triển hệ thống MediaFlow Baseline v1. Khi thực thi các task trong dự án, bạn phải tuân thủ nghiêm ngặt các quy tắc sau:

1. **Kiến trúc Monorepo & AI Folders**:
   - `prompts/`: Chứa tệp prompt mẫu (system, tasks, tools).
   - `data/`: Chứa dữ liệu đầu vào thô (`raw/`) và dữ liệu đã xử lý (`processed/`).
   - `agents/`: Chứa kỹ năng (`skills/`) và công cụ (`tools/`).
   - `evals/`: Chứa bài test (`tests/`), vết theo dõi (`traces/`), bảng điểm (`scorecards/`).
   - `apps/` & `packages/`: Chứa nguồn mã lệnh ứng dụng và thư viện dùng chung.

2. **Cấm tuyệt đối RhinoQ**:
   - Không import, cài đặt package, hoặc tham chiếu đến `rhinoq` / `@rhinoq/*`.
   - Chạy `node scripts/verify-no-rhinoq.mjs` để xác minh.

3. **Tenant Isolation**:
   - Mọi câu lệnh truy vấn dữ liệu bắt buộc lọc theo `workspace_id`.
   - Trả về `404` khi không tìm thấy hoặc không có quyền truy cập dữ liệu của tenant khác.

4. **Commit Policy**:
   - Chỉ commit khi người dùng (USER) đã xác nhận và đồng ý.
   - Cú pháp commit: `[YYYY-MM-DD] Commit #<N>: <Mô tả cập nhật>`.
