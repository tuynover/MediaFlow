# ⚠️ MediaFlow Baseline v1 — Known Limitations & System Boundaries

Tài liệu này công khai các giới hạn kĩ thuật của phiên bản **MediaFlow Baseline v1**:

---

## 1. Giới hạn Worker & Concurrency local
- Môi trường local baseline chạy đúng **một Media Worker replica** với BullMQ worker concurrency bằng `2`.
- Giới hạn tối đa hai luồng transcode đồng thời trong cấu hình local.
- Phiên bản v1 chưa xây dựng distributed resource semaphore toàn cục khi mở rộng scale nhiều worker replicas.

## 2. Quản lý Session Upload
- Trình upload resume phụ thuộc vào việc Multipart Upload Session chưa bị hết hạn (hạn mặc định 24 giờ).
- Nếu session bị `expired` hoặc `aborted`, người dùng phải khởi tạo lại luồng upload cho tệp nguồn.

## 3. Mã hóa & Định dạng Container Media
- Khả năng xử lý media phụ thuộc vào các build nén mã đi kèm của binary `ffprobe` và `FFmpeg`.
- Định dạng container ưu tiên hỗ trợ: MP4, MOV, MKV, WebM với chuẩn video H.264/yuv420p và audio AAC.

## 4. Vùng lưu trữ Delivery Bucket
- Vùng lưu trữ `mediaflow-delivery` trong bản baseline v1 là publish target giả lập lưu trên MinIO, không phải là hệ thống CDN thương mại thật.

## 5. Cờ Demo Mode & Failure Lab
- Failure Lab và các kịch bản lỗi FL-01 đến FL-06 chỉ dành riêng cho môi trường đánh giá/demo (`MEDIAFLOW_DEMO_MODE=true` VÀ `NODE_ENV!=production`).
- Server sẽ ngắt và từ chối khởi chạy nếu bật Demo Mode trong môi trường production.
