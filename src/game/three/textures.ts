import * as THREE from 'three';
import type { CharacterLook } from '../../types/models';

/** Barcha teksturalar kodda (Canvas 2D) chiziladi — tashqi fayl yuklanmaydi. */

const FONT = "'Manrope Variable', system-ui, sans-serif";
const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, t);
  return t;
}

export function disposeTextures(): void {
  cache.forEach((t) => t.dispose());
  cache.clear();
}

/** Psevdo-tasodifiy, lekin har safar bir xil (teksturalar barqaror bo‘lishi uchun) */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

// ---------- Xona ----------

export function woodFloor(night: boolean) {
  return make(
    `floor-${night}`,
    1024,
    1024,
    (g, w, h) => {
      const r = rng(7);
      const plankH = h / 8;
      const tones = night ? ['#6b5a47', '#74624d', '#625240', '#7a6650'] : ['#c9a77c', '#d2b088', '#bf9d72', '#d8b991'];
      for (let row = 0; row < 8; row++) {
        let x = -r() * 300;
        while (x < w) {
          const len = 260 + r() * 300;
          g.fillStyle = tones[Math.floor(r() * tones.length)]!;
          g.fillRect(x, row * plankH, len, plankH);
          // Yog‘och tolalari
          g.strokeStyle = night ? 'rgba(0,0,0,0.12)' : 'rgba(110,70,30,0.12)';
          g.lineWidth = 1.5;
          for (let i = 0; i < 5; i++) {
            const yy = row * plankH + 10 + r() * (plankH - 20);
            g.beginPath();
            g.moveTo(x, yy);
            g.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 10, x + len * 0.6, yy + (r() - 0.5) * 10, x + len, yy);
            g.stroke();
          }
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x, row * plankH, 2, plankH);
          x += len;
        }
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(0, row * plankH, w, 2);
      }
    },
    [3, 2],
  );
}

export function wallPaint(base: string, key: string) {
  return make(
    `wall-${key}`,
    512,
    512,
    (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      const r = rng(11);
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.035})`;
        g.fillRect(r() * w, r() * h, 2, 2);
      }
    },
    [4, 2],
  );
}

/** Atlas (ikat) naqshli gilam — milliy aksent */
export function ikatRug() {
  return make('rug', 1024, 512, (g, w, h) => {
    g.fillStyle = '#7d2135';
    g.fillRect(0, 0, w, h);
    const colors = ['#d1495b', '#f2b134', '#2a9d8f', '#f4ecdc', '#3d5a80'];
    const cell = 96;
    for (let y = -cell; y < h + cell; y += cell / 2) {
      for (let x = -cell; x < w + cell; x += cell) {
        const off = (y / (cell / 2)) % 2 ? cell / 2 : 0;
        const cx = x + off;
        const k = Math.abs(Math.floor(x / cell + y / cell)) % colors.length;
        for (let ring = 3; ring > 0; ring--) {
          const s = (ring / 3) * (cell / 2);
          g.fillStyle = colors[(k + ring) % colors.length]!;
          g.beginPath();
          // Ikatning «xira» chetlari — tishli olmos
          g.moveTo(cx, y - s);
          g.lineTo(cx + s * 0.55, y - s * 0.2);
          g.lineTo(cx + s, y);
          g.lineTo(cx + s * 0.55, y + s * 0.2);
          g.lineTo(cx, y + s);
          g.lineTo(cx - s * 0.55, y + s * 0.2);
          g.lineTo(cx - s, y);
          g.lineTo(cx - s * 0.55, y - s * 0.2);
          g.closePath();
          g.fill();
        }
      }
    }
    // Chekka hoshiya
    g.strokeStyle = '#f2b134';
    g.lineWidth = 18;
    g.strokeRect(30, 30, w - 60, h - 60);
    g.strokeStyle = '#4a1020';
    g.lineWidth = 6;
    g.strokeRect(54, 54, w - 108, h - 108);
  });
}

export function sky(night: boolean) {
  return make(`sky-${night}`, 512, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    if (night) {
      grad.addColorStop(0, '#0b1230');
      grad.addColorStop(1, '#27305e');
    } else {
      grad.addColorStop(0, '#7ec8f2');
      grad.addColorStop(1, '#d8f0fb');
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const r = rng(night ? 3 : 5);
    if (night) {
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(255,243,196,${0.4 + r() * 0.6})`;
        g.beginPath();
        g.arc(r() * w, r() * h * 0.8, r() * 1.8 + 0.4, 0, Math.PI * 2);
        g.fill();
      }
      // Shahar chiroqlari
      for (let i = 0; i < 14; i++) {
        const bw = 30 + r() * 50;
        const bh = 60 + r() * 140;
        const bx = r() * w;
        g.fillStyle = '#121a3a';
        g.fillRect(bx, h - bh, bw, bh);
        for (let k = 0; k < 10; k++) {
          g.fillStyle = r() > 0.5 ? 'rgba(255,214,120,0.85)' : 'rgba(255,214,120,0.15)';
          g.fillRect(bx + 5 + r() * (bw - 10), h - bh + 8 + r() * (bh - 16), 4, 5);
        }
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const cx = r() * w;
        const cy = 60 + r() * h * 0.45;
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          g.arc(cx + k * 22 - 40, cy + Math.sin(k) * 8, 22 + r() * 14, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.fillStyle = '#9bc4a5';
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.arc(r() * w, h + 20, 60 + r() * 60, Math.PI, 0);
        g.fill();
      }
    }
  });
}

export function abstractArt() {
  return make('art', 256, 200, (g, w, h) => {
    g.fillStyle = '#f4f1de';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e07a5f';
    g.beginPath();
    g.arc(w * 0.35, h * 0.45, h * 0.22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3d5a80';
    g.fillRect(w * 0.55, h * 0.2, w * 0.25, h * 0.55);
    g.fillStyle = '#81b29a';
    g.beginPath();
    g.moveTo(w * 0.1, h * 0.9);
    g.lineTo(w * 0.5, h * 0.55);
    g.lineTo(w * 0.9, h * 0.9);
    g.fill();
  });
}

export function clockFace() {
  return make('clock', 256, 256, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#fdfcf7';
    g.beginPath();
    g.arc(c, c, c - 4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2b2d42';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      g.lineWidth = big ? 6 : 2;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * (c - 16), c + Math.sin(a) * (c - 16));
      g.lineTo(c + Math.cos(a) * (c - (big ? 36 : 24)), c + Math.sin(a) * (c - (big ? 36 : 24)));
      g.stroke();
    }
    g.fillStyle = '#2b2d42';
    g.font = `700 22px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('KOMPANIYA', c, c + 60);
  });
}

// ---------- Interaktiv obyektlar ----------

export function poster(title: string, accent: string) {
  return make(`poster-${title}`, 320, 420, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = accent;
    g.fillRect(0, 0, w, 96);
    g.fillStyle = '#fff';
    g.font = `800 34px ${FONT}`;
    g.textAlign = 'center';
    g.fillText(title.toUpperCase(), w / 2, 62, w - 30);
    g.font = `64px ${FONT}`;
    g.fillText('⚠', w / 2, 190);
    g.fillStyle = '#9aa5b1';
    for (let i = 0; i < 6; i++) g.fillRect(36, 236 + i * 26, w - 72 - (i % 2) * 50, 10);
    g.fillStyle = accent;
    g.fillRect(36, h - 46, 90, 14);
  });
}

export function screenUi(kind: string) {
  return make(`screen-${kind}`, 512, 320, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#dff3ff');
    bg.addColorStop(1, '#b9dcf5');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e293b';
    g.fillRect(0, 0, w, 34);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(20 + i * 18, 17, 6, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = '#ffffff';
    g.fillRect(12, 46, 150, h - 58);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i === 0 ? '#fde68a' : '#e2e8f0';
      g.fillRect(20, 56 + i * 44, 134, 34);
    }
    g.fillStyle = '#ffffff';
    g.fillRect(174, 46, w - 186, h - 58);
    g.fillStyle = '#0f766e';
    g.fillRect(190, 62, 180, 16);
    g.fillStyle = '#94a3b8';
    for (let i = 0; i < 6; i++) g.fillRect(190, 96 + i * 26, w - 230 - (i % 3) * 40, 9);
    g.fillStyle = '#ef4444';
    g.fillRect(w - 110, 62, 80, 22);
  });
}

export function phoneScreen() {
  return make('phone', 128, 256, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#312e81');
    bg.addColorStop(1, '#0f172a');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath();
    g.roundRect(10, 70, w - 20, 70, 12);
    g.fill();
    g.fillStyle = '#ef4444';
    g.beginPath();
    g.arc(28, 92, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#334155';
    g.fillRect(44, 86, 60, 7);
    g.fillRect(20, 112, 84, 6);
  });
}

export function label(text: string, bg: string, fg = '#ffffff') {
  return make(`label-${text}-${bg}`, 256, 96, (g, w, h) => {
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(0, 0, w, h, 16);
    g.fill();
    g.fillStyle = fg;
    g.font = `800 52px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2, w - 20);
  });
}

export function stickyNote() {
  return make('sticky', 128, 128, (g, w, h) => {
    g.fillStyle = '#ffd166';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#6b5b2e';
    g.font = `700 20px ${FONT}`;
    g.fillText('Parol:', 10, 36);
    g.font = `700 15px ${FONT}`;
    g.fillText('Kompaniya', 10, 66);
    g.fillText('2026!', 10, 88);
  });
}

/** «Bepul kofe!» QR plakati — quishing (QR-fishing) tuzog‘i */
export function qrPoster() {
  return make('qr-poster', 320, 440, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#6f3b1d');
    grad.addColorStop(1, '#3b1f0f');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd166';
    g.font = `900 40px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('☕ BEPUL', w / 2, 58);
    g.fillText('KOFE!', w / 2, 102);
    g.fillStyle = '#ffffff';
    g.fillRect(60, 124, 200, 200);
    // Psevdo-QR: uchta «ko‘z» va tasodifiy modullar
    const r = rng(42);
    const cell = 10;
    for (let y = 0; y < 18; y++) {
      for (let x = 0; x < 18; x++) {
        if (r() > 0.55) {
          g.fillStyle = '#111';
          g.fillRect(70 + x * cell, 134 + y * cell, cell, cell);
        }
      }
    }
    for (const [fx, fy] of [
      [70, 134],
      [190, 134],
      [70, 254],
    ] as const) {
      g.fillStyle = '#111';
      g.fillRect(fx, fy, 60, 60);
      g.fillStyle = '#fff';
      g.fillRect(fx + 8, fy + 8, 44, 44);
      g.fillStyle = '#111';
      g.fillRect(fx + 16, fy + 16, 28, 28);
    }
    g.fillStyle = '#ffffff';
    g.font = `700 19px ${FONT}`;
    g.fillText('Skanerlang va ish hisobingiz', w / 2, 360);
    g.fillText('bilan kiring 👉', w / 2, 386);
    g.fillStyle = '#f2b134';
    g.font = `600 15px ${FONT}`;
    g.fillText('kofe-kompaniya.example', w / 2, 420);
  });
}

export function coffeeDisplay(ready: boolean) {
  return make(`coffee-display-${ready}`, 160, 70, (g, w, h) => {
    g.fillStyle = '#0b1020';
    g.fillRect(0, 0, w, h);
    g.fillStyle = ready ? '#34d399' : '#38bdf8';
    g.font = `800 26px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ready ? '☕ TAYYOR' : 'ESPRESSO', w / 2, h / 2);
  });
}

// ---------- Effektlar va UI belgilari ----------

export function radialGlow(color = '255,255,255') {
  return make(`glow-${color}`, 128, 128, (g, w) => {
    const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grad.addColorStop(0, `rgba(${color},1)`);
    grad.addColorStop(0.4, `rgba(${color},0.45)`);
    grad.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
  });
}

export function marker() {
  return make('marker', 128, 160, (g, w) => {
    g.shadowColor = 'rgba(255,200,87,0.9)';
    g.shadowBlur = 18;
    g.fillStyle = '#ffc857';
    g.beginPath();
    g.arc(w / 2, 62, 44, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(w / 2 - 16, 100);
    g.lineTo(w / 2 + 16, 100);
    g.lineTo(w / 2, 130);
    g.fill();
    g.shadowBlur = 0;
    g.lineWidth = 7;
    g.strokeStyle = '#ffffff';
    g.beginPath();
    g.arc(w / 2, 62, 44, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#1d2433';
    g.font = `900 64px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('!', w / 2, 66);
  });
}

export function checkBadge() {
  return make('check', 128, 128, (g, w) => {
    g.fillStyle = '#10b981';
    g.beginPath();
    g.arc(w / 2, w / 2, 56, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 14;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(36, 66);
    g.lineTo(56, 86);
    g.lineTo(92, 44);
    g.stroke();
  });
}

export function emojiBubble(symbol: string) {
  return make(`emoji-${symbol}`, 160, 170, (g, w) => {
    g.shadowColor = 'rgba(0,0,0,0.25)';
    g.shadowBlur = 12;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(14, 10, w - 28, 120, 40);
    g.fill();
    g.beginPath();
    g.moveTo(w / 2 - 16, 126);
    g.lineTo(w / 2 + 16, 126);
    g.lineTo(w / 2, 152);
    g.fill();
    g.shadowBlur = 0;
    g.font = `72px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(symbol, w / 2, 74);
  });
}

export function sparkleStar() {
  return make('sparkle', 64, 64, (g, w) => {
    const c = w / 2;
    const grad = g.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,230,150,0.8)');
    grad.addColorStop(1, 'rgba(255,200,87,0)');
    g.fillStyle = grad;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? c * 0.3 : c;
      g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    g.fill();
  });
}

/** NPC — vektor uslubida chizilgan 2D billboard (rasm yo‘q personajlar uchun) */
export function npcTexture(look: CharacterLook, key: string) {
  return make(`npc-${key}`, 256, 640, (g, w, h) => {
    const cx = w / 2;
    const s = 3.2;
    const P = (x: number, y: number) => [cx + x * s, h - 8 + y * s] as const;
    const fill = (c: number) => (g.fillStyle = hex(c));
    const rr = (x: number, y: number, ww: number, hh: number, r: number, c: number) => {
      fill(c);
      const [px, py] = P(x, y);
      g.beginPath();
      g.roundRect(px, py, ww * s, hh * s, r * s);
      g.fill();
    };
    const circle = (x: number, y: number, r: number, c: number) => {
      fill(c);
      const [px, py] = P(x, y);
      g.beginPath();
      g.arc(px, py, r * s, 0, Math.PI * 2);
      g.fill();
    };
    // Oyoqlar va poyabzal
    rr(-11, -70, 9.5, 66, 3, look.bottom);
    rr(1.5, -70, 9.5, 66, 3, look.bottom);
    rr(-13, -7, 12, 7, 3, look.shoes);
    rr(1, -7, 12, 7, 3, look.shoes);
    // Tana va qo‘llar (yumshoq gradient soya)
    rr(-24, -150, 9, 70, 4, look.top);
    rr(15, -150, 9, 70, 4, look.top);
    circle(-19.5, -78, 5, look.skin);
    circle(19.5, -78, 5, look.skin);
    rr(-18, -158, 36, 92, 10, look.top);
    const [gx, gy] = P(-18, -158);
    const grad = g.createLinearGradient(gx, 0, gx + 36 * s, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(gx, gy, 36 * s, 92 * s, 10 * s);
    g.fill();
    // Bo‘yin va bosh
    rr(-4, -166, 8, 10, 2, look.skinShade);
    circle(0, -186, 19, look.hair);
    fill(look.skin);
    const [hx, hy] = P(0, -180);
    g.beginPath();
    g.ellipse(hx, hy, 16 * s, 15.5 * s, 0, 0, Math.PI * 2);
    g.fill();
    if (look.hairStyle === 'bun') circle(0, -210, 9, look.hair);
    fill(look.hair);
    const [fx, fy] = P(-17, -196);
    g.beginPath();
    g.moveTo(fx, fy);
    g.quadraticCurveTo(fx + 17 * s, fy - 14 * s, fx + 34 * s, fy);
    g.quadraticCurveTo(fx + 17 * s, fy - 4 * s, fx, fy + 6 * s);
    g.fill();
    // Ko‘zlar, qosh, tabassum, yonoqlar
    circle(-6, -182, 2.4, 0x2b2b2b);
    circle(6, -182, 2.4, 0x2b2b2b);
    g.fillStyle = 'rgba(224,122,95,0.35)';
    for (const x of [-10, 10]) {
      const [ex, ey] = P(x, -174);
      g.beginPath();
      g.ellipse(ex, ey, 3.5 * s, 2 * s, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#9a5b4a';
    g.lineWidth = 2.5;
    const [mx, my] = P(0, -173);
    g.beginPath();
    g.arc(mx, my - 6, 9, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
  });
}
