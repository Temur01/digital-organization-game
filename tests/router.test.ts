import { beforeEach, describe, expect, it } from 'vitest';
import { applyRoute, hashFor, parseHash, routeFromState, type Route } from '../src/app/router';
import { loadMissionSession } from '../src/app/session';
import { useGameStore } from '../src/app/store';
import { createDefaultProgress } from '../src/persistence/storage';

function reset(withCharacter = true) {
  localStorage.clear();
  sessionStorage.clear();
  const progress = { ...createDefaultProgress(), selectedCharacter: withCharacter ? ('guli' as const) : null };
  useGameStore.setState({ progress, screen: 'title', mission: null, lastResult: null, briefingMissionId: null, toasts: [] });
}

describe('marshrutlar', () => {
  it.each<[string, Route]>([
    ['#/', { screen: 'title' }],
    ['#/xarita', { screen: 'map' }],
    ['#/qahramon', { screen: 'characterSelect' }],
    ['#/sinov', { screen: 'quiz' }],
    ['#/reyting', { screen: 'leaderboard' }],
    ['#/kirish', { screen: 'auth' }],
    ['#/profil', { screen: 'profile' }],
    ['#/sozlamalar', { screen: 'settings' }],
    ['#/missiya/m2-suspicious-file', { screen: 'briefing', missionId: 'm2-suspicious-file' }],
    ['#/missiya/m1-phishing/oyin', { screen: 'playing', missionId: 'm1-phishing' }],
    ['#/natija/m4-coffee-break', { screen: 'result', missionId: 'm4-coffee-break' }],
  ])('%s ↔ marshrut', (hash, route) => {
    expect(parseHash(hash)).toEqual(route);
    expect(hashFor(route)).toBe(hash);
  });

  it('noma’lum yoki noto‘g‘ri manzil — bosh menyu', () => {
    expect(parseHash('')).toEqual({ screen: 'title' });
    expect(parseHash('#/yoq-sahifa')).toEqual({ screen: 'title' });
    expect(parseHash('#/missiya/hakerlik')).toEqual({ screen: 'title' });
  });
});

describe('manzil bo‘yicha ekranni tiklash', () => {
  beforeEach(() => reset());

  it('xarita va sinov to‘g‘ridan-to‘g‘ri ochiladi', () => {
    applyRoute({ screen: 'map' });
    expect(useGameStore.getState().screen).toBe('map');
    applyRoute({ screen: 'quiz' });
    expect(useGameStore.getState().screen).toBe('quiz');
  });

  it('yopiq missiya manzili — xaritaga yo‘naltiradi', () => {
    applyRoute({ screen: 'playing', missionId: 'm3-mfa-incident' });
    expect(useGameStore.getState().screen).toBe('map');
    expect(useGameStore.getState().mission).toBeNull();
  });

  it('qahramon tanlanmagan bo‘lsa — avval qahramon tanlash', () => {
    reset(false);
    applyRoute({ screen: 'map' });
    expect(useGameStore.getState().screen).toBe('characterSelect');
  });

  it('o‘yin sahifasi yangilanganda — belgilar, ball va qarorlar saqlanadi', () => {
    const s = useGameStore.getState();
    s.startMission('m1-phishing');
    s.dispatchMission({ type: 'SCENE_READY' });
    s.dispatchMission({ type: 'ACTIVATE_HOTSPOT', hotspotId: 'm1-computer' });
    s.dispatchMission({ type: 'FIND_CLUE', clueId: 'm1-c-domain' });
    s.dispatchMission({ type: 'CHOOSE', decisionId: 'm1-d-action', choiceId: 'report' });
    s.dispatchMission({ type: 'ACK' });
    expect(loadMissionSession()?.score).toBe(15);

    // «Yangilash»: xotiradagi holat yo‘qoladi, sessionStorage qoladi
    useGameStore.setState({ mission: null, screen: 'title' });
    applyRoute(parseHash('#/missiya/m1-phishing/oyin'));
    const m = useGameStore.getState().mission!;
    expect(useGameStore.getState().screen).toBe('playing');
    expect(m.phase).toBe('loading');
    expect(m.activeOverlay).toBeNull();
    expect(m.score).toBe(15);
    expect(m.cluesFound).toEqual(['m1-c-domain']);
    expect(m.flags).toContain('done:m1-d-action');
  });

  it('jiddiy xatoni yangilash bilan chetlab o‘tib bo‘lmaydi', () => {
    const s = useGameStore.getState();
    s.startMission('m1-phishing');
    s.dispatchMission({ type: 'SCENE_READY' });
    s.dispatchMission({ type: 'ACTIVATE_HOTSPOT', hotspotId: 'm1-computer' });
    s.dispatchMission({ type: 'CHOOSE', decisionId: 'm1-d-action', choiceId: 'click-link' });
    useGameStore.setState({ mission: null, screen: 'title' });
    applyRoute({ screen: 'playing', missionId: 'm1-phishing' });
    expect(useGameStore.getState().mission?.phase).toBe('consequence');
  });

  it('natija sahifasi yangilanganda saqlangan natija ko‘rsatiladi; natija bo‘lmasa — xarita', () => {
    applyRoute({ screen: 'result', missionId: 'm1-phishing' });
    expect(useGameStore.getState().screen).toBe('map');

    const s = useGameStore.getState();
    s.startMission('m1-phishing');
    s.dispatchMission({ type: 'SCENE_READY' });
    s.dispatchMission({ type: 'ACTIVATE_HOTSPOT', hotspotId: 'm1-computer' });
    s.dispatchMission({ type: 'CHOOSE', decisionId: 'm1-d-action', choiceId: 'click-link' });
    s.dispatchMission({ type: 'ACK' });
    s.dispatchMission({ type: 'ACK' });
    expect(loadMissionSession()).toBeNull();
    expect(routeFromState(useGameStore.getState())).toEqual({ screen: 'result', missionId: 'm1-phishing' });

    useGameStore.setState({ lastResult: null, screen: 'title' });
    applyRoute({ screen: 'result', missionId: 'm1-phishing' });
    expect(useGameStore.getState().screen).toBe('result');
    expect(useGameStore.getState().lastResult?.outcome).toBe('failed');
  });
});
