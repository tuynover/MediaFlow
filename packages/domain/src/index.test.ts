import { describe, it, expect } from 'vitest';
import {
  isValidProjectStateTransition,
  assertProjectStateTransition,
  StorageTimeoutError,
  ProviderHttpError,
  FFmpegUnexpectedCrashError,
  TransientIOError,
  InvalidMediaError,
  UnsupportedCodecError,
  CorruptedSourceError,
  ValidationError,
  CancellationRequestedError,
  PublishUncertainError,
  VerificationMismatchError,
  PermissionConfigError,
} from './index.ts';

describe('Media Project State Machine Domain Rules', () => {
  it('should allow valid transition from draft to uploading', () => {
    expect(isValidProjectStateTransition('draft', 'uploading')).toBe(true);
  });

  it('should allow valid transition from processing to awaiting_approval', () => {
    expect(isValidProjectStateTransition('processing', 'awaiting_approval')).toBe(true);
  });

  it('should reject invalid transition from draft to completed', () => {
    expect(isValidProjectStateTransition('draft', 'completed')).toBe(false);
  });

  it('should throw Error on invalid state transition assertion', () => {
    expect(() => assertProjectStateTransition('draft', 'completed')).toThrow(
      "Invalid project state transition from 'draft' to 'completed'"
    );
  });

  it('should classify automatic retryable errors with retryable=true and stable error code', () => {
    const storageErr = new StorageTimeoutError('MinIO connection timed out', new Error('ETIMEDOUT'));
    expect(storageErr.retryable).toBe(true);
    expect(storageErr.code).toBe('STORAGE_TIMEOUT');
    expect(storageErr.cause).toBeDefined();

    const http503 = new ProviderHttpError(503, 'Service unavailable');
    expect(http503.retryable).toBe(true);
    expect(http503.code).toBe('PROVIDER_HTTP_503');

    const crash = new FFmpegUnexpectedCrashError();
    expect(crash.retryable).toBe(true);
    expect(crash.code).toBe('FFMPEG_CRASH');

    const ioErr = new TransientIOError();
    expect(ioErr.retryable).toBe(true);
    expect(ioErr.code).toBe('TRANSIENT_IO_ERROR');
  });

  it('should classify non-retryable errors with retryable=false and stable error code', () => {
    const nonRetryableErrors = [
      new InvalidMediaError(),
      new UnsupportedCodecError(),
      new CorruptedSourceError(),
      new ValidationError(),
      new CancellationRequestedError(),
      new PublishUncertainError(),
      new VerificationMismatchError(),
      new PermissionConfigError(),
    ];

    for (const err of nonRetryableErrors) {
      expect(err.retryable).toBe(false);
      expect(err.code).toBeDefined();
      expect(typeof err.code).toBe('string');
      expect(err.publicMessage).toBeDefined();
    }
  });
});
