/**
 * Elysia serve backend bundled into the desktop app
 *
 * This imports and starts the full Chorus serve backend from apps/serve
 */

/**
 * Start the Elysia server
 * @returns The port the server is running on
 */
export function startServer(): number {
  // TODO: Import and start the actual serve app from apps/serve
  // For now, return a placeholder port
  // This will be implemented once we properly integrate apps/serve

  const port = 2000;

  console.log("TODO: Start actual Elysia serve app");
  console.log(`Server will run on port ${port}`);

  return port;
}
