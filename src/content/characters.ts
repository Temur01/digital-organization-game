import type { Character, CharacterId } from '../types/models';

export const CHARACTERS: Record<CharacterId, Character> = {
  bek: {
    id: 'bek',
    name: 'Bek',
    shortDescription: 'Yangi xodim. Diqqatli va savolga tez javob izlaydi.',
    look: {
      skin: 0xd9a77e,
      skinShade: 0xb9875f,
      hair: 0x3b2a20,
      hairStyle: 'short',
      top: 0x7fb3e0,
      bottom: 0x2c3e66,
      shoes: 0x5a3b28,
      accent: 'lanyard',
    },
  },
  guli: {
    id: 'guli',
    name: 'Guli',
    shortDescription: 'Yangi xodim. Tartibli va har narsani tekshirib ko‘radi.',
    look: {
      skin: 0xe1b48c,
      skinShade: 0xc29470,
      hair: 0x2e2019,
      hairStyle: 'braid',
      top: 0x2a9d8f,
      topInner: 0xffffff,
      bottom: 0x4a4e5a,
      shoes: 0x2b2b2b,
      accent: 'pocket',
    },
  },
};

export const CHARACTER_IDS: CharacterId[] = ['bek', 'guli'];

/** Atlas (ikat) naqshi ranglari — milliy aksent */
export const IKAT_COLORS = [0xd1495b, 0xf2b134, 0x2a9d8f, 0x3d5a80];

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
