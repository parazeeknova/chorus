import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import { createOpencodeClient as createSDKClient } from "@opencode-ai/sdk/v2";
import { EventStream, normalizeEvent } from "./features/events/event-stream";
import { PermissionHandler } from "./features/permissions/permission-handler";
import { ProjectManager } from "./features/projects/project-manager";
import { RaceManager } from "./features/race/race-manager";
import { SessionManager } from "./features/session/session-manager";

export type {
  Event,
  Message,
  OpencodeClient,
  Part,
  PermissionRequest,
  Session,
  SessionStatus,
} from "@opencode-ai/sdk/v2";
export type { ClientOptions, ClientResult } from "./features/client/client";
export type {
  EventCallback,
  EventStreamHandle,
  NormalizedActivity,
  NormalizedAgentEvent,
} from "./features/events/event-stream";
export type {
  PermissionHandlerInput,
  PermissionReply,
} from "./features/permissions/permission-handler";
export type {
  ProjectLookupInput,
  RepoContext,
  RepoProject,
  RepoWorktree,
} from "./features/projects/project-manager";
export type { RaceConfig, RaceResult } from "./features/race/race-manager";
export type {
  SessionCommandInput,
  SessionCreateInput,
  SessionForkInput,
  SessionPromptAsyncInput,
  SessionPromptInput,
} from "./features/session/session-manager";

export function createClient(
  options?: import("./features/client/client").ClientOptions
): import("./features/client/client").ClientResult {
  const client = createSDKClient({
    baseUrl: options?.baseUrl as `${string}://${string}`,
    directory: options?.directory,
    experimental_workspaceID: options?.experimental_workspaceID,
  });

  return { client };
}

export class OpenCodeAdapter {
  readonly client: OpencodeClient;
  readonly sessions: SessionManager;
  readonly events: EventStream;
  readonly permissions: PermissionHandler;
  readonly projects: ProjectManager;
  readonly races: RaceManager;

  constructor(client: OpencodeClient) {
    this.client = client;
    this.sessions = new SessionManager(client);
    this.events = new EventStream(client);
    this.permissions = new PermissionHandler(client);
    this.projects = new ProjectManager(client);
    this.races = new RaceManager(client);
  }

  static from(options?: {
    baseUrl?: string;
    directory?: string;
    experimental_workspaceID?: string;
  }): OpenCodeAdapter {
    const { client } = createClient(options);
    return new OpenCodeAdapter(client);
  }

  normalize = normalizeEvent;
}
