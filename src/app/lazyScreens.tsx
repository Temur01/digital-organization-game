import { Component, lazy, type ReactNode } from 'react';
import { ui } from '../content/uz/ui';
import { Button } from '../ui/Button';
import styles from '../screens/screens.module.css';

/** Three.js eng og‘ir bog‘liqlik: u faqat missiya boshlanganda yuklanadi. */
export const loadGameScreen = () => import('../screens/GameScreen');

export const GameScreen = lazy(() => loadGameScreen().then((m) => ({ default: m.GameScreen })));

export function ScreenFallback() {
  return (
    <p className={styles.loading} role="status">
      {ui.game.loading}
    </p>
  );
}

/** Kod bo‘lagi yuklanmasa (internet uzilgan, yangi versiya chiqqan) — oq ekran o‘rniga xabar */
export class ScreenBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={styles.loading} role="alert">
        <p>{ui.game.loadFailed}</p>
        <Button onClick={() => window.location.reload()}>{ui.game.reload}</Button>
      </div>
    );
  }
}
