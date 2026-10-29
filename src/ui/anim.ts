import confetti from 'canvas-confetti';
import { useEffect, useRef, useState } from 'react';

/** App.tsx <html data-reduced-motion> ni sozlaydi — hook bo‘lmagan joylar uchun */
export function prefersReducedMotion(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.reducedMotion === 'true';
}

/** Son silliq o‘sib boradi (ball, natija). Harakat kamaytirilganda darhol. */
export function useCountUp(value: number, duration = 700, initial = value): number {
  const [shown, setShown] = useState(initial);
  const from = useRef(initial);
  useEffect(() => {
    const start = from.current;
    if (start === value || prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);
  return shown;
}

const BURST_COLORS = ['#f2b134', '#2a9d8f', '#d1495b', '#3d5a80', '#ffffff'];

/** Element atrofida uchqunlar (DOM, Web Animations API). Kutubxonasiz va yengil. */
export function burstAt(el: Element | null, count = 14): void {
  if (!el || prefersReducedMotion()) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    const size = 5 + Math.random() * 5;
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 30 + Math.random() * 40;
    Object.assign(s.style, {
      position: 'fixed',
      left: `${cx}px`,
      top: `${cy}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: i % 2 ? '50%' : '2px',
      background: BURST_COLORS[i % BURST_COLORS.length],
      pointerEvents: 'none',
      zIndex: '400',
    });
    s.setAttribute('aria-hidden', 'true');
    document.body.appendChild(s);
    if (typeof s.animate !== 'function') {
      s.remove();
      continue;
    }
    const anim = s.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0.2) rotate(${180 + Math.random() * 180}deg)`,
          opacity: 0,
        },
      ],
      { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)' },
    );
    anim.onfinish = () => s.remove();
  }
}

/** Konfetti: «small» — to‘g‘ri qaror, «big» — missiya bajarildi. */
export function celebrate(size: 'small' | 'big', origin?: { x: number; y: number }): void {
  if (prefersReducedMotion()) return;
  try {
    const base = { zIndex: 400, disableForReducedMotion: true, colors: BURST_COLORS };
    if (size === 'small') {
      void confetti({ ...base, particleCount: 50, spread: 70, startVelocity: 32, scalar: 0.8, origin: origin ?? { x: 0.5, y: 0.45 } });
      return;
    }
    const end = Date.now() + 900;
    const frame = () => {
      void confetti({ ...base, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
      void confetti({ ...base, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    void confetti({ ...base, particleCount: 120, spread: 100, startVelocity: 40, origin: { x: 0.5, y: 0.35 } });
  } catch {
    /* konfetti ixtiyoriy */
  }
}

/** Element markazini ekran ulushida qaytaradi (konfetti uchun) */
export function originOf(el: Element | null): { x: number; y: number } | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
}
