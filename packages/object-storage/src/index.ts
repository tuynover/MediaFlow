export interface ObjectStorageConfig {
  endpoint: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class MinioObjectStorageAdapter {
  private endpoint: string;

  constructor(config: ObjectStorageConfig) {
    this.endpoint = config.endpoint || 'http://localhost:9000';
  }

  async createMultipartUpload(bucket: string, objectKey: string, mediaType: string): Promise<string> {
    try {
      const { S3Client, CreateMultipartUploadCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({ endpoint: this.endpoint, region: 'us-east-1', forcePathStyle: true });
      const response = await client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: objectKey, ContentType: mediaType }));
      return response.UploadId || `upload_id_${Date.now()}`;
    } catch (err) {
      return `upload_id_${Date.now()}`;
    }
  }

  async getPresignedPartUrl(
    bucket: string,
    objectKey: string,
    uploadId: string,
    partNumber: number,
    expiresInSeconds = 600
  ): Promise<string> {
    try {
      const { S3Client, UploadPartCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const client = new S3Client({ endpoint: this.endpoint, region: 'us-east-1', forcePathStyle: true });
      const command = new UploadPartCommand({ Bucket: bucket, Key: objectKey, UploadId: uploadId, PartNumber: partNumber });
      return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      return `${this.endpoint}/${bucket}/${objectKey}?uploadId=${uploadId}&partNumber=${partNumber}`;
    }
  }

  async getPresignedDownloadUrl(bucket: string, objectKey: string, expiresInSeconds = 300): Promise<string> {
    try {
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const client = new S3Client({ endpoint: this.endpoint, region: 'us-east-1', forcePathStyle: true });
      const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
      return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      return `${this.endpoint}/${bucket}/${objectKey}`;
    }
  }

  async listParts(bucket: string, objectKey: string, uploadId: string) {
    try {
      const { S3Client, ListPartsCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({ endpoint: this.endpoint, region: 'us-east-1', forcePathStyle: true });
      const response = await client.send(new ListPartsCommand({ Bucket: bucket, Key: objectKey, UploadId: uploadId }));
      return (response.Parts || []).map((p) => ({
        partNumber: p.PartNumber || 0,
        etag: p.ETag ? p.ETag.replace(/"/g, '') : '',
        sizeBytes: p.Size || 0,
      }));
    } catch (err) {
      return [];
    }
  }

  async completeMultipartUpload(
    bucket: string,
    objectKey: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[]
  ): Promise<void> {
    try {
      const { S3Client, CompleteMultipartUploadCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({ endpoint: this.endpoint, region: 'us-east-1', forcePathStyle: true });
      await client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: objectKey,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
          },
        })
      );
    } catch (err) {
      // Dev mode fallback
    }
  }

  async abortMultipartUpload(bucket: string, objectKey: string, uploadId: string): Promise<void> {
    try {
      const { S3Client, AbortMultipartUploadCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({ endpoint: this.endpoint, region: 'us-east-1', forcePathStyle: true });
      await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: objectKey, UploadId: uploadId }));
    } catch (err) {
      // Dev mode fallback
    }
  }
}
