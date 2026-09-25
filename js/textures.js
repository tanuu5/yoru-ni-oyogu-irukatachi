// textures.js — the paper (and the cellophane) everything is cut from.
// Paper textures are neutral (near-white paper + dark ink). A piece is tinted by
// filling its own colour first and multiplying the texture on top.
// The room is printed with the original story; the man's pages with his draft.

import { rng, canvas } from './util.js';
import { F } from './fonts.js';
import { CORPUS } from './text.js';

export const TEX = {};
export const TS = 1024;
export const GRAIN = [];
export const CAUSTIC = [];
export let CRINKLE = null;
export let VIGNETTE = null;

// Tileable value noise (size must be a multiple of cell).
function noiseField(size, cell, r) {
  const g = Math.round(size / cell);
  const grid = new Float32Array(g * g);
  for (let i = 0; i < grid.length; i++) grid[i] = r() * 2 - 1;
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const gy = y / cell, iy = Math.floor(gy), fy = gy - iy, sy = fy * fy * (3 - 2 * fy);
    const y0 = (iy % g) * g, y1 = ((iy + 1) % g) * g;
    for (let x = 0; x < size; x++) {
      const gx = x / cell, ix = Math.floor(gx), fx = gx - ix, sx = fx * fx * (3 - 2 * fx);
      const x0 = ix % g, x1 = (ix + 1) % g;
      const a = grid[y0 + x0], b = grid[y0 + x1], c = grid[y1 + x0], d = grid[y1 + x1];
      const top = a + (b - a) * sx, bot = c + (d - c) * sx;
      out[y * size + x] = top + (bot - top) * sy;
    }
  }
  return out;
}

function basePaper(seed, fibres = 1, longFibres = false) {
  const r = rng(seed);
  const c = canvas(TS, TS), g = c.getContext('2d');
  const img = g.createImageData(TS, TS), d = img.data;
  const n1 = noiseField(TS, 128, r), n2 = noiseField(TS, 32, r), n3 = noiseField(TS, 8, r);
  const tone = [243, 239, 231];
  for (let i = 0, p = 0; i < TS * TS; i++, p += 4) {
    const v = 1 + n1[i] * 0.025 + n2[i] * 0.017 + n3[i] * 0.02 + (r() - 0.5) * 0.05;
    d[p] = tone[0] * v;
    d[p + 1] = tone[1] * v;
    d[p + 2] = tone[2] * v;
    d[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Fibres, wrapped so the tile stays seamless.
  g.lineCap = 'round';
  const n = Math.floor(1500 * fibres);
  for (let i = 0; i < n; i++) {
    const x = r() * TS, y = r() * TS, a = r() * Math.PI * 2;
    const l = (4 + r() * 22) * (longFibres ? 1 + r() * 2.2 : 1);
    const light = r() < 0.6;
    g.strokeStyle = light ? `rgba(255,253,248,${0.3 + r() * 0.45})` : `rgba(110,92,74,${0.05 + r() * 0.09})`;
    g.lineWidth = 0.35 + r() * (longFibres ? 1.1 : 0.8);
    const bend = (r() - 0.5) * 1.4;
    for (const ox of [-TS, 0, TS]) for (const oy of [-TS, 0, TS]) {
      const X = x + ox, Y = y + oy;
      if (X < -80 || X > TS + 80 || Y < -80 || Y > TS + 80) continue;
      g.beginPath();
      g.moveTo(X, Y);
      g.quadraticCurveTo(X + Math.cos(a + bend) * l * 0.5, Y + Math.sin(a + bend) * l * 0.5, X + Math.cos(a) * l, Y + Math.sin(a) * l);
      g.stroke();
    }
  }
  return c;
}

// Copy a base sheet with a flip/rotation so every texture's fibres differ.
function derive(base, variant) {
  const c = canvas(TS, TS), g = c.getContext('2d');
  g.translate(TS / 2, TS / 2);
  g.rotate((variant % 4) * Math.PI / 2);
  if (variant & 4) g.scale(-1, 1);
  g.drawImage(base, -TS / 2, -TS / 2);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

const INK = 0.86;
const ink = (a, c = [58, 47, 40]) => `rgba(${c[0]},${c[1]},${c[2]},${a * INK})`;
const any = (r, arr) => arr[Math.floor(r() * arr.length)];

function fillLine(g, r, src, width, joiner) {
  let s = '';
  while (g.measureText(s).width < width) s += any(r, src) + joiner;
  return s;
}

// Vertical Japanese text, right to left — the pages of the original story.
function printTate(g, r, pool = CORPUS.novel, size = 19) {
  g.globalCompositeOperation = 'multiply';
  const colW = Math.round(size * 1.7);
  g.font = `400 ${size}px ${F.mincho}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let x = TS - 16; x > -colW; x -= colW) {
    let y = 16 + (r() < 0.25 ? size * 2 : 0);
    g.fillStyle = ink(0.48 + r() * 0.38);
    while (y < TS + size) {
      const s = any(r, pool).replace(/[「」]/g, '');
      for (const ch of s) {
        if (y > TS + size) break;
        if ('、。'.includes(ch)) g.fillText(ch, x + size * 0.55, y - size * 0.5);
        else if ('ー〜…：'.includes(ch)) {
          g.save(); g.translate(x, y); g.rotate(Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
        } else g.fillText(ch, x, y);
        y += size * 1.07;
      }
      if (r() < 0.35) y += size;
    }
  }
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
}

function printBook(g, r, pool = CORPUS.novel, en = CORPUS.en) {
  g.globalCompositeOperation = 'multiply';
  let y = 24, indent = 0;
  while (y < TS + 30) {
    const ja = r() < 0.82;
    g.font = `400 ${ja ? 18 : 20}px ${ja ? F.mincho : F.garamond}`;
    const s = fillLine(g, r, ja ? pool : en, TS + 80, ja ? '' : ' ');
    g.fillStyle = ink(0.5 + r() * 0.38);
    g.fillText(s, -24 + indent, y);
    y += 31;
    if (r() < 0.09) { y += 20; indent = 36; } else indent = 0;
  }
}

// 原稿用紙: a 20 x 20 grid with the man's draft written one character per cell.
function printGrid(g, r) {
  g.globalCompositeOperation = 'multiply';
  const cell = 40, gutter = 16;
  g.strokeStyle = 'rgba(176,86,60,0.55)';
  g.lineWidth = 1.2;
  for (let y = 0; y < TS; y += cell + gutter) {
    for (let x = 0; x <= TS; x += cell) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + cell); g.stroke();
    }
    g.beginPath(); g.moveTo(0, y); g.lineTo(TS, y); g.moveTo(0, y + cell); g.lineTo(TS, y + cell); g.stroke();
  }
  g.font = `400 26px ${F.hand}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let y = 0; y < TS; y += cell + gutter) {
    if (r() < 0.2) continue;
    const s = fillLine(g, r, CORPUS.story, TS * 2, '');
    const chars = [...s];
    const n = Math.floor(TS / cell) - Math.floor(r() * 6);
    g.fillStyle = ink(0.7 + r() * 0.25, [36, 40, 70]);
    for (let i = 0; i < n; i++) g.fillText(chars[i] || '', i * cell + cell / 2, y + cell / 2 + 1);
  }
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
}

// Wood-grain print for the desk top and the floor.
function printWood(g, r) {
  g.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 90; i++) {
    const y0 = r() * TS, amp = 3 + r() * 10, ph = r() * 6, per = 180 + r() * 400;
    g.strokeStyle = `rgba(90,60,40,${0.06 + r() * 0.12})`;
    g.lineWidth = 0.6 + r() * 2.2;
    for (const oy of [-TS, 0, TS]) {
      g.beginPath();
      for (let x = 0; x <= TS; x += 16) {
        const y = y0 + oy + Math.sin((x / TS) * Math.PI * 2 * Math.round(TS / per) + ph) * amp;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
}

// Fine crosshatch for the chair's mesh back.
function printMesh(g) {
  g.globalCompositeOperation = 'multiply';
  g.strokeStyle = 'rgba(40,36,44,0.35)';
  g.lineWidth = 1.4;
  for (let i = -TS; i < TS * 2; i += 9) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + TS, TS); g.stroke();
    g.beginPath(); g.moveTo(i, TS); g.lineTo(i + TS, 0); g.stroke();
  }
}

// ---------------------------------------------------------------------------
// Cellophane: a mid-grey sheet of creases, used with 'overlay' (grey = no change).
function makeCrinkle() {
  const S = 512, r = rng(313);
  const c = canvas(S, S), g = c.getContext('2d');
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 160; i++) {
    const x = r() * S, y = r() * S, a = r() * Math.PI, l = 30 + r() * 150;
    const dx = Math.cos(a) * l, dy = Math.sin(a) * l;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const X = x + ox, Y = y + oy;
      if (X < -200 || X > S + 200 || Y < -200 || Y > S + 200) continue;
      // a crease: bright on one side, dark on the other
      const grd = g.createLinearGradient(X - dy * 0.06, Y + dx * 0.06, X + dy * 0.06, Y - dx * 0.06);
      const k = 0.1 + r() * 0.22;
      grd.addColorStop(0, `rgba(255,255,255,0)`);
      grd.addColorStop(0.48, `rgba(255,255,255,${k})`);
      grd.addColorStop(0.52, `rgba(0,0,0,${k * 0.8})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.strokeStyle = grd;
      g.lineWidth = 3 + r() * 9;
      g.beginPath();
      g.moveTo(X - dx / 2, Y - dy / 2);
      g.lineTo(X + dx / 2, Y + dy / 2);
      g.stroke();
    }
  }
  CRINKLE = c;
}

// Caustics: light through moving water, a few tileable frames played on twos.
function makeCaustics() {
  const S = 192, N = 6;
  for (let k = 0; k < N; k++) {
    const c = canvas(S, S), g = c.getContext('2d');
    const img = g.createImageData(S, S), d = img.data;
    const t = (k / N) * Math.PI * 2;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = (x / S) * Math.PI * 2, v = (y / S) * Math.PI * 2;
      let s = 0;
      s += Math.sin(u * 3 + Math.sin(v * 2 + t) * 1.3 + t);
      s += Math.sin(v * 4 + Math.sin(u * 3 - t) * 1.1 - t);
      s += Math.sin((u + v) * 2 + Math.sin(u * 5 + t * 2) * 0.6 + t);
      const e = Math.max(0, 1 - Math.abs(s) / 1.1);
      const val = Math.pow(e, 7) * 255;
      const i = (y * S + x) * 4;
      d[i] = val * 0.7; d[i + 1] = val * 0.95; d[i + 2] = val; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    CAUSTIC.push(c);
  }
}

function makeGrainTiles() {
  for (let k = 0; k < 4; k++) {
    const r = rng(900 + k);
    const c = canvas(256, 256), g = c.getContext('2d');
    const img = g.createImageData(256, 256), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 128 + ((r() + r() + r()) / 3 - 0.5) * 150;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    GRAIN.push(c);
  }
}

function makeVignette() {
  const c = canvas(640, 360), g = c.getContext('2d');
  const gr = g.createRadialGradient(320, 175, 60, 320, 180, 390);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.55, '#f5f0ee');
  gr.addColorStop(1, '#5d5563');
  g.fillStyle = gr;
  g.fillRect(0, 0, 640, 360);
  VIGNETTE = c;
}

export function buildTextures(progress = () => {}) {
  const base = basePaper(7, 1);
  const washi = basePaper(19, 2.6, true);
  TEX.plain = base;
  TEX.washi = washi;
  const printers = {
    tate: (g, r) => printTate(g, r),
    tateS: (g, r) => printTate(g, r, CORPUS.novel, 13),
    book: (g, r) => printBook(g, r),
    story: (g, r) => printBook(g, r, CORPUS.story, CORPUS.en),
    grid: printGrid,
    wood: printWood,
    mesh: printMesh,
  };
  const count = Object.keys(printers).length;
  let v = 1;
  for (const [name, fn] of Object.entries(printers)) {
    const c = derive(v % 2 ? base : washi, v);
    const g = c.getContext('2d');
    fn(g, rng(100 + v));
    g.globalCompositeOperation = 'source-over';
    TEX[name] = c;
    progress((v / count) * 0.8);
    v++;
  }
  makeCrinkle();
  makeCaustics();
  progress(1);
  makeGrainTiles();
  makeVignette();
}
