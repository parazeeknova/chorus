import {
  type WorkspaceSnapshot,
  workspaceMutationSchema,
} from "@chorus/contracts";
import { Elysia, t } from "elysia";
import type { WsClientManager } from "../events/broadcaster";
import type { WorkspaceStore } from "../workspace/store";

export function createWorkspaceMessage(snapshot: WorkspaceSnapshot) {
  return JSON.stringify({
    type: "workspace.updated",
    payload: snapshot,
    timestamp: Date.now(),
  });
}

export function createWorkspaceRoutes(
  workspaceStore: WorkspaceStore,
  wsManager: WsClientManager
) {
  return new Elysia()
    .get("/workspace", () => workspaceStore.getSnapshot())
    .post(
      "/workspace/mutations",
      async ({ body, set }) => {
        const parsed = workspaceMutationSchema.safeParse(body);
        if (!parsed.success) {
          set.status = 422;
          return {
            code: "invalid_workspace_mutation",
            issues: parsed.error.issues,
          };
        }

        const snapshot = await workspaceStore.applyMutation(parsed.data);
        wsManager.broadcastRaw(createWorkspaceMessage(snapshot));
        return snapshot;
      },
      {
        body: t.Any(),
      }
    );
}
