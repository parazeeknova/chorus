# Chorus Development Plan - Team Assignment

## Team Roles & Ownership

### 👤 Harsh - Backend & Bridge (Backend Lead)

**Focus**: Local bridge, OpenCode integration, policy/workflow adapters, API layer, Elysia server, all backend services

### 👤 Koustubh - Foundation & Integration (25% Development)

**Focus**: Shared packages, contracts, SpacetimeDB schema, testing infrastructure

### 👤 Aman - Frontend & UI (Frontend Lead)

**Focus**: All UI components, infinite canvas, React Flow integration, board visualization, cards, approvals, mobile UI, all frontend features

---

## Phase 0: Foundation and Contracts

**Goal**: Setup monorepo, shared packages, and development environment

### 👤 Koustubh Tasks

- [ ] Scaffold Turborepo monorepo structure
  - [ ] Initialize Turborepo with `turbo.json`
  - [ ] Setup Bun workspace configuration (`bunfig.toml`)
  - [ ] Create root `package.json` with workspace definitions
  - [ ] Configure TypeScript base config (`tsconfig.json`)
- [ ] Create `packages/contracts`
  - [ ] Setup Zod for schema validation
  - [ ] Define card status enums (`queue`, `in_progress`, `approve`, `done`)
  - [ ] Define WebSocket message schemas
  - [ ] Define command/response DTOs
  - [ ] Define approval command schemas
  - [ ] Export all contract types
- [ ] Create `packages/config`
  - [ ] Shared ESLint configuration
  - [ ] Shared TypeScript configuration
  - [ ] Shared Prettier configuration
- [ ] Create `packages/utils`
  - [ ] Common utility functions
  - [ ] ID generation utilities
  - [ ] Date/time helpers
- [ ] Create `packages/test-utils`
  - [ ] Test setup utilities
  - [ ] Mock factories
  - [ ] Test helpers

### 👤 Harsh Tasks

- [ ] Initialize `apps/serve`
  - [ ] Setup Elysia.js project structure
  - [ ] Configure Bun runtime
  - [ ] Create basic `src/` structure (bootstrap, config, routes)
  - [ ] Add environment variable handling
  - [ ] Initialize `apps/web`
  - [ ] Setup Next.js 14 App Router
  - [ ] Configure Tailwind CSS
  - [ ] Create basic app structure (`app/`, `components/`, `features/`)
  - [ ] Setup environment configuration

- [ ] Initialize `apps/serve`
  - [ ] Setup Elysia.js project structure
  - [ ] Configure Bun runtime
  - [ ] Create basic `src/` structure (bootstrap, config, routes)
  - [ ] Add environment variable handling
- [ ] Initialize `apps/web`
  - [ ] Setup Next.js 14 App Router
  - [ ] Configure Tailwind CSS
  - [ ] Create basic app structure (`app/`, `components/`, `features/`)
  - [ ] Setup environment configuration
- [ ] Create `packages/ui` base structure
  - [ ] Setup Tailwind CSS configuration
  - [ ] Create base component structure
  - [ ] Setup Storybook for component development (optional)

### 👤 Aman Tasks


- [ ] Create `packages/ui-tokens`
  - [ ] Define color palette
  - [ ] Define typography scale
  - [ ] Define spacing system
  - [ ] Define elevation/shadow tokens
  - [ ] Define motion/animation tokens
  - [ ] Export CSS variables
- [ ] Create `packages/ui` base structure
  - [ ] Setup Tailwind CSS configuration
  - [ ] Create base component structure
  - [ ] Setup Storybook for component development (optional)


### Exit Criteria

- [ ] `bun install` runs cleanly across entire monorepo
- [ ] `bun run build` succeeds for all apps
- [ ] TypeScript compilation works without errors
- [ ] Shared contracts import successfully in both `web` and `serve`

---

## Phase 1: Local Bridge MVP

**Goal**: Elysia server running, OpenCode adapter functional, basic task queuing works

### 👤 Harsh Tasks (Primary)

- [ ] Create `packages/opencode-adapter`
  - [ ] Implement OpenCode client wrapper
  - [ ] Implement session creation
  - [ ] Implement session event subscription
  - [ ] Implement session abort functionality
  - [ ] Add event stream handlers
  - [ ] Add error handling and retries
- [ ] Create `packages/agent-events`
  - [ ] Define normalized event types
  - [ ] Implement OpenCode event parsers
  - [ ] Implement event normalization logic
  - [ ] Add projection helpers for card state
- [ ] Build Elysia server in `apps/serve`
  - [ ] Setup Elysia app instance
  - [ ] Implement `GET /health` endpoint
  - [ ] Implement `GET /bridge/status` endpoint
  - [ ] Implement `POST /tasks` endpoint
  - [ ] Add request validation using contracts
  - [ ] Add error handling middleware
- [ ] Build OpenCode bridge (`apps/serve/src/bridge/opencode/`)
  - [ ] Implement `client.ts` - OpenCode client initialization
  - [ ] Implement `session-manager.ts` - session lifecycle management
  - [ ] Implement `event-stream.ts` - event subscription and normalization
  - [ ] Add in-memory task registry
- [ ] Create basic WebSocket endpoint
  - [ ] Setup WebSocket handler in `apps/serve/src/ws/`
  - [ ] Implement `task.queue` message handler
  - [ ] Implement connection lifecycle management
  - [ ] Add message validation

### 👤 Koustubh Tasks (Supporting)

- [ ] Extend `packages/contracts`
  - [ ] Add task queue command schema
  - [ ] Add task state schemas
  - [ ] Add OpenCode session schemas
  - [ ] Add error response schemas
- [ ] Write unit tests for `packages/opencode-adapter`
  - [ ] Test session creation
  - [ ] Test event normalization
  - [ ] Test error scenarios
- [ ] Write integration tests
  - [ ] Test task queue endpoint
  - [ ] Test WebSocket connection
  - [ ] Test OpenCode session lifecycle

### 👤 Aman Tasks

- [ ] Create temporary task output panel in `apps/web`
  - [ ] Build simple card preview component
  - [ ] Add streaming output display
  - [ ] Add basic status indicator
  - [ ] Connect to WebSocket for task updates
- [ ] Create `packages/ui` base components
  - [ ] Card shell component
  - [ ] Status badge component
  - [ ] Button components
  - [ ] Input components

### Exit Criteria

- [ ] User can queue a task from web UI
- [ ] Task is sent to `apps/serve` via WebSocket or HTTP
- [ ] OpenCode session starts successfully
- [ ] Raw output streams to temporary panel
- [ ] Task can be aborted
- [ ] Task lifecycle completes: `queue → in_progress → done|failed`

---

## Phase 2: SpacetimeDB Shared State

**Goal**: Multi-client state sync via SpacetimeDB, persistent board state

### 👤 Koustubh Tasks (Primary)

- [ ] Create SpacetimeDB schema
  - [ ] Define `cards` table
  - [ ] Define `card_runs` table
  - [ ] Define `boards` table
  - [ ] Define `board_views` table
  - [ ] Define `approvals` table
  - [ ] Define `device_presence` table
  - [ ] Define `dependency_graph` table
  - [ ] Define event tables (`agent_events`, `policy_events`, `workflow_events`, `ui_commands`)
- [ ] Define SpacetimeDB reducers
  - [ ] `create_project`
  - [ ] `create_board`
  - [ ] `create_card`
  - [ ] `queue_card`
  - [ ] `attach_agent_session`
  - [ ] `record_agent_event`
  - [ ] `complete_card`
  - [ ] `fail_card`
  - [ ] `abort_card`
  - [ ] `acknowledge_ui_command`
- [ ] Create `packages/spacetime-bindings`
  - [ ] Generate TypeScript client bindings
  - [ ] Create typed query helpers
  - [ ] Create reducer wrappers
  - [ ] Add connection lifecycle helpers
  - [ ] Export hooks for React (if applicable)
- [ ] Write tests for SpacetimeDB integration
  - [ ] Test reducer execution
  - [ ] Test data consistency
  - [ ] Test subscription updates

### 👤 Harsh Tasks (Supporting)

- [ ] Integrate SpacetimeDB in `apps/serve`
  - [ ] Setup SpacetimeDB connection in `src/bridge/spacetime/`
  - [ ] Implement event-to-reducer mapping
  - [ ] Update OpenCode event handlers to write to SpacetimeDB
  - [ ] Implement projection update logic
  - [ ] Add error handling for SpacetimeDB writes
- [ ] Update WebSocket handlers
  - [ ] Relay commands through SpacetimeDB
  - [ ] Implement command acknowledgment flow
  - [ ] Add optimistic update handling

### 👤 Aman Tasks

- [ ] Integrate SpacetimeDB in `apps/web`
  - [ ] Setup SpacetimeDB client connection
  - [ ] Implement board data subscriptions
  - [ ] Implement card data subscriptions
  - [ ] Add connection status UI
- [ ] Update temporary panel to use SpacetimeDB
  - [ ] Replace direct WebSocket state with SpacetimeDB subscriptions
  - [ ] Add loading states
  - [ ] Add error states
  - [ ] Test multi-client sync

### Exit Criteria

- [ ] Second browser tab shows same live task state
- [ ] Page refresh restores current board state
- [ ] Local bridge reliably writes to SpacetimeDB
- [ ] State updates propagate to all connected clients within 1 second
- [ ] No state conflicts between clients

---

## Phase 3: Real Canvas and Kanban Boards

**Goal**: React Flow canvas with draggable boards, visible kanban lanes, live card movement

### 👤 Aman Tasks (Primary)

- [ ] Create `packages/canvas-model`
  - [ ] Define board position types
  - [ ] Define node geometry types
  - [ ] Define lane coordinate system
  - [ ] Define edge routing metadata
  - [ ] Implement viewport persistence logic
- [ ] Create `packages/board-engine`
  - [ ] Implement status-to-lane mapping
  - [ ] Implement card sort rules
  - [ ] Implement card clustering logic
  - [ ] Implement auto-move behavior on status change
- [ ] Build React Flow canvas (`apps/web/features/canvas/`)
  - [ ] Setup React Flow provider
  - [ ] Implement infinite canvas component
  - [ ] Add pan, zoom controls
  - [ ] Add minimap
  - [ ] Implement viewport persistence
  - [ ] Add keyboard shortcuts
- [ ] Build board components (`apps/web/features/boards/`)
  - [ ] Create board group node component
  - [ ] Implement lane rendering (4 lanes: queue, in_progress, approve, done)
  - [ ] Add board header with title
  - [ ] Implement board drag/drop
  - [ ] Add visual board boundaries
  - [ ] Style board container
- [ ] Build card components (`apps/web/features/cards/`)
  - [ ] Create task card node component
  - [ ] Add card title, prompt preview
  - [ ] Add status indicator
  - [ ] Add elapsed time display
  - [ ] Add model/agent profile badge
  - [ ] Implement card animation on lane change
  - [ ] Add card drag constraints (within board)
- [ ] Implement card movement logic
  - [ ] Subscribe to card status changes from SpacetimeDB
  - [ ] Calculate new card position based on lane
  - [ ] Animate card transitions
  - [ ] Handle card reordering within lanes

### 👤 Koustubh Tasks (Supporting)

- [ ] Extend `packages/contracts`
  - [ ] Add board layout schemas
  - [ ] Add viewport state schemas
  - [ ] Add card position schemas
- [ ] Write tests for `packages/canvas-model`
  - [ ] Test position calculations
  - [ ] Test lane mapping
- [ ] Write tests for `packages/board-engine`
  - [ ] Test card sorting
  - [ ] Test auto-move logic

### 👤 Harsh Tasks (Supporting)

- [ ] Update `apps/serve` to support board operations
  - [ ] Implement `POST /boards` endpoint
  - [ ] Add board metadata storage
  - [ ] Support multiple boards per project

### Exit Criteria

- [ ] Multiple boards can be placed on infinite canvas
- [ ] Boards can be dragged and repositioned
- [ ] Each board shows 4 distinct lanes
- [ ] Cards visibly animate between lanes on status change
- [ ] Viewport position persists per user/project
- [ ] Zoom and pan work smoothly

---

## Phase 4: Approvals and Control Surface

**Goal**: Full card controls (approve, reject, abort, redirect), mobile-friendly UI

### 👤 Aman Tasks (Primary)

- [ ] Create approval components (`apps/web/features/approvals/`)
  - [ ] Build approval state indicator
  - [ ] Build approve/reject button group
  - [ ] Build abort button
  - [ ] Build redirect input modal
  - [ ] Add confirmation dialogs
  - [ ] Style for mobile touch targets
- [ ] Build card detail drawer (`apps/web/features/cards/`)
  - [ ] Implement expandable card view
  - [ ] Show full streaming output
  - [ ] Show approval details
  - [ ] Show policy decisions (if available)
  - [ ] Add close/minimize controls
  - [ ] Ensure drawer doesn't block board context
- [ ] Build mobile action bar (`apps/web/features/mobile/`)
  - [ ] Create bottom sheet for mobile
  - [ ] Add touch-optimized controls
  - [ ] Implement swipe gestures
  - [ ] Add haptic feedback (if supported)
- [ ] Add pulse indicator to cards
  - [ ] Implement activity-based pulse animation
  - [ ] Map activity states to pulse intensity:
    - [ ] `writing`: fast pulse
    - [ ] `thinking`: slow pulse
    - [ ] `waiting_for_approval`: steady highlighted pulse
    - [ ] `error`: red pulse
    - [ ] `idle`: no pulse

### 👤 Harsh Tasks (Primary)

- [ ] Implement approval endpoints in `apps/serve`
  - [ ] `POST /tasks/:cardId/approve`
  - [ ] `POST /tasks/:cardId/reject`
  - [ ] `POST /tasks/:cardId/abort`
  - [ ] `POST /tasks/:cardId/redirect`
- [ ] Update OpenCode bridge for approvals
  - [ ] Implement permission handler (`bridge/opencode/permission-handler.ts`)
  - [ ] Handle approval resolution
  - [ ] Implement soft redirect (inject prompt)
  - [ ] Implement hard redirect (fork session)
- [ ] Add WebSocket approval commands
  - [ ] `task.approve` handler
  - [ ] `task.reject` handler
  - [ ] `task.abort` handler
  - [ ] `task.redirect` handler
- [ ] Implement command relay via SpacetimeDB
  - [ ] Subscribe to `ui_commands` in bridge
  - [ ] Execute commands from mobile/remote clients
  - [ ] Write acknowledgment events
  - [ ] Handle command timeouts

### 👤 Koustubh Tasks (Supporting)

- [ ] Extend `packages/contracts`
  - [ ] Add approval request schemas
  - [ ] Add redirect command schemas
  - [ ] Add approval resolution schemas
- [ ] Update SpacetimeDB schema
  - [ ] Add `request_approval` reducer
  - [ ] Add `resolve_approval` reducer
  - [ ] Add `redirect_card` reducer
- [ ] Write tests
  - [ ] Test approval round trip
  - [ ] Test redirect flows
  - [ ] Test command relay via SpacetimeDB

### Exit Criteria

- [ ] Approval requests appear on card
- [ ] User can approve from desktop (one click)
- [ ] User can approve from mobile (one tap)
- [ ] Redirect creates visible state change
- [ ] Abort immediately stops task
- [ ] Optimistic UI reconciles with authoritative state from SpacetimeDB
- [ ] Card detail drawer works on mobile and desktop

---

## Phase 5: Dependency Edges and Workflow Execution

**Goal**: Visual task wiring, Superplane integration, auto-queuing downstream tasks

### 👤 Aman Tasks (Primary)

- [ ] Build dependency edge UI (`apps/web/features/canvas/`)
  - [ ] Implement custom React Flow edges
  - [ ] Add edge creation mode (click source → click target)
  - [ ] Add edge deletion
  - [ ] Style edges based on dependency status
  - [ ] Add edge labels
  - [ ] Add edge animations (for active workflows)
- [ ] Build dependency management UI
  - [ ] Add "link task" button to cards
  - [ ] Show dependency graph visualization
  - [ ] Add dependency validation feedback
  - [ ] Show circular dependency warnings

### 👤 Harsh Tasks (Primary)

- [ ] Create `packages/workflow-adapter`
  - [ ] Implement Superplane client wrapper
  - [ ] Implement workflow definition compiler
  - [ ] Implement workflow run starter
  - [ ] Map workflow events to Chorus events
  - [ ] Add error handling
- [ ] Integrate Superplane in `apps/serve`
  - [ ] Setup Superplane connection (`src/bridge/workflow/`)
  - [ ] Implement dependency graph compilation
  - [ ] Implement auto-queue logic on task completion
  - [ ] Handle approval-gated workflows
  - [ ] Handle failure branches
  - [ ] Implement retry logic
- [ ] Add dependency endpoints
  - [ ] `POST /tasks/:cardId/dependencies` - link tasks
  - [ ] `DELETE /tasks/:cardId/dependencies/:dependencyId` - unlink
  - [ ] `GET /tasks/:cardId/dependencies` - list dependencies

### 👤 Koustubh Tasks (Supporting)

- [ ] Extend `packages/contracts`
  - [ ] Add dependency schemas
  - [ ] Add workflow node schemas
  - [ ] Add workflow event schemas
- [ ] Update SpacetimeDB schema
  - [ ] Add `link_dependency` reducer
  - [ ] Add `trigger_downstream_cards` reducer
  - [ ] Add `workflow_events` table
- [ ] Write tests
  - [ ] Test workflow compilation
  - [ ] Test dependency trigger logic
  - [ ] Test auto-queue behavior

### Exit Criteria

- [ ] User can wire Task B to run after Task A
- [ ] Dependency edge is visible on canvas
- [ ] Task A completion auto-queues Task B
- [ ] Failure branches are visible
- [ ] Workflow runs map back to card history
- [ ] Circular dependencies are prevented

---

## Phase 6: Policy and Trust Layer

**Goal**: ArmorIQ integration, visible policy decisions, blocked action rendering

### 👤 Harsh Tasks (Primary)

- [ ] Create `packages/policy-engine`
  - [ ] Implement ArmorIQ client wrapper
  - [ ] Define policy templates (project, task, tool scopes)
  - [ ] Implement preflight policy checks
  - [ ] Implement runtime allow/deny evaluation
  - [ ] Add reason code mapping
- [ ] Integrate ArmorIQ in `apps/serve`
  - [ ] Setup ArmorIQ connection (`src/bridge/policy/`)
  - [ ] Implement preflight check on task creation
  - [ ] Implement runtime checks on tool invocations
  - [ ] Write policy events to SpacetimeDB
  - [ ] Handle override requests
- [ ] Add policy endpoints
  - [ ] `GET /tasks/:cardId/policy` - get current policy profile
  - [ ] `POST /tasks/:cardId/policy/override` - request override

### 👤 Aman Tasks (Supporting)

- [ ] Build policy UI components
  - [ ] Show policy profile badge on card
  - [ ] Show blocked actions list
  - [ ] Show allow/deny event timeline
  - [ ] Add override request UI
  - [ ] Style policy indicators (icons, colors)

### 👤 Koustubh Tasks (Supporting)

- [ ] Extend `packages/contracts`
  - [ ] Add policy decision schemas
  - [ ] Add policy profile schemas
  - [ ] Add override request schemas
- [ ] Update SpacetimeDB schema
  - [ ] Add `record_policy_decision` reducer
  - [ ] Add `policy_events` table
  - [ ] Add `policy_override_requested` event
- [ ] Write tests
  - [ ] Test policy evaluation
  - [ ] Test blocked action logging
  - [ ] Test override flow

### Exit Criteria

- [ ] Every blocked action is visible on card
- [ ] Policy decisions are stored historically
- [ ] Card UI exposes current trust state
- [ ] User can see why an action was blocked
- [ ] Override requests work where applicable

---

## Phase 7: Model Race and Advanced Orchestration

**Goal**: Side-by-side model comparison, race groups, fork/replay

### 👤 Aman Tasks (Primary)

- [ ] Build race UI (`apps/web/features/races/`)
  - [ ] Create race group container component
  - [ ] Implement side-by-side card layout
  - [ ] Add comparison controls
  - [ ] Add winner selection UI
  - [ ] Show race metrics (latency, quality, policy violations)
  - [ ] Style race group visually distinct

### 👤 Harsh Tasks (Primary)

- [ ] Implement race functionality in `apps/serve`
  - [ ] Create race manager (`bridge/opencode/race-manager.ts`)
  - [ ] Implement session forking for races
  - [ ] Create multiple sessions with different model configs
  - [ ] Track race group metadata
  - [ ] Handle winner selection
- [ ] Add race endpoints
  - [ ] `POST /tasks/:cardId/race` - create race from existing card
  - [ ] `POST /tasks/:cardId/pick-winner` - select winning model
- [ ] Implement card templates
  - [ ] Template storage
  - [ ] Template instantiation
  - [ ] Template management endpoints

### 👤 Koustubh Tasks (Supporting)

- [ ] Extend `packages/contracts`
  - [ ] Add race group schemas
  - [ ] Add race comparison schemas
  - [ ] Add template schemas
- [ ] Update SpacetimeDB schema
  - [ ] Add `race_group` table
  - [ ] Add race-related reducers
- [ ] Write tests
  - [ ] Test race creation
  - [ ] Test parallel session execution
  - [ ] Test winner selection

### Exit Criteria

- [ ] Two models can run same task side by side
- [ ] Race cards appear as siblings on canvas
- [ ] User can compare outputs visually
- [ ] Winner selection can feed downstream dependencies
- [ ] Card templates work for repeated tasks

---

## Phase 8: Audio and Remote Quality

**Goal**: ElevenLabs notifications, device preferences, mobile command hardening

### 👤 Harsh Tasks (Primary)

- [ ] Create `packages/voice`
  - [ ] Implement ElevenLabs client wrapper
  - [ ] Implement text-to-speech generation
  - [ ] Add audio caching
  - [ ] Handle generation failures
- [ ] Integrate ElevenLabs in `apps/serve`
  - [ ] Setup voice service (`src/bridge/voice/`)
  - [ ] Implement notification triggers:
    - [ ] Approval needed
    - [ ] Task failed
    - [ ] All tasks completed
    - [ ] Blocked policy action
  - [ ] Store audio URLs in SpacetimeDB
  - [ ] Add audio generation queue

### 👤 Aman Tasks (Supporting)

- [ ] Build audio UI
  - [ ] Add audio player component
  - [ ] Add audio settings page
  - [ ] Implement device-level preferences:
    - [ ] Mute all
    - [ ] Mobile only
    - [ ] Desktop only
    - [ ] Approvals only
    - [ ] Failures only
  - [ ] Add autoplay controls
  - [ ] Add notification queue UI

### 👤 Koustubh Tasks (Supporting)

- [ ] Extend `packages/contracts`
  - [ ] Add audio notification schemas
  - [ ] Add audio preference schemas
- [ ] Update SpacetimeDB schema
  - [ ] Add `enqueue_voice_notification` reducer
  - [ ] Add `audio_events` table
- [ ] Harden command relay for mobile
  - [ ] Test command latency
  - [ ] Add retry logic
  - [ ] Add offline queue
  - [ ] Test on real mobile devices
- [ ] Write tests
  - [ ] Test audio generation
  - [ ] Test notification triggers
  - [ ] Test mobile command relay reliability

### Exit Criteria

- [ ] Approval-needed events announce audibly
- [ ] Audio plays on correct devices based on preferences
- [ ] Mobile control is reliable over SpacetimeDB relay
- [ ] Command latency is acceptable (<2s)
- [ ] Offline commands queue and execute when reconnected

---

## Phase 9: Packaging and Desktop Shell

**Goal**: Optional Tauri wrapper, system tray, native notifications

### 👤 Harsh Tasks (Primary)

- [ ] Initialize `apps/desktop`
  - [ ] Setup Tauri project
  - [ ] Configure Tauri for `apps/web` integration
  - [ ] Setup build pipeline
- [ ] Implement desktop features (`apps/desktop/src-tauri/`)
  - [ ] System tray integration
  - [ ] Launch on startup
  - [ ] Native notifications
  - [ ] Deep links for task navigation
  - [ ] Auto-update configuration

### 👤 Aman Tasks (Supporting)

- [ ] Ensure `apps/web` works in desktop context
  - [ ] Test rendering in Tauri webview
  - [ ] Fix any desktop-specific UI issues
  - [ ] Add desktop-specific shortcuts

### 👤 Koustubh Tasks (Supporting)

- [ ] Setup packaging scripts
  - [ ] Build script for desktop app
  - [ ] Code signing configuration
  - [ ] Distribution setup (DMG, EXE, AppImage)
- [ ] Write end-to-end tests
  - [ ] Test desktop app launch
  - [ ] Test system tray actions
  - [ ] Test native notifications

### 👤 Koustubh Tasks (Supporting)

### Exit Criteria

- [ ] Packaged desktop build runs on macOS, Windows, Linux
- [ ] System tray shows bridge status
- [ ] Launch on startup works
- [ ] Native notifications appear for key events
- [ ] Bridge + UI run together in desktop app

---

## Testing & Quality Assurance (Continuous)

### 👤 Koustubh Tasks (Ongoing)

- [ ] Write unit tests for all packages
  - [ ] `packages/contracts`
  - [ ] `packages/agent-events`
  - [ ] `packages/opencode-adapter`
  - [ ] `packages/workflow-adapter`
  - [ ] `packages/policy-engine`
  - [ ] `packages/canvas-model`
  - [ ] `packages/board-engine`
- [ ] Write integration tests
  - [ ] Task queue flow
  - [ ] Approval round trip
  - [ ] Dependency trigger
  - [ ] Command relay
- [ ] Write E2E tests
  - [ ] Desktop queue → mobile approve → task completes
  - [ ] Dependency auto-queue
  - [ ] Model race completion
- [ ] Setup CI/CD pipeline
  - [ ] GitHub Actions for tests
  - [ ] Automated builds
  - [ ] Test coverage reporting

### 👤 Aman Tasks (Ongoing)

- [ ] Visual regression tests
  - [ ] Card compact state
  - [ ] Card expanded state
  - [ ] Approval state
  - [ ] Race comparison
  - [ ] Mobile action bar

### 👤 Harsh Tasks (Ongoing)

- [ ] Performance testing
  - [ ] Command latency benchmarks
  - [ ] WebSocket performance
  - [ ] SpacetimeDB write performance
- [ ] Add observability
  - [ ] Structured logging
  - [ ] Trace IDs
  - [ ] Error tracking
  - [ ] Metrics collection

---

## Documentation (Continuous)

### 👤 Koustubh Tasks

- [ ] Write package READMEs
- [ ] Document API contracts
- [ ] Write testing guide
- [ ] Document SpacetimeDB schema

### 👤 Aman Tasks

- [ ] Document component API (for all UI components)
- [ ] Write UI/UX guidelines
- [ ] Create design system documentation

### 👤 Harsh Tasks

- [ ] Write bridge architecture docs
- [ ] Document deployment process
- [ ] Write troubleshooting guide
- [ ] Document backend API endpoints
- [ ] Document OpenCode integration patterns

---

## Work Distribution Summary

| Phase       | Harsh (Backend/Bridge) | Koustubh (Foundation/25%) | Aman (Frontend/UI) |
| ----------- | ---------------------- | ------------------------- | ------------------ |
| **Phase 0** | 35%                    | 50%                       | 15%                |
| **Phase 1** | 75%                    | 25%                       | 0%                 |
| **Phase 2** | 50%                    | 50%                       | 0%                 |
| **Phase 3** | 15%                    | 10%                       | 75%                |
| **Phase 4** | 60%                    | 15%                       | 25%                |
| **Phase 5** | 60%                    | 15%                       | 25%                |
| **Phase 6** | 70%                    | 15%                       | 15%                |
| **Phase 7** | 60%                    | 15%                       | 25%                |
| **Phase 8** | 60%                    | 25%                       | 15%                |
| **Phase 9** | 60%                    | 30%                       | 10%                |

**Overall workload distribution**:

- **Harsh**: ~55% (Bridge, OpenCode integration, Elysia server, all backend APIs, policy engine, workflow adapter, voice service, desktop packaging)
- **Koustubh**: ~25% (Shared packages, contracts, SpacetimeDB, testing infrastructure, CI/CD)
- **Aman**: ~20% (ALL UI components, React Flow canvas, boards, cards, approvals, mobile UI, races, dependency visualization, policy UI, audio UI)

---

## Critical Dependencies

1. **Phase 0 must complete first** - all team members need shared packages
2. **Phase 1 Harsh** → **Phase 1 Aman** (need working bridge before UI can connect)
3. **Phase 2 Koustubh** → **Phase 2 Harsh/Aman** (SpacetimeDB schema must exist first)
4. **Phase 3 Aman** needs **Phase 2 complete** (needs SpacetimeDB data)
5. **Phase 5 Harsh** and **Phase 6 Harsh** can run in parallel after Phase 4
6. **Phase 7** needs **Phase 5 complete** (race depends on dependency system)

---

## Communication Protocol

- **Daily standups**: Sync on blockers and dependencies
- **Shared contracts changes**: Announce in team chat before merging
- **Package API changes**: Create proposal, get team review
- **Feature branch naming**: `<name>/<phase>-<feature>` (e.g., `harsh/phase3-canvas-layout`)
- **PR reviews**: Cross-review between team members
- **Integration points**: Schedule pairing sessions for complex integrations

---

## Success Metrics

- [ ] All phases complete on schedule
- [ ] No merge conflicts due to overlapping work
- [ ] Test coverage >80% for packages
- [ ] All exit criteria met for each phase
- [ ] Demo-ready MVP by end of Phase 4
- [ ] Production-ready v1 by end of Phase 9
