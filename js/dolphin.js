// dolphin.js — the dolphin (and, at night, the fridge's other face).
// Both are cut from cellophane: film you can see light through.
import { R, cello, glow, bloom } from './render.js';
import { cutShape, smooth } from './cut.js';
import { hs, hash } from './util.js';

// Side view, facing right. Beak tip at x = +100, tail tip near x = -116.
const UPPER = [
  [100, 2], [93, -3], [80, -6], [71, -15], [59, -25], [41, -31], [16, -33],
  [-2, -32], [-26, -58], [-36, -61], [-34, -29], // dorsal fin
  [-52, -21], [-72, -12], [-84, -8],
];
const LOWER = [[100, 2], [93, 7], [72, 12], [50, 20], [22, 26], [-10, 24], [-40, 15], [-66, 6], [-84, 2]];
const MID = [[93, 5], [74, 6], [52, 9], [24, 12], [-10, 12], [-40, 8], [-66, 3], [-84, 0]];
const FLUKE = [[-80, -7], [-104, -31], [-117, -30], [-103, -3], [-116, 21], [-103, 21], [-80, 2]];
const FIN = [[30, 13], [46, 15], [36, 27], [16, 42], [14, 36]];
export const EYE = [58, -11];

// Undulation: the head holds still, the tail swings (a wave travelling back).
function bend(x, ph, A) {
  if (x >= 58) return 0;
  const u = (58 - x) / 170;
  return A * Math.sin(ph - u * 2.4) * Math.pow(u, 1.5);
}
function bendPts(pts, ph, A) {
  return pts.map(([x, y]) => [x, y + bend(x, ph, A)]);
}
function rotAbout(pts, cx, cy, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}
// lower jaw drops open around the corner of the mouth
function openJaw(pts, open) {
  if (!open) return pts;
  return pts.map((p) => (p[0] > 64 ? rotAbout([p], 64, 6, open * 0.26)[0] : p));
}

const cache = new Map();
export function dolphinShape(pose, mouth, kind = 'blue') {
  const key = `${kind}|${pose}|${mouth}`;
  let S = cache.get(key);
  if (S) return S;
  const ph = (pose / 8) * Math.PI * 2;
  const A = 15;
  const open = [0, 0.55, 1][mouth] || 0;
  const round = kind === 'pale' ? 1.08 : 1;
  const fat = (pts) => pts.map(([x, y]) => [x, y * round]);
  const up = fat(bendPts(UPPER, ph, A));
  const lo = fat(openJaw(bendPts(LOWER, ph, A), open));
  const mid = fat(openJaw(bendPts(MID, ph, A), open * 0.9));
  // fluke follows the tail's slope
  const x0 = -84, e = 3;
  const slope = (bend(x0 + e, ph, A) - bend(x0 - e, ph, A)) / (2 * e);
  const dy = bend(x0, ph, A);
  const fl = fat(rotAbout(FLUKE.map(([x, y]) => [x, y + dy]), x0, dy, Math.atan(slope) * 1.3));
  const upS = smooth(up, false, 5);
  const midS = smooth(mid, false, 5);
  const loS = smooth(lo, false, 5);
  const body = [...upS, ...[...midS].reverse()];
  const belly = [...midS, ...[...loS].reverse()];
  const o = { jag: 0.18, wander: 0.35, step: 14, corner: 0.3 };
  S = {
    body: cutShape(body, 11, o),
    belly: cutShape(belly, 12, o),
    fluke: cutShape(fl, 13, o),
    fin: cutShape(fat(bendPts(FIN, ph, A * 0.3)), 14, o),
    all: cutShape([body, belly, fl], 15, { ...o, jag: 0, wander: 0 }),
    jawOpen: open,
  };
  cache.set(key, S);
  return S;
}

const COLORS = {
  blue: { body: '#3fa9d6', belly: '#c9eef6', fin: '#2f93c4', fluke: '#3aa1d0', back: '#223a86' },
  pale: { body: '#bfeee0', belly: '#f1fbf6', fin: '#a9e6d4', fluke: '#b8ecdc', back: '#2a3f7a' },
};

// o: x, y, s, r, pose (0..7), mouth (0..2), eye ('open'|'closed'|'happy'),
//    flip (angle, turning to show the other side), roll (angle, barrel roll),
//    mode ('box' on a screen | 'glow' in the air), kind ('blue'|'pale'), alpha, dir (1 right, -1 left)
export function dolphin(o = {}) {
  const {
    x = 0, y = 0, s = 1, r = 0, pose = 0, mouth = 0, eye = 'open', flip = 0, roll = 0, mode = 'box',
    kind = 'blue', alpha = 1, dir = 1, seed = 1, blush = kind === 'blue',
  } = o;
  const S = dolphinShape(((pose % 8) + 8) % 8, mouth, kind);
  const C = COLORS[kind];
  const sx = Math.cos(flip) * dir;
  const sy = Math.cos(roll);
  const back = Math.cos(flip) < 0; // we are looking at the other side of the film
  if (Math.abs(sx) < 0.04 || Math.abs(sy) < 0.04) {
    // edge-on: a sliver of film catching the light
    const ctx = R.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r);
    ctx.globalAlpha = alpha * 0.8;
    ctx.globalCompositeOperation = mode === 'box' ? 'multiply' : 'lighter';
    ctx.fillStyle = mode === 'box' ? C.fin : 'rgba(200,240,255,0.7)';
    if (Math.abs(sx) < 0.04) ctx.fillRect(-2 * s, -34 * s * Math.abs(sy), 4 * s, 62 * s * Math.abs(sy));
    else ctx.fillRect(-110 * s * Math.abs(sx), -2 * s, 210 * s * Math.abs(sx), 4 * s);
    ctx.restore();
    return;
  }
  const tx = hash(seed, 'tx') * 400 + (R.reduced ? 0 : Math.floor(R.frame / 3) % 2) * 7;
  const base = { x, y, r, s, sx, sy, mode, alpha, tx, ty: hash(seed, 'ty') * 400 };
  const col = (c) => (back ? C.back : c);
  cello(S.fluke, { ...base, color: col(C.fluke), crinkle: 0.5 });
  cello(S.body, { ...base, color: col(C.body), crinkle: 0.55 });
  cello(S.belly, { ...base, color: back ? '#2d4d9a' : C.belly, crinkle: 0.45 });
  cello(S.fin, { ...base, color: col(C.fin), crinkle: 0.4, edge: 0.45 });
  const ctx = R.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  ctx.scale(s * sx, s * sy);
  ctx.globalAlpha = alpha;
  const k = 1 / Math.max(0.2, s);
  if (back) {
    // the other side: a night sea, pricked with stars
    ctx.save();
    ctx.clip(S.all.path);
    ctx.globalCompositeOperation = mode === 'box' ? 'source-over' : 'lighter';
    for (let i = 0; i < 26; i++) {
      const px = -100 + hash(seed, 'st', i) * 196, py = -30 + hash(seed, 'sy', i) * 56;
      const tw = hash(i, Math.floor(R.frame / 2), 'tw') > 0.3;
      ctx.fillStyle = `rgba(255,250,225,${tw ? 0.95 : 0.5})`;
      ctx.beginPath();
      ctx.arc(px, py, (i % 5 === 0 ? 2.1 : 1.2) * Math.min(2, k * 0.8 + 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(200,225,255,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let xx = -110; xx <= 100; xx += 6) {
      const yy = 10 + Math.sin(xx * 0.09 + R.frame * 0.4) * 3;
      if (xx === -110) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.restore();
  } else {
    // eye: black paper with a pinhole; mouth: a line of thread
    const [ex, ey] = EYE;
    ctx.globalCompositeOperation = 'source-over';
    if (eye === 'open') {
      ctx.fillStyle = '#10141c';
      ctx.beginPath();
      ctx.arc(ex, ey, 5.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = kind === 'pale' ? '#8dffc0' : mode === 'box' ? '#f6fbff' : '#e8fbff';
      ctx.beginPath();
      ctx.arc(ex - 1.6, ey - 1.8, kind === 'pale' ? 2.2 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#10141c';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (eye === 'happy') ctx.arc(ex, ey + 2.5, 5, Math.PI * 1.1, Math.PI * 1.9);
      else ctx.arc(ex, ey - 2.5, 5, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(14,24,34,0.75)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const jo = S.jawOpen;
    if (jo > 0) {
      ctx.moveTo(92, 3); ctx.quadraticCurveTo(76, 4, 64, 5);
      const [lx, ly] = rotAbout([[92, 8]], 64, 6, jo * 0.26)[0];
      ctx.moveTo(lx, ly); ctx.quadraticCurveTo(76, 8 + jo * 5, 64, 6);
    } else {
      ctx.moveTo(93, 4); ctx.quadraticCurveTo(78, 7, 64, 3);
    }
    ctx.stroke();
    if (blush) {
      ctx.globalCompositeOperation = mode === 'box' ? 'multiply' : 'lighter';
      ctx.fillStyle = mode === 'box' ? 'rgba(255,170,190,0.55)' : 'rgba(255,140,170,0.35)';
      ctx.beginPath();
      ctx.ellipse(54, 3, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Light a glowing (night) dolphin gives off: for the light map and the bloom.
export function dolphinLight(x, y, s, kind = 'blue', a = 1) {
  const c = kind === 'pale' ? [150, 235, 205] : [80, 175, 235];
  return { x, y, r: 330 * s + 120, color: c, a: 0.42 * a, core: 0.25 };
}
export function dolphinBloom(x, y, s, kind = 'blue', a = 1) {
  const col = kind === 'pale' ? '170,245,215' : '110,200,245';
  bloom((g) => {
    const S = dolphinShape(0, 0, kind);
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = `rgba(${col},${0.5 * a})`;
    g.fill(S.all.path);
    g.restore();
  }, 0.8);
  glow(x, y, 150 * s, col, 0.2 * a);
}

// A tiny dolphin for the caption strip.
export function dolphinIcon(c, x, y, f) {
  c.save();
  c.translate(x, y);
  const S = dolphinShape(Math.floor(f / 2) % 8, 0, 'blue');
  c.scale(0.17, 0.17);
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = '#3fa9d6';
  c.fill(S.body.path);
  c.fill(S.fluke.path);
  c.fillStyle = '#bfe7f2';
  c.fill(S.belly.path);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#10141c';
  c.beginPath();
  c.arc(EYE[0], EYE[1], 7, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// Bubbles: rings of cellophane rising (deterministic per id).
export function bubbles(id, x, y, f, o = {}) {
  const { n = 5, life = 20, rise = 90, spread = 26, s = 1, mode = 'box', start = 0 } = o;
  const ctx = R.ctx;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const t0 = start + Math.floor(hash(id, i, 'b0') * life * 0.8);
    const t = f - t0;
    if (t < 0 || t > life) continue;
    const p = t / life;
    const bx = x + hs(id, i, 'bx') * spread * s + Math.sin(t * 0.6 + i) * 4 * s;
    const by = y - p * rise * s;
    const rr = (2.5 + hash(id, i, 'br') * 5) * s * (0.6 + p * 0.6);
    ctx.globalAlpha = p > 0.85 ? (1 - p) / 0.15 : 1;
    ctx.lineWidth = 1.3 * Math.max(0.6, s);
    if (mode === 'box') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = 'rgba(40,120,170,0.7)';
    } else {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(170,225,255,0.6)';
    }
    ctx.beginPath();
    ctx.arc(bx, by, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = mode === 'box' ? 'source-over' : 'lighter';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(bx - rr * 0.35, by - rr * 0.35, rr * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
