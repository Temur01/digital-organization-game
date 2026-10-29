import * as THREE from 'three';
import type { RoomDefinition } from '../../types/models';
import { floorDepth, ROOM_HALF_W, toX, WALL_HEIGHT_M, wallY } from './space';
import * as tex from './textures';

interface Particle {
  obj: THREE.Object3D;
  age: number;
  life: number;
  update(k: number): void;
}

/** Qisqa muddatli effektlar: chang, bosish halqasi, uchqunlar. */
export class Bursts {
  private items: Particle[] = [];
  constructor(private readonly scene: THREE.Scene) {}

  private add(obj: THREE.Object3D, life: number, update: (k: number) => void) {
    this.scene.add(obj);
    this.items.push({ obj, age: 0, life, update });
  }

  puff(x: number, z: number): void {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.radialGlow('255,250,240'), transparent: true, depthWrite: false, opacity: 0.5 }));
    s.position.set(x + (Math.random() - 0.5) * 0.15, 0.06, z + 0.05);
    this.add(s, 0.6, (k) => {
      s.scale.setScalar(0.12 + k * 0.35);
      s.position.y = 0.06 + k * 0.1;
      s.material.opacity = 0.45 * (1 - k);
    });
  }

  ripple(x: number, z: number): void {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.14, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, depthWrite: false, toneMapped: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.02, z);
    this.add(m, 0.65, (k) => {
      m.scale.setScalar(1 + k * 3.5);
      m.material.opacity = 1 - k;
    });
  }

  sparkle(pos: THREE.Vector3, count = 12, color = 0xffd166): void {
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex.sparkleStar(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      const a = (i / count) * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * (0.6 + Math.random() * 0.6), 0.9 + Math.random() * 0.8, Math.sin(a) * (0.6 + Math.random() * 0.6));
      s.position.copy(pos);
      this.add(s, 0.8, (k) => {
        s.position.set(pos.x + v.x * k * 0.7, pos.y + v.y * k * 0.7 - 1.2 * k * k, pos.z + v.z * k * 0.7);
        s.scale.setScalar(0.16 * (1 - k * 0.6));
        s.material.rotation = k * 4;
        s.material.opacity = 1 - k;
      });
    }
  }

  update(dt: number): void {
    this.items = this.items.filter((p) => {
      p.age += dt;
      const k = Math.min(1, p.age / p.life);
      p.update(k);
      if (k >= 1) {
        this.scene.remove(p.obj);
        p.obj.traverse((o) => {
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose();
          (mesh.material as THREE.Material | undefined)?.dispose();
        });
        return false;
      }
      return true;
    });
  }
}

/** Deraza nurlari va havoda suzuvchi chang zarralari */
export function buildAtmosphere(room: RoomDefinition, scene: THREE.Scene): (t: number, dt: number) => void {
  const night = room.theme.night ?? false;
  const depth = floorDepth(room);
  const windows = room.decor.filter((d) => d.kind === 'window').map((d) => d.rect);
  const shafts: THREE.Mesh[] = [];

  for (const w of windows) {
    const x0 = toX(w.x);
    const x1 = toX(w.x + w.width);
    const yTop = wallY(w.y, room);
    const yBot = wallY(w.y + w.height, room);
    // Derazadan polga tushayotgan nur — 4 burchakli shaffof «hajm»
    const geo = new THREE.BufferGeometry();
    const reach = depth * 0.55;
    const vertices = new Float32Array([x0, yTop, 0.05, x1, yTop, 0.05, x1 + 1.2, 0.02, reach, x0 + 1.2, 0.02, reach * 0.75, x0, yBot, 0.05, x1, yBot, 0.05]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 2, 4, 2, 3]);
    geo.computeVertexNormals();
    const shaft = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: night ? 0x8fa8ff : 0xfff1d0,
        transparent: true,
        opacity: night ? 0.035 : 0.09,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(shaft);
    shafts.push(shaft);

    // Poldagi yorug‘ dog‘
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(x1 - x0 + 1.4, reach * 0.7),
      new THREE.MeshBasicMaterial({
        map: tex.radialGlow(night ? '143,168,255' : '255,236,190'),
        transparent: true,
        opacity: night ? 0.12 : 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set((x0 + x1) / 2 + 0.8, 0.01, reach * 0.55);
    scene.add(patch);
  }

  const count = night ? 40 : 110;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * ROOM_HALF_W;
    positions[i * 3 + 1] = Math.random() * WALL_HEIGHT_M;
    positions[i * 3 + 2] = Math.random() * depth;
    seeds[i] = Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const motes = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: tex.radialGlow(night ? '170,190,255' : '255,245,220'),
      size: night ? 0.05 : 0.045,
      transparent: true,
      opacity: night ? 0.5 : 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(motes);

  return (t, dt) => {
    for (let i = 0; i < count; i++) {
      const seed = seeds[i]!;
      positions[i * 3 + 1] = (positions[i * 3 + 1]! + dt * (0.04 + (seed % 1) * 0.05)) % WALL_HEIGHT_M;
      positions[i * 3] = positions[i * 3]! + Math.sin(t * 0.5 + seed) * dt * 0.05;
    }
    geo.attributes.position!.needsUpdate = true;
    shafts.forEach((s, i) => {
      (s.material as THREE.MeshBasicMaterial).opacity = (night ? 0.035 : 0.09) * (0.85 + Math.sin(t * 0.7 + i) * 0.15);
    });
  };
}
