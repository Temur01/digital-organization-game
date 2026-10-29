import { hex, IKAT_COLORS } from '../content/characters';
import type { CharacterLook } from '../types/models';

/** Personaj portreti (SVG) — sahnadagi spraytning soddalashtirilgan versiyasi. */
export function CharacterPortrait({ look, size = 160 }: { look: CharacterLook; size?: number }) {
  const ikat = IKAT_COLORS.map(hex);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="48" fill="var(--color-surface-alt)" />
      {look.hairStyle === 'braid' && <rect x="62" y="38" width="9" height="40" rx="4.5" fill={hex(look.hair)} />}
      <path d="M20 100 Q20 66 50 64 Q80 66 80 100 Z" fill={hex(look.top)} />
      {look.topInner !== undefined && <path d="M42 65 L58 65 L50 80 Z" fill={hex(look.topInner)} />}
      {look.accent === 'lanyard' && (
        <g>
          <path d="M41 66 L46 86" stroke={ikat[0]} strokeWidth="3" strokeDasharray="4 3" />
          <path d="M59 66 L54 86" stroke={ikat[1]} strokeWidth="3" strokeDasharray="4 3" />
          <rect x="43" y="84" width="14" height="10" rx="1.5" fill="#fff" />
          <rect x="43" y="84" width="14" height="3" fill={ikat[2]} />
        </g>
      )}
      {look.accent === 'pocket' && (
        <g>
          <path d="M60 80 L72 80 L66 72 Z" fill={ikat[0]} />
          <path d="M62 80 L70 80 L66 75 Z" fill={ikat[1]} />
          <rect x="30" y="80" width="12" height="9" rx="1.5" fill="#fff" />
          <rect x="30" y="80" width="12" height="3" fill={ikat[3]} />
        </g>
      )}
      <rect x="45" y="56" width="10" height="10" fill={hex(look.skinShade)} />
      <circle cx="50" cy="38" r="21" fill={hex(look.hair)} />
      {look.hairStyle === 'bun' && <circle cx="50" cy="15" r="9" fill={hex(look.hair)} />}
      <ellipse cx="50" cy="44" rx="17" ry="16" fill={hex(look.skin)} />
      {look.hairStyle === 'short' && <path d="M31 38 Q44 26 69 36 L69 28 Q50 14 32 28 Z" fill={hex(look.hair)} />}
      {look.hairStyle !== 'short' && <path d="M31 40 Q50 26 69 40 L68 28 Q50 16 32 28 Z" fill={hex(look.hair)} />}
      {look.hairStyle === 'braid' && <circle cx="66.5" cy="78" r="4" fill={ikat[0]} />}
      <circle cx="43" cy="45" r="2.2" fill="#2b2b2b" />
      <circle cx="57" cy="45" r="2.2" fill="#2b2b2b" />
      <path d="M45 53 Q50 56 55 53" stroke="#9a5b4a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
