"use client";

import {
  addEdge,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  ControlButton,
  Controls,
  type CoordinateExtent,
  type Edge,
  type Node,
  ReactFlow,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
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

function KeyboardShortcuts() {
  const { setViewport, zoomIn, zoomOut } = useReactFlow();

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      isEditableTarget(event.target)
    ) {
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomIn({ duration: 140 });
      return;
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomOut({ duration: 140 });
      return;
    }

    if (event.key === "0") {
      event.preventDefault();
      setViewport(DEFAULT_VIEWPORT, { duration: 180 });
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

function ResetViewportButton() {
  const { setViewport } = useReactFlow();

  return (
    <ControlButton
      aria-label="Reset view"
      onClick={() => {
        setViewport(DEFAULT_VIEWPORT, { duration: 180 });
      }}
      title="Reset view"
    >
      <span className="font-semibold text-xs tracking-[0.2em]">0</span>
    </ControlButton>
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

  const handleUpdateColumns = useCallback(
    (id: string, columns: Columns) => {
      updateBoardColumns(id, columns);
    },
    [updateBoardColumns]
  );

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
        <KeyboardShortcuts />
        <Controls
          className="background-flow__controls"
          orientation="vertical"
          position="bottom-right"
          showFitView={false}
          showInteractive={false}
        >
          <ResetViewportButton />
        </Controls>
        <Background
          bgColor="#0a0a0a"
          color="rgba(255, 255, 255, 0.4)"
          gap={26}
          size={1.8}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>
    </div>
  );
}
