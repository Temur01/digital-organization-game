import { useEffect, useState } from 'react';

/**
 * To‘liq ekran rejimi (Fullscreen API). Brauzer uni faqat foydalanuvchi harakati (bosish) ichida ruxsat beradi —
 * shuning uchun enterFullscreen() «Boshlash» tugmasining onClick’ida sinxron chaqiriladi.
 * Safari uchun webkit prefiksi ham qo‘llab-quvvatlanadi.
 */
type WebkitDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const doc = () => document as WebkitDocument;

export const fullscreenSupported = (): boolean =>
  typeof document !== 'undefined' && (document.fullscreenEnabled || typeof (document.documentElement as WebkitElement).webkitRequestFullscreen === 'function');

export const isFullscreen = (): boolean => !!(doc().fullscreenElement ?? doc().webkitFullscreenElement);

export async function enterFullscreen(): Promise<void> {
  if (!fullscreenSupported() || isFullscreen()) return;
  const el = document.documentElement as WebkitElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else await el.webkitRequestFullscreen?.();
  } catch {
    /* foydalanuvchi yoki brauzer rad etdi — o‘yin oddiy oynada davom etadi */
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen()) return;
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else await doc().webkitExitFullscreen?.();
  } catch {
    /* e’tiborsiz */
  }
}

/** Joriy holat (Esc bilan chiqilganda ham yangilanadi) va almashtirish funksiyasi */
export function useFullscreen(): [active: boolean, toggle: () => void] {
  const [active, setActive] = useState(isFullscreen);
  useEffect(() => {
    const onChange = () => setActive(isFullscreen());
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);
  return [active, () => void (isFullscreen() ? exitFullscreen() : enterFullscreen())];
}
