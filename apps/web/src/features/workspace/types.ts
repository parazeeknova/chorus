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

export interface PromptPart {
  filename?: string;
  isDirectory?: boolean;
  lineRange?: { start: number; end: number };
  mime?: string;
  path?: string;
  text?: string;
  type: "text" | "file";
}

export interface WorkspaceContextValue {
  boardLayoutVersion: number;
  boards: WorkspaceBoard[];
  clearSelection: () => void;
  createBoardFromHistory: (entry: WorkspaceHistoryEntry) => void;
  createBoardFromProject: (project: RepoProject) => void;
  dismissComposerHint: () => void;
  isOpeningFolder: boolean;
  isQueueingPrompt: boolean;
  kanbanHistory: {
    canRedo: boolean;
    canUndo: boolean;
    redo: () => { columns: Columns; task: Task } | null;
    recordMove: (
      columnsBefore: Columns,
      columnsAfter: Columns,
      task: Task
    ) => void;
    undo: () => { columns: Columns; prompt: string; task: Task } | null;
  };
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
    parts?: PromptPart[];
    text: string;
  }) => Promise<PromptSubmissionResult | null>;
  recentProjects: WorkspaceProject[];
  removeBoard: (boardId: string) => void;
  restoredPrompt: string;
  restorePrompt: (text: string) => void;
  selectBoard: (boardId: string) => void;
  selectedBoard?: WorkspaceBoard;
  selectedBoardId: string | null;
  sessionCommand: (command: "undo" | "redo") => Promise<boolean>;
  setBoardViewMode: (mode: WorkspacePreferences["boardViewMode"]) => void;
  setSpeechVoiceId: (voiceId: string | null) => void;
  updateBoardColumns: (boardId: string, columns: Columns) => void;
  updateBoardPosition: (
    boardId: string,
    position: { x: number; y: number }
  ) => void;
}
