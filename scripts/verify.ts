/**
 * Supabase sozlamalarini tekshirish: `bun run db:verify`
 * Faqat ochiq (publishable) kalit ishlatiladi — maxfiy ma’lumot kerak emas.
 * Tekshiradi: ulanish, email orqali kirish, jadvallar, RLS (begona ma’lumot ko‘rinmasligi), reyting funksiyasi.
 */
const url = process.env.VITE_SUPABASE_URL?.trim();
const key = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY)?.trim();

if (!url || !key) {
  console.error('✗ .env.local da VITE_SUPABASE_URL va VITE_SUPABASE_PUBLISHABLE_KEY bo‘lishi kerak.');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
let failed = 0;
const ok = (msg: string) => console.log(`✓ ${msg}`);
const bad = (msg: string) => {
  failed++;
  console.log(`✗ ${msg}`);
};

try {
  const res = await fetch(`${url}/auth/v1/settings`, { headers });
  const s = (await res.json()) as { external?: { email?: boolean }; disable_signup?: boolean };
  if (!res.ok) bad(`Auth: HTTP ${res.status} — URL yoki kalit noto‘g‘ri`);
  else {
    ok(`Supabase’ga ulandi (${new URL(url).host})`);
    if (s.external?.email) ok('Email orqali kirish yoqilgan');
    else bad('Email orqali kirish o‘chirilgan — Authentication → Sign In / Providers → Email');
    if (s.disable_signup) bad('Ro‘yxatdan o‘tish o‘chirilgan — yangi foydalanuvchilar kira olmaydi');
  }
} catch (e) {
  bad(`Serverga ulanib bo‘lmadi: ${(e as Error).message}`);
}

for (const table of ['profiles', 'mission_results', 'quiz_results']) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
  const body = await res.text();
  if (res.status === 404) bad(`Jadval «${table}» yo‘q — migratsiya qo‘llanmagan (bun run db:migrate)`);
  else if (!res.ok) bad(`Jadval «${table}»: HTTP ${res.status} ${body.slice(0, 120)}`);
  // Mehmon (anon) hech qanday yozuvni ko‘rmasligi kerak — RLS ishlayapti
  else if (body.trim() === '[]') ok(`Jadval «${table}» bor, RLS begona yozuvlarni yashiryapti`);
  else bad(`Jadval «${table}»: anon foydalanuvchi yozuvlarni ko‘ryapti — RLS tekshirilsin!`);
}

{
  const res = await fetch(`${url}/rest/v1/rpc/get_leaderboard`, { method: 'POST', headers, body: JSON.stringify({ limit_count: 5 }) });
  const body = await res.text();
  if (res.ok) {
    const rows = JSON.parse(body) as Record<string, unknown>[];
    const leaks = rows.some((r) => 'email' in r || 'age' in r || 'gender' in r);
    if (leaks) bad('Reyting shaxsiy ma’lumot qaytaryapti!');
    else ok(`Reyting funksiyasi ishlayapti (${rows.length} ta yozuv)`);
  } else bad(`Reyting funksiyasi: HTTP ${res.status} — migratsiya qo‘llanmagan bo‘lishi mumkin`);
}

console.log(failed === 0 ? '\n✓ Hammasi tayyor — o‘yinda kirib ko‘rishingiz mumkin.' : `\n${failed} ta muammo topildi.`);
process.exit(failed === 0 ? 0 : 1);
