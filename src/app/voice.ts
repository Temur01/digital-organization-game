/**
 * Dialoglarni ovozli o‘qish — brauzerning Web Speech API (speechSynthesis), kutubxonasiz.
 * Maxfiylik: faqat kompyuterdagi LOKAL ovozlar ishlatiladi (voice.localService).
 * Chrome’ning «Google …» ovozlari matnni serverga yuboradi — ular tanlanmaydi.
 * O‘zbekcha ovoz kam tarqalgan, shuning uchun tartib: uz → tr → az → kk (talaffuzi yaqin turkiy tillar),
 * ular ham bo‘lmasa — istalgan lokal ovoz (jim qolgandan ko‘ra yaxshiroq).
 */
export type VoiceKind = 'male' | 'female' | 'neutral';

/** Hozircha o‘chirilgan: qurilmalarda o‘zbekcha ovoz yo‘q, turkcha talaffuz esa mos emas */
export const VOICE_ENABLED = false;

const LANG_PRIORITY = ['uz', 'tr', 'az', 'kk'];
const PITCH: Record<VoiceKind, number> = { male: 0.78, female: 1.18, neutral: 1 };

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices: SpeechSynthesisVoice[] = [];
let pendingTimer: number | undefined;
const listeners = new Set<() => void>();

function refresh() {
  voices = synth?.getVoices() ?? [];
  listeners.forEach((l) => l());
}
if (synth) {
  refresh();
  synth.addEventListener?.('voiceschanged', refresh);
}

/** Ovozlar ro‘yxati o‘zgarganda xabar beradi (Chrome ularni asinxron yuklaydi) */
export function subscribeVoices(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Ovozli o‘qish mumkinmi (brauzer qo‘llaydi va mos lokal ovoz bor) */
export function voiceAvailable(): boolean {
  return VOICE_ENABLED && synth !== null && pickVoice() !== null;
}

/** Tanlanadigan ovoz nomi (sozlamalarda ko‘rsatish uchun) */
export function voiceLabel(): string | null {
  if (!VOICE_ENABLED) return null;
  const v = pickVoice();
  return v ? `${v.name} (${v.lang})` : null;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const local = voices.filter((v) => v.localService);
  for (const lang of LANG_PRIORITY) {
    const match = local.find((v) => v.lang.toLowerCase().startsWith(lang));
    if (match) return match;
  }
  return local.find((v) => v.default) ?? local[0] ?? null;
}

/** Ovoz uchun matnni tozalash: emoji, qo‘shtirnoq va maxsus belgilar o‘qilmasin */
export function speakableText(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/[«»"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speak(text: string, kind: VoiceKind = 'neutral'): void {
  if (!VOICE_ENABLED || !synth) return;
  const voice = pickVoice();
  const clean = speakableText(text);
  if (!voice || !clean) return;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(clean);
  u.voice = voice;
  u.lang = voice.lang;
  u.pitch = PITCH[kind];
  u.rate = 1;
  u.volume = 1;
  // Chrome: cancel()dan keyin darhol speak() ba’zan jim qoladi — biroz kechiktiramiz
  pendingTimer = window.setTimeout(() => synth.speak(u), 60);
}

export function stopSpeaking(): void {
  window.clearTimeout(pendingTimer);
  synth?.cancel();
}
