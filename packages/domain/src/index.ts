import { ProjectStatus } from '@mediaflow/contracts';

// Valid Project Status Transitions
const VALID_PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['uploading', 'cancelled'],
  uploading: ['uploaded', 'failed', 'cancelled'],
  uploaded: ['queued', 'failed', 'cancelled'],
  queued: ['processing', 'cancelling', 'cancelled', 'failed'],
  processing: ['awaiting_approval', 'failed', 'needs_attention', 'cancelling', 'cancelled'],
  awaiting_approval: ['publishing', 'needs_changes', 'cancelling', 'cancelled'],
  needs_changes: ['uploading', 'cancelled'],
  publishing: ['completed', 'failed', 'needs_attention'],
  completed: [],
  failed: ['queued', 'draft'],
  needs_attention: ['publishing', 'queued', 'failed'],
  cancelling: ['cancelled', 'failed'],
  cancelled: [],
};

export function isValidProjectStateTransition(current: ProjectStatus, next: ProjectStatus): boolean {
  if (current === next) return true;
  const allowed = VALID_PROJECT_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export function assertProjectStateTransition(current: ProjectStatus, next: ProjectStatus): void {
  if (!isValidProjectStateTransition(current, next)) {
    throw new Error(`Invalid project state transition from '${current}' to '${next}'`);
  }
}

// MediaFlow Base Error Class with stable code, retryable flag, publicMessage, and internal cause
export class MediaFlowError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly publicMessage: string;
  public readonly cause?: unknown;

  constructor(code: string, retryable: boolean, publicMessage: string, cause?: unknown) {
    super(publicMessage);
    this.name = 'MediaFlowError';
    this.code = code;
    this.retryable = retryable;
    this.publicMessage = publicMessage;
    this.cause = cause;
  }
}

// Automatic Retryable Errors (retryable = true)
export class StorageTimeoutError extends MediaFlowError {
  constructor(publicMessage = 'Transient storage timeout', cause?: unknown) {
    super('STORAGE_TIMEOUT', true, publicMessage, cause);
  }
}

export class ProviderHttpError extends MediaFlowError {
  constructor(status: number, publicMessage = 'Transient provider HTTP error', cause?: unknown) {
    super(`PROVIDER_HTTP_${status}`, true, publicMessage, cause);
  }
}

export class FFmpegUnexpectedCrashError extends MediaFlowError {
  constructor(publicMessage = 'FFmpeg process terminated unexpectedly', cause?: unknown) {
    super('FFMPEG_CRASH', true, publicMessage, cause);
  }
}

export class TransientIOError extends MediaFlowError {
  constructor(publicMessage = 'Transient filesystem I/O error', cause?: unknown) {
    super('TRANSIENT_IO_ERROR', true, publicMessage, cause);
  }
}

// Non-Retryable Errors (retryable = false)
export class InvalidMediaError extends MediaFlowError {
  constructor(publicMessage = 'File is not a valid video media format', cause?: unknown) {
    super('INVALID_MEDIA', false, publicMessage, cause);
  }
}

export class UnsupportedCodecError extends MediaFlowError {
  constructor(publicMessage = 'Video codec is unsupported', cause?: unknown) {
    super('UNSUPPORTED_CODEC', false, publicMessage, cause);
  }
}

export class CorruptedSourceError extends MediaFlowError {
  constructor(publicMessage = 'Source video file is corrupted', cause?: unknown) {
    super('CORRUPTED_SOURCE', false, publicMessage, cause);
  }
}

export class ValidationError extends MediaFlowError {
  constructor(publicMessage = 'Validation failed', cause?: unknown) {
    super('VALIDATION_ERROR', false, publicMessage, cause);
  }
}

export class CancellationRequestedError extends MediaFlowError {
  constructor(publicMessage = 'Operation cancelled by user', cause?: unknown) {
    super('CANCELLED', false, publicMessage, cause);
  }
}

export class PublishUncertainError extends MediaFlowError {
  constructor(publicMessage = 'Publish operation result is uncertain', cause?: unknown) {
    super('PUBLISH_UNCERTAIN', false, publicMessage, cause);
  }
}

export class VerificationMismatchError extends MediaFlowError {
  constructor(publicMessage = 'Output checksum or metadata verification mismatch', cause?: unknown) {
    super('VERIFICATION_MISMATCH', false, publicMessage, cause);
  }
}

export class PermissionConfigError extends MediaFlowError {
  constructor(publicMessage = 'Permission or configuration error', cause?: unknown) {
    super('PERMISSION_ERROR', false, publicMessage, cause);
  }
}
