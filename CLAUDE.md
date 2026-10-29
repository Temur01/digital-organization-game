# CLAUDE.md

Context and working rules for Claude Code (and other coding agents) in this repository.

## What this project is

**Raqamli Qalqon** is a browser-based cybersecurity hygiene training game for employees of an organization. All attacks are simulations: there are no real malicious files, external links, credential forms in gameplay, or network requests during a mission.

- Language of the product and all UI/mission content: **Uzbek Latin**.
- Current content: **4 missions** (`m1`–`m4`), a 24-question quiz, leaderboard, optional accounts/profile.
- Stack: Vite 8, React 18, TypeScript (strict), Zustand, Three.js, Zod, Vitest + React Testing Library, ESLint.
- Package manager/runtime for scripts: **Bun** (`packageManager: bun@1.4.3`).
- Backend is optional. Without `.env.local` the game runs fully in guest mode and sends nothing over the network.

Read `README.md` for the user-facing overview and `docs/MVP-SPEC.md` for the original product spec. **The code is the source of truth**: the spec still describes an earlier design (PixiJS, 3 missions, magic-link auth).

## Commands

Use Bun, not npm/yarn/pnpm.

```bash
bun install               # install dependencies
bun run dev               # Vite dev server, http://localhost:5173
bun run typecheck         # tsc --noEmit
bun run lint              # ESLint + jsx-a11y + security rules
bun run test              # Vitest, all tests, single run
bun run test:watch        # Vitest watch mode
bunx vitest run tests/engine.test.ts   # one test file
bun run build             # typecheck + production build to dist/
bun run preview           # preview the production build
```

Supabase scripts (only when `.env.local` is configured):

```bash
bun run db:migrate        # apply pending supabase/migrations/*.sql
bun run db:status         # show migration status
bun run db:migrate --dry-run
bun run db:verify         # connection, auth, tables, RLS, leaderboard
```

Before finishing a change, run `bun run typecheck`, `bun run lint`, and `bun run test`. Run `bun run build` when touching the build, CSP, routes, assets, or environment handling.

Never commit `.env.local`, access tokens, database URLs, or the Supabase `service_role` secret. Only the publishable/anon key may reach the frontend.

## Development workflow

Follow the Matt Pocock engineering-skills cycle. If the plugin is installed, run `/setup-matt-pocock-skills` once per repository and use the slash commands below. If it is not installed, follow the same sequence manually.

1. **Align before code.** For non-trivial work, grill the request until intent, scope, edge cases, and acceptance criteria are resolved. Update `CLAUDE.md` or domain docs when terminology changes.
2. **Write the spec.** Turn the agreed behavior into a short spec or ticket. Name the files to touch, the invariants to preserve, and how the change will be verified.
3. **Break it down.** Split the spec into independently testable tickets. Prefer small vertical slices over layer-by-layer rewrites.
4. **TDD: red, green, refactor.** Write a failing test first and confirm it fails for the right reason. Implement the smallest change that passes, then refactor without changing behavior.
5. **Implement in small steps.** Keep the mission engine pure, the store as the single source of truth, and the Three.js layer render/input only.
6. **Review on two axes.** Review the diff against (a) repository standards and (b) the originating spec. Check security invariants, accessibility, and content validation explicitly.
7. **Verify and hand off.** Run `bun run typecheck`, `bun run lint`, and `bun run test` (use Node 24 if Vitest workers fail). Run `bun run build` when build/CSP/routes/assets/env handling changed. Report what changed and what was verified.

Corresponding skills, when available: `/grill-me` or `/grill-with-docs`, `/to-spec`, `/to-tickets`, `/tdd`, `/implement`, `/code-review`, `/improve-codebase-architecture`.

## Architecture

```
React screens (DOM)
  -> Zustand store (single source of truth)
    -> pure missionReducer / engine (missions/engine)
  -> GameBridge (typed commands/events)
    -> Three.js scene (src/game/three) draws and reports input only
```

Key rules:

1. **Mission logic is pure TypeScript** in `src/missions/engine`. It must not import React or Three.js. It is unit-tested and deterministic.
2. **Three.js only renders and emits input.** It does not decide outcomes, award points, or own mission state.
3. **React/Zustand owns state.** `src/app/store.ts` dispatches mission actions, persists results, and drives navigation. `src/app/router.ts` is a hash router; the URL is a projection of store state, not a second source of truth.
4. **Mission content is data**, not component code: typed `Mission` objects in `src/missions/data/*.ts`, rooms in `src/missions/rooms/`, shared models in `src/types/models.ts`.
5. **UI strings live in content files**, primarily `src/content/uz/ui.ts` and `src/content/uz/extra.ts`. Mission-specific prose lives in the mission data files.
6. **Runtime mission state is not persisted as progress.** In-progress mission/quiz state uses `sessionStorage` (`src/app/session.ts`), while durable progress/settings use `localStorage` (`src/persistence/storage.ts`).

## Directory map

| Path | Purpose |
|---|---|
| `src/app/` | App shell, Zustand store, hash router, auth/sync/sfx/ambience/voice, config |
| `src/screens/` | Screen components (title, character select, map, briefing, game, result, settings, auth, profile, quiz, leaderboard) |
| `src/ui/` | Reusable DOM components (Modal, Button, HUD, panels, overlays, toasts, stars) |
| `src/sim/` | Safe simulation apps: email, workstation/files, phone, IT portal |
| `src/game/` | Typed React/Three bridge and scene code (`three/` builders, rig, textures, fx) |
| `src/missions/engine/` | Pure reducer, conditions, scoring, content validator |
| `src/missions/data/` | Four mission definitions and registry |
| `src/missions/rooms/` | Room geometry/themes in logical 960x540 coordinates |
| `src/content/` | Characters, Uzbek UI text, quiz questions |
| `src/persistence/` | localStorage schema (Zod), migration, load/save/apply-result |
| `src/quiz/` | Quiz session engine |
| `src/types/` | Shared TypeScript models |
| `src/styles/` | CSS tokens and globals |
| `src/assets/` | Character art/spritesheets |
| `src/lib/supabase.ts` | Optional Supabase client (nullable in guest mode) |
| `tests/` | Vitest engine, content, persistence, store, router, quiz, UI tests |
| `scripts/` | Bun scripts for Supabase migrations/verification |
| `supabase/migrations/` | SQL schema, RLS policies, leaderboard function |

## Security invariants

These are product requirements, not preferences:

- Gameplay must not create real files, open external pages, submit forms, or make network requests. Network access is limited to optional Supabase auth/sync/leaderboard when configured.
- No `eval`, `new Function`, `window.open`, `dangerouslySetInnerHTML`, or real `<a href>` links. ESLint enforces several of these.
- Fake domains must stay inside the reserved `.example` zone (`kompaniya.example`, `kompaniya-tolov.example`, etc.). `validateMission` rejects real URLs and non-`.example` hosts.
- Game simulation forms contain only buttons/checkboxes/radios. Free-text inputs are allowed only in account/profile screens, not inside missions.
- Keep the build-time CSP working: `vite.config.ts` injects it into `index.html` and adds only the configured Supabase origin to `connect-src`.
- Never put Supabase `service_role`/secret keys in frontend code or docs.

## Content and UX conventions

- Write user-facing product text in Uzbek Latin. Preserve the existing typographic style (curly apostrophes such as `o‘yin`, `qalqon`).
- Write repository documentation (`README.md`, `CLAUDE.md`, `docs/*.md`) in English. Code identifiers and product copy quoted from the game remain in Uzbek.
- Do not hardcode UI strings in components when an entry belongs in `src/content/uz/`. Mission-specific story text stays with the mission data.
- Characters are cosmetic only: Bek and Guli must produce identical mechanics, scores, and stars.
- Accessibility is part of the definition of done: semantic HTML, visible focus, `aria-live` feedback, 44x44 px targets, reduced-motion support, list mode playable without the canvas.
- Use existing primitives (`Button`, `Modal`, `SimFrame`, panels) before creating new ones. Styling is CSS Modules plus tokens from `src/styles/tokens.css`.
- Keep the logical scene coordinate system at 960x540. Hotspot bounds/interact points must stay inside the room walkable area.
- Existing code comments are sparse and in Uzbek; match the surrounding style. Do not add narration comments unnecessarily.

## Common tasks

### Add or change a mission

1. Add the id to `MissionId` in `src/types/models.ts`.
2. Create/edit a `Mission` in `src/missions/data/`, add a room in `src/missions/rooms/` if needed, and register it in `src/missions/data/index.ts`.
3. Satisfy the content contract: 3–5 hotspots, 4–5 clues, 2–4 decisions, at least one `safe` choice per decision, a consequence for every `critical` choice, 3–5 lessons, and `.example` domains only.
4. Add an ideal action script for the new mission to `SAFE_SCRIPTS` in `tests/helpers.ts`.
5. Run `bun run test`; `validateMission` and the content tests must pass.
6. Older saves are normalized automatically by `normalize()` in `src/persistence/storage.ts`.

### Add UI text, a screen, or a route

- Add text to `src/content/uz/ui.ts` (or `extra.ts`) instead of inline strings.
- For a new screen: extend `AppScreen` in `src/types/models.ts`, add the component under `src/screens/`, register it in `SCREENS` in `src/app/App.tsx`, and extend `Route`/`STATIC`/`applyRoute` in `src/app/router.ts`.
- Add or update router tests when changing navigation.

### Add a simulation app

- Extend `SimAppId` and `SimContent` in `src/types/models.ts`.
- Add a component under `src/sim/`, map it in `SIMS` in `src/screens/GameScreen.tsx`, and extend validation if the content shape changes.
- Keep the “SIMULYATSIYA” framing and the no-real-links/no-free-text rules.

### Change organization branding

- Edit only `src/app/config.ts`: game title, organization name/domain, phishing domain, IT phone, report button text, default player, positions.
- Domains must remain in `.example`.

### Change the database

- Add a new timestamped SQL file under `supabase/migrations/`. Do not edit migrations that may already be applied; add a follow-up migration.
- Keep RLS enabled and policies scoped to `auth.uid()`. The leaderboard function must not expose email/profile details beyond the display name and scores.
- Then run `bun run db:migrate` and `bun run db:verify`.

## Testing notes

- Vitest runs in jsdom with setup in `tests/setup.ts`.
- `tests/content.test.ts` validates every mission and enforces content shape limits.
- `tests/engine.test.ts` uses `SAFE_SCRIPTS` from `tests/helpers.ts`; changing content ids can break these scripts.
- `tests/store.test.ts`, `tests/router.test.ts`, `tests/quiz.test.ts`, and `tests/ui.test.tsx` cover state, navigation, quiz logic, and key screens.
- UI tests assert Uzbek labels and roles. Prefer role/name queries; keep accessible names in sync with content changes.
- Progress/session keys: `raqamli-qalqon:progress`, `raqamli-qalqon:session:*`, `raqamli-qalqon:pending-results`, `raqamli-qalqon:auth`.

## Known gotchas

- `docs/MVP-SPEC.md` is a historical design document. It mentions PixiJS, three missions, and magic-link auth; current code uses Three.js, four missions, and email/password auth.
- Both `bun.lock` and `package-lock.json`/`bun.lockb` may exist. Use Bun and do not hand-edit lockfiles.
- `npm` is not the project package manager.
- On Node 22.14, Vitest 5 can fail to start workers with an `undici` `createZstdDecompress.bind` error. Use Node 24 (`nvm use 24`) or a newer runtime if `bun run test` fails this way.
- `.env.local` is intentionally gitignored. Guest mode must keep working with no environment variables.
- In-progress mission state lives in `sessionStorage` so a refresh resumes, but a closed tab discards it. Do not move it into durable progress.
- `dist/` must use relative paths (`base: './'`) and cannot be opened via `file://`; serve it over HTTP.
- Binary assets in `src/assets/` are source art. Do not regenerate or replace them unless the task explicitly asks.
- Do not commit unless the user explicitly asks for a commit.
