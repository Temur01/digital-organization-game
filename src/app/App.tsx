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
import { audioManager, installAudioLifecycle } from '../game/audio';
import { playGameAudio } from '../game/audio/audioEvents';
import { useBackgroundMusic } from '../game/audio/hooks/useBackgroundMusic';
import type { MusicId } from '../game/audio/audioTypes';
import { MISSIONS } from '../missions/data';
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

  // Audio: birinchi bosishda ishga tushadi (brauzer qoidasi), yorliq yashirilsa to‘xtaydi
  useEffect(() => installAudioLifecycle(), []);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Faqat ishlab chiqishda: brauzerda tekshirish uchun (window.__audio.debugState())
    (window as unknown as { __audio?: typeof audioManager }).__audio = audioManager;
  }, []);

  // Fon musiqasi ekranga qarab: missiya ichida — xonaga mos (tun/kun), qolgan joyda — menyu
  const missionId = useGameStore((s) => s.mission?.missionId ?? null);
  const music: MusicId = screen === 'playing' && missionId ? (MISSIONS[missionId].room.theme.night ? 'night' : 'gameplay') : 'menu';
  useBackgroundMusic(music);

  // Tugma, tab va tanlov kartalarini bosganda yumshoq «tik» (sozlamalarda tovush o‘chirilsa — jim)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest('button, [role="tab"], [role="option"], label');
      if (el && !el.matches(':disabled, [aria-disabled="true"]')) playGameAudio({ type: 'ui', action: 'tap' });
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

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
