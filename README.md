# Raqamli Qalqon

A browser game that teaches digital hygiene to employees (MVP). Built with React, TypeScript, and Three.js; package manager — Bun.
Every attack is simulated: gameplay contains no real malicious files, external links, credential inputs, or network requests (the optional account form is the only exception).

The current version includes 4 missions, a 24-question knowledge quiz, a leaderboard, and optional accounts/profiles.

- Architecture and development rules: [`CLAUDE.md`](CLAUDE.md).
- Original product specification: [`docs/MVP-SPEC.md`](docs/MVP-SPEC.md). Some decisions there (PixiJS, 3 missions, magic link) are outdated; the code and README are authoritative.

## Getting started

```bash
bun install
bun run dev        # http://localhost:5173
```

| Command | Purpose |
|---|---|
| `bun run dev` | Development server |
| `bun run build` | Type check + production build (`dist/`, relative paths, CSP meta tag) |
| `bun run preview` | Preview the production build locally |
| `bun run test` | Vitest: engine, content validation, persistence, store, router, quiz, UI |
| `bun run test:watch` | Vitest in watch mode |
| `bun run lint` | ESLint (jsx-a11y + security rules) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run db:migrate` | Apply Supabase migrations (`supabase/migrations/*.sql`) |
| `bun run db:status` | Show which migrations have been applied |
| `bun run db:verify` | Check connection, email auth, tables, RLS, and leaderboard (publishable key only) |

`dist/` can be served by any static web server. It cannot be opened via `file://` because it uses ES modules.

## Backend (Supabase): accounts, scores, leaderboard

Supabase is optional: without `.env.local` the game runs entirely in guest mode and sends nothing over the network.

1. Create a project at [supabase.com](https://supabase.com).
2. Apply migrations — from the terminal: add `SUPABASE_ACCESS_TOKEN=sbp_…` ([Personal Access Token](https://supabase.com/dashboard/account/tokens); no database password required) or `SUPABASE_DB_URL` (the "Session pooler" string) to `.env.local`, then run `bun run db:migrate` and `bun run db:verify`. `db:migrate` applies `supabase/migrations/*.sql` in order. Alternative: run the migrations one by one in the **SQL Editor**. The migrations create:
   - `profiles` — name, position, and email;
   - `mission_results`, `quiz_results` — one row per attempt;
   - RLS policies — users can only read their own rows;
   - `get_leaderboard()` — returns only "Name L." and scores.
3. Enable **Authentication → Sign In / Providers → Email**. Sign-in uses **email + password** (not magic links). If you want email confirmation, configure **Authentication → Emails** as well; when it is disabled, users are signed in immediately after registration.
4. **Authentication → URL Configuration**:
   - *Site URL* — the public site URL (for example, `https://raqamli-qalqon.uz`);
   - *Redirect URLs* — `http://localhost:5173/**` and the site URL with `/**` (for the email confirmation and password reset links; the reset link returns to `…/?tiklash=1#/kirish`).
5. Copy the *Project URL* and the **anon (publishable) key** from **Project Settings → API** into `.env.local` (start from `.env.example`). Never put the `service_role` key in the frontend.
6. In production, connect your own mail service via **Authentication → Emails → SMTP** — Supabase's built-in mailer is limited to a few messages per hour.
7. (Optional) Translate the confirmation and **Reset Password** email templates under **Authentication → Emails** into Uzbek.

### Password reset

"Parolni unutdingizmi?" on the sign-in tab sends a reset link through Supabase Auth's email service (`resetPasswordForEmail`). The link opens the game, which shows a "Yangi parol" form and saves it with `updateUser`. The link must be opened in the same browser where it was requested (PKCE); otherwise the game reports that the link is invalid and offers to send a new one. The response is the same whether or not an account exists for the email, so the form does not reveal who is registered.

Sign-in flow: register (name, position, email, password) or sign in with email + password. If email confirmation is enabled, the link in the email opens in **the same browser** (PKCE). Guest-mode results are automatically uploaded after sign-in, and server progress is restored on another device. At build time the Supabase origin is automatically added to the CSP `connect-src`.

## Knowledge quiz

`src/content/quiz/questions.ts` contains 24 scenario-based questions based on the "Digital hygiene for public servants" (2025) handbook. Each session picks 10 random questions; consecutive correct answers earn a bonus (10 → 18 points), and "50/50" can be used once. Every question shows an explanation and the relevant handbook section.

## Organization customization

`src/app/config.ts` — game title, organization name, domains (`.example` zone only), internal IT phone number, report button text, default player, and the list of positions.

## Structure

```
src/
  app/          Zustand store, screen transitions, configuration, hooks, auth/sync/audio
  missions/
    engine/     pure TS: reducer, conditions, scoring, content validator
    data/       missions (as data)
    rooms/      room geometry (logical 960×540)
  game/         Three.js scene (three/) + typed React bridge (bridge.ts)
  sim/          safe simulation apps (email, workstation, phone, IT portal)
  ui/           shared components (Modal, HUD, Decision/Feedback panels, …)
  screens/      screen components
  content/      characters, all UI text (Uzbek Latin), and quiz questions
  persistence/  localStorage + Zod schema + migration
  quiz/         knowledge quiz session (pure TS)
  lib/          optional Supabase client (null when not configured)
  styles/       design tokens and global CSS
  assets/       character art and walk spritesheets
tests/          Vitest tests
scripts/        Supabase migration/verification scripts
supabase/       SQL schema, RLS, and leaderboard function
```

Core rule: mission logic is pure functions in `missions/engine`; the Three.js scene only renders and emits input events; React (the store) is the single source of truth.

## Adding a mission

1. Add the id to `MissionId` in `src/types/models.ts`.
2. Create the `Mission` object in `src/missions/data/` (add a room under `rooms/` if needed) and register it in `data/index.ts`.
3. Add the mission's ideal action sequence to `SAFE_SCRIPTS` in `tests/helpers.ts`.
4. Run `bun run test` — `validateMission` checks links, `.example` domains, content shape, and whether the mission can be completed.
5. Saved progress is normalized automatically (`persistence/storage.ts` → `normalize`).

## Pages (routes)

Every screen has its own URL — refreshing keeps you on that screen, and the browser Back/Forward buttons work (`src/app/router.ts`):

| URL | Screen |
|---|---|
| `#/` | Main menu |
| `#/qahramon` | Character selection |
| `#/xarita` | Mission map |
| `#/missiya/<id>` | Briefing (for example, `#/missiya/m1-phishing`) |
| `#/missiya/<id>/oyin` | Gameplay |
| `#/natija/<id>` | Result |
| `#/sinov` · `#/reyting` · `#/kirish` · `#/profil` · `#/sozlamalar` | Quiz, leaderboard, sign-in, profile, settings |

- Hash routing was chosen because the build uses relative paths (`base: './'`) — it works on any static host with no server configuration.
- If the page is refreshed during a mission or quiz, it resumes: found clues, score, decisions, and the current question are stored in `sessionStorage` (cleared when the tab closes). A critical-error consequence cannot be bypassed by refreshing.
- Pressing Back during gameplay opens the pause menu so progress is not lost.
- A locked mission URL redirects to the map; if no character is selected, it redirects to character selection.

## Controls

W A S D / arrow keys — move · E / Enter — interact · Tab — objects · 1–5 — choose · C — marking mode · Esc — pause/close.
Mouse: click the floor to walk, click an object to walk there and interact. In settings, "List mode" lets you play without the scene.

## Artwork and fonts

Original art lives in `src/assets/`; the game uses optimized copies from `src/assets/characters/`:

| File | Source | Purpose |
|---|---|---|
| `bek.png`, `guli.png` | `heros.png` | Idle pose (UI and scene) |
| `bek-walk.png`, `guli-walk.png` | `download.png`, `qiz.png` | Walk cycle: 8 frames, facing right |
| `colleague-man.png`, `colleague-woman.png` | `collegue.png` | NPCs (Javlon, Sardor, Dilnoza) |

- Walk sheets are split into frames at runtime (`src/game/three/spriteSheet.ts`): figures are detected, stray specks are cleaned up, and frames are aligned by feet and body. If a new sheet uses the same format (horizontal row, transparent background), replacing the file is enough.
- `faceX` in `src/content/characters.ts` is the face center for avatars (0–1).
- Fonts are local (`@fontsource-variable/manrope`, `@fontsource-variable/unbounded`) — nothing is loaded from the internet.
- 3D rooms, furniture, and textures are generated in code (`src/game/three/builders.ts`, `textures.ts`).
- Design tokens: `src/styles/tokens.css` (dark theme; simulation windows use a light palette inside `.simLight`).
