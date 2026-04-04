"use client";

import { createContext, useContext } from "react";
import type { WorkspaceContextValue } from "./types";

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null
);

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used within ChorusWorkspaceProvider");
  }

  return value;
}
