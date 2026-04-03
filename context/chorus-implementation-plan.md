# Chorus Implementation Plan

## 1. Project Summary

**Chorus** is an infinite-canvas mission control system for AI coding agents.

The product thesis is simple:

- today's coding-agent UX is too terminal-bound
- a manager needs visibility, orchestration, interruption, and approval control
- the right mental model is not "one chat with one agent"
- the right mental model is "a live operations floor with many tasks running at once"

Chorus turns every coding task into a live card on a spatial canvas. Cards move through kanban states like `queue`, `in_progress`, `approve`, and `done`. Each card streams live agent output, exposes a compact control surface for `approve`, `reject`, `abort`, and `redirect`, and can participate in dependency chains so downstream work starts automatically when upstream work completes.

The key differentiation is not replacing the coding agent. It is changing the human's relationship to the agent:

- the human becomes the manager
- the agents become the workforce
- the canvas becomes the operations floor

Because state is synced through **SpacetimeDB**, the same session can be watched and controlled from desktop and mobile. Because task execution is driven by **OpenCode SDK**, Chorus stays attached to a real coding agent instead of pretending to be one. Because policy and workflow systems are explicit, Chorus can show what the agent is allowed to do, what was blocked, and why.

## 2. Product Goals

### Primary goals

- visualize many agent tasks at once on an infinite canvas
- keep every task legible as a single live card with streaming output
- support parallel agent runs without collapsing into tab chaos
- preserve human control with approval gates and interruption controls
- let users connect tasks into dependency chains and automation flows
- make the same session controllable from phone, tablet, or laptop
- keep the bridge process local-first so the user's laptop remains the execution host

### Secondary goals

- support side-by-side model races from the same prompt
- provide audio feedback for important moments like approval requests or failures
- surface allowed and blocked actions through explicit policy decisions
- maintain a modular codebase that three engineers can build in parallel

### Non-goals for v1

- becoming a general-purpose IDE
- replacing OpenCode's own TUI or web UI
- building a full hosted multi-tenant cloud executor
- solving remote shell tunneling as a first-class product before the local bridge is stable

## 3. Core User Experience

### Main flow

1. The user opens Chorus and lands on an infinite canvas.
2. Each project appears as a visual kanban workspace on that canvas.
3. The user creates one or more task cards from prompts, templates, or linked dependencies.
4. Chorus sends the task to the local bridge.
5. The bridge creates or attaches to an OpenCode session.
6. Live task output starts streaming into the card.
7. Card pulse intensity reflects agent activity.
8. If the task needs permission or human confirmation, the card moves to `approve`.
9. The user approves, rejects, aborts, or redirects from desktop or mobile.
10. If the task finishes successfully, downstream dependencies can auto-queue.

### Important UX behaviors

- cards visibly migrate between kanban states, not just change labels
- active cards feel alive through pulse, status, timer, and output stream
- output must be readable without opening a modal for every task
- cards must support an expanded detail drawer without losing board context
- approvals must be one-tap on mobile and one-click on desktop
- dependency wires must make automation understandable at a glance
- a model race must feel like two live workers diverging from the same brief

## 4. Technology Responsibilities

### SpacetimeDB

Use SpacetimeDB as the **state plane**:

- authoritative shared state for boards, cards, runs, approvals, policy decisions, and device presence
- real-time replication to all connected clients
- command queue for remote/mobile control when a direct local websocket is unavailable
- append-only event log plus denormalized projection tables for fast UI reads

### OpenCode SDK

Use OpenCode SDK as the **agent execution plane**:

- launch or connect to a local OpenCode server
- create sessions for task execution
- subscribe to session and event streams
- handle approvals, aborts, redirects, forks, and file/context inspection
- support same-prompt multi-model races through multiple sessions or session forks

### ArmorIQ

Use ArmorIQ as the **policy plane**:

- define what actions the agent is allowed to perform
- evaluate requested actions against task policy and user policy
- return allow/deny decisions with reasons
- write visible policy decision events so the UI can show allowed vs blocked actions

### Superplane

Use Superplane as the **workflow plane**:

- compile visual dependency chains into durable workflows
- support approval-gated automation, branching, retries, and downstream queuing
- orchestrate task graphs that extend beyond a single card lifecycle
- keep workflow logic out of the UI layer

### ElevenLabs

Use ElevenLabs as the **voice feedback plane**:

- announce approval-needed, blocked, failed, or completed events
- optionally summarize a finished task for remote/mobile use
- support short low-latency notifications first, richer narrated summaries later

### Next.js + React Flow + Tailwind CSS

Use the web stack as the **interaction layer**:

- Next.js App Router for shell, routing, server/client boundaries, and deployment ergonomics
- React Flow for infinite canvas, groups, custom task nodes, and dependency edges
- Tailwind CSS for fast layout composition, tokens, and themeable UI primitives

### Turborepo + Bun + Elysia + WebSocket

Use the monorepo and bridge stack as the **local control surface**:

- Turborepo for app/package boundaries and caching
- Bun as the runtime and package manager
- Elysia for local HTTP and WebSocket APIs in `apps/serve`
- WebSocket as the low-latency command channel between UI and local bridge

## 5. Architectural Principles

- **State plane vs command plane:** SpacetimeDB is the shared state source of truth. WebSocket is the low-latency local command path. Do not make both authoritative.
- **Local-first execution:** The laptop bridge owns agent execution. Clients observe and control it.
- **Event normalization at the edge:** OpenCode, ArmorIQ, Superplane, and ElevenLabs all emit different event shapes. Normalize them before they enter the shared state model.
- **Append-only history plus derived views:** Keep the full event log for debugging, but render from projection tables.
- **Modular repo boundaries:** all cross-app contracts must live in `packages/`, not be copy-pasted across apps.
- **Human override always wins:** any automated workflow must yield to abort, reject, or redirect.
- **Mobile is a first-class control surface:** remote approval and task interruption must not depend on a desktop-only UI.

## 6. Recommended Monorepo Shape

Use a Turborepo layout like this:

```text
chorus/
  apps/
    web/
      app/
        (marketing)/
        (dashboard)/
          projects/[projectId]/
          settings/
        api/health/
      components/
      features/
        boards/
        cards/
        canvas/
        approvals/
        races/
        mobile/
      hooks/
      lib/
      styles/
    serve/
      src/
        bootstrap/
        config/
        routes/
        ws/
        bridge/
          opencode/
          spacetime/
          policy/
          workflow/
          voice/
        services/
        workers/
        events/
        telemetry/
      tests/
    desktop/
      src-tauri/
      src/
  packages/
    contracts/
    config/
    ui/
    ui-tokens/
    canvas-model/
    board-engine/
    agent-events/
    opencode-adapter/
    spacetime-bindings/
    workflow-adapter/
    policy-engine/
    voice/
    store/
    utils/
    test-utils/
  context/
  turbo.json
  package.json
  bunfig.toml
  tsconfig.json
```

### Why this shape matters

- `apps/web` owns user interaction
- `apps/serve` owns the local bridge and integration side effects
- `apps/desktop` stays optional until local packaging is needed
- `packages/` holds every shared contract, component library, reducer input schema, event parser, and adapter boundary
- three engineers can work in parallel if ownership is clear and package boundaries are respected

## 7. Detailed Package Responsibilities

### `packages/contracts`

Contains shared schemas and DTOs:

- card status enums
- websocket message schemas
- SpacetimeDB reducer payload types
- approval commands
- workflow node payloads
- policy decision payloads

Use one validation system consistently. `zod` is the simplest fit for shared TypeScript-first contracts.

### `packages/agent-events`

Contains normalized event types from upstream systems:

- OpenCode session events
- task stream chunks
- policy allow/deny events
- workflow transition events
- voice notification events

This package should expose:

- parsers from raw upstream payloads
- normalized TypeScript types
- projection helpers for card/run state

### `packages/opencode-adapter`

Wrap the OpenCode SDK so the rest of the app never depends on raw SDK response shapes directly.

Responsibilities:

- create client / connect client
- create session
- subscribe to session events
- fork session
- prompt existing session
- abort session
- resolve permission requests

### `packages/workflow-adapter`

Wrap Superplane behind a stable internal interface.

Responsibilities:

- compile card dependency graphs into workflow definitions
- start workflow runs
- map workflow run items back to Chorus cards
- translate pass/fail/approval channels into Chorus events

This wrapper is important because Superplane is still young, and its public model should not leak into the full codebase.

### `packages/policy-engine`

Wrap ArmorIQ policy checks.

Responsibilities:

- policy templates for project, task, and tool scopes
- preflight policy calculation when a task is queued
- runtime allow/deny evaluation for requested actions
- reason codes for blocked actions

### `packages/spacetime-bindings`

Generated bindings and helpers for SpacetimeDB.

Responsibilities:

- generated client/module bindings
- typed query helpers
- reducer wrappers
- connection lifecycle helpers for web and serve

### `packages/canvas-model`

Owns spatial concepts:

- board positions on infinite canvas
- node geometry
- lane coordinates
- edge routing metadata
- viewport persistence

### `packages/board-engine`

Owns kanban behavior:

- status-to-lane mapping
- card sort rules
- card clustering by project / race group / dependency state
- auto-move behavior when task status changes

### `packages/ui` and `packages/ui-tokens`

Own shared primitives and design tokens:

- card shell
- pulse indicator
- log viewer
- approval controls
- mobile action bar
- typography scale
- spacing, color, elevation, and motion tokens

### `packages/store`

Holds shared client state logic that should not live inside random React components:

- ephemeral UI state
- optimistic command queue
- local selection state
- viewport state
- command acknowledgement reconciliation

## 8. Board and Canvas Model

The cleanest model is:

- a **project board** is a React Flow parent/group node
- each **task card** is a child node inside that board
- each board renders four visible lanes: `queue`, `in_progress`, `approve`, `done`
- **dependency edges** connect child task nodes
- **race cards** are sibling child nodes connected to the same originating task group

This gives you:

- a true infinite canvas at board level
- true connectable task nodes for dependency wiring
- simple visual movement when status changes from one lane to another
- room for multiple boards from multiple projects at once

### Suggested spatial rules

- board nodes are movable on the infinite canvas
- lane position inside a board is fixed
- card x/y position is derived from lane + order + optional pinning offset
- dependency edges use custom React Flow edges with status coloring
- race pairs share a `raceGroupId` and can render mirrored layouts

## 9. Card Anatomy

Each card should contain:

- title
- originating prompt summary
- assigned model / agent profile
- current status
- pulse indicator
- elapsed runtime
- streaming output preview
- latest event summary
- approval state if blocked or waiting
- controls: approve, reject, abort, redirect, expand

### Pulse behavior

Drive the pulse from normalized activity states:

- `writing`: faster pulse
- `thinking`: slower pulse
- `waiting_for_approval`: steady highlighted pulse
- `error`: red or warning pulse
- `idle`: no pulse or subtle ambient state

Do not infer pulse directly from token count every frame. Compute activity buckets in the bridge and push stable states.

## 10. Domain Model

Use these core entities.

### Workspace and project entities

- `workspace`
- `project`
- `board`
- `lane`
- `device_session`
- `user_preferences`

### Task execution entities

- `task_card`
- `task_run`
- `agent_session`
- `task_dependency`
- `race_group`
- `approval_request`
- `policy_decision`
- `workflow_run`
- `audio_notification`

### Event entities

- `agent_event`
- `ui_command`
- `system_event`
- `presence_event`

### Important IDs

- `projectId`
- `boardId`
- `cardId`
- `runId`
- `sessionId`
- `dependencyId`
- `workflowRunId`
- `approvalId`
- `policyDecisionId`
- `commandId`

## 11. SpacetimeDB Data Strategy

Use an event-sourced-light approach:

### Append-only tables

- `agent_events`
- `policy_events`
- `workflow_events`
- `audio_events`
- `ui_commands`

### Projection tables

- `cards`
- `card_runs`
- `approvals`
- `boards`
- `board_views`
- `device_presence`
- `dependency_graph`

### Reducers

Reducers should be narrow and explicit:

- `create_project`
- `create_board`
- `create_card`
- `queue_card`
- `attach_agent_session`
- `record_agent_event`
- `record_policy_decision`
- `request_approval`
- `resolve_approval`
- `complete_card`
- `fail_card`
- `abort_card`
- `redirect_card`
- `link_dependency`
- `trigger_downstream_cards`
- `enqueue_voice_notification`
- `acknowledge_ui_command`

### Why this design fits SpacetimeDB

Context7 guidance for SpacetimeDB shows a strong fit for:

- server-fetched initial state followed by live client subscription
- reducer-driven state changes
- generated TypeScript bindings
- React hooks or equivalent subscription-driven UI sync

For Chorus, that means:

- initial board snapshots can render immediately
- live task state can take over once the SpacetimeDB connection is established
- all connected devices converge on the same canonical board state

## 12. Command Plane Design

There are two command paths.

### Path A: local direct command

Use WebSocket between `apps/web` and `apps/serve` when the user is on the same machine or same trusted network.

Use it for:

- queue task
- approve
- reject
- abort
- redirect
- create race
- manual retry

This is the lowest-latency path.

### Path B: remote/mobile command relay

Use SpacetimeDB command reducers for mobile or remote clients that cannot open a direct websocket to the laptop bridge.

Flow:

1. mobile client writes `ui_command`
2. laptop bridge subscribes to pending commands
3. laptop bridge executes against OpenCode / ArmorIQ / Superplane
4. laptop bridge writes acknowledgement and resulting state events

This makes mobile control possible without requiring a direct mobile-to-laptop socket tunnel in v1.

## 13. OpenCode Integration Plan

OpenCode is the backbone of live task execution.

### Required capabilities

- create and manage sessions
- stream events from sessions
- inspect session state
- interrupt runs
- continue runs after approval
- fork or duplicate sessions for model races

### Recommended integration shape

Inside `apps/serve`, create:

- `bridge/opencode/client.ts`
- `bridge/opencode/session-manager.ts`
- `bridge/opencode/event-stream.ts`
- `bridge/opencode/permission-handler.ts`
- `bridge/opencode/race-manager.ts`

### Session lifecycle

1. card is created in Chorus
2. bridge creates OpenCode session
3. bridge stores `sessionId` on card projection
4. bridge subscribes to session events
5. raw events are normalized into `agent_event`
6. projections update card state and output preview
7. approval events move card into `approve`
8. completion or failure updates projections and dependency triggers

### Redirect semantics

A redirect should not be treated like editing card metadata.

A redirect is:

- a user-authored instruction injected into the active session, or
- a fork-and-replace flow if the current run should preserve history

Use two redirect modes:

- `soft_redirect`: send corrective prompt into current session
- `hard_redirect`: fork or create a new run and link it to the original card

### Model race semantics

Create two or more sibling cards tied to the same `raceGroupId`.

For each racer:

- create a session with different model config, or
- fork a common prep session before the main task prompt

The user can compare:

- output quality
- latency
- policy violations
- completion success

## 14. ArmorIQ Integration Plan

ArmorIQ should not be treated as an afterthought banner.

It should appear in the core run lifecycle.

### Policy checkpoints

- task creation preflight
- tool invocation / action request
- escalation or permission request
- redirect that expands task scope

### Visible outputs

For every policy evaluation, store:

- `decision`: allowed or blocked
- `reasonCode`
- `humanMessage`
- `taskScope`
- `requestedAction`
- `timestamp`

### UI requirements

Each card should expose:

- current policy profile
- most recent allow/deny event
- a list of blocked actions
- whether the human can override

This is important because the product promise includes showing both allowed and blocked actions, not merely silently filtering them.

## 15. Superplane Integration Plan

Superplane should power task graphs, not raw token streaming.

### What Chorus owns

- card creation
- card presentation
- live task state
- session controls
- board movement

### What Superplane owns

- workflow graph execution
- conditional downstream triggers
- retries and branch outcomes
- approval-channel branching
- long-running automation coordination

### Compilation model

When a user wires Task B after Task A, Chorus should compile that visual dependency into a workflow definition.

Simple case:

- Task A success -> queue Task B

Richer cases:

- Task A success -> approval gate -> Task B
- Task A failure -> remediation task
- Task A complete -> run model race on Task B

### Why this is a good fit

Superplane's docs describe an event-driven workflow model where nodes emit payloads and downstream nodes subscribe to them. That maps cleanly to Chorus card dependencies, approval outcomes, and downstream task automation.

## 16. ElevenLabs Integration Plan

Use ElevenLabs sparingly and intentionally.

### v1 audio moments

- card needs approval
- card failed
- all tasks in a board completed
- blocked policy action requires attention

### Audio pipeline

1. normalized event triggers `audio_notification`
2. voice service renders a short sentence
3. generated audio URL or blob reference is stored
4. active client devices decide whether to autoplay, queue, or ignore based on user settings

### Important settings

- mute all
- mobile only
- desktop only
- approvals only
- failures only
- use concise or verbose narration

### Practical note

ElevenLabs offers both standard and streaming text-to-speech endpoints. Start with short one-shot generation for notification events; only add streaming spoken summaries later if the UX proves worth the latency and cost.

## 17. Next.js App Architecture

Use the App Router with a clear split between server-rendered shells and interactive client surfaces.

### Server-rendered responsibilities

- route shells
- auth/session bootstrapping
- initial board snapshot fetch
- user preferences fetch
- static settings pages

### Client-rendered responsibilities

- React Flow canvas
- live board updates
- streaming card output
- drag, zoom, pan, wire creation
- local action toolbar
- mobile command controls

### Important implementation rules

- keep the interactive canvas in narrowly scoped client boundaries
- do not mark entire layouts as client components
- stream initial data into client surfaces instead of forcing everything into client fetches
- treat the live canvas as an application island inside a mostly server-rendered shell

This follows current Next.js guidance: pages and layouts stay server-first by default, while interactive surfaces are isolated behind explicit client boundaries.

## 18. Frontend Feature Slices

Split `apps/web/features` by product area.

```text
features/
  canvas/
    components/
    hooks/
    lib/
  boards/
    components/
    hooks/
    selectors/
  cards/
    components/
    hooks/
    utils/
  approvals/
    components/
    hooks/
  races/
    components/
    hooks/
  mobile/
    components/
    hooks/
  settings/
    components/
```

This is deliberately boring in structure and good for team concurrency.

## 19. Backend Feature Slices

Split `apps/serve/src` by integration and runtime concern.

```text
src/
  bootstrap/
  config/
  routes/
  ws/
  bridge/
    opencode/
    spacetime/
    policy/
    workflow/
    voice/
  services/
  workers/
  events/
  telemetry/
```

### Why this split works

- `routes/` handles HTTP entry points
- `ws/` handles local command channel concerns
- `bridge/*` isolates each external system
- `events/` owns normalization and projection triggers
- `workers/` handles retries, polling, and side-effect orchestration

## 20. File Split to Avoid Team Collisions

Assume three engineers.

### Engineer 1: web interaction owner

Owns:

- `apps/web/features/canvas/**`
- `apps/web/features/boards/**`
- `apps/web/features/cards/**`
- `packages/ui/**`
- `packages/ui-tokens/**`
- `packages/canvas-model/**`

### Engineer 2: bridge and runtime owner

Owns:

- `apps/serve/src/bridge/opencode/**`
- `apps/serve/src/routes/**`
- `apps/serve/src/ws/**`
- `packages/opencode-adapter/**`
- `packages/contracts/**`
- `packages/agent-events/**`

### Engineer 3: orchestration and trust owner

Owns:

- `apps/serve/src/bridge/policy/**`
- `apps/serve/src/bridge/workflow/**`
- `apps/serve/src/bridge/voice/**`
- `packages/workflow-adapter/**`
- `packages/policy-engine/**`
- `packages/voice/**`
- `packages/spacetime-bindings/**`

### Shared rule

No one edits another engineer's feature slice unless they coordinate first. Shared types change only through `packages/contracts`.

## 21. Suggested Event Taxonomy

Normalize everything to a small event vocabulary.

### Card lifecycle

- `card.created`
- `card.queued`
- `card.started`
- `card.moved`
- `card.waiting_for_approval`
- `card.approved`
- `card.rejected`
- `card.redirected`
- `card.aborted`
- `card.completed`
- `card.failed`

### Stream events

- `stream.delta`
- `stream.phase.changed`
- `stream.activity.changed`
- `stream.tool.started`
- `stream.tool.completed`

### Policy events

- `policy.allowed`
- `policy.blocked`
- `policy.override_requested`
- `policy.override_granted`

### Workflow events

- `workflow.linked`
- `workflow.triggered`
- `workflow.branch.taken`
- `workflow.retry.scheduled`

### Voice events

- `voice.enqueued`
- `voice.generated`
- `voice.played`
- `voice.failed`

## 22. API Surface

Keep the HTTP API intentionally small.

### HTTP routes in `apps/serve`

- `POST /tasks`
- `POST /tasks/:cardId/approve`
- `POST /tasks/:cardId/reject`
- `POST /tasks/:cardId/abort`
- `POST /tasks/:cardId/redirect`
- `POST /tasks/:cardId/race`
- `GET /health`
- `GET /bridge/status`

### WebSocket messages

- `task.queue`
- `task.approve`
- `task.reject`
- `task.abort`
- `task.redirect`
- `task.race`
- `viewport.sync`
- `presence.ping`

### Response design

Every command should return:

- `commandId`
- `accepted`
- `cardId`
- `timestamp`

Authoritative state changes should come from SpacetimeDB events, not from the command response payload.

## 23. Sequence Flows

### A. Queue a new task

1. user submits prompt from web UI
2. web sends `task.queue` through WS or HTTP
3. serve validates payload and preflights policy
4. serve creates card and run projections
5. serve starts OpenCode session
6. serve subscribes to session events
7. normalized events are written into SpacetimeDB
8. all clients receive live updates and render the card in `in_progress`

### B. Approval request

1. OpenCode emits permission or approval-needed state
2. serve normalizes event
3. SpacetimeDB card projection moves to `approve`
4. mobile and desktop clients render approval controls
5. user approves from either device
6. command reaches serve through WS or SpacetimeDB relay
7. serve resolves the OpenCode permission request
8. task resumes and card returns to `in_progress`

### C. Dependency trigger

1. Task A enters `completed`
2. workflow adapter checks linked edges
3. Superplane run advances
4. downstream Task B is queued
5. Task B card appears in `queue` or `in_progress` depending on workflow policy

### D. Model race

1. user triggers race from a card
2. serve creates sibling race cards
3. each race card gets distinct model config
4. each session streams independently
5. user compares outputs and either picks winner or keeps both

## 24. Phased Delivery Plan

### Phase 0: foundation and contracts

Deliverables:

- Turborepo scaffold
- Bun workspace config
- `apps/web` and `apps/serve`
- shared `packages/contracts`
- shared lint, typecheck, test config
- base design tokens and UI primitives

Exit criteria:

- repo installs cleanly
- `web` and `serve` boot
- shared contracts compile in both apps

### Phase 1: local bridge MVP

Deliverables:

- Elysia server
- OpenCode adapter
- ability to queue a task locally
- stream raw output to a temporary panel
- minimal task card lifecycle: `queue -> in_progress -> done|failed`

Exit criteria:

- one task can be started and observed end-to-end from Chorus
- abort works
- raw event normalization exists

### Phase 2: SpacetimeDB shared state

Deliverables:

- SpacetimeDB schema
- reducer wrappers
- event log tables
- card projection tables
- web subscriptions

Exit criteria:

- second browser receives the same live task state
- refresh restores current board state
- local bridge writes to SpacetimeDB reliably

### Phase 3: real canvas and kanban boards

Deliverables:

- React Flow infinite canvas
- project board group nodes
- lane rendering
- live task card nodes
- status-based card movement

Exit criteria:

- multiple boards can be arranged on canvas
- cards visibly move between lanes
- viewport persists per user/project

### Phase 4: approvals and control surface

Deliverables:

- approval state handling
- approve/reject/abort/redirect controls
- mobile-friendly action bar
- card detail drawer

Exit criteria:

- approval can be resolved from desktop and mobile
- redirect creates visible state change and history event
- optimistic UI reconciles with authoritative state

### Phase 5: dependency edges and workflow execution

Deliverables:

- card-to-card wiring
- dependency validation
- Superplane adapter
- auto-queue downstream tasks
- retry and branch support

Exit criteria:

- Task B can auto-run after Task A
- failure branches are visible
- workflow runs map back to card history

### Phase 6: policy and trust layer

Deliverables:

- ArmorIQ adapter
- per-task policy profiles
- blocked action rendering
- override flow where applicable

Exit criteria:

- every blocked action is visible and explainable
- policy decisions are stored historically
- card UI exposes current trust state

### Phase 7: model race and advanced orchestration

Deliverables:

- race groups
- side-by-side comparison UI
- fork/replay utilities
- card templates for repeated tasks

Exit criteria:

- two models can run same task side by side
- winner selection can feed downstream dependencies

### Phase 8: audio and remote quality

Deliverables:

- ElevenLabs notifications
- device-level audio preferences
- command relay hardening for mobile
- push-style attention UX

Exit criteria:

- approval-needed events can announce audibly
- mobile control is reliable over shared state relay

### Phase 9: packaging and desktop shell

Deliverables:

- optional Tauri wrapper
- system tray
- launch-on-startup
- native notifications

Exit criteria:

- packaged local desktop build can run bridge + UI together

## 25. MVP Recommendation

Do not build every promise at once.

The best MVP is:

- one local bridge
- one board
- multiple live cards
- basic kanban states
- streaming output
- approval / abort / redirect
- SpacetimeDB sync across two clients

Add dependency wiring and model races immediately after that baseline is stable.

## 26. Testing Strategy

### Unit tests

- event normalization
- card projection reducers
- policy decision mapping
- workflow compilation
- board lane movement logic

### Integration tests

- queue task through serve into OpenCode adapter
- approval round trip
- command relay via SpacetimeDB
- workflow dependency trigger
- race creation and completion

### End-to-end tests

- desktop queue task
- mobile approve task
- task moves to done
- downstream task queues automatically

### Visual regression targets

- card compact state
- card expanded state
- approval state
- race comparison
- mobile action bar

## 27. Observability and Operations

You need observability early because this product is asynchronous and event-heavy.

Track:

- command latency
- OpenCode session latency
- event normalization failures
- SpacetimeDB write failures
- websocket disconnect frequency
- approval resolution time
- workflow trigger failures
- policy block frequency
- voice generation failures

Add:

- structured logs
- per-card correlation IDs
- per-run trace IDs
- dead-letter queue for failed event projections

## 28. Key Risks and Mitigations

### Risk: duplicated realtime layers become inconsistent

Mitigation:

- keep WebSocket command-only
- keep SpacetimeDB state-authoritative
- never render durable card state from transient websocket payloads alone

### Risk: OpenCode event shapes evolve

Mitigation:

- isolate SDK interaction behind `packages/opencode-adapter`
- treat normalized events as the internal contract

### Risk: workflow and agent models drift apart

Mitigation:

- keep Superplane integration behind `packages/workflow-adapter`
- compile from Chorus graph model, do not let UI depend on Superplane internals

### Risk: mobile cannot reach laptop directly

Mitigation:

- support command relay through SpacetimeDB from day one
- treat direct websocket as optimization, not the only path

### Risk: noisy audio becomes annoying

Mitigation:

- ship audio opt-in
- default to approvals/failures only

## 29. Recommended Initial Backlog

Start with these concrete tickets:

1. Scaffold Turborepo with `apps/web`, `apps/serve`, and shared packages.
2. Implement `packages/contracts` with task/card/command schemas.
3. Add Elysia server with `/health` and local websocket endpoint.
4. Add OpenCode adapter that can start a task and stream normalized events.
5. Add SpacetimeDB schema for cards, runs, approvals, and commands.
6. Render a single project board in Next.js with React Flow.
7. Render live card nodes with pulse and output preview.
8. Implement approve/reject/abort/redirect controls.
9. Add command relay through SpacetimeDB for remote/mobile control.
10. Add dependency edges and first downstream auto-queue flow.

## 30. Sources and Research Notes

### Context7 inputs used

- `/clockworklabs/spacetimedb`
- `/elysiajs/documentation`
- `/vercel/next.js/v16.1.6`

### Official docs referenced

- OpenCode SDK: https://opencode.ai/docs/sdk/
- OpenCode server and events: https://opencode.ai/docs/server/
- Superplane quickstart: https://docs.superplane.com/get-started/quickstart/
- Superplane data flow: https://docs.superplane.com/concepts/data-flow/
- Elysia WebSocket: https://elysiajs.com/patterns/websocket
- Next.js server/client components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js data fetching: https://nextjs.org/docs/14/app/building-your-application/data-fetching
- React Flow docs: https://reactflow.dev/learn
- React Flow custom edges: https://reactflow.dev/learn/customization/custom-edges
- SpacetimeDB reducers: https://spacetimedb.com/docs/1.12.0/functions/reducers/
- ElevenLabs text-to-speech: https://elevenlabs.io/docs/api-reference/text-to-speech/convert

### Key implementation takeaways from research

- SpacetimeDB fits best as the synced state authority with reducer-driven writes and generated client bindings.
- Elysia is a good fit for a Bun-native local bridge with validated WebSocket handlers.
- Next.js should keep the dashboard shell server-first and isolate the canvas inside client boundaries.
- React Flow is a strong fit for custom task nodes, custom edges, and grouped board/canvas interaction.
- Superplane's event-driven payload chaining maps naturally to task dependency orchestration.
- OpenCode's SDK/server model is a strong fit for local task execution plus session control.

## 31. Final Recommendation

Build Chorus in this order:

1. local bridge and live cards
2. synced shared state
3. board/canvas UX
4. approvals and remote control
5. dependency workflows
6. policy visibility
7. model races
8. audio and desktop packaging

That order gets the core promise working early:

the user can queue many coding tasks, watch them move across a live kanban canvas, approve or redirect them from anywhere, and orchestrate a fleet of coding agents instead of babysitting one terminal.
