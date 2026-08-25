// Spec 19: Log Redaction Security Guard (Redacts authorization, cookie, set-cookie, accessKey, secretKey, and presigned query strings)
export const SENSITIVE_KEYS = [
  'authorization',
  'cookie',
  'set-cookie',
  'accesskey',
  'secretkey',
  'minio_root_password',
  'password',
  'x-amz-credential',
  'x-amz-signature',
];

export function redactSensitiveData(obj: any): any {
  if (!obj) return obj;

  if (typeof obj === 'string') {
    // Redact presigned URL query parameters (X-Amz-Signature, X-Amz-Credential, etc.)
    if (obj.includes('X-Amz-Signature=') || obj.includes('X-Amz-Credential=')) {
      return obj.split('?')[0] + '?[REDACTED_PRESIGNED_QUERY]';
    }
    return obj;
  }

  if (typeof obj !== 'object') return obj;

  const redacted: Record<string, any> = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k))) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = redactSensitiveData(obj[key]);
    }
  }
  return redacted;
}

export class SafeLogger {
  static info(message: string, meta?: any) {
    const cleanMeta = meta ? redactSensitiveData(meta) : '';
    console.log(`ℹ️ [INFO] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  }

  static warn(message: string, meta?: any) {
    const cleanMeta = meta ? redactSensitiveData(meta) : '';
    console.warn(`⚠️ [WARN] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  }

  static error(message: string, meta?: any) {
    const cleanMeta = meta ? redactSensitiveData(meta) : '';
    console.error(`🚨 [ERROR] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  }
}
