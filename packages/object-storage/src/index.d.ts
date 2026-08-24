export interface ObjectStorageConfig {
    endpoint: string;
    region?: string;
    accessKeyId: string;
    secretAccessKey: string;
}
export declare class MinioObjectStorageAdapter {
    private endpoint;
    constructor(config: ObjectStorageConfig);
    createMultipartUpload(bucket: string, objectKey: string, mediaType: string): Promise<string>;
    getPresignedPartUrl(bucket: string, objectKey: string, uploadId: string, partNumber: number, expiresInSeconds?: number): Promise<string>;
    getPresignedDownloadUrl(bucket: string, objectKey: string, expiresInSeconds?: number): Promise<string>;
    listParts(bucket: string, objectKey: string, uploadId: string): Promise<{
        partNumber: number;
        etag: string;
        sizeBytes: number;
    }[]>;
    completeMultipartUpload(bucket: string, objectKey: string, uploadId: string, parts: {
        partNumber: number;
        etag: string;
    }[]): Promise<void>;
    abortMultipartUpload(bucket: string, objectKey: string, uploadId: string): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map