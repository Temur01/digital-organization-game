# "Raqamli Qalqon" — MVP Specification

> A browser-based 2D adventure game that teaches digital hygiene to employees of an organization.
> Document type: product + technical specification (MVP). Delivery planning and estimates are out of scope.

> **Current status (2026):** this document is the original product plan; the implementation differs in several places.
> The code is the source of truth. For the current architecture, commands, and rules, see [`../CLAUDE.md`](../CLAUDE.md) and [`../README.md`](../README.md).
>
> Main differences:
> - the scene uses **Three.js** (not PixiJS) with a logical resolution of 960×540;
> - there are **4 missions** (`m1`–`m4`), the last one being "Coffee break";
> - **Supabase** is an optional backend: email + password auth, profiles, result sync, and a leaderboard (not magic links);
> - a **24-question knowledge quiz** and leaderboard have been added;
> - in-progress mission state is stored in `sessionStorage` (cleared when the tab closes);
> - simulation apps: email, workstation/files, phone, IT portal.

---

## 1. Concept, goals, audience, and MVP scope

### 1.1 Concept
The player is a new employee of the fictional "Company" organization, playing as **Bek** or **Guli** and spending a workday in the office. Each mission is one short work situation (5–8 minutes): an incoming email, a found USB drive, overnight MFA prompts. The player walks around the office, inspects objects, identifies risk signals, and makes decisions. Every decision immediately produces an explanation, and the mission ends with a short summary.

Core idea: **"Making mistakes is safe here."** In the game, the consequences of an error are simulated only with text and illustrations.

### 1.2 Goals
After playing, an employee should be able to:
- recognize at least 4 signs of a phishing email (sender domain, urgency, generic greeting, mismatched link address);
- avoid opening unknown files and devices, and identify double extensions;
- never share an MFA code, and reject unsolicited MFA requests;
- report a suspicious incident immediately through an official channel;
- choose strong, unique passwords (passphrases).

### 1.3 Audience
- Employees of any department (accounting, HR, sales, management) — no IT knowledge required.
- Wide age range (20–60); gaming experience may be limited → minimal controls, no time pressure, short and clear text.
- Work computer (primary) and phone browser (secondary).
- Tone: professional, respectful, lightly humorous; no fear-mongering or blame.

### 1.4 MVP scope

**Included:**
- Main menu, character selection (Bek / Guli), mission map, briefing, game scene, dialogs and simulation windows, feedback, result screen, settings.
- 3 missions (see section 2), unlocked sequentially.
- Scoring and a 1–3 star system.
- Progress stored in `localStorage`.
- Full keyboard, mouse, and touch controls; accessibility targeting WCAG 2.1 AA.
- One language: Uzbek (Latin). Text is kept in separate files so it can be translated later.
- Organization name, domain, and internal IT number configured from a single file at build time.

**Excluded:**
- Accounts, backend, server API, analytics, LMS/SCORM integration.
- Multiplayer, leaderboard, admin panel, content editor.
- Multiple languages, voice dubbing.
- Mid-mission saving (if the page is refreshed, the current mission restarts).

### 1.5 Security principles (mandatory)
The game simulates cyberattacks **only**:
1. **No real malicious code.** A "malicious file" is just a data object (name, icon, size). No file is created, downloaded, or executed.
2. **No external links.** Every "link" in the game is rendered as a `<button>`/`<span>`, not `<a href>`; clicking it only opens an in-game simulation. `window.open` and changing `location` are not used.
3. **No secret data is requested.** There is **no** free-text field for entering a password, login, phone number, or name in the game. A "fake login page" is shown only as an image/static card; password selection is done by choosing a prepared option.
4. **No network requests.** The app loads only its own static files. `Content-Security-Policy`: `default-src 'self'; img-src 'self' data:; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` (`worker-src 'self' blob:` if required by Pixi).
5. **Fictional domains.** All domains come from the reserved `.example` zone per RFC 2606: `kompaniya.example`, `kompaniya-tolov.example`. No real brand, bank, or government organization names are used.
6. **No HTML injection.** Email bodies are rendered from structured data through React components; `dangerouslySetInnerHTML` and `eval` are forbidden (enforced by an ESLint rule).

---

## 2. Gameplay loop

### 2.1 Macro loop (game level)
```
Character selection → Mission map → Briefing → Mission → Result → (next mission unlocks) → Map
                                   ↑___________________________________________|
```

### 2.2 Micro loop (inside a mission)
1. **Observe** — the player walks around the room; interactive objects show labels.
2. **Inspect** — interact with an object: talk to a colleague, read a poster, open a simulation app on a computer/phone.
3. **Find signals** — mark suspicious places inside the simulation as "clues". Each found clue gives +5 points and a short explanation.
4. **Decide** — at a key point, choose one of 3–4 options.
5. **Feedback** — immediate outcome:
   - ✔ **Safe** → +10 points, the next step unlocks.
   - ⚠ **Risky** → 0 points, explanation, the player re-chooses this decision.
   - ✖ **Critical error** → a "If this were real…" consequence screen, the mission fails, and a retry is offered.
6. Once all mandatory objectives are complete → **Result screen**.

### 2.3 Scoring and stars
- Points are awarded only for the choice made on the **first attempt** (re-choosing a safe answer gives 0 points).
- `maxScore = number of decisions × 10 + number of clues × 5`.
- Stars (only for a successful mission):
  - ★★★ — all decisions were safe on the first attempt and at least 80% of clues were found;
  - ★★ — score ≥ 60% of `maxScore`;
  - ★ — mission completed.
- Critical error → 0 stars, `outcome: 'failed'`. The best result is kept; a worse result does not replace it.
- No time penalty.

---

## 3. Missions

Common: each mission has **1 room**, **3–5 interactive objects**, **2–4 decisions**, and **4–5 clues**. Missions unlock in order: M1 → M2 → M3.

Configuration values: `{company}` = "Company" (`Kompaniya`), `{domain}` = `kompaniya.example`, `{itPhone}` = `1234` (internal IT security number), `{reportButton}` = "Report phishing" (`Fishingni xabar qilish`).

---

### M1. "Urgent invoice" — phishing email

**Room:** open office, the player's desk.

**Situation (briefing):**
> Monday morning. Your manager: "Check the mail, there are important emails today." There are three new emails in the inbox. One of them is rushing you.

**Interactive objects:**
| ID | Object | Action |
|---|---|---|
| `m1-computer` | Work computer | Opens the "Email" simulation |
| `m1-colleague` | Colleague Dilnoza (NPC) | Dialog: "A weird email from 'accounting' came to me yesterday too…" (a hint) |
| `m1-poster` | "Phishing signs" poster | Short reminder (4 signs). Optional |
| `m1-manager` | Manager's office door | Confirmation dialog at the end of the mission |

**Mailbox (simulation):**
1. HR: "November events" — normal email (`hr@kompaniya.example`).
2. Manager: "Tuesday meeting" — normal email.
3. **Phishing email:**
   - From: `Accounting Department <buxgalteriya@kompaniya-tolov.example>`
   - Subject: "URGENT: if the payment is not confirmed within 2 hours, your account will be blocked"
   - Greeting: "Dear employee,"
   - Link text: `kompaniya.example/hisob` → the real address shown on hover/focus: `kompaniya-tolov.example/login`
   - Attachment: `Hisob_faktura.html` (icon only)

**Clues:**
| ID | Clue | Explanation |
|---|---|---|
| `m1-c-domain` | Sender domain | `kompaniya-tolov.example` ≠ `kompaniya.example` |
| `m1-c-urgency` | Urgency and threat | "within 2 hours", "will be blocked" — pressure tactics |
| `m1-c-greeting` | Generic greeting | "Dear employee" instead of your name |
| `m1-c-link` | Link address | Visible text and real address differ |
| `m1-c-attachment` | Unexpected attachment | Accounting does not send `.html` attachments |

**Decision `m1-d-action`** — "What do you do with this email?"
| Choice | Outcome | Feedback |
|---|---|---|
| Click the link and confirm the account | ✖ critical | Consequence screen: fake login page (static image) → "Your login and password would have gone to the attacker, who would then send emails to colleagues in your name." |
| Reply and ask whether it is real | ⚠ risky | The reply goes to the attacker, who uses it to gain more trust. |
| Forward it to a colleague to "take a look" | ⚠ risky | You spread the risk to another person. |
| Simply delete the email | ⚠ risky | You protected yourself, but the security team is unaware — others may open it. |
| **Press the "{reportButton}" button** | ✔ safe | Correct: the email is sent to the security team and removed from the inbox. |

**Decision `m1-d-verify`** (by the manager's door, after reporting) — "Is there really a debt in accounting, and how do you verify it?"
| Choice | Outcome | Explanation |
|---|---|---|
| Call the phone number in the email | ⚠ risky | The number may belong to the attacker. |
| **Call accounting using the number in the internal directory** | ✔ safe | Always verify through an independent, known channel. |
| Do not verify | ⚠ risky | If it is a real issue, it remains unresolved. |

**Mission completion:** `m1-d-action` and `m1-d-verify` resolved safely.

**Lessons:**
- Check the sender domain letter by letter.
- Before clicking a link, inspect the real address.
- Urgency and threats are the main signs of phishing.
- Do not delete a suspicious email — **report** it.

---

### M2. "Found USB drive" — suspicious file and device

**Room:** office reception + the player's desk (one wide room, two zones).

**Situation:**
> On the way to work, you see a USB drive labeled "Awards_2026" on the floor near reception. When you reach your desk, a stranger has sent you a file in a messenger.

**Interactive objects:**
| ID | Object | Action |
|---|---|---|
| `m2-usb` | USB drive | Decision `m2-d-usb` |
| `m2-reception` | Receptionist (NPC) | Dialog: "Lost items are usually given to me… but devices go to IT." |
| `m2-it-box` | IT department "Found devices" box | Drop-off point for the USB drive |
| `m2-computer` | Work computer | "Messenger" and "Files" simulation |

**Messenger and file (simulation):**
- Sender: "Partner_Logistics" (not in the contacts list).
- Message: "Hello! Please review the contract quickly, we need to sign it today."
- File: `Contract_October.pdf` (PDF icon), size 2.4 MB.
- In the "Files" window, if "Show file extensions" is enabled, the real name is visible: `Contract_October.pdf.exe`, type: "Application".

**Clues:**
| ID | Clue | Explanation |
|---|---|---|
| `m2-c-label` | Attractive label | "Awards" — deliberately written to spark curiosity |
| `m2-c-unknown` | Unknown sender | Not in contacts, unexpected file |
| `m2-c-pressure` | Urgency | "We need to sign it today" |
| `m2-c-extension` | Double extension | `.pdf.exe` — not a document, but an application |
| `m2-c-type` | File type | "Application" is illogical for a PDF |

**Decision `m2-d-usb`** — "What do you do with the USB drive?"
| Choice | Outcome | Explanation |
|---|---|---|
| Plug it into the work computer to identify the owner | ✖ critical | Consequence: "If the drive had been connected, hidden software could have spread across the network." |
| Take it home and inspect it on a personal computer | ⚠ risky | Both the personal device and later work data are at risk. |
| Throw it in the trash | ⚠ risky | This could be an attack attempt — the security team must know. |
| **Hand it to the IT security department** | ✔ safe | The player walks to `m2-it-box` and hands over the drive (flag `usbHandedOver`). |

**Decision `m2-d-file`** — "What do you do with the file?"
| Choice | Outcome | Explanation |
|---|---|---|
| Open the file | ✖ critical | Consequence: "This file was an application. It could have encrypted your files and demanded payment." (text and illustration only) |
| Scan it with antivirus, then open it | ⚠ risky | Antivirus does not catch everything; an unexpected application should not be opened at all. |
| Ask the sender "what is this?" in the messenger | ⚠ risky | The attacker will of course say "everything is fine." |
| **Do not open it, report it to IT security, and verify with the partner through an official channel** | ✔ safe | The correct path. |

**Mission completion:** `m2-d-usb` and `m2-d-file` resolved safely.

**Lessons:**
- Never plug in a found device — hand it to IT.
- Check the file extension: `.exe`, `.scr`, `.js`, `.html` are risk signals.
- Verify unexpected files through another trusted channel.

---

### M3. "Night notifications" — password, MFA, and incident reporting

**Room:** office, evening (darker lighting, different palette).

**Situation:**
> You are working late. Your phone starts receiving a series of "Approve sign-in?" requests, but you are not signing in anywhere. A minute later, "IT support" calls.

**Interactive objects:**
| ID | Object | Action |
|---|---|---|
| `m3-phone` | Phone | MFA requests, incoming call |
| `m3-poster` | "IT security: internal number {itPhone}" poster | Clue + source of the official number |
| `m3-sticky` | Sticky note on a colleague's monitor: "Password: Kompaniya2026!" | Clue; optional action "Remove the note and leave a reminder for the colleague" |
| `m3-computer` | Work computer | "Report incident" form and "Change password" window |

**MFA request (simulation):** "{company} account sign-in request. Location: unknown. Device: Windows. [Approve] [Deny]". Requests reappear every 4 seconds (visual only; no time penalty; in "Reduce motion" mode, no animation, shown as a counter: "7 requests").

**Clues:**
| ID | Clue | Explanation |
|---|---|---|
| `m3-c-unrequested` | Unsolicited request | You are not signing in — so someone else has your password |
| `m3-c-location` | Unknown location | Not your device |
| `m3-c-caller` | Caller asks for a code | IT never asks for a code |
| `m3-c-official` | Official number | The number is on the poster, not from the caller |
| `m3-c-sticky` | Password written in the open | Do not store passwords in a visible place |

**Decision `m3-d-push`** — "What do you do with the MFA request?"
| Choice | Outcome | Explanation |
|---|---|---|
| Approve to make it stop | ✖ critical | Consequence: "The attacker signed into your account and started reading your email." |
| Ignore it and continue working | ⚠ risky | When tired, you might accidentally approve; the incident is not reported. |
| **Deny** | ✔ safe | Correct, but not enough — the password is already exposed. |

**Decision `m3-d-call`** — Call: "I'm from IT. There is a problem with your account; tell me the 6-digit code from the SMS to restore it."
| Choice | Outcome | Explanation |
|---|---|---|
| Tell them the code | ✖ critical | Consequence: with the code, the attacker gets past MFA. |
| Call back the number the caller gave | ⚠ risky | The number belongs to the attacker. |
| **Hang up and call the internal number {itPhone} from the poster** | ✔ safe | Verify through an independent, known channel. |

**Decision `m3-d-report`** — "Report incident" form (on the computer). The form contains only choice elements (radio/checkbox); there is no free-text field:
- What happened? `[✓] Unsolicited MFA requests` `[✓] Call asking for a code` `[ ] Suspicious email`
- Did you approve or tell anyone anything? `(•) No` `( ) Yes` `( ) I don't know`
- Submit button.

Correct fields → ✔. Incorrect selection → ⚠ (the incorrect field is explained and the form is refilled). Form data is never sent anywhere or stored — only the decision outcome is kept.

**Decision `m3-d-password`** — "Change password" (with IT advice). The password is **not typed**; the player chooses a prepared option:
| Option | Outcome | Explanation |
|---|---|---|
| `Kompaniya2027!` | ⚠ risky | A predictable variation of the old password. |
| `Guli1999` / `Bek1999` (depending on the selected character) | ⚠ risky | Name and birth year — the first thing anyone checks. |
| Reuse the password from a personal mailbox | ⚠ risky | If one password is exposed, all accounts are exposed. |
| **`choynak-yomg‘ir-velosiped-73` (a passphrase stored in a password manager)** | ✔ safe | Long, unique, easy to remember. |

> Note: the password option depends on the character's name, but the outcome and score are identical — the character does not affect mechanics.

**Mission completion:** `m3-d-push`, `m3-d-call`, `m3-d-report`, `m3-d-password` resolved safely. (`m3-sticky` is optional and only gives a clue.)

**Lessons:**
- An unsolicited MFA request means your password is exposed. Deny it and report it.
- Never share an MFA/SMS code with anyone, even "IT".
- Verify only through an official number you know yourself.
- Report the incident immediately — even if you are not certain.
- Use a separate long passphrase for every account.

---

## 4. Screens and UI elements

All screens are React DOM. Only the center of the "Game scene" screen contains a Pixi canvas.

### 4.1 Main menu (`TitleScreen`)
- Logo "Raqamli Qalqon", short tagline.
- Buttons: **Continue** (if progress exists), **New game**, **Settings**, **About the game** (security principles: "This is a simulation, no data is collected").
- "New game" with existing progress → confirmation dialog.

### 4.2 Character selection (`CharacterSelectScreen`)
- Two cards: portrait, name, one-line description. Cards form a `radio` group (`role="radiogroup"`), switched with ←/→.
- The selected character's idle animation (static under reduced motion).
- Text: "Both characters have identical abilities. The choice only changes appearance."
- Buttons: **Confirm**, **Back**.

**Temporary visual concept (MVP):**
| | Bek | Guli |
|---|---|---|
| Style | Flat vector, 2.5-head proportions, soft shadow, no outline | Same |
| Hair | Short, dark brown, side-parted | Long dark brown hair, one braid on the shoulder |
| Clothing | Light blue shirt (`#7FB3E0`), dark blue trousers (`#2C3E66`), brown shoes | Turquoise blazer (`#2A9D8F`), white blouse, gray trousers (`#4A4E5A`) |
| National accent | Atlas (ikat) pattern on the lanyard | Small atlas-patterned scarf in the blazer pocket |
| Accessory | Employee badge, laptop bag | Employee badge, tablet |
| Skin tones | `#D9A77E` / shadow `#B9875F` | `#E1B48C` / shadow `#C29470` |

Sprite requirements: 4 directions (down, up, left, right — right may mirror left), `idle` 2 frames, `walk` 4 frames, `interact` 2 frames; frame 64×96 px (1x) and a 2x version; one sprite sheet + JSON atlas. Portrait 256×256. A placeholder (colored geometric shapes) is acceptable initially — because the atlas format is the same, replacing it later only requires swapping the asset.

### 4.3 Mission map (`MissionMapScreen`)
- Schematic floor plan of the office with 3 nodes (rooms): each shows a name, topic icon, and status (🔒 locked / ● available / ✔ completed + stars).
- Nodes are DOM buttons (`aria-disabled` for locked ones, with an explanation "Complete 'Urgent invoice' first").
- Side panel: selected character, total stars (x/9), **Change character**, **Settings**, **Main menu**.

### 4.4 Briefing (`BriefingScreen`) — modal or separate screen
- Mission name, situation text (2–4 short paragraphs), objectives list, controls reminder.
- Buttons: **Start**, **Back to map**.

### 4.5 Game scene (`GameScreen`)
- **Canvas** (16:9, logical size 960×540, `aria-hidden="true"`).
- **Hotspot overlay**: a transparent DOM `<button>` above the canvas for every interactive object (aria-label: "Computer — open email"). Keyboard focus and screen readers work through these.
- **HUD** (top panel): mission name, current objective, clues `3/5`, score, ⏸ Pause button.
- **Interaction hint**: when near an object, "E — Work with the computer" appears at the bottom.
- **Object list** (optional side panel, always visible when the "List mode" setting is on): all hotspots as buttons — allows playing without the canvas.

### 4.6 Interaction windows
| Component | Purpose |
|---|---|
| `DialogPanel` | NPC conversation: portrait, name, text, 1–3 answer buttons or "Continue" |
| `DecisionPanel` | Decision: question, context, 3–5 choices (numbered 1–5) |
| `SimEmailClient` | Email list + message view; "Marking mode" (🔍) — mark a suspicious part as a clue; real-address tooltip on hover; "{reportButton}" button |
| `SimMessenger` | Chat view, file card |
| `SimFileExplorer` | File list, "Show extensions" checkbox |
| `SimPhone` | MFA request, incoming call (with text subtitles) |
| `SimReportForm` | Incident report form (choice fields only) |
| `SimPasswordChange` | Password option cards, strength indicator (text + icon) |

All simulation windows: modal (`role="dialog"`, `aria-modal`), focus trap, closes with Esc (if a decision is pending — does not close, only pauses), always labeled "SIMULATION" at the top.

### 4.7 Feedback (`FeedbackPanel`)
- Icon + color + text (never rely on color alone): ✔ "Correct decision", ⚠ "This is risky", ✖ "Critical error".
- 1–2 sentence explanation, `+10` / `+5` point animation.
- Also announced in an `aria-live="polite"` region.
- Button: ✔ → **Continue**; ⚠ → **Choose again**; ✖ → **What would happen?** (opens the consequence screen).

A small toast appears when a clue is found (3 seconds, `aria-live`).

### 4.8 Consequence screen (`ConsequencePanel`)
- Title: "Simulation: if this were real…"
- A short 3-step timeline (illustration + text), ending with "To prevent this: …".
- Buttons: **Restart mission**, **View result**.

### 4.9 Result (`ResultScreen`)
- Status: "Mission completed" / "Mission failed".
- Stars, score `45/60`, best result.
- List of decisions: first choice and outcome icon for each.
- Clues: found ✔, not found — shown with an explanation (for learning).
- "Remember" block — the mission lessons (3–5 items).
- Buttons: **Next mission** (if unlocked), **Replay**, **Map**.
- When all 3 missions are completed: a "Congratulations" block and an overall summary (all lessons in one list, with print-friendly CSS using `window.print()`).

### 4.10 Settings (`SettingsScreen`) and Pause (`PauseMenu`)
- Settings: text size (100 / 125 / 150%), reduce motion (System / On / Off), high contrast, list mode, sound (on/off), **Clear progress** (with confirmation).
- Pause: **Continue**, **Restart mission**, **Settings**, **Exit to map** (confirmation: "Current mission progress will be lost").

---

## 5. Technology and architecture

> **Note:** section 5 was written as the original plan. The current code uses Three.js instead of PixiJS
> (`src/game/three/`, `src/game/bridge.ts`), and quiz/leaderboard layers have been added.
> The architecture rules (pure engine, store as the single source of truth, scene renders/input only) still apply.

### 5.1 Stack
| Part | Choice | Reason |
|---|---|---|
| Build | Vite | Fast, simple, static build |
| UI | React 18 + TypeScript (`strict`) | Required; DOM UI, accessibility |
| 2D scene | **PixiJS v8** | See below |
| State | Zustand | Small; readable/writable outside React too (in the Pixi bridge) |
| Styling | CSS Modules + CSS variables (tokens) | No extra library |
| Validation | Zod (only for saved progress) | Protects against corrupted `localStorage` data |
| Test | Vitest + React Testing Library | Same ecosystem as Vite |
| Lint | ESLint + `jsx-a11y` + `react-hooks` | Accessibility and security rules |

### 5.2 Why PixiJS
- **Rendering only** — no physics, scene manager, or UI system. We only need room backgrounds, character sprites, hotspot highlighting, and simple movement; everything else (dialogs, menus, simulation windows) is React.
- **Light and fast**: WebGL/WebGPU with a Canvas fallback; tree-shaking keeps only the modules used.
- **Does not conflict with React**: the Pixi app attaches imperatively to a single `div`; state and logic stay in React/Zustand.
- Compared with Phaser: Phaser is a full game engine (physics, scenes, input, its own UI) — overkill for this project, larger, and its state/scene management would create two centers of architecture alongside React.
- `@pixi/react` is **not used**: the scene is small, imperative code is simpler, and the game loop stays independent of React renders.

### 5.3 Layers
```
┌──────────────────────────── React (DOM) ────────────────────────────┐
│ Screens · UI · Sim apps · Hotspot overlay · HUD · Feedback           │
│            ▲ selectors                         │ dispatch(action)    │
│ ┌──────────┴───────────────────────────────────▼───────────────────┐ │
│ │ Zustand store: appSlice (screen, settings, progress)             │ │
│ │                missionSlice → missionReducer (pure TS)           │ │
│ └──────────▲───────────────────────────────────┬───────────────────┘ │
└────────────┼───────────────────────────────────┼─────────────────────┘
       SceneEvent                          SceneCommand
┌────────────┴───────────────────────────────────▼─────────────────────┐
│ GameBridge (typed event emitter)                                     │
│ PixiJS: SceneManager · Room · Player · HotspotView · Input           │
└──────────────────────────────────────────────────────────────────────┘
```

**Rules:**
1. **Mission logic is pure TypeScript** (`missions/engine`) — independent of React and Pixi. It can therefore be fully unit-tested.
2. **Pixi only renders and provides input.** It does not make decisions or calculate scores. It only emits events such as "player is near hotspot X" and "hotspot X was activated".
3. **React is the single source of truth** (through the store). The scene watches `phase` from the store: if it is not `exploring`, movement stops.
4. **Content is data.** Missions are typed objects in `missions/data/*.ts`; adding a new mission means adding a data file plus (if needed) a room asset.

### 5.4 Bridge contract
```ts
// game/bridge.ts
export type SceneCommand =
  | { type: 'loadRoom'; room: RoomDefinition; characterId: CharacterId }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'walkToHotspot'; hotspotId: string }          // when selected via keyboard/list
  | { type: 'setHotspotState'; hotspotId: string; state: HotspotVisualState }
  | { type: 'setReducedMotion'; value: boolean };

export type SceneEvent =
  | { type: 'ready' }
  | { type: 'nearHotspotChanged'; hotspotId: string | null }
  | { type: 'hotspotActivated'; hotspotId: string }        // arrived and interacted
  | { type: 'hotspotLayout'; rects: Record<string, ScreenRect> }; // for the DOM overlay, on resize

export interface GameBridge {
  send(cmd: SceneCommand): void;
  on(handler: (e: SceneEvent) => void): () => void;       // returns unsubscribe
}
```
When `GameScreen` mounts, `createScene(container, bridge)` is called; on unmount, `destroy()` is called (stop the Pixi app, ticker, and listeners — it must be resilient to React StrictMode's double mount).

### 5.5 Scene (Pixi) details
- Logical size 960×540; scaled into the container with `contain` (letterbox), `resolution = devicePixelRatio` (max 2).
- **Room**: background image (a single PNG/WebP), `walkable` rectangle, `blockers` (AABB rectangles — desk, cabinet).
- **Movement**: speed 180 px/s; keyboard — direction vector; mouse/touch — a straight line toward the clicked point (clamped inside `walkable`), sliding along axes when hitting an obstacle. No pathfinding in the MVP — room obstacles are placed simply.
- **Hotspot**: `interactPoint` (where the character stands) and `radius` 56 px. Inside the radius — an outlined highlight plus a hint. Clicking a hotspot → the character walks to `interactPoint` → `hotspotActivated`.
- **Depth**: sprites are sorted by `y`.
- Loading: room assets are loaded with `Assets.load` when the mission starts; the loading indicator is rendered in React.

### 5.6 Folder structure
```
src/
├─ main.tsx
├─ app/
│  ├─ App.tsx                 # screen switcher (screen → component)
│  ├─ store.ts                # Zustand: appSlice + missionSlice
│  ├─ transitions.ts          # screen transition table and guards
│  └─ config.ts               # companyConfig: name, domain, IT number, button text
├─ screens/
│  ├─ TitleScreen/  CharacterSelectScreen/  MissionMapScreen/
│  ├─ BriefingScreen/  GameScreen/  ResultScreen/  SettingsScreen/
├─ ui/                        # reusable DOM components
│  ├─ Button  Modal  Toast  LiveRegion  Stars  ConfirmDialog
│  ├─ HUD  DialogPanel  DecisionPanel  FeedbackPanel  ConsequencePanel  PauseMenu
│  └─ HotspotOverlay  HotspotList
├─ sim/                       # safe simulation apps (DOM only)
│  ├─ SimEmailClient  SimMessenger  SimFileExplorer
│  ├─ SimPhone  SimReportForm  SimPasswordChange
│  └─ SimFrame.tsx            # "SIMULATION" frame
├─ game/                      # PixiJS layer
│  ├─ bridge.ts  createScene.ts
│  ├─ Room.ts  Player.ts  HotspotView.ts  input.ts  layout.ts
├─ missions/
│  ├─ engine/
│  │  ├─ missionReducer.ts    # pure function
│  │  ├─ conditions.ts  scoring.ts  validateMission.ts
│  ├─ data/
│  │  ├─ m1-phishing.ts  m2-suspicious-file.ts  m3-mfa-incident.ts
│  │  └─ index.ts             # MISSIONS list and order
│  └─ rooms/                  # RoomDefinitions (coordinates)
├─ content/
│  ├─ characters.ts
│  └─ uz/ui.ts                # all UI text
├─ persistence/
│  ├─ storage.ts  schema.ts  migrate.ts
├─ types/
│  └─ models.ts
├─ styles/
│  └─ tokens.css  global.css
└─ assets/
   ├─ characters/ (bek.png, bek.json, guli.png, guli.json, portraits)
   └─ rooms/ (m1-office.webp, m2-lobby.webp, m3-office-night.webp)
tests/ — engine, persistence, content validation, core UI flows
```

---

## 6. States and transition rules

### 6.1 App screens
```ts
type AppScreen =
  | 'title' | 'characterSelect' | 'map' | 'briefing'
  | 'playing' | 'result' | 'settings';
```

| Current | Event | Next | Guard / note |
|---|---|---|---|
| — (start) | app loaded | `title` | progress is read |
| `title` | Continue | `map` | if `selectedCharacter` exists; otherwise → `characterSelect` |
| `title` | New game | `characterSelect` | if progress exists — confirm, then clear |
| `characterSelect` | Confirm | `map` | character is saved |
| `characterSelect` | Back | previous screen (`title` or `map`) | |
| `map` | Mission node | `briefing` | `status !== 'locked'` |
| `map` | Change character | `characterSelect` | progress is preserved |
| `briefing` | Start | `playing` | `START_MISSION` |
| `briefing` | Back | `map` | |
| `playing` | mission `completed`/`failed` + result confirmed | `result` | result is saved **first** |
| `playing` | Pause → Exit to map | `map` | confirm; mission state is discarded |
| `result` | Next mission | `briefing` | if the next one is unlocked |
| `result` | Replay | `briefing` | |
| `result` | Map | `map` | |
| any | Settings | `settings` | `returnTo` is remembered; from `playing` only via pause (as an overlay) |
| `settings` | Back | `returnTo` | |

### 6.2 Mission phases (inside `playing`)
```ts
type MissionPhase =
  | 'loading'      // assets are loading
  | 'exploring'    // movement allowed
  | 'interacting'  // dialog or simulation window is open (movement stopped)
  | 'deciding'     // DecisionPanel is open
  | 'feedback'     // FeedbackPanel is visible
  | 'consequence'  // critical-error consequence
  | 'paused'
  | 'completed' | 'failed';
```

| Current | Action | Next |
|---|---|---|
| `loading` | `SCENE_READY` | `exploring` |
| `exploring` | `ACTIVATE_HOTSPOT` (dialog/sim) | `interacting` |
| `exploring` / `interacting` | `ACTIVATE_HOTSPOT` / a button inside the sim (decision) | `deciding` |
| `interacting` | `CLOSE_OVERLAY` | `exploring` |
| `interacting` | `FIND_CLUE` | `interacting` (toast) |
| `deciding` | `CHOOSE` safe/risky | `feedback` |
| `deciding` | `CHOOSE` critical | `feedback` → `consequence` |
| `feedback` | `ACK` (safe) | `completed` if `completeWhen` is satisfied, otherwise the previous context (`interacting`/`exploring`) |
| `feedback` | `ACK` (risky) | `deciding` (the same decision again) |
| `consequence` | `ACK` | `failed` |
| any active phase | `PAUSE` | `paused` (`resumeTo` is saved) |
| `paused` | `RESUME` | `resumeTo` |
| `paused` | `RESTART` | `loading` |

Rules:
- Pixi movement is enabled only in `exploring`.
- Only one overlay is open at a time (`activeOverlay`).
- `CHOOSE` is accepted only in the `deciding` phase; in other phases it is ignored (double-click protection).
- A resolved (`safe`) decision's hotspot switches to `done` and no longer opens a decision (only an informational dialog).

---

## 7. TypeScript data models

```ts
// types/models.ts

// ---------- Character ----------
export type CharacterId = 'bek' | 'guli';
export type Direction = 'down' | 'up' | 'left' | 'right';
export type AnimationName = 'idle' | 'walk' | 'interact';

export interface Character {
  id: CharacterId;
  name: string;                // 'Bek' | 'Guli'
  shortDescription: string;
  portrait: string;            // asset path
  spriteSheet: string;         // atlas JSON path
  frameSize: { width: number; height: number };
  animations: Record<AnimationName, Record<Direction, { frames: string[]; fps: number }>>;
}
// Important: Character has NO field that affects mechanics (speed, bonus).

// ---------- Room ----------
export interface Rect { x: number; y: number; width: number; height: number }
export interface Point { x: number; y: number }

export interface RoomDefinition {
  id: string;
  background: string;
  walkable: Rect;
  blockers: Rect[];
  spawn: Point;
}

// ---------- Interactive object ----------
export type HotspotKind = 'computer' | 'phone' | 'device' | 'npc' | 'poster' | 'note' | 'door' | 'box';
export type HotspotVisualState = 'idle' | 'highlight' | 'done' | 'hidden';
export type SimAppId = 'email' | 'messenger' | 'files' | 'phone' | 'reportForm' | 'passwordChange';

export type InteractionAction =
  | { type: 'dialog'; dialogId: string }
  | { type: 'openSim'; app: SimAppId }
  | { type: 'decision'; decisionId: string }
  | { type: 'clue'; clueId: string };

export interface InteractiveObject {
  id: string;
  kind: HotspotKind;
  label: string;               // "Computer"
  ariaLabel: string;           // "Computer — open email"
  sprite?: string;
  bounds: Rect;                // clickable area (logical coordinates)
  interactPoint: Point;
  visibleWhen?: Condition;
  enabledWhen?: Condition;
  action: InteractionAction;
  actionWhenDone?: InteractionAction; // after a decision is resolved (for example, an informational dialog)
}

// ---------- Condition and effect ----------
export type Flag = string;
export type Condition =
  | { all: Flag[] }
  | { any: Flag[] }
  | { not: Flag };

export type Effect =
  | { type: 'setFlag'; flag: Flag }
  | { type: 'completeObjective'; objectiveId: string };

// ---------- Dialog ----------
export interface DialogLine { speaker: 'player' | string; text: string }
export interface Dialog {
  id: string;
  lines: DialogLine[];
  effectsOnEnd?: Effect[];
}

// ---------- Clue ----------
export interface Clue {
  id: string;
  label: string;
  explanation: string;
  points: number;              // usually 5
}

// ---------- Choice and decision ----------
export type ChoiceOutcome = 'safe' | 'risky' | 'critical';

export interface Choice {
  id: string;
  label: string;
  outcome: ChoiceOutcome;
  feedbackTitle: string;
  feedback: string;            // 1–2 sentences
  points: number;              // safe: 10, others: 0
  effects?: Effect[];          // usually only for safe
  consequenceId?: string;      // required for critical
  /** For text that depends on the character name: replaces '{name}' */
  templated?: boolean;
}

export interface Decision {
  id: string;
  prompt: string;
  context?: string;
  choices: Choice[];           // 3–5, at least one 'safe'
  shuffle?: boolean;           // default: true (the correct answer should not always be in the same place)
}

export interface Consequence {
  id: string;
  title: string;
  steps: { image?: string; text: string }[];
  prevention: string;
}

// ---------- Mission ----------
export type MissionId = 'm1-phishing' | 'm2-suspicious-file' | 'm3-mfa-incident';
export type MissionTopic = 'phishing' | 'malware' | 'mfa' | 'password' | 'incident';

export interface Objective {
  id: string;
  label: string;
  optional?: boolean;
  completeWhen: Condition;
}

export interface Mission {
  id: MissionId;
  order: number;
  title: string;
  topics: MissionTopic[];
  briefing: string[];
  room: RoomDefinition;
  objectives: Objective[];
  hotspots: InteractiveObject[];
  dialogs: Record<string, Dialog>;
  decisions: Record<string, Decision>;
  clues: Record<string, Clue>;
  consequences: Record<string, Consequence>;
  simContent: SimContent;      // email/messenger/files/... data
  completeWhen: Condition;
  lessons: string[];
  unlocks: MissionId[];
}

// Simulation app content (data only; nothing is executed)
export interface SimEmail {
  id: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  greeting: string;
  body: SimTextPart[];
  attachment?: { fileName: string; clueId?: string };
  decisionId?: string;         // decision opened when the email is opened/clicked
}
export type SimTextPart =
  | { type: 'text'; text: string; clueId?: string }
  | { type: 'link'; text: string; realUrl: string; clueId?: string }; // not <a>!

export interface SimFile {
  id: string;
  displayName: string;         // when extensions are hidden
  realName: string;
  typeLabel: string;           // "Application"
  size: string;
  clueIds?: string[];
}

export interface SimContent {
  emails?: SimEmail[];
  messenger?: { contact: string; known: boolean; messages: SimTextPart[][]; file?: SimFile };
  files?: SimFile[];
  phone?: { mfaPrompt?: { location: string; device: string }; call?: { caller: string; lines: string[]; decisionId: string } };
  reportForm?: { decisionId: string; fields: ReportField[] };
  passwordChange?: { decisionId: string };
}
export interface ReportField {
  id: string;
  label: string;
  kind: 'checkbox' | 'radio';
  options: { id: string; label: string; correct: boolean }[];
}

// ---------- Runtime state (not persisted) ----------
export type OverlayRef =
  | { type: 'dialog'; dialogId: string }
  | { type: 'sim'; app: SimAppId }
  | { type: 'decision'; decisionId: string; returnTo: OverlayRef | null };

export interface DecisionLogEntry {
  decisionId: string;
  firstChoiceId: string;
  firstOutcome: ChoiceOutcome;
  finalChoiceId: string;
  attempts: number;
}

export interface MissionRuntimeState {
  missionId: MissionId;
  phase: MissionPhase;
  resumeTo: MissionPhase | null;
  activeOverlay: OverlayRef | null;
  flags: Flag[];
  cluesFound: string[];
  decisionLog: Record<string, DecisionLogEntry>;
  pendingFeedback: { decisionId: string; choiceId: string } | null;
  score: number;
}

// ---------- Result ----------
export interface MissionResult {
  missionId: MissionId;
  outcome: 'passed' | 'failed';
  score: number;
  maxScore: number;
  stars: 0 | 1 | 2 | 3;
  cluesFound: string[];
  decisions: DecisionLogEntry[];
  finishedAt: string;          // ISO date
}

// ---------- Local progress ----------
export type MissionStatus = 'locked' | 'available' | 'completed';

export interface MissionProgress {
  status: MissionStatus;
  attempts: number;
  bestScore: number;
  bestStars: 0 | 1 | 2 | 3;
  lastResult?: MissionResult;
}

export interface Settings {
  textScale: 1 | 1.25 | 1.5;
  reducedMotion: 'system' | 'on' | 'off';
  highContrast: boolean;
  listMode: boolean;
  sound: boolean;
}

export interface LocalProgress {
  version: 1;
  selectedCharacter: CharacterId | null;
  missions: Record<MissionId, MissionProgress>;
  settings: Settings;
  updatedAt: string;
}
```

### 7.1 Reducer actions
```ts
export type MissionAction =
  | { type: 'START_MISSION'; missionId: MissionId }
  | { type: 'SCENE_READY' }
  | { type: 'ACTIVATE_HOTSPOT'; hotspotId: string }
  | { type: 'OPEN_DECISION'; decisionId: string }       // from buttons inside a simulation
  | { type: 'FIND_CLUE'; clueId: string }
  | { type: 'CHOOSE'; decisionId: string; choiceId: string }
  | { type: 'ACK' }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'PAUSE' } | { type: 'RESUME' } | { type: 'RESTART' };

export function missionReducer(state: MissionRuntimeState, action: MissionAction, mission: Mission): MissionRuntimeState;
export function buildResult(state: MissionRuntimeState, mission: Mission): MissionResult;
```

### 7.2 Content validation (`validateMission`)
Checked for every mission in tests and development mode:
- all `dialogId`, `decisionId`, `clueId`, and `consequenceId` references exist;
- every decision has at least one `safe` choice and 3–5 choices;
- every `critical` choice has a `consequenceId`;
- every flag in `completeWhen` is set by some `effects` (the mission can be completed);
- hotspot `bounds`/`interactPoint` are inside the room `walkable` area;
- no text contains `http://`/`https://` or domains outside `.example`.

---

## 8. Local progress storage

- **Location:** `localStorage`, key `raqamli-qalqon:progress`.
- **Format:** `LocalProgress` JSON with a `version` field.
- **When it is written:** when a character is selected, when a mission ends (`passed` or `failed`), and when a setting changes. Mid-mission state is not saved.
- **Reading:** on app start → `JSON.parse` → `migrate()` → validate with the Zod schema. On error — default progress (M1 `available`, the rest `locked`) and a console warning; the corrupted value is moved to `raqamli-qalqon:progress:corrupt`.
- **If unavailable** (private mode, blocked storage, quota): `try/catch`; the game continues in memory, and settings show "Progress will not be saved in this browser".
- **Applying a result:**
  - `attempts += 1`; `lastResult` is updated;
  - if `passed`, `status = 'completed'`, `bestScore/bestStars = max(...)`, and missions in `unlocks` move from `locked` to `available`;
  - a `failed` result never lowers the best result.
- **Privacy:** only game progress and settings. No name, email, or device information is stored; simulation form choices are not saved.
- **Clearing:** Settings → "Clear progress" (with confirmation) removes the key.

```ts
// persistence/storage.ts
const KEY = 'raqamli-qalqon:progress';

export function loadProgress(): LocalProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createDefaultProgress();
    const parsed = progressSchema.safeParse(migrate(JSON.parse(raw)));
    if (parsed.success) return parsed.data;
    localStorage.setItem(`${KEY}:corrupt`, raw);
  } catch {
    /* storage unavailable or malformed JSON */
  }
  return createDefaultProgress();
}

export function saveProgress(p: LocalProgress): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}
```

If a new mission is added later, `migrate()` adds a default entry for the new `MissionId` (if the previous mission is `completed`, the new one becomes `available`) and increments `version`.

---

## 9. Controls, accessibility, and responsiveness

### 9.1 Keyboard
| Key | Action |
|---|---|
| `W A S D` / arrow keys | Move (in the scene) |
| `E` / `Enter` / `Space` | Interact with a nearby object |
| `Tab` / `Shift+Tab` | Focus hotspots and UI elements (pressing `Enter` on a focused hotspot makes the character walk there and interact) |
| `1`–`5` | Choose in the decision panel |
| `Esc` | Close overlay / pause |
| `C` | Toggle "Marking mode" in a simulation window |
| `L` | Open/close the object list |

- Keyboard events are not forwarded to the scene while an input/radio is focused.
- Arrow keys control movement only when the canvas is focused or nothing is focused (to avoid conflicts with radio groups).

### 9.2 Mouse and touch
- Click the floor — walk to that point; click a hotspot — walk there and interact.
- Hover — hotspot label (on touch devices, the first tap selects and shows the label, the second interacts; or use an "Use" button).
- In a simulation window, hover/focus/long-press a link — show the real address tooltip.

### 9.3 Accessibility (WCAG 2.1 AA target)
- `lang="uz"`; semantic HTML; exactly one `<h1>` per screen; focus moves to the heading when the screen changes.
- Text contrast ≥ 4.5:1, UI elements ≥ 3:1; visible focus ring (≥ 2 px, contrasting).
- Results are never communicated by color alone (icon + text).
- Canvas is `aria-hidden`; all interactive objects exist as DOM buttons; **in "List mode" the game is fully playable without seeing the canvas**.
- Modal: focus trap; focus returns to the triggering element when closed.
- `aria-live="polite"` region: clue found, decision outcome, objective completed.
- No time limits; automatically dismissed toasts also have their content in the result screen.
- `prefers-reduced-motion` + setting: instant movement instead of walk animation, no flashing or shaking; MFA spam is shown as a counter.
- Text size up to 150% without layout breakage; use `rem` units.
- Calls and any audio have text subtitles; audio is never required for content.
- Touch targets ≥ 44×44 px.

### 9.4 Small screens
- Minimum supported width: 360 px. Browsers: Chrome, Edge, Firefox, Safari (last 2 versions), iOS Safari 16+.
- **≥ 1024 px**: canvas centered, HUD on top, overlays as modals above the canvas.
- **600–1023 px**: canvas full width, overlays as full-screen modals.
- **< 600 px (portrait)**: canvas at the top (16:9), HUD and "Object list" always open below; simulation windows full screen; decision choices as a vertical list.
- No horizontal page scrolling; `100dvh` is used; the virtual keyboard is never triggered (there are no text fields).
- Canvas size is updated via `ResizeObserver`, and `hotspotLayout` is re-emitted.

---

## 10. Acceptance criteria

### 10.1 M1 "Urgent invoice"
- [ ] After the briefing, the player reaches the desk and opens the email through the computer; the mailbox has 3 emails.
- [ ] The phishing email contains 5 findable clues; each counts once (+5) and shows an explanation.
- [ ] Hovering/focusing the link shows the real address `kompaniya-tolov.example/login`; clicking the link never opens an external page or makes a network request.
- [ ] "Click the link" → critical error → consequence screen (static image, no input field) → `failed`.
- [ ] "Reply", "forward to a colleague", "delete" → ⚠ and the decision can be chosen again.
- [ ] "{reportButton}" → ✔ +10; the email disappears from the inbox; the `m1-d-verify` decision opens.
- [ ] After both decisions are resolved safely, the result screen appears and M2 unlocks.
- [ ] Clicking a clue in a normal email says "There is nothing suspicious here" (no points, no penalty).

### 10.2 M2 "Found USB drive"
- [ ] The USB drive is visible in the room and interacting opens a decision.
- [ ] "Plug it into the work computer" → consequence → `failed`.
- [ ] "Hand it to IT" → the character walks to the IT box (or the decision is confirmed there), the drive disappears from the scene, and a flag is set.
- [ ] The messenger shows a file card; in "Files", enabling extensions reveals `.pdf.exe` and the "Application" type, which provide two clues.
- [ ] The file is never actually downloaded; "Open" only shows the consequence screen.
- [ ] After both decisions are resolved safely, the result screen appears and M3 unlocks.

### 10.3 M3 "Night notifications"
- [ ] MFA requests are shown through the phone; under reduced motion, a counter is used instead of animation.
- [ ] "Approve" → consequence → `failed`; "Deny" → ✔ and the call starts.
- [ ] The call text is shown as subtitles; "Tell them the code" → `failed`; "Call the number on the poster" → ✔.
- [ ] The incident form has no free-text field; an incorrect selection shows which field is wrong; data is not stored.
- [ ] Password change does not accept typed passwords, only option selection; the name-based option matches the selected character.
- [ ] After all four decisions are resolved safely, the result screen and the "Congratulations" block appear.

### 10.4 General MVP readiness criteria
**Functional**
- [ ] All three missions can be played from start to finish (a) with keyboard only, (b) with mouse only, and (c) with touch only.
- [ ] All three missions can be completed in "List mode" without the canvas.
- [ ] Bek and Guli produce identical scores, stars, and results for the same sequence of choices (automated test).
- [ ] Scores and stars follow the rules in section 2.3 (unit test).
- [ ] After a page refresh, the character, mission states, best results, and settings are preserved.
- [ ] A corrupted/old `localStorage` value does not break the app (unit test).
- [ ] Pause, restart, and exit to map work correctly in every phase; after scene `destroy()` there are no memory/listener leaks.

**Security**
- [ ] DevTools Network: after the app loads, only static files from its own domain are requested; no new external requests occur during gameplay.
- [ ] The codebase contains no `dangerouslySetInnerHTML`, `eval`, `new Function`, `window.open`, or external `href` (lint rule + grep check).
- [ ] The game contains no text input for passwords, logins, or personal data.
- [ ] All domains are inside the `.example` zone; the `validateMission` test passes.
- [ ] Every simulation window has a "SIMULATION" label.

**Accessibility and responsiveness**
- [ ] Lighthouse Accessibility ≥ 95; axe — no critical issues.
- [ ] Contrast requirements are met; focus is always visible.
- [ ] Layout works at 360 px, 768 px, and 1280 px widths without horizontal scrolling or clipped text; also at 150% text size.
- [ ] M1 can be fully completed with a screen reader (NVDA or VoiceOver).

**Quality and performance**
- [ ] `tsc --noEmit` and ESLint pass without errors; engine, persistence, and content-validation tests pass.
- [ ] Initial JS ≤ 400 KB (gzip); first screen ≤ 2 s on an average laptop; scene stays at 60 FPS on an average laptop and ≥ 30 FPS on an average phone.
- [ ] The app works from static hosting (or an internal web server) without a backend; `vite build` output opens from any folder with relative paths.

**Content**
- [ ] All text is in Uzbek (Latin), spell-checked, and located in `content/` and `missions/data/` (no hard-coded text in components).
- [ ] Every choice has an explanation; every mission has 3–5 lessons.
- [ ] Organization name, domain, and IT number change only through `app/config.ts`.
