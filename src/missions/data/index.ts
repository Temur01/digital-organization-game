import type { Mission, MissionId } from '../../types/models';
import { m1Phishing } from './m1-phishing';
import { m2SuspiciousFile } from './m2-suspicious-file';
import { m3MfaIncident } from './m3-mfa-incident';
import { m4CoffeeBreak } from './m4-coffee-break';
import { m5SocialMedia } from './m5-social-media';

export const MISSION_LIST: Mission[] = [m1Phishing, m2SuspiciousFile, m3MfaIncident, m4CoffeeBreak, m5SocialMedia].sort((a, b) => a.order - b.order);

export const MISSIONS: Record<MissionId, Mission> = {
  'm1-phishing': m1Phishing,
  'm2-suspicious-file': m2SuspiciousFile,
  'm3-mfa-incident': m3MfaIncident,
  'm4-coffee-break': m4CoffeeBreak,
  'm5-social-media': m5SocialMedia,
};

export const MISSION_IDS: MissionId[] = MISSION_LIST.map((m) => m.id);
