import { MISSIONS } from '../src/missions/data';
import { createInitialState, missionReducer, type MissionAction } from '../src/missions/engine/missionReducer';
import type { MissionId, MissionRuntimeState } from '../src/types/models';

export const READY: MissionAction = { type: 'SCENE_READY' };
export const ACK: MissionAction = { type: 'ACK' };
export const CLOSE: MissionAction = { type: 'CLOSE_OVERLAY' };
export const act = (hotspotId: string): MissionAction => ({ type: 'ACTIVATE_HOTSPOT', hotspotId });
export const clue = (clueId: string): MissionAction => ({ type: 'FIND_CLUE', clueId });
export const choose = (decisionId: string, choiceId: string): MissionAction => ({ type: 'CHOOSE', decisionId, choiceId });

/** Har bir missiya uchun «ideal» o‘yin: barcha belgilar va faqat xavfsiz qarorlar. */
export const SAFE_SCRIPTS: Record<MissionId, MissionAction[]> = {
  'm1-phishing': [
    READY,
    act('m1-computer'),
    clue('m1-c-domain'),
    clue('m1-c-urgency'),
    clue('m1-c-greeting'),
    clue('m1-c-link'),
    clue('m1-c-attachment'),
    choose('m1-d-action', 'report'),
    ACK,
    CLOSE,
    act('m1-manager'),
    choose('m1-d-verify', 'call-internal'),
    ACK,
  ],
  'm2-suspicious-file': [
    READY,
    act('m2-usb'),
    CLOSE,
    choose('m2-d-usb', 'hand-to-it'),
    ACK,
    act('m2-it-box'),
    CLOSE,
    act('m2-computer'),
    clue('m2-c-unknown'),
    clue('m2-c-pressure'),
    clue('m2-c-extension'),
    clue('m2-c-type'),
    { type: 'OPEN_DECISION', decisionId: 'm2-d-file' },
    choose('m2-d-file', 'report'),
    ACK,
  ],
  'm3-mfa-incident': [
    READY,
    act('m3-poster'),
    CLOSE,
    act('m3-sticky'),
    CLOSE,
    act('m3-phone'),
    clue('m3-c-unrequested'),
    clue('m3-c-location'),
    choose('m3-d-push', 'deny'),
    ACK,
    clue('m3-c-caller'),
    choose('m3-d-call', 'hangup-official'),
    ACK,
    CLOSE,
    act('m3-computer'),
    choose('m3-d-report', 'submit-correct'),
    ACK,
    choose('m3-d-password', 'passphrase'),
    ACK,
  ],
  'm4-coffee-break': [
    READY,
    act('m4-computer'),
    CLOSE,
    choose('m4-d-lock', 'lock'),
    ACK,
    act('m4-qr'),
    CLOSE,
    choose('m4-d-qr', 'report'),
    ACK,
    act('m4-coffee'),
    CLOSE,
    act('m4-colleague'),
    CLOSE,
    choose('m4-d-wifi', 'guest'),
    ACK,
  ],
  'm5-social-media': [
    READY,
    act('m5-board'),
    CLOSE,
    choose('m5-d-board', 'wipe'),
    ACK,
    act('m5-colleague'),
    CLOSE,
    act('m5-phone'),
    clue('m5-c-badge'),
    clue('m5-c-screen'),
    clue('m5-c-geotag'),
    choose('m5-d-post', 'retake'),
    ACK,
    clue('m5-c-recruiter'),
    choose('m5-d-dm', 'report'),
    ACK,
    choose('m5-d-privacy', 'private'),
    ACK,
  ],
};

export function run(missionId: MissionId, actions: MissionAction[], from?: MissionRuntimeState): MissionRuntimeState {
  const mission = MISSIONS[missionId];
  return actions.reduce((s, a) => missionReducer(s, a, mission), from ?? createInitialState(missionId));
}
