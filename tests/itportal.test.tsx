import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MISSIONS } from '../src/missions/data';
import { SimItPortal } from '../src/sim/SimItPortal';
import { SAFE_SCRIPTS, run } from './helpers';

describe('IT portali — hodisa shakli', () => {
  it('to‘g‘ri javoblar submit-correct yuboradi', async () => {
    const user = userEvent.setup();
    const m3 = MISSIONS['m3-mfa-incident'];
    const script = SAFE_SCRIPTS['m3-mfa-incident'];
    const idx = script.findIndex((a) => a.type === 'CHOOSE' && a.decisionId === 'm3-d-report');
    const state = run('m3-mfa-incident', script.slice(0, idx));
    const dispatch = vi.fn();
    render(<SimItPortal mission={m3} state={state} dispatch={dispatch} playerName="Bek" onClose={() => {}} />);
    await user.click(screen.getByLabelText('So‘ralmagan MFA so‘rovlari'));
    await user.click(screen.getByLabelText('Kod so‘rab qo‘ng‘iroq qilishdi'));
    await user.click(screen.getByLabelText('Yo‘q'));
    await user.click(screen.getByRole('button', { name: 'Yuborish' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'CHOOSE', decisionId: 'm3-d-report', choiceId: 'submit-correct' });
  });

  it('noto‘g‘ri javobda izoh aynan shu savol ostida chiqadi', async () => {
    const user = userEvent.setup();
    const m3 = MISSIONS['m3-mfa-incident'];
    const script = SAFE_SCRIPTS['m3-mfa-incident'];
    const state = run(
      'm3-mfa-incident',
      script.slice(
        0,
        script.findIndex((a) => a.type === 'CHOOSE' && a.decisionId === 'm3-d-report'),
      ),
    );
    const dispatch = vi.fn();
    render(<SimItPortal mission={m3} state={state} dispatch={dispatch} playerName="Bek" onClose={() => {}} />);
    await user.click(screen.getByLabelText('So‘ralmagan MFA so‘rovlari'));
    await user.click(screen.getByLabelText('Ha'));
    await user.click(screen.getByRole('button', { name: 'Yuborish' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'CHOOSE', decisionId: 'm3-d-report', choiceId: 'submit-wrong' });
    const groups = screen.getAllByRole('group');
    expect(groups[0]).toHaveAttribute('aria-invalid', 'true');
    expect(groups[0]).toHaveAccessibleDescription(/qo‘ng‘iroq qildi/);
    expect(groups[1]).toHaveAccessibleDescription(/Rad etish/);
    // Tanlangan javoblar saqlanib qoladi — faqat xatoni tuzatish kifoya
    expect(screen.getByLabelText('So‘ralmagan MFA so‘rovlari')).toBeChecked();
  });
});
