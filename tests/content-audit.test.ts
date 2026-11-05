import { describe, expect, it } from 'vitest';
import { auditChoice } from '../scripts/content-audit-rules';

describe('kontent auditi jadvali', () => {
  it('mos baholarda belgi qo‘yilmaydi', () => {
    expect(auditChoice('safe', { followsPractice: 0.95, harm: 0.1 })).toBeNull();
    expect(auditChoice('critical', { followsPractice: 0.05, harm: 1.9 })).toBeNull();
    expect(auditChoice('risky', { followsPractice: 0.4, harm: 1 })).toBeNull();
  });

  it('nomuvofiqlik belgilanadi', () => {
    expect(auditChoice('safe', { followsPractice: 0.1, harm: 0.2 })).toBe('safe-looks-harmful');
    expect(auditChoice('safe', { followsPractice: 0.9, harm: 1.8 })).toBe('safe-looks-harmful');
    expect(auditChoice('critical', { followsPractice: 0.9, harm: 1 })).toBe('critical-looks-harmless');
    expect(auditChoice('critical', { followsPractice: 0.2, harm: 0.2 })).toBe('critical-looks-harmless');
    expect(auditChoice('risky', { followsPractice: 0.9, harm: 0.2 })).toBe('risky-looks-safe');
    expect(auditChoice('risky', { followsPractice: 0.1, harm: 1.95 })).toBe('risky-looks-critical');
  });

  it('aniq bo‘lmagan oraliq — belgisiz', () => {
    expect(auditChoice('safe', { followsPractice: 0.5, harm: 0.5 })).toBeNull();
    expect(auditChoice('critical', { followsPractice: 0.5, harm: 1 })).toBeNull();
  });
});
