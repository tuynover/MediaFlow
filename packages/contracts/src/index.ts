import { z } from 'zod';

// Roles
export const UserRoleSchema = z.enum(['producer', 'reviewer', 'operator']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// User DTO
export const UserSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  roles: z.array(UserRoleSchema),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

// Workspace DTO
export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  createdAt: z.string(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

// Media Project Status
export const ProjectStatusSchema = z.enum([
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
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// Project DTO
export const MediaProjectSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  createdBy: z.string().uuid(),
  name: z.string().min(1).max(160),
  status: ProjectStatusSchema,
  activeRunId: z.string().uuid().nullable(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MediaProject = z.infer<typeof MediaProjectSchema>;

// Create Project DTO
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(160, 'Project name is too long'),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// Login DTO
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// Standard Error Envelope
export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
