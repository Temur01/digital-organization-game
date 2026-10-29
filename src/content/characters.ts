import bekArt from '../assets/characters/bek.png';
import bekWalk from '../assets/characters/bek-walk.png';
import colleagueMan from '../assets/characters/colleague-man.png';
import colleagueWoman from '../assets/characters/colleague-woman.png';
import guliArt from '../assets/characters/guli.png';
import guliWalk from '../assets/characters/guli-walk.png';
import type { Character, CharacterId } from '../types/models';

export const CHARACTERS: Record<CharacterId, Character> = {
  bek: {
    id: 'bek',
    name: 'Temur',
    role: 'AKT bo‘limi dasturchi',
    shortDescription: 'Ishga birinchi kun. Hamma bilan tez til topishadi, lekin har bir xatni bosishdan oldin o‘ylab ko‘rishni o‘rganmoqda.',
    traits: ['Tezkor', 'Muloqotchan', 'Optimist'],
    quote: '«Shubhalansang — tekshir!»',
    art: bekArt,
    accent: '#3dd6c6',
    faceX: 0.62,
    walkSheet: bekWalk,
    look: {
      skin: 0xe8b48c,
      skinShade: 0xc8946c,
      hair: 0x1c1717,
      hairStyle: 'short',
      top: 0xf3ece2,
      bottom: 0x24304f,
      shoes: 0x1b1b1b,
      accent: 'lanyard',
    },
  },
  guli: {
    id: 'guli',
    name: 'Guli',
    role: 'Moliya bo‘limi tahlilchisi',
    shortDescription: 'Raqamlar va tartibni yaxshi ko‘radi. Har bir tafsilotni ko‘zdan kechirmaguncha hech narsaga ishonmaydi.',
    traits: ['Diqqatli', 'Tartibli', 'Qat’iyatli'],
    quote: '«Tafsilotda yashiringan xavfni topaman.»',
    art: guliArt,
    accent: '#a78bfa',
    faceX: 0.34,
    walkSheet: guliWalk,
    look: {
      skin: 0xefc4a0,
      skinShade: 0xcfa07c,
      hair: 0x2a1d17,
      hairStyle: 'bun',
      top: 0x1f6b6b,
      topInner: 0xf1e6d6,
      bottom: 0x24304f,
      shoes: 0x1f2a44,
      accent: 'pocket',
    },
  },
};

/** NPC illyustratsiyalari (src/assets/collegue.png dan kesilgan) */
/** Qahramon ovozi (dialoglarni ovozli o‘qish) */
export const CHARACTER_VOICE = { bek: 'male', guli: 'female' } as const;

/** Xaritada hotspoti yo‘q, lekin dialogda gapiradigan jamoadoshlar ovozi */
export const SPEAKER_VOICE: Record<string, 'male' | 'female'> = { Rahbar: 'male', 'IT bo‘limi': 'male' };

export const NPC_ART = {
  man: { art: colleagueMan, faceX: 0.62 },
  woman: { art: colleagueWoman, faceX: 0.42 },
} as const;

export const CHARACTER_IDS: CharacterId[] = ['bek', 'guli'];

/** Profilda jins ko‘rsatilgan bo‘lsa — qahramon shunga qarab belgilanadi va o‘zgartirilmaydi */
export function characterForGender(gender: 'male' | 'female' | null | undefined): CharacterId | null {
  return gender === 'male' ? 'bek' : gender === 'female' ? 'guli' : null;
}

/** Atlas (ikat) naqshi ranglari — milliy aksent */
export const IKAT_COLORS = [0xd1495b, 0xf2b134, 0x2a9d8f, 0x3d5a80];

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
