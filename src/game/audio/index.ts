import { AudioManager } from './AudioManager';

/** Ilova bo‘yicha yagona audio boshqaruvchi (komponent render qilinganda yangi obyekt yaratilmaydi) */
export const audioManager = new AudioManager({
  createContext: () => new AudioContext({ latencyHint: 'interactive' }),
  fetchFn: (url) => fetch(url),
  baseUrl: import.meta.env.BASE_URL,
  now: () => performance.now(),
  warn: (message) => console.warn(message),
});

let installed = 0;

/**
 * Brauzer qoidalari: AudioContext faqat foydalanuvchi harakatidan keyin ishga tushadi.
 * Har bir bosish/tugma — unlock (to‘xtatilgan kontekstni ham uyg‘otadi); yorliq yashirilsa — ovoz to‘xtaydi.
 * StrictMode’da ikki marta o‘rnatilsa ham tinglovchilar bitta qoladi.
 */
export function installAudioLifecycle(): () => void {
  installed++;
  if (installed > 1) return () => void installed--;
  const unlock = () => audioManager.unlock();
  const onVisibility = () => audioManager.setPageHidden(document.hidden);
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    installed--;
    window.removeEventListener('pointerdown', unlock, { capture: true });
    window.removeEventListener('keydown', unlock, { capture: true });
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export { AudioManager } from './AudioManager';
export type * from './audioTypes';
