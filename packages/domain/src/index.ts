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
