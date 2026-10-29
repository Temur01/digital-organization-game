// CSP’da 'unsafe-eval' yo‘q — Pixi shader kodini new Function’siz yaratishi uchun.
import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics, type FederatedPointerEvent } from 'pixi.js';
import { CHARACTERS } from '../content/characters';
import type { Direction, HotspotVisualState, InteractiveObject, Point, Rect, RoomDefinition } from '../types/models';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, type GameBridge, type SceneCommand } from './bridge';
import { CharacterView, drawDecor, drawDoneBadge, drawHotspot, drawRoomBackground, hotspotZ, isBackgroundDecor } from './draw';

const SPEED = 180; // px/s (mantiqiy)
const INTERACT_RADIUS = 56;
const FOOT = { w: 24, h: 12 };

interface HotspotEntry {
  def: InteractiveObject;
  view: Container;
  ring: Graphics;
  badge: Graphics;
  state: HotspotVisualState;
}

const MOVE_KEYS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function isNeutralTarget(target: EventTarget | null, container: HTMLElement): boolean {
  return target === document.body || target === null || (target instanceof Node && container.contains(target) && !(target instanceof HTMLButtonElement));
}

/** Pixi sahnasini konteynerga ulaydi. Qaytarilgan funksiya hamma narsani tozalaydi (StrictMode’ga chidamli). */
export function createScene(container: HTMLElement, bridge: GameBridge): () => void {
  const app = new Application();
  let destroyed = false;
  let teardown: (() => void) | null = null;

  app
    .init({
      width: Math.max(1, container.clientWidth),
      height: Math.max(1, container.clientHeight),
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
    })
    .then(() => {
      if (destroyed) {
        app.destroy({ removeView: true }, { children: true });
        return;
      }
      app.canvas.setAttribute('aria-hidden', 'true');
      container.appendChild(app.canvas);
      teardown = setup(app, container, bridge);
    })
    .catch((err: unknown) => {
      console.error('[scene] init xatosi', err);
      bridge.emit({ type: 'error' });
    });

  return () => {
    destroyed = true;
    if (teardown) {
      teardown();
      app.destroy({ removeView: true }, { children: true });
    }
  };
}

function setup(app: Application, container: HTMLElement, bridge: GameBridge): () => void {
  const root = new Container();
  const background = new Graphics();
  const world = new Container();
  world.sortableChildren = true;
  root.addChild(background, world);
  app.stage.addChild(root);
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  let room: RoomDefinition | null = null;
  let player: CharacterView | null = null;
  let blockers: Rect[] = [];
  const hotspots = new Map<string, HotspotEntry>();
  const keys = new Set<string>();
  let paused = true;
  let reducedMotion = false;
  let target: Point | null = null;
  let targetHotspot: string | null = null;
  let stuckTime = 0;
  let nearId: string | null = null;
  let scale = 1;
  let offset = { x: 0, y: 0 };
  let pulse = 0;

  // ---------- Layout ----------
  const emitLayout = () => {
    const rects: Record<string, Rect> = {};
    for (const [id, h] of hotspots) {
      if (h.state === 'hidden') continue;
      const b = h.def.bounds;
      rects[id] = { x: offset.x + b.x * scale, y: offset.y + b.y * scale, width: b.width * scale, height: b.height * scale };
    }
    bridge.emit({ type: 'hotspotLayout', rects });
  };

  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    app.renderer.resize(w, h);
    scale = Math.min(w / LOGICAL_WIDTH, h / LOGICAL_HEIGHT);
    offset = { x: (w - LOGICAL_WIDTH * scale) / 2, y: (h - LOGICAL_HEIGHT * scale) / 2 };
    root.scale.set(scale);
    root.position.set(offset.x, offset.y);
    app.stage.hitArea = app.screen;
    emitLayout();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  // ---------- Xona qurish ----------
  const loadRoom = (cmd: Extract<SceneCommand, { type: 'loadRoom' }>) => {
    room = cmd.room;
    world.removeChildren().forEach((c) => c.destroy({ children: true }));
    hotspots.clear();
    drawRoomBackground(background, room);

    blockers = room.decor.filter((d) => d.solid).map((d) => d.rect);
    for (const item of room.decor) {
      const g = new Graphics();
      drawDecor(g, item, room);
      g.zIndex = isBackgroundDecor(item) ? -2000 : item.rect.y + item.rect.height;
      world.addChild(g);
    }

    for (const def of cmd.hotspots) {
      const view = new Container();
      const b = def.bounds;
      if (def.kind === 'npc' && def.npc) {
        const npc = new CharacterView(def.npc.look);
        npc.position.set(b.x + b.width / 2, b.y + b.height);
        view.addChild(npc);
        blockers.push({ x: b.x + b.width / 2 - 16, y: b.y + b.height - 14, width: 32, height: 14 });
      } else {
        const g = new Graphics();
        drawHotspot(g, def.kind, b, room.theme.night ?? false);
        view.addChild(g);
      }
      const ring = new Graphics();
      ring.roundRect(b.x - 6, b.y - 6, b.width + 12, b.height + 12, 8).stroke({ width: 3, color: 0xffd166 });
      ring.visible = false;
      const badge = new Graphics();
      drawDoneBadge(badge, b);
      badge.visible = false;
      view.addChild(ring, badge);
      view.zIndex = hotspotZ(def.kind, b);
      world.addChild(view);
      hotspots.set(def.id, { def, view, ring, badge, state: 'idle' });
    }

    player = new CharacterView(CHARACTERS[cmd.characterId].look);
    player.position.set(room.spawn.x, room.spawn.y);
    world.addChild(player);
    target = null;
    targetHotspot = null;
    nearId = null;
    resize();
    bridge.emit({ type: 'ready' });
  };

  const setHotspotStates = (states: Record<string, HotspotVisualState>) => {
    let layoutChanged = false;
    for (const [id, state] of Object.entries(states)) {
      const h = hotspots.get(id);
      if (!h) continue;
      if ((h.state === 'hidden') !== (state === 'hidden')) layoutChanged = true;
      h.state = state;
      h.view.visible = state !== 'hidden';
      h.view.alpha = state === 'disabled' ? 0.75 : 1;
      h.badge.visible = state === 'done';
    }
    if (layoutChanged) emitLayout();
  };

  const arrive = () => {
    if (!player || !target) return;
    player.position.set(target.x, target.y);
    const id = targetHotspot;
    target = null;
    targetHotspot = null;
    if (id) bridge.emit({ type: 'hotspotActivated', hotspotId: id });
  };

  const walkToHotspot = (id: string) => {
    const h = hotspots.get(id);
    if (!h || h.state === 'hidden' || !player) return;
    target = { ...h.def.interactPoint };
    targetHotspot = id;
    stuckTime = 0;
    if (reducedMotion) arrive();
  };

  bridge.attach((cmd) => {
    switch (cmd.type) {
      case 'loadRoom':
        loadRoom(cmd);
        break;
      case 'setPaused':
        paused = cmd.paused;
        if (paused) {
          keys.clear();
          target = null;
          targetHotspot = null;
        }
        break;
      case 'walkToHotspot':
        if (!paused) walkToHotspot(cmd.hotspotId);
        break;
      case 'setHotspotStates':
        setHotspotStates(cmd.states);
        break;
      case 'setReducedMotion':
        reducedMotion = cmd.value;
        break;
    }
  });

  // ---------- Harakat va to‘qnashuv ----------
  const footRect = (p: Point): Rect => ({ x: p.x - FOOT.w / 2, y: p.y - FOOT.h, width: FOOT.w, height: FOOT.h });

  const clampToWalkable = (p: Point): Point => {
    if (!room) return p;
    const w = room.walkable;
    return {
      x: Math.min(Math.max(p.x, w.x + FOOT.w / 2), w.x + w.width - FOOT.w / 2),
      y: Math.min(Math.max(p.y, w.y + FOOT.h), w.y + w.height),
    };
  };

  const blocked = (p: Point) => blockers.some((b) => intersects(footRect(p), b));

  const tryMove = (dx: number, dy: number): boolean => {
    if (!player) return false;
    const start = { x: player.x, y: player.y };
    const nx = clampToWalkable({ x: player.x + dx, y: player.y });
    if (!blocked(nx)) player.x = nx.x;
    const ny = clampToWalkable({ x: player.x, y: player.y + dy });
    if (!blocked(ny)) player.y = ny.y;
    return Math.hypot(player.x - start.x, player.y - start.y) > 0.01;
  };

  const faceFrom = (dx: number, dy: number): Direction =>
    Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';

  app.ticker.add((ticker) => {
    if (!player || !room) return;
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    let moving = false;

    if (!paused) {
      let vx = 0;
      let vy = 0;
      for (const k of keys) {
        const v = MOVE_KEYS[k];
        if (v) {
          vx += v.x;
          vy += v.y;
        }
      }
      if (vx !== 0 || vy !== 0) {
        target = null;
        targetHotspot = null;
        const len = Math.hypot(vx, vy);
        moving = tryMove((vx / len) * SPEED * dt, (vy / len) * SPEED * dt);
        player.setDirection(faceFrom(vx, vy));
      } else if (target) {
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 3) {
          arrive();
        } else {
          const step = Math.min(dist, SPEED * dt);
          moving = tryMove((dx / dist) * step, (dy / dist) * step);
          player.setDirection(faceFrom(dx, dy));
          stuckTime = moving ? 0 : stuckTime + dt;
          // Oddiy to‘siq bo‘lsa — hotspotga yetkazib qo‘yamiz, oddiy nuqta bo‘lsa — to‘xtaymiz
          if (stuckTime > 0.35) {
            if (targetHotspot) arrive();
            else target = null;
          }
        }
      }

      let best: string | null = null;
      let bestDist = INTERACT_RADIUS;
      for (const [id, h] of hotspots) {
        if (h.state === 'hidden') continue;
        const d = Math.hypot(h.def.interactPoint.x - player.x, h.def.interactPoint.y - player.y);
        if (d < bestDist) {
          best = id;
          bestDist = d;
        }
      }
      if (best !== nearId) {
        nearId = best;
        bridge.emit({ type: 'nearHotspotChanged', hotspotId: best });
      }
    }

    player.animate(dt, moving, reducedMotion);
    player.zIndex = player.y;
    pulse += dt * 4;
    for (const [id, h] of hotspots) {
      h.ring.visible = id === nearId && !paused;
      h.ring.alpha = reducedMotion ? 1 : 0.65 + Math.sin(pulse) * 0.35;
    }
  });

  // ---------- Input ----------
  const onKeyDown = (e: KeyboardEvent) => {
    if (paused || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
    if (MOVE_KEYS[e.code]) {
      keys.add(e.code);
      e.preventDefault();
      return;
    }
    const interact = e.code === 'KeyE' || ((e.code === 'Enter' || e.code === 'Space') && isNeutralTarget(e.target, container));
    if (interact && nearId) {
      e.preventDefault();
      bridge.emit({ type: 'hotspotActivated', hotspotId: nearId });
    }
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const onBlur = () => keys.clear();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  const onTap = (e: FederatedPointerEvent) => {
    if (paused || !player) return;
    const local = root.toLocal(e.global);
    target = clampToWalkable({ x: local.x, y: local.y });
    targetHotspot = null;
    stuckTime = 0;
  };
  app.stage.on('pointertap', onTap);

  return () => {
    bridge.detach();
    observer.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    app.stage.off('pointertap', onTap);
  };
}
