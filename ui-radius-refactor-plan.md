# UI Radius Refactor Plan

## Goal

Refactor the `apps/web` UI from the current soft, rounded look to a much tighter corner system where the default visual language is approximately Tailwind `rounded-xs`.

This is not a one-line token tweak. The app currently mixes:

- shared primitives that can be normalized centrally
- custom feature components with explicit `rounded-lg`, `rounded-xl`, `rounded-2xl`, and arbitrary radius values
- a few places where circular geometry is intentional and should remain circular

## Audit Summary

Current radius usage in `apps/web/src`:

- ~115 total radius usages
- most common classes:
  - `rounded-lg`: 33
  - `rounded-md`: 31
  - `rounded-xl`: 15
  - `rounded-full`: 13
  - `rounded-sm`: 9
  - `rounded-2xl`: 8
- highest concentration by file:
  - `apps/web/src/components/app-header.tsx`: 40
  - `apps/web/src/features/kanban/components/kanban.tsx`: 19
  - `apps/web/src/features/kanban/components/kanban-card-node.tsx`: 15
  - `apps/web/src/components/prompt-input.tsx`: 10
  - `apps/web/src/features/kanban/components/agent-output-card.tsx`: 9
  - `apps/web/src/features/canvas/components/background-canvas.tsx`: 8

Supporting findings:

- Tailwind is configured through `apps/web/src/app/globals.css`, not a `tailwind.config.*` file.
- The current theme exposes `--radius`, but it does not yet define an explicit full radius scale for Tailwind v4-style radius variables.
- Several primitives are generated/shared UI components:
  - `apps/web/src/components/ui/button.tsx`
  - `apps/web/src/components/ui/dropdown-menu.tsx`
  - `apps/web/src/components/ui/select.tsx`
  - `apps/web/src/components/ui/textarea.tsx`
- Some radius is written as raw CSS:
  - `apps/web/src/app/globals.css`

## Target Radius System

Use a semantic system instead of doing ad hoc class replacements.

### Default mapping

- surface containers: `rounded-xs`
- secondary containers / grouped controls: `rounded-xs`
- small controls: `rounded-xs`
- menus / popovers: `rounded-xs`
- large panels that currently use `rounded-xl` or `rounded-2xl`: reduce to `rounded-sm` or `rounded-xs`
- pills, dots, status lights, toggles, and badges that rely on circular geometry: keep `rounded-full`

### Tailwind token layer

First establish an explicit radius scale in `apps/web/src/app/globals.css` so the app has a single source of truth:

- `--radius-xs`
- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-xl`
- `--radius-2xl`

Recommended visual scale for this refactor:

- `--radius-xs: 0.125rem`
- `--radius-sm: 0.1875rem`
- `--radius-md: 0.25rem`
- `--radius-lg: 0.3125rem`
- `--radius-xl: 0.375rem`
- `--radius-2xl: 0.5rem`

That keeps the entire system visibly sharper while still avoiding hard-edged visual noise.

## Refactor Strategy

### Phase 1: Establish the radius foundation

Files:

- `apps/web/src/app/globals.css`

Tasks:

- Define the explicit Tailwind radius scale in the theme layer.
- Replace the React Flow controls radius in raw CSS with the new sharper values.
- Reduce scrollbar thumb radius to match the new direction.
- Decide whether to introduce semantic utility aliases for common surfaces, for example:
  - `.radius-surface`
  - `.radius-control`
  - `.radius-menu`

Why this phase first:

- it creates the baseline for all shared primitives
- it prevents repeated arbitrary values from reappearing during the sweep

### Phase 2: Normalize shared primitives

Files:

- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/dropdown-menu.tsx`
- `apps/web/src/components/ui/select.tsx`
- `apps/web/src/components/ui/textarea.tsx`
- `apps/web/src/components/ui/resizable.tsx`

Tasks:

- change default button radius from `rounded-md` to the new low-radius baseline
- remove size-specific radius overrides unless the control genuinely needs them
- tighten dropdown/menu content and menu item radii
- tighten select trigger, popup, and item radii
- tighten textarea radius
- tighten the resizable handle radius

Outcome:

- every downstream feature using these primitives inherits the sharper corner system automatically

### Phase 3: Refactor app shell surfaces

Files:

- `apps/web/src/components/app-header.tsx`
- `apps/web/src/components/prompt-input.tsx`

Tasks:

- reduce the shell-level container radii:
  - header shell
  - notification pane
  - mobile drawer/menu surfaces
  - composer shell
  - inline action groups
  - dropdown content overrides
- replace arbitrary values such as `rounded-[1.35rem]` and `rounded-[1rem]`
- keep notification dots and status indicators circular where needed

Risk to watch:

- the header currently uses rounded corners as part of its "floating glass" feel; when corners are tightened, spacing and border contrast may need minor adjustments to avoid looking cramped

### Phase 4: Refactor kanban surfaces

Files:

- `apps/web/src/features/kanban/components/kanban.tsx`
- `apps/web/src/features/kanban/components/kanban-card-node.tsx`
- `apps/web/src/features/kanban/components/agent-output-card.tsx`

Tasks:

- tighten card shells, column shells, empty states, action chips, inline file pills, and review panels
- reduce the main node/card containers from `rounded-xl` and `rounded-2xl` to the new scale
- keep functional circles intact:
  - presence dots
  - counters that are meant to be round
  - toggle thumbs/tracks when the current affordance benefits from a pill shape
- remove local overrides that fight the shared primitive defaults

Risk to watch:

- kanban has the largest density of nested surfaces; aggressive radius reduction without spacing cleanup can make stacked panels visually merge together

### Phase 5: Refactor canvas overlays and controls

Files:

- `apps/web/src/features/canvas/components/background-canvas.tsx`

Tasks:

- tighten floating canvas controls
- tighten keyboard help panel
- tighten keyboard shortcut keycaps if they still read correctly at smaller radii
- review all overlay surfaces against the new shell/header styling so the canvas UI feels consistent with the rest of the app

### Phase 6: Cleanup and remove arbitrary radius debt

Scope:

- full pass over `apps/web/src`

Tasks:

- eliminate arbitrary radius values unless they are justified and documented
- prefer tokenized Tailwind classes over one-off values
- verify no high-radius classes remain on standard surfaces:
  - `rounded-xl`
  - `rounded-2xl`
  - `rounded-[...]`
- allow only deliberate exceptions:
  - `rounded-full`
  - `rounded-none`
  - extremely local one-offs with a clear visual reason

## Replacement Rules

Use these replacement rules during the sweep:

- `rounded-2xl` on panels/cards -> `rounded-sm` or `rounded-xs`
- `rounded-xl` on panels/cards -> `rounded-xs`
- `rounded-lg` on controls/menus/panels -> `rounded-xs`
- `rounded-md` on controls/items -> `rounded-xs`
- `rounded-sm` on tiny utility pills -> keep `rounded-sm` only if `rounded-xs` becomes too harsh
- `rounded-[1rem]` and `rounded-[1.35rem]` -> replace with tokenized classes
- `rounded-full` -> keep only for circles, pills, toggle tracks, and status dots

## Execution Order

Recommended implementation order:

1. `apps/web/src/app/globals.css`
2. shared UI primitives in `apps/web/src/components/ui/*`
3. `apps/web/src/components/prompt-input.tsx`
4. `apps/web/src/components/app-header.tsx`
5. `apps/web/src/features/kanban/components/agent-output-card.tsx`
6. `apps/web/src/features/kanban/components/kanban-card-node.tsx`
7. `apps/web/src/features/kanban/components/kanban.tsx`
8. `apps/web/src/features/canvas/components/background-canvas.tsx`
9. final repo-wide radius audit

This order front-loads the shared primitives, then moves from the app shell into the denser feature surfaces.

## Validation Plan

### Static checks

- run `bun run check`
- run `bun run check-types`
- run a repo-wide grep for remaining radius classes

Suggested grep:

```bash
rg -n '\brounded(-(none|xs|sm|md|lg|xl|2xl|3xl|full|\[[^]]+\]))?\b' apps/web/src
```

### Visual QA

Primary surfaces:

- root app shell on `apps/web/src/app/page.tsx`
- `AppHeader`
- `PromptInput`
- canvas controls and keyboard help panel
- kanban columns, cards, node shells, agent output card
- dropdowns, selects, buttons, textarea

States to verify:

- default
- hover
- focus-visible
- active
- disabled
- open menus and nested submenus
- mobile menu state
- dense kanban content with nested panels

### Acceptance criteria

- standard surfaces visually read as low-radius, close to Tailwind `rounded-xs`
- no large rounded containers remain unless intentionally justified
- circular UI affordances still look intentional and usable
- the app shell, canvas overlays, and kanban surfaces feel like one system
- desktop and mobile layouts still read cleanly

## Risks

- reducing radius without compensating spacing can make dense dark surfaces feel heavier
- nested glass panels may need border or shadow tuning after corners are tightened
- local class overrides in feature files can silently undo shared primitive changes
- the current theme token setup may not propagate radius scale changes until the theme variables are made explicit

## Definition of Done

The refactor is complete when:

- all standard surfaces in `apps/web` use the new low-radius system
- shared primitives carry the new default corner language
- arbitrary large radii are removed
- only intentional circles and pills remain rounded
- `bun run check` and `bun run check-types` pass
- a final grep confirms the remaining radius usage is deliberate
