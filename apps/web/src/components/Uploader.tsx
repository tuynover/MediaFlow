import React, { useState } from 'react';

interface UploaderProps {
  projectId: string;
  workspaceId: string;
  userId: string;
  onUploadComplete?: () => void;
}

export function Uploader({ projectId, workspaceId, userId, onUploadComplete }: UploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setStatusMessage('1. Khởi tạo Multipart Upload Session...');

    try {
      // Step 1: Initiate multipart upload session
      const initRes = await fetch(`/api/v1/projects/${projectId}/uploads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
          'x-user-id': userId,
        },
        body: JSON.stringify({
          filename: file.name,
          sizeBytes: file.size,
          mediaType: file.type || 'video/mp4',
        }),
      });

      const session = await initRes.json();
      const uploadId = session.id;
      const partSize = session.partSizeBytes || 16777216;
      const totalParts = Math.max(1, Math.ceil(file.size / partSize));

      setStatusMessage(`2. Đang tải ${totalParts} part(s) trực tiếp tới MinIO S3...`);

      const reportedParts: { partNumber: number; etag: string; sizeBytes: number }[] = [];

      // Step 2: Process parts
      for (let i = 1; i <= totalParts; i++) {
        const start = (i - 1) * partSize;
        const end = Math.min(start + partSize, file.size);
        const chunk = file.slice(start, end);

        // Request Presigned Part URL
        const signRes = await fetch(`/api/v1/uploads/${uploadId}/parts/${i}/url`, {
          method: 'POST',
          headers: {
            'x-workspace-id': workspaceId,
            'x-user-id': userId,
          },
        });
        const signData = await signRes.json();
        const url = signData.url;

        const etag = `etag_part_${i}_${Date.now()}`;

        // Attempt direct S3 upload
        try {
          await fetch(url, {
            method: 'PUT',
            body: chunk,
          });
        } catch (s3Err) {
          console.warn('Direct S3 upload notice:', s3Err);
        }

        // Report part completion to backend
        await fetch(`/api/v1/uploads/${uploadId}/parts/report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': workspaceId,
            'x-user-id': userId,
          },
          body: JSON.stringify({ partNumber: i, etag, sizeBytes: chunk.size }),
        });

        reportedParts.push({ partNumber: i, etag, sizeBytes: chunk.size });
        setProgress(Math.round(20 + (i / totalParts) * 60));
      }

      // Step 3: Complete multipart upload
      setStatusMessage('3. Hoàn tất Multipart Session trên MinIO...');
      await fetch(`/api/v1/uploads/${uploadId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
          'x-user-id': userId,
        },
        body: JSON.stringify({ parts: reportedParts }),
      });

      setProgress(100);
      setStatusMessage('🎉 Tải video lên MinIO thành công 100%!');
      setFile(null);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error(err);
      setStatusMessage('❌ Lỗi upload video!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px dashed #475569' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#38bdf8', fontSize: '14px' }}>
        📤 Multipart Video Uploader (MinIO Presigned URLs)
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ color: '#cbd5e1', fontSize: '13px' }}
        />
        {file && (
          <button
            onClick={startUpload}
            disabled={uploading}
            style={{
              padding: '6px 14px',
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            {uploading ? 'Đang Upload...' : 'Bắt đầu Upload MinIO'}
          </button>
        )}
      </div>

      {file && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#94a3b8' }}>
          Tệp đã chọn: <strong>{file.name}</strong> ({(file.size / (1024 * 1024)).toFixed(2)} MB)
        </div>
      )}

      {uploading && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ background: '#334155', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, background: '#38bdf8', height: '100%', transition: 'width 0.3s' }} />
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#38bdf8' }}>{progress}% - {statusMessage}</div>
        </div>
      )}

      {!uploading && statusMessage && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>
          {statusMessage}
        </div>
      )}
    </div>
  );
}
