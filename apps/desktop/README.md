# Chorus Desktop

Electrobun-based desktop application that bundles the Chorus web frontend and serve backend into a single self-contained native app.

## Quick Start

Run everything at once from repo root:
```bash
bun run dev
```

This starts:
- Next.js dev server (port 3000)
- Chorus serve backend (port 2000) 
- Electrobun desktop app with native window

The desktop app proxies web requests to Next.js automatically.

## Architecture

- **Web Frontend**: Next.js app proxied from localhost:3000
- **Serve Backend**: Elysia server in Bun main process (port 2000)
- **Desktop Shell**: Electrobun native window with system webview

## Development

Prerequisites: bun v1.3.11+

```bash
# Install dependencies from repo root
bun install

# Run everything (from repo root)
bun run dev

# Or run just the desktop app (Next.js must be running separately)
cd apps/desktop && bun run dev
```

## Production Build

```bash
cd apps/desktop
bun run build
```

Creates platform-specific bundles in `dist/`:
- macOS: `.dmg`
- Windows: `.exe`
- Linux: `.AppImage`

## Auto-Updater

Configured in `electrobun.config.ts`:
```typescript
release: {
  baseUrl: "https://github.com/parazeeknova/chorus/releases/download"
}
```

Uses bsdiff for ~14KB update patches.

## Releasing

```bash
# Update version in apps/desktop/package.json
git add apps/desktop/package.json
git commit -m "chore[DESKTOP]: bump version to 0.0.4"
git tag v0.0.4
git push origin main
git push origin v0.0.4
```

GitHub Actions builds and releases automatically.

## Features

✅ Full Chorus backend integration (apps/serve)  
✅ Web frontend proxy to Next.js dev server  
✅ Auto-updater support  
✅ Cross-platform (macOS, Windows, Linux)  
✅ ~12MB bundle size (vs ~200MB Electron)  
✅ ~14KB update patches with bsdiff  

## Configuration

Environment variables:
- `CHORUS_SERVE_PORT` - Backend port (default: 2000)
- `NODE_ENV=production` - Serve static files instead of proxy

## Status

🚀 **Fully functional!** The desktop app successfully:
- Starts Elysia backend with OpenCode bridge
- Creates native desktop window
- Proxies web UI from Next.js dev server
- Handles graceful shutdown
