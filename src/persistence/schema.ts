import { z } from 'zod';

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

export const settingsSchema = z.object({
  textScale: z.union([z.literal(1), z.literal(1.25), z.literal(1.5)]),
  reducedMotion: z.enum(['system', 'on', 'off']),
  highContrast: z.boolean(),
  listMode: z.boolean(),
  sound: z.boolean(),
});

/** missions — qisman: noma’lum yoki yetishmayotgan yozuvlar normalize() da tiklanadi. */
export const progressSchema = z.object({
  version: z.literal(1),
  selectedCharacter: z.enum(['bek', 'guli']).nullable(),
  missions: z.record(z.string(), missionProgressSchema),
  settings: settingsSchema,
  updatedAt: z.string(),
});
