"use client";

import {
  addEdge,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  type CoordinateExtent,
  type Edge,
  type Node,
  Panel,
  ReactFlow,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import { KeyboardIcon, MinusIcon, PlusIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom";
import type { Columns } from "@/features/kanban/components/kanban";
import {
  KANBAN_CARD_NODE_TYPE,
  KanbanCardNode,
  type KanbanCardNodeData,
} from "@/features/kanban/components/kanban-card-node";
import type { WorkspaceBoard } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace-context";

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
const WORLD_EXTENT: CoordinateExtent = [
  [-2_000_000, -2_000_000],
  [2_000_000, 2_000_000],
];

const nodeTypes = {
  [KANBAN_CARD_NODE_TYPE]: KanbanCardNode,
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "BUTTON" ||
    target.tagName === "INPUT" ||
    target.tagName === "SELECT" ||
    target.tagName === "TEXTAREA"
  );
}

/**
 * All keyboard shortcuts wired up for the Chorus canvas.
 * Exposed as a constant so the help panel can reference the same list.
 */
export const CANVAS_SHORTCUTS = [
  {
    group: "Canvas",
    shortcuts: [
      { keys: ["+", "="], label: "Zoom in" },
      { keys: ["-"], label: "Zoom out" },
      { keys: ["0"], label: "Reset view" },
      { keys: ["F"], label: "Fit view" },
      { keys: ["?"], label: "Toggle shortcuts" },
    ],
  },
  {
    group: "Tasks",
    shortcuts: [
      { keys: ["N"], label: "New task" },
      { keys: ["Delete", "⌫"], label: "Remove selected card" },
      { keys: ["Esc"], label: "Deselect / dismiss" },
    ],
  },
  {
    group: "Review",
    shortcuts: [
      { keys: ["A"], label: "Approve selected" },
      { keys: ["R"], label: "Reject selected" },
    ],
  },
] as const;

interface KeyboardShortcutsProps {
  onApproveSelected?: () => void;
  onNewTask?: () => void;
  onRejectSelected?: () => void;
  onRemoveSelected?: () => void;
  onToggleHelp?: () => void;
}

function KeyboardShortcuts({
  onNewTask,
  onRemoveSelected,
  onApproveSelected,
  onRejectSelected,
  onToggleHelp,
}: KeyboardShortcutsProps) {
  const { setViewport, zoomIn, zoomOut, fitView } = useReactFlow();

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      isEditableTarget(event.target)
    ) {
      return;
    }

    switch (event.key) {
      case "+":
      case "=":
        event.preventDefault();
        zoomIn({ duration: 140 });
        break;

      case "-":
      case "_":
        event.preventDefault();
        zoomOut({ duration: 140 });
        break;

      case "0":
        event.preventDefault();
        setViewport(DEFAULT_VIEWPORT, { duration: 180 });
        break;

      case "f":
      case "F":
        event.preventDefault();
        fitView({ duration: 300, padding: 0.1 });
        break;

      case "n":
      case "N":
        event.preventDefault();
        onNewTask?.();
        break;

      case "Delete":
      case "Backspace":
        event.preventDefault();
        onRemoveSelected?.();
        break;

      case "Escape":
        // Let React Flow handle deselection natively; no preventDefault
        break;

      case "a":
      case "A":
        event.preventDefault();
        onApproveSelected?.();
        break;

      case "r":
      case "R":
        event.preventDefault();
        onRejectSelected?.();
        break;

      case "?":
        event.preventDefault();
        onToggleHelp?.();
        break;

      default:
        break;
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}

function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel
      className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-[#020617]/80 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      position="bottom-right"
      style={{ margin: 0, bottom: "4.25rem", right: "1rem" }}
    >
      <button
        aria-label="Zoom in"
        className="flex size-8 items-center justify-center rounded-lg text-white/35 transition-all duration-150 hover:bg-white/10 hover:text-white/60 active:scale-95"
        onClick={() => zoomIn({ duration: 140 })}
        title="Zoom in (+)"
        type="button"
      >
        <PlusIcon className="size-4" />
      </button>
      <button
        aria-label="Zoom out"
        className="flex size-8 items-center justify-center rounded-lg text-white/35 transition-all duration-150 hover:bg-white/10 hover:text-white/60 active:scale-95"
        onClick={() => zoomOut({ duration: 140 })}
        title="Zoom out (-)"
        type="button"
      >
        <MinusIcon className="size-4" />
      </button>
      <div className="mx-1 my-0.5 h-px w-6 bg-white/10" />
      <button
        aria-label="Fit view"
        className="flex size-8 items-center justify-center rounded-lg text-white/35 transition-all duration-150 hover:bg-white/10 hover:text-white/60 active:scale-95"
        onClick={() => fitView({ duration: 300, padding: 0.1 })}
        title="Fit view (F)"
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" x2="14" y1="3" y2="10" />
          <line x1="3" x2="10" y1="21" y2="14" />
        </svg>
      </button>
    </Panel>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-white/15 bg-white/8 px-1 py-0.5 font-mono text-[0.6rem] text-white/60 leading-none">
      {children}
    </kbd>
  );
}

function KeyboardHelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fade-in slide-in-from-bottom-2 pointer-events-auto w-64 animate-in rounded-2xl border border-white/10 bg-[#020617]/88 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl duration-200"
      style={{ backdropFilter: "blur(20px)" }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold text-[0.72rem] text-white/70 uppercase tracking-widest">
          <KeyboardIcon className="size-3 text-white/40" />
          Shortcuts
        </span>
        <button
          aria-label="Close shortcuts panel"
          className="rounded-md p-0.5 text-white/25 transition-colors hover:bg-white/8 hover:text-white/60"
          onClick={onClose}
          type="button"
        >
          <XIcon className="size-3" />
        </button>
      </div>

      {/* Groups */}
      <div className="flex flex-col gap-3">
        {CANVAS_SHORTCUTS.map((group) => (
          <div key={group.group}>
            <div className="mb-1.5 font-semibold text-[0.6rem] text-white/25 uppercase tracking-widest">
              {group.group}
            </div>
            <div className="flex flex-col gap-1">
              {group.shortcuts.map((shortcut) => (
                <div
                  className="flex items-center justify-between"
                  key={shortcut.label}
                >
                  <span className="text-[0.7rem] text-white/50">
                    {shortcut.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) =>
                      i === 0 ? (
                        <Kbd key={key}>{key}</Kbd>
                      ) : (
                        <>
                          <span className="text-[0.55rem] text-white/20">
                            or
                          </span>
                          <Kbd key={key}>{key}</Kbd>
                        </>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function createKanbanCardNode(
  board: WorkspaceBoard,
  selected: boolean,
  onUpdateColumns: (id: string, columns: Columns) => void
): Node<KanbanCardNodeData> {
  return {
    id: board.boardId,
    type: KANBAN_CARD_NODE_TYPE,
    position: board.position,
    data: {
      boardId: board.boardId,
      title: board.title,
      columns: board.columns,
      filePath: board.repo.directory,
      gitBranch: board.repo.branch,
      projectName: board.repo.projectName,
      sessionId: board.session.sessionId,
      sessionState: board.session.state,
      onUpdateColumns,
    },
    selected,
    draggable: true,
    selectable: true,
    style: {
      width: 1280,
      height: 720,
    },
  };
}

function reconcileNodes(
  currentNodes: Node<KanbanCardNodeData>[],
  boards: WorkspaceBoard[],
  selectedBoardId: string | null,
  onUpdateColumns: (id: string, columns: Columns) => void
): Node<KanbanCardNodeData>[] {
  const currentNodesById = new Map(currentNodes.map((node) => [node.id, node]));

  return boards.map((board) => {
    const nextNode = createKanbanCardNode(
      board,
      board.boardId === selectedBoardId,
      onUpdateColumns
    );
    const currentNode = currentNodesById.get(board.boardId);

    if (!currentNode) {
      return nextNode;
    }

    return {
      ...currentNode,
      position: currentNode.position,
      selected: board.boardId === selectedBoardId,
      data: {
        ...currentNode.data,
        ...nextNode.data,
      },
      style: currentNode.style ?? nextNode.style,
    };
  });
}

export function BackgroundCanvas() {
  const {
    boards,
    clearSelection,
    selectedBoardId,
    selectBoard,
    updateBoardColumns,
    updateBoardPosition,
  } = useWorkspace();
  const [nodes, setNodes] = useState<Node<KanbanCardNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleUpdateColumns = useCallback(
    (id: string, columns: Columns) => {
      updateBoardColumns(id, columns);
    },
    [updateBoardColumns]
  );

  /**
   * Remove whichever card is currently selected (first selected node).
   * When real selection state is wired, pass the selected node id here.
   */
  const handleRemoveSelected = useCallback(() => {
    // Future: derive from selected nodes. For now this is a no-op placeholder.
  }, []);

  const handleApproveSelected = useCallback(() => {
    // Future: approve the card currently in the `approve` lane that is selected.
  }, []);

  const handleRejectSelected = useCallback(() => {
    // Future: reject the card currently in the `approve` lane that is selected.
  }, []);

  const handleNewTask = useCallback(() => {
    // Future: open the "Create Task" modal / focus the queue column's create button.
  }, []);

  const handleToggleHelp = useCallback(() => {
    setShowHelp((v) => !v);
  }, []);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  useEffect(() => {
    setNodes((currentNodes) =>
      reconcileNodes(currentNodes, boards, selectedBoardId, handleUpdateColumns)
    );
  }, [boards, handleUpdateColumns, selectedBoardId]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        className="background-flow dark"
        defaultViewport={DEFAULT_VIEWPORT}
        edges={edges}
        edgesFocusable={true}
        elementsSelectable={true}
        maxZoom={4}
        minZoom={0.15}
        nodeExtent={WORLD_EXTENT}
        nodes={nodes}
        nodesConnectable={true}
        nodesDraggable={true}
        nodesFocusable={true}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onlyRenderVisibleElements
        onNodeClick={(_, node) => {
          selectBoard(node.id);
        }}
        onNodeDragStop={(_, node) => {
          updateBoardPosition(node.id, node.position);
        }}
        onNodesChange={(changes) => {
          setNodes(
            (currentNodes) =>
              applyNodeChanges(
                changes,
                currentNodes
              ) as Node<KanbanCardNodeData>[]
          );
        }}
        onPaneClick={clearSelection}
        panOnDrag
        panOnScroll={false}
        selectNodesOnDrag={true}
        translateExtent={WORLD_EXTENT}
        zoomOnDoubleClick={false}
        zoomOnPinch
        zoomOnScroll
      >
        <KeyboardShortcuts
          onApproveSelected={handleApproveSelected}
          onNewTask={handleNewTask}
          onRejectSelected={handleRejectSelected}
          onRemoveSelected={handleRemoveSelected}
          onToggleHelp={handleToggleHelp}
        />

        <CanvasControls />
        <Background
          bgColor="#0a0a0a"
          color="rgba(255, 255, 255, 0.4)"
          gap={26}
          size={1.8}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>

      {/* Keyboard help panel + icon button — portalled to document.body to
          escape the z-10 stacking context imposed by the page layout wrapper. */}
      {isMounted &&
        createPortal(
          <div className="fixed right-4 bottom-4 z-9999 flex flex-col items-end gap-2">
            {showHelp && (
              <KeyboardHelpPanel onClose={() => setShowHelp(false)} />
            )}
            <button
              aria-label="Keyboard shortcuts"
              className={[
                "flex size-[44px] items-center justify-center rounded-xl border transition-all duration-150",
                "shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl",
                showHelp
                  ? "border-white/20 bg-white/15 text-white/80"
                  : "border-white/10 bg-[#020617]/80 text-white/35 hover:border-white/15 hover:bg-white/10 hover:text-white/60",
              ].join(" ")}
              onClick={handleToggleHelp}
              title="Keyboard shortcuts (?)"
              type="button"
            >
              <KeyboardIcon className="size-4" />
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
