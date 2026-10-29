import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../src/app/store';
import { createDefaultProgress, loadProgress } from '../src/persistence/storage';
import type { CharacterId, MissionId } from '../src/types/models';
import { SAFE_SCRIPTS } from './helpers';

function reset() {
  localStorage.clear();
  useGameStore.setState({ progress: createDefaultProgress(), screen: 'title', mission: null, lastResult: null, toasts: [] });
}

function playAs(character: CharacterId, missionId: MissionId) {
  const store = useGameStore.getState();
  store.selectCharacter(character);
  store.startMission(missionId);
  for (const a of SAFE_SCRIPTS[missionId]) useGameStore.getState().dispatchMission(a);
  return useGameStore.getState().lastResult!;
}

describe('store va ekran o‘tishlari', () => {
  beforeEach(reset);

  it('Bek va Guli bir xil tanlovlar bilan bir xil natija oladi', () => {
    const bek = playAs('bek', 'm1-phishing');
    reset();
    const guli = playAs('guli', 'm1-phishing');
    const strip = ({ finishedAt: _f, ...rest }: typeof bek) => rest;
    expect(strip(bek)).toEqual(strip(guli));
  });

  it('missiya tugagach natija saqlanadi, ekran natijaga o‘tadi va keyingi missiya ochiladi', () => {
    playAs('bek', 'm1-phishing');
    const s = useGameStore.getState();
    expect(s.screen).toBe('result');
    expect(s.mission).toBeNull();
    expect(loadProgress().missions['m1-phishing'].status).toBe('completed');
    expect(loadProgress().missions['m2-suspicious-file'].status).toBe('available');
  });

  it('yopiq missiyani boshlab bo‘lmaydi', () => {
    useGameStore.getState().startMission('m3-mfa-incident');
    expect(useGameStore.getState().screen).toBe('title');
    useGameStore.getState().openBriefing('m3-mfa-incident');
    expect(useGameStore.getState().screen).toBe('title');
  });

  it('belgi topilganda toast chiqadi', () => {
    const s = useGameStore.getState();
    s.startMission('m1-phishing');
    s.dispatchMission({ type: 'SCENE_READY' });
    s.dispatchMission({ type: 'ACTIVATE_HOTSPOT', hotspotId: 'm1-computer' });
    s.dispatchMission({ type: 'FIND_CLUE', clueId: 'm1-c-domain' });
    expect(useGameStore.getState().toasts.some((t) => t.text.includes('Yuboruvchi domeni'))).toBe(true);
  });

  it('progressni tozalash sozlamalarni saqlab qoladi', () => {
    const s = useGameStore.getState();
    s.updateSettings({ textScale: 1.5 });
    s.selectCharacter('guli');
    useGameStore.getState().resetProgress();
    const p = useGameStore.getState().progress;
    expect(p.selectedCharacter).toBeNull();
    expect(p.settings.textScale).toBe(1.5);
  });
});
