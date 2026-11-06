/**
 * Missiya kontenti auditi (faqat ishlab chiquvchi uchun, o‘yinga kirmaydi).
 * Har bir tanlov uchun TypeSafe Jev’dan mustaqil baho olib, muallif belgilagan natija bilan solishtiradi.
 * Yuboriladi: faqat o‘ylab topilgan missiya matni. Foydalanuvchi ma’lumoti yuborilmaydi.
 *
 *   bun run content:audit            barcha missiyalar
 *   bun run content:audit m7-ransomware
 */
import { noul, score, TypeSafeClient } from '@typesafe-ai/sdk';
import { MISSION_LIST } from '../src/missions/data';
import type { Choice, Decision, Mission } from '../src/types/models';
import { auditChoice, type AuditFlag } from './content-audit-rules';

const QUESTIONS = {
  followsPractice: noul('Does `employee_action` follow good workplace cybersecurity practice for `situation`?'),
  harm: score('How much harm is `employee_action` likely to cause in `situation`?', [
    'The action causes no security harm and leaves the organization protected.',
    'The action causes no immediate loss, but leaves a real risk open, such as an unreported attack or an unverified request.',
    'The action directly gives attackers money, credentials, data, or access, or spreads the attack.',
  ]),
};

const stateFor = (mission: Mission, decision: Decision, choice: Choice) => ({
  note: 'The text is in Uzbek. It comes from a security awareness training game, and every attack in it is fictional.',
  scenario: mission.briefing.join(' '),
  situation: [decision.context, decision.prompt].filter(Boolean).join(' '),
  employee_action: choice.label,
});

interface Finding {
  missionId: string;
  decisionId: string;
  choiceId: string;
  outcome: Choice['outcome'];
  flag: AuditFlag;
  followsPractice: number;
  harm: number;
}

const filter = process.argv[2];
const missions = filter ? MISSION_LIST.filter((m) => m.id === filter) : MISSION_LIST;
if (missions.length === 0) throw new Error(`Missiya topilmadi: ${filter}`);

const client = new TypeSafeClient();
const findings: Finding[] = [];
let checked = 0;

for (const mission of missions) {
  for (const decision of Object.values(mission.decisions)) {
    const answers = await Promise.all(
      decision.choices.map((choice) => client.systemOne({ state: stateFor(mission, decision, choice), questions: QUESTIONS })),
    );
    decision.choices.forEach((choice, i) => {
      const { followsPractice, harm } = answers[i]!.answers;
      const flag = auditChoice(choice.outcome, { followsPractice: followsPractice.noul, harm: harm.score });
      checked++;
      if (flag) {
        findings.push({
          missionId: mission.id,
          decisionId: decision.id,
          choiceId: choice.id,
          outcome: choice.outcome,
          flag,
          followsPractice: followsPractice.noul,
          harm: harm.score,
        });
      }
    });
  }
}

console.log(`Tekshirildi: ${checked} ta tanlov. Ko‘rib chiqish uchun: ${findings.length} ta.`);
for (const f of findings) {
  console.log(`- ${f.missionId} / ${f.decisionId} / ${f.choiceId} [${f.outcome}] ${f.flag} (amaliyot ${f.followsPractice.toFixed(2)}, zarar ${f.harm.toFixed(2)})`);
}
