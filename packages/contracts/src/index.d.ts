import { z } from 'zod';
export declare const UserRoleSchema: z.ZodEnum<["producer", "reviewer", "operator"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    roles: z.ZodArray<z.ZodEnum<["producer", "reviewer", "operator"]>, "many">;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    workspaceId: string;
    email: string;
    displayName: string;
    roles: ("producer" | "reviewer" | "operator")[];
    createdAt: string;
}, {
    id: string;
    workspaceId: string;
    email: string;
    displayName: string;
    roles: ("producer" | "reviewer" | "operator")[];
    createdAt: string;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const WorkspaceSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    slug: string;
    name: string;
}, {
    id: string;
    createdAt: string;
    slug: string;
    name: string;
}>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export declare const ProjectStatusSchema: z.ZodEnum<["draft", "uploading", "uploaded", "queued", "processing", "awaiting_approval", "needs_changes", "publishing", "completed", "failed", "needs_attention", "cancelling", "cancelled"]>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export declare const MediaProjectSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    createdBy: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<["draft", "uploading", "uploaded", "queued", "processing", "awaiting_approval", "needs_changes", "publishing", "completed", "failed", "needs_attention", "cancelling", "cancelled"]>;
    activeRunId: z.ZodNullable<z.ZodString>;
    version: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "uploading" | "uploaded" | "queued" | "processing" | "awaiting_approval" | "needs_changes" | "publishing" | "completed" | "failed" | "needs_attention" | "cancelling" | "cancelled";
    id: string;
    workspaceId: string;
    createdAt: string;
    name: string;
    createdBy: string;
    activeRunId: string | null;
    version: number;
    updatedAt: string;
}, {
    status: "draft" | "uploading" | "uploaded" | "queued" | "processing" | "awaiting_approval" | "needs_changes" | "publishing" | "completed" | "failed" | "needs_attention" | "cancelling" | "cancelled";
    id: string;
    workspaceId: string;
    createdAt: string;
    name: string;
    createdBy: string;
    activeRunId: string | null;
    version: number;
    updatedAt: string;
}>;
export type MediaProject = z.infer<typeof MediaProjectSchema>;
export declare const CreateProjectSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export declare const ErrorEnvelopeSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        requestId?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        requestId?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        requestId?: string | undefined;
        details?: Record<string, unknown> | undefined;
    };
}, {
    error: {
        code: string;
        message: string;
        requestId?: string | undefined;
        details?: Record<string, unknown> | undefined;
    };
}>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
//# sourceMappingURL=index.d.ts.map