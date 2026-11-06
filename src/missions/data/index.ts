import type { Mission, MissionId } from '../../types/models';
import { m1Phishing } from './m1-phishing';
import { m2SuspiciousFile } from './m2-suspicious-file';
import { m3MfaIncident } from './m3-mfa-incident';
import { m4CoffeeBreak } from './m4-coffee-break';
import { m5SocialMedia } from './m5-social-media';
import { m6CeoFraud } from './m6-ceo-fraud';
import { m7Ransomware } from './m7-ransomware';
import { m8RemoteCafe } from './m8-remote-cafe';

export const MISSION_LIST: Mission[] = [m1Phishing, m2SuspiciousFile, m3MfaIncident, m4CoffeeBreak, m5SocialMedia, m6CeoFraud, m7Ransomware, m8RemoteCafe].sort((a, b) => a.order - b.order);

export const MISSIONS: Record<MissionId, Mission> = {
  'm1-phishing': m1Phishing,
  'm2-suspicious-file': m2SuspiciousFile,
  'm3-mfa-incident': m3MfaIncident,
  'm4-coffee-break': m4CoffeeBreak,
  'm5-social-media': m5SocialMedia,
  'm6-ceo-fraud': m6CeoFraud,
  'm7-ransomware': m7Ransomware,
  'm8-remote-cafe': m8RemoteCafe,
};

export const MISSION_IDS: MissionId[] = MISSION_LIST.map((m) => m.id);
