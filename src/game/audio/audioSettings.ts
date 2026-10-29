import { DEFAULT_AUDIO_SETTINGS } from './audioConfig';
import type { AudioBus, AudioSettings } from './audioTypes';

/** 0–1 oralig‘iga keltiradi; son bo‘lmagan qiymat — 0 */
export function clampVolume(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.min(1, Math.max(0, n));
}

/** Shina uchun yakuniy balandlik: master × toifa (mute — 0). ui va footsteps — «Effektlar» slayderiga bo‘ysunadi. */
export function busVolume(settings: AudioSettings, bus: AudioBus): number {
  if (settings.muted) return 0;
  const master = clampVolume(settings.master);
  switch (bus) {
    case 'music':
      return master * clampVolume(settings.music);
    case 'ambience':
    case 'world':
      return master * clampVolume(settings.ambience);
    default:
      return master * clampVolume(settings.sfx);
  }
}

/** Saqlangan sozlamalardan yakuniy audio sozlamalari. Eski progress (faqat `sound`/`music` belgilari) ham qo‘llab-quvvatlanadi. */
export function resolveAudioSettings(settings: { audio?: Partial<AudioSettings>; sound?: boolean; music?: boolean }): AudioSettings {
  const a = settings.audio;
  if (a) {
    return {
      master: clampVolume(a.master ?? DEFAULT_AUDIO_SETTINGS.master),
      music: clampVolume(a.music ?? DEFAULT_AUDIO_SETTINGS.music),
      sfx: clampVolume(a.sfx ?? DEFAULT_AUDIO_SETTINGS.sfx),
      ambience: clampVolume(a.ambience ?? DEFAULT_AUDIO_SETTINGS.ambience),
      muted: a.muted ?? false,
    };
  }
  // Eski sozlamalar: «Tovush effektlari» o‘chirilgan bo‘lsa — ovozsiz; «Fon musiqasi» o‘chirilgan bo‘lsa — musiqa 0
  return {
    ...DEFAULT_AUDIO_SETTINGS,
    muted: settings.sound === false,
    music: settings.music === false ? 0 : DEFAULT_AUDIO_SETTINGS.music,
  };
}
