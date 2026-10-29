import { ui } from '../content/uz/ui';
import type { HotspotVisualState, InteractiveObject, Rect } from '../types/models';
import styles from './ui.module.css';

interface HotspotOverlayProps {
  hotspots: InteractiveObject[];
  states: Record<string, HotspotVisualState>;
  rects: Record<string, Rect>;
  nearId: string | null;
  onActivate(id: string): void;
}

/** Canvas ustidagi shaffof DOM tugmalar: klaviatura fokusi, screen reader va sichqoncha uchun. */
export function HotspotOverlay({ hotspots, states, rects, nearId, onActivate }: HotspotOverlayProps) {
  return (
    <div className={styles.hotspotLayer}>
      {hotspots.map((h) => {
        const rect = rects[h.id];
        const state = states[h.id] ?? 'idle';
        if (!rect || state === 'hidden') return null;
        const pad = 6;
        return (
          <button
            key={h.id}
            type="button"
            className={[styles.hotspotButton, nearId === h.id ? styles.hotspotNear : ''].join(' ')}
            style={{
              left: rect.x - pad,
              top: rect.y - pad,
              width: Math.max(rect.width + pad * 2, 44),
              height: Math.max(rect.height + pad * 2, 44),
            }}
            aria-label={h.ariaLabel + (state === 'done' ? ui.game.doneSuffix : '')}
            aria-disabled={state === 'disabled' || undefined}
            onClick={() => onActivate(h.id)}
          >
            <span className={styles.hotspotLabel} aria-hidden="true">
              {state === 'done' ? '✔ ' : state === 'disabled' ? '🔒 ' : ''}
              {h.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function HotspotList({ hotspots, states, onActivate, forceVisible }: Omit<HotspotOverlayProps, 'rects' | 'nearId'> & { forceVisible: boolean }) {
  return (
    <nav className={[styles.hotspotList, forceVisible ? styles.hotspotListForced : ''].join(' ')} aria-label={ui.game.objectsList}>
      <h2 className={styles.listHeading}>{ui.game.objectsList}</h2>
      <ul>
        {hotspots.map((h) => {
          const state = states[h.id] ?? 'idle';
          if (state === 'hidden') return null;
          return (
            <li key={h.id}>
              <button type="button" className={styles.listButton} aria-disabled={state === 'disabled' || undefined} onClick={() => onActivate(h.id)}>
                <span aria-hidden="true">{state === 'done' ? '✔' : state === 'disabled' ? '🔒' : '•'}</span> {h.ariaLabel}
                {state === 'done' && <span className="visually-hidden">{ui.game.doneSuffix}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
