# Chorus Desktop

Electrobun-based desktop application that bundles the Chorus web frontend and serve backend into a single self-contained native app.

## Architecture

This desktop app bundles:
- **Web Frontend** (`apps/web`): Next.js web app served via Elysia
- **Serve Backend** (`apps/serve`): Elysia server running in the Bun main process
- **Desktop Shell**: Electrobun provides native window management using system webview

Everything runs in a single self-contained application - no separate processes needed.

## Why Electrobun?

| Feature | Electrobun | Electron |
|---------|-----------|----------|
| Bundle Size | ~12MB | ~200MB |
| Updates | ~14KB patches | Full downloads |
| Runtime | Bun | Node.js |
| Build Speed | Ultra-fast | Slower |
| Memory | Lower | Higher |

## Development

### Prerequisites

- bun installed (v1.3.11+)
- Run `bun install` from repo root first

### Run in Development Mode

```bash
cd apps/desktop
bun run dev
```

This starts the Electrobun app which:
1. Starts the Elysia serve backend in the main process
2. Creates a native desktop window
3. Loads the Chorus web UI from the local server

### Building for Production

```bash
bun run build
```

This creates a fully self-contained desktop app:
- **macOS**: `.app` bundle and `.dmg` installer
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` portable app

## Project Structure

```
apps/desktop/
├── src/
│   ├── bun/
│   │   ├── index.ts       # Main process entry point
│   │   └── server.ts      # Elysia serve integration
│   └── mainview/
│       ├── index.html     # View HTML
│       └── index.ts       # View logic
├── dist/                   # Build output
├── electrobun.config.ts    # Electrobun configuration
├── tsconfig.json
└── package.json
```

## Configuration

The app uses the same configuration as `apps/serve`:
- OpenCode directory
- OpenCode base URL
- Server port
- Auto-start OpenCode

Set via environment variables:
- `CHORUS_SERVE_PORT` - Port for the Elysia server (default: 2000)

## Releasing

The desktop app is automatically built and released via GitHub Actions when you push a version tag.

### Create a Release

1. **Update the version** in `apps/desktop/package.json`:
   ```bash
   # Edit apps/desktop/package.json and bump the version
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

## TODO for Full Integration

- [ ] Implement actual Elysia serve integration in `src/bun/server.ts`
- [ ] Configure Next.js for static export or server-side rendering
- [ ] Bundle serve code into the Electrobun build
- [ ] Add code signing for production releases
- [ ] Test on all platforms (macOS, Windows, Linux)
