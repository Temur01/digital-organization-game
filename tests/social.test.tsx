import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MISSIONS } from '../src/missions/data';
import { SimSocial } from '../src/sim/SimSocial';
import { SAFE_SCRIPTS, run } from './helpers';

const m5 = MISSIONS['m5-social-media'];
const script = SAFE_SCRIPTS['m5-social-media'];
/** Ssenariydagi birinchi mos amalgacha bo‘lgan holat */
const before = (match: (a: (typeof script)[number]) => boolean) => run('m5-social-media', script.slice(0, script.findIndex(match)));
const until = (decisionId: string) =>
  run(
    'm5-social-media',
    script.slice(
      0,
      script.findIndex((a) => a.type === 'CHOOSE' && a.decisionId === decisionId),
    ),
  );

describe('«Lenta» simulyatsiyasi', () => {
  it('post suratida belgi topiladi va qaror tanlanadi', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    // Hali birorta belgi topilmagan holat (telefon endigina ochildi)
    const fresh = before((a) => a.type === 'FIND_CLUE' && a.clueId === 'm5-c-badge');
    render(<SimSocial mission={m5} state={fresh} dispatch={dispatch} playerName="Bek" onClose={() => {}} />);
    expect(screen.getByText(/server xonasi yonida/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Belgilash rejimi/ }));
    await user.click(screen.getByRole('button', { name: /Propusk/ }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'FIND_CLUE', clueId: 'm5-c-badge' });
    await user.click(screen.getByRole('button', { name: /Qayta suratga tushamiz/ }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'CHOOSE', decisionId: 'm5-d-post', choiceId: 'retake' });
  });

  it('post hal qilingach — DM bosqichi, so‘ng profil', () => {
    const dm = render(<SimSocial mission={m5} state={until('m5-d-dm')} dispatch={() => {}} playerName="Bek" onClose={() => {}} />);
    expect(screen.getByText(/HR menejer/)).toBeInTheDocument();
    expect(screen.getByText('Post').closest('li')).toHaveTextContent('✓');
    dm.unmount();
    render(<SimSocial mission={m5} state={until('m5-d-privacy')} dispatch={() => {}} playerName="Bek" onClose={() => {}} />);
    expect(screen.getByText('Mening profilim')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yopiq profil/ })).toBeInTheDocument();
  });

  it('simulyatsiyada matn kiritish maydoni va haqiqiy havola yo‘q', () => {
    const { baseElement } = render(<SimSocial mission={m5} state={until('m5-d-post')} dispatch={() => {}} playerName="Bek" onClose={() => {}} />);
    expect(baseElement.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea, a[href]')).toHaveLength(0);
  });
});
