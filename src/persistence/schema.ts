import { z } from 'zod';
import { DEFAULT_AUDIO_SETTINGS } from '../game/audio/audioConfig';
import { clampVolume } from '../game/audio/audioSettings';

const stars = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
const outcome = z.enum(['safe', 'risky', 'critical']);

export const missionResultSchema = z.object({
  missionId: z.string(),
  outcome: z.enum(['passed', 'failed']),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  stars,
  cluesFound: z.array(z.string()),
  decisions: z.array(
    z.object({
      decisionId: z.string(),
      firstChoiceId: z.string(),
      firstOutcome: outcome,
      finalChoiceId: z.string(),
      attempts: z.number().int().min(1),
    }),
  ),
  finishedAt: z.string(),
});

export const missionProgressSchema = z.object({
  status: z.enum(['locked', 'available', 'completed']),
  attempts: z.number().int().min(0),
  bestScore: z.number().min(0),
  bestStars: stars,
  lastResult: missionResultSchema.optional(),
});

/** Balandlik: 0–1 ga keltiriladi; son bo‘lmasa — standart */
const volume = (fallback: number) => z.number().transform(clampVolume).catch(fallback);

export const settingsSchema = z.object({
  textScale: z.union([z.literal(1), z.literal(1.25), z.literal(1.5)]),
  reducedMotion: z.enum(['system', 'on', 'off']),
  highContrast: z.boolean(),
  listMode: z.boolean(),
  sound: z.boolean(),
  voice: z.boolean().optional(),
  music: z.boolean().optional(),
  fullscreen: z.boolean().optional(),
  // Buzilgan audio sozlamalari butun progressni o‘chirib yubormasligi uchun: noto‘g‘ri maydon — standart qiymat,
  // butunlay noto‘g‘ri obyekt — undefined (eski belgilardan hisoblanadi)
  audio: z
    .object({
      master: volume(DEFAULT_AUDIO_SETTINGS.master),
      music: volume(DEFAULT_AUDIO_SETTINGS.music),
      sfx: volume(DEFAULT_AUDIO_SETTINGS.sfx),
      ambience: volume(DEFAULT_AUDIO_SETTINGS.ambience),
      muted: z.boolean().catch(false),
    })
    .optional()
    .catch(undefined),
});

/** missions — qisman: noma’lum yoki yetishmayotgan yozuvlar normalize() da tiklanadi. */
export const progressSchema = z.object({
  version: z.literal(1),
  selectedCharacter: z.enum(['bek', 'guli']).nullable(),
  missions: z.record(z.string(), missionProgressSchema),
  settings: settingsSchema,
  quizBest: z.number().min(0).optional(),
  updatedAt: z.string(),
});
