import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CHARACTERS } from '../../content/characters';
import type { HotspotVisualState, InteractiveObject, Point, Rect, RoomDefinition } from '../../types/models';
import type { GameBridge, SceneCommand } from '../bridge';
import { buildDecor, buildHotspot, buildShell, type Animator, type BuiltHotspot } from './builders';
import { CharacterRig } from './characterRig';
import { buildAtmosphere, Bursts } from './fx';
import { clampToWalkable, faceFrom, footRect, fromX, fromZ, intersects, toX, toZ } from './space';
import * as tex from './textures';

const SPEED = 180; // mantiqiy px/s
const STEP_INTERVAL = 0.32; // qadam tovushlari orasidagi vaqt, s
const INTERACT_RADIUS = 56;
const INTRO_SECONDS = 1.6;
const MARKER_W = 0.5;
const MARKER_H = 0.62;
const CAMERA_POS = new THREE.Vector3(0, 6.1, 13.9);
const CAMERA_TARGET = new THREE.Vector3(0, 1.2, 3.05);
const CAMERA_START = new THREE.Vector3(-3.2, 9.5, 20);

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

interface HotspotEntry {
  def: InteractiveObject;
  built: BuiltHotspot;
  marker: THREE.Sprite;
  badge: THREE.Sprite;
  ring: THREE.Mesh;
  box: THREE.Box3;
  state: HotspotVisualState;
  visited: boolean;
  badgeAge: number;
  hop: number;
  seed: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
}

function isNeutralTarget(target: EventTarget | null, container: HTMLElement): boolean {
  return target === document.body || target === null || (target instanceof Node && container.contains(target) && !(target instanceof HTMLButtonElement));
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((m) => m.dispose());
  });
}

/**
 * Three.js sahnasi: 3D ofis + 2D illyustratsiyali qahramonlar («HD-2D»).
 * O‘yin mantig‘i (yurish, to‘qnashuv, yaqinlik) mantiqiy 2D koordinatalarda — missiya ma’lumotlari o‘zgarmaydi.
 */
export function createScene(container: HTMLElement, bridge: GameBridge): () => void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  } catch (err) {
    console.error('[scene] WebGL ishga tushmadi', err);
    queueMicrotask(() => bridge.emit({ type: 'error' }));
    return () => {};
  }

  const lowPower = window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b1a);
  const camera = new THREE.PerspectiveCamera(33, 16 / 9, 0.1, 80);
  camera.position.copy(CAMERA_POS);
  camera.lookAt(CAMERA_TARGET);

  const target = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: lowPower ? 0 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.93);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const bursts = new Bursts(scene);
  const raycaster = new THREE.Raycaster();

  // ---------- Holat ----------
  let alive = true;
  let room: RoomDefinition | null = null;
  let roomGroup: THREE.Group | null = null;
  let floorMesh: THREE.Object3D | null = null;
  let animators: Animator[] = [];
  let atmosphere: ((t: number, dt: number) => void) | null = null;
  let player: CharacterRig | null = null;
  let pos: Point = { x: 0, y: 0 };
  let blockers: Rect[] = [];
  const hotspots = new Map<string, HotspotEntry>();
  const keys = new Set<string>();
  let paused = true;
  let reducedMotion = false;
  let walkTarget: Point | null = null;
  let targetHotspot: string | null = null;
  let stuckTime = 0;
  let nearId: string | null = null;
  let time = 0;
  let introLeft = 0;
  let puffTimer = 0;
  let stepTimer = 0;
  let lastLayoutAt = 0;
  let layoutDirty = true;
  let loadToken = 0;
  let size = { w: 1, h: 1 };
  let tint = 0xffffff;

  // ---------- O‘lcham va layout ----------
  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    size = { w, h };
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layoutDirty = true;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  const projectBox = (b: THREE.Box3): Rect => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let i = 0;
    for (const x of [b.min.x, b.max.x])
      for (const y of [b.min.y, b.max.y])
        for (const z of [b.min.z, b.max.z]) {
          const v = corners[i++]!.set(x, y, z).project(camera);
          const sx = ((v.x + 1) / 2) * size.w;
          const sy = ((1 - v.y) / 2) * size.h;
          minX = Math.min(minX, sx);
          maxX = Math.max(maxX, sx);
          minY = Math.min(minY, sy);
          maxY = Math.max(maxY, sy);
        }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  const emitLayout = () => {
    const rects: Record<string, Rect> = {};
    for (const [id, h] of hotspots) {
      if (h.state === 'hidden') continue;
      rects[id] = projectBox(h.box);
    }
    bridge.emit({ type: 'hotspotLayout', rects });
  };

  // ---------- Yorug‘lik ----------
  const buildLights = (r: RoomDefinition): THREE.Group => {
    const g = new THREE.Group();
    const night = r.theme.night ?? false;
    g.add(new THREE.HemisphereLight(night ? 0x46588f : 0xe6f2ff, night ? 0x1d160f : 0xc9a77c, night ? 0.55 : 1.15));
    g.add(new THREE.AmbientLight(0xffffff, night ? 0.12 : 0.25));
    const key = new THREE.DirectionalLight(night ? 0x9fb4ff : 0xfff0d4, night ? 0.55 : 2.4);
    key.position.set(-4.5, 9, -2.5);
    key.target.position.set(1, 0, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -6;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    g.add(key, key.target);
    // Oldindan yumshoq to‘ldiruvchi nur (qahramonlar va old yuzalar uchun)
    const fill = new THREE.DirectionalLight(night ? 0x6c7cc8 : 0xdde8ff, night ? 0.35 : 0.6);
    fill.position.set(3, 5, 14);
    g.add(fill);
    renderer.toneMappingExposure = night ? 1.15 : 0.92;
    bloom.strength = night ? 0.7 : 0.28;
    scene.fog = new THREE.Fog(0x070b1a, 22, 45);
    tint = night ? 0xc3cbeb : 0xffffff;
    return g;
  };

  // ---------- Xona qurish ----------
  const clearRoom = () => {
    if (roomGroup) {
      scene.remove(roomGroup);
      disposeObject(roomGroup);
    }
    if (player) {
      scene.remove(player.root);
      player.dispose();
      player = null;
    }
    hotspots.clear();
    animators = [];
  };

  const loadRoom = (cmd: Extract<SceneCommand, { type: 'loadRoom' }>) => {
    const token = ++loadToken;
    clearRoom();
    room = cmd.room;
    const r = cmd.room;
    roomGroup = new THREE.Group();
    scene.add(roomGroup);

    const shell = buildShell(r);
    floorMesh = shell.getObjectByName('floor') ?? null;
    roomGroup.add(shell, buildLights(r));

    r.decor.forEach((item, i) => {
      const built = buildDecor(item, r, i + 1);
      if (!built) return;
      roomGroup!.add(built.object);
      if (built.animate) animators.push(built.animate);
    });
    const atmosphereGroup = new THREE.Scene();
    atmosphere = buildAtmosphere(r, atmosphereGroup as unknown as THREE.Scene);
    roomGroup.add(...atmosphereGroup.children);

    blockers = r.decor.filter((d) => d.solid).map((d) => d.rect);
    let seed = 0;
    for (const def of cmd.hotspots) {
      const npcTex = def.kind === 'npc' && def.npc ? tex.npcTexture(def.npc.look, def.id) : undefined;
      const built = buildHotspot(def, r, r.decor, npcTex, tint);
      if (def.kind === 'npc') {
        const b = def.bounds;
        blockers.push({ x: b.x + b.width / 2 - 16, y: b.y + b.height - 14, width: 32, height: 14 });
      }
      roomGroup.add(built.object);
      if (built.animate) animators.push(built.animate);

      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.marker(), color: 0xe6e6e6, transparent: true, depthTest: false }));
      marker.scale.set(MARKER_W, MARKER_H, 1);
      marker.position.copy(built.top);
      marker.renderOrder = 20;
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.checkBadge(), color: 0xe6e6e6, transparent: true, depthTest: false }));
      badge.position.copy(built.top).add(new THREE.Vector3(0, -0.05, 0));
      badge.visible = false;
      badge.renderOrder = 20;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.4, 48),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, depthWrite: false, toneMapped: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(toX(def.interactPoint.x), 0.02, toZ(def.interactPoint.y, r));
      ring.visible = false;
      roomGroup.add(marker, badge, ring);

      built.object.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(built.object);
      if (box.isEmpty()) box.setFromCenterAndSize(built.top, new THREE.Vector3(0.4, 0.4, 0.4));
      hotspots.set(def.id, { def, built, marker, badge, ring, box, state: 'idle', visited: false, badgeAge: 1, hop: 0, seed: seed++ });
    }

    walkTarget = null;
    targetHotspot = null;
    nearId = null;
    pos = { ...r.spawn };

    const character = CHARACTERS[cmd.characterId];
    CharacterRig.create(character, tint)
      .then((rig) => {
        if (!alive || token !== loadToken) {
          rig.dispose();
          return;
        }
        player = rig;
        rig.root.position.set(toX(pos.x), 0, toZ(pos.y, r));
        scene.add(rig.root);
        introLeft = reducedMotion ? 0 : INTRO_SECONDS;
        camera.position.copy(reducedMotion ? CAMERA_POS : CAMERA_START);
        camera.lookAt(CAMERA_TARGET);
        layoutDirty = true;
        bridge.emit({ type: 'ready' });
      })
      .catch((err: unknown) => {
        console.error('[scene] qahramon rasmi yuklanmadi', err);
        if (alive && token === loadToken) bridge.emit({ type: 'error' });
      });
  };

  const setHotspotStates = (states: Record<string, HotspotVisualState>) => {
    for (const [id, state] of Object.entries(states)) {
      const h = hotspots.get(id);
      if (!h) continue;
      const center = h.box.getCenter(new THREE.Vector3());
      if (state === 'done' && h.state !== 'done') {
        h.badgeAge = 0;
        if (h.state !== 'hidden') bursts.sparkle(center, 14, 0x34d399);
      }
      if (state === 'hidden' && h.state !== 'hidden') bursts.sparkle(center, 10);
      if ((h.state === 'hidden') !== (state === 'hidden')) layoutDirty = true;
      if (state === 'done' && h.state !== 'done' && h.def.kind === 'coffee') {
        // Kofe tayyorlanishi: qahramon kutadi, so‘ng ☕
        window.setTimeout(() => player?.showEmote('☕', 2.4), reducedMotion ? 0 : 1600);
      }
      h.state = state;
      h.built.object.visible = state !== 'hidden';
      h.badge.visible = state === 'done';
      h.built.setState?.(state);
    }
  };

  /** Obyektga qarab, sakrab, uchqun chiqarib — React’ga xabar beradi */
  const activate = (id: string) => {
    const h = hotspots.get(id);
    if (h && h.state === 'idle') h.visited = true;
    if (h && player) {
      const c = h.box.getCenter(new THREE.Vector3());
      player.setDirection(faceFrom(c.x - toX(pos.x), 0));
      player.playInteract();
      if (!reducedMotion) bursts.sparkle(c, 8);
    }
    bridge.emit({ type: 'hotspotActivated', hotspotId: id });
  };

  const arrive = () => {
    if (!walkTarget) return;
    pos = { ...walkTarget };
    const id = targetHotspot;
    walkTarget = null;
    targetHotspot = null;
    if (id) activate(id);
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
          walkTarget = null;
          targetHotspot = null;
        }
        break;
      case 'walkToHotspot': {
        const h = hotspots.get(cmd.hotspotId);
        if (paused || !h || h.state === 'hidden' || !player) break;
        walkTarget = { ...h.def.interactPoint };
        targetHotspot = cmd.hotspotId;
        stuckTime = 0;
        if (reducedMotion) arrive();
        break;
      }
      case 'setHotspotStates':
        setHotspotStates(cmd.states);
        break;
      case 'setReducedMotion':
        reducedMotion = cmd.value;
        break;
      case 'emote':
        player?.showEmote(cmd.symbol);
        break;
    }
  });

  // ---------- Harakat (mantiqiy 2D) ----------
  const blocked = (p: Point) => blockers.some((b) => intersects(footRect(p), b));
  const tryMove = (dx: number, dy: number): boolean => {
    if (!room) return false;
    const start = { ...pos };
    const nx = clampToWalkable({ x: pos.x + dx, y: pos.y }, room);
    if (!blocked(nx)) pos.x = nx.x;
    const ny = clampToWalkable({ x: pos.x, y: pos.y + dy }, room);
    if (!blocked(ny)) pos.y = ny.y;
    return Math.hypot(pos.x - start.x, pos.y - start.y) > 0.01;
  };

  // ---------- Kadr sikli ----------
  const timer = new THREE.Timer();
  timer.connect(document); // yashirin tabdan qaytganda katta «sakrash» bo‘lmasin
  renderer.setAnimationLoop((timestamp) => {
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    time += dt;
    if (!room) {
      composer.render(dt);
      return;
    }
    let moving = false;

    if (player && !paused) {
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
        walkTarget = null;
        targetHotspot = null;
        const len = Math.hypot(vx, vy);
        moving = tryMove((vx / len) * SPEED * dt, (vy / len) * SPEED * dt);
        player.setDirection(faceFrom(vx, vy));
      } else if (walkTarget) {
        const dx = walkTarget.x - pos.x;
        const dy = walkTarget.y - pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 3) {
          arrive();
        } else {
          const step = Math.min(dist, SPEED * dt);
          moving = tryMove((dx / dist) * step, (dy / dist) * step);
          player.setDirection(faceFrom(dx, dy));
          stuckTime = moving ? 0 : stuckTime + dt;
          if (stuckTime > 0.35) {
            if (targetHotspot) arrive();
            else walkTarget = null;
          }
        }
      }

      let best: string | null = null;
      let bestDist = INTERACT_RADIUS;
      for (const [id, h] of hotspots) {
        if (h.state === 'hidden') continue;
        const d = Math.hypot(h.def.interactPoint.x - pos.x, h.def.interactPoint.y - pos.y);
        if (d < bestDist) {
          best = id;
          bestDist = d;
        }
      }
      if (best !== nearId) {
        nearId = best;
        const h = best ? hotspots.get(best) : undefined;
        if (h?.def.kind === 'npc') h.hop = 0.45;
        bridge.emit({ type: 'nearHotspotChanged', hotspotId: best });
      }
    }

    if (player) {
      player.root.position.set(toX(pos.x), 0, toZ(pos.y, room));
      if (moving) {
        stepTimer -= dt;
        if (stepTimer <= 0) {
          bridge.emit({ type: 'footstep' });
          stepTimer = STEP_INTERVAL;
        }
      } else stepTimer = 0;
      if (moving && !reducedMotion) {
        puffTimer -= dt;
        if (puffTimer <= 0) {
          bursts.puff(player.root.position.x, player.root.position.z);
          puffTimer = 0.2;
        }
      }
      player.animate(dt, moving, reducedMotion, camera);
    }

    // Hotspotlar: «!» belgisi, yaqinlik halqasi, bajarilgan nishoni, NPC salomi
    for (const [id, h] of hotspots) {
      const near = id === nearId && !paused;
      const markerOn = h.state === 'idle' && !h.visited;
      h.marker.visible = markerOn;
      if (markerOn) {
        h.marker.position.y = h.built.top.y + (reducedMotion ? 0 : Math.sin(time * 3 + h.seed) * 0.06);
        const s = near ? 1.25 : 1;
        h.marker.scale.x += (MARKER_W * s - h.marker.scale.x) * Math.min(1, dt * 10);
        h.marker.scale.y += (MARKER_H * s - h.marker.scale.y) * Math.min(1, dt * 10);
      }
      h.ring.visible = near;
      if (near) {
        const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 5) * 0.08;
        h.ring.scale.setScalar(pulse);
        (h.ring.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(time * 5) * 0.2;
      }
      if (h.badge.visible) {
        h.badgeAge += dt;
        const k = reducedMotion ? 1 : easeOutBack(Math.min(1, h.badgeAge / 0.45));
        h.badge.scale.set(0.42 * k, 0.42 * k, 1);
      }
      if (h.hop > 0 && h.def.kind === 'npc') {
        h.hop -= dt;
        h.built.object.position.y = reducedMotion ? 0 : Math.sin((1 - Math.max(0, h.hop) / 0.45) * Math.PI) * 0.12;
      }
    }

    for (const a of animators) a(time, dt, reducedMotion);
    if (!reducedMotion) atmosphere?.(time, dt);
    bursts.update(dt);

    // Kamera: kirish animatsiyasi, so‘ng qahramonga yengil ergashish
    if (introLeft > 0) {
      introLeft -= dt;
      const k = easeOutCubic(1 - Math.max(0, introLeft) / INTRO_SECONDS);
      camera.position.lerpVectors(CAMERA_START, CAMERA_POS, k);
      camera.lookAt(CAMERA_TARGET);
      layoutDirty = true;
    }

    composer.render(dt);

    const now = performance.now();
    if (layoutDirty && now - lastLayoutAt > 90) {
      emitLayout();
      lastLayoutAt = now;
      layoutDirty = introLeft > 0;
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
      activate(nearId);
    }
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const onBlur = () => keys.clear();
  const ndc = new THREE.Vector2();
  const onPointer = (e: PointerEvent) => {
    if (paused || !player || !room || !floorMesh) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(floorMesh, false)[0];
    if (!hit) return;
    walkTarget = clampToWalkable({ x: fromX(hit.point.x), y: fromZ(hit.point.z, room) }, room);
    targetHotspot = null;
    stuckTime = 0;
    bursts.ripple(toX(walkTarget.x), toZ(walkTarget.y, room));
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  renderer.domElement.addEventListener('pointerdown', onPointer);

  return () => {
    alive = false;
    bridge.detach();
    observer.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    renderer.domElement.removeEventListener('pointerdown', onPointer);
    renderer.setAnimationLoop(null);
    timer.dispose();
    clearRoom();
    composer.dispose();
    target.dispose();
    tex.disposeTextures();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
