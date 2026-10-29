/**
 * Supabase migratsiyalarini terminal orqali qo‘llash (Bun, qo‘shimcha paketsiz).
 *
 *   bun run db:migrate          — kutilayotgan migratsiyalarni qo‘llaydi
 *   bun run db:status           — holat (hech narsa o‘zgartirilmaydi)
 *   bun run db:migrate --dry-run
 *
 * Ikki ulanish usuli (.env.local — Bun uni o‘zi o‘qiydi; ikkalasi ham MAXFIY, VITE_ prefiksisiz!):
 *   1) SUPABASE_ACCESS_TOKEN — Personal Access Token (https://supabase.com/dashboard/account/tokens).
 *      DB paroli va IPv6 kerak emas: Supabase Management API orqali HTTPS so‘rov.
 *   2) SUPABASE_DB_URL — Postgres ulanish satri (Connect → «Session pooler»), DB paroli bilan.
 * Ikkalasi bo‘lsa — token ishlatiladi. Majburlash: --via=api yoki --via=db.
 *
 * Har bir fayl bitta tranzaksiyada qo‘llanadi va public.schema_migrations jadvalida belgilanadi —
 * qayta ishga tushirish xavfsiz.
 */
import { SQL } from 'bun';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(import.meta.dir, '..', 'supabase', 'migrations');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const statusOnly = args.includes('--status');
const via = args.find((a) => a.startsWith('--via='))?.slice('--via='.length);

interface Driver {
  label: string;
  /** SQL bajaradi va oxirgi buyruq natijasini qaytaradi */
  query<T = Record<string, unknown>>(text: string): Promise<T[]>;
  close(): Promise<void>;
}

const quote = (s: string) => `'${s.replaceAll("'", "''")}'`;

function projectRef(): string | null {
  const url = process.env.VITE_SUPABASE_URL ?? '';
  return /^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url)?.[1] ?? null;
}

function apiDriver(token: string): Driver {
  const ref = projectRef();
  if (!ref) throw new Error('VITE_SUPABASE_URL dan loyiha ref’ini aniqlab bo‘lmadi (https://<ref>.supabase.co).');
  return {
    label: `Management API (loyiha ${ref}, token ${token.slice(0, 6)}…)`,
    async query(text) {
      const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const body = await res.text();
      if (!res.ok) {
        let message = body;
        try {
          message = (JSON.parse(body) as { message?: string }).message ?? body;
        } catch {
          /* matn */
        }
        throw Object.assign(new Error(message.slice(0, 500)), { code: `HTTP ${res.status}` });
      }
      const data = body ? (JSON.parse(body) as unknown) : [];
      return (Array.isArray(data) ? data : []) as never[];
    },
    async close() {},
  };
}

function dbDriver(url: string): Driver {
  const sql = new SQL({ url, tls: true, max: 1, idleTimeout: 5, connectionTimeout: 15 });
  return {
    label: `Postgres ${url.replace(/:\/\/([^:]+):[^@]*@/, '://$1:****@')}`,
    async query(text) {
      return (await sql.unsafe(text)) as never[];
    },
    close: () => sql.close(),
  };
}

function pickDriver(): Driver {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const url = process.env.SUPABASE_DB_URL?.trim();
  if (via === 'api' || (via !== 'db' && token)) {
    if (!token) throw new Error('SUPABASE_ACCESS_TOKEN topilmadi.');
    return apiDriver(token);
  }
  if (url) return dbDriver(url);
  console.error(
    [
      '✗ Ulanish ma’lumoti topilmadi. .env.local ga quyidagilardan BIRINI qo‘shing:',
      '',
      '  1) Tavsiya (DB paroli kerak emas):',
      '     https://supabase.com/dashboard/account/tokens → «Generate new token» → nusxalang',
      '     SUPABASE_ACCESS_TOKEN=sbp_...',
      '',
      '  2) Postgres (DB paroli bilan): Supabase → Connect → «Session pooler»',
      '     SUPABASE_DB_URL=postgresql://postgres.<ref>:<parol>@aws-0-<region>.pooler.supabase.com:5432/postgres',
      '',
      '  Ikkalasi ham maxfiy: VITE_ prefiksisiz yozing va hech kimga yubormang.',
    ].join('\n'),
  );
  process.exit(1);
}

function explain(err: unknown, driver: Driver | null): void {
  const e = err as { message?: string; code?: string };
  const msg = e.message ?? String(err);
  console.error(`✗ Xato${e.code ? ` (${e.code})` : ''}: ${msg}`);
  if (/HTTP 401|HTTP 403/.test(e.code ?? '')) {
    console.error('  → Token noto‘g‘ri, muddati o‘tgan yoki bu loyihaga ruxsati yo‘q. Yangi token yarating: https://supabase.com/dashboard/account/tokens');
  } else if (/password authentication failed/i.test(msg)) {
    console.error('  → DB paroli noto‘g‘ri (bu akkaunt paroli emas). Tezroq yo‘l: SUPABASE_ACCESS_TOKEN dan foydalaning.');
  } else if (/CONNECTION_REFUSED|ENOTFOUND|not known/i.test(msg) && driver?.label.includes('@db.')) {
    console.error('  → «db.<ref>.supabase.co» faqat IPv6 orqali ishlaydi. «Session pooler» satri yoki SUPABASE_ACCESS_TOKEN dan foydalaning.');
  }
  console.error('  Baza o‘zgarmadi (xato bergan migratsiya to‘liq bekor qilindi).');
}

let driver: Driver | null = null;
try {
  driver = pickDriver();
  await driver.query('select 1');
  console.log(`✓ Ulandi: ${driver.label}`);

  await driver.query(`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
    alter table public.schema_migrations enable row level security;
  `);

  const applied = new Set((await driver.query<{ name: string }>('select name from public.schema_migrations')).map((r) => r.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const pending = files.filter((f) => !applied.has(f));

  for (const f of files) console.log(`  ${applied.has(f) ? '✓ qo‘llangan ' : '• kutilmoqda '} ${f}`);

  if (pending.length === 0) {
    console.log('✓ Hamma migratsiyalar qo‘llangan.');
  } else if (statusOnly) {
    console.log(`${pending.length} ta migratsiya kutilmoqda — qo‘llash uchun: bun run db:migrate`);
  } else if (dryRun) {
    console.log(`(dry-run) ${pending.length} ta migratsiya qo‘llanadi. Hech narsa o‘zgartirilmadi.`);
  } else {
    for (const name of pending) {
      const body = await Bun.file(join(MIGRATIONS_DIR, name)).text();
      process.stdout.write(`→ ${name} … `);
      // Bitta so‘rovda tranzaksiya: xato bo‘lsa, hammasi bekor qilinadi
      await driver.query(`begin;\n${body}\ninsert into public.schema_migrations (name) values (${quote(name)});\ncommit;`);
      console.log('✓');
    }
    // REST API yangi jadvallarni darhol ko‘rishi uchun
    await driver.query(`notify pgrst, 'reload schema';`);
    console.log(`✓ ${pending.length} ta migratsiya qo‘llandi. Tekshirish: bun run db:verify`);
  }
} catch (err) {
  explain(err, driver);
  process.exitCode = 1;
} finally {
  await driver?.close();
}
