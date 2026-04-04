/**
 * Main process entry point for Chorus desktop app
 *
 * This file runs in the Bun main process and is responsible for:
 * 1. Starting the Elysia serve backend (or connecting to existing one in dev)
 * 2. Creating and managing the application window
 * 3. Handling app lifecycle events
 */

import { BrowserWindow } from "electrobun/bun";
import { startServer, stopServer } from "./server";

const DEFAULT_PORT = 2000;
const DEV_CHECK_TIMEOUT = 2000; // 2 seconds timeout for dev server check

/**
 * Check if the Chorus serve is already running (for monorepo dev mode)
 */
async function checkExistingServe(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEV_CHECK_TIMEOUT);

    const response = await fetch(`http://localhost:${port}/`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.status === 200 || response.status === 404;
  } catch {
    return false;
  }
}

// Check if we're in monorepo dev mode (serve already running)
const existingPort = (await checkExistingServe(DEFAULT_PORT))
  ? DEFAULT_PORT
  : null;

let serverPort: number;
let isEmbeddedServe = false;

if (existingPort) {
  // Monorepo dev mode: use existing serve
  serverPort = existingPort;
  console.log(
    `Using existing Chorus serve on port ${serverPort} (monorepo dev mode)`
  );
} else {
  // Standalone mode: start embedded serve
  serverPort = await startServer();
  isEmbeddedServe = true;
  console.log(`Started embedded Chorus serve on port ${serverPort}`);
}

// Create the main application window
const win = new BrowserWindow({
  title: "Chorus",
  url: `http://localhost:${serverPort}`,
  frame: { x: 100, y: 100, width: 1400, height: 900 },
  titleBarStyle: "default",
});

// Handle window close
win.on("close", () => {
  if (isEmbeddedServe) {
    console.log("Window closing, shutting down embedded server...");
    stopServer();
  } else {
    console.log("Window closing (external serve will continue running)");
  }
  process.exit(0);
});

console.log("Chorus desktop app started");
