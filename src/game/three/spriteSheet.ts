/**
 * Sprite varaqlarini tayyorlash (Canvas 2D, ish vaqtida):
 * 1) shaffof bo‘lmagan piksellarning bog‘langan qismlarini topadi;
 * 2) katta qismlar — figuralar (kadrlar), mayda «dog‘lar» tashlab yuboriladi;
 * 3) har bir kadr bir xil katakka joylanadi: oyoq — pastda, gavda — markazda (silkinish bo‘lmasligi uchun).
 */

const SOLID = 150; // shu alfadan yuqori — «qattiq» piksel
const SOFT_EDGE = 3; // yumshoq chetlar uchun niqobni kengaytirish (px)

export interface Frame {
  canvas: HTMLCanvasElement;
  /** Figuraning haqiqiy balandligi (px) — masshtab uchun */
  contentHeight: number;
}

interface Component {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
  pixels: Int32Array;
}

function readPixels(img: HTMLImageElement) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  return { data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
}

/** 8-bog‘lanishli komponentlar (iterativ, stek bilan) */
function components(data: Uint8ClampedArray, w: number, h: number, minArea: number): Component[] {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const out: Component[] = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || data[start * 4 + 3]! < SOLID) continue;
    let sp = 0;
    stack[sp++] = start;
    seen[start] = 1;
    const pixels: number[] = [];
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    while (sp > 0) {
      const p = stack[--sp]!;
      pixels.push(p);
      const x = p % w;
      const y = (p - x) / w;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const q = ny * w + nx;
          if (!seen[q] && data[q * 4 + 3]! >= SOLID) {
            seen[q] = 1;
            stack[sp++] = q;
          }
        }
      }
    }
    if (pixels.length >= minArea) out.push({ minX, minY, maxX, maxY, area: pixels.length, pixels: Int32Array.from(pixels) });
  }
  return out;
}

function overlaps(a: Component, b: Component, pad: number) {
  return a.minX - pad <= b.maxX && a.maxX + pad >= b.minX && a.minY - pad <= b.maxY && a.maxY + pad >= b.minY;
}

/** Figura niqobidan (bir nechta komponent) toza canvas yasaydi — asl yumshoq chetlar saqlanadi */
function renderFigure(data: Uint8ClampedArray, w: number, parts: Component[]) {
  const minX = Math.min(...parts.map((p) => p.minX)) - SOFT_EDGE;
  const minY = Math.min(...parts.map((p) => p.minY)) - SOFT_EDGE;
  const maxX = Math.max(...parts.map((p) => p.maxX)) + SOFT_EDGE;
  const maxY = Math.max(...parts.map((p) => p.maxY)) + SOFT_EDGE;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const mask = new Uint8Array(bw * bh);
  for (const part of parts) {
    for (const p of part.pixels) {
      const x = (p % w) - minX;
      const y = Math.floor(p / w) - minY;
      for (let dy = -SOFT_EDGE; dy <= SOFT_EDGE; dy++) {
        for (let dx = -SOFT_EDGE; dx <= SOFT_EDGE; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < bw && yy < bh) mask[yy * bw + xx] = 1;
        }
      }
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = bw;
  canvas.height = bh;
  const g = canvas.getContext('2d')!;
  const out = g.createImageData(bw, bh);
  // Gavda markazi: yuqori 45% dagi piksellarning o‘rtacha x’i (oyoqlar qadami silkitmasin)
  let sumX = 0;
  let count = 0;
  const torsoLimit = Math.floor(bh * 0.45);
  for (let y = 0; y < bh; y++) {
    const sy = y + minY;
    for (let x = 0; x < bw; x++) {
      if (!mask[y * bw + x]) continue;
      const sx = x + minX;
      if (sx < 0 || sy < 0 || sx >= w) continue;
      const si = (sy * w + sx) * 4;
      const di = (y * bw + x) * 4;
      out.data[di] = data[si]!;
      out.data[di + 1] = data[si + 1]!;
      out.data[di + 2] = data[si + 2]!;
      out.data[di + 3] = data[si + 3]!;
      if (y < torsoLimit && data[si + 3]! >= SOLID) {
        sumX += x;
        count++;
      }
    }
  }
  g.putImageData(out, 0, 0);
  return { canvas, centerX: count ? sumX / count : bw / 2, height: bh };
}

/** Bitta figurali rasm: eng katta figurani qoldiradi (qo‘shni figuralardan qolgan bo‘laklar tashlanadi) */
export function cleanSingle(img: HTMLImageElement): HTMLCanvasElement {
  const { data, w, h } = readPixels(img);
  const comps = components(data, w, h, 200).sort((a, b) => b.area - a.area);
  const main = comps[0];
  if (!main) return readToCanvas(img);
  const parts = [main, ...comps.slice(1).filter((c) => c.area > 400 && overlaps(main, c, 4) && c.minX >= main.minX && c.maxX <= main.maxX)];
  return renderFigure(data, w, parts).canvas;
}

function readToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
}

/** Gorizontal yurish varag‘i → bir xil o‘lchamli, tekislangan kadrlar (chapdan o‘ngga) */
export function extractFrames(img: HTMLImageElement, expected = 8): Frame[] {
  const { data, w, h } = readPixels(img);
  const comps = components(data, w, h, 60);
  const totalArea = comps.reduce((s, c) => s + c.area, 0);
  const big = comps
    .filter((c) => c.area > totalArea / (expected * 4))
    .sort((a, b) => b.area - a.area)
    .slice(0, expected)
    .sort((a, b) => a.minX - b.minX);
  if (big.length === 0) return [];

  const figures = big.map((main) => {
    // Figuraga tegishli mayda bo‘laklar (masalan, poyabzal yoki qo‘l uchi) — faqat uning chegarasi ichida
    const extras = comps.filter((c) => c !== main && !big.includes(c) && c.area > 300 && overlaps(main, c, 2) && c.minX >= main.minX - 2 && c.maxX <= main.maxX + 2);
    return renderFigure(data, w, [main, ...extras]);
  });

  // Umumiy katak: gavda markazi katak o‘rtasida, oyoqlar pastki chetda
  const left = Math.max(...figures.map((f) => f.centerX));
  const right = Math.max(...figures.map((f) => f.canvas.width - f.centerX));
  const half = Math.ceil(Math.max(left, right));
  const cellH = Math.max(...figures.map((f) => f.height));
  return figures.map((f) => {
    const canvas = document.createElement('canvas');
    canvas.width = half * 2;
    canvas.height = cellH;
    canvas.getContext('2d')!.drawImage(f.canvas, Math.round(half - f.centerX), cellH - f.height);
    return { canvas, contentHeight: f.height };
  });
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
