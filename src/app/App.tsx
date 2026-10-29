import { useEffect } from 'react';
import { BriefingScreen } from '../screens/BriefingScreen';
import { CharacterSelectScreen } from '../screens/CharacterSelectScreen';
import { GameScreen } from '../screens/GameScreen';
import { MissionMapScreen } from '../screens/MissionMapScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TitleScreen } from '../screens/TitleScreen';
import type { AppScreen } from '../types/models';
import { Toasts } from '../ui/Toasts';
import { useReducedMotion } from './hooks';
import { useGameStore } from './store';

const SCREENS: Record<AppScreen, () => JSX.Element | null> = {
  title: TitleScreen,
  characterSelect: CharacterSelectScreen,
  map: MissionMapScreen,
  briefing: BriefingScreen,
  playing: GameScreen,
  result: ResultScreen,
  settings: SettingsScreen,
};

export function App() {
  const screen = useGameStore((s) => s.screen);
  const settings = useGameStore((s) => s.progress.settings);
  const reducedMotion = useReducedMotion(settings.reducedMotion);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${settings.textScale * 100}%`;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  }, [settings.textScale, settings.highContrast, reducedMotion]);

  const Screen = SCREENS[screen];
  return (
    <>
      <Screen key={screen} />
      <Toasts />
    </>
  );
}
