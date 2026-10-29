// ---------- Personaj ----------
export type CharacterId = 'bek' | 'guli';
export type Direction = 'down' | 'up' | 'left' | 'right';

/** Faqat ko‘rinish. Mexanikaga ta’sir qiluvchi maydon (tezlik, bonus) bu yerda bo‘lmasligi shart. */
export interface CharacterLook {
  skin: number;
  skinShade: number;
  hair: number;
  hairStyle: 'short' | 'braid' | 'bun';
  top: number;
  topInner?: number;
  bottom: number;
  shoes: number;
  accent: 'lanyard' | 'pocket' | 'none';
}

export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  shortDescription: string;
  traits: string[];
  quote: string;
  /** Katta illyustratsiya (UI) */
  art: string;
  /** UI aksent rangi (CSS) */
  accent: string;
  /** Rasm kengligiga nisbatan yuz markazi (0–1) — avatar kesish uchun */
  faceX: number;
  /** Yurish sikli: gorizontal sprite varag‘i (8 kadr, o‘ngga qarab) */
  walkSheet: string;
  /** Vektor zaxira ko‘rinish (rasm yuklanmasa) */
  look: CharacterLook;
}


// ---------- Xona ----------
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}

export type DecorKind =
  | 'desk'
  | 'table'
  | 'plant'
  | 'cabinet'
  | 'window'
  | 'rug'
  | 'wallArt'
  | 'counter'
  | 'chair'
  | 'clock'
  | 'shelf'
  | 'cooler'
  | 'lamp'
  | 'kitchen'
  | 'fridge'
  | 'bistro';

export interface DecorItem {
  kind: DecorKind;
  rect: Rect;
  solid?: boolean;
}

export interface RoomTheme {
  wall: number;
  wallTrim: number;
  floor: number;
  floorLine: number;
  window: number;
  night?: boolean;
}

export interface RoomDefinition {
  id: string;
  theme: RoomTheme;
  wallHeight: number;
  walkable: Rect;
  decor: DecorItem[];
  spawn: Point;
}

// ---------- Shart va effekt ----------
export type Flag = string;

/** all — hammasi bor, any — kamida bittasi bor, none — hech biri yo‘q. Bo‘sh shart doim rost. */
export interface Condition {
  all?: Flag[];
  any?: Flag[];
  none?: Flag[];
}

export type Effect =
  | { type: 'setFlag'; flag: Flag }
  | { type: 'findClue'; clueId: string };

// ---------- Interaktiv obyekt ----------
export type HotspotKind = 'computer' | 'phone' | 'device' | 'npc' | 'poster' | 'note' | 'door' | 'box' | 'coffee' | 'qr';
export type HotspotVisualState = 'idle' | 'disabled' | 'done' | 'hidden';
export type SimAppId = 'email' | 'workstation' | 'phone' | 'itPortal';

export type InteractionAction =
  | { type: 'dialog'; dialogId: string }
  | { type: 'openSim'; app: SimAppId }
  | { type: 'decision'; decisionId: string };

export interface NpcLook {
  name: string;
  look: CharacterLook;
  /** Illyustratsiya (bo‘lsa, vektor ko‘rinish o‘rniga ishlatiladi) */
  art?: string;
  /** Avatar uchun yuz markazi (0–1) */
  faceX?: number;
}

export interface InteractiveObject {
  id: string;
  kind: HotspotKind;
  label: string;
  ariaLabel: string;
  /** Bosiladigan maydon (mantiqiy koordinata 960×540). */
  bounds: Rect;
  /** Personaj turadigan nuqta. */
  interactPoint: Point;
  npc?: NpcLook;
  visibleWhen?: Condition;
  enabledWhen?: Condition;
  disabledHint?: string;
  doneWhen?: Condition;
  action: InteractionAction;
  actionWhenDone?: InteractionAction;
}

// ---------- Dialog ----------
export interface DialogLine {
  /** 'player' yoki NPC ismi */
  speaker: string;
  text: string;
}

export interface Dialog {
  id: string;
  lines: DialogLine[];
  effectsOnEnd?: Effect[];
  /** Dialog tugagach ochiladigan qaror */
  thenDecisionId?: string;
}

// ---------- Belgi ----------
export interface Clue {
  id: string;
  label: string;
  explanation: string;
  points: number;
}

// ---------- Tanlov va qaror ----------
export type ChoiceOutcome = 'safe' | 'risky' | 'critical';

export interface Choice {
  id: string;
  label: string;
  /** Simulyatsiya tugmalari uchun qisqa matn */
  shortLabel?: string;
  outcome: ChoiceOutcome;
  feedbackTitle: string;
  feedback: string;
  /** Birinchi urinishdagi xavfsiz tanlov uchun ball */
  points: number;
  effects?: Effect[];
  /** critical uchun majburiy */
  consequenceId?: string;
}

export interface Decision {
  id: string;
  prompt: string;
  context?: string;
  choices: Choice[];
  /** default: true — to‘g‘ri javob doim bir joyda turmasin */
  shuffle?: boolean;
}

export interface Consequence {
  id: string;
  title: string;
  steps: { icon: string; text: string }[];
  prevention: string;
}

// ---------- Simulyatsiya kontenti (faqat ma’lumot; hech narsa bajarilmaydi) ----------
export type SimTextPart =
  | { type: 'text'; text: string; clueId?: string }
  /** <a> emas! Faqat o‘yin ichidagi tugma. */
  | { type: 'link'; text: string; realUrl: string; clueId?: string; choiceId?: string };

export interface SimEmail {
  id: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  greeting: string;
  time: string;
  body: SimTextPart[][];
  signature: string;
  attachment?: { fileName: string; clueId?: string };
  clues?: { from?: string; subject?: string; greeting?: string };
  decisionId?: string;
  /** Pochta asboblar panelidagi tanlovlar (decision choice id’lari) */
  toolbarChoiceIds?: string[];
}

export interface SimFile {
  id: string;
  displayName: string;
  realName: string;
  typeLabel: string;
  displayTypeLabel: string;
  size: string;
  nameClueId?: string;
  typeClueId?: string;
}

export interface SimMessenger {
  contact: string;
  contactNote: string;
  contactClueId?: string;
  messages: SimTextPart[][];
  file: SimFile;
  decisionId: string;
}

export interface SimPhone {
  mfa: {
    decisionId: string;
    title: string;
    titleClueId?: string;
    app: string;
    location: string;
    locationClueId?: string;
    device: string;
    choiceIds: string[];
  };
  call: {
    decisionId: string;
    caller: string;
    callerNumber: string;
    lines: SimTextPart[];
    choiceIds: string[];
  };
  doneText: string;
}

export interface ReportField {
  id: string;
  label: string;
  kind: 'checkbox' | 'radio';
  options: { id: string; label: string; correct: boolean }[];
  errorHint: string;
}

export interface SimItPortal {
  report: {
    decisionId: string;
    correctChoiceId: string;
    wrongChoiceId: string;
    fields: ReportField[];
  };
  password: {
    decisionId: string;
    intro: string;
  };
}

export interface SimContent {
  emails?: SimEmail[];
  messenger?: SimMessenger;
  extraFiles?: SimFile[];
  phone?: SimPhone;
  itPortal?: SimItPortal;
}

// ---------- Missiya ----------
export type MissionId = 'm1-phishing' | 'm2-suspicious-file' | 'm3-mfa-incident' | 'm4-coffee-break';
export type MissionTopic = 'phishing' | 'malware' | 'mfa' | 'password' | 'incident' | 'physical';

export interface Objective {
  id: string;
  label: string;
  optional?: boolean;
  completeWhen: Condition;
}

export interface Mission {
  id: MissionId;
  order: number;
  title: string;
  /** Qisqa jozibador shior */
  subtitle: string;
  topicLabel: string;
  /** 0 — oson, 1 — o‘rta, 2 — qiyin */
  difficulty: 0 | 1 | 2;
  minutes: number;
  /** «Bilasizmi?» faktlari (brifing va yuklanish ekrani) */
  facts: string[];
  topics: MissionTopic[];
  icon: string;
  briefing: string[];
  room: RoomDefinition;
  objectives: Objective[];
  hotspots: InteractiveObject[];
  dialogs: Record<string, Dialog>;
  decisions: Record<string, Decision>;
  clues: Record<string, Clue>;
  consequences: Record<string, Consequence>;
  sim: SimContent;
  completeWhen: Condition;
  lessons: string[];
  unlocks: MissionId[];
}

// ---------- Runtime holat (saqlanmaydi) ----------
export type MissionPhase =
  | 'loading'
  | 'exploring'
  | 'interacting'
  | 'deciding'
  | 'feedback'
  | 'consequence'
  | 'paused'
  | 'completed'
  | 'failed';

export type OverlayRef =
  | { type: 'dialog'; dialogId: string }
  | { type: 'sim'; app: SimAppId }
  | { type: 'decision'; decisionId: string; returnTo: OverlayRef | null };

export interface DecisionLogEntry {
  decisionId: string;
  firstChoiceId: string;
  firstOutcome: ChoiceOutcome;
  finalChoiceId: string;
  attempts: number;
}

export interface MissionRuntimeState {
  missionId: MissionId;
  phase: MissionPhase;
  resumeTo: MissionPhase | null;
  activeOverlay: OverlayRef | null;
  flags: Flag[];
  cluesFound: string[];
  decisionLog: Record<string, DecisionLogEntry>;
  pendingFeedback: { decisionId: string; choiceId: string; returnPhase: MissionPhase } | null;
  score: number;
}

// ---------- Natija ----------
export type Stars = 0 | 1 | 2 | 3;

export interface MissionResult {
  missionId: MissionId;
  outcome: 'passed' | 'failed';
  score: number;
  maxScore: number;
  stars: Stars;
  cluesFound: string[];
  decisions: DecisionLogEntry[];
  finishedAt: string;
}

// ---------- Lokal progress ----------
export type MissionStatus = 'locked' | 'available' | 'completed';

export interface MissionProgress {
  status: MissionStatus;
  attempts: number;
  bestScore: number;
  bestStars: Stars;
  lastResult?: MissionResult;
}

export interface Settings {
  textScale: 1 | 1.25 | 1.5;
  reducedMotion: 'system' | 'on' | 'off';
  highContrast: boolean;
  listMode: boolean;
  sound: boolean;
}

export interface LocalProgress {
  version: 1;
  selectedCharacter: CharacterId | null;
  missions: Record<MissionId, MissionProgress>;
  settings: Settings;
  updatedAt: string;
}

export type AppScreen =
  | 'title'
  | 'characterSelect'
  | 'map'
  | 'briefing'
  | 'playing'
  | 'result'
  | 'settings';
