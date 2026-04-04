# Chorus Desktop

Electrobun-based desktop application that bundles the Chorus web frontend and serve backend into a single self-contained native app.

## Architecture

This desktop app bundles:
- **Web Frontend** (`apps/web`): Next.js web app (static export)
- **Serve Backend** (`apps/serve`): Elysia server running in the Bun main process
- **Desktop Shell**: Electrobun provides native window management and system integration

Everything runs in a single self-contained application - no separate processes needed.

## Development

### Prerequisites

- bun installed
- Run `bun install` from repo root first

### Run in Development Mode

```bash
cd apps/desktop
bun run dev
```

This starts the Electrobun app which:
1. Starts the Elysia serve backend in the main process
2. Serves the Next.js web UI
3. Opens a native desktop window loading the UI

### Building for Production

```bash
bun run build
```

This creates a fully self-contained desktop app in `dist/`:
- **macOS**: `.app` bundle and `.dmg` installer
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` portable app

## Configuration

The app uses the same configuration as `apps/serve`:
- OpenCode directory
- OpenCode base URL
- Server port
- Auto-start OpenCode

Set via environment variables:
- `CHORUS_SERVE_PORT` - Port for the Elysia server (default: 2000)
- See `apps/serve/src/config.ts` for more options

## Project Structure

```
apps/desktop/
├── src/
│   ├── bun/
│   │   ├── index.ts       # Main process entry point
│   │   └── server.ts      # Elysia serve integration
│   └── mainview/
│       ├── index.ts       # View logic
│       └── preload.ts     # Secure bridge script
├── dist/                   # Build output
├── electrobun.config.ts    # Electrobun configuration
├── tsconfig.json
└── package.json
```

## Releasing

The desktop app is automatically built and released via GitHub Actions when you push a version tag.

### Create a Release

1. **Update the version** in `apps/desktop/package.json`:
   ```bash
   # Manually edit apps/desktop/package.json and bump the version
   ```

2. **Commit the version change**:
   ```bash
   git add apps/desktop/package.json
   git commit -m "chore[DESKTOP]: bump version to 0.0.2"
   ```

3. **Create and push a git tag**:
   ```bash
   git tag v0.0.2
   git push origin main
   git push origin v0.0.2
   ```

4. **GitHub Actions will automatically**:
   - Run linting and type checks
   - Build the desktop app for macOS, Windows, and Linux
   - Create a GitHub Release with all platform binaries attached
   - Generate release notes from commits

### Release Artifacts

Once the workflow completes, the GitHub Release will include:
- **macOS**: `.app` bundle and `.dmg` installer
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` portable app

Users can download these from the Releases page on GitHub.

## Advantages of Electrobun

- **Tiny bundles**: ~12MB self-contained apps (using system webview)
- **Fast updates**: As small as 14KB using bsdiff binary patching
- **TypeScript everywhere**: Write TS for main process and webviews
- **Bun-powered**: Ultra-fast bundling and execution
- **Cross-platform**: Single codebase for macOS, Windows, and Linux
