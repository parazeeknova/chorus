import type {
  BoardSeed,
  WorkspaceBoard as ContractWorkspaceBoard,
  WorkspaceHistoryEntry as ContractWorkspaceHistoryEntry,
  WorkspacePreferences as ContractWorkspacePreferences,
  ProjectListResponse,
  QueueBoardPromptResponse,
  RepoProject,
} from "@chorus/contracts";
import type { NormalizedAgentEvent } from "@chorus/oc-adapter";
import type { Columns, Task } from "@/features/kanban/components/kanban";

export type WorkspaceProject = ProjectListResponse["projects"][number];
export type WorkspaceBoardSeed = BoardSeed;

export type BoardSessionState =
  | "uninitialized"
  | "starting"
  | "active"
  | "error";

export type WorkspaceBoard = ContractWorkspaceBoard;
export type WorkspaceHistoryEntry = ContractWorkspaceHistoryEntry;
export type WorkspacePreferences = ContractWorkspacePreferences;

export interface PromptSubmissionResult extends QueueBoardPromptResponse {
  task: Task;
}

export interface AgentEventEnvelope {
  payload: NormalizedAgentEvent;
  timestamp: number;
  type: string;
}

export interface WorkspaceContextValue {
  boards: WorkspaceBoard[];
  clearSelection: () => void;
  createBoardFromHistory: (entry: WorkspaceHistoryEntry) => void;
  createBoardFromProject: (project: RepoProject) => void;
  dismissComposerHint: () => void;
  isOpeningFolder: boolean;
  isQueueingPrompt: boolean;
  loadProjects: () => Promise<void>;
  openFolder: () => Promise<void>;
  preferences: WorkspacePreferences;
  previousWorkspaces: WorkspaceHistoryEntry[];
  queuePrompt: (input: {
    agent?: string;
    model?: {
      modelID: string;
      providerID: string;
    };
    text: string;
  }) => Promise<PromptSubmissionResult | null>;
  recentProjects: WorkspaceProject[];
  removeBoard: (boardId: string) => void;
  selectBoard: (boardId: string) => void;
  selectedBoard?: WorkspaceBoard;
  selectedBoardId: string | null;
  updateBoardColumns: (boardId: string, columns: Columns) => void;
  updateBoardPosition: (
    boardId: string,
    position: { x: number; y: number }
  ) => void;
}
