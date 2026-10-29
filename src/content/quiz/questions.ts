/**
 * «Bilim sinovi» savollari — «Davlat xizmatchisining raqamli gigiyenasi» qo‘llanmasi asosida
 * (Boshqaruv samaradorligi agentligi va «Kiberxavfsizlik markazi», Toshkent, 2025).
 * Har bir savol — real hayotiy vaziyat; birinchi variant har doim to‘g‘ri javob (sessiyada aralashtiriladi).
 */

export type QuizTopic = 'phishing' | 'password' | 'data' | 'malware' | 'network' | 'deepfake' | 'social' | 'facts';

export interface QuizQuestion {
  id: string;
  topic: QuizTopic;
  icon: string;
  /** Vaziyat (hikoya) */
  scenario: string;
  /** Savol */
  prompt: string;
  /** 4 ta variant; `correct` — to‘g‘ri variant id’si */
  options: { id: string; text: string }[];
  correct: string;
  /** Nega aynan shu javob to‘g‘ri */
  explanation: string;
  /** Qo‘llanmadagi bo‘lim */
  source: string;
}

export const QUIZ_TOPICS: Record<QuizTopic, string> = {
  phishing: 'Fishing',
  password: 'Parol va 2FA',
  data: 'Maxfiy ma’lumot',
  malware: 'Zararli dasturlar',
  network: 'Tarmoq xavfsizligi',
  deepfake: 'Deepfake va SI',
  social: 'Ijtimoiy muhandislik',
  facts: 'Bilasizmi?',
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'oneid-telegram',
    topic: 'phishing',
    icon: '💬',
    scenario:
      'Telegram’da «Davlat xizmatlari» nomidan xabar keldi: «OneID hisobingiz 24 soatda bloklanadi. Tasdiqlash uchun login, parol va SMS kodni shu chatga yuboring».',
    prompt: 'To‘g‘ri harakat qaysi?',
    options: [
      { id: 'a', text: 'Hech narsa yubormayman, rasmiy saytni o‘zim ochib tekshiraman va mas’ul bo‘linmaga xabar beraman' },
      { id: 'b', text: 'Faqat loginni yuboraman — parolsiz xavf yo‘q' },
      { id: 'c', text: 'Hisob bloklanmasligi uchun so‘ralgan hamma narsani yuboraman' },
      { id: 'd', text: 'SMS kodni yubormayman, login va parol esa yetarli bo‘lsa yuboraman' },
    ],
    correct: 'a',
    explanation:
      'Login, parol, OneID ma’lumotlari va SMS orqali kelgan tasdiqlovchi kodlar hech qachon uchinchi shaxslarga oshkor qilinmaydi — hatto «rasmiy» ko‘rinsa ham.',
    source: '1-qism · Davlat xizmatchilari uchun asosiy tavsiyalar',
  },
  {
    id: 'printer-secret',
    topic: 'data',
    icon: '🖨️',
    scenario: 'Muzokara xonasidagi printerda «Maxfiy» belgisi qo‘yilgan hujjat qolib ketgan. Xonaga mehmonlar kirib-chiqib turibdi.',
    prompt: 'Nima qilasiz?',
    options: [
      { id: 'a', text: 'Hujjatni olib, darhol mas’ul bo‘linmaga xabar beraman' },
      { id: 'b', text: 'Kimniki ekanini bilish uchun o‘qib chiqaman' },
      { id: 'c', text: 'O‘z holiga qoldiraman — egasi qaytib keladi' },
      { id: 'd', text: 'Qog‘oz chiqindilar qutisiga tashlayman' },
    ],
    correct: 'a',
    explanation:
      'Maxfiy hujjatlarni ochiq joylarda (printerda, muzokara xonasida) qoldirish holati haqida tegishli mas’ul bo‘linmaga darhol xabar berish kerak.',
    source: '1-qism · Darhol xabar berish kerak bo‘lgan holatlar',
  },
  {
    id: 'bank-call',
    topic: 'phishing',
    icon: '📞',
    scenario:
      'Notanish raqamdan qo‘ng‘iroq: «Bank xavfsizlik xizmatidanmiz. Kartangizdan shubhali to‘lov o‘tmoqda. To‘xtatish uchun karta raqami va hozir kelgan SMS kodni ayting».',
    prompt: 'Bu qanday hujum va qanday javob berasiz?',
    options: [
      { id: 'a', text: 'Vishing — qo‘ng‘iroqni tugatib, bankning rasmiy raqamiga o‘zim qo‘ng‘iroq qilaman' },
      { id: 'b', text: 'DDoS — telefonni o‘chirib qo‘yaman' },
      { id: 'c', text: 'Haqiqiy bank — pulimni saqlash uchun kodni aytaman' },
      { id: 'd', text: 'Smishing — faqat karta raqamini aytaman' },
    ],
    correct: 'a',
    explanation:
      'Telefon orqali amalga oshiriladigan fishing — vishing. Hujumchilar shoshiltirib, maxfiy ma’lumotni oshkor qilishga undaydi. Bank hech qachon SMS kodni so‘ramaydi.',
    source: '2-qism · Fishingning asosiy turlari',
  },
  {
    id: 'parcel-sms',
    topic: 'phishing',
    icon: '📦',
    scenario: 'SMS keldi: «Posilkangiz omborda. Yetkazib berish uchun 5 000 so‘m to‘lang: pochta-uz.example/pay».',
    prompt: 'To‘g‘ri xulosa qaysi?',
    options: [
      { id: 'a', text: 'Bu smishing: havolani bosmayman va karta ma’lumotlarini kiritmayman' },
      { id: 'b', text: 'Summa kichik — to‘lab qo‘yaman' },
      { id: 'c', text: 'Havolani ochib, sayt haqiqiymi tekshirib ko‘raman' },
      { id: 'd', text: 'SMS’ni hamkasblarimga yuborib, ular ham to‘lashsin' },
    ],
    correct: 'a',
    explanation:
      'SMS orqali yuboriladigan fishing — smishing: xabarda zararli saytga havola yoki shaxsiy ma’lumot so‘rovi bo‘ladi. Kichik summa — faqat karta ma’lumotlarini o‘g‘irlash uchun bahona.',
    source: '2-qism · Fishingning asosiy turlari',
  },
  {
    id: 'pharming-url',
    topic: 'phishing',
    icon: '🌐',
    scenario:
      'Saqlangan havola orqali bank saytiga kirdingiz. Sahifa odatdagidek, lekin manzil satrida bitta harf boshqacha va kirishda qo‘shimcha «pasport seriyasi» so‘ralmoqda.',
    prompt: 'Eng to‘g‘ri harakat?',
    options: [
      { id: 'a', text: 'Sahifani yopib, rasmiy manzilni brauzerga o‘zim qo‘lda kiritaman' },
      { id: 'b', text: 'Pasport seriyasini kiritaman — bank xavfsizlikni kuchaytirgan' },
      { id: 'c', text: 'Sahifani yangilab, yana kirishga urinaman' },
      { id: 'd', text: 'Boshqa brauzerda shu havolani ochaman' },
    ],
    correct: 'a',
    explanation:
      'Bu farming bo‘lishi mumkin — trafikni soxta sahifaga yo‘naltirish. Qo‘llanma tavsiyasi: shubhali havolani bosmang, URL manzilni o‘zingiz mustaqil kiriting va 2FA’dan foydalaning.',
    source: '2-qism · Fishingning asosiy turlari',
  },
  {
    id: 'spear-phishing',
    topic: 'phishing',
    icon: '🎯',
    scenario:
      'Kecha konferensiyada nutq so‘zladingiz va bu haqda ijtimoiy tarmoqqa yozdingiz. Bugun ismingiz bilan xat keldi: «Nutqingiz ajoyib edi! Tadbir fotolari ilovada: tadbir_rasmlari.zip».',
    prompt: 'Bu xat bilan nima qilasiz?',
    options: [
      { id: 'a', text: 'Ilovani ochmayman, jo‘natuvchini boshqa kanal orqali tekshiraman — bu maqsadli fishing bo‘lishi mumkin' },
      { id: 'b', text: 'Ismim yozilgan — demak, tanish odam, ochaman' },
      { id: 'c', text: 'Arxivni ochib, faqat rasmlarni ko‘raman' },
      { id: 'd', text: 'Xatni hamkasblarimga ham ulashaman' },
    ],
    correct: 'a',
    explanation:
      'Maqsadli fishing aniq shaxslarga qaratiladi va ularning ish hamda ijtimoiy hayoti haqidagi ma’lumotlardan foydalanadi — shuning uchun juda ishonarli ko‘rinadi.',
    source: '2-qism · Fishingning asosiy turlari',
  },
  {
    id: 'cafe-wifi',
    topic: 'network',
    icon: '☕',
    scenario: 'Kafedasiz. Parolsiz «Free_WiFi» tarmog‘i bor, rahbar esa shoshilinch ravishda xizmat hujjatini ish tizimidan yuborishingizni so‘ramoqda.',
    prompt: 'Qanday yo‘l tutasiz?',
    options: [
      { id: 'a', text: 'Ochiq Wi-Fi’da ish tizimiga kirmayman — mobil internet yoki himoyalangan tarmoqdan foydalanaman' },
      { id: 'b', text: 'Free_WiFi’ga ulanaman — bir martaga hech narsa bo‘lmaydi' },
      { id: 'c', text: 'Hujjatni shaxsiy pochtamdan yuboraman' },
      { id: 'd', text: 'Kafe xodimidan Wi-Fi qanchalik xavfsizligini so‘rayman' },
    ],
    correct: 'a',
    explanation:
      'Himoyalanmagan Wi-Fi’da hujumchi «o‘rtadagi odam» (Man in the Middle) bo‘lib, siz bilan server orasidagi aloqani sezdirmay ushlab, o‘zgartirishi mumkin.',
    source: '2-qism · Kiberhujumlar (Man in the Middle)',
  },
  {
    id: 'updates-later',
    topic: 'malware',
    icon: '🔄',
    scenario: 'Ish kompyuteringiz uch oydan beri «Yangilanishlarni o‘rnatish» deb eslatadi, siz esa har safar «Keyinroq»ni bosasiz.',
    prompt: 'Bu nega xavfli?',
    options: [
      { id: 'a', text: 'Yangilanishlar xakerlar foydalanishi mumkin bo‘lgan zaifliklarni yopadi — ularni kechiktirish eshikni ochiq qoldiradi' },
      { id: 'b', text: 'Xavfli emas — yangilanishlar faqat dizaynni o‘zgartiradi' },
      { id: 'c', text: 'Faqat kompyuter sekinlashadi, xavfsizlikka ta’siri yo‘q' },
      { id: 'd', text: 'Antivirus bor bo‘lsa, yangilanish kerak emas' },
    ],
    correct: 'a',
    explanation:
      'Operatsion tizim va ilovalarni doimiy yangilab borish xakerlar foydalanishi mumkin bo‘lgan zaifliklarni bartaraf etadi. Eskirgan dasturlar — ma’lumot chiqib ketishining asosiy sabablaridan biri.',
    source: '1-qism · Raqamli gigiyenaning asosiy omillari',
  },
  {
    id: 'same-password',
    topic: 'password',
    icon: '🔑',
    scenario:
      'Siz ish pochtasi, OneID va ijtimoiy tarmoq uchun bitta parol ishlatasiz. Bugun yangiliklarda o‘sha ijtimoiy tarmoq ma’lumotlari sizib chiqqani aytildi.',
    prompt: 'Endi nima qilish kerak?',
    options: [
      { id: 'a', text: 'Hamma hisoblarda parolni almashtiraman: har biriga alohida murakkab parol va 2FA' },
      { id: 'b', text: 'Faqat ijtimoiy tarmoq parolini almashtiraman' },
      { id: 'c', text: 'Hech narsa — parolim baribir murakkab' },
      { id: 'd', text: 'Ijtimoiy tarmoqni o‘chirib yuboraman, qolgani o‘zgarmaydi' },
    ],
    correct: 'a',
    explanation:
      'Bir xil paroldan bir nechta servisda foydalanmaslik kerak: bitta sizib chiqish barcha hisoblarni ochadi. Murakkab, takrorlanmas parollar va 2FA — asosiy himoya.',
    source: '3-qism · Shaxsga doir ma’lumotlarni himoya qilish',
  },
  {
    id: 'twofa',
    topic: 'password',
    icon: '🛡️',
    scenario: 'Hujumchi qandaydir yo‘l bilan ish pochtangiz parolini bilib oldi.',
    prompt: 'Qaysi chora uning hisobingizga kirishini to‘xtatib qola oladi?',
    options: [
      { id: 'a', text: 'Ikki faktorli autentifikatsiya (2FA)' },
      { id: 'b', text: 'Brauzer tarixini tozalash' },
      { id: 'c', text: 'Ekran yorqinligini pasaytirish' },
      { id: 'd', text: 'Pochta qutisidagi eski xatlarni o‘chirish' },
    ],
    correct: 'a',
    explanation:
      '2FA faqat parolni emas, balki shaxsni tasdiqlashning ikkinchi usulini ham talab qiladi — parol o‘g‘irlangan taqdirda ham hisobni himoya qiladi.',
    source: '1-qism · Raqamli gigiyenaning asosiy omillari',
  },
  {
    id: 'backup',
    topic: 'malware',
    icon: '💾',
    scenario: 'Hamkasbingiz kompyuteridagi barcha hujjatlar zararli dastur tomonidan shifrlandi va «ochish uchun to‘lov» talab qilinmoqda.',
    prompt: 'Qaysi oldindan ko‘rilgan chora fayllarni tiklashga yordam bergan bo‘lardi?',
    options: [
      { id: 'a', text: 'Ma’lumotlarning tashqi vositalarga muntazam zaxira nusxasi' },
      { id: 'b', text: 'Ish stolidagi fayllarni papkalarga ajratish' },
      { id: 'c', text: 'Kompyuterni har kuni o‘chirib-yoqish' },
      { id: 'd', text: 'Fayl nomlarini kirill yozuvida saqlash' },
    ],
    correct: 'a',
    explanation: 'Ma’lumotlarni muntazam ravishda tashqi vositalarga zaxiralash o‘chirilgan yoki zararlangan fayllarni tiklashga yordam beradi.',
    source: '2-qism · Zararli dasturlardan himoyalanish',
  },
  {
    id: 'free-converter',
    topic: 'malware',
    icon: '⬇️',
    scenario: 'PDF’ni Word’ga o‘tkazish kerak. Qidiruvda «100% bepul konverter — yuklab oling!» degan notanish sayt chiqdi.',
    prompt: 'To‘g‘ri yo‘l?',
    options: [
      { id: 'a', text: 'Faqat tasdiqlangan manbadan yoki IT bo‘limi orqali dastur o‘rnataman' },
      { id: 'b', text: 'Yuklab olaman, antivirus bor — muammo yo‘q' },
      { id: 'c', text: 'Yuklab olib, faqat bir marta ishlataman' },
      { id: 'd', text: 'Shaxsiy kompyuterda o‘rnatib, faylni o‘sha yerda ochaman' },
    ],
    correct: 'a',
    explanation:
      'Troyanlar oddiy dastur ko‘rinishida bo‘ladi, o‘rnatilgandan so‘ng esa ma’lumot o‘g‘irlaydi yoki masofadan kirish imkonini yaratadi. Fayllarni faqat tasdiqlangan manbalardan yuklab oling.',
    source: '2-qism · Zararli dasturiy ta’minot',
  },
  {
    id: 'old-laptop',
    topic: 'data',
    icon: '💻',
    scenario: 'Sizga yangi noutbuk berildi. Eskisini boshqa bo‘limdagi hamkasbingizga berishingiz kerak — unda xizmat hujjatlari va saqlangan parollar bor.',
    prompt: 'Topshirishdan oldin nima qilasiz?',
    options: [
      { id: 'a', text: 'IT bo‘limi orqali ma’lumotlarni to‘liq tozalatib, keyin topshiraman' },
      { id: 'b', text: 'Ish stolidagi fayllarni «Korzina»ga tashlayman' },
      { id: 'c', text: 'Hech narsa — hamkasbim ishonchli odam' },
      { id: 'd', text: 'Faqat brauzerdagi parollarni o‘chiraman' },
    ],
    correct: 'a',
    explanation:
      'Qurilma yoki ma’lumot saqlash vositasi boshqa shaxslarga topshirishdan avval to‘g‘ri tozalanmasa, ma’lumotlar tasodifan oshkor bo‘lishi mumkin.',
    source: '2-qism · Ma’lumotlarning chiqib ketishi',
  },
  {
    id: 'lost-phone',
    topic: 'data',
    icon: '📱',
    scenario: 'Xizmat telefoningiz taksida qolib ketdi. Unda ish pochtasi va messenjer ochiq edi.',
    prompt: 'Birinchi navbatda nima qilasiz?',
    options: [
      { id: 'a', text: 'Darhol mas’ul bo‘linmaga xabar beraman va hisoblar parollarini almashtiraman' },
      { id: 'b', text: 'Taksi haydovchisi qaytarishini bir hafta kutaman' },
      { id: 'c', text: 'Hech kimga aytmayman — jazolashlari mumkin' },
      { id: 'd', text: 'Yangi telefon sotib olib, ishni davom ettiraman' },
    ],
    correct: 'a',
    explanation:
      'Maxfiy ma’lumot saqlaydigan qurilmalarning yo‘qolishi — ma’lumot chiqib ketishining asosiy sabablaridan biri. Bunday holatda darhol mas’ul bo‘linmaga xabar berish kerak.',
    source: '1-qism va 2-qism · Ma’lumotlarning chiqib ketishi',
  },
  {
    id: 'deepfake-boss',
    topic: 'deepfake',
    icon: '🎙️',
    scenario:
      'Rahbaringizning aynan o‘z ovozi bilan qo‘ng‘iroq: «Men majlisdaman, gaplasha olmayman. Shoshilinch: hisobot faylini shu shaxsiy pochtaga yubor!».',
    prompt: 'Qanday harakat qilasiz?',
    options: [
      { id: 'a', text: 'Rahbarni boshqa ma’lum kanal orqali tasdiqlayman — bu deepfake audio bo‘lishi mumkin' },
      { id: 'b', text: 'Ovoz aynan rahbarniki — darhol yuboraman' },
      { id: 'c', text: 'Faylning yarmini yuboraman, qolganini keyin' },
      { id: 'd', text: 'Shaxsiy pochtamdan yuboraman, ish pochtasidan emas' },
    ],
    correct: 'a',
    explanation:
      'Deepfake audio rahbar ovozini taqlid qilib, xodimlarni aldash va maxfiy ma’lumotlarga kirish uchun ishlatilishi mumkin. Shoshilinch va g‘ayrioddiy so‘rovlarni har doim boshqa kanal orqali tekshiring.',
    source: '3-qism · Zamonaviy tahdidlar — Deepfake va SI',
  },
  {
    id: 'deepfake-video',
    topic: 'deepfake',
    icon: '🎬',
    scenario: 'Guruh chatida tashkilotingiz rahbarining janjalli videosi tarqalmoqda. Hamma uni yana boshqalarga ulashyapti.',
    prompt: 'Siz nima qilasiz?',
    options: [
      { id: 'a', text: 'Ulashmayman: avval ishonchliligini tekshirish kerak — bu soxta video bo‘lishi mumkin' },
      { id: 'b', text: 'Tezroq ko‘pchilikka yetkazish uchun ulashaman' },
      { id: 'c', text: 'Videoni yuklab olib, o‘zimda saqlab qo‘yaman' },
      { id: 'd', text: 'Izoh yozib, muhokamaga qo‘shilaman' },
    ],
    correct: 'a',
    explanation:
      'Deepfake real ko‘rinishdagi soxta videolar yaratib, davlat xizmatchilarini noqonuniy yoki axloqsiz harakat qilayotgandek ko‘rsatishi mumkin. Shubhali materiallarni tarqatishdan oldin tekshiring.',
    source: '3-qism · Deepfake’dan himoyalanish usullari',
  },
  {
    id: 'desk-photo',
    topic: 'data',
    icon: '📸',
    scenario:
      'Yangi ish stolingiz suratini ijtimoiy tarmoqqa qo‘ymoqchisiz. Suratda monitordagi xizmat hujjati va stikerga yozilgan parol ham ko‘rinib turibdi.',
    prompt: 'Eng to‘g‘ri qaror?',
    options: [
      { id: 'a', text: 'Bunday suratni joylamayman — xizmat ma’lumotlari va parol oshkor bo‘ladi' },
      { id: 'b', text: 'Filtr qo‘yib joylayman — baribir hech kim e’tibor bermaydi' },
      { id: 'c', text: 'Faqat «do‘stlar» uchun joylayman' },
      { id: 'd', text: 'Joylayman, keyin stikerni olib tashlayman' },
    ],
    correct: 'a',
    explanation:
      'Ijtimoiy tarmoqlar va ochiq manbalarda ma’lumot joylashtirishga ongli yondashish kerak. Maxfiy ma’lumotlarni internet saytlari va ijtimoiy tarmoqlarda e’lon qilish — xabar berilishi lozim bo‘lgan holat.',
    source: '1-qism · Shaxsga doir ma’lumotlarni himoya qilish',
  },
  {
    id: 'flashlight-app',
    topic: 'data',
    icon: '🔦',
    scenario: 'Oddiy «fonar» ilovasini o‘rnatmoqchisiz. U kontaktlaringiz, SMS’laringiz va joylashuvingizga ruxsat so‘ramoqda.',
    prompt: 'Nima qilasiz?',
    options: [
      { id: 'a', text: 'Maxfiylik siyosati va ruxsatlarni ko‘rib chiqaman — ortiqcha ruxsat so‘rasa, o‘rnatmayman' },
      { id: 'b', text: 'Hamma ruxsatlarga «Ruxsat berish»ni bosaman' },
      { id: 'c', text: 'O‘rnatib, keyinroq o‘ylab ko‘raman' },
      { id: 'd', text: 'Faqat joylashuvga ruxsat bermayman, qolgani mayli' },
    ],
    correct: 'a',
    explanation: 'Mobil ilovani o‘rnatishdan oldin uning maxfiylik siyosati bilan tanishing. Fonar uchun kontakt va SMS ruxsati — shubhali belgi.',
    source: '3-qism · Shaxsga doir ma’lumotlarni himoya qilish',
  },
  {
    id: 'prize-survey',
    topic: 'data',
    icon: '🎁',
    scenario: '«Yutuqli so‘rovnoma: iPhone yutib oling!» deb pasport seriyangiz, uy manzilingiz va karta raqamingiz so‘ralmoqda.',
    prompt: 'Qo‘llanmaga ko‘ra to‘g‘ri yondashuv?',
    options: [
      { id: 'a', text: 'Shaxsiy ma’lumotni faqat zarur hollarda va minimal darajada beraman — bunda bermayman' },
      { id: 'b', text: 'Yutish imkoniyati uchun hammasini to‘ldiraman' },
      { id: 'c', text: 'Faqat pasport seriyasini yozaman' },
      { id: 'd', text: 'Hamkasbimning ma’lumotlarini yozaman' },
    ],
    correct: 'a',
    explanation:
      'Ism, manzil, telefon, bank rekvizitlari, pasport va ID ma’lumotlari kiberjinoyatchilar uchun qimmatli. Ularni taqdim etish minimal va faqat zarur hollarda bo‘lishi kerak.',
    source: '3-qism · Shaxsga doir ma’lumotlarni himoya qilish',
  },
  {
    id: 'fake-technician',
    topic: 'social',
    icon: '🧰',
    scenario:
      'Qabulxonaga kombinezonli odam keldi: «Men provayderdanman, serverxonadagi uskunani tekshirishim kerak. Hujjatlarim mashinada qolibdi, tezroq ochib bering».',
    prompt: 'Nima qilasiz?',
    options: [
      { id: 'a', text: 'Mas’ul bo‘linma orqali tashrifni tasdiqlamaguncha kiritmayman' },
      { id: 'b', text: 'Kombinezoni bor — demak, haqiqiy, kiritaman' },
      { id: 'c', text: 'Kalitni berib, o‘zim ishimga qaytaman' },
      { id: 'd', text: 'Kirishiga ruxsat beraman, lekin 5 daqiqadan keyin tekshiraman' },
    ],
    correct: 'a',
    explanation:
      'Ijtimoiy muhandislik — maxfiy ma’lumot yoki tizimlarga kirish uchun insonlarni manipulyatsiya qilish. Bu qo‘ng‘iroq, messenjer va hatto shaxsiy uchrashuv orqali ham bo‘ladi.',
    source: '2-qism · Kiberhujumlar (Ijtimoiy muhandislik)',
  },
  {
    id: 'antivirus-firewall',
    topic: 'network',
    icon: '🧱',
    scenario: 'Hamkasbingiz so‘raydi: «Kompyuterimda antivirus bor. Firewall nima uchun kerak?»',
    prompt: 'To‘g‘ri tushuntirish qaysi?',
    options: [
      { id: 'a', text: 'Antivirus tahdidlarni aniqlab yo‘q qiladi, firewall esa tashqi tahdidlarning tarmoq va kompyuterga kirishini cheklaydi' },
      { id: 'b', text: 'Firewall — antivirusning eski nomi' },
      { id: 'c', text: 'Firewall kompyuterni sovutish uchun kerak' },
      { id: 'd', text: 'Firewall faqat internet tezligini oshiradi' },
    ],
    correct: 'a',
    explanation:
      'Antivirus virus, troyan va boshqa tahdidlarni aniqlash va bartaraf etishga xizmat qiladi, firewall esa tashqi tahdidlarning tarmoq va kompyuterlarga kirishini cheklaydi.',
    source: '1-qism · Raqamli gigiyenaning asosiy omillari',
  },
  {
    id: 'top-attack-2024',
    topic: 'facts',
    icon: '📊',
    scenario: '2024 yilda «.uz» domenidagi honeypot (tuzoq) tizimlariga 70 milliondan ortiq kiberhujum qayd etilgan.',
    prompt: 'Ular orasida eng ko‘p tarqalgan hujum turi qaysi bo‘lgan?',
    options: [
      { id: 'a', text: 'Brute force — parolni tanlab buzish (taxminan 48%)' },
      { id: 'b', text: 'DDoS-hujumlar' },
      { id: 'c', text: 'Veb-ilovalarga hujumlar (SQLi, XSS)' },
      { id: 'd', text: 'Deepfake qo‘ng‘iroqlar' },
    ],
    correct: 'a',
    explanation:
      'Qo‘llanmadagi statistikaga ko‘ra brute force (SSH, Telnet) hujumlari ~48% ni tashkil etgan. Shuning uchun uzun, murakkab parollar va 2FA juda muhim.',
    source: '1-qism · Raqamli gigiyena ahamiyati',
  },
  {
    id: 'sql-injection',
    topic: 'facts',
    icon: '🗄️',
    scenario: 'Tashkilot saytidagi qidiruv maydoniga kimdir g‘alati belgilar va buyruqlar kiritib, ma’lumotlar bazasidagi yozuvlarni ko‘rishga urinmoqda.',
    prompt: 'Bu hujum qanday ataladi?',
    options: [
      { id: 'a', text: 'SQL-in’eksiya' },
      { id: 'b', text: 'Smishing' },
      { id: 'c', text: 'Farming' },
      { id: 'd', text: 'Deepfake' },
    ],
    correct: 'a',
    explanation:
      'SQL-in’eksiya — veb-ilova kodidagi zaifliklardan foydalanib, ma’lumotlar bazasidagi ma’lumotlarni oshkor qilish yoki o‘zgartirishga qaratilgan hujum.',
    source: '2-qism · Kiberhujumlar',
  },
  {
    id: 'personal-data-law',
    topic: 'facts',
    icon: '⚖️',
    scenario: 'Hamkasbingiz shaxsga doir ma’lumotlar bilan ishlash qoidalari qaysi qonunda belgilanganini so‘rayapti.',
    prompt: 'Qo‘llanmada keltirilgan qonun qaysi?',
    options: [
      { id: 'a', text: '«Shaxsga doir ma’lumotlar to‘g‘risida»gi O‘RQ-547-son Qonun' },
      { id: 'b', text: '«Kiberxavfsizlik to‘g‘risida»gi O‘RQ-788-son Qonun' },
      { id: 'c', text: '«Davlat fuqarolik xizmati to‘g‘risida»gi O‘RQ-547-son Qonun' },
      { id: 'd', text: 'Bunday qonun yo‘q' },
    ],
    correct: 'a',
    explanation:
      'Qo‘llanmadagi normativ hujjatlar: O‘RQ-547 — «Shaxsga doir ma’lumotlar to‘g‘risida», O‘RQ-764 — «Kiberxavfsizlik to‘g‘risida», O‘RQ-788 — «Davlat fuqarolik xizmati to‘g‘risida».',
    source: 'Normativ-huquqiy hujjatlar',
  },
];
