/**
 * Eski formatdagi progressni joriy versiyaga o‘tkazadi.
 * Hozircha faqat 1-versiya bor; yangi versiyada shu yerga qadam qo‘shiladi.
 */
export function migrate(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const data = raw as { version?: unknown };
  if (data.version === 1) return data;
  return raw; // noma’lum versiya — sxema tekshiruvi rad etadi
}
