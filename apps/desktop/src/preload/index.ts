/**
 * Preload script for Chorus desktop app
 * Runs before the renderer and has access to Electron APIs
 */

import { contextBridge } from "electron";

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Add any IPC methods here if needed
  platform: process.platform,
});
