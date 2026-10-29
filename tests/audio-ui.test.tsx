import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../src/app/store';
import { audioManager } from '../src/game/audio';
import { createDefaultProgress, STORAGE_KEY } from '../src/persistence/storage';
import { AudioControls } from '../src/ui/AudioControls';

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState({ progress: createDefaultProgress() });
});

describe('ovoz sozlamalari paneli', () => {
  it('slayder balandlikni saqlaydi va AudioManager’ga uzatadi', () => {
    render(<AudioControls />);
    const music = screen.getByRole('slider', { name: /Musiqa/ });
    fireEvent.change(music, { target: { value: '20' } });
    expect(useGameStore.getState().progress.settings.audio?.music).toBeCloseTo(0.2);
    expect(audioManager.getSettings().music).toBeCloseTo(0.2);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings.audio.music).toBeCloseTo(0.2);
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('ovozsiz rejim: slayderlar o‘chadi, sozlama saqlanadi', () => {
    render(<AudioControls />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Barcha ovozni o‘chirish/ }));
    expect(useGameStore.getState().progress.settings.audio?.muted).toBe(true);
    expect(audioManager.getSettings().muted).toBe(true);
    for (const s of screen.getAllByRole('slider')) expect(s).toBeDisabled();
  });
});
