import type { Condition, InteractionAction, Mission, Rect, SimTextPart } from '../../types/models';
import { clueFlag, doneFlag } from './conditions';

const SAFE_TLD = '.example';

function inside(p: { x: number; y: number }, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

function hostOf(value: string): string {
  const afterAt = value.includes('@') ? value.slice(value.indexOf('@') + 1) : value;
  return afterAt.split('/')[0] ?? '';
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

/** Kontent xatolari ro‘yxatini qaytaradi; bo‘sh ro‘yxat — missiya to‘g‘ri. */
export function validateMission(mission: Mission): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(`[${mission.id}] ${msg}`);

  const checkAction = (a: InteractionAction | undefined, where: string) => {
    if (!a) return;
    if (a.type === 'dialog' && !mission.dialogs[a.dialogId]) err(`${where}: dialog «${a.dialogId}» topilmadi`);
    if (a.type === 'decision' && !mission.decisions[a.decisionId]) err(`${where}: qaror «${a.decisionId}» topilmadi`);
  };
  const checkClue = (id: string | undefined, where: string) => {
    if (id && !mission.clues[id]) err(`${where}: belgi «${id}» topilmadi`);
  };
  const checkDecision = (id: string | undefined, where: string) => {
    if (id && !mission.decisions[id]) err(`${where}: qaror «${id}» topilmadi`);
  };
  const checkParts = (parts: SimTextPart[], where: string) => {
    for (const p of parts) {
      checkClue(p.clueId, where);
      if (p.type === 'link') {
        if (!hostOf(p.realUrl).endsWith(SAFE_TLD)) err(`${where}: havola «${p.realUrl}» ${SAFE_TLD} emas`);
        if (!hostOf(p.text).endsWith(SAFE_TLD)) err(`${where}: havola matni «${p.text}» ${SAFE_TLD} emas`);
      }
    }
  };

  // Qarorlar
  for (const d of Object.values(mission.decisions)) {
    if (d.choices.length < 2 || d.choices.length > 5) err(`qaror «${d.id}»: tanlovlar soni 2–5 bo‘lishi kerak`);
    if (!d.choices.some((c) => c.outcome === 'safe')) err(`qaror «${d.id}»: xavfsiz tanlov yo‘q`);
    for (const c of d.choices) {
      if (c.outcome === 'critical' && (!c.consequenceId || !mission.consequences[c.consequenceId])) {
        err(`tanlov «${d.id}/${c.id}»: oqibat (consequence) yo‘q`);
      }
      for (const e of c.effects ?? []) if (e.type === 'findClue') checkClue(e.clueId, `tanlov «${c.id}»`);
    }
  }

  // Hotspotlar
  const { walkable } = mission.room;
  for (const h of mission.hotspots) {
    checkAction(h.action, `hotspot «${h.id}»`);
    checkAction(h.actionWhenDone, `hotspot «${h.id}»`);
    if (!inside(h.interactPoint, walkable)) err(`hotspot «${h.id}»: interactPoint yuriladigan maydondan tashqarida`);
  }

  // Dialoglar
  for (const dlg of Object.values(mission.dialogs)) {
    checkDecision(dlg.thenDecisionId, `dialog «${dlg.id}»`);
    for (const e of dlg.effectsOnEnd ?? []) if (e.type === 'findClue') checkClue(e.clueId, `dialog «${dlg.id}»`);
  }

  // Simulyatsiya kontenti
  const { sim } = mission;
  for (const mail of sim.emails ?? []) {
    if (!hostOf(mail.fromAddress).endsWith(SAFE_TLD)) err(`xat «${mail.id}»: domen ${SAFE_TLD} emas`);
    checkClue(mail.clues?.from, `xat «${mail.id}»`);
    checkClue(mail.clues?.subject, `xat «${mail.id}»`);
    checkClue(mail.clues?.greeting, `xat «${mail.id}»`);
    checkClue(mail.attachment?.clueId, `xat «${mail.id}»`);
    mail.body.forEach((p) => checkParts(p, `xat «${mail.id}»`));
    checkDecision(mail.decisionId, `xat «${mail.id}»`);
    const decision = mail.decisionId ? mission.decisions[mail.decisionId] : undefined;
    const choiceIds = [...(mail.toolbarChoiceIds ?? []), ...mail.body.flat().flatMap((p) => (p.type === 'link' && p.choiceId ? [p.choiceId] : []))];
    for (const id of choiceIds) {
      if (!decision?.choices.some((c) => c.id === id)) err(`xat «${mail.id}»: tanlov «${id}» topilmadi`);
    }
  }
  if (sim.messenger) {
    checkClue(sim.messenger.contactClueId, 'messenjer');
    sim.messenger.messages.forEach((p) => checkParts(p, 'messenjer'));
    checkClue(sim.messenger.file.nameClueId, 'messenjer fayli');
    checkClue(sim.messenger.file.typeClueId, 'messenjer fayli');
    checkDecision(sim.messenger.decisionId, 'messenjer');
  }
  if (sim.phone) {
    const { mfa, call } = sim.phone;
    checkClue(mfa.titleClueId, 'telefon');
    checkClue(mfa.locationClueId, 'telefon');
    checkParts(call.lines, 'qo‘ng‘iroq');
    for (const [decisionId, ids] of [
      [mfa.decisionId, mfa.choiceIds],
      [call.decisionId, call.choiceIds],
    ] as const) {
      const d = mission.decisions[decisionId];
      if (!d) err(`telefon: qaror «${decisionId}» topilmadi`);
      for (const id of ids) if (!d?.choices.some((c) => c.id === id)) err(`telefon: tanlov «${id}» topilmadi`);
    }
  }
  if (sim.itPortal) {
    const { report, password } = sim.itPortal;
    const d = mission.decisions[report.decisionId];
    if (!d) err(`portal: qaror «${report.decisionId}» topilmadi`);
    for (const id of [report.correctChoiceId, report.wrongChoiceId]) {
      if (!d?.choices.some((c) => c.id === id)) err(`portal: tanlov «${id}» topilmadi`);
    }
    checkDecision(password.decisionId, 'portal');
    for (const f of report.fields) {
      if (f.kind === 'radio' && f.options.filter((o) => o.correct).length !== 1)
        err(`portal: «${f.id}» radio maydonida aynan bitta to‘g‘ri javob bo‘lishi kerak`);
    }
  }

  if (sim.social) {
    const { post, dm, privacy } = sim.social;
    checkClue(post.locationClueId, 'post');
    post.photo.forEach((item) => checkClue(item.clueId, `post surati «${item.id}»`));
    checkParts(post.caption, 'post matni');
    checkClue(dm.profileClueId, 'DM');
    dm.messages.forEach((p) => checkParts(p, 'DM'));
    privacy.fields.forEach((f) => checkClue(f.clueId, `profil «${f.label}»`));
    for (const { decisionId, choiceIds } of [post, dm, privacy]) {
      const d = mission.decisions[decisionId];
      if (!d) err(`ijtimoiy tarmoq: qaror «${decisionId}» topilmadi`);
      for (const id of choiceIds) if (!d?.choices.some((ch) => ch.id === id)) err(`ijtimoiy tarmoq: tanlov «${id}» topilmadi`);
    }
  }

  // Tugatish mumkinmi: completeWhen dagi har bir flag biror joyda o‘rnatiladi
  const settable = new Set<string>([...Object.keys(mission.decisions).map(doneFlag), ...Object.keys(mission.clues).map(clueFlag)]);
  const addEffects = (effects?: { type: string; flag?: string }[]) => effects?.forEach((e) => e.type === 'setFlag' && e.flag && settable.add(e.flag));
  Object.values(mission.dialogs).forEach((d) => addEffects(d.effectsOnEnd));
  Object.values(mission.decisions).forEach((d) => d.choices.forEach((c) => addEffects(c.effects)));
  const conditionFlags = (c: Condition) => [...(c.all ?? []), ...(c.any ?? [])];
  for (const f of conditionFlags(mission.completeWhen)) {
    if (!settable.has(f)) err(`completeWhen: «${f}» hech qayerda o‘rnatilmaydi`);
  }
  for (const o of mission.objectives) {
    for (const f of conditionFlags(o.completeWhen)) if (!settable.has(f)) err(`maqsad «${o.id}»: «${f}» o‘rnatilmaydi`);
  }

  // Xavfsizlik: matnlarda haqiqiy URL yo‘q
  for (const s of collectStrings(mission)) {
    if (/https?:\/\/|www\./i.test(s)) err(`matnda URL bor: «${s}»`);
  }

  if (mission.lessons.length < 3 || mission.lessons.length > 5) err('saboqlar soni 3–5 bo‘lishi kerak');
  return errors;
}
