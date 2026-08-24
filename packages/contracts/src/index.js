"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorEnvelopeSchema = exports.LoginSchema = exports.CreateProjectSchema = exports.MediaProjectSchema = exports.ProjectStatusSchema = exports.WorkspaceSchema = exports.UserSchema = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
// Roles
exports.UserRoleSchema = zod_1.z.enum(['producer', 'reviewer', 'operator']);
// User DTO
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    workspaceId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string(),
    roles: zod_1.z.array(exports.UserRoleSchema),
    createdAt: zod_1.z.string(),
});
// Workspace DTO
exports.WorkspaceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    slug: zod_1.z.string(),
    name: zod_1.z.string(),
    createdAt: zod_1.z.string(),
});
// Media Project Status
exports.ProjectStatusSchema = zod_1.z.enum([
    'draft',
    'uploading',
    'uploaded',
    'queued',
    'processing',
    'awaiting_approval',
    'needs_changes',
    'publishing',
    'completed',
    'failed',
    'needs_attention',
    'cancelling',
    'cancelled',
]);
// Project DTO
exports.MediaProjectSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    workspaceId: zod_1.z.string().uuid(),
    createdBy: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(160),
    status: exports.ProjectStatusSchema,
    activeRunId: zod_1.z.string().uuid().nullable(),
    version: zod_1.z.number(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
// Create Project DTO
exports.CreateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Project name is required').max(160, 'Project name is too long'),
});
// Login DTO
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// Standard Error Envelope
exports.ErrorEnvelopeSchema = zod_1.z.object({
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        requestId: zod_1.z.string().optional(),
        details: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
});
//# sourceMappingURL=index.js.map