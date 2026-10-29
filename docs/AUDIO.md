# Audio system

Code: `src/game/audio/`. All sound playback goes through one `AudioManager` (`audioManager` singleton in `src/game/audio/index.ts`), built directly on the Web Audio API — no audio library.

## Current asset status

**No audio files are bundled yet.** Every sound has a synthesized fallback (`src/game/audio/synth.ts`) that plays real audio generated in the browser, so the game is fully audible without assets. When a file is added and its `src` is set in `audioConfig.ts`, the file is used instead; if it fails to load or decode, the game logs one `[audio] … yuklanmadi` warning and keeps using the synthesized version.

## Adding a file

1. Put the file under `public/audio/<folder>/` using the expected name below.
2. Set `src` for that id in `src/game/audio/audioConfig.ts`, e.g. `interaction: { ..., src: 'audio/sfx/interaction.ogg' }` (path relative to `public/`, no leading slash).
3. Files load lazily on first use — nothing is downloaded at startup. Call `audioManager.preload([...])` if a sound must be ready earlier.

Formats: `.ogg` (Opus/Vorbis) is preferred; `.mp3` works everywhere. Positional loops (`world` bus) should be **mono**. Normalize SFX to about −16 LUFS, music to about −20 LUFS. Use only assets whose license allows redistribution in this project (e.g. CC0), and record the source and license next to the file.

## Expected filenames

| Id | Category | Expected path | Used when |
|---|---|---|---|
| `menu` | music | `public/audio/music/menu.ogg` | title, map, briefing, result screens |
| `gameplay` | music | `public/audio/music/gameplay.ogg` | daytime missions |
| `night` | music | `public/audio/music/night.ogg` | night mission (room `night: true`) |
| `roomToneDay` | ambience | `public/audio/ambience/room-tone-day.ogg` | daytime rooms |
| `roomToneNight` | ambience | `public/audio/ambience/room-tone-night.ogg` | night room |
| `computerHum` | world (3D) | `public/audio/ambience/computer-hum.ogg` | at every computer hotspot |
| `phoneBuzz` | world (3D) | `public/audio/ambience/phone-buzz.ogg` | desk phone while it needs attention |
| `coffeeMachine` | world (3D) | `public/audio/ambience/coffee-machine.ogg` | coffee machine hotspot |
| `waterCooler` | world (3D) | `public/audio/ambience/water-cooler.ogg` | water cooler decor |
| `clockTick` | world (3D) | `public/audio/ambience/clock-tick.ogg` | wall clock decor |
| `phoneRing` | sfx loop | `public/audio/sfx/phone-ring.ogg` | incoming call in the phone simulator |
| `wood` / `stone` / `carpet` | footsteps | `public/audio/footsteps/<surface>-1.ogg` … `-4.ogg` (array `src`) | player walking; surface from the room's `floorStyle` |
| `tap` | ui | `public/audio/sfx/ui-tap.ogg` | any button/tab/option press |
| `windowOpen` / `windowClose` | ui | `public/audio/sfx/window-open.ogg`, `window-close.ogg` | simulator windows |
| `menuOpen` | ui | `public/audio/sfx/menu-open.ogg` | pause menu |
| `interaction` | sfx | `public/audio/sfx/interaction.ogg` | activating computers, posters, notes, phone, QR |
| `talk` | sfx | `public/audio/sfx/talk.ogg` | talking to an NPC |
| `doorOpen` | sfx | `public/audio/sfx/door-open.ogg` | door hotspots |
| `pickup` | sfx | `public/audio/sfx/pickup.ogg` | device / box hotspots |
| `clue` | sfx | `public/audio/sfx/clue.ogg` | a clue is found |
| `correct` / `risky` / `critical` | sfx | `public/audio/sfx/decision-safe.ogg`, `decision-risky.ogg`, `decision-critical.ogg` | decision outcome |
| `objective` | sfx | `public/audio/sfx/objective.ogg` | a mission step is completed |
| `notify` | sfx | `public/audio/sfx/notify.ogg` | new DM in the social simulator |
| `vibrate` | sfx | `public/audio/sfx/vibrate.ogg` | MFA push in the phone simulator |
| `star` | sfx | `public/audio/sfx/star.ogg` | each star on the result screen |
| `missionComplete` / `missionFailed` | sfx | `public/audio/sfx/mission-complete.ogg`, `mission-failed.ogg` | result screen |
| `correctAnswer` / `incorrectAnswer` | sfx | `public/audio/sfx/quiz-correct.ogg`, `quiz-incorrect.ogg` | quiz answers |

## Mixer

`master × category` per bus, clamped to 0–1, then a limiter. User sliders: Master, Music, Effects (sfx + ui + footsteps), Ambience (room tone + 3D world sources). Settings persist in the existing progress object (`settings.audio`, validated by zod; malformed values fall back to defaults). Pausing ducks music and silences the room; an open dialog/simulator ducks world sources; a hidden tab suspends the AudioContext.

## Triggering sounds from game code

- Gameplay: `playGameAudio({ type: 'hotspotActivated', kind })`, `{ type: 'decision', outcome }`, `{ type: 'quizAnswer', correct }` … (`src/game/audio/audioEvents.ts`). Add a new event type there and map it to a sound id — game code never names files.
- Direct: `audioManager.playSfx('interaction')`, `audioManager.playMusic('menu')`, `audioManager.playLoop('computerHum', { position })` → `handle.stop()`.
- React: `useBackgroundMusic(id)`, `useSoundEffect(id)`, `useAudioSettings()`.

In development, `window.__audio.debugState()` shows the context state, current music, ambience, active loops and voice count.
