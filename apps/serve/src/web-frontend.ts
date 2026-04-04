/**
 * Web frontend serving for Chorus
 *
 * Proxies to Next.js dev server in development,
 * serves static files in production
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

// Web frontend configuration
const WEB_DEV_URL = "http://localhost:3000"; // Next.js dev server
const WEB_PROD_DIR = path.join(process.cwd(), "../web/dist"); // Static export

/**
 * Serve web frontend - proxies to Next.js dev server in development,
 * serves static files in production
 */
export async function serveWebFrontend(pathname: string): Promise<Response> {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    // Development: Proxy to Next.js dev server
    try {
      const targetUrl = `${WEB_DEV_URL}${pathname}`;
      const response = await fetch(targetUrl, {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      return response;
    } catch (error) {
      console.error("Failed to proxy to Next.js dev server:", error);
      return new Response(
        `<html><body><h1>Next.js Dev Server Not Running</h1>
        <p>Please start the Next.js dev server with: <code>cd apps/web && bun run dev</code></p>
        <p>Or build the static export: <code>cd apps/web && bun run build</code></p></body></html>`,
        { status: 503, headers: { "Content-Type": "text/html" } }
      );
    }
  } else {
    // Production: Serve static files
    try {
      // Try to serve the file directly
      const filePath = path.join(
        WEB_PROD_DIR,
        pathname === "/" ? "index.html" : pathname
      );
      const content = await readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = getContentType(ext);
      return new Response(content, {
        headers: { "Content-Type": contentType },
      });
    } catch {
      // If file not found, try serving index.html (SPA fallback)
      try {
        const indexPath = path.join(WEB_PROD_DIR, "index.html");
        const content = await readFile(indexPath);
        return new Response(content, {
          headers: { "Content-Type": "text/html" },
        });
      } catch {
        return new Response("Web frontend not found. Please build the app.", {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }
  }
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
  };
  return types[ext] || "application/octet-stream";
}
