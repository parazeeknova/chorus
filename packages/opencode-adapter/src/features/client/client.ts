import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import { createOpencodeClient as createSDKClient } from "@opencode-ai/sdk/v2";

export type {
  Message,
  OpencodeClient,
  Part,
  PermissionRequest,
  Session,
} from "@opencode-ai/sdk/v2";

export interface ClientOptions {
  baseUrl?: string;
  directory?: string;
  experimental_workspaceID?: string;
}

export interface ClientResult {
  client: OpencodeClient;
}

export function createClient(options?: ClientOptions): ClientResult {
  const client = createSDKClient({
    baseUrl: options?.baseUrl as `${string}://${string}`,
    directory: options?.directory,
    experimental_workspaceID: options?.experimental_workspaceID,
  });

  return { client };
}
