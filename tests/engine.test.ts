import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/missions/data';
import { buildResult, createInitialState, missionReducer } from '../src/missions/engine/missionReducer';
import { maxScore } from '../src/missions/engine/scoring';
import type { MissionId } from '../src/types/models';
import { ACK, CLOSE, READY, SAFE_SCRIPTS, act, choose, clue, run } from './helpers';

const IDS = Object.keys(SAFE_SCRIPTS) as MissionId[];

describe('missiya dvigateli', () => {
  it.each(IDS)('%s — ideal o‘yin: bajariladi, maksimal ball, 3 yulduz', (id) => {
    const state = run(id, SAFE_SCRIPTS[id]);
    expect(state.phase).toBe('completed');
    const result = buildResult(state, MISSIONS[id]);
    expect(result.outcome).toBe('passed');
    expect(result.score).toBe(maxScore(MISSIONS[id]));
    expect(result.stars).toBe(3);
  });

  it('xavfli tanlov: tushuntirish, keyin shu qarorga qaytish; qayta tanlangan xavfsiz javob uchun ball yo‘q', () => {
    let s = run('m1-phishing', [READY, act('m1-computer'), choose('m1-d-action', 'delete')]);
    expect(s.phase).toBe('feedback');
    s = run('m1-phishing', [ACK], s);
    expect(s.phase).toBe('interacting');
    expect(s.activeOverlay).toEqual({ type: 'sim', app: 'email' });
    s = run('m1-phishing', [choose('m1-d-action', 'report'), ACK], s);
    expect(s.score).toBe(0);
    expect(s.decisionLog['m1-d-action']).toMatchObject({ firstChoiceId: 'delete', firstOutcome: 'risky', finalChoiceId: 'report', attempts: 2 });
  });

  it('jiddiy xato: oqibat ekrani, keyin missiya muvaffaqiyatsiz', () => {
    let s = run('m1-phishing', [READY, act('m1-computer'), choose('m1-d-action', 'click-link'), ACK]);
    expect(s.phase).toBe('consequence');
    s = run('m1-phishing', [ACK], s);
    expect(s.phase).toBe('failed');
    const result = buildResult(s, MISSIONS['m1-phishing']);
    expect(result.outcome).toBe('failed');
    expect(result.stars).toBe(0);
  });

  it('belgilar takror hisoblanmaydi', () => {
    const s = run('m1-phishing', [READY, act('m1-computer'), clue('m1-c-domain'), clue('m1-c-domain'), clue('noma’lum')]);
    expect(s.cluesFound).toEqual(['m1-c-domain']);
    expect(s.score).toBe(5);
  });

  it('o‘chirilgan (disabled) hotspot faollashmaydi', () => {
    const s = run('m1-phishing', [READY, act('m1-manager')]);
    expect(s.phase).toBe('exploring');
    expect(s.activeOverlay).toBeNull();
  });

  it('CHOOSE faqat qaror/interaksiya fazasida; ikki marta bosish e’tiborsiz qoldiriladi', () => {
    const exploring = run('m1-phishing', [READY, choose('m1-d-action', 'report')]);
    expect(exploring.phase).toBe('exploring');
    const once = run('m1-phishing', [READY, act('m1-computer'), choose('m1-d-action', 'report')]);
    const twice = run('m1-phishing', [choose('m1-d-action', 'delete')], once);
    expect(twice).toBe(once);
  });

  it('dialogdan keyin qaror ochiladi (M2 fleshka) va effektlar qo‘llanadi', () => {
    const s = run('m2-suspicious-file', [READY, act('m2-usb'), CLOSE]);
    expect(s.phase).toBe('deciding');
    expect(s.cluesFound).toContain('m2-c-label');
    const after = run('m2-suspicious-file', [choose('m2-d-usb', 'hand-to-it'), ACK], s);
    expect(after.flags).toContain('carryingUsb');
    expect(after.phase).toBe('exploring');
  });

  it('sim ichidan ochilgan qaror xavfsiz hal qilingach sim-oynaga qaytadi', () => {
    const s = run('m2-suspicious-file', [READY, act('m2-computer'), { type: 'OPEN_DECISION', decisionId: 'm2-d-file' }]);
    expect(s.activeOverlay).toMatchObject({ type: 'decision', returnTo: { type: 'sim', app: 'workstation' } });
    const after = run('m2-suspicious-file', [choose('m2-d-file', 'report'), ACK], s);
    expect(after.phase).toBe('interacting');
    expect(after.activeOverlay).toEqual({ type: 'sim', app: 'workstation' });
  });

  it('pauza va davom etish fazani tiklaydi; RESTART boshlang‘ich holatga qaytaradi', () => {
    const s = run('m1-phishing', [READY, act('m1-computer'), { type: 'PAUSE' }]);
    expect(s.phase).toBe('paused');
    expect(run('m1-phishing', [{ type: 'RESUME' }], s).phase).toBe('interacting');
    expect(run('m1-phishing', [{ type: 'RESTART' }], s)).toEqual(createInitialState('m1-phishing'));
  });

  it('yulduzlar: xatoli, lekin ≥60 % ball — 2 yulduz; kam ball — 1 yulduz', () => {
    const m3 = MISSIONS['m3-mfa-incident'];
    // Bitta xavfli tanlov (parol), qolgani ideal: 30 + 25 = 55 / 65 ≈ 85 %
    const script = SAFE_SCRIPTS['m3-mfa-incident'];
    const idx = script.findIndex((a) => a.type === 'CHOOSE' && a.decisionId === 'm3-d-password');
    const withRisky = [...script.slice(0, idx), choose('m3-d-password', 'variant'), ACK, ...script.slice(idx)];
    const two = buildResult(run('m3-mfa-incident', withRisky), m3);
    expect(two.outcome).toBe('passed');
    expect(two.stars).toBe(2);

    // Belgilarsiz va hammasi birinchi urinishda xavfli
    const minimal = [
      READY, act('m3-phone'),
      choose('m3-d-push', 'ignore'), ACK, choose('m3-d-push', 'deny'), ACK,
      choose('m3-d-call', 'callback-given'), ACK, choose('m3-d-call', 'hangup-official'), ACK, CLOSE,
      act('m3-computer'),
      choose('m3-d-report', 'submit-wrong'), ACK, choose('m3-d-report', 'submit-correct'), ACK,
      choose('m3-d-password', 'reuse'), ACK, choose('m3-d-password', 'passphrase'), ACK,
    ];
    const one = buildResult(run('m3-mfa-incident', minimal), m3);
    expect(one.outcome).toBe('passed');
    expect(one.score).toBe(0);
    expect(one.stars).toBe(1);
  });

  it('reducer sof: kirish holati o‘zgarmaydi', () => {
    const s = run('m1-phishing', [READY, act('m1-computer')]);
    const snapshot = structuredClone(s);
    missionReducer(s, clue('m1-c-domain'), MISSIONS['m1-phishing']);
    expect(s).toEqual(snapshot);
  });
});
