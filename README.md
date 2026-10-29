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
| `bun run db:migrate` | Supabase migratsiyalarini qo‘llash (`supabase/migrations/*.sql`) |
| `bun run db:status` | Qaysi migratsiyalar qo‘llanganini ko‘rsatish |
| `bun run db:verify` | Ulanish, email kirish, jadvallar, RLS va reytingni tekshirish (faqat ochiq kalit bilan) |

`dist/` papkasini istalgan statik web-serverga joylash mumkin. `file://` orqali ochib bo‘lmaydi (ES modullar).

## Backend (Supabase): hisob, ballar, reyting

Supabase ixtiyoriy: `.env.local` bo‘lmasa o‘yin mehmon rejimida ishlaydi va internetga hech narsa yubormaydi.

1. [supabase.com](https://supabase.com) da loyiha yarating.
2. Migratsiyani qo‘llang — terminaldan: `.env.local` ga `SUPABASE_ACCESS_TOKEN=sbp_…` ([Personal Access Token](https://supabase.com/dashboard/account/tokens); DB paroli kerak emas) yoki `SUPABASE_DB_URL` («Session pooler» satri) qo‘shib, `bun run db:migrate`, so‘ng `bun run db:verify`. Muqobil: **SQL Editor** da `supabase/migrations/20261029000000_init.sql` ni ishga tushirish. Migratsiya quyidagilarni yaratadi:
   - `profiles` — ism va email majburiy, yosh va jins ixtiyoriy;
   - `mission_results`, `quiz_results` — har bir urinish natijasi;
   - RLS siyosatlari — har kim faqat o‘z yozuvlarini ko‘radi;
   - `get_leaderboard()` — faqat «Ism F.» va ballarni qaytaradi.
3. **Authentication → Sign In / Providers → Email** yoqilgan bo‘lsin (magic link).
4. **Authentication → URL Configuration**:
   - *Site URL* — sayt manzili (masalan, `https://raqamli-qalqon.uz`);
   - *Redirect URLs* — `http://localhost:5173/**` va sayt manzili `/**` bilan.
5. **Project Settings → API** dan *Project URL* va **anon (publishable)** kalitni `.env.local` ga yozing (`.env.example` dan nusxa oling). `service_role` kalitini hech qachon frontendga qo‘ymang.
6. Productionda **Authentication → Emails → SMTP** orqali o‘z pochta servisingizni ulang — Supabase’ning ichki pochtasi soatiga bir necha xat bilan cheklangan.
7. (Ixtiyoriy) **Authentication → Emails → Magic Link** shablonini o‘zbekchaga tarjima qiling.

Kirish oqimi: email → pochtaga havola → havolani **shu brauzerda** ochish (PKCE). Mehmon rejimidagi natijalar kirgandan keyin avtomatik serverga yuboriladi, serverdagi progress esa boshqa qurilmada tiklanadi. Build vaqtida Supabase manzili CSP `connect-src` ga avtomatik qo‘shiladi.

## Bilim sinovi

`src/content/quiz/questions.ts` — «Davlat xizmatchisining raqamli gigiyenasi» (2025) qo‘llanmasi asosidagi 24 ta ssenariyli savol. Har sinovda tasodifiy 10 tasi chiqadi; ketma-ket to‘g‘ri javob — bonus (10→18 ball), «50/50» — bir marta. Har bir savolda izoh va qo‘llanmadagi bo‘lim ko‘rsatiladi.

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

## Sahifalar (marshrutlar)

Har bir ekran o‘z manziliga ega — sahifa yangilanganda shu ekranda qolasiz, brauzerning «Orqaga/Oldinga» tugmalari ishlaydi (`src/app/router.ts`):

| Manzil | Ekran |
|---|---|
| `#/` | Bosh menyu |
| `#/qahramon` | Qahramon tanlash |
| `#/xarita` | Missiyalar xaritasi |
| `#/missiya/<id>` | Brifing (masalan, `#/missiya/m1-phishing`) |
| `#/missiya/<id>/oyin` | O‘yin |
| `#/natija/<id>` | Natija |
| `#/sinov` · `#/reyting` · `#/kirish` · `#/profil` · `#/sozlamalar` | Bilim sinovi, reyting, kirish, profil, sozlamalar |

- Hash-routing tanlangan: build nisbiy yo‘llar bilan (`base: './'`) — istalgan statik hostingda server sozlamasisiz ishlaydi.
- Missiya yoki sinov o‘rtasida sahifa yangilansa, ular davom etadi: topilgan belgilar, ball, qarorlar va joriy savol `sessionStorage`da saqlanadi (tab yopilganda tozalanadi). Jiddiy xato oqibatini yangilash bilan chetlab o‘tib bo‘lmaydi.
- O‘yin paytida «Orqaga» bosilsa — progress yo‘qolmasin deb pauza menyusi ochiladi.
- Yopiq missiya manzili xaritaga, qahramon tanlanmagan bo‘lsa — qahramon tanlashga yo‘naltiradi.

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
