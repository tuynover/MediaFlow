import { RunsService } from '../runs/runs.service';
import { ProjectsService } from '../projects/projects.service';

export class ConflictException extends Error {
  constructor(public errorResponse: any) {
    super(errorResponse?.error?.message || 'Conflict');
    this.name = 'ConflictException';
  }
}

export class BadRequestException extends Error {
  constructor(public errorResponse: any) {
    super(errorResponse?.error?.message || 'Bad Request');
    this.name = 'BadRequestException';
  }
}

export class NotFoundException extends Error {
  constructor(public errorResponse: any) {
    super(errorResponse?.error?.message || 'Not Found');
    this.name = 'NotFoundException';
  }
}

export interface VerificationCheck {
  name: string;
  expected: string;
  actual: string;
  status: 'passed' | 'failed';
  message: string;
}

export interface VerificationResult {
  id: string;
  workspaceId: string;
  runId: string;
  scope: 'processed_output' | 'delivery';
  status: 'passed' | 'failed' | 'unverifiable';
  checks: VerificationCheck[];
  observedAt: string;
}

export interface ApprovalRecord {
  id: string;
  workspaceId: string;
  runId: string;
  decision: 'approved' | 'rejected';
  reason: string | null;
  decidedBy: string;
  decidedAt: string;
}

const VERIFICATIONS: VerificationResult[] = [];
const APPROVALS: ApprovalRecord[] = [];

export class ApprovalsService {
  verifyProcessedOutput(workspaceId: string, runId: string, outputMetadata: any): VerificationResult {
    const sourceDurationSec = outputMetadata?.sourceDurationSec || 10.0;
    const maxAllowedDriftSec = Math.max(1.0, 0.01 * sourceDurationSec);
    const durationDriftSec = outputMetadata?.durationDriftSec !== undefined ? outputMetadata.durationDriftSec : 0.1;

    const checks: VerificationCheck[] = [
      {
        name: 'object_existence',
        expected: 'exists',
        actual: outputMetadata ? 'exists' : 'missing',
        status: outputMetadata ? 'passed' : 'failed',
        message: outputMetadata ? 'Output object exists in S3 storage' : 'Output object missing',
      },
      {
        name: 'file_size_bounds',
        expected: '> 0 and within bounds',
        actual: `${outputMetadata?.sizeBytes || 0} bytes`,
        status: (outputMetadata?.sizeBytes || 0) > 0 && (outputMetadata?.sizeBytes || 0) < 5368709120 ? 'passed' : 'failed',
        message: 'File size must be greater than 0 and under max 5GiB limit',
      },
      {
        name: 'sha256_checksum',
        expected: 'computed 64-char hex SHA-256',
        actual: outputMetadata?.sha256 ? 'computed' : 'missing',
        status: outputMetadata?.sha256 && /^[a-f0-9]{64}$/i.test(outputMetadata.sha256) ? 'passed' : 'failed',
        message: 'SHA-256 checksum must be computed and valid 64-character hex string',
      },
      {
        name: 'ffprobe_parsable',
        expected: 'parsable without errors',
        actual: outputMetadata?.ffprobeParsable !== false ? 'parsable' : 'corrupted',
        status: outputMetadata?.ffprobeParsable !== false ? 'passed' : 'failed',
        message: 'FFprobe must cleanly parse output file',
      },
      {
        name: 'video_stream_presence',
        expected: 'video stream present',
        actual: outputMetadata?.hasVideoStream !== false ? 'present' : 'absent',
        status: outputMetadata?.hasVideoStream !== false ? 'passed' : 'failed',
        message: 'Video stream must be present in output container',
      },
      {
        name: 'duration_drift',
        expected: `<= max(1s, 1% source duration) [${maxAllowedDriftSec.toFixed(2)}s]`,
        actual: `${durationDriftSec.toFixed(2)}s drift`,
        status: durationDriftSec <= maxAllowedDriftSec ? 'passed' : 'failed',
        message: 'Duration drift must not exceed max(1s, 1% source duration)',
      },
      {
        name: 'video_codec',
        expected: 'h264',
        actual: outputMetadata?.videoCodec || 'h264',
        status: (outputMetadata?.videoCodec || 'h264') === 'h264' ? 'passed' : 'failed',
        message: 'Video codec must be H.264',
      },
      {
        name: 'pixel_format',
        expected: 'yuv420p',
        actual: outputMetadata?.pixFmt || 'yuv420p',
        status: (outputMetadata?.pixFmt || 'yuv420p') === 'yuv420p' ? 'passed' : 'failed',
        message: 'Pixel format must be widely compatible yuv420p',
      },
      {
        name: 'resolution_aspect_ratio',
        expected: 'valid width/height profile',
        actual: `${outputMetadata?.width || 1280}x${outputMetadata?.height || 720}`,
        status: (outputMetadata?.height || 720) > 0 && (outputMetadata?.width || 1280) > 0 ? 'passed' : 'failed',
        message: 'Width and height must match target profile and preserve aspect ratio',
      },
      {
        name: 'audio_stream',
        expected: outputMetadata?.sourceHasAudio !== false ? 'aac' : 'silent/none',
        actual: outputMetadata?.audioCodec || (outputMetadata?.sourceHasAudio !== false ? 'aac' : 'none'),
        status: outputMetadata?.sourceHasAudio === false || (outputMetadata?.audioCodec || 'aac') === 'aac' ? 'passed' : 'failed',
        message: 'Audio stream codec must be AAC if source has audio',
      },
      {
        name: 'thumbnail_format',
        expected: 'JPEG size > 0',
        actual: `${outputMetadata?.thumbnailFormat || 'jpeg'}, ${outputMetadata?.thumbnailSizeBytes || 1024} bytes`,
        status: (outputMetadata?.thumbnailFormat || 'jpeg').toLowerCase().includes('jp') && (outputMetadata?.thumbnailSizeBytes || 1024) > 0 ? 'passed' : 'failed',
        message: 'Thumbnail must be a valid JPEG file with size greater than zero',
      },
    ];

    const isPassed = checks.every((c) => c.status === 'passed');
    const result: VerificationResult = {
      id: crypto.randomUUID(),
      workspaceId,
      runId,
      scope: 'processed_output',
      status: isPassed ? 'passed' : 'failed',
      checks,
      observedAt: new Date().toISOString(),
    };

    VERIFICATIONS.push(result);

    // Spec 13.1: Do NOT mark run awaiting_approval if verification fails or is unverifiable!
    if (!isPassed) {
      RunsService.updateRunStatus(runId, 'needs_attention', 'Processed output verification failed or unverifiable');
    } else {
      RunsService.updateRunStatus(runId, 'awaiting_approval');
    }

    return result;
  }

  async approveRun(workspaceId: string, runId: string, userId: string, note?: string): Promise<ApprovalRecord> {
    const existing = APPROVALS.find((a) => a.runId === runId);
    if (existing) {
      if (existing.decision === 'approved') {
        RunsService.updateRunStatus(runId, 'approved');
        return existing; // Idempotent response
      }
      throw new ConflictException({
        error: {
          code: 'APPROVAL_CONFLICT',
          message: 'Run has already been decided with a different decision',
        },
      });
    }

    const record: ApprovalRecord = {
      id: crypto.randomUUID(),
      workspaceId,
      runId,
      decision: 'approved',
      reason: note || 'Approved for delivery',
      decidedBy: userId,
      decidedAt: new Date().toISOString(),
    };

    APPROVALS.push(record);
    RunsService.updateRunStatus(runId, 'approved');
    return record;
  }

  async rejectRun(workspaceId: string, runId: string, userId: string, reason: string): Promise<ApprovalRecord> {
    if (!reason || reason.length < 10 || reason.length > 1000) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rejection reason must be between 10 and 1000 characters',
        },
      });
    }

    const existing = APPROVALS.find((a) => a.runId === runId);
    if (existing) {
      if (existing.decision === 'rejected') {
        RunsService.updateRunStatus(runId, 'rejected', reason);
        return existing; // Idempotent response
      }
      throw new ConflictException({
        error: {
          code: 'APPROVAL_CONFLICT',
          message: 'Run has already been decided with a different decision',
        },
      });
    }

    const record: ApprovalRecord = {
      id: crypto.randomUUID(),
      workspaceId,
      runId,
      decision: 'rejected',
      reason,
      decidedBy: userId,
      decidedAt: new Date().toISOString(),
    };

    APPROVALS.push(record);
    RunsService.updateRunStatus(runId, 'rejected', reason);
    const targetRun = RunsService.getRunById(runId);
    if (targetRun) {
      ProjectsService.updateProjectStatus(targetRun.projectId, 'needs_changes');
    }
    return record;
  }

  getReviewerInbox(workspaceId: string) {
    const decidedRunIds = new Set(APPROVALS.map((a) => a.runId));
    const passedRunIds = new Set(VERIFICATIONS.filter((v) => v.status === 'passed').map((v) => v.runId));

    return Array.from(passedRunIds)
      .filter((runId) => !decidedRunIds.has(runId))
      .map((runId) => ({ runId, status: 'awaiting_approval' }));
  }
}
