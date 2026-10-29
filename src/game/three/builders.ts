import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { DecorItem, HotspotVisualState, InteractiveObject, Rect, RoomDefinition } from '../../types/models';
import { floorDepth, ROOM_HALF_W, toX, toZ, WALL_HEIGHT_M, wallY } from './space';
import { cleanSingle, loadImage } from './spriteSheet';
import * as tex from './textures';

/** Har kadrda chaqiriladigan animatsiya funksiyasi */
export type Animator = (t: number, dt: number, reducedMotion: boolean) => void;

export interface Built {
  object: THREE.Object3D;
  animate?: Animator;
}

// ---------- Materiallar ----------

const std = (color: number | string, roughness = 0.7, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const M = {
  wood: () => std(0xa8743f, 0.55),
  woodDark: () => std(0x6f4a2f, 0.6),
  metal: () => std(0x3a3f4b, 0.35, 0.7),
  chrome: () => std(0xcfd6df, 0.2, 0.9),
  plastic: (c: number) => std(c, 0.45),
  fabric: (c: number) => std(c, 0.9),
  white: () => std(0xf3f5f8, 0.5),
};

function shadowed<T extends THREE.Object3D>(o: T, cast = true, receive = true): T {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = cast;
      c.receiveShadow = receive;
    }
  });
  return o;
}

function box(w: number, h: number, d: number, mat: THREE.Material, r = 0.02): THREE.Mesh {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  return new THREE.Mesh(geo, mat);
}

function cyl(rt: number, rb: number, h: number, mat: THREE.Material, seg = 24): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}

/** Pol jihozi uchun 2D to‘rtburchakdan 3D «iz» */
export function footprint(rect: Rect, room: RoomDefinition) {
  const x0 = toX(rect.x);
  const x1 = toX(rect.x + rect.width);
  const z0 = Math.max(0.05, toZ(rect.y, room));
  const z1 = Math.max(z0 + 0.3, toZ(rect.y + rect.height, room));
  return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
}

// ---------- Xona qobig‘i ----------

export function buildShell(room: RoomDefinition): THREE.Group {
  const g = new THREE.Group();
  const night = room.theme.night ?? false;
  const depth = floorDepth(room);
  const W = ROOM_HALF_W * 2;

  const theme = room.theme;
  const style = theme.floorStyle ?? 'oak';
  // Pol materiali xonaning «xarakteri»: tosh va terrazzo yaltiroq, gilam butunlay xira
  const floorMat =
    style === 'stone'
      ? std(0xffffff, 0.28, 0, { map: tex.stoneTiles() })
      : style === 'terrazzo'
        ? std(0xffffff, 0.34, 0, { map: tex.terrazzo() })
        : style === 'carpet'
          ? std(0xffffff, 0.98, 0, { map: tex.carpet(night ? '#2f3648' : '#6b7a86') })
          : std(0xffffff, 0.55, 0, { map: tex.woodFloor(night) });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, depth + 0.4), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, (depth + 0.4) / 2);
  floor.receiveShadow = true;
  floor.name = 'floor';
  g.add(floor);

  // Pol atrofidagi qorong‘i «sahna»
  const stage = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), std(0x0a0f22, 1));
  stage.rotation.x = -Math.PI / 2;
  stage.position.set(0, -0.02, 10);
  g.add(stage);

  const wallColor = theme.wallColor ?? (night ? '#4a5573' : '#e9eef2');
  const wallTex = tex.wallPaint(wallColor, wallColor);
  // null — panelsiz zamonaviy devor (faqat plintus)
  const wainscot = theme.wainscot === undefined ? (night ? 0x37415c : 0x2f6f73) : theme.wainscot;

  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, WALL_HEIGHT_M), std(0xffffff, 0.9, 0, { map: wallTex }));
  back.position.set(0, WALL_HEIGHT_M / 2, 0);
  back.receiveShadow = true;
  g.add(back);
  // Pastki panel (wainscoting) yoki faqat plintus
  if (wainscot !== null) {
    const panel = box(W, 0.9, 0.04, std(wainscot, 0.6), 0.01);
    panel.position.set(0, 0.45, 0.02);
    g.add(panel);
    const rail = box(W, 0.05, 0.06, std(0xf4f1ea, 0.4), 0.01);
    rail.position.set(0, 0.92, 0.04);
    g.add(rail);
  } else {
    const skirting = box(W, 0.1, 0.04, std(night ? 0x2a3245 : 0xf7f7f5, 0.5), 0.01);
    skirting.position.set(0, 0.05, 0.02);
    g.add(skirting);
  }

  const accentColor = theme.accent ?? (night ? 0x7589c7 : 0x3d9b91);
  const accent = std(accentColor, 0.4, 0.15, { emissive: accentColor, emissiveIntensity: night ? 0.24 : 0.08 });
  const wallFrame = std(night ? 0x303b59 : 0xd4dce2, 0.75);
  const upperTrim = box(W, 0.07, 0.08, accent, 0.015);
  upperTrim.position.set(0, WALL_HEIGHT_M - 0.24, 0.04);
  g.add(upperTrim);
  for (const x of [-ROOM_HALF_W + 0.18, ROOM_HALF_W - 0.18]) {
    const pilaster = box(0.11, WALL_HEIGHT_M - 1.05, 0.07, wallFrame, 0.02);
    pilaster.position.set(x, (WALL_HEIGHT_M + 1.05) / 2, 0.045);
    g.add(pilaster);
    const cap = box(0.2, 0.08, 0.1, accent, 0.02);
    cap.position.set(x, WALL_HEIGHT_M - 0.58, 0.06);
    g.add(cap);
  }
  const sign = new THREE.Group();
  const signPlate = box(0.72, 0.34, 0.045, std(night ? 0x17213b : 0xf5f7f8, 0.48), 0.045);
  const signMark = box(0.42, 0.045, 0.018, accent, 0.018);
  signMark.position.set(0, -0.08, 0.034);
  const signDot = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24), new THREE.MeshBasicMaterial({ color: accentColor, toneMapped: false }));
  signDot.position.set(-0.24, 0.07, 0.04);
  sign.add(signPlate, signMark, signDot);
  sign.position.set(0, WALL_HEIGHT_M - 0.48, 0.08);
  g.add(sign);

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(depth + 0.4, WALL_HEIGHT_M), std(0xffffff, 0.9, 0, { map: wallTex }));
    wall.position.set(side * ROOM_HALF_W, WALL_HEIGHT_M / 2, (depth + 0.4) / 2);
    wall.rotation.y = -side * (Math.PI / 2);
    wall.receiveShadow = true;
    g.add(wall);
    if (wainscot !== null) {
      const sidePanel = box(0.04, 0.9, depth + 0.4, std(wainscot, 0.6), 0.01);
      sidePanel.position.set(side * (ROOM_HALF_W - 0.02), 0.45, (depth + 0.4) / 2);
      g.add(sidePanel);
    }
  }
  // Shift chegarasi (yorug‘lik chizig‘i)
  const cove = box(W, 0.08, 0.12, std(0xffffff, 0.3, 0, { emissive: night ? 0x334a7a : 0xfff4dc, emissiveIntensity: night ? 0.8 : 0.3 }), 0.01);
  cove.position.set(0, WALL_HEIGHT_M - 0.04, 0.06);
  g.add(cove);
  return g;
}

// ---------- Jihozlar ----------

function onWall(rect: Rect, room: RoomDefinition, z = 0.03) {
  const yTop = wallY(rect.y, room);
  const yBot = wallY(Math.min(rect.y + rect.height, room.wallHeight), room);
  return { cx: toX(rect.x + rect.width / 2), cy: (yTop + yBot) / 2, w: rect.width / 80, h: Math.max(0.1, yTop - yBot), z };
}

function mug(color: number): Built {
  const g = new THREE.Group();
  const body = cyl(0.045, 0.04, 0.1, std(color, 0.4));
  body.position.y = 0.05;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 16, Math.PI), std(color, 0.4));
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.05, 0.05, 0);
  const coffee = cyl(0.04, 0.04, 0.005, std(0x4a2c17, 0.3));
  coffee.position.y = 0.098;
  g.add(body, handle, coffee);
  return { object: shadowed(g) };
}

/** Zamonaviy «qobiq» stul (majlis xonasi): o‘rindiq, suyanchiq va ingichka oyoqlar */
function shellChair(color: number): THREE.Group {
  const g = new THREE.Group();
  const shell = std(color, 0.55);
  const seat = box(0.46, 0.06, 0.44, shell, 0.03);
  seat.position.y = 0.46;
  const back = box(0.46, 0.42, 0.05, shell, 0.03);
  back.position.set(0, 0.7, -0.2);
  back.rotation.x = -0.12;
  g.add(seat, back);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = cyl(0.012, 0.012, 0.44, M.metal(), 8);
      leg.position.set(sx * 0.19, 0.22, sz * 0.17);
      g.add(leg);
    }
  return g;
}

/** Monstera bargi: yurak shaklidagi tekis shakl */
let leafGeo: THREE.ShapeGeometry | null = null;
function monsteraLeaf(): THREE.ShapeGeometry {
  if (!leafGeo) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(0.2, 0.04, 0.26, 0.32, 0.02, 0.46);
    sh.lineTo(0, 0.4);
    sh.lineTo(-0.02, 0.46);
    sh.bezierCurveTo(-0.26, 0.32, -0.2, 0.04, 0, 0);
    leafGeo = new THREE.ShapeGeometry(sh, 12);
  }
  return leafGeo;
}

export function buildDecor(item: DecorItem, room: RoomDefinition, seed: number): Built | null {
  const night = room.theme.night ?? false;
  const r = item.rect;
  switch (item.kind) {
    case 'window': {
      const p = onWall(r, room);
      const g = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshBasicMaterial({ map: tex.sky(night), toneMapped: false }));
      glass.position.set(0, 0, 0.01);
      const frameMat = std(0xf4f6f8, 0.35);
      const t = 0.07;
      for (const [w, h, x, y] of [
        [p.w + t * 2, t, 0, p.h / 2 + t / 2],
        [p.w + t * 2, t, 0, -p.h / 2 - t / 2],
        [t, p.h, -p.w / 2 - t / 2, 0],
        [t, p.h, p.w / 2 + t / 2, 0],
        [0.035, p.h, 0, 0],
        [p.w, 0.035, 0, 0],
      ] as const) {
        const b = box(w, h, 0.08, frameMat, 0.01);
        b.position.set(x, y, 0.04);
        g.add(b);
      }
      const sill = box(p.w + 0.3, 0.05, 0.22, std(0xf4f1ea, 0.4), 0.015);
      sill.position.set(0, -p.h / 2 - 0.1, 0.11);
      g.add(glass, shadowed(sill));
      g.position.set(p.cx, p.cy, 0.02);
      if (night) return { object: g };
      // Kunduzi derazadan polga tushgan iliq quyosh dog‘i — xona «tabiiy» ko‘rinadi
      const outer = new THREE.Group();
      const sun = new THREE.Mesh(
        new THREE.PlaneGeometry(p.w * 1.5, 2.6),
        new THREE.MeshBasicMaterial({
          map: tex.radialGlow('255,226,170'),
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      );
      sun.rotation.x = -Math.PI / 2;
      sun.position.set(p.cx + 0.4, 0.012, 1.5);
      outer.add(g, sun);
      return {
        object: outer,
        animate: (t, _dt, rm) => {
          if (!rm) sun.material.opacity = 0.3 + Math.sin(t * 0.25 + seed) * 0.03;
        },
      };
    }
    case 'wallArt': {
      const p = onWall(r, room);
      const g = new THREE.Group();
      const frame = box(p.w + 0.1, p.h + 0.1, 0.05, std(0x2b2d42, 0.5), 0.01);
      const art = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), std(0xffffff, 0.8, 0, { map: tex.abstractArt() }));
      art.position.z = 0.03;
      g.add(frame, art);
      g.position.set(p.cx, p.cy, 0.04);
      return { object: shadowed(g, true, false) };
    }
    case 'clock': {
      const p = onWall(r, room);
      const g = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(p.h / 2, p.h / 2, 0.06, 40), std(0x2b2d42, 0.35, 0.4));
      rim.rotation.x = Math.PI / 2;
      const face = new THREE.Mesh(new THREE.CircleGeometry(p.h / 2 - 0.03, 40), std(0xffffff, 0.6, 0, { map: tex.clockFace() }));
      face.position.z = 0.031;
      const handMat = std(0x2b2d42, 0.4);
      const minute = new THREE.Group();
      const mHand = box(0.02, p.h * 0.36, 0.01, handMat, 0);
      mHand.position.y = p.h * 0.18;
      minute.add(mHand);
      const hour = new THREE.Group();
      const hHand = box(0.028, p.h * 0.24, 0.01, handMat, 0);
      hHand.position.y = p.h * 0.12;
      hour.add(hHand);
      const second = new THREE.Group();
      const sHand = box(0.008, p.h * 0.42, 0.01, std(0xd1495b, 0.4), 0);
      sHand.position.y = p.h * 0.17;
      second.add(sHand);
      for (const [hand, z] of [
        [hour, 0.04],
        [minute, 0.045],
        [second, 0.05],
      ] as const) {
        hand.position.z = z;
        g.add(hand);
      }
      g.add(rim, face);
      g.position.set(p.cx, p.cy, 0.05);
      const start = night ? 21 * 60 + 47 : 9 * 60 + 3;
      return {
        object: shadowed(g, true, false),
        animate: (t, _dt, rm) => {
          const minutes = start + t / 6;
          second.rotation.z = rm ? 0 : -Math.floor(t) * ((Math.PI * 2) / 60);
          minute.rotation.z = -((minutes % 60) / 60) * Math.PI * 2;
          hour.rotation.z = -(((minutes / 60) % 12) / 12) * Math.PI * 2;
        },
      };
    }
    case 'shelf': {
      const p = onWall(r, room);
      const g = new THREE.Group();
      const d = 0.32;
      const wood = M.woodDark();
      const back = box(p.w, p.h, 0.03, wood, 0.01);
      back.position.z = 0.015;
      g.add(back);
      for (const y of [-p.h / 2, 0, p.h / 2]) {
        const s = box(p.w, 0.04, d, M.wood(), 0.01);
        s.position.set(0, y, d / 2);
        g.add(s);
      }
      for (const x of [-p.w / 2, p.w / 2]) {
        const s = box(0.04, p.h, d, M.wood(), 0.01);
        s.position.set(x, 0, d / 2);
        g.add(s);
      }
      const colors = [0xd1495b, 0x3d5a80, 0xf2b134, 0x2a9d8f, 0x7b5ea7, 0xe07a5f, 0xf4f1de];
      let k = seed;
      for (const row of [0, 1]) {
        let x = -p.w / 2 + 0.05;
        const baseY = row === 0 ? -p.h / 2 + 0.02 : 0.02;
        while (x < p.w / 2 - 0.07) {
          const bw = 0.04 + ((k * 13) % 4) * 0.012;
          const bh = p.h / 2 - 0.08 - ((k * 7) % 5) * 0.02;
          const b = box(bw, bh, d * 0.8, std(colors[k % colors.length]!, 0.7), 0.004);
          b.position.set(x + bw / 2, baseY + bh / 2, d * 0.45);
          if (k % 9 === 4) b.rotation.z = 0.18;
          g.add(b);
          x += bw + 0.008;
          k++;
        }
      }
      g.position.set(p.cx, p.cy, 0);
      return { object: shadowed(g) };
    }
    case 'lamp': {
      // Shiftdan osilgan chiroq — xona ichida, stollar ustida
      const g = new THREE.Group();
      const x = toX(r.x + r.width / 2);
      const z = 2.4;
      const y = 2.75;
      const cord = cyl(0.006, 0.006, WALL_HEIGHT_M + 0.6 - y, std(0x1d2433, 0.6));
      cord.position.set(0, (WALL_HEIGHT_M + 0.6 - y) / 2 + 0.18, 0);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.24, 32, 1, true), std(0x1d2433, 0.4, 0.3, { side: THREE.DoubleSide }));
      shade.position.y = 0.06;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c9, toneMapped: false }));
      bulb.position.y = -0.04;
      const light = new THREE.PointLight(0xffd59a, night ? 6 : 1.2, 7, 1.6);
      light.position.y = -0.12;
      g.add(cord, shade, bulb, light);
      g.position.set(x, y, z);
      return {
        object: g,
        animate: (t, _dt, rm) => {
          if (rm) return;
          g.rotation.z = Math.sin(t * 0.7 + seed) * 0.02;
          light.intensity = (night ? 6 : 1.2) * (0.97 + Math.sin(t * 3 + seed) * 0.03);
        },
      };
    }
    case 'rug': {
      const f = footprint(r, room);
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.d), std(0xffffff, 0.95, 0, { map: tex.ikatRug() }));
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(f.cx, 0.006, f.cz);
      rug.receiveShadow = true;
      return { object: rug };
    }
    case 'desk':
    case 'table': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const h = item.kind === 'desk' ? 0.76 : 0.7;
      const top = box(f.w, 0.06, f.d, item.kind === 'desk' ? M.wood() : std(0xd9c3a0, 0.5), 0.02);
      top.position.y = h;
      g.add(top);
      const legMat = M.metal();
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const leg = box(0.05, h, 0.05, legMat, 0.01);
          leg.position.set(sx * (f.w / 2 - 0.08), h / 2, sz * (f.d / 2 - 0.08));
          g.add(leg);
        }
      }
      if (item.kind === 'desk') {
        const panel = box(f.w - 0.2, 0.42, 0.03, std(0x2f6f73, 0.6), 0.01);
        panel.position.set(0, h - 0.24, -f.d / 2 + 0.06);
        const drawers = box(0.42, h - 0.1, f.d - 0.2, M.white(), 0.02);
        drawers.position.set(f.w / 2 - 0.3, (h - 0.1) / 2, 0);
        g.add(panel, drawers);
        for (let i = 0; i < 3; i++) {
          const handle = box(0.12, 0.015, 0.02, M.chrome(), 0.005);
          handle.position.set(f.w / 2 - 0.3, 0.14 + i * 0.2, f.d / 2 - 0.09);
          g.add(handle);
        }
        const m = mug([0xd1495b, 0x2a9d8f, 0xf2b134][seed % 3]!);
        m.object.position.set(-f.w / 2 + 0.35, h + 0.03, f.d * 0.15);
        const papers = box(0.3, 0.02, 0.22, std(0xffffff, 0.8), 0.004);
        papers.rotation.y = 0.2;
        papers.position.set(-f.w / 2 + 0.75, h + 0.04, f.d * 0.2);
        g.add(m.object, papers);
        if (night) {
          // Kechqurun: iliq stol chirog‘i o‘z yorug‘lik doirasi bilan
          const lamp = new THREE.Group();
          const baseL = cyl(0.08, 0.09, 0.02, std(0x1f2937, 0.4, 0.5), 20);
          const armL = cyl(0.012, 0.012, 0.42, std(0x1f2937, 0.4, 0.5), 8);
          armL.position.set(0.05, 0.21, 0);
          armL.rotation.z = -0.25;
          const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 20, 1, true), std(0x1f2937, 0.4, 0.5, { side: THREE.DoubleSide }));
          head.position.set(0.13, 0.42, 0);
          head.rotation.z = 0.6;
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false }));
          bulb.position.set(0.15, 0.39, 0);
          const pool = new THREE.PointLight(0xffc98a, 3.2, 2.6, 1.8);
          pool.position.set(0.2, 0.3, 0.1);
          lamp.add(baseL, armL, head, bulb, pool);
          lamp.position.set(-f.w / 2 + 0.2, h + 0.03, -f.d * 0.2);
          g.add(lamp);
        }
      }
      g.position.set(f.cx, 0, f.cz);
      return { object: shadowed(g) };
    }
    case 'counter': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const body = box(f.w, 1.02, f.d * 0.7, std(0x1e3a5f, 0.55), 0.04);
      body.position.y = 0.51;
      const accent = box(f.w * 0.86, 0.5, 0.02, std(0x2a9d8f, 0.4), 0.01);
      accent.position.set(0, 0.55, f.d * 0.35 + 0.01);
      const led = box(f.w * 0.9, 0.025, 0.02, new THREE.MeshBasicMaterial({ color: 0x7ff0e4, toneMapped: false }), 0);
      led.position.set(0, 0.15, f.d * 0.35 + 0.02);
      const top = box(f.w + 0.08, 0.06, f.d * 0.7 + 0.16, std(0xf1f3f5, 0.25), 0.02);
      top.position.y = 1.05;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 0.32),
        new THREE.MeshBasicMaterial({ map: tex.label('QABULXONA', '#0f172a', '#7ff0e4'), transparent: true }),
      );
      sign.position.set(0, 0.55, f.d * 0.35 + 0.025);
      g.add(body, accent, led, top, sign);
      g.position.set(f.cx, 0, f.cz);
      return { object: shadowed(g) };
    }
    case 'cabinet': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const h = 1.35;
      const body = box(f.w, h, Math.min(f.d, 0.7), std(0x9aa5b1, 0.45, 0.3), 0.02);
      body.position.y = h / 2;
      g.add(body);
      for (let i = 0; i < 3; i++) {
        const drawer = box(f.w - 0.08, h / 3 - 0.06, 0.02, std(0x8792a0, 0.45, 0.3), 0.01);
        drawer.position.set(0, h / 6 + (i * h) / 3, Math.min(f.d, 0.7) / 2 + 0.005);
        const handle = box(0.18, 0.025, 0.03, M.chrome(), 0.008);
        handle.position.set(0, h / 6 + (i * h) / 3 + 0.12, Math.min(f.d, 0.7) / 2 + 0.03);
        g.add(drawer, handle);
      }
      const plant = mug(0xffffff);
      plant.object.position.set(0, h, 0);
      g.add(plant.object);
      g.position.set(f.cx, 0, Math.min(f.z0 + 0.36, f.cz));
      return { object: shadowed(g) };
    }
    case 'chair': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const fabric = M.fabric(0x283a5c);
      const seat = box(0.5, 0.09, 0.48, fabric, 0.04);
      seat.position.y = 0.48;
      const back = box(0.48, 0.55, 0.07, fabric, 0.04);
      back.position.set(0, 0.82, 0.22);
      back.rotation.x = 0.08;
      const pole = cyl(0.025, 0.025, 0.4, M.chrome());
      pole.position.y = 0.26;
      g.add(seat, back, pole);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const leg = box(0.3, 0.03, 0.04, M.metal(), 0.01);
        leg.position.set(Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15);
        leg.rotation.y = -a;
        const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.metal());
        wheel.position.set(Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29);
        g.add(leg, wheel);
      }
      g.position.set(f.cx, 0, f.cz);
      g.rotation.y = Math.PI + (seed % 2 ? 0.25 : -0.2);
      return { object: shadowed(g) };
    }
    case 'plant': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const pot = cyl(0.22, 0.16, 0.42, std(0xc56b3c, 0.8));
      pot.position.y = 0.21;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), std(0xa85a30, 0.8));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.42;
      const soil = cyl(0.2, 0.2, 0.02, std(0x3b2a1e, 1));
      soil.position.y = 0.41;
      const leaves = new THREE.Group();
      leaves.position.y = 0.42;
      const greens = [0x3f8a4d, 0x4c9a5a, 0x5aad69, 0x2f7a43];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + seed;
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + (i % 3) * 0.03, 1), std(greens[i % greens.length]!, 0.7, 0, { flatShading: true }));
        const radius = i === 0 ? 0 : 0.16;
        leaf.position.set(Math.cos(a) * radius, 0.3 + (i % 3) * 0.16, Math.sin(a) * radius);
        leaf.scale.set(1, 1.5, 1);
        leaves.add(leaf);
      }
      g.add(pot, rim, soil, leaves);
      g.position.set(f.cx, 0, f.z1 - 0.3);
      return {
        object: shadowed(g),
        animate: (t, _dt, rm) => {
          leaves.rotation.z = rm ? 0 : Math.sin(t * 1.2 + seed) * 0.04;
          leaves.rotation.x = rm ? 0 : Math.cos(t * 0.9 + seed) * 0.03;
        },
      };
    }
    case 'kitchen': {
      // Devorga taqalgan oshxona peshtaxtasi: shkafchalar, rakovina, choynak, yuqori javon
      const f = footprint(r, room);
      const g = new THREE.Group();
      const d = 0.64;
      const h = 0.9;
      const base = box(f.w, h, d, std(0xf4f1ea, 0.5), 0.02);
      base.position.y = h / 2;
      const top = box(f.w + 0.04, 0.05, d + 0.04, std(0x3b4252, 0.3, 0.1), 0.01);
      top.position.y = h + 0.02;
      g.add(base, top);
      const doors = Math.max(2, Math.round(f.w / 0.6));
      for (let i = 0; i < doors; i++) {
        const dw = f.w / doors;
        const door = box(dw - 0.04, h - 0.16, 0.02, std(0x2f6f73, 0.5), 0.01);
        door.position.set(-f.w / 2 + dw * (i + 0.5), h / 2, d / 2 + 0.005);
        const knob = box(0.1, 0.015, 0.02, M.chrome(), 0.005);
        knob.position.set(-f.w / 2 + dw * (i + 0.5), h - 0.18, d / 2 + 0.03);
        g.add(door, knob);
      }
      const sink = box(0.42, 0.02, 0.32, M.chrome(), 0.01);
      sink.position.set(f.w / 2 - 0.4, h + 0.05, 0);
      const tap = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 16, Math.PI), M.chrome());
      tap.position.set(f.w / 2 - 0.4, h + 0.06, -0.12);
      const kettle = cyl(0.07, 0.09, 0.2, std(0xd1495b, 0.3, 0.2));
      kettle.position.set(-f.w / 2 + 0.25, h + 0.14, -0.05);
      const shelf = box(f.w * 0.7, 0.04, 0.24, M.wood(), 0.01);
      shelf.position.set(-f.w * 0.1, h + 0.75, -d / 2 + 0.12);
      g.add(sink, tap, kettle, shelf);
      [0xffffff, 0x2a9d8f, 0xf2b134, 0xffffff, 0xd1495b].forEach((c, i) => {
        const m = mug(c);
        m.object.position.set(-f.w * 0.1 - f.w * 0.3 + i * 0.16, h + 0.77, -d / 2 + 0.12);
        g.add(m.object);
      });
      g.position.set(f.cx, 0, f.z0 + d / 2);
      return { object: shadowed(g) };
    }
    case 'fridge': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const body = box(Math.min(f.w, 0.75), 1.85, 0.68, std(0xe5e9f0, 0.25, 0.4), 0.05);
      body.position.y = 0.925;
      const seam = box(Math.min(f.w, 0.75) - 0.04, 0.012, 0.01, std(0x9aa5b1, 0.4), 0);
      seam.position.set(0, 1.25, 0.345);
      const h1 = box(0.03, 0.4, 0.04, M.chrome(), 0.01);
      h1.position.set(Math.min(f.w, 0.75) / 2 - 0.08, 1.5, 0.37);
      const h2 = h1.clone();
      h2.position.y = 0.95;
      const magnet = box(0.12, 0.09, 0.01, std(0xf2b134, 0.6), 0.005);
      magnet.position.set(-0.12, 1.55, 0.35);
      g.add(body, seam, h1, h2, magnet);
      g.position.set(f.cx, 0, f.z0 + 0.36);
      return { object: shadowed(g) };
    }
    case 'bistro': {
      // Kafe stoli va ikkita kursi
      const f = footprint(r, room);
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 40), std(0xf4f1ea, 0.35));
      top.position.y = 0.74;
      const pole = cyl(0.03, 0.03, 0.72, M.metal());
      pole.position.y = 0.37;
      const foot = cyl(0.22, 0.24, 0.03, M.metal());
      foot.position.y = 0.015;
      g.add(top, pole, foot);
      for (const sx of [-1, 1]) {
        const stool = new THREE.Group();
        const seat = cyl(0.17, 0.17, 0.05, std(0xd1495b, 0.5));
        seat.position.y = 0.48;
        const leg = cyl(0.02, 0.02, 0.46, M.metal());
        leg.position.y = 0.23;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.01, 6, 20), M.metal());
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.2;
        stool.add(seat, leg, ring);
        stool.position.set(sx * 0.6, 0, 0.05);
        g.add(stool);
      }
      const m = mug(0x2a9d8f);
      m.object.position.set(0.12, 0.76, 0.05);
      const croissant = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.025, 8, 12, Math.PI * 1.3), std(0xd9a15b, 0.6));
      croissant.rotation.x = -Math.PI / 2;
      croissant.position.set(-0.12, 0.775, 0);
      g.add(m.object, croissant);
      g.position.set(f.cx, 0, f.cz);
      return { object: shadowed(g) };
    }
    case 'sofa': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const color = night ? 0x3b4a6b : [0x5f7f73, 0xb79f84, 0x47607a][seed % 3]!;
      const fabric = M.fabric(color);
      const w = f.w;
      const d = Math.min(f.d, 0.95);
      const base = box(w, 0.4, d, fabric, 0.08);
      base.position.y = 0.26;
      const back = box(w, 0.55, 0.22, fabric, 0.09);
      back.position.set(0, 0.62, -d / 2 + 0.11);
      g.add(base, back);
      for (const sx of [-1, 1]) {
        const arm = box(0.2, 0.58, d, fabric, 0.09);
        arm.position.set(sx * (w / 2 - 0.1), 0.35, 0);
        g.add(arm);
      }
      const n = Math.max(2, Math.round((w - 0.4) / 0.7));
      const cw = (w - 0.4) / n;
      const cushionMat = M.fabric(new THREE.Color(color).offsetHSL(0, 0, 0.05).getHex());
      for (let i = 0; i < n; i++) {
        const cushion = box(cw - 0.03, 0.14, d - 0.3, cushionMat, 0.06);
        cushion.position.set(-w / 2 + 0.2 + cw * (i + 0.5), 0.53, 0.05);
        g.add(cushion);
      }
      const pillow = box(0.38, 0.32, 0.12, M.fabric(room.theme.accent ?? 0xd1495b), 0.06);
      pillow.position.set(-w / 2 + 0.45, 0.72, -d / 2 + 0.3);
      pillow.rotation.set(-0.25, 0.25, 0.1);
      g.add(pillow);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const leg = cyl(0.025, 0.018, 0.08, M.woodDark(), 10);
          leg.position.set(sx * (w / 2 - 0.12), 0.04, sz * (d / 2 - 0.12));
          g.add(leg);
        }
      g.position.set(f.cx, 0, f.cz);
      return { object: shadowed(g) };
    }
    case 'monstera': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const potColor = seed % 2 ? 0xf1ede6 : 0xc56b3c;
      const pot = cyl(0.24, 0.19, 0.5, std(potColor, 0.75), 32);
      pot.position.y = 0.25;
      const soil = cyl(0.22, 0.22, 0.02, std(0x3b2a1e, 1));
      soil.position.y = 0.49;
      g.add(pot, soil);
      const crown = new THREE.Group();
      crown.position.y = 0.5;
      const greens = [0x2f6f3e, 0x3a7d48, 0x26603a, 0x45894f];
      const count = 11;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + seed * 0.7;
        const len = 0.55 + ((i * 37 + seed * 11) % 7) * 0.09;
        const pivot = new THREE.Group();
        pivot.rotation.y = a;
        const arm = new THREE.Group();
        arm.rotation.x = 0.28 + (i % 3) * 0.16;
        const stem = cyl(0.008, 0.011, len, std(0x4f7a3a, 0.7), 6);
        stem.position.y = len / 2;
        const leaf = new THREE.Mesh(monsteraLeaf(), std(greens[i % greens.length]!, 0.55, 0, { side: THREE.DoubleSide }));
        leaf.position.y = len;
        leaf.rotation.x = 0.9 + (i % 2) * 0.3;
        leaf.scale.setScalar(0.85 + (i % 4) * 0.12);
        arm.add(stem, leaf);
        pivot.add(arm);
        crown.add(pivot);
      }
      g.add(crown);
      g.position.set(f.cx, 0, f.z1 - 0.35);
      return {
        object: shadowed(g),
        animate: (t, _dt, rm) => {
          crown.rotation.z = rm ? 0 : Math.sin(t * 0.8 + seed) * 0.025;
          crown.rotation.x = rm ? 0 : Math.cos(t * 0.6 + seed) * 0.02;
        },
      };
    }
    case 'pendant': {
      // Zamonaviy opal shar chiroq — rect ostidagi pol nuqtasi ustida osiladi
      const g = new THREE.Group();
      const x = toX(r.x + r.width / 2);
      const z = Math.max(0.6, toZ(r.y + r.height / 2, room));
      const y = 2.5;
      const cordLen = WALL_HEIGHT_M + 0.6 - y;
      const cord = cyl(0.005, 0.005, cordLen, std(0x1d2433, 0.6), 6);
      cord.position.y = cordLen / 2 + 0.16;
      const cap = cyl(0.05, 0.07, 0.06, std(0xb08d57, 0.3, 0.8), 20);
      cap.position.y = 0.16;
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 32, 20),
        std(0xfff6e5, 0.35, 0, { emissive: 0xffe2b0, emissiveIntensity: night ? 1.6 : 0.7 }),
      );
      const light = new THREE.PointLight(0xffd9a0, night ? 7 : 1.6, 6.5, 1.7);
      light.position.y = -0.2;
      g.add(cord, cap, globe, light);
      g.position.set(x, y, z);
      return {
        object: g,
        animate: (t, _dt, rm) => {
          if (!rm) g.rotation.z = Math.sin(t * 0.6 + seed) * 0.015;
        },
      };
    }
    case 'slats': {
      // Akustik yog‘och reykalar (zamonaviy ofis devori)
      const p = onWall(r, room);
      const g = new THREE.Group();
      const felt = box(p.w, p.h, 0.02, std(night ? 0x1f2533 : 0x2b2f36, 0.95), 0.005);
      g.add(felt);
      const wood = std(night ? 0x8a6a4a : 0xb98a5a, 0.5);
      const n = Math.floor(p.w / 0.075);
      for (let i = 0; i < n; i++) {
        const bat = box(0.042, p.h - 0.02, 0.045, wood, 0.006);
        bat.position.set(-p.w / 2 + 0.04 + i * (p.w / n), 0, 0.03);
        g.add(bat);
      }
      g.position.set(p.cx, p.cy, 0.02);
      return { object: shadowed(g, true, true) };
    }
    case 'tv': {
      const p = onWall(r, room);
      const g = new THREE.Group();
      const frame = box(p.w + 0.06, p.h + 0.06, 0.05, std(0x0b0f19, 0.3, 0.3), 0.012);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshBasicMaterial({ map: tex.tvSlide(), toneMapped: false }));
      screen.position.z = 0.027;
      const bar = box(p.w * 0.7, 0.06, 0.08, std(0x111827, 0.4), 0.02);
      bar.position.set(0, -p.h / 2 - 0.14, 0.03);
      g.add(frame, screen, bar);
      g.position.set(p.cx, p.cy, 0.04);
      return { object: shadowed(g, true, false) };
    }
    case 'balloons': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const colors = [0xf472b6, 0xa78bfa, 0xfbbf24, 0x34d399, 0x60a5fa];
      const weight = cyl(0.05, 0.06, 0.07, std(0x9ca3af, 0.3, 0.8), 16);
      weight.position.y = 0.035;
      g.add(weight);
      const items: { mesh: THREE.Group; base: THREE.Vector3; k: number }[] = [];
      colors.forEach((c, i) => {
        const b = new THREE.Group();
        const top = new THREE.Vector3(Math.cos(i * 1.3) * 0.22, 1.75 + (i % 3) * 0.22, Math.sin(i * 1.3) * 0.16);
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.17, 24, 18),
          new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 }),
        );
        ball.scale.set(1, 1.18, 1);
        const knot = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.04, 8), std(c, 0.4));
        knot.position.y = -0.21;
        knot.rotation.x = Math.PI;
        b.add(ball, knot);
        b.position.copy(top);
        const len = top.length() - 0.2;
        const string = cyl(0.002, 0.002, len, std(0xffffff, 0.6), 4);
        string.position.copy(
          top
            .clone()
            .multiplyScalar(0.5)
            .setY((top.y - 0.2) / 2 + 0.07),
        );
        string.lookAt(top.x, top.y, top.z);
        string.rotateX(Math.PI / 2);
        g.add(b, string);
        items.push({ mesh: b, base: top, k: i });
      });
      g.position.set(f.cx, 0, f.cz);
      return {
        object: shadowed(g, true, false),
        animate: (t, _dt, rm) => {
          if (rm) return;
          for (const it of items) {
            it.mesh.position.y = it.base.y + Math.sin(t * 1.1 + it.k) * 0.04;
            it.mesh.rotation.z = Math.sin(t * 0.7 + it.k) * 0.08;
          }
        },
      };
    }
    case 'meetingTable': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const h = 0.74;
      const top = box(f.w, 0.06, f.d, std(0x7a5236, 0.45), 0.03);
      top.position.y = h;
      g.add(top);
      for (const sx of [-1, 1]) {
        const leg = box(0.08, h, f.d * 0.6, std(0x1f2937, 0.4, 0.5), 0.02);
        leg.position.set(sx * (f.w / 2 - 0.35), h / 2, 0);
        g.add(leg);
      }
      // Stulchalar: devor tomonda va ikki uchida (old tomoni o‘yinchi uchun ochiq)
      const chairColor = night ? 0x475569 : [0xe9e4dc, 0x3f4b5b][seed % 2]!;
      const n = Math.max(2, Math.floor(f.w / 0.75));
      for (let i = 0; i < n; i++) {
        const c = shellChair(chairColor);
        c.position.set(-f.w / 2 + (f.w / n) * (i + 0.5), 0, -f.d / 2 - 0.25);
        g.add(c);
      }
      for (const sx of [-1, 1]) {
        const c = shellChair(chairColor);
        c.position.set(sx * (f.w / 2 + 0.3), 0, 0);
        c.rotation.y = sx * (Math.PI / 2);
        g.add(c);
      }
      // Stol ustida: noutbuk yopiq, shisha suv, tort
      const water = cyl(0.035, 0.035, 0.2, std(0xbfe3f5, 0.05, 0, { transparent: true, opacity: 0.45 }), 16);
      water.position.set(-f.w / 2 + 0.6, h + 0.13, 0);
      const cake = new THREE.Group();
      const sponge = cyl(0.2, 0.2, 0.14, std(0xf5e6d3, 0.7), 32);
      sponge.position.y = 0.07;
      const icing = cyl(0.205, 0.205, 0.03, std(0xf472b6, 0.4), 32);
      icing.position.y = 0.15;
      cake.add(sponge, icing);
      for (let i = 0; i < 5; i++) {
        const candle = cyl(0.008, 0.008, 0.08, std(0xfbbf24, 0.5), 6);
        candle.position.set(Math.cos(i * 1.26) * 0.11, 0.2, Math.sin(i * 1.26) * 0.11);
        cake.add(candle);
      }
      cake.position.set(-f.w * 0.15, h + 0.03, 0.02);
      g.add(water, cake);
      g.position.set(f.cx, 0, f.cz);
      return { object: shadowed(g) };
    }
    case 'glassWall': {
      // Xira shisha devor bo‘lagi (majlis xonasi va yo‘lak orasida)
      const p = onWall(r, room);
      const g = new THREE.Group();
      const corridor = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), std(night ? 0x1e2638 : 0xd7dee6, 0.9));
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(p.w, p.h),
        new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.35, clearcoat: 1 }),
      );
      glass.position.z = 0.03;
      const frost = box(p.w, 0.16, 0.01, std(0xffffff, 0.9, 0, { transparent: true, opacity: 0.7 }), 0);
      frost.position.set(0, -p.h * 0.1, 0.035);
      g.add(corridor, glass, frost);
      const mullion = std(0x1f2937, 0.4, 0.6);
      const cols = Math.max(2, Math.round(p.w / 0.9));
      for (let i = 0; i <= cols; i++) {
        const m = box(0.035, p.h, 0.05, mullion, 0.005);
        m.position.set(-p.w / 2 + (p.w / cols) * i, 0, 0.04);
        g.add(m);
      }
      g.position.set(p.cx, p.cy, 0.02);
      return { object: g };
    }
    case 'cooler': {
      const f = footprint(r, room);
      const g = new THREE.Group();
      const base = box(0.38, 0.95, 0.38, M.white(), 0.04);
      base.position.y = 0.475;
      const tap1 = box(0.04, 0.05, 0.05, std(0xd1495b, 0.4), 0.01);
      tap1.position.set(-0.07, 0.72, 0.2);
      const tap2 = tap1.clone();
      (tap2 as THREE.Mesh).material = std(0x3d5a80, 0.4);
      tap2.position.x = 0.07;
      const bottle = cyl(0.16, 0.16, 0.42, std(0x8ecae6, 0.1, 0, { transparent: true, opacity: 0.55 }));
      bottle.position.y = 1.17;
      const cap = cyl(0.06, 0.06, 0.06, std(0x3d5a80, 0.4));
      cap.position.y = 0.95;
      g.add(base, tap1, tap2, bottle, cap);
      const bubbles = Array.from({ length: 5 }, () => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
        g.add(b);
        return b;
      });
      g.position.set(f.cx, 0, f.z1 - 0.3);
      return {
        object: shadowed(g),
        animate: (t, _dt, rm) => {
          bubbles.forEach((b, i) => {
            const k = rm ? 0.5 : (t * 0.3 + i / bubbles.length) % 1;
            b.position.set(Math.sin(i * 2.1) * 0.08, 0.99 + k * 0.36, Math.cos(i * 1.7) * 0.08);
            (b.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
          });
        },
      };
    }
  }
  return null;
}

// ---------- Interaktiv obyektlar ----------

export interface BuiltHotspot extends Built {
  /** «!» belgisi uchun obyektning yuqori nuqtasi */
  top: THREE.Vector3;
  /** Holat o‘zgarganda chaqiriladi (telefon titrashini to‘xtatish, kofe qaynatish va h.k.) */
  setState?(state: HotspotVisualState): void;
}

/** Stol/peshtaxta ustidagi obyekt uchun sirt balandligi va chuqurligi */
function surfaceUnder(def: InteractiveObject, decor: DecorItem[], room: RoomDefinition) {
  const cx = def.bounds.x + def.bounds.width / 2;
  const surfaces = decor.filter(
    (d) =>
      (d.kind === 'desk' || d.kind === 'table' || d.kind === 'meetingTable' || d.kind === 'counter' || d.kind === 'kitchen') &&
      cx >= d.rect.x &&
      cx <= d.rect.x + d.rect.width,
  );
  const zWanted = toZ(def.bounds.y + def.bounds.height, room);
  let best: { y: number; z: number } | null = null;
  let bestDist = Infinity;
  for (const s of surfaces) {
    const f = footprint(s.rect, room);
    const y = s.kind === 'desk' ? 0.79 : s.kind === 'table' ? 0.73 : s.kind === 'meetingTable' ? 0.77 : s.kind === 'kitchen' ? 0.94 : 1.08;
    // Oshxona peshtaxtasi devorga taqalgan — chuqurligi kichik
    const z = s.kind === 'kitchen' ? f.z0 + 0.32 : Math.min(Math.max(zWanted, f.z0 + 0.25), f.z1 - 0.25);
    const dist = Math.abs(zWanted - z);
    if (dist < bestDist) {
      bestDist = dist;
      best = { y, z };
    }
  }
  return best ?? { y: 0.79, z: zWanted };
}

function quoted(text: string, fallback: string): string {
  return /«([^»]+)»/.exec(text)?.[1] ?? fallback;
}

function monitor(withNote: boolean): { group: THREE.Group; cursor: THREE.Mesh } {
  const g = new THREE.Group();
  const bezel = box(0.66, 0.42, 0.04, std(0x1d2433, 0.35, 0.2), 0.015);
  bezel.position.y = 0.36;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), new THREE.MeshBasicMaterial({ map: tex.screenUi('mail'), toneMapped: false }));
  screen.position.set(0, 0.36, 0.021);
  const cursor = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.012), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  cursor.position.set(-0.03, 0.29, 0.022);
  const neck = box(0.05, 0.16, 0.04, M.chrome(), 0.01);
  neck.position.set(0, 0.1, -0.02);
  const foot = box(0.24, 0.02, 0.16, M.chrome(), 0.008);
  foot.position.set(0, 0.01, -0.02);
  const keyboard = box(0.46, 0.02, 0.15, std(0xe5e7eb, 0.5), 0.008);
  keyboard.position.set(0, 0.01, 0.24);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), std(0xe5e7eb, 0.4));
  mouse.scale.set(1, 0.5, 1.4);
  mouse.position.set(0.32, 0.015, 0.25);
  g.add(bezel, screen, cursor, neck, foot, keyboard, mouse);
  if (withNote) {
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), std(0xffffff, 0.8, 0, { map: tex.stickyNote() }));
    note.position.set(0.25, 0.5, 0.023);
    note.rotation.z = -0.12;
    g.add(note);
  }
  shadowed(g);
  screen.castShadow = false;
  return { group: g, cursor };
}

/** Noutbuk (tungi ofis, kafe): ochiq qopqoq, ekran va klaviatura */
function laptop(): { group: THREE.Group; cursor: THREE.Mesh } {
  const g = new THREE.Group();
  const alu = std(0xc7ccd4, 0.3, 0.8);
  const base = box(0.4, 0.018, 0.27, alu, 0.01);
  base.position.y = 0.009;
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), std(0x1f2937, 0.6));
  keys.rotation.x = -Math.PI / 2;
  keys.position.set(0, 0.0185, -0.03);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.07), std(0xb4bac3, 0.35, 0.6));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, 0.0185, 0.08);
  const lid = new THREE.Group();
  lid.position.set(0, 0.018, -0.135);
  lid.rotation.x = -0.22;
  const shell = box(0.4, 0.26, 0.012, alu, 0.01);
  shell.position.y = 0.13;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.22), new THREE.MeshBasicMaterial({ map: tex.screenUi('mail'), toneMapped: false }));
  screen.position.set(0, 0.135, 0.007);
  const cursor = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.008), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  cursor.position.set(-0.02, 0.1, 0.008);
  lid.add(shell, screen, cursor);
  g.add(base, keys, pad, lid);
  shadowed(g);
  screen.castShadow = false;
  return { group: g, cursor };
}

/** Moslashuvchan «hammasi bittada» kompyuter (qabulxona): ingichka oq korpus */
function allInOne(): { group: THREE.Group; cursor: THREE.Mesh } {
  const g = new THREE.Group();
  const white = std(0xf3f4f6, 0.35, 0.1);
  const body = box(0.62, 0.42, 0.025, white, 0.02);
  body.position.y = 0.4;
  const chin = box(0.62, 0.07, 0.03, white, 0.015);
  chin.position.y = 0.17;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.36), new THREE.MeshBasicMaterial({ map: tex.screenUi('mail'), toneMapped: false }));
  screen.position.set(0, 0.41, 0.014);
  const cursor = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.012), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  cursor.position.set(-0.03, 0.34, 0.015);
  const stand = box(0.14, 0.2, 0.02, std(0xc7ccd4, 0.3, 0.8), 0.008);
  stand.position.set(0, 0.1, -0.06);
  stand.rotation.x = 0.25;
  const foot = box(0.2, 0.012, 0.16, std(0xc7ccd4, 0.3, 0.8), 0.006);
  foot.position.set(0, 0.006, -0.06);
  const keyboard = box(0.42, 0.012, 0.12, white, 0.006);
  keyboard.position.set(0, 0.006, 0.22);
  g.add(body, chin, screen, cursor, stand, foot, keyboard);
  shadowed(g);
  screen.castShadow = false;
  return { group: g, cursor };
}

export function buildHotspot(def: InteractiveObject, room: RoomDefinition, decor: DecorItem[], npcTexture?: THREE.Texture, tint = 0xffffff): BuiltHotspot {
  const b = def.bounds;
  const cx = toX(b.x + b.width / 2);
  const night = room.theme.night ?? false;
  const g = new THREE.Group();
  let animate: Animator | undefined;
  let setState: ((state: HotspotVisualState) => void) | undefined;

  switch (def.kind) {
    case 'computer':
    case 'note': {
      const s = surfaceUnder(def, decor, room);
      // Har bir xonada o‘z kompyuteri: ofisda monitor, kechqurun va kafeda noutbuk, qabulxonada «hammasi bittada»
      const look = def.kind === 'note' ? 'monitor' : (room.theme.computer ?? 'monitor');
      const { group, cursor } = look === 'laptop' ? laptop() : look === 'allInOne' ? allInOne() : monitor(def.kind === 'note');
      g.add(group);
      g.position.set(cx, s.y, s.z - (look === 'laptop' ? 0.05 : 0.15));
      if (night) {
        const glow = new THREE.PointLight(0x8fd3ff, 2.2, 3, 1.8);
        glow.position.set(0, 0.4, 0.4);
        g.add(glow);
      }
      animate = (t) => {
        cursor.visible = Math.floor(t * 2) % 2 === 0;
      };
      break;
    }
    case 'phone': {
      const s = surfaceUnder(def, decor, room);
      const body = box(0.09, 0.012, 0.18, std(0x111827, 0.3, 0.4), 0.008);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.16), new THREE.MeshBasicMaterial({ map: tex.phoneScreen(), toneMapped: false }));
      screen.rotation.x = -Math.PI / 2;
      screen.position.y = 0.007;
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex.radialGlow('239,68,68'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      halo.scale.set(0.5, 0.5, 1);
      halo.position.y = 0.05;
      g.add(shadowed(body), screen, halo);
      g.position.set(cx, s.y, s.z);
      g.rotation.y = 0.3;
      let ringing = true;
      setState = (state) => {
        ringing = state === 'idle';
        halo.visible = ringing;
      };
      animate = (t, _dt, rm) => {
        const buzz = ringing && !rm && t % 2.2 < 0.5;
        g.position.x = cx + (buzz ? Math.sin(t * 90) * 0.006 : 0);
        g.rotation.y = 0.3 + (buzz ? Math.sin(t * 70) * 0.05 : 0);
        halo.material.opacity = ringing ? 0.5 + Math.sin(t * 6) * 0.3 : 0;
      };
      break;
    }
    case 'device': {
      const z = toZ(b.y + b.height, room);
      const body = box(0.1, 0.025, 0.04, std(0x2563eb, 0.35), 0.008);
      const cap = box(0.035, 0.018, 0.03, M.chrome(), 0.004);
      cap.position.x = 0.065;
      const tag = box(0.03, 0.026, 0.042, std(0xffd166, 0.5), 0.004);
      tag.position.x = -0.03;
      const glint = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex.sparkleStar(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      glint.position.set(0.05, 0.08, 0);
      g.add(shadowed(body), cap, tag, glint);
      g.position.set(cx, 0.0125, z);
      g.rotation.y = 0.6;
      animate = (t, _dt, rm) => {
        const k = rm ? 0.6 : Math.abs(Math.sin(t * 2.4));
        glint.scale.setScalar(0.08 + k * 0.14);
        glint.material.rotation = rm ? 0 : t;
      };
      break;
    }
    case 'poster': {
      const p = onWall(b, room);
      if (/doska/i.test(def.label)) {
        // Oq doska: alyuminiy ramka, marker yozuvlari va marker tokchasi
        const frame = box(p.w + 0.08, p.h + 0.08, 0.035, std(0xc7ccd4, 0.3, 0.8), 0.01);
        const surface = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), std(0xffffff, 0.25, 0, { map: tex.whiteboard() }));
        surface.position.z = 0.02;
        const tray = box(p.w * 0.6, 0.03, 0.08, std(0xc7ccd4, 0.3, 0.8), 0.008);
        tray.position.set(0, -p.h / 2 - 0.05, 0.05);
        g.add(frame, surface, tray);
        [0x1d4ed8, 0xdc2626, 0x111827].forEach((c, i) => {
          const marker = cyl(0.012, 0.012, 0.12, std(c, 0.4), 8);
          marker.rotation.z = Math.PI / 2;
          marker.position.set(-0.12 + i * 0.12, -p.h / 2 - 0.025, 0.06);
          g.add(marker);
        });
        g.position.set(p.cx, p.cy, 0.05);
        break;
      }
      const title = quoted(def.ariaLabel, def.label);
      const accent = /IT/i.test(title) ? '#3d5a80' : '#d1495b';
      const frame = box(p.w + 0.06, p.h + 0.06, 0.03, std(0xdfe3e8, 0.4), 0.01);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), std(0xffffff, 0.7, 0, { map: tex.poster(title, accent) }));
      paper.position.z = 0.02;
      g.add(frame, paper);
      g.position.set(p.cx, p.cy, 0.05);
      break;
    }
    case 'door': {
      const p = onWall(b, room);
      const frame = box(p.w + 0.16, p.h + 0.08, 0.1, std(0x5b3a26, 0.5), 0.02);
      frame.position.y = 0.04;
      const slab = box(p.w, p.h, 0.06, std(0x8d5e3c, 0.5), 0.015);
      slab.position.z = 0.04;
      for (const y of [p.h * 0.22, -p.h * 0.22]) {
        const inset = box(p.w * 0.7, p.h * 0.32, 0.02, std(0x7a4f31, 0.5), 0.01);
        inset.position.set(0, y, 0.075);
        g.add(inset);
      }
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), std(0xf2b134, 0.25, 0.8));
      knob.position.set(p.w / 2 - 0.12, -0.05, 0.1);
      const title = def.label.split(' ')[0]?.toUpperCase() ?? 'XONA';
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), new THREE.MeshBasicMaterial({ map: tex.label(title, '#1e3a5f'), transparent: true }));
      sign.position.set(0, p.h / 2 + 0.22, 0.04);
      g.add(frame, slab, knob, sign);
      g.position.set(p.cx, p.cy, 0.05);
      break;
    }
    case 'box': {
      const s = surfaceUnder(def, decor, room);
      const cardboard = std(0xc99a63, 0.85);
      const body = box(0.46, 0.3, 0.34, cardboard, 0.01);
      body.position.y = 0.15;
      for (const side of [-1, 1]) {
        const flap = box(0.46, 0.012, 0.17, cardboard, 0.004);
        flap.position.set(0, 0.3, side * 0.2);
        flap.rotation.x = side * 0.9;
        g.add(flap);
      }
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshBasicMaterial({ map: tex.label('IT', '#1e3a5f'), transparent: true }));
      lbl.position.set(0, 0.16, 0.172);
      g.add(shadowed(body), lbl);
      g.position.set(cx, s.y, s.z);
      break;
    }
    case 'qr': {
      // «Bepul kofe!» QR plakati — devorda
      const p = onWall(b, room);
      const frame = box(p.w + 0.05, p.h + 0.05, 0.02, std(0xffffff, 0.6), 0.01);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), std(0xffffff, 0.6, 0, { map: tex.qrPoster() }));
      paper.position.z = 0.015;
      const tapeMat = std(0xf8e7a1, 0.8, 0, { transparent: true, opacity: 0.85 });
      for (const sx of [-1, 1]) {
        const tape = box(0.14, 0.04, 0.005, tapeMat, 0);
        tape.position.set(sx * (p.w / 2 - 0.03), p.h / 2 - 0.01, 0.025);
        tape.rotation.z = sx * 0.5;
        g.add(tape);
      }
      g.add(frame, paper);
      g.position.set(p.cx, p.cy, 0.04);
      g.rotation.z = 0.03;
      break;
    }
    case 'coffee': {
      // Espresso mashinasi: tayyorlanganda — qahva oqimi, finjon to‘ladi, bug‘ ko‘tariladi
      const s = surfaceUnder(def, decor, room);
      const body = box(0.42, 0.46, 0.36, std(0x1f2937, 0.35, 0.5), 0.04);
      body.position.y = 0.23;
      const top = box(0.44, 0.06, 0.38, M.chrome(), 0.02);
      top.position.y = 0.48;
      const head = cyl(0.05, 0.06, 0.06, M.chrome());
      head.position.set(0, 0.3, 0.2);
      const tray = box(0.32, 0.03, 0.14, M.chrome(), 0.01);
      tray.position.set(0, 0.015, 0.24);
      const display = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.07), new THREE.MeshBasicMaterial({ map: tex.coffeeDisplay(false), toneMapped: false }));
      display.position.set(0, 0.4, 0.182);
      const cup = new THREE.Group();
      const cupBody = cyl(0.045, 0.036, 0.08, std(0xffffff, 0.3));
      cupBody.position.y = 0.04;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16, Math.PI), std(0xffffff, 0.3));
      handle.rotation.z = -Math.PI / 2;
      handle.position.set(0.05, 0.045, 0);
      const coffee = cyl(0.04, 0.04, 0.004, std(0x5a3418, 0.25));
      coffee.position.y = 0.01;
      cup.add(cupBody, handle, coffee);
      cup.position.set(0, 0.03, 0.24);
      const stream = cyl(0.006, 0.006, 0.17, new THREE.MeshBasicMaterial({ color: 0x5a3418 }));
      stream.position.set(0, 0.19, 0.24);
      stream.visible = false;
      const beans = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const bean = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), std(0x4a2c17, 0.5));
        bean.scale.set(1, 0.6, 1.3);
        bean.position.set(-0.32 + (i % 4) * 0.035, 0.012, 0.18 + Math.floor(i / 4) * 0.04);
        bean.rotation.y = i;
        beans.add(bean);
      }
      const steam = Array.from({ length: 6 }, (_, i) => {
        const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.radialGlow('255,255,255'), transparent: true, depthWrite: false, opacity: 0 }));
        puff.userData.seed = i / 6;
        return puff;
      });
      const light = new THREE.PointLight(0xffb36b, 0, 1.6, 2);
      light.position.set(0, 0.25, 0.35);
      g.add(shadowed(body), shadowed(top), head, tray, display, shadowed(cup), stream, beans, light, ...steam);
      g.position.set(cx, s.y, s.z);

      let brewAt = -1;
      let brewed = false;
      setState = (state) => {
        if (state === 'done' && !brewed) {
          brewed = true;
          brewAt = -2; // keyingi kadrda boshlanadi
          (display.material as THREE.MeshBasicMaterial).map = tex.coffeeDisplay(true);
        }
      };
      animate = (t, _dt, rm) => {
        if (brewAt === -2) brewAt = t;
        const since = brewAt >= 0 ? t - brewAt : -1;
        const pouring = since >= 0 && since < 2.2;
        stream.visible = pouring && !rm;
        if (pouring) stream.scale.y = 0.9 + Math.sin(t * 40) * 0.1;
        const fill = brewed ? (rm ? 1 : Math.min(1, Math.max(0, since) / 2.2)) : 0;
        coffee.position.y = 0.01 + fill * 0.06;
        coffee.scale.setScalar(0.85 + fill * 0.15);
        light.intensity = pouring ? 1.2 + Math.sin(t * 9) * 0.3 : brewed ? 0.4 : 0;
        steam.forEach((puff) => {
          const k = (t * 0.45 + (puff.userData.seed as number)) % 1;
          const active = brewed && since > 1 && !rm;
          puff.visible = active;
          if (!active) return;
          puff.position.set(Math.sin(t + k * 6) * 0.03, 0.12 + k * 0.45, 0.24);
          puff.scale.setScalar(0.06 + k * 0.16);
          puff.material.opacity = 0.35 * (1 - k);
        });
      };
      break;
    }
    case 'npc': {
      const z0 = toZ(b.y + b.height, room);
      // Agar NPC jihoz izi ichida qolsa — orqasiga suramiz
      let z = z0;
      for (const d of decor) {
        if (!d.solid) continue;
        const f = footprint(d.rect, room);
        if (cx > f.x0 && cx < f.x1 && z > f.z0 - 0.1 && z < f.z1) z = f.z0 - 0.3;
      }
      const height = 1.66;
      const mat = new THREE.MeshBasicMaterial({ map: npcTexture ?? null, color: tint, alphaToCoverage: true, alphaTest: 0.08, side: THREE.DoubleSide });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(height * 0.42, height), mat);
      plane.position.y = height / 2;
      const art = def.npc?.art;
      if (art) {
        // Illyustratsiya: qo‘shni figuralardan qolgan bo‘laklarni tozalab, o‘lchamini rasmga moslaymiz
        mat.visible = false;
        void loadImage(art)
          .then((img) => {
            const canvas = cleanSingle(img);
            const t = new THREE.CanvasTexture(canvas);
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 8;
            mat.map = t;
            mat.visible = true;
            mat.needsUpdate = true;
            plane.geometry.dispose();
            plane.geometry = new THREE.PlaneGeometry((height * canvas.width) / canvas.height, height);
          })
          .catch(() => {
            mat.map = npcTexture ?? null;
            mat.visible = true;
            mat.needsUpdate = true;
          });
      }
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.3, 24),
        new THREE.MeshBasicMaterial({ map: tex.radialGlow('0,0,0'), transparent: true, opacity: 0.45, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.01;
      shadow.scale.set(1, 0.6, 1);
      const body = new THREE.Group();
      body.add(plane);
      g.add(shadow, body);
      g.position.set(cx, 0, z);
      animate = (t, _dt, rm) => {
        body.scale.y = rm ? 1 : 1 + Math.sin(t * 2.1 + z) * 0.008;
        body.rotation.z = rm ? 0 : Math.sin(t * 0.8 + z) * 0.012;
      };
      break;
    }
  }

  const bbox = new THREE.Box3().setFromObject(g);
  const top = new THREE.Vector3((bbox.min.x + bbox.max.x) / 2, bbox.max.y + 0.32, (bbox.min.z + bbox.max.z) / 2);
  return { object: g, animate, top, setState };
}
