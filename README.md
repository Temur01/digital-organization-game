# Raqamli Qalqon

Tashkilot xodimlariga raqamli gigiyenani o‘rgatuvchi brauzer o‘yini (MVP). React + TypeScript + Three.js, paket menejeri — Bun.
Barcha hujumlar faqat simulyatsiya: haqiqiy zararli fayl, tashqi havola, parol kiritish maydoni yoki tarmoq so‘rovi yo‘q.

To‘liq spetsifikatsiya: [`docs/MVP-SPEC.md`](docs/MVP-SPEC.md).

## Ishga tushirish

```bash
bun install
bun run dev        # http://localhost:5173
```

| Buyruq | Vazifa |
|---|---|
| `bun run dev` | Dev-server |
| `bun run build` | Tip tekshiruvi + production build (`dist/`, nisbiy yo‘llar, CSP meta-tegi bilan) |
| `bun run preview` | Build natijasini lokal ko‘rish |
| `bun run test` | Vitest: dvigatel, kontent validatsiyasi, saqlash, store, UI |
| `bun run lint` | ESLint (jsx-a11y + xavfsizlik qoidalari) |
| `bun run typecheck` | `tsc --noEmit` |

`dist/` papkasini istalgan statik web-serverga joylash mumkin. `file://` orqali ochib bo‘lmaydi (ES modullar).

## Tashkilotga moslash

`src/app/config.ts` — o‘yin nomi, tashkilot nomi, domenlar (faqat `.example` zonasi), IT ichki raqami, «xabar qilish» tugmasi matni.

## Tuzilma

```
src/
  app/          store (Zustand), ekran o‘tishlari, konfiguratsiya, hook’lar
  missions/
    engine/     sof TS: reducer, shartlar, ball/yulduz, kontent validatori
    data/       missiyalar (ma’lumot sifatida)
    rooms/      xona geometriyasi (mantiqiy 960×540)
  game/         Three.js sahna (three/) + React bilan tiplangan ko‘prik (bridge.ts)
  sim/          xavfsiz simulyatsiya ilovalari (pochta, ish stoli, telefon, IT portal)
  ui/           umumiy komponentlar (Modal, HUD, Decision/Feedback panellar…)
  screens/      ekranlar
  content/      personajlar va barcha UI matnlari (o‘zbek, lotin)
  persistence/  localStorage + Zod sxema + migratsiya
tests/          Vitest testlari
```

Asosiy qoida: missiya logikasi `missions/engine` da sof funksiya; Three.js sahnasi faqat chizadi va input hodisalarini yuboradi; React (store) — yagona holat manbai.

## Yangi missiya qo‘shish

1. `src/types/models.ts` dagi `MissionId` ga yangi id qo‘shing.
2. `src/missions/data/` da `Mission` obyektini yozing (xona — `rooms/`), `data/index.ts` ga ulang.
3. `bun run test` — `validateMission` havolalarni, `.example` domenlarni va missiyani tugatish mumkinligini tekshiradi.
4. Saqlangan progress avtomatik moslashadi (`persistence/storage.ts` → `normalize`).

## Boshqaruv

W A S D / strelkalar — yurish · E / Enter — ishlatish · Tab — obyektlar · 1–5 — tanlov · C — belgilash rejimi · Esc — pauza/yopish.
Sichqoncha: polni bosish — yurish, obyektni bosish — borib ishlatish. Sozlamalarda «Ro‘yxat rejimi» — sahnasiz o‘ynash.

## Rasmlar va shriftlar

Asl rasmlar `src/assets/` da, o‘yin ulardan optimallashtirilgan nusxalarni `src/assets/characters/` dan oladi:

| Fayl | Manba | Vazifasi |
|---|---|---|
| `bek.png`, `guli.png` | `heros.png` | Turish holati (UI va sahna) |
| `bek-walk.png`, `guli-walk.png` | `download.png`, `qiz.png` | Yurish sikli: 8 kadr, o‘ngga qarab |
| `colleague-man.png`, `colleague-woman.png` | `collegue.png` | NPC’lar (Javlon, Sardor, Dilnoza) |

- Yurish varaqlari ish vaqtida avtomatik kadrlarga bo‘linadi (`src/game/three/spriteSheet.ts`): figuralar topiladi, atrofdagi mayda dog‘lar tozalanadi, kadrlar oyoq va gavda bo‘yicha tekislanadi. Yangi varaq ham shu formatda bo‘lsa (gorizontal qator, shaffof fon), faqat faylni almashtirish kifoya.
- `src/content/characters.ts` dagi `faceX` — avatar uchun yuz markazi (0–1).
- Shriftlar lokal (`@fontsource-variable/manrope`, `@fontsource-variable/unbounded`) — internetdan hech narsa yuklanmaydi.
- 3D xona, jihozlar va teksturalar kodda yasaladi (`src/game/three/builders.ts`, `textures.ts`).
- Dizayn tokenlari: `src/styles/tokens.css` (to‘q mavzu; simulyatsiya oynalari `.simLight` ichida och palitrada).
