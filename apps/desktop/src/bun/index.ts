/**
 * Main process entry point for Chorus desktop app
 *
 * This file runs in the Bun main process and is responsible for:
 * 1. Starting the Elysia serve backend
 * 2. Creating and managing the application window
 * 3. Handling app lifecycle events
 */

import { BrowserWindow } from "electrobun/bun";
import { startServer } from "./server";

// Start the Elysia serve backend
const serverPort = startServer();

console.log(`Chorus serve backend started on port ${serverPort}`);

// Create the main application window
const win = new BrowserWindow({
  title: "Chorus",
  url: `http://localhost:${serverPort}`,
  frame: { x: 100, y: 100, width: 1400, height: 900 },
  titleBarStyle: "default",
});

// Handle window close
win.on("close", () => {
  process.exit(0);
});

console.log("Chorus desktop app started");
