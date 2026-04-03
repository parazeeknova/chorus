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
  type OnNodesChange,
  ReactFlow,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import {
  type Columns,
  defaultColumns,
} from "@/features/kanban/components/kanban";
import {
  KANBAN_CARD_NODE_TYPE,
  KanbanCardNode,
  type KanbanCardNodeData,
} from "@/features/kanban/components/kanban-card-node";

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
  id: string,
  position: { x: number; y: number },
  data: {
    id: string;
    title: string;
    columns: Columns;
  }
): Node<KanbanCardNodeData> {
  return {
    id,
    type: KANBAN_CARD_NODE_TYPE,
    position,
    data,
    draggable: true,
    selectable: true,
    style: {
      width: 1280,
    },
  };
}

export function BackgroundCanvas() {
  const [nodes, setNodes] = useState<Node<KanbanCardNodeData>[]>([
    createKanbanCardNode(
      "card-1",
      { x: 100, y: 100 },
      {
        id: "card-1",
        title: "Sprint 1",
        columns: defaultColumns(),
      }
    ),
    createKanbanCardNode(
      "card-2",
      { x: 900, y: 200 },
      {
        id: "card-2",
        title: "Sprint 2",
        columns: {
          queue: [
            {
              id: "t1",
              title: "Research competitors",
              label: "Research",
              labelVariant: "info-light",
            },
          ],
          in_progress: [],
          approve: [],
          done: [],
        },
      }
    ),
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const handleRemoveCard = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, []);

  const handleUpdateColumns = useCallback((id: string, columns: Columns) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, columns } } : n))
    );
  }, []);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes(
        (nds) => applyNodeChanges(changes, nds) as Node<KanbanCardNodeData>[]
      ),
    []
  );

  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onRemove: handleRemoveCard,
      onUpdateColumns: handleUpdateColumns,
    },
  }));

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
        nodes={nodesWithCallbacks}
        nodesConnectable={true}
        nodesDraggable={true}
        nodesFocusable={true}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onlyRenderVisibleElements
        onNodesChange={onNodesChange}
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
