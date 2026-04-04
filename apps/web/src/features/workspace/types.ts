import type {
  BoardSeed,
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

export interface WorkspaceBoardSession {
  currentTaskId?: string;
  errorMessage?: string;
  sessionId?: string;
  state: BoardSessionState;
}

export interface WorkspaceBoard {
  boardId: string;
  columns: Columns;
  position: {
    x: number;
    y: number;
  };
  repo: BoardSeed["repo"];
  session: WorkspaceBoardSession;
  title: string;
}

export interface WorkspaceHistoryEntry {
  id: string;
  lastOpenedAt: number;
  repo: WorkspaceBoard["repo"];
  title: string;
}

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
  isOpeningFolder: boolean;
  isQueueingPrompt: boolean;
  loadProjects: () => Promise<void>;
  openFolder: () => Promise<void>;
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
  selectBoard: (boardId: string) => void;
  selectedBoard?: WorkspaceBoard;
  selectedBoardId: string | null;
  updateBoardColumns: (boardId: string, columns: Columns) => void;
  updateBoardPosition: (
    boardId: string,
    position: { x: number; y: number }
  ) => void;
}
