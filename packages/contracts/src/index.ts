import { z } from "zod";

export const repoProjectSchema = z.object({
  directory: z.string().min(1),
  worktree: z.string().min(1),
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
  sandboxes: z.array(z.string()).default([]),
});

export const repoContextSchema = repoProjectSchema.extend({
  branch: z.string().min(1).optional(),
});

export const boardSeedSchema = z.object({
  title: z.string().min(1),
  repo: repoContextSchema,
});

export const projectListResponseSchema = z.object({
  projects: z.array(repoProjectSchema),
});

export const modelSelectionSchema = z.object({
  providerID: z.string().min(1),
  modelID: z.string().min(1),
});

export const queueBoardPromptInputSchema = z.object({
  boardId: z.string().min(1),
  directory: z.string().min(1),
  projectId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  text: z.string().min(1),
  agent: z.string().min(1).optional(),
  model: modelSelectionSchema.optional(),
});

export const queueBoardPromptResponseSchema = z.object({
  boardId: z.string().min(1),
  sessionId: z.string().min(1),
  createdSession: z.boolean(),
  accepted: z.boolean(),
  timestamp: z.number(),
});

export type RepoProject = z.infer<typeof repoProjectSchema>;
export type RepoContext = z.infer<typeof repoContextSchema>;
export type BoardSeed = z.infer<typeof boardSeedSchema>;
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
export type ModelSelection = z.infer<typeof modelSelectionSchema>;
export type QueueBoardPromptInput = z.infer<typeof queueBoardPromptInputSchema>;
export type QueueBoardPromptResponse = z.infer<
  typeof queueBoardPromptResponseSchema
>;
