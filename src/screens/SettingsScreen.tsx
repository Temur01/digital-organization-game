import { useScreenHeading } from '../app/hooks';
import { useGameStore } from '../app/store';
import { ui } from '../content/uz/ui';
import { Button } from '../ui/Button';
import { SettingsPanel } from '../ui/SettingsPanel';
import styles from './screens.module.css';

export function SettingsScreen() {
  const closeSettings = useGameStore((s) => s.closeSettings);
  const heading = useScreenHeading<HTMLHeadingElement>();
  return (
    <main className={styles.page}>
      <article className={styles.briefing}>
        <h1 ref={heading} tabIndex={-1}>
          {ui.settings.heading}
        </h1>
        <SettingsPanel />
        <div className={styles.actions}>
          <Button onClick={closeSettings}>{ui.common.back}</Button>
        </div>
      </article>
    </main>
  );
}
