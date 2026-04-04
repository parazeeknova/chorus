# Chorus Desktop (Electron)

Chorus desktop application using Electron.

## Development

```bash
# From repo root - starts serve, web, and desktop
bun run dev

# Or just the desktop (serve must be running)
cd apps/desktop && bun run dev
```

The desktop app loads http://localhost:2000 in a native window.

## Build

```bash
cd apps/desktop
bun run build
bun run package
```

Creates platform-specific packages in `release/`.

## Architecture

- **Main Process**: Electron main process (`src/main/`)
- **Preload**: Secure bridge between main and renderer (`src/preload/`)
- **Renderer**: Loads web UI from localhost:2000 (Chorus serve)

## Requirements

- Chorus serve must be running on port 2000
- Web frontend served by the backend
