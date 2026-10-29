# «Raqamli Qalqon» — MVP spetsifikatsiyasi

> Tashkilot xodimlariga raqamli gigiyenani o‘rgatuvchi brauzerdagi 2D sarguzasht o‘yini.
> Hujjat turi: product + texnik spetsifikatsiya (MVP). Ishlab chiqish rejasi va vaqt bahosi bu hujjatga kirmaydi.

---

## 1. Konsepsiya, maqsad, auditoriya va MVP doirasi

### 1.1. Konsepsiya
O‘yinchi fiktiv «Kompaniya» tashkilotining yangi xodimi — **Bek** yoki **Guli** rolida ofisda ish kunini o‘tkazadi. Har bir missiya — bitta qisqa ish vaziyati (5–8 daqiqa): kelgan xat, topilgan fleshka, tungi MFA so‘rovlari. O‘yinchi ofis xonasida yuradi, obyektlarni ko‘zdan kechiradi, xavf belgilarini topadi va qaror qabul qiladi. Har bir qarordan keyin darhol tushuntirish beriladi, missiya oxirida esa qisqa xulosa ko‘rsatiladi.

Asosiy g‘oya: **«Xato qilish — xavfsiz joyda»**. O‘yinda xatoning oqibati faqat matn va illyustratsiya bilan simulyatsiya qilinadi.

### 1.2. Maqsad
O‘yindan keyin xodim quyidagilarni qila olishi kerak:
- fishing xatining kamida 4 ta belgisini tanish (yuboruvchi domeni, shoshiltirish, umumiy murojaat, havola manzili mos kelmasligi);
- notanish fayl va qurilmalarni ochmaslik, ikki kengaytmali faylni aniqlash;
- MFA kodini hech kimga aytmaslik, so‘ralmagan MFA so‘rovini rad etish;
- shubhali hodisani rasmiy kanal orqali darhol xabar qilish;
- kuchli va takrorlanmaydigan parol (parol iborasi) tanlash.

### 1.3. Auditoriya
- Har qanday bo‘lim xodimlari (buxgalteriya, HR, savdo, rahbariyat) — IT bilimi talab qilinmaydi.
- Yosh oralig‘i keng (20–60), o‘yin tajribasi kam bo‘lishi mumkin → boshqaruv minimal, vaqt bosimi yo‘q, matn qisqa va aniq.
- Ish kompyuteri (asosiy) va telefon brauzeri (ikkilamchi).
- Ohang: professional, hurmatli, hazil yengil; qo‘rqitish va ayblash yo‘q.

### 1.4. MVP doirasi

**Kiradi:**
- Bosh menyu, personaj tanlash (Bek / Guli), missiyalar xaritasi, brifing, o‘yin sahnasi, dialog va simulyatsiya oynalari, fikr-mulohaza, natija ekrani, sozlamalar.
- 3 ta missiya (2-bo‘limga qarang), ketma-ket ochiladi.
- Ballar va 1–3 yulduz tizimi.
- Progressni `localStorage`da saqlash.
- To‘liq klaviatura, sichqoncha va sensorli boshqaruv; WCAG 2.1 AA darajasiga yo‘naltirilgan accessibility.
- Bitta til: o‘zbek (lotin). Matnlar keyin tarjima qilishga tayyor tarzda alohida fayllarda saqlanadi.
- Tashkilot nomi, domeni va IT ichki raqami — bitta konfiguratsiya faylidan (build vaqtida) sozlanadi.

**Kirmaydi:**
- Akkauntlar, backend, server API, analitika, LMS/SCORM integratsiyasi.
- Multiplayer, reyting jadvali, admin panel, kontent muharriri.
- Ko‘p tillilik, ovozli dublyaj.
- Missiya o‘rtasida saqlash (sahifa yangilansa, joriy missiya qaytadan boshlanadi).

### 1.5. Xavfsizlik tamoyillari (majburiy)
O‘yin kiberhujumlarni **faqat simulyatsiya** qiladi:
1. **Haqiqiy zararli kod yo‘q.** «Zararli fayl» — bu shunchaki ma’lumot obyekti (nom, ikonka, hajm). Hech qanday fayl yaratilmaydi, yuklab olinmaydi va ishga tushirilmaydi.
2. **Tashqi havola yo‘q.** O‘yindagi barcha «havolalar» `<a href>` emas, balki `<button>`/`<span>` sifatida chiziladi; bosilganda faqat o‘yin ichidagi simulyatsiya ochiladi. `window.open`, `location` o‘zgartirish ishlatilmaydi.
3. **Maxfiy ma’lumot so‘ralmaydi.** O‘yinda parol, login, telefon raqami yoki ism kiritish uchun erkin matn maydoni **yo‘q**. «Soxta kirish sahifasi» faqat rasm/statik karta sifatida ko‘rsatiladi; parol tanlash — tayyor variantlardan tanlash orqali.
4. **Tarmoq so‘rovi yo‘q.** Ilova faqat o‘zining statik fayllarini yuklaydi. `Content-Security-Policy`: `default-src 'self'; img-src 'self' data:; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` (Pixi uchun kerak bo‘lsa `worker-src 'self' blob:`).
5. **Fiktiv domenlar.** Barcha domenlar RFC 2606 bo‘yicha zaxiralangan `.example` zonasidan: `kompaniya.example`, `kompaniya-tolov.example`. Haqiqiy brend, bank yoki davlat tashkiloti nomi ishlatilmaydi.
6. **HTML in’ektsiya yo‘q.** Xat matnlari tuzilgan ma’lumotdan React komponentlari orqali chiziladi; `dangerouslySetInnerHTML` va `eval` taqiqlanadi (ESLint qoidasi bilan).

---

## 2. Gameplay loop

### 2.1. Makro-loop (o‘yin darajasi)
```
Personaj tanlash → Missiyalar xaritasi → Brifing → Missiya → Natija → (keyingi missiya ochiladi) → Xarita
                                   ↑___________________________________________|
```

### 2.2. Mikro-loop (missiya ichida)
1. **Kuzatish** — o‘yinchi xonada yuradi, interaktiv obyektlar ustida yorliq chiqadi.
2. **O‘rganish** — obyekt bilan interaksiya: hamkasb bilan suhbat, plakatni o‘qish, kompyuter/telefonda simulyatsiya ilovasini ochish.
3. **Belgilarni topish** — simulyatsiya ichida shubhali joylarni bosib «belgi» (clue) sifatida belgilash. Har topilgan belgi +5 ball va qisqa izoh beradi.
4. **Qaror** — muhim nuqtada 3–4 ta tanlovdan biri.
5. **Fikr-mulohaza** — darhol natija:
   - ✔ **Xavfsiz** → +10 ball, keyingi bosqich ochiladi.
   - ⚠ **Xavfli** → 0 ball, tushuntirish, o‘yinchi shu qarorni qayta tanlaydi.
   - ✖ **Jiddiy xato** → «Agar bu haqiqatda bo‘lganida…» oqibat ekrani, missiya muvaffaqiyatsiz tugaydi, qayta urinish taklif qilinadi.
6. Barcha majburiy maqsadlar bajarilgach → **Natija ekrani**.

### 2.3. Ball va yulduzlar
- Ball faqat **birinchi urinishdagi** tanlov uchun beriladi (qayta tanlangan xavfsiz javob 0 ball).
- `maxScore = qarorlar soni × 10 + belgilar soni × 5`.
- Yulduzlar (faqat muvaffaqiyatli missiya uchun):
  - ★★★ — barcha qarorlar birinchi urinishda xavfsiz va belgilarning ≥ 80 % topilgan;
  - ★★ — ball ≥ 60 % `maxScore`;
  - ★ — missiya bajarilgan.
- Jiddiy xato → 0 yulduz, `outcome: 'failed'`. Eng yaxshi natija saqlanadi, yomonroq natija uni almashtirmaydi.
- Vaqt bo‘yicha jarima yo‘q.

---

## 3. Missiyalar

Umumiy: har missiyada **1 xona**, **3–5 interaktiv obyekt**, **2–4 qaror**, **4–5 belgi**. Missiyalar tartib bilan ochiladi: M1 → M2 → M3.

Konfiguratsiyadagi qiymatlar: `{company}` = «Kompaniya», `{domain}` = `kompaniya.example`, `{itPhone}` = `1234` (IT xavfsizlik ichki raqami), `{reportButton}` = «Fishingni xabar qilish».

---

### M1. «Shoshilinch hisob-faktura» — fishing xati

**Xona:** ochiq ofis, o‘yinchining ish stoli.

**Vaziyat (brifing):**
> Dushanba, ertalab. Rahbaringiz: «Pochtani ko‘rib chiq, bugun muhim xatlar bor». Pochtada uchta yangi xat bor. Ulardan biri sizni shoshiltirmoqda.

**Interaktiv obyektlar:**
| ID | Obyekt | Harakat |
|---|---|---|
| `m1-computer` | Ish kompyuteri | «Pochta» simulyatsiyasini ochadi |
| `m1-colleague` | Hamkasb Dilnoza (NPC) | Dialog: «Kecha menga ham “buxgalteriya”dan g‘alati xat keldi…» (yo‘naltiruvchi maslahat) |
| `m1-poster` | «Fishing belgilari» plakati | Qisqa eslatma (4 belgi). Ixtiyoriy |
| `m1-manager` | Rahbar xonasi eshigi | Missiya oxirida tasdiqlovchi dialog |

**Pochta qutisi (simulyatsiya):**
1. HR: «Noyabr oyi tadbirlari» — oddiy xat (`hr@kompaniya.example`).
2. Rahbar: «Seshanba kungi yig‘ilish» — oddiy xat.
3. **Fishing xati:**
   - Kimdan: `Buxgalteriya bo‘limi <buxgalteriya@kompaniya-tolov.example>`
   - Mavzu: «SHOSHILINCH: to‘lov 2 soat ichida tasdiqlanmasa, hisobingiz bloklanadi»
   - Murojaat: «Hurmatli xodim,»
   - Havola matni: `kompaniya.example/hisob` → ustiga olib borilganda/fokuslanganda haqiqiy manzil: `kompaniya-tolov.example/login`
   - Ilova: `Hisob_faktura.html` (faqat ikonka)

**Belgilar (clue):**
| ID | Belgi | Izoh |
|---|---|---|
| `m1-c-domain` | Yuboruvchi domeni | `kompaniya-tolov.example` ≠ `kompaniya.example` |
| `m1-c-urgency` | Shoshiltirish va tahdid | «2 soat ichida», «bloklanadi» — bosim o‘tkazish usuli |
| `m1-c-greeting` | Umumiy murojaat | Ismingiz o‘rniga «Hurmatli xodim» |
| `m1-c-link` | Havola manzili | Ko‘rinadigan matn va haqiqiy manzil farq qiladi |
| `m1-c-attachment` | Kutilmagan ilova | Buxgalteriya `.html` ilova yubormaydi |

**Qaror `m1-d-action`** — «Bu xat bilan nima qilasiz?»
| Tanlov | Natija | Fikr-mulohaza |
|---|---|---|
| Havolani bosib, hisobni tasdiqlash | ✖ jiddiy | Oqibat ekrani: soxta kirish sahifasi (statik rasm) → «Login va parolingiz hujumchiga o‘tgan bo‘lardi, u sizning nomingizdan hamkasblarga xat yuborardi». |
| Xatga javob yozib, haqiqiymi deb so‘rash | ⚠ xavfli | Javob hujumchiga boradi va u sizni yanada ishontiradi. |
| Hamkasbga «qarab ber» deb yuborish | ⚠ xavfli | Xavfni boshqa odamga tarqatasiz. |
| Xatni shunchaki o‘chirish | ⚠ xavfli | Siz himoyalandingiz, lekin xavfsizlik jamoasi hujumdan bexabar — boshqalar xatni ochishi mumkin. |
| **«{reportButton}» tugmasini bosish** | ✔ xavfsiz | To‘g‘ri: xat xavfsizlik jamoasiga yuboriladi va pochtadan olib tashlanadi. |

**Qaror `m1-d-verify`** (rahbar eshigi yonida, xabar qilgandan keyin) — «Buxgalteriyada haqiqatan qarz bormi, qanday tekshirasiz?»
| Tanlov | Natija | Izoh |
|---|---|---|
| Xatdagi telefon raqamiga qo‘ng‘iroq qilish | ⚠ xavfli | Raqam hujumchiniki bo‘lishi mumkin. |
| **Buxgalteriyaga ichki ma’lumotnomadagi raqam orqali qo‘ng‘iroq qilish** | ✔ xavfsiz | Har doim mustaqil, ma’lum kanal orqali tekshiring. |
| Tekshirmaslik | ⚠ xavfli | Agar haqiqiy masala bo‘lsa, u hal bo‘lmay qoladi. |

**Missiya tugashi:** `m1-d-action` va `m1-d-verify` xavfsiz hal qilingan.

**Saboq:**
- Yuboruvchi domenini harfma-harf tekshiring.
- Havolani bosishdan oldin haqiqiy manzilini ko‘ring.
- Shoshiltirish va tahdid — fishingning asosiy belgisi.
- Shubhali xatni o‘chirish emas, **xabar qilish** kerak.

---

### M2. «Topilgan fleshka» — shubhali fayl va qurilma

**Xona:** ofis qabulxonasi + o‘yinchining stoli (bitta keng xona, ikki zona).

**Vaziyat:**
> Ishga kelayotib, qabulxona yonida polda «Mukofotlar_2026» yozuvli fleshka yotganini ko‘rasiz. Stolingizga yetganingizda messenjerda notanish hamkordan fayl kelgan.

**Interaktiv obyektlar:**
| ID | Obyekt | Harakat |
|---|---|---|
| `m2-usb` | Fleshka | Qaror `m2-d-usb` |
| `m2-reception` | Qabulxona xodimi (NPC) | Dialog: «Yo‘qolgan buyumlarni odatda menga berishadi… lekin qurilmalarni IT oladi.» |
| `m2-it-box` | IT bo‘limi «Topilgan qurilmalar» qutisi | Fleshkani topshirish nuqtasi |
| `m2-computer` | Ish kompyuteri | «Messenjer» va «Fayllar» simulyatsiyasi |

**Messenjer va fayl (simulyatsiya):**
- Yuboruvchi: «Hamkor_Logistika» (kontaktlar ro‘yxatida yo‘q).
- Xabar: «Assalomu alaykum! Shartnomani tez ko‘rib chiqing, bugun imzolashimiz kerak.»
- Fayl: `Shartnoma_oktabr.pdf` (PDF ikonka), hajmi 2,4 MB.
- «Fayllar» oynasida «Fayl kengaytmalarini ko‘rsatish» belgisi yoqilsa, haqiqiy nom ko‘rinadi: `Shartnoma_oktabr.pdf.exe`, turi: «Dastur».

**Belgilar:**
| ID | Belgi | Izoh |
|---|---|---|
| `m2-c-label` | Jozibador yozuv | «Mukofotlar» — qiziqish uyg‘otish uchun ataylab yozilgan |
| `m2-c-unknown` | Notanish yuboruvchi | Kontaktda yo‘q, kutilmagan fayl |
| `m2-c-pressure` | Shoshiltirish | «Bugun imzolashimiz kerak» |
| `m2-c-extension` | Ikki kengaytma | `.pdf.exe` — hujjat emas, dastur |
| `m2-c-type` | Fayl turi | «Dastur» turi PDF uchun mantiqsiz |

**Qaror `m2-d-usb`** — «Fleshka bilan nima qilasiz?»
| Tanlov | Natija | Izoh |
|---|---|---|
| Ish kompyuteriga ulab, egasini aniqlash | ✖ jiddiy | Oqibat: «Fleshka ulanganda yashirin dastur tarmoqqa tarqalishi mumkin edi.» |
| Uyga olib ketib, shaxsiy kompyuterda ko‘rish | ⚠ xavfli | Shaxsiy qurilma ham, keyinchalik ish ma’lumotlari ham xavf ostida. |
| Axlatga tashlash | ⚠ xavfli | Bu hujum urinishi bo‘lishi mumkin — xavfsizlik jamoasi bilishi kerak. |
| **IT xavfsizlik bo‘limiga topshirish** | ✔ xavfsiz | O‘yinchi `m2-it-box`ga borib fleshkani topshiradi (flag `usbHandedOver`). |

**Qaror `m2-d-file`** — «Fayl bilan nima qilasiz?»
| Tanlov | Natija | Izoh |
|---|---|---|
| Faylni ochish | ✖ jiddiy | Oqibat: «Bu fayl dastur edi. U fayllaringizni shifrlab, to‘lov talab qilishi mumkin edi.» (faqat matn va illyustratsiya) |
| Antivirus bilan tekshirib, keyin ochish | ⚠ xavfli | Antivirus hamma narsani ushlay olmaydi; kutilmagan dasturni umuman ochmaslik kerak. |
| Messenjerda yuboruvchidan «bu nima?» deb so‘rash | ⚠ xavfli | Hujumchi albatta «hammasi joyida» deydi. |
| **Ochmasdan, IT xavfsizlikka xabar qilish va hamkor bilan rasmiy kanal orqali tekshirish** | ✔ xavfsiz | To‘g‘ri yo‘l. |

**Missiya tugashi:** `m2-d-usb` va `m2-d-file` xavfsiz hal qilingan.

**Saboq:**
- Topilgan qurilmani hech qachon ulamang — IT ga topshiring.
- Fayl kengaytmasini ko‘ring: `.exe`, `.scr`, `.js`, `.html` ilovalar — xavf belgisi.
- Kutilmagan faylni boshqa, ishonchli kanal orqali tekshiring.

---

### M3. «Tungi bildirishnomalar» — parol, MFA va hodisani xabar qilish

**Xona:** ofis, kechqurun (yoritish qorong‘iroq, palitra o‘zgaradi).

**Vaziyat:**
> Kech qolib ishlayapsiz. Telefoningizga ketma-ket «Kirishni tasdiqlaysizmi?» so‘rovlari kela boshladi, lekin siz hech qayerga kirmayapsiz. Bir daqiqadan keyin «IT yordam»dan qo‘ng‘iroq bo‘ladi.

**Interaktiv obyektlar:**
| ID | Obyekt | Harakat |
|---|---|---|
| `m3-phone` | Telefon | MFA so‘rovlari, qo‘ng‘iroq |
| `m3-poster` | «IT xavfsizlik: ichki raqam {itPhone}» plakati | Belgi + rasmiy raqam manbasi |
| `m3-sticky` | Hamkasb monitoridagi stiker «Parol: Kompaniya2026!» | Belgi; ixtiyoriy harakat «Stikerni olib, hamkasbga eslatma qoldirish» |
| `m3-computer` | Ish kompyuteri | «Hodisani xabar qilish» shakli va «Parolni almashtirish» oynasi |

**MFA so‘rovi (simulyatsiya):** «{company} hisobiga kirish so‘rovi. Joylashuv: noma’lum. Qurilma: Windows. [Tasdiqlash] [Rad etish]». So‘rovlar har 4 soniyada qayta ko‘rinadi (faqat vizual; vaqt bo‘yicha jarima yo‘q, «Harakatni kamaytirish» rejimida animatsiyasiz, son bilan ko‘rsatiladi: «7 ta so‘rov»).

**Belgilar:**
| ID | Belgi | Izoh |
|---|---|---|
| `m3-c-unrequested` | So‘ralmagan so‘rov | Siz kirmayapsiz — demak, parolingiz kimdadir bor |
| `m3-c-location` | Noma’lum joylashuv | Sizning qurilmangiz emas |
| `m3-c-caller` | Qo‘ng‘iroq qiluvchi kod so‘raydi | IT hech qachon kod so‘ramaydi |
| `m3-c-official` | Rasmiy raqam | Raqam plakatda, qo‘ng‘iroq qiluvchidan emas |
| `m3-c-sticky` | Ochiq yozilgan parol | Parolni ko‘rinadigan joyda saqlamang |

**Qaror `m3-d-push`** — «MFA so‘roviga nima qilasiz?»
| Tanlov | Natija | Izoh |
|---|---|---|
| To‘xtashi uchun «Tasdiqlash» | ✖ jiddiy | Oqibat: «Hujumchi hisobingizga kirdi va pochtangizni o‘qiy boshladi.» |
| E’tibor bermay, ishni davom ettirish | ⚠ xavfli | Charchagan payt tasodifan tasdiqlab yuborish mumkin; hodisa xabar qilinmaydi. |
| **«Rad etish»** | ✔ xavfsiz | To‘g‘ri, lekin bu yetarli emas — parol oshkor bo‘lgan. |

**Qaror `m3-d-call`** — Qo‘ng‘iroq: «Men IT bo‘limidanman. Hisobingizda muammo bor, tiklash uchun SMS’dagi 6 xonali kodni ayting.»
| Tanlov | Natija | Izoh |
|---|---|---|
| Kodni aytish | ✖ jiddiy | Oqibat: kod bilan hujumchi MFA himoyasidan o‘tadi. |
| Qo‘ng‘iroq qiluvchi bergan raqamga qayta qo‘ng‘iroq qilish | ⚠ xavfli | Raqam hujumchining o‘ziniki. |
| **Qo‘ng‘iroqni tugatib, plakatdagi ichki raqam {itPhone} ga qo‘ng‘iroq qilish** | ✔ xavfsiz | Mustaqil, ma’lum kanal orqali tekshirish. |

**Qaror `m3-d-report`** — «Hodisani xabar qilish» shakli (kompyuterda). Shakl faqat tanlov elementlaridan iborat (radio/checkbox), erkin matn maydoni yo‘q:
- Nima bo‘ldi? `[✓] So‘ralmagan MFA so‘rovlari` `[✓] Kod so‘rab qo‘ng‘iroq` `[ ] Shubhali xat`
- Biror narsani tasdiqladingizmi yoki aytdingizmi? `(•) Yo‘q` `( ) Ha` `( ) Bilmayman`
- Yuborish tugmasi.

To‘g‘ri belgilangan maydonlar → ✔. Noto‘g‘ri belgilash → ⚠ (qaysi maydon noto‘g‘ri ekani tushuntiriladi, qayta to‘ldiriladi). Shakl ma’lumotlari hech qayerga yuborilmaydi va saqlanmaydi — faqat qaror natijasi.

**Qaror `m3-d-password`** — «Parolni almashtirish» (IT tavsiyasi bilan). Parol **yozilmaydi**, tayyor variantdan tanlanadi:
| Variant | Natija | Izoh |
|---|---|---|
| `Kompaniya2027!` | ⚠ xavfli | Eski parolning taxmin qilinadigan varianti. |
| `Guli1999` / `Bek1999` (tanlangan personajga qarab) | ⚠ xavfli | Ism va tug‘ilgan yil — birinchi tekshiriladigan narsa. |
| Shaxsiy pochtadagi parolni takrorlash | ⚠ xavfli | Bitta parol oshkor bo‘lsa, hamma hisoblar ochiladi. |
| **`choynak-yomg‘ir-velosiped-73` (parol iborasi, parol menejerida saqlanadi)** | ✔ xavfsiz | Uzun, takrorlanmas, eslab qolish oson. |

> Eslatma: parol varianti personaj ismiga qarab o‘zgaradi, lekin natija va ball bir xil — personaj mexanikaga ta’sir qilmaydi.

**Missiya tugashi:** `m3-d-push`, `m3-d-call`, `m3-d-report`, `m3-d-password` xavfsiz hal qilingan. (`m3-sticky` harakati ixtiyoriy, faqat belgi beradi.)

**Saboq:**
- So‘ralmagan MFA so‘rovi = parolingiz oshkor bo‘lgan. Rad eting va xabar qiling.
- MFA/SMS kodni hech kimga, hatto «IT»ga ham aytmang.
- Tekshirish uchun faqat o‘zingiz bilgan rasmiy raqamdan foydalaning.
- Hodisani darhol xabar qiling — hatto ishonchingiz komil bo‘lmasa ham.
- Har bir hisob uchun alohida uzun parol iborasi.

---

## 4. Ekranlar va UI elementlari

Barcha ekranlar — React DOM. Faqat «O‘yin sahnasi» ekranining markazida Pixi canvas bor.

### 4.1. Bosh menyu (`TitleScreen`)
- Logotip «Raqamli Qalqon», qisqa shior.
- Tugmalar: **Davom etish** (progress bo‘lsa), **Yangi o‘yin**, **Sozlamalar**, **O‘yin haqida** (xavfsizlik tamoyillari: «Bu simulyatsiya, hech qanday ma’lumot yig‘ilmaydi»).
- «Yangi o‘yin» progress mavjud bo‘lsa → tasdiqlash dialogi.

### 4.2. Personaj tanlash (`CharacterSelectScreen`)
- Ikki karta: portret, ism, bir qatorli tavsif. Karta — `radio` guruh (`role="radiogroup"`), ←/→ bilan almashadi.
- Tanlangan personajning idle animatsiyasi (reduced-motion’da statik).
- Matn: «Ikkala personajning imkoniyatlari bir xil. Tanlov faqat ko‘rinishni o‘zgartiradi.»
- Tugmalar: **Tasdiqlash**, **Orqaga**.

**Vaqtinchalik vizual konsept (MVP):**
| | Bek | Guli |
|---|---|---|
| Uslub | Flat vektor, 2,5 bosh proporsiya, yumshoq soya, kontur yo‘q | Xuddi shunday |
| Soch | Qisqa, to‘q jigarrang, yon tomonga taralgan | Uzun to‘q jigarrang soch, bitta o‘rilgan soch (kokil) yelkada |
| Kiyim | Och-ko‘k ko‘ylak (`#7FB3E0`), to‘q ko‘k shim (`#2C3E66`), jigarrang poyabzal | Firuza blazer (`#2A9D8F`), oq bluzka, kulrang shim (`#4A4E5A`) |
| Milliy aksent | Bo‘yin bog‘ichi (lanyard)da atlas (ikat) naqshi | Blazer cho‘ntagida atlas naqshli kichik ro‘mol |
| Aksessuar | Xodim beyji, noutbuk sumkasi | Xodim beyji, planshet |
| Teri ranglari | `#D9A77E` / soya `#B9875F` | `#E1B48C` / soya `#C29470` |

Sprayt talablari: 4 yo‘nalish (past, yuqori, chap, o‘ng — o‘ng chapning ko‘zgusi bo‘lishi mumkin), `idle` 2 kadr, `walk` 4 kadr, `interact` 2 kadr; kadr 64×96 px (1x) va 2x versiya; bitta sprite sheet + JSON atlas. Portret 256×256. Dastlab placeholder (rangli geometrik shakllar) bilan ishlash mumkin — atlas formati bir xil bo‘lgani uchun keyin almashtirish faqat assetni almashtirish.

### 4.3. Missiyalar xaritasi (`MissionMapScreen`)
- Ofis qavatining sxematik rejasi, 3 ta tugun (xona): har birida nom, mavzu ikonkasi, holat (🔒 yopiq / ● ochiq / ✔ bajarilgan + yulduzlar).
- Tugunlar DOM tugmalari (`aria-disabled` yopiqlar uchun, «Avval “Shoshilinch hisob-faktura”ni bajaring» izohi bilan).
- Yon panel: tanlangan personaj, umumiy yulduzlar (x/9), **Personajni almashtirish**, **Sozlamalar**, **Bosh menyu**.

### 4.4. Brifing (`BriefingScreen`) — modal yoki alohida ekran
- Missiya nomi, vaziyat matni (2–4 qisqa abzats), maqsadlar ro‘yxati, boshqaruv eslatmasi.
- Tugmalar: **Boshlash**, **Xaritaga qaytish**.

### 4.5. O‘yin sahnasi (`GameScreen`)
- **Canvas** (16:9, mantiqiy o‘lcham 960×540, `aria-hidden="true"`).
- **Hotspot overlay**: har bir interaktiv obyekt uchun canvas ustida shaffof DOM `<button>` (aria-label: «Kompyuter — pochtani ochish»). Klaviatura fokusi va screen reader shu orqali ishlaydi.
- **HUD** (yuqori panel): missiya nomi, joriy maqsad, belgilar `3/5`, ball, ⏸ Pauza tugmasi.
- **Interaksiya maslahati**: yaqin obyekt bo‘lsa pastda «E — Kompyuter bilan ishlash».
- **Obyektlar ro‘yxati** (ixtiyoriy yon panel, «Ro‘yxat rejimi» sozlamasi yoqilsa doim ko‘rinadi): barcha hotspotlar tugma sifatida — canvas’siz o‘ynash imkoniyati.

### 4.6. Interaksiya oynalari
| Komponent | Vazifa |
|---|---|
| `DialogPanel` | NPC suhbati: portret, ism, matn, 1–3 javob tugmasi yoki «Davom etish» |
| `DecisionPanel` | Qaror: savol, kontekst, 3–5 tanlov (raqamlangan 1–5) |
| `SimEmailClient` | Xatlar ro‘yxati + xat ko‘rinishi; «Belgilash rejimi» (🔍) — shubhali qismni bosib belgi qilish; havola ustida haqiqiy manzil tooltip’i; «{reportButton}» tugmasi |
| `SimMessenger` | Chat ko‘rinishi, fayl kartasi |
| `SimFileExplorer` | Fayllar ro‘yxati, «Kengaytmalarni ko‘rsatish» checkbox |
| `SimPhone` | MFA so‘rovi, kiruvchi qo‘ng‘iroq (matnli subtitr bilan) |
| `SimReportForm` | Hodisani xabar qilish shakli (faqat tanlov maydonlari) |
| `SimPasswordChange` | Parol variantlari kartalari, kuch indikatori (matn + ikonka) |

Barcha sim-oynalar: modal (`role="dialog"`, `aria-modal`), fokus tuzog‘i, Esc bilan yopiladi (qaror kutilayotgan bo‘lsa — yopilmaydi, faqat pauza), yuqorisida doim «SIMULYATSIYA» yorlig‘i.

### 4.7. Fikr-mulohaza (`FeedbackPanel`)
- Ikonka + rang + matn (rangga tayanmaslik): ✔ «To‘g‘ri qaror», ⚠ «Bu xavfli», ✖ «Jiddiy xato».
- 1–2 jumlali tushuntirish, `+10` / `+5` ball animatsiyasi.
- `aria-live="polite"` hududiga ham e’lon qilinadi.
- Tugma: ✔ → **Davom etish**; ⚠ → **Qayta tanlash**; ✖ → **Nima bo‘lardi?** (oqibat ekraniga).
- Belgi topilganda kichik toast (3 soniya, `aria-live`).

### 4.8. Oqibat ekrani (`ConsequencePanel`)
- Sarlavha: «Simulyatsiya: agar bu haqiqatda bo‘lganida…»
- 3 qadamli qisqa vaqt chizig‘i (illyustratsiya + matn), oxirida «Buning oldini olish uchun: …».
- Tugmalar: **Missiyani qayta boshlash**, **Natijani ko‘rish**.

### 4.9. Natija (`ResultScreen`)
- Holat: «Missiya bajarildi» / «Missiya bajarilmadi».
- Yulduzlar, ball `45/60`, eng yaxshi natija.
- Qarorlar ro‘yxati: har biri uchun birinchi tanlov va natija ikonkasi.
- Belgilar: topilganlar ✔, topilmaganlar — izohi bilan ko‘rsatiladi (o‘rganish uchun).
- «Eslab qoling» bloki — missiya saboqlari (3–5 band).
- Tugmalar: **Keyingi missiya** (ochilgan bo‘lsa), **Qayta o‘ynash**, **Xaritaga**.
- Barcha 3 missiya bajarilganda: «Tabriklaymiz» bloki va umumiy xulosa (barcha saboqlar bitta ro‘yxatda, chop etish uchun `window.print()` qulay CSS).

### 4.10. Sozlamalar (`SettingsScreen`) va Pauza (`PauseMenu`)
- Sozlamalar: matn o‘lchami (100 / 125 / 150 %), harakatni kamaytirish (Tizim / Yoqilgan / O‘chirilgan), yuqori kontrast, ro‘yxat rejimi, tovush (yoqish/o‘chirish), **Progressni tozalash** (tasdiqlash bilan).
- Pauza: **Davom etish**, **Missiyani qayta boshlash**, **Sozlamalar**, **Xaritaga chiqish** (tasdiqlash: «Joriy missiya progressi yo‘qoladi»).

---

## 5. Texnologiya va arxitektura

### 5.1. Stek
| Qism | Tanlov | Sabab |
|---|---|---|
| Build | Vite | Tez, sodda, statik build |
| UI | React 18 + TypeScript (`strict`) | Talab; DOM UI, accessibility |
| 2D sahna | **PixiJS v8** | Pastga qarang |
| Holat | Zustand | Kichik, React’dan tashqarida ham (Pixi ko‘prigida) o‘qish/yozish mumkin |
| Stil | CSS Modules + CSS o‘zgaruvchilari (tokenlar) | Qo‘shimcha kutubxonasiz |
| Validatsiya | Zod (faqat saqlangan progress uchun) | `localStorage`dagi buzilgan ma’lumotdan himoya |
| Test | Vitest + React Testing Library | Vite bilan bir ekotizim |
| Lint | ESLint + `jsx-a11y` + `react-hooks` | Accessibility va xavfsizlik qoidalari |

### 5.2. Nega PixiJS
- **Faqat render** — fizika, sahna menejeri, o‘z UI tizimi yo‘q. Bizga faqat xona foni, personaj spraytlari, hotspot ajratib ko‘rsatish va oddiy harakat kerak; qolgan hamma narsa (dialog, menyu, sim-oynalar) React’da.
- **Yengil va tez**: WebGL/WebGPU, Canvas fallback; tree-shaking bilan faqat kerakli modullar.
- **React bilan to‘qnashmaydi**: Pixi ilovasi bitta `div`ga imperativ tarzda ulanadi; holat va logika React/Zustand tomonda qoladi.
- Phaser bilan solishtirish: Phaser to‘liq o‘yin dvigateli (fizika, sahnalar, input, o‘z UI) — bu loyiha uchun ortiqcha, hajmi katta va o‘zining holat/sahna boshqaruvi React bilan ikki markazli arxitektura yaratadi.
- `@pixi/react` **ishlatilmaydi**: sahna kichik, imperativ kod soddaroq va o‘yin sikli React render’laridan mustaqil bo‘ladi.

### 5.3. Qatlamlar
```
┌──────────────────────────── React (DOM) ────────────────────────────┐
│ Screens · UI · Sim-ilovalar · Hotspot overlay · HUD · Feedback      │
│            ▲ selectors                         │ dispatch(action)   │
│ ┌──────────┴───────────────────────────────────▼───────────────────┐ │
│ │ Zustand store: appSlice (ekran, sozlamalar, progress)            │ │
│ │                missionSlice → missionReducer (sof TS)            │ │
│ └──────────▲───────────────────────────────────┬───────────────────┘ │
└────────────┼───────────────────────────────────┼─────────────────────┘
       SceneEvent                          SceneCommand
┌────────────┴───────────────────────────────────▼─────────────────────┐
│ GameBridge (typed event emitter)                                     │
│ PixiJS: SceneManager · Room · Player · HotspotView · Input           │
└──────────────────────────────────────────────────────────────────────┘
```

**Qoidalar:**
1. **Missiya logikasi sof TypeScript** (`missions/engine`) — React’ga ham, Pixi’ga ham bog‘liq emas. Shuning uchun to‘liq unit test qilinadi.
2. **Pixi faqat ko‘rsatadi va input beradi.** U qaror qabul qilmaydi, ball hisoblamaydi. U faqat «o‘yinchi hotspot X yonida», «hotspot X faollashtirildi» kabi hodisalarni yuboradi.
3. **React — yagona haqiqat manbai** (store orqali). Sahna store’dan `phase`ni kuzatadi: `exploring` bo‘lmasa, harakat to‘xtaydi.
4. **Kontent — ma’lumot.** Missiyalar `missions/data/*.ts` fayllarida tiplangan obyekt sifatida; yangi missiya qo‘shish = yangi ma’lumot fayli + (kerak bo‘lsa) xona asseti.

### 5.4. Ko‘prik (bridge) shartnomasi
```ts
// game/bridge.ts
export type SceneCommand =
  | { type: 'loadRoom'; room: RoomDefinition; characterId: CharacterId }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'walkToHotspot'; hotspotId: string }          // klaviatura/ro‘yxat orqali tanlanganda
  | { type: 'setHotspotState'; hotspotId: string; state: HotspotVisualState }
  | { type: 'setReducedMotion'; value: boolean };

export type SceneEvent =
  | { type: 'ready' }
  | { type: 'nearHotspotChanged'; hotspotId: string | null }
  | { type: 'hotspotActivated'; hotspotId: string }        // yetib borildi va interaksiya
  | { type: 'hotspotLayout'; rects: Record<string, ScreenRect> }; // DOM overlay uchun, resize’da

export interface GameBridge {
  send(cmd: SceneCommand): void;
  on(handler: (e: SceneEvent) => void): () => void;       // unsubscribe qaytaradi
}
```
`GameScreen` mount bo‘lganda `createScene(container, bridge)` chaqiriladi, unmount’da `destroy()` (Pixi app, ticker, listenerlar tozalanadi — React StrictMode’dagi ikki marta mount’ga chidamli bo‘lishi shart).

### 5.5. Sahna (Pixi) tafsilotlari
- Mantiqiy o‘lcham 960×540; konteynerga `contain` usulida masshtablanadi (letterbox), `resolution = devicePixelRatio` (max 2).
- **Xona**: fon rasmi (bitta PNG/WebP), `walkable` to‘rtburchak, `blockers` (AABB to‘rtburchaklar — stol, shkaf).
- **Harakat**: tezlik 180 px/s; klaviatura — yo‘nalish vektori; sichqoncha/sensor — bosilgan nuqtaga to‘g‘ri chiziq bo‘ylab (walkable ichiga clamp), to‘siqqa urilsa o‘qlar bo‘yicha sirpanish. Pathfinding MVPda yo‘q — xonalar to‘siqlari sodda joylashtiriladi.
- **Hotspot**: `interactPoint` (personaj turadigan nuqta) va `radius` 56 px. Radius ichida — konturli yorug‘lik + maslahat. Hotspot bosilsa → personaj `interactPoint`ga boradi → `hotspotActivated`.
- **Chuqurlik**: spraytlar `y` bo‘yicha saralanadi.
- Yuklash: `Assets.load` bilan xona assetlari missiya boshlanishida; yuklanish ko‘rsatkichi React’da.

### 5.6. Papkalar tuzilmasi
```
src/
├─ main.tsx
├─ app/
│  ├─ App.tsx                 # ekran almashtirgich (screen → komponent)
│  ├─ store.ts                # Zustand: appSlice + missionSlice
│  ├─ transitions.ts          # ekranlar o‘tish jadvali va guardlar
│  └─ config.ts               # companyConfig: nom, domen, IT raqam, tugma matni
├─ screens/
│  ├─ TitleScreen/  CharacterSelectScreen/  MissionMapScreen/
│  ├─ BriefingScreen/  GameScreen/  ResultScreen/  SettingsScreen/
├─ ui/                        # qayta ishlatiladigan DOM komponentlar
│  ├─ Button  Modal  Toast  LiveRegion  Stars  ConfirmDialog
│  ├─ HUD  DialogPanel  DecisionPanel  FeedbackPanel  ConsequencePanel  PauseMenu
│  └─ HotspotOverlay  HotspotList
├─ sim/                       # xavfsiz simulyatsiya ilovalari (faqat DOM)
│  ├─ SimEmailClient  SimMessenger  SimFileExplorer
│  ├─ SimPhone  SimReportForm  SimPasswordChange
│  └─ SimFrame.tsx            # «SIMULYATSIYA» ramkasi
├─ game/                      # PixiJS qatlami
│  ├─ bridge.ts  createScene.ts
│  ├─ Room.ts  Player.ts  HotspotView.ts  input.ts  layout.ts
├─ missions/
│  ├─ engine/
│  │  ├─ missionReducer.ts    # sof funksiya
│  │  ├─ conditions.ts  scoring.ts  validateMission.ts
│  ├─ data/
│  │  ├─ m1-phishing.ts  m2-suspicious-file.ts  m3-mfa-incident.ts
│  │  └─ index.ts             # MISSIONS ro‘yxati va tartib
│  └─ rooms/                  # RoomDefinition’lar (koordinatalar)
├─ content/
│  ├─ characters.ts
│  └─ uz/ui.ts                # barcha UI matnlari
├─ persistence/
│  ├─ storage.ts  schema.ts  migrate.ts
├─ types/
│  └─ models.ts
├─ styles/
│  └─ tokens.css  global.css
└─ assets/
   ├─ characters/ (bek.png, bek.json, guli.png, guli.json, portretlar)
   └─ rooms/ (m1-office.webp, m2-lobby.webp, m3-office-night.webp)
tests/ — engine, persistence, content-validatsiya, asosiy UI oqimlari
```

---

## 6. Holatlar va o‘tish qoidalari

### 6.1. Ilova ekranlari
```ts
type AppScreen =
  | 'title' | 'characterSelect' | 'map' | 'briefing'
  | 'playing' | 'result' | 'settings';
```

| Joriy | Hodisa | Keyingi | Guard / izoh |
|---|---|---|---|
| — (start) | ilova yuklandi | `title` | progress o‘qiladi |
| `title` | Davom etish | `map` | `selectedCharacter` bor bo‘lsa; yo‘q bo‘lsa → `characterSelect` |
| `title` | Yangi o‘yin | `characterSelect` | progress bo‘lsa — tasdiqlash, keyin tozalash |
| `characterSelect` | Tasdiqlash | `map` | personaj saqlanadi |
| `characterSelect` | Orqaga | oldingi ekran (`title` yoki `map`) | |
| `map` | Missiya tuguni | `briefing` | `status !== 'locked'` |
| `map` | Personajni almashtirish | `characterSelect` | progress saqlanadi |
| `briefing` | Boshlash | `playing` | `START_MISSION` |
| `briefing` | Orqaga | `map` | |
| `playing` | missiya `completed`/`failed` + natija tasdiqlandi | `result` | natija **avval** saqlanadi |
| `playing` | Pauza → Xaritaga chiqish | `map` | tasdiqlash; missiya holati tashlanadi |
| `result` | Keyingi missiya | `briefing` | keyingisi ochiq bo‘lsa |
| `result` | Qayta o‘ynash | `briefing` | |
| `result` | Xaritaga | `map` | |
| istalgan | Sozlamalar | `settings` | `returnTo` eslab qolinadi; `playing`dan faqat pauza orqali (overlay sifatida) |
| `settings` | Orqaga | `returnTo` | |

### 6.2. Missiya fazalari (`playing` ichida)
```ts
type MissionPhase =
  | 'loading'      // assetlar yuklanmoqda
  | 'exploring'    // yurish mumkin
  | 'interacting'  // dialog yoki sim-oyna ochiq (harakat to‘xtagan)
  | 'deciding'     // DecisionPanel ochiq
  | 'feedback'     // FeedbackPanel ko‘rsatilmoqda
  | 'consequence'  // jiddiy xato oqibati
  | 'paused'
  | 'completed' | 'failed';
```

| Joriy | Action | Keyingi |
|---|---|---|
| `loading` | `SCENE_READY` | `exploring` |
| `exploring` | `ACTIVATE_HOTSPOT` (dialog/sim) | `interacting` |
| `exploring` / `interacting` | `ACTIVATE_HOTSPOT` / sim ichidagi tugma (qaror) | `deciding` |
| `interacting` | `CLOSE_OVERLAY` | `exploring` |
| `interacting` | `FIND_CLUE` | `interacting` (toast) |
| `deciding` | `CHOOSE` safe/risky | `feedback` |
| `deciding` | `CHOOSE` critical | `feedback` → `consequence` |
| `feedback` | `ACK` (safe) | `completeWhen` bajarilgan bo‘lsa `completed`, aks holda oldingi kontekst (`interacting`/`exploring`) |
| `feedback` | `ACK` (risky) | `deciding` (shu qaror qaytadan) |
| `consequence` | `ACK` | `failed` |
| har qanday faol faza | `PAUSE` | `paused` (`resumeTo` saqlanadi) |
| `paused` | `RESUME` | `resumeTo` |
| `paused` | `RESTART` | `loading` |

Qoidalar:
- Pixi harakati faqat `exploring`da yoqiq.
- Bitta vaqtda faqat bitta overlay ochiq bo‘ladi (`activeOverlay`).
- `CHOOSE` faqat `deciding` fazada qabul qilinadi; boshqa fazada e’tiborsiz qoldiriladi (ikki marta bosishdan himoya).
- Hal qilingan (`safe`) qarorning hotspoti `done` holatiga o‘tadi va qayta qaror ochmaydi (faqat ma’lumot dialogi).

---

## 7. TypeScript ma’lumotlar modellari

```ts
// types/models.ts

// ---------- Personaj ----------
export type CharacterId = 'bek' | 'guli';
export type Direction = 'down' | 'up' | 'left' | 'right';
export type AnimationName = 'idle' | 'walk' | 'interact';

export interface Character {
  id: CharacterId;
  name: string;                // 'Bek' | 'Guli'
  shortDescription: string;
  portrait: string;            // asset yo‘li
  spriteSheet: string;         // atlas JSON yo‘li
  frameSize: { width: number; height: number };
  animations: Record<AnimationName, Record<Direction, { frames: string[]; fps: number }>>;
}
// Muhim: Character’da mexanikaga ta’sir qiluvchi maydon (tezlik, bonus) YO‘Q.

// ---------- Xona ----------
export interface Rect { x: number; y: number; width: number; height: number }
export interface Point { x: number; y: number }

export interface RoomDefinition {
  id: string;
  background: string;
  walkable: Rect;
  blockers: Rect[];
  spawn: Point;
}

// ---------- Interaktiv obyekt ----------
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
  label: string;               // «Kompyuter»
  ariaLabel: string;           // «Kompyuter — pochtani ochish»
  sprite?: string;
  bounds: Rect;                // bosiladigan maydon (mantiqiy koordinata)
  interactPoint: Point;
  visibleWhen?: Condition;
  enabledWhen?: Condition;
  action: InteractionAction;
  actionWhenDone?: InteractionAction; // qaror hal bo‘lgandan keyin (masalan, ma’lumot dialogi)
}

// ---------- Shart va effekt ----------
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

// ---------- Belgi ----------
export interface Clue {
  id: string;
  label: string;
  explanation: string;
  points: number;              // odatda 5
}

// ---------- Tanlov va qaror ----------
export type ChoiceOutcome = 'safe' | 'risky' | 'critical';

export interface Choice {
  id: string;
  label: string;
  outcome: ChoiceOutcome;
  feedbackTitle: string;
  feedback: string;            // 1–2 jumla
  points: number;              // safe: 10, boshqalar: 0
  effects?: Effect[];          // odatda faqat safe uchun
  consequenceId?: string;      // critical uchun majburiy
  /** Personaj ismiga bog‘liq matn uchun: '{name}' o‘rniga qo‘yiladi */
  templated?: boolean;
}

export interface Decision {
  id: string;
  prompt: string;
  context?: string;
  choices: Choice[];           // 3–5 ta, kamida bittasi 'safe'
  shuffle?: boolean;           // default: true (to‘g‘ri javob doim bir joyda bo‘lmasin)
}

export interface Consequence {
  id: string;
  title: string;
  steps: { image?: string; text: string }[];
  prevention: string;
}

// ---------- Missiya ----------
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
  simContent: SimContent;      // email/messenger/files/... ma’lumotlari
  completeWhen: Condition;
  lessons: string[];
  unlocks: MissionId[];
}

// Sim-ilovalar kontenti (faqat ma’lumot; hech narsa bajarilmaydi)
export interface SimEmail {
  id: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  greeting: string;
  body: SimTextPart[];
  attachment?: { fileName: string; clueId?: string };
  decisionId?: string;         // xat ochilganda/tugmada ochiladigan qaror
}
export type SimTextPart =
  | { type: 'text'; text: string; clueId?: string }
  | { type: 'link'; text: string; realUrl: string; clueId?: string }; // <a> emas!

export interface SimFile {
  id: string;
  displayName: string;         // kengaytmalar yashirilganda
  realName: string;
  typeLabel: string;           // «Dastur»
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

// ---------- Runtime holat (saqlanmaydi) ----------
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

// ---------- Natija ----------
export interface MissionResult {
  missionId: MissionId;
  outcome: 'passed' | 'failed';
  score: number;
  maxScore: number;
  stars: 0 | 1 | 2 | 3;
  cluesFound: string[];
  decisions: DecisionLogEntry[];
  finishedAt: string;          // ISO sana
}

// ---------- Lokal progress ----------
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

### 7.1. Reducer action’lari
```ts
export type MissionAction =
  | { type: 'START_MISSION'; missionId: MissionId }
  | { type: 'SCENE_READY' }
  | { type: 'ACTIVATE_HOTSPOT'; hotspotId: string }
  | { type: 'OPEN_DECISION'; decisionId: string }       // sim ichidagi tugmalardan
  | { type: 'FIND_CLUE'; clueId: string }
  | { type: 'CHOOSE'; decisionId: string; choiceId: string }
  | { type: 'ACK' }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'PAUSE' } | { type: 'RESUME' } | { type: 'RESTART' };

export function missionReducer(state: MissionRuntimeState, action: MissionAction, mission: Mission): MissionRuntimeState;
export function buildResult(state: MissionRuntimeState, mission: Mission): MissionResult;
```

### 7.2. Kontent validatsiyasi (`validateMission`)
Test va dev rejimida har bir missiya uchun tekshiriladi:
- barcha `dialogId`, `decisionId`, `clueId`, `consequenceId` havolalari mavjud;
- har bir qarorda kamida bitta `safe` va 3–5 ta tanlov bor;
- har bir `critical` tanlovda `consequenceId` bor;
- `completeWhen` dagi har bir flag biror `effects` orqali o‘rnatiladi (missiyani tugatish mumkin);
- hotspot `bounds`/`interactPoint` xona `walkable` ichida;
- matnlarda `http://`/`https://` va `.example` bo‘lmagan domen yo‘q.

---

## 8. Progressni lokal saqlash

- **Joy:** `localStorage`, kalit `raqamli-qalqon:progress`.
- **Format:** `LocalProgress` JSON, `version` maydoni bilan.
- **Qachon yoziladi:** personaj tanlanganda, missiya tugaganda (`passed` yoki `failed`), sozlama o‘zgarganda. Missiya ichidagi holat saqlanmaydi.
- **O‘qish:** ilova startida → `JSON.parse` → `migrate()` → Zod sxema bilan tekshirish. Xato bo‘lsa — standart progress (M1 `available`, qolganlari `locked`) va konsolga ogohlantirish; buzilgan qiymat `raqamli-qalqon:progress:corrupt` kalitiga ko‘chiriladi.
- **Mavjud bo‘lmasa** (private rejim, bloklangan storage, kvota): `try/catch`, xotirada ishlash davom etadi, sozlamalarda «Progress bu brauzerda saqlanmaydi» ogohlantirishi.
- **Natijani qo‘llash:**
  - `attempts += 1`; `lastResult` yangilanadi;
  - `passed` bo‘lsa `status = 'completed'`, `bestScore/bestStars = max(...)`, `unlocks` dagi missiyalar `locked → available`;
  - `failed` eng yaxshi natijani pasaytirmaydi.
- **Maxfiylik:** faqat o‘yin progressi va sozlamalar. Ism, email, qurilma ma’lumoti saqlanmaydi; sim-shakllardagi tanlovlar saqlanmaydi.
- **Tozalash:** Sozlamalar → «Progressni tozalash» (tasdiqlash bilan) kalitni o‘chiradi.

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
    /* storage mavjud emas yoki JSON buzilgan */
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

Kelajakda yangi missiya qo‘shilsa: `migrate()` yangi `MissionId` uchun default yozuv qo‘shadi (oldingi missiya `completed` bo‘lsa `available`), `version` oshiriladi.

---

## 9. Boshqaruv, accessibility va moslashuvchanlik

### 9.1. Klaviatura
| Tugma | Harakat |
|---|---|
| `W A S D` / strelkalar | Yurish (sahnada) |
| `E` / `Enter` / `Space` | Yaqin obyekt bilan interaksiya |
| `Tab` / `Shift+Tab` | Hotspotlar va UI elementlari bo‘yicha fokus (fokuslangan hotspotda `Enter` → personaj o‘zi borib interaksiya qiladi) |
| `1`–`5` | Qaror panelida tanlov |
| `Esc` | Overlayni yopish / pauza |
| `C` | Sim-oynada «Belgilash rejimi»ni yoqish/o‘chirish |
| `L` | Obyektlar ro‘yxatini ochish/yopish |

- Klaviatura tugmalari input/radio fokusda bo‘lsa sahnaga uzatilmaydi.
- Strelkalar faqat canvas fokusda yoki hech narsa fokusda bo‘lmaganda yurishni boshqaradi (radio guruhlar bilan to‘qnashmasligi uchun).

### 9.2. Sichqoncha va sensor
- Polni bosish — o‘sha nuqtaga yurish; hotspotni bosish — borib interaksiya.
- Hover — hotspot yorlig‘i (sensorli qurilmada birinchi tegish = tanlash va yorliq, ikkinchisi = interaksiya; yoki «Ishlatish» tugmasi).
- Sim-oynada havolaga hover/fokus/uzoq bosish — haqiqiy manzil tooltip’i.

### 9.3. Accessibility (WCAG 2.1 AA maqsadi)
- `lang="uz"`; semantik HTML; har ekranda bitta `<h1>`; ekran almashganda fokus sarlavhaga o‘tadi.
- Matn kontrasti ≥ 4.5:1, UI elementlari ≥ 3:1; ko‘rinadigan fokus halqasi (≥ 2 px, kontrastli).
- Natija hech qachon faqat rang bilan ko‘rsatilmaydi (ikonka + matn).
- Canvas `aria-hidden`; barcha interaktiv obyektlar DOM tugma sifatida mavjud; **«Ro‘yxat rejimi»da o‘yin canvas’ni ko‘rmasdan to‘liq o‘ynaladi**.
- Modal: fokus tuzog‘i, yopilganda fokus chaqiruvchi elementga qaytadi.
- `aria-live="polite"` hududi: belgi topildi, qaror natijasi, maqsad bajarildi.
- Vaqt chegarasi yo‘q; avtomatik yopiladigan toastlarning mazmuni natija ekranida ham bor.
- `prefers-reduced-motion` + sozlama: yurish animatsiyasi o‘rniga tez siljish, miltillash va silkinish yo‘q; MFA spam — hisoblagich bilan.
- Matn o‘lchami 150 % gacha layout buzilmasdan; `rem` birliklari.
- Qo‘ng‘iroq va har qanday tovush — matnli subtitr bilan; tovush mazmun uchun majburiy emas.
- Sensorli nishonlar ≥ 44×44 px.

### 9.4. Kichik ekranlar
- Qo‘llab-quvvatlanadigan minimal kenglik: 360 px. Brauzerlar: Chrome, Edge, Firefox, Safari (oxirgi 2 versiya), iOS Safari 16+.
- **≥ 1024 px**: canvas markazda, HUD yuqorida, overlaylar canvas ustida modal.
- **600–1023 px**: canvas to‘liq kenglikda, overlaylar to‘liq ekranli modal.
- **< 600 px (portret)**: canvas yuqorida (16:9), ostida HUD va «Obyektlar ro‘yxati» doim ochiq; sim-oynalar to‘liq ekran; qaror tanlovlari vertikal ro‘yxat.
- Gorizontal sahifa skroli yo‘q; `100dvh` ishlatiladi; virtual klaviatura chiqmaydi (matn maydoni yo‘q).
- Canvas o‘lchami `ResizeObserver` orqali yangilanadi va `hotspotLayout` qayta yuboriladi.

---

## 10. Qabul mezonlari

### 10.1. M1 «Shoshilinch hisob-faktura»
- [ ] Brifingdan keyin o‘yinchi stoliga yetib, kompyuter orqali pochtani ochadi; pochtada 3 ta xat.
- [ ] Fishing xatida 5 ta belgi topish mumkin; har biri bir marta hisoblanadi (+5), izoh ko‘rsatiladi.
- [ ] Havola ustiga hover/fokusda haqiqiy manzil `kompaniya-tolov.example/login` ko‘rinadi; havola bosilganda hech qanday tashqi sahifa ochilmaydi, tarmoq so‘rovi bo‘lmaydi.
- [ ] «Havolani bosish» → jiddiy xato → oqibat ekrani (statik rasm, kiritish maydoni yo‘q) → `failed`.
- [ ] «Javob yozish», «Hamkasbga yuborish», «O‘chirish» → ⚠ va qarorni qayta tanlash imkoni.
- [ ] «{reportButton}» → ✔ +10; xat pochtadan yo‘qoladi; `m1-d-verify` qarori ochiladi.
- [ ] Ikkala qaror xavfsiz hal qilingach natija ekrani ko‘rinadi, M2 ochiladi.
- [ ] Oddiy xatlarda belgi bosilsa «Bu yerda shubhali narsa yo‘q» deyiladi (ball yo‘q, jarima yo‘q).

### 10.2. M2 «Topilgan fleshka»
- [ ] Fleshka xonada ko‘rinadi va interaksiya qaror ochadi.
- [ ] «Ish kompyuteriga ulash» → oqibat → `failed`.
- [ ] «IT ga topshirish» → personaj IT qutisiga boradi (yoki qaror shu yerda tasdiqlanadi), fleshka sahnadan yo‘qoladi, flag o‘rnatiladi.
- [ ] Messenjerda fayl kartasi; «Fayllar»da kengaytmalar yoqilganda `.pdf.exe` va «Dastur» turi ko‘rinadi, bu ikki belgi beradi.
- [ ] Fayl hech qachon haqiqiy yuklanmaydi; «Ochish» faqat oqibat ekranini ko‘rsatadi.
- [ ] Ikkala qaror xavfsiz hal qilingach natija ekrani, M3 ochiladi.

### 10.3. M3 «Tungi bildirishnomalar»
- [ ] MFA so‘rovlari telefon orqali ko‘rinadi; reduced-motion’da animatsiyasiz hisoblagich.
- [ ] «Tasdiqlash» → oqibat → `failed`; «Rad etish» → ✔ va qo‘ng‘iroq boshlanadi.
- [ ] Qo‘ng‘iroq matni subtitr sifatida ko‘rinadi; «Kodni aytish» → `failed`; «Plakatdagi raqamga qo‘ng‘iroq» → ✔.
- [ ] Hodisa shaklida erkin matn maydoni yo‘q; noto‘g‘ri belgilash qaysi maydon xatoligini ko‘rsatadi; ma’lumot saqlanmaydi.
- [ ] Parol almashtirishda parol yozilmaydi, faqat variant tanlanadi; ism varianti tanlangan personajga mos.
- [ ] To‘rt qaror xavfsiz hal qilingach natija ekrani va «Tabriklaymiz» bloki.

### 10.4. Umumiy MVP tayyorlik mezonlari
**Funksional**
- [ ] Uchala missiya boshidan oxirigacha (a) faqat klaviatura, (b) faqat sichqoncha, (c) faqat sensor bilan o‘ynaladi.
- [ ] «Ro‘yxat rejimi»da uchala missiya canvas’siz bajariladi.
- [ ] Bek va Guli bilan bir xil tanlovlar ketma-ketligi bir xil ball, yulduz va natija beradi (avtomatik test).
- [ ] Ball va yulduz 2.3-bo‘lim qoidalariga mos (unit test).
- [ ] Sahifa yangilangandan keyin personaj, missiya holatlari, eng yaxshi natijalar va sozlamalar saqlanib qoladi.
- [ ] Buzilgan/eski `localStorage` qiymati ilovani buzmaydi (unit test).
- [ ] Pauza, qayta boshlash va xaritaga chiqish har bir fazada to‘g‘ri ishlaydi; sahna `destroy()` dan keyin xotira/listener sizib chiqmaydi.

**Xavfsizlik**
- [ ] DevTools Network: ilova yuklangandan keyin faqat o‘z domenidagi statik fayllar; o‘yin davomida yangi tashqi so‘rov yo‘q.
- [ ] Kod bazasida `dangerouslySetInnerHTML`, `eval`, `new Function`, `window.open`, tashqi `href` yo‘q (lint qoidasi + grep tekshiruvi).
- [ ] O‘yinda parol/login/shaxsiy ma’lumot uchun matn kiritish maydoni yo‘q.
- [ ] Barcha domenlar `.example` zonasida; `validateMission` testi o‘tadi.
- [ ] Har bir sim-oynada «SIMULYATSIYA» yorlig‘i bor.

**Accessibility va moslashuvchanlik**
- [ ] Lighthouse Accessibility ≥ 95; axe — kritik xatolarsiz.
- [ ] Kontrast talablari bajarilgan; fokus doim ko‘rinadi.
- [ ] 360 px, 768 px, 1280 px kengliklarda gorizontal skrolsiz va kesilgan matnsiz ishlaydi; 150 % matn o‘lchamida ham.
- [ ] Screen reader (NVDA yoki VoiceOver) bilan M1 to‘liq bajariladi.

**Sifat va unumdorlik**
- [ ] `tsc --noEmit` va ESLint xatosiz; engine, persistence, content-validatsiya testlari o‘tadi.
- [ ] Boshlang‘ich JS ≤ 400 KB (gzip); birinchi ekran o‘rtacha noutbukda ≤ 2 s; sahna o‘rtacha noutbukda barqaror 60 FPS, o‘rtacha telefonda ≥ 30 FPS.
- [ ] Ilova statik hosting (yoki ichki web-server) dan backendsiz ishlaydi; `vite build` natijasi nisbiy yo‘llar bilan istalgan papkadan ochiladi.

**Kontent**
- [ ] Barcha matnlar o‘zbek (lotin) tilida, imlo tekshirilgan, `content/` va `missions/data/` da joylashgan (komponentlarda qattiq yozilgan matn yo‘q).
- [ ] Har bir tanlovda tushuntirish, har bir missiyada 3–5 saboq bor.
- [ ] Tashkilot nomi, domeni va IT raqami faqat `app/config.ts` orqali o‘zgaradi.
