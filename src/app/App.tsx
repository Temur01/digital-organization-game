import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect } from 'react';
import { AuthScreen } from '../screens/AuthScreen';
import { BriefingScreen } from '../screens/BriefingScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { QuizScreen } from '../screens/QuizScreen';
import { CharacterSelectScreen } from '../screens/CharacterSelectScreen';
import { GameScreen } from '../screens/GameScreen';
import { MissionMapScreen } from '../screens/MissionMapScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TitleScreen } from '../screens/TitleScreen';
import type { AppScreen } from '../types/models';
import { Toasts } from '../ui/Toasts';
import { useReducedMotion } from './hooks';
import { useAuthStore } from './auth';
import { useGameStore } from './store';

const SCREENS: Record<AppScreen, () => JSX.Element | null> = {
  title: TitleScreen,
  characterSelect: CharacterSelectScreen,
  map: MissionMapScreen,
  briefing: BriefingScreen,
  playing: GameScreen,
  result: ResultScreen,
  settings: SettingsScreen,
  auth: AuthScreen,
  profile: ProfileScreen,
  quiz: QuizScreen,
  leaderboard: LeaderboardScreen,
};

export function App() {
  const screen = useGameStore((s) => s.screen);
  const settings = useGameStore((s) => s.progress.settings);
  const reducedMotion = useReducedMotion(settings.reducedMotion);
  const initAuth = useAuthStore((s) => s.init);

  // Supabase sessiyasi: kirish, token yangilanishi, chiqish
  useEffect(() => initAuth(), [initAuth]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${settings.textScale * 100}%`;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  }, [settings.textScale, settings.highContrast, reducedMotion]);

  const Screen = SCREENS[screen];
  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Screen />
        </motion.div>
      </AnimatePresence>
      <Toasts />
    </MotionConfig>
  );
}
