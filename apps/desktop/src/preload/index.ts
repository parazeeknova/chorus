import { contextBridge } from "electron";

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Add any IPC methods here if needed
  platform: process.platform,
});
