// room.js — the set: a tower-block flat at night, built like a toy theatre.
// Planes, back to front: the city (seen through the window) · the room · the man and his chair.
import {
  R, withCam, withPlane, piece, stillPiece, lights, bloom, bloomFlush, glow, pat, setPat, ink,
} from './render.js';
import { cutShape, rectPts, ellipsePts, smooth, disc } from './cut.js';
import { rng, hash, hs, mix, clamp, lerp } from './util.js';
import { CAUSTIC } from './textures.js';
import { F } from './fonts.js';
import { drawCity } from './city.js';
import { LCD } from './text.js';

// ---------------------------------------------------------------------------
// Geometry (world units on the back wall)
export const FLOOR = 790, CEIL = 40;
export const WIN = { x0: 120, x1: 880, y0: 80, y1: 770 };
export const PANES = [[140, 100, 352, 650], [508, 100, 352, 650]];
export const SCR = { x: 1214, y: 240, w: 612, h: 344 };
export const MON = { x0: 1200, x1: 1840, y0: 226, y1: 598 };
export const DESK = { x0: 1060, x1: 1980, top: 604, front: 646, bottom: 668 };
export const CLOCK = { x: 1062, y: 186, r: 54 };
export const FRIDGE = { x0: 2560, x1: 2880, y0: 140, y1: 790, split: 2720, doorY1: 520 };
export const DISP = { x: 2604, y: 226, w: 98, h: 48 };
export const COUNTER = { x0: 2060, x1: 2500, top: 560 };
export const MUG = { x: 1792, y: 630 };
export const DRIP = { x: 2300, y: 560 };
export const KETTLE = { x: 2168, y: 560 };

// Shots
export const SHOT = {
  wide: { x: 1500, y: 470, z: 0.54 },
  window: { x: 520, y: 430, z: 1.02 },
  desk: { x: 1480, y: 470, z: 1 },
  screen: { x: 1530, y: 418, z: 1.62 },
  corner: { x: 1680, y: 360, z: 2.55 },
  kitchen: { x: 2470, y: 470, z: 1 },
  fridge: { x: 2745, y: 330, z: 1.9 },
  clock: { x: CLOCK.x, y: CLOCK.y + 14, z: 3.2 },
};

// ---------------------------------------------------------------------------
// Pieces cut once
let S = null;
const cs = (pts, seed, o) => cutShape(pts, seed, { jag: 0.35, wander: 0.8, step: 14, corner: 0.5, ...o });
const box = (x0, y0, x1, y1, seed, o) => cs(rectPts(x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2), seed, o);

function roundRect(x0, y0, x1, y1, rr, n = 5) {
  const pts = [];
  const corners = [[x1 - rr, y0 + rr, -Math.PI / 2], [x1 - rr, y1 - rr, 0], [x0 + rr, y1 - rr, Math.PI / 2], [x0 + rr, y0 + rr, Math.PI]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (Math.PI / 2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

function build() {
  const r = rng(2025);
  const still = [];
  const add = (key, sh, o) => still.push({ key, sh, o });

  // window frame
  const fr = { color: '#4c4a5a', tex: 'plain', lift: 5, edge: 0.3 };
  add('win-top', box(WIN.x0 - 6, WIN.y0, WIN.x1 + 6, WIN.y0 + 20, 1), fr);
  add('win-bot', box(WIN.x0 - 6, WIN.y1 - 20, WIN.x1 + 6, WIN.y1 + 4, 2), fr);
  add('win-l', box(WIN.x0, WIN.y0, WIN.x0 + 20, WIN.y1, 3), fr);
  add('win-r', box(WIN.x1 - 20, WIN.y0, WIN.x1, WIN.y1, 4), fr);
  add('win-m', box(492, WIN.y0 + 10, 508, WIN.y1 - 10, 5), { ...fr, lift: 3 });
  add('rod', box(60, 52, 990, 60, 6), { color: '#3c3a46', tex: 'plain', lift: 8, edge: 0.4 });

  // clock
  const clock = {
    rim: disc(CLOCK.r, 30),
    face: disc(CLOCK.r - 7, 31),
    pin: disc(4, 32),
    hour: cs([[-3.5, 8], [3.5, 8], [2.2, -30], [-2.2, -30]], 33, { jag: 0.1, wander: 0.2 }),
    min: cs([[-2.6, 9], [2.6, 9], [1.5, -44], [-1.5, -44]], 34, { jag: 0.1, wander: 0.2 }),
    sec: cs([[-1, 12], [1, 12], [0.7, -46], [-0.7, -46]], 35, { jag: 0.05, wander: 0.1 }),
  };

  // shelf with books above the desk's right end
  add('shelf', box(1872, 206, 2064, 218, 40), { color: '#a07e60', tex: 'wood', lift: 10, edge: 0.35 });
  add('shelf-br1', cs([[1890, 218], [1902, 218], [1898, 246]], 41), { color: '#7a6048', tex: 'plain', lift: 6 });
  add('shelf-br2', cs([[2034, 218], [2046, 218], [2040, 246]], 42), { color: '#7a6048', tex: 'plain', lift: 6 });
  const bookCols = ['#b85a4a', '#5a7fa8', '#d9b25a', '#6a8f6a', '#8a6aa8', '#d9d0c0', '#c77a52', '#4f6f86'];
  const TITLES = ['夜の編集部', '締切', '連載', '猫', '言葉', '冷気', '原稿', '夜'];
  let bx = 1884;
  for (let i = 0; i < 9; i++) {
    const w = 13 + r() * 9, h = 70 + r() * 40, lean = i === 8 ? 0.22 : 0;
    add('book' + i, box(-w / 2, -h, w / 2, 0, 50 + i, { jag: 0.2, wander: 0.3 }), {
      x: bx + w / 2 + (lean ? 8 : 0), y: 206, r: lean, color: bookCols[i % bookCols.length], tex: 'plain', lift: 4, edge: 0.3,
      print: (c) => {
        c.save();
        c.globalCompositeOperation = 'multiply';
        c.fillStyle = 'rgba(40,30,20,0.4)';
        c.fillRect(-w / 2, -h + 8, w, 2);
        c.fillRect(-w / 2, -14, w, 2);
        c.font = `400 ${Math.min(11, w - 3)}px ${F.mincho}`;
        c.textAlign = 'center';
        c.fillStyle = 'rgba(30,20,15,0.6)';
        const t = TITLES[i % TITLES.length];
        [...t].forEach((ch, k) => c.fillText(ch, 0, -h + 24 + k * 12));
        c.restore();
      },
    });
    bx += w + 1.5;
  }

  // desk
  const wood = { color: '#b48c68', tex: 'wood', ts: 0.8, edge: 0.3 };
  add('desk-top', box(DESK.x0, DESK.top, DESK.x1, DESK.front, 60, { jag: 0.2 }), { ...wood, lift: 3, tx: 30 });
  add('desk-front', box(DESK.x0 - 4, DESK.front, DESK.x1 + 4, DESK.bottom, 61), { ...wood, color: '#8d6a4e', lift: 6, tx: 90 });
  add('desk-leg-l', box(DESK.x0 + 16, DESK.bottom, DESK.x0 + 40, FLOOR + 4, 62), { ...wood, color: '#735742', lift: 4 });
  add('desk-leg-r', box(DESK.x1 - 40, DESK.bottom, DESK.x1 - 16, FLOOR + 4, 63), { ...wood, color: '#735742', lift: 4 });
  add('drawer', box(1770, DESK.bottom, 1936, FLOOR - 16, 64), { ...wood, color: '#8d6a4e', lift: 5 });
  add('drawer-h', box(1830, 700, 1876, 706, 65), { color: '#3c3432', tex: 'plain', lift: 3 });
  add('drawer-h2', box(1830, 748, 1876, 754, 66), { color: '#3c3432', tex: 'plain', lift: 3 });

  // monitor
  add('mon-bezel', cs(roundRect(MON.x0, MON.y0, MON.x1, MON.y1, 10), 70, { jag: 0.15, wander: 0.4 }), { color: '#2d2c35', tex: 'plain', lift: 10, edge: 0.35 });
  add('mon-neck', box(1500, MON.y1 - 4, 1540, DESK.top + 8, 71), { color: '#3b3a44', tex: 'plain', lift: 8 });
  add('mon-base', cs(roundRect(1432, DESK.top + 2, 1608, DESK.top + 16, 6), 72), { color: '#34333c', tex: 'plain', lift: 5 });
  add('kbd', cs(roundRect(1368, DESK.top + 6, 1640, DESK.top + 24, 4), 73), {
    color: '#3f3e48', tex: 'plain', lift: 4, edge: 0.25,
    print: (c) => {
      c.fillStyle = 'rgba(210,210,230,0.18)';
      for (let k = 0; k < 22; k++) c.fillRect(1374 + k * 12, DESK.top + 9, 9, 5);
    },
  });

  // things on the desk
  add('pencup', cs(roundRect(1098, 560, 1138, DESK.top + 14, 5), 80), { color: '#c9714c', tex: 'plain', lift: 5 });
  add('pen1', box(1108, 520, 1113, 566, 81, { jag: 0.1 }), { color: '#2c3a70', tex: 'plain', lift: 4 });
  add('pen2', box(1120, 530, 1125, 566, 82, { jag: 0.1 }), { color: '#d9a13c', tex: 'plain', lift: 4 });
  add('pen3', box(1128, 538, 1132, 568, 83, { jag: 0.1 }), { color: '#8a2f35', tex: 'plain', lift: 4 });
  const leaves = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.36;
    const l = 30 + r() * 16;
    leaves.push([[1170, 566], [1170 + Math.cos(a - 0.2) * l * 0.6, 566 + Math.sin(a - 0.2) * l * 0.6], [1170 + Math.cos(a) * l, 566 + Math.sin(a) * l], [1170 + Math.cos(a + 0.2) * l * 0.6, 566 + Math.sin(a + 0.2) * l * 0.6]]);
  }
  add('plant', cs(leaves, 84, { jag: 0.2, wander: 0.4 }), { color: '#6f9a6a', tex: 'plain', lift: 6, edge: 0.35 });
  add('pot', cs([[1150, 566], [1190, 566], [1184, DESK.top + 14], [1156, DESK.top + 14]], 85), { color: '#d8c6a6', tex: 'plain', lift: 5 });
  // a stack of manuscript paper
  for (let i = 0; i < 6; i++) {
    add('ms' + i, box(1866 + hs('ms', i) * 5, DESK.top + 8 - i * 5, 1966 + hs('ms2', i) * 5, DESK.top + 12 - i * 5, 90 + i, { jag: 0.2 }), {
      color: i === 5 ? '#f1e7d2' : '#e8ddc6', tex: 'grid', ts: 0.5, lift: 2 + i * 0.6, edge: 0.4,
    });
  }

  // kitchen
  const cab = { color: '#d6cfc0', tex: 'plain', edge: 0.3 };
  add('cab-u1', box(2080, 150, 2276, 330, 100), { ...cab, lift: 12 });
  add('cab-u2', box(2284, 150, 2480, 330, 101), { ...cab, lift: 12 });
  add('cab-uh1', box(2262, 290, 2268, 318, 102), { color: '#8b8a92', tex: 'plain', lift: 4 });
  add('cab-uh2', box(2292, 290, 2298, 318, 103), { color: '#8b8a92', tex: 'plain', lift: 4 });
  add('tiles', box(2060, 330, 2500, COUNTER.top, 104, { jag: 0.1, wander: 0.2 }), {
    color: '#c9d2d0', tex: 'plain', lift: 1, edge: 0.15,
    print: (c) => {
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.strokeStyle = 'rgba(90,100,110,0.35)';
      c.lineWidth = 1.2;
      c.beginPath();
      for (let x = 2060; x <= 2500; x += 36) { c.moveTo(x, 330); c.lineTo(x, COUNTER.top); }
      for (let y = 330; y <= COUNTER.top; y += 26) { c.moveTo(2060, y); c.lineTo(2500, y); }
      c.stroke();
      c.restore();
    },
  });
  add('counter-top', box(2050, COUNTER.top, 2510, COUNTER.top + 22, 105), { color: '#6d6774', tex: 'washi', lift: 5, edge: 0.4 });
  add('counter-front', box(2060, COUNTER.top + 22, 2500, FLOOR, 106), { ...cab, color: '#cbc3b4', lift: 4 });
  for (let i = 0; i < 3; i++) {
    const x0 = 2072 + i * 144;
    add('cab-d' + i, box(x0, COUNTER.top + 36, x0 + 132, FLOOR - 14, 107 + i), { ...cab, color: '#d9d2c4', lift: 3 });
    add('cab-dh' + i, box(x0 + 50, COUNTER.top + 50, x0 + 82, COUNTER.top + 56, 111 + i), { color: '#8b8a92', tex: 'plain', lift: 3 });
  }
  add('pendant-cord', box(2279, CEIL - 60, 2281, 214, 115, { jag: 0, wander: 0 }), { color: '#1f1d26', tex: null, lift: 6, edge: 0 });
  add('pendant', cs([[2240, 250], [2254, 214], [2306, 214], [2320, 250]], 116), { color: '#3d4c5c', tex: 'plain', lift: 14, edge: 0.4 });
  add('canister', cs(roundRect(2420, 500, 2464, COUNTER.top + 2, 6), 117), { color: '#b7524a', tex: 'plain', lift: 5 });

  // the far door (to the hallway)
  add('door-frame', box(2930, 190, 3130, FLOOR, 120), { color: '#5f5872', tex: 'plain', lift: 6, edge: 0.3 });
  add('door-hole', box(2946, 206, 3114, FLOOR, 121, { jag: 0.2 }), { color: '#141219', tex: 'plain', lift: 0, edge: 0 });

  // fridge body (doors are drawn live: one of them opens)
  add('fr-body', cs(roundRect(FRIDGE.x0, FRIDGE.y0, FRIDGE.x1, FRIDGE.y1, 14), 130, { jag: 0.2, wander: 0.5 }), { color: '#cfcfc8', tex: 'plain', lift: 14, edge: 0.3 });
  add('fr-drawer1', cs(roundRect(FRIDGE.x0 + 6, FRIDGE.doorY1 + 8, FRIDGE.x1 - 6, 652, 8), 131), { color: '#dedfd8', tex: 'plain', lift: 4, edge: 0.35 });
  add('fr-drawer2', cs(roundRect(FRIDGE.x0 + 6, 658, FRIDGE.x1 - 6, FRIDGE.y1 - 6, 8), 132), { color: '#dedfd8', tex: 'plain', lift: 4, edge: 0.35 });
  add('fr-dh1', box(2660, 540, 2780, 548, 133), { color: '#9c9ca4', tex: 'plain', lift: 3 });
  add('fr-dh2', box(2660, 672, 2780, 680, 134), { color: '#9c9ca4', tex: 'plain', lift: 3 });

  const fridge = {
    doorL: cs(roundRect(FRIDGE.x0 + 6, FRIDGE.y0 + 6, FRIDGE.split - 2, FRIDGE.doorY1, 10), 140, { jag: 0.2 }),
    doorR: cs(roundRect(0, FRIDGE.y0 + 6, FRIDGE.x1 - 6 - FRIDGE.split - 2, FRIDGE.doorY1, 10), 141, { jag: 0.2 }),
    handleL: box(FRIDGE.split - 16, 290, FRIDGE.split - 9, 420, 142),
    handleR: box(8, 290, 15, 420, 143),
    inside: box(FRIDGE.split, FRIDGE.y0 + 10, FRIDGE.x1 - 10, FRIDGE.doorY1 - 4, 144, { jag: 0.1 }),
    shelf: [0, 1, 2].map((i) => box(FRIDGE.split + 4, 240 + i * 92, FRIDGE.x1 - 14, 246 + i * 92, 145 + i, { jag: 0.1 })),
    doorIn: cs(roundRect(-26, FRIDGE.y0 + 6, 0, FRIDGE.doorY1, 6), 150),
    disp: cs(roundRect(DISP.x, DISP.y, DISP.x + DISP.w, DISP.y + DISP.h, 6), 151, { jag: 0.1, wander: 0.2 }),
    dispBack: cs(roundRect(DISP.x, DISP.y, DISP.x + DISP.w, DISP.y + DISP.h, 6), 152, { jag: 0.1, wander: 0.2 }),
    soy: box(-15, -52, 15, 0, 153, { jag: 0.2 }),
    soyTop: cs([[-15, -52], [0, -64], [15, -52]], 154),
    bottle: cs([[-9, 0], [-9, -54], [-4, -62], [-4, -74], [4, -74], [4, -62], [9, -54], [9, 0]], 155),
    jar: cs(roundRect(-14, -30, 14, 0, 4), 156),
    egg: cs(ellipsePts(8, 10, 16), 157),
  };

  // kitchen things that move
  const kitchen = {
    kettleBody: cs(smooth([[-34, 0], [-38, -30], [-26, -54], [0, -60], [26, -54], [38, -30], [34, 0]], true, 5), 160),
    kettleLid: cs([[-14, -58], [-10, -68], [10, -68], [14, -58]], 161),
    kettleKnob: disc(5, 162),
    kettleSpout: cs([[30, -12], [38, -10], [64, -60], [84, -80], [86, -76], [66, -52], [42, -2]], 163, { jag: 0.1 }),
    kettleHandle: cs([[-30, -52], [-58, -46], [-60, -12], [-34, -8], [-36, -16], [-50, -18], [-50, -40], [-30, -44]], 164),
    server: cs([[-30, 0], [-34, -52], [34, -52], [30, 0]], 165, { jag: 0.1 }),
    dripper: cs([[-40, -52], [40, -52], [14, -92], [-14, -92]], 166),
    dripperRim: box(-44, -98, 44, -90, 167),
    mugBody: cs(roundRect(-22, -54, 22, 0, 6), 170),
    mugHandle: cs([[20, -44], [36, -42], [38, -18], [20, -14], [20, -22], [30, -24], [30, -36], [20, -36]], 171),
    coffee: box(-19, -52, 19, -46, 172, { jag: 0.1 }),
  };

  S = { still, clock, fridge, kitchen };
}

// ---------------------------------------------------------------------------
// The man's chair and the man himself live in man.js; the room only knows
// where the foreground plane is and how bright the night is.

export const ambientAt = (dawn) => mix('#34324e', '#8a7a86', dawn);

function wall() {
  const ctx = R.ctx;
  const fillPat = (name, x, y, w, h, ts, a, tx = 0, ty = 0) => {
    const p = pat(name);
    setPat(p, tx, ty, ts, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = a;
    ctx.fillStyle = p;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
  ctx.fillStyle = '#8b84a6';
  ctx.fillRect(-900, CEIL, 5000, FLOOR - CEIL);
  fillPat('tate', -900, CEIL, 5000, FLOOR - CEIL, 0.8, 0.2, 40, 10);
  // ceiling
  ctx.fillStyle = '#5b5674';
  ctx.fillRect(-900, -800, 5000, 800 + CEIL);
  ctx.fillStyle = 'rgba(20,16,30,0.35)';
  ctx.fillRect(-900, CEIL - 10, 5000, 10);
  // floor boards
  ctx.fillStyle = '#8c6e5e';
  ctx.fillRect(-900, FLOOR, 5000, 900);
  fillPat('wood', -900, FLOOR, 5000, 900, 1.4, 1, 0, FLOOR);
  ctx.strokeStyle = 'rgba(40,24,20,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let y = FLOOR + 22, k = 0; y < FLOOR + 900; y += 22 + k * 5, k++) { ctx.moveTo(-900, y); ctx.lineTo(4100, y); }
  ctx.stroke();
  // baseboard
  ctx.fillStyle = '#5d5670';
  ctx.fillRect(-900, FLOOR - 18, 5000, 18);
}

function clockHands(t) {
  const { x, y } = CLOCK;
  const C = S.clock;
  stillPiece('clock-rim', C.rim, { x, y, color: '#3a3844', tex: 'plain', lift: 12, edge: 0.4 });
  stillPiece('clock-face', C.face, {
    x, y, color: '#efe8da', tex: 'plain', lift: 3, edge: 0.2,
    print: (c) => {
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = 'rgba(30,26,34,0.85)';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const l = i % 3 === 0 ? 8 : 4;
        c.save();
        c.rotate(a);
        c.fillRect(-1.2, -(CLOCK.r - 12), 2.4, l);
        c.restore();
      }
      c.restore();
    },
  });
  const hh = ((t.h % 12) + t.m / 60) / 12, mm = (t.m + t.s / 60) / 60, ss = Math.floor(t.s) / 60;
  piece(C.hour, { x, y, r: hh * Math.PI * 2, color: '#1f1d24', tex: null, lift: 5, edge: 0 });
  piece(C.min, { x, y, r: mm * Math.PI * 2, color: '#1f1d24', tex: null, lift: 6, edge: 0 });
  piece(C.sec, { x, y, r: ss * Math.PI * 2, color: '#c8413a', tex: null, lift: 7, edge: 0 });
  piece(C.pin, { x, y, color: '#2b2930', tex: null, lift: 8, edge: 0.3 });
}

// Fridge. door: 0 shut .. 1 open (right door swings towards us).
function fridgeDoors(o) {
  const Fr = S.fridge;
  const { door = 0 } = o;
  const dx = FRIDGE.split + 2;
  stillPiece('fr-doorL', Fr.doorL, { color: '#e2e2dc', tex: 'plain', lift: 6, edge: 0.35 });
  stillPiece('fr-hL', Fr.handleL, { color: '#a4a4ac', tex: 'plain', lift: 5, edge: 0.4 });
  if (door <= 0.01) {
    stillPiece('fr-doorR', Fr.doorR, { x: dx, color: '#e2e2dc', tex: 'plain', lift: 6, edge: 0.35 });
    stillPiece('fr-hR', Fr.handleR, { x: dx, color: '#a4a4ac', tex: 'plain', lift: 5, edge: 0.4 });
    return;
  }
  // inside: light, shelves, the things people keep
  piece(Fr.inside, { color: o.sea ? '#a9d2f4' : '#f4efe2', tex: 'plain', lift: 0, edge: 0 });
  for (const sh of Fr.shelf) piece(sh, { color: '#cfd8da', tex: null, lift: 2, edge: 0.4 });
  if (!o.soyGone) fridgeThing('soy', 2760, 332);
  fridgeThing('bottle', 2812, 332);
  fridgeThing('jar', 2764, 424);
  fridgeThing('egg', 2820, 416);
  fridgeThing('bottle', 2846, 240, 0.8);
  // the door, seen swinging open towards us: narrower as it turns, its thickness showing
  const w = FRIDGE.x1 - 6 - FRIDGE.split - 2;
  const ang = door * Math.PI * 0.46;
  const sx = Math.cos(ang), hinge = FRIDGE.x1 - 6;
  piece(Fr.doorR, { x: hinge - w * sx, sx, color: '#d8d8d2', tex: 'plain', lift: 20, edge: 0.3, shade: door * 0.2 });
  piece(Fr.doorIn, { x: hinge - w * sx, sx: Math.sin(ang), color: '#c4c8c2', tex: 'plain', lift: 20, edge: 0.3 });
}
function fridgeThing(kind, x, y, s = 1) {
  const Fr = S.fridge;
  if (kind === 'soy') {
    piece(Fr.soy, { x, y, s, color: '#f4f3ea', tex: 'plain', lift: 3, print: (c) => {
      c.fillStyle = '#6a9a58';
      c.fillRect(-15, -40, 30, 16);
      ink(c, '豆乳', 0, -32, `700 9px ${F.mincho}`, 'rgba(255,255,255,0.95)');
    } });
    piece(Fr.soyTop, { x, y, s, color: '#e9e8de', tex: 'plain', lift: 3 });
  } else if (kind === 'bottle') piece(Fr.bottle, { x, y, s, color: '#7fae8e', tex: 'plain', lift: 3, edge: 0.5 });
  else if (kind === 'jar') piece(Fr.jar, { x, y, s, color: '#d98c4a', tex: 'plain', lift: 3 });
  else if (kind === 'egg') piece(Fr.egg, { x, y, s, color: '#f1e3cf', tex: 'plain', lift: 3 });
}
export function soyCarton(x, y, r = 0, s = 1) {
  if (!S) build();
  const Fr = S.fridge;
  piece(Fr.soy, { x, y, r, s, color: '#f4f3ea', tex: 'plain', lift: 12, print: (c) => {
    c.fillStyle = '#6a9a58';
    c.fillRect(-15, -40, 30, 16);
    ink(c, '豆乳', 0, -32, `700 9px ${F.mincho}`, 'rgba(255,255,255,0.95)');
  } });
  piece(Fr.soyTop, { x, y, r, s, color: '#e9e8de', tex: 'plain', lift: 12 });
}

// The fridge's display: a little lit window with dotted type (self-lit).
// o.lcd: { text, wave (0..1 talking), flip (0..1 the panel turning over) }
function fridgeDisplay(o) {
  const Fr = S.fridge;
  const { lcd = {}, led = 1 } = o;
  const ctx = R.ctx;
  const flip = lcd.flip || 0;
  const sx = Math.cos(flip * Math.PI);
  const cx = DISP.x + DISP.w / 2;
  ctx.save();
  ctx.translate(cx, 0);
  ctx.scale(sx || 0.02, 1);
  ctx.translate(-cx, 0);
  const back = sx < 0;
  piece(back ? Fr.dispBack : Fr.disp, { color: back ? '#10183a' : '#101815', tex: null, lift: 3, edge: 0.3 });
  ctx.restore();
  // lit part (after the light pass)
  return () => {
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(sx || 0.02, 1);
    ctx.translate(-cx, 0);
    ctx.beginPath();
    ctx.rect(DISP.x + 4, DISP.y + 4, DISP.w - 8, DISP.h - 8);
    ctx.clip();
    if (back) {
      // the panel's other side: a tiny night sea with a pale dolphin
      const g = ctx.createLinearGradient(0, DISP.y, 0, DISP.y + DISP.h);
      g.addColorStop(0, '#223370');
      g.addColorStop(1, '#0f1a44');
      ctx.fillStyle = g;
      ctx.fillRect(DISP.x, DISP.y, DISP.w, DISP.h);
      ctx.fillStyle = 'rgba(190,245,225,0.95)';
      ctx.save();
      ctx.translate(cx, DISP.y + DISP.h / 2 + 2);
      ctx.scale(-0.2, 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 90, 28, 0, 0, Math.PI * 2);
      ctx.moveTo(-80, -6); ctx.lineTo(-120, -34); ctx.lineTo(-112, 0); ctx.lineTo(-122, 30); ctx.closePath();
      ctx.moveTo(-6, -24); ctx.lineTo(-28, -56); ctx.lineTo(-36, -22); ctx.closePath();
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `rgba(255,250,220,${hash(i, Math.floor(R.frame / 2)) > 0.4 ? 0.9 : 0.4})`;
        ctx.fillRect(DISP.x + 8 + hash('ds', i) * (DISP.w - 16), DISP.y + 6 + hash('dy', i) * 12, 1.6, 1.6);
      }
    } else {
      ctx.fillStyle = '#0d1a14';
      ctx.fillRect(DISP.x, DISP.y, DISP.w, DISP.h);
      ctx.fillStyle = 'rgba(120,255,190,0.08)';
      for (let yy = DISP.y + 4; yy < DISP.y + DISP.h; yy += 3) ctx.fillRect(DISP.x, yy, DISP.w, 1);
      const on = lcd.dim ? 0.45 : 1;
      ctx.fillStyle = `rgba(130,255,196,${0.92 * on})`;
      if (lcd.wave) {
        // a voice: bars that jump
        const n = 13;
        for (let i = 0; i < n; i++) {
          const h = 3 + Math.abs(hs(i, R.frame, 'wv')) * 28 * lcd.wave;
          ctx.fillRect(DISP.x + 8 + i * 6.5, DISP.y + DISP.h / 2 - h / 2, 4, h);
        }
      } else {
        const text = lcd.text || LCD.temp;
        const size = [...text].length > 5 ? 13 : 20;
        ctx.font = `400 ${size}px ${F.dot}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (lcd.scroll) {
          ctx.textAlign = 'left';
          const tw = ctx.measureText(text).width;
          const off = (R.frame * 3) % (tw + DISP.w);
          ctx.fillText(text, DISP.x + DISP.w - off, DISP.y + DISP.h / 2 + 1);
        } else ctx.fillText(text, cx, DISP.y + DISP.h / 2 + 1);
      }
    }
    ctx.restore();
    // status LED
    ctx.fillStyle = `rgba(110,255,170,${0.35 + 0.65 * led})`;
    ctx.beginPath();
    ctx.arc(DISP.x + DISP.w - 6, DISP.y + DISP.h + 12, 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (led > 0.05) glow(DISP.x + DISP.w - 6, DISP.y + DISP.h + 12, 16, '110,255,170', 0.5 * led);
    const lx = DISP.x + DISP.w - 6, ly = DISP.y + DISP.h + 12;
    bloom((g) => {
      g.fillStyle = back ? 'rgba(120,170,255,0.8)' : 'rgba(110,255,180,0.8)';
      g.fillRect(DISP.x, DISP.y, DISP.w, DISP.h);
      g.beginPath();
      g.arc(lx, ly, 5, 0, Math.PI * 2);
      g.fill();
    }, 0.55);
  };
}

// Kitchen things (kettle, dripper, server). o.kettle: {x, y, r}, o.pour, o.level
function kitchenThings(o) {
  const K = S.kitchen;
  if (o.only === 'stream') return stream(o);
  const k = o.kettle || { x: KETTLE.x, y: KETTLE.y, r: 0 };
  const kb = { x: k.x, y: k.y, r: k.r || 0, tex: 'plain', lift: k.lift ?? 5 };
  piece(K.kettleHandle, { ...kb, color: '#2a292f', edge: 0.3 });
  piece(K.kettleSpout, { ...kb, color: '#2f2e35', edge: 0.3 });
  piece(K.kettleBody, { ...kb, color: '#34333a', edge: 0.35 });
  piece(K.kettleLid, { ...kb, color: '#2a292f', edge: 0.3 });
  const lvl = clamp(o.level ?? 0);
  // glass server with coffee inside
  const d = { x: DRIP.x, y: DRIP.y };
  piece(K.server, { ...d, color: '#c6ccd2', tex: null, lift: 4, edge: 0.5, alpha: 0.9, print: (c) => {
    if (lvl > 0) {
      c.fillStyle = '#3a2418';
      c.fillRect(-34, -lvl * 44, 68, lvl * 44 + 2);
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(-24, -48, 4, 44);
  } });
  piece(K.dripper, { ...d, color: '#ece6da', tex: 'plain', lift: 5, edge: 0.4 });
  piece(K.dripperRim, { ...d, color: '#e4ddcf', tex: 'plain', lift: 6, edge: 0.4 });
  if (o.drip) dripDrop();
}
function stream(o) {
  const k = o.kettle || { x: KETTLE.x, y: KETTLE.y, r: 0 };
  {
    // the thin stream of hot water from the spout (drawn after the light pass: it glints)
    const ctx = R.ctx;
    const c = Math.cos(k.r || 0), s = Math.sin(k.r || 0);
    const tipX = k.x + 85 * c - -78 * s, tipY = k.y + 85 * s + -78 * c;
    ctx.save();
    ctx.strokeStyle = `rgba(215,230,250,${0.75 * o.pour})`;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX + 6, tipY + 12, DRIP.x - 4 + hs(R.frame, 'st') * 2, DRIP.y - 92);
    ctx.stroke();
    ctx.restore();
  }
}
function dripDrop() {
  // drops falling from the dripper into the server
  const ctx = R.ctx;
  const t = R.frame % 6;
  ctx.fillStyle = 'rgba(70,40,24,0.9)';
  ctx.beginPath();
  ctx.ellipse(DRIP.x, DRIP.y - 50 + t * 5, 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A mug of coffee on the desk (with steam, drawn by the caller if hot).
export function mug(o = {}) {
  if (!S) build();
  const K = S.kitchen;
  const { x = MUG.x, y = MUG.y, r = 0, lift = 4, level = 1, s = 1 } = o;
  piece(K.mugHandle, { x, y, r, s, color: '#ece6da', tex: 'plain', lift, edge: 0.4 });
  piece(K.mugBody, { x, y, r, s, color: '#efe9dd', tex: 'plain', lift, edge: 0.4, print: (c) => {
    c.fillStyle = 'rgba(70,110,170,0.8)';
    c.fillRect(-22, -30, 44, 7);
    if (level > 0) { c.fillStyle = '#2c1a12'; c.fillRect(-19, -52, 38, 4); }
  } });
}

// Steam: replacement curls, a new one every two frames.
const STEAM = [];
function steamShape(i) {
  if (!STEAM[i]) {
    const pts = [];
    const ph = i * 1.7;
    for (let k = 0; k <= 10; k++) pts.push([Math.sin(k * 0.7 + ph) * 7, -k * 9]);
    for (let k = 10; k >= 0; k--) pts.push([Math.sin(k * 0.7 + ph) * 7 + 5 - k * 0.3, -k * 9]);
    STEAM[i] = cutShape(pts, 180 + i, { jag: 0.1, wander: 0.3, step: 10 });
  }
  return STEAM[i];
}
export function steam(id, x, y, f, a = 1, s = 1) {
  for (let j = 0; j < 2; j++) {
    const i = (Math.floor(f / 2) + j * 2) % 4;
    const rise = ((f + j * 7) % 14) / 14;
    piece(steamShape(i), {
      x: x + (j ? 9 : -8) * s, y: y - rise * 26 * s, s: s * (0.8 + rise * 0.4), color: '#f2f0ee', tex: null, lift: 0, edge: 0,
      alpha: a * 0.5 * Math.sin(Math.PI * rise), shadowK: 0,
    });
  }
}

// ---------------------------------------------------------------------------
// One frame of the room. See the header for the order of planes.
//   o.cam {x,y,z}  o.dawn 0..1  o.time {h,m,s}  o.screen(ctx)  o.fridge {door, lcd, led, soyGone}
//   o.lightsExtra []  o.bg()  o.air() (between room and foreground)  o.fg() foreground  o.front()
//   o.caustic 0..1  o.monitor 0..1 (brightness)  o.kitchen {...}  o.mug {...}  o.mugHot
export function room(o) {
  if (!S) build();
  const { cam, dawn = 0, monitor = 1 } = o;
  withCam(cam.x, cam.y, cam.z, () => {
    const ctx = R.ctx;
    // 1. the room: paper
    wall();
    for (const p of S.still) stillPiece(p.key, p.sh, p.o);
    clockHands(o.time || { h: 23, m: 40, s: 0 });
    fridgeDoors(o.fridge || {});
    const lcdLit = fridgeDisplay(o.fridge || {});
    kitchenThings(o.kitchen || {});
    if (o.mug !== null) mug(o.mug || {});
    if (o.bg) o.bg();

    // 2. light
    const Ls = [];
    const mon = monitor * (1 - dawn * 0.35);
    Ls.push({ x: 1520, y: 430, r: 820, color: [150, 185, 255], a: 0.62 * mon, core: 0.3 });
    Ls.push({ x: 1520, y: 610, r: 420, color: [170, 200, 255], a: 0.5 * mon, sy: 0.55 });
    Ls.push({ type: 'rect', x: 1214, y: 240, w: 612, h: 344, blur: 70, color: [200, 225, 255], a: 0.55 * mon });
    // the window: city glow at night, daylight at dawn
    const night = 1 - dawn;
    Ls.push({ type: 'rect', x: 150, y: 110, w: 700, h: 640, blur: 90, color: mixRGB([120, 80, 150], [255, 214, 170], dawn), a: 0.5 + dawn * 0.5 });
    Ls.push({ x: 560, y: 900, r: 700, color: [255, 80, 160], a: 0.2 * night * (o.neon ?? 1), sy: 0.5 });
    Ls.push({ x: 330, y: 820, r: 520, color: [60, 210, 255], a: 0.14 * night * (o.neon ?? 1), sy: 0.5 });
    if (dawn > 0) {
      // first sunlight falls across the room in a long slant
      Ls.push({ type: 'poly', pts: [[880, 120], [880, 700], [2300, FLOOR + 60], [2300, 380]], blur: 120, color: [255, 190, 130], a: 0.55 * dawn });
    }
    const door = o.fridge?.door || 0;
    if (door > 0) {
      const sea = o.fridge?.sea;
      Ls.push({ x: 2800, y: 380, r: 620, color: sea ? [110, 200, 255] : [255, 236, 200], a: 0.8 * door, core: 0.2 });
      Ls.push({ type: 'rect', x: FRIDGE.split, y: FRIDGE.y0 + 10, w: 150, h: 360, blur: 30, color: sea ? [160, 225, 255] : [255, 250, 235], a: door });
    }
    Ls.push({ x: DISP.x + DISP.w / 2, y: DISP.y + 30, r: 150, color: [110, 255, 180], a: 0.2 * (o.fridge?.led ?? 1) });
    if (o.lightsExtra) Ls.push(...o.lightsExtra);
    if (o.caustic > 0) Ls.push({ type: 'rect', x: -600, y: -300, w: 4200, h: 1700, blur: 10, color: [40, 90, 160], a: 0.32 * o.caustic });
    lights(ambientAt(dawn), Ls);

    // 3. the city, through the glass
    ctx.save();
    ctx.beginPath();
    for (const [x, y, w, h] of PANES) ctx.rect(x, y, w, h);
    ctx.clip();
    R.bloomClip = { rects: PANES, m: ctx.getTransform() };
    try { withPlane(0.3, () => drawCity(o)); } finally { R.bloomClip = null; }
    ctx.restore();
    glassReflections(o);

    // 4. self-lit things in the room
    screenPass(o, mon);
    lcdLit();
    if (o.kitchen?.pour > 0) kitchenThings({ ...o.kitchen, lit: true, only: 'stream' });
    if (o.caustic > 0) caustics(o.caustic);
    curtain(o);
    bloomFlush(o.bloom ?? 1); // glow of the screen and the city, behind the man

    // 5. between the room and the man
    if (o.air) o.air();
    // 6. the man and his chair (foreground plane)
    if (o.fg) withPlane(1.3, () => o.fg());
    if (o.front) o.front();
    bloomFlush(o.bloom ?? 1);
  });
}

function mixRGB(a, b, t) { return a.map((v, i) => Math.round(lerp(v, b[i], clamp(t)))); }

// The monitor's glass: base light, then whatever is on screen.
function screenPass(o, mon) {
  const ctx = R.ctx;
  if (mon <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(SCR.x, SCR.y, SCR.w, SCR.h);
  ctx.clip();
  const base = o.screenBase || '#e7f1fa';
  ctx.fillStyle = base;
  ctx.globalAlpha = mon;
  ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  // a lightbox is never perfectly even
  const g = ctx.createRadialGradient(SCR.x + SCR.w * 0.5, SCR.y + SCR.h * 0.45, 40, SCR.x + SCR.w * 0.5, SCR.y + SCR.h * 0.5, SCR.w * 0.62);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(90,110,150,0.22)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = g;
  ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  // the fibres of the paper stretched over the light
  const p = pat('plain');
  setPat(p, 0, 0, 0.6, 0);
  ctx.globalAlpha = 0.5 * mon;
  ctx.fillStyle = p;
  ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (o.screen) o.screen(ctx);
  ctx.restore();
  bloom((b) => {
    b.fillStyle = 'rgba(190,215,255,0.6)';
    b.fillRect(SCR.x + 10, SCR.y + 10, SCR.w - 20, SCR.h - 20);
  }, 0.5 * mon);
}

function glassReflections(o) {
  const ctx = R.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [x, y, w, h] of PANES) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0.18, 'rgba(255,255,255,0)');
    g.addColorStop(0.24, 'rgba(210,220,255,0.07)');
    g.addColorStop(0.3, 'rgba(255,255,255,0)');
    g.addColorStop(0.62, 'rgba(255,255,255,0)');
    g.addColorStop(0.66, 'rgba(210,220,255,0.05)');
    g.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  ctx.restore();
}

// Curtain: hangs in front of the glass, lit from behind by the city.
let CURT = null;
function curtain(o) {
  const dawn = o.dawn || 0;
  if (!CURT) {
    const mk = (x0, x1, seed) => {
      const pts = [];
      const n = 9;
      for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n + (i % 2 ? 5 : -3), 56 + (i % 2) * 3]);
      for (let i = n; i >= 0; i--) pts.push([x0 + ((x1 - x0) * i) / n + Math.sin(i * 1.3) * 6, FLOOR - 6 + (i % 2) * 4]);
      return cutShape(pts, seed, { jag: 0.4, wander: 1, step: 16 });
    };
    CURT = { r: mk(846, 968, 190), l: mk(52, 150, 191) };
  }
  const col = mix('#3d3450', '#a58f9e', dawn);
  const rim = { color: dawn > 0.5 ? '255,210,170' : '255,120,190', a: 0.45 + dawn * 0.3, w: 6, ang: Math.PI, spread: 0.5 };
  for (const [k, sh] of [['r', CURT.r], ['l', CURT.l]]) {
    piece(sh, {
      color: col, tex: 'washi', ts: 0.8, lift: 10, edge: 0, rim: k === 'r' ? rim : { ...rim, ang: 0 },
      print: (c) => {
        c.save();
        c.globalCompositeOperation = 'multiply';
        c.strokeStyle = 'rgba(20,14,30,0.35)';
        c.lineWidth = 5;
        const x0 = k === 'r' ? 846 : 52, x1 = k === 'r' ? 968 : 150;
        for (let x = x0 + 14; x < x1; x += 24) { c.beginPath(); c.moveTo(x, 60); c.lineTo(x + 4, FLOOR); c.stroke(); }
        c.restore();
      },
    });
  }
}

// Light through water, rippling over everything in the room (the night swim).
function caustics(a) {
  const ctx = R.ctx;
  const c = CAUSTIC[Math.floor(R.frame / 2) % CAUSTIC.length];
  if (!c) return;
  let p = R.pats.get('caus' + c.width + (Math.floor(R.frame / 2) % CAUSTIC.length));
  if (!p) { p = ctx.createPattern(c, 'repeat'); R.pats.set('caus' + c.width + (Math.floor(R.frame / 2) % CAUSTIC.length), p); }
  setPat(p, R.frame * 1.6, R.frame * 0.5, 4.4, 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-900, -600, 5000, 2400);
  for (const [x, y, w, h] of PANES) ctx.rect(x, y, w, h);
  ctx.rect(SCR.x, SCR.y, SCR.w, SCR.h);
  ctx.clip('evenodd');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = p;
  // strongest on the floor, fading up the walls, none on the ceiling
  for (const [y0, y1, k] of [[FLOOR - 40, 1800, 1], [420, FLOOR - 40, 0.6], [220, 420, 0.32], [80, 220, 0.12]]) {
    ctx.globalAlpha = 0.15 * a * k;
    ctx.fillRect(-900, y0, 5000, y1 - y0);
  }
  ctx.restore();
}

export { S as ROOM_PIECES };
