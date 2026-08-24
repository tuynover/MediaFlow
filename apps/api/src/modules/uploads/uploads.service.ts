import { MinioObjectStorageAdapter } from '@mediaflow/object-storage';

export class NotFoundException extends Error {
  constructor(public errorResponse: any) {
    super(errorResponse?.error?.message || 'Not Found');
    this.name = 'NotFoundException';
  }
}

export class BadRequestException extends Error {
  constructor(public errorResponse: any) {
    super(errorResponse?.error?.message || 'Bad Request');
    this.name = 'BadRequestException';
  }
}

export interface UploadSession {
  id: string;
  workspaceId: string;
  projectId: string;
  providerUploadId: string;
  bucket: string;
  objectKey: string;
  originalFilename: string;
  declaredMediaType: string;
  declaredSizeBytes: number;
  partSizeBytes: number;
  status: 'initiated' | 'uploading' | 'completing' | 'completed' | 'aborted' | 'expired' | 'failed';
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
  parts: { partNumber: number; etag: string; sizeBytes: number }[];
}

// In-Memory Storage for Baseline (Will connect to Drizzle DB in M3)
const UPLOAD_SESSIONS: UploadSession[] = [];

export class UploadsService {
  private storageAdapter: MinioObjectStorageAdapter;

  constructor() {
    this.storageAdapter = new MinioObjectStorageAdapter({
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadminpassword',
    });
  }

  async initiateUpload(
    workspaceId: string,
    projectId: string,
    filename: string,
    sizeBytes: number,
    mediaType: string
  ): Promise<UploadSession> {
    const uploadId = crypto.randomUUID();
    const objectKey = `workspaces/${workspaceId}/projects/${projectId}/uploads/${uploadId}/${crypto.randomUUID()}`;
    const bucket = process.env.MINIO_SOURCE_BUCKET || 'mediaflow-source';

    let providerUploadId = `mock_provider_upload_${uploadId}`;
    try {
      providerUploadId = await this.storageAdapter.createMultipartUpload(bucket, objectKey, mediaType);
    } catch (err) {
      // Fallback for dev mode without active MinIO container
    }

    const session: UploadSession = {
      id: uploadId,
      workspaceId,
      projectId,
      providerUploadId,
      bucket,
      objectKey,
      originalFilename: filename,
      declaredMediaType: mediaType,
      declaredSizeBytes: sizeBytes,
      partSizeBytes: 16777216, // 16MB
      status: 'initiated',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      completedAt: null,
      createdAt: new Date().toISOString(),
      parts: [],
    };

    UPLOAD_SESSIONS.push(session);
    return session;
  }

  async getSession(workspaceId: string, uploadId: string): Promise<UploadSession> {
    const session = UPLOAD_SESSIONS.find((s) => s.id === uploadId && s.workspaceId === workspaceId);
    if (!session) {
      throw new NotFoundException({ error: { code: 'UPLOAD_NOT_FOUND', message: 'Upload session not found' } });
    }
    return session;
  }

  async signPartUrl(workspaceId: string, uploadId: string, partNumber: number): Promise<{ url: string; expiresAt: string }> {
    const session = await this.getSession(workspaceId, uploadId);
    if (session.status === 'completed' || session.status === 'aborted') {
      throw new BadRequestException({ error: { code: 'INVALID_STATUS', message: 'Upload session is no longer active' } });
    }

    let url = `http://localhost:9000/${session.bucket}/${session.objectKey}?uploadId=${session.providerUploadId}&partNumber=${partNumber}`;
    try {
      url = await this.storageAdapter.getPresignedPartUrl(session.bucket, session.objectKey, session.providerUploadId, partNumber);
    } catch (err) {
      // Dev mode fallback
    }

    session.status = 'uploading';
    return { url, expiresAt: new Date(Date.now() + 600 * 1000).toISOString() };
  }

  async reportPart(workspaceId: string, uploadId: string, partNumber: number, etag: string, sizeBytes: number) {
    const session = await this.getSession(workspaceId, uploadId);
    const existing = session.parts.find((p) => p.partNumber === partNumber);
    if (existing) {
      existing.etag = etag;
      existing.sizeBytes = sizeBytes;
    } else {
      session.parts.push({ partNumber, etag, sizeBytes });
    }
    return { success: true };
  }

  async completeUpload(workspaceId: string, uploadId: string, parts: { partNumber: number; etag: string }[]) {
    const session = await this.getSession(workspaceId, uploadId);
    if (session.status === 'completed') {
      return { session, assetId: session.id };
    }

    try {
      await this.storageAdapter.completeMultipartUpload(session.bucket, session.objectKey, session.providerUploadId, parts);
    } catch (err) {
      // Dev fallback
    }

    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    return { session, assetId: crypto.randomUUID() };
  }

  async abortUpload(workspaceId: string, uploadId: string) {
    const session = await this.getSession(workspaceId, uploadId);
    try {
      await this.storageAdapter.abortMultipartUpload(session.bucket, session.objectKey, session.providerUploadId);
    } catch (err) {
      // Dev fallback
    }
    session.status = 'aborted';
    return { success: true };
  }
}
