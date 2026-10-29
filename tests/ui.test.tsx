import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../src/app/store';
import { MISSIONS } from '../src/missions/data';
import { createDefaultProgress } from '../src/persistence/storage';
import { CharacterSelectScreen } from '../src/screens/CharacterSelectScreen';
import { MissionMapScreen } from '../src/screens/MissionMapScreen';
import { TitleScreen } from '../src/screens/TitleScreen';
import { SimEmailClient } from '../src/sim/SimEmailClient';
import { SimItPortal } from '../src/sim/SimItPortal';
import { DecisionPanel } from '../src/ui/DecisionPanel';
import { READY, act, run } from './helpers';

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState({ progress: createDefaultProgress(), screen: 'title', mission: null, lastResult: null, toasts: [] });
});

describe('ekranlar', () => {
  it('bosh menyu → personaj tanlash → xarita', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TitleScreen />);
    await user.click(screen.getByRole('button', { name: 'Yangi o‘yin' }));
    expect(useGameStore.getState().screen).toBe('characterSelect');
    unmount();

    const select = render(<CharacterSelectScreen />);
    const guli = screen.getByRole('radio', { name: /Guli/ });
    await user.click(guli);
    expect(guli).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Tasdiqlash' }));
    expect(useGameStore.getState().screen).toBe('map');
    expect(useGameStore.getState().progress.selectedCharacter).toBe('guli');
    select.unmount();

    render(<MissionMapScreen />);
    expect(screen.getByText('O‘yinchi: Guli')).toBeInTheDocument();
    const locked = screen.getByRole('button', { name: /Topilgan fleshka/ });
    expect(locked).toHaveAttribute('aria-disabled', 'true');
    await user.click(locked);
    expect(useGameStore.getState().screen).toBe('map');
    await user.click(screen.getByRole('button', { name: /Shoshilinch hisob-faktura/ }));
    expect(useGameStore.getState().screen).toBe('briefing');
  });

  it('personajlar strelka tugmalari bilan almashadi', async () => {
    const user = userEvent.setup();
    render(<CharacterSelectScreen />);
    const bek = screen.getByRole('radio', { name: /Bek/ });
    bek.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /Guli/ })).toBeChecked();
  });
});

describe('simulyatsiyalar xavfsizligi', () => {
  const mission = MISSIONS['m1-phishing'];

  it('pochtada haqiqiy havola yo‘q; «havola» faqat o‘yin ichidagi qarorni ishga tushiradi', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state = run('m1-phishing', [READY, act('m1-computer')]);
    const { baseElement } = render(
      <SimEmailClient mission={mission} state={state} dispatch={dispatch} playerName="Bek" onClose={() => {}} />,
    );
    expect(baseElement.querySelector('a')).toBeNull();
    const link = screen.getByRole('button', { name: 'kompaniya.example/hisob' });
    expect(screen.getByRole('tooltip')).toHaveTextContent('kompaniya-tolov.example/login');
    await user.click(link);
    expect(dispatch).toHaveBeenCalledWith({ type: 'CHOOSE', decisionId: 'm1-d-action', choiceId: 'click-link' });
  });

  it('belgilash rejimida shubhali joyni bosish belgi topadi', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state = run('m1-phishing', [READY, act('m1-computer')]);
    render(<SimEmailClient mission={mission} state={state} dispatch={dispatch} playerName="Bek" onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Belgilash rejimi/ }));
    await user.click(screen.getByRole('button', { name: /buxgalteriya@kompaniya-tolov\.example/ }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'FIND_CLUE', clueId: 'm1-c-domain' });
  });

  it('IT portalda matn kiritish maydoni yo‘q (parol yozilmaydi)', () => {
    const m3 = MISSIONS['m3-mfa-incident'];
    const before = run('m3-mfa-incident', [READY]);
    const { baseElement, rerender } = render(
      <SimItPortal mission={m3} state={before} dispatch={() => {}} playerName="Guli" onClose={() => {}} />,
    );
    const textInputs = () => baseElement.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea');
    expect(textInputs()).toHaveLength(0);
    const afterReport = { ...before, flags: [...before.flags, 'done:m3-d-report'] };
    rerender(<SimItPortal mission={m3} state={afterReport} dispatch={() => {}} playerName="Guli" onClose={() => {}} />);
    expect(screen.getByText('Guli1999')).toBeInTheDocument();
    expect(textInputs()).toHaveLength(0);
  });
});

describe('qaror paneli', () => {
  it('raqam tugmasi bilan tanlash', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    const decision = MISSIONS['m1-phishing'].decisions['m1-d-verify']!;
    render(<DecisionPanel decision={decision} playerName="Bek" onChoose={onChoose} onEscape={() => {}} />);
    const buttons = within(screen.getByRole('dialog')).getAllByRole('button');
    await user.keyboard('2');
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(buttons[1]).toHaveTextContent(decision.choices.find((c) => c.id === onChoose.mock.calls[0]![0])!.label);
  });
});
