import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  integer,
  numeric,
  jsonb,
  bigserial,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// 1. Workspaces
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Users
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    roles: text('roles').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceEmailIdx: uniqueIndex('users_workspace_email_idx').on(table.workspaceId, table.email),
  })
);

// 3. Media Projects
export const mediaProjects = pgTable(
  'media_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    name: text('name').notNull(),
    status: text('status').notNull().default('draft'),
    activeRunId: uuid('active_run_id'),
    version: bigint('version', { mode: 'number' }).notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceProjectIdx: index('media_projects_workspace_idx').on(table.workspaceId),
  })
);

// 4. Upload Sessions
export const uploadSessions = pgTable('upload_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  projectId: uuid('project_id').notNull().references(() => mediaProjects.id),
  providerUploadId: text('provider_upload_id').notNull(),
  bucket: text('bucket').notNull(),
  objectKey: text('object_key').notNull(),
  originalFilename: text('original_filename').notNull(),
  declaredMediaType: text('declared_media_type').notNull(),
  declaredSizeBytes: bigint('declared_size_bytes', { mode: 'number' }).notNull(),
  partSizeBytes: integer('part_size_bytes').notNull().default(16777216),
  status: text('status').notNull().default('initiated'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 5. Upload Parts
export const uploadParts = pgTable(
  'upload_parts',
  {
    uploadSessionId: uuid('upload_session_id').notNull().references(() => uploadSessions.id),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    partNumber: integer('part_number').notNull(),
    etag: text('etag').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.uploadSessionId, table.partNumber] }),
  })
);

// 6. Media Assets
export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    projectId: uuid('project_id').notNull().references(() => mediaProjects.id),
    runId: uuid('run_id'),
    kind: text('kind').notNull(),
    profile: text('profile').notNull(),
    bucket: text('bucket').notNull(),
    objectKey: text('object_key').notNull(),
    mediaType: text('media_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    sha256: text('sha256'),
    durationMs: bigint('duration_ms', { mode: 'number' }),
    width: integer('width'),
    height: integer('height'),
    videoCodec: text('video_codec'),
    audioCodec: text('audio_codec'),
    state: text('state').notNull().default('available'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bucketObjectIdx: uniqueIndex('media_assets_bucket_object_idx').on(table.bucket, table.objectKey),
    workspaceProjectIdx: index('media_assets_workspace_project_idx').on(table.workspaceId, table.projectId),
  })
);

// 7. Processing Runs
export const processingRuns = pgTable(
  'processing_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    projectId: uuid('project_id').notNull().references(() => mediaProjects.id),
    sourceAssetId: uuid('source_asset_id').notNull().references(() => mediaAssets.id),
    sequence: integer('sequence').notNull(),
    status: text('status').notNull().default('queued'),
    queueJobId: text('queue_job_id').notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    progressPercent: numeric('progress_percent', { precision: 5, scale: 2 }).notNull().default('0.00'),
    currentStep: text('current_step'),
    cancelRequestedAt: timestamp('cancel_requested_at', { withTimezone: true }),
    cancelRequestedBy: uuid('cancel_requested_by'),
    cancelReason: text('cancel_reason'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectSeqIdx: uniqueIndex('processing_runs_project_seq_idx').on(table.projectId, table.sequence),
  })
);

// 8. Processing Steps
export const processingSteps = pgTable(
  'processing_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    runId: uuid('run_id').notNull().references(() => processingRuns.id),
    name: text('name').notNull(),
    ordinal: integer('ordinal').notNull(),
    status: text('status').notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    progressPercent: numeric('progress_percent', { precision: 5, scale: 2 }).notNull().default('0.00'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    outputAssetId: uuid('output_asset_id'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    runStepNameIdx: uniqueIndex('processing_steps_run_name_idx').on(table.runId, table.name),
  })
);

// 9. Approvals
export const approvals = pgTable(
  'approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    runId: uuid('run_id').notNull().references(() => processingRuns.id),
    decision: text('decision').notNull(),
    reason: text('reason'),
    decidedBy: uuid('decided_by').notNull().references(() => users.id),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    runApprovalIdx: uniqueIndex('approvals_run_idx').on(table.runId),
  })
);

// 10. Publish Operations
export const publishOperations = pgTable(
  'publish_operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    runId: uuid('run_id').notNull().references(() => processingRuns.id),
    sourceAssetId: uuid('source_asset_id').notNull().references(() => mediaAssets.id),
    destinationBucket: text('destination_bucket').notNull(),
    destinationKey: text('destination_key').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestFingerprint: text('request_fingerprint').notNull(),
    state: text('state').notNull().default('pending'),
    providerEvidence: jsonb('provider_evidence'),
    requestedAt: timestamp('requested_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    lastErrorCode: text('last_error_code'),
    lastErrorMessage: text('last_error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idempotencyIdx: uniqueIndex('publish_ops_idempotency_idx').on(table.workspaceId, table.idempotencyKey),
    destObjectIdx: uniqueIndex('publish_ops_dest_object_idx').on(table.destinationBucket, table.destinationKey),
  })
);

// 11. Verification Results
export const verificationResults = pgTable('verification_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  runId: uuid('run_id').notNull().references(() => processingRuns.id),
  scope: text('scope').notNull(),
  status: text('status').notNull(),
  checks: jsonb('checks').notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
});

// 12. Project Events
export const projectEvents = pgTable(
  'project_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
    projectId: uuid('project_id').notNull().references(() => mediaProjects.id),
    runId: uuid('run_id'),
    type: text('type').notNull(),
    actorType: text('actor_type').notNull(),
    actorId: uuid('actor_id'),
    data: jsonb('data').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceProjectSeqIdx: index('project_events_workspace_project_idx').on(table.workspaceId, table.projectId, table.id),
  })
);

// 13. Outbox Events
export const outboxEvents = pgTable('outbox_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  topic: text('topic').notNull(),
  dedupeKey: text('dedupe_key').notNull().unique(),
  payload: jsonb('payload').notNull(),
  availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
  attemptCount: integer('attempt_count').notNull().default(0),
  claimedUntil: timestamp('claimed_until', { withTimezone: true }),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
