/**
 * Main process entry point for Chorus desktop app
 *
 * This file runs in the Bun main process and is responsible for:
 * 1. Starting the Elysia serve backend
 * 2. Creating and managing the application window
 * 3. Handling app lifecycle events
 */

import { app, createWindow } from "electrobun";
import { startServer } from "./server";

// Start the Elysia serve backend
const serverPort = startServer();

console.log(`Chorus serve backend started on port ${serverPort}`);

// Create the main application window
const window = await createWindow({
  id: "main",
  width: 1400,
  height: 900,
  minWidth: 800,
  minHeight: 600,
  titleBarStyle: "default",
  title: "Chorus",
  url: `http://localhost:${serverPort}`, // Load the web UI from the bundled serve
  userDataPath: app.getPath("userData"),
});

// Handle window close
window.on("close", () => {
  app.quit();
});

// Handle app activation (macOS)
app.on("activate", () => {
  if (!window.isVisible()) {
    window.show();
  }
});
