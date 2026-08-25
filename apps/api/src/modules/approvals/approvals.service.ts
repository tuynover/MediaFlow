import { RunsService } from '../runs/runs.service';

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
    const checks: VerificationCheck[] = [
      {
        name: 'object_existence',
        expected: 'exists',
        actual: outputMetadata ? 'exists' : 'missing',
        status: outputMetadata ? 'passed' : 'failed',
        message: outputMetadata ? 'Output object exists in storage' : 'Output object missing',
      },
      {
        name: 'video_codec',
        expected: 'h264',
        actual: outputMetadata?.videoCodec || 'none',
        status: outputMetadata?.videoCodec === 'h264' ? 'passed' : 'failed',
        message: 'Video codec must be H.264',
      },
      {
        name: 'file_size',
        expected: '> 0',
        actual: `${outputMetadata?.sizeBytes || 0} bytes`,
        status: (outputMetadata?.sizeBytes || 0) > 0 ? 'passed' : 'failed',
        message: 'File size must be greater than zero',
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
