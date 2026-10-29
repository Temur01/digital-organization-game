import { MISSIONS } from '../missions/data';
import type { AppScreen, MissionId } from '../types/models';
import { useGameStore, type GameStore } from './store';

/**
 * Hash-router: har bir ekran o‘z manziliga ega (#/xarita, #/missiya/m1-phishing …).
 * Hash tanlangani sababi — build nisbiy yo‘llar bilan (base: './'), istalgan statik hostingda
 * server sozlamasisiz ishlaydi va sahifa yangilanganda 404 bo‘lmaydi.
 * Holat manbai — store; URL faqat uning aksi. Sahifa yangilanganda URL’dan holat tiklanadi.
 */

export type Route =
  | { screen: 'title' }
  | { screen: 'characterSelect' }
  | { screen: 'map' }
  | { screen: 'settings' }
  | { screen: 'auth' }
  | { screen: 'profile' }
  | { screen: 'quiz' }
  | { screen: 'leaderboard' }
  | { screen: 'briefing'; missionId: MissionId }
  | { screen: 'playing'; missionId: MissionId }
  | { screen: 'result'; missionId: MissionId };

const STATIC: Record<string, Route['screen']> = {
  '': 'title',
  qahramon: 'characterSelect',
  xarita: 'map',
  sozlamalar: 'settings',
  kirish: 'auth',
  profil: 'profile',
  sinov: 'quiz',
  reyting: 'leaderboard',
};
const SLUG = Object.fromEntries(Object.entries(STATIC).map(([slug, screen]) => [screen, slug])) as Record<string, string>;

const isMission = (id: string | undefined): id is MissionId => !!id && id in MISSIONS;

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('?')[0]!.split('/').filter(Boolean).map(decodeURIComponent);
  const [head = '', id, sub] = parts;
  if (head === 'missiya' && isMission(id)) return sub === 'oyin' ? { screen: 'playing', missionId: id } : { screen: 'briefing', missionId: id };
  if (head === 'natija' && isMission(id)) return { screen: 'result', missionId: id };
  const screen = STATIC[head];
  return screen ? ({ screen } as Route) : { screen: 'title' };
}

export function hashFor(route: Route): string {
  switch (route.screen) {
    case 'briefing':
      return `#/missiya/${route.missionId}`;
    case 'playing':
      return `#/missiya/${route.missionId}/oyin`;
    case 'result':
      return `#/natija/${route.missionId}`;
    default:
      return `#/${SLUG[route.screen] ?? ''}`;
  }
}

/** Store holatidan joriy marshrut */
export function routeFromState(s: Pick<GameStore, 'screen' | 'briefingMissionId' | 'mission' | 'lastResult'>): Route {
  switch (s.screen) {
    case 'briefing':
      return s.briefingMissionId ? { screen: 'briefing', missionId: s.briefingMissionId } : { screen: 'map' };
    case 'playing': {
      const id = s.mission?.missionId ?? s.briefingMissionId;
      return id ? { screen: 'playing', missionId: id } : { screen: 'map' };
    }
    case 'result':
      return s.lastResult ? { screen: 'result', missionId: s.lastResult.missionId } : { screen: 'map' };
    default:
      return { screen: s.screen } as Route;
  }
}

export function hashForScreen(screen: AppScreen): string {
  return hashFor(routeFromState({ ...useGameStore.getState(), screen }));
}

/** URL’dagi marshrutni store’ga qo‘llaydi (shartlar bilan: yopiq missiya → xarita va h.k.) */
export function applyRoute(route: Route): void {
  const s = useGameStore.getState();
  const hasCharacter = s.progress.selectedCharacter !== null;
  const needsCharacter = route.screen === 'map' || route.screen === 'briefing' || route.screen === 'playing' || route.screen === 'result';
  if (needsCharacter && !hasCharacter) return s.openCharacterSelect();

  switch (route.screen) {
    case 'briefing':
    case 'playing':
    case 'result': {
      if (s.progress.missions[route.missionId].status === 'locked') return s.goTo('map');
      if (route.screen === 'briefing') return s.openBriefing(route.missionId);
      if (route.screen === 'playing') return s.resumeMission(route.missionId);
      return s.showStoredResult(route.missionId) ? undefined : s.goTo('map');
    }
    case 'auth':
    case 'profile':
    case 'quiz':
    case 'leaderboard':
      return s.openAux(route.screen);
    case 'settings':
      return s.openSettings();
    case 'characterSelect':
      return s.openCharacterSelect();
    default:
      return s.goTo(route.screen);
  }
}

/**
 * Router’ni ishga tushiradi: boshlang‘ich URL’ni qo‘llaydi, store o‘zgarganda URL’ni yangilaydi,
 * «Orqaga/Oldinga» tugmalarini qo‘llab-quvvatlaydi. O‘yin paytida «Orqaga» bosilsa — pauza menyusi.
 */
export function startRouter(): () => void {
  let applying = false;
  const sync = (replace: boolean) => {
    const hash = hashFor(routeFromState(useGameStore.getState()));
    if (window.location.hash === hash || (hash === '#/' && window.location.hash === '')) return;
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  };

  applying = true;
  applyRoute(parseHash(window.location.hash));
  applying = false;
  sync(true);

  let prev = routeFromState(useGameStore.getState());
  const unsubscribe = useGameStore.subscribe((state) => {
    if (applying) return;
    const next = routeFromState(state);
    if (hashFor(next) === hashFor(prev)) return;
    // Brifingdan o‘yinga, o‘yindan natijaga — tarixni to‘ldirmaslik uchun almashtiramiz
    const replace = (prev.screen === 'briefing' && next.screen === 'playing') || (prev.screen === 'playing' && next.screen === 'result');
    prev = next;
    sync(replace);
  });

  const onPop = () => {
    const s = useGameStore.getState();
    const target = parseHash(window.location.hash);
    if (s.screen === 'playing' && s.mission && target.screen !== 'playing') {
      // Tasodifiy «Orqaga» — missiya progressi yo‘qolmasin: URL’ni qaytarib, pauza menyusini ochamiz
      window.history.pushState(null, '', hashFor(routeFromState(s)));
      s.dispatchMission({ type: 'PAUSE' });
      return;
    }
    applying = true;
    applyRoute(target);
    applying = false;
    prev = routeFromState(useGameStore.getState());
    // Shart bo‘yicha boshqa ekran ochilgan bo‘lsa (masalan, yopiq missiya), URL’ni to‘g‘rilaymiz
    sync(true);
  };
  window.addEventListener('popstate', onPop);

  return () => {
    unsubscribe();
    window.removeEventListener('popstate', onPop);
  };
}
