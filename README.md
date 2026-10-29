# Raqamli Qalqon

Tashkilot xodimlariga raqamli gigiyenani o‘rgatuvchi brauzer o‘yini (MVP). React + TypeScript + PixiJS.
Barcha hujumlar faqat simulyatsiya: haqiqiy zararli fayl, tashqi havola, parol kiritish maydoni yoki tarmoq so‘rovi yo‘q.

To‘liq spetsifikatsiya: [`docs/MVP-SPEC.md`](docs/MVP-SPEC.md).

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173
```

| Buyruq | Vazifa |
|---|---|
| `npm run dev` | Dev-server |
| `npm run build` | Tip tekshiruvi + production build (`dist/`, nisbiy yo‘llar, CSP meta-tegi bilan) |
| `npm run preview` | Build natijasini lokal ko‘rish |
| `npm test` | Vitest: dvigatel, kontent validatsiyasi, saqlash, store, UI |
| `npm run lint` | ESLint (jsx-a11y + xavfsizlik qoidalari) |
| `npm run typecheck` | `tsc --noEmit` |

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
  game/         PixiJS sahna + React bilan tiplangan ko‘prik (bridge.ts)
  sim/          xavfsiz simulyatsiya ilovalari (pochta, ish stoli, telefon, IT portal)
  ui/           umumiy komponentlar (Modal, HUD, Decision/Feedback panellar…)
  screens/      ekranlar
  content/      personajlar va barcha UI matnlari (o‘zbek, lotin)
  persistence/  localStorage + Zod sxema + migratsiya
tests/          Vitest testlari
```

Asosiy qoida: missiya logikasi `missions/engine` da sof funksiya; Pixi faqat chizadi va input hodisalarini yuboradi; React (store) — yagona holat manbai.

## Yangi missiya qo‘shish

1. `src/types/models.ts` dagi `MissionId` ga yangi id qo‘shing.
2. `src/missions/data/` da `Mission` obyektini yozing (xona — `rooms/`), `data/index.ts` ga ulang.
3. `npm test` — `validateMission` havolalarni, `.example` domenlarni va missiyani tugatish mumkinligini tekshiradi.
4. Saqlangan progress avtomatik moslashadi (`persistence/storage.ts` → `normalize`).

## Boshqaruv

W A S D / strelkalar — yurish · E / Enter — ishlatish · Tab — obyektlar · 1–5 — tanlov · C — belgilash rejimi · Esc — pauza/yopish.
Sichqoncha: polni bosish — yurish, obyektni bosish — borib ishlatish. Sozlamalarda «Ro‘yxat rejimi» — sahnasiz o‘ynash.

Personajlar va xonalar hozircha kodda chizilgan vaqtinchalik konsept (`src/game/draw.ts`, `src/ui/CharacterPortrait.tsx`).
