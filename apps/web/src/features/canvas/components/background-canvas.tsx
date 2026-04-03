"use client";

import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  type CoordinateExtent,
  type Edge,
  type Node,
  ReactFlow,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import { useEffect, useEffectEvent } from "react";

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
const WORLD_EXTENT: CoordinateExtent = [
  [-2_000_000, -2_000_000],
  [2_000_000, 2_000_000],
];
const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

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

export function BackgroundCanvas() {
  return (
    <div className="h-full w-full">
      <ReactFlow
        className="background-flow dark"
        defaultViewport={DEFAULT_VIEWPORT}
        edges={EMPTY_EDGES}
        edgesFocusable={false}
        elementsSelectable={false}
        maxZoom={4}
        minZoom={0.15}
        nodeExtent={WORLD_EXTENT}
        nodes={EMPTY_NODES}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable={false}
        onlyRenderVisibleElements
        panOnDrag
        panOnScroll={false}
        selectNodesOnDrag={false}
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
