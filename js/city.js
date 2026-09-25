// city.js — the city below the window: paper silhouettes, lit windows, neon.
// Drawn in its own plane (it slides slower than the room as the camera pans).
import { R, piece, glow, bloom } from './render.js';
import { cutShape, rectPts, disc } from './cut.js';
import { rng, hash, mix, clamp, lerp } from './util.js';
import { F } from './fonts.js';
import { NEON } from './text.js';

const X0 = -700, X1 = 2600, HORIZON = 436;
let C = null;

function build() {
  const r = rng(1103);
  const far = [];
  // far skyline: a long strip with a jagged top, just under the horizon
  const farPts = [[X0, 900]];
  for (let x = X0; x <= X1; x += 10 + r() * 22) {
    const h = r() < 0.12 ? 18 + r() * 26 : r() * 10;
    farPts.push([x, HORIZON + 6 - h], [x + 8 + r() * 10, HORIZON + 6 - h]);
  }
  farPts.push([X1, 900]);
  const farSh = cutShape(farPts, 7, { jag: 0.2, wander: 0, step: 999, corner: 0.2 });

  // lights of the far city: dense near the horizon, sparser and larger below
  const dots = [];
  for (let i = 0; i < 2600; i++) {
    const u = Math.pow(r(), 1.8);
    const y = HORIZON + 8 + u * 330;
    const x = X0 + r() * (X1 - X0);
    const sz = 1.1 + u * 2.6;
    dots.push({ x, y, sz, warm: r(), tw: r() < 0.08 ? r() : -1, off: r() });
  }

  // mid-rise blocks seen from above (their roofs are below the horizon)
  const blocks = [];
  let x = X0;
  while (x < X1) {
    const w = 46 + r() * 90;
    const top = 470 + r() * 150;
    const pts = [[x, 900], [x, top]];
    if (r() < 0.3) pts.push([x + w * 0.3, top], [x + w * 0.3, top - 14], [x + w * 0.62, top - 14], [x + w * 0.62, top]);
    pts.push([x + w, top], [x + w, 900]);
    const wins = [];
    for (let wy = top + 12; wy < 880; wy += 13) for (let wx = x + 6; wx < x + w - 8; wx += 11) {
      if (r() < 0.55) continue;
      wins.push({ x: wx, y: wy, w: 5, h: 6, warm: r(), off: r() });
    }
    blocks.push({ sh: cutShape(pts, 100 + blocks.length, { jag: 0.3, wander: 0.6, step: 16, corner: 0.4 }), x, w, top, wins, tone: r() });
    x += w + 4 + r() * 26;
  }

  // towers that rise above the horizon (other tower blocks nearby)
  const towers = [
    { x: 330, w: 96, top: 250 }, { x: 760, w: 80, top: 196 }, { x: 1010, w: 118, top: 286 }, { x: 1300, w: 74, top: 232 },
    { x: 1640, w: 102, top: 300 }, { x: 1930, w: 84, top: 214 }, { x: 60, w: 70, top: 320 }, { x: 2260, w: 92, top: 262 },
  ].map((t, i) => {
    const pts = [[t.x, 900], [t.x, t.top + 16], [t.x + 8, t.top], [t.x + t.w - 8, t.top], [t.x + t.w, t.top + 16], [t.x + t.w, 900]];
    const wins = [];
    for (let wy = t.top + 26; wy < 880; wy += 15) for (let wx = t.x + 8; wx < t.x + t.w - 8; wx += 10) {
      if (r() < 0.5) continue;
      wins.push({ x: wx, y: wy, w: 5, h: 7, warm: r(), off: r() });
    }
    return { ...t, sh: cutShape(pts, 300 + i, { jag: 0.25, wander: 0.5, step: 18, corner: 0.4 }), wins, blink: r() * 24 };
  });

  // near roofs at the very bottom of the window
  const near = [];
  x = X0;
  while (x < X1) {
    const w = 140 + r() * 200, top = 680 + r() * 70;
    near.push({ sh: cutShape([[x, 900], [x, top], [x + w, top + (r() - 0.5) * 12], [x + w, 900]], 500 + near.length, { jag: 0.4, wander: 1, step: 18 }), x, w, top });
    x += w + 10 + r() * 60;
  }

  // neon signs (vertical boards with Japanese, horizontal ones with letters)
  const signs = [];
  const colors = ['255,176,72', '255,80,170', '120,255,150', '255,86,86', '80,225,255', '255,110,200', '190,130,255'];
  const place = [
    [880, 500, 'v', 0], [1080, 548, 'v', 1], [1262, 528, 'v', 2], [1452, 566, 'v', 3],
    [990, 612, 'h', 0], [1188, 640, 'h', 1], [1376, 660, 'h', 2],
    [610, 536, 'v', 0], [760, 610, 'h', 2], [420, 600, 'h', 0], [1760, 560, 'v', 1], [2010, 600, 'h', 1],
  ];
  place.forEach(([sx, sy, kind, k], i) => {
    const text = kind === 'v' ? NEON.vert[k % NEON.vert.length] : NEON.horiz[k % NEON.horiz.length];
    const n = [...text].length;
    const bw = kind === 'v' ? 34 : n * 21 + 18, bh = kind === 'v' ? n * 27 + 16 : 32;
    signs.push({
      x: sx, y: sy, kind, text, bw, bh, color: colors[i % colors.length],
      sh: cutShape(rectPts(bw, bh, 0, 0), 700 + i, { jag: 0.2, wander: 0.4, step: 12 }),
      flick: text === 'BAR' ? 1 : hash('fl', i) < 0.25 ? 0.4 : 0, on: 4 + i * 3,
    });
  });

  // an elevated expressway with cars
  const road = cutShape([[X0, 700], [X1, 660], [X1, 672], [X0, 712]], 900, { jag: 0.2, wander: 0.4, step: 30 });
  const moon = disc(30, 950);
  const moonBite = disc(27, 951);
  const stars = [];
  for (let i = 0; i < 60; i++) stars.push([X0 + r() * (X1 - X0), 110 + r() * 260, 0.6 + r() * 1.3, r()]);
  C = { farSh, dots, blocks, towers, near, signs, road, moon, moonBite, stars };
}

function skyGradient(ctx, dawn) {
  const g = ctx.createLinearGradient(0, 60, 0, 800);
  g.addColorStop(0, mix('#070920', '#5a6fae', dawn));
  g.addColorStop(0.26, mix('#10123a', '#b69ac0', dawn));
  g.addColorStop(0.42, mix('#2a1b48', '#f6ab94', dawn));
  g.addColorStop(0.5, mix('#4a2150', '#ffc27e', dawn));
  g.addColorStop(0.56, mix('#3a1c46', '#f2a07a', dawn));
  g.addColorStop(1, mix('#1a1432', '#6d5268', dawn));
  return g;
}

// o.dawn 0..1, o.neon 0..1 (signs on), o.sun (0..1 how risen)
export function drawCity(o = {}) {
  if (!C) build();
  const ctx = R.ctx;
  const f = R.frame;
  const dawn = clamp(o.dawn || 0);
  const neon = o.neon ?? 1;
  ctx.fillStyle = skyGradient(ctx, dawn);
  ctx.fillRect(X0, 40, X1 - X0, 900);

  // stars and moon (fade at dawn)
  if (dawn < 0.9) {
    const a = 1 - dawn / 0.9;
    for (const [sx, sy, sz, tw] of C.stars) {
      const on = hash('st', Math.floor(tw * 999), Math.floor(f / 3)) > 0.25;
      ctx.fillStyle = `rgba(255,248,230,${(on ? 0.8 : 0.35) * a})`;
      ctx.fillRect(sx, sy, sz, sz);
    }
    ctx.save();
    ctx.globalAlpha = a;
    piece(C.moon, { x: 1360, y: 196, color: '#f2e8cc', tex: 'plain', lift: 0, edge: 0.2 });
    piece(C.moonBite, { x: 1373, y: 188, color: mix('#0c0e2c', '#56699f', dawn), tex: null, lift: 0, edge: 0 });
    ctx.restore();
    glow(1356, 198, 90, '240,230,200', 0.18 * a);
  }
  // the sun, coming up behind the far skyline
  if (o.sun > 0) {
    const sy = lerp(HORIZON + 30, HORIZON - 96, o.sun);
    glow(1150, sy, 320, '255,170,90', 0.55 * o.sun);
    glow(1150, sy, 120, '255,240,210', 0.7 * o.sun);
    ctx.fillStyle = '#fff3d8';
    ctx.beginPath();
    ctx.arc(1150, sy, 34, 0, Math.PI * 2);
    ctx.fill();
    bloom((g) => { g.fillStyle = 'rgba(255,200,130,0.9)'; g.beginPath(); g.arc(1150, sy, 40, 0, Math.PI * 2); g.fill(); }, 0.8 * o.sun);
  }

  // towers first (they stand behind the lower city)
  const tone = (c1, c2) => mix(c1, c2, dawn);
  for (const [i, t] of C.towers.entries()) {
    piece(t.sh, { color: tone('#221e3e', '#3f3a58'), tex: 'tateS', texA: 0.35, lift: 0, edge: 0.12 + dawn * 0.25, tx: i * 90 });
  }
  piece(C.farSh, { color: tone('#1e1a38', '#8a6f86'), tex: null, lift: 0, edge: 0 });
  for (const b of C.blocks) piece(b.sh, { color: tone(b.tone < 0.5 ? '#2a2448' : '#322a52', b.tone < 0.5 ? '#4d4464' : '#58496a'), tex: 'tateS', texA: 0.3, lift: 0, edge: 0.14 + dawn * 0.2, tx: b.x });
  piece(C.road, { color: tone('#16132a', '#3a3248'), tex: null, lift: 0, edge: 0.2 });
  for (const n of C.near) piece(n.sh, { color: tone('#15122a', '#2f2940'), tex: 'tateS', texA: 0.25, lift: 0, edge: 0.18, tx: n.x });

  // lights (fewer as dawn comes)
  const lightsOn = 1 - clamp(dawn * 1.15) * 0.9;
  if (lightsOn > 0) {
    const warm = new Path2D(), cool = new Path2D(), dim = new Path2D();
    for (const d of C.dots) {
      if (d.off > lightsOn) continue;
      if (d.tw >= 0 && hash('dt', Math.floor(d.tw * 999), Math.floor(f / 2)) < 0.4) continue;
      (d.warm > 0.35 ? warm : cool).rect(d.x, d.y, d.sz, d.sz);
    }
    for (const b of [...C.blocks, ...C.towers]) for (const w of b.wins) {
      if (w.off > lightsOn) continue;
      (w.warm > 0.45 ? warm : w.warm > 0.12 ? cool : dim).rect(w.x, w.y, w.w, w.h);
    }
    ctx.fillStyle = `rgba(255,205,130,${0.85 * lightsOn + 0.1})`;
    ctx.fill(warm);
    ctx.fillStyle = `rgba(205,222,255,${0.8 * lightsOn + 0.1})`;
    ctx.fill(cool);
    ctx.fillStyle = `rgba(255,170,120,${0.5 * lightsOn})`;
    ctx.fill(dim);
    bloom((g) => {
      g.fillStyle = 'rgba(255,190,120,0.8)';
      g.fill(warm);
      g.fillStyle = 'rgba(190,210,255,0.8)';
      g.fill(cool);
    }, 0.55 * lightsOn);
    // cars on the expressway: white coming, red going
    for (let i = 0; i < 26; i++) {
      const dir = i % 2 ? 1 : -1;
      const sp = 7 + hash('car', i) * 6;
      const u = (((hash('cx', i) * 3300 + f * sp * dir) % 3300) + 3300) % 3300;
      const cx = X0 + u, cy = lerp(700, 660, u / 3300) + (dir > 0 ? 2 : 7);
      ctx.fillStyle = dir > 0 ? 'rgba(255,240,215,0.9)' : 'rgba(255,70,60,0.9)';
      ctx.fillRect(cx, cy, 5, 2.2);
      ctx.fillRect(cx + 7, cy, 5, 2.2);
    }
    // aviation lights on the towers
    for (const t of C.towers) {
      const on = (f + Math.floor(t.blink)) % 24 < 7;
      if (!on) continue;
      const lx = t.x + t.w / 2, ly = t.top - 2;
      ctx.fillStyle = 'rgba(255,60,50,1)';
      ctx.beginPath();
      ctx.arc(lx, ly, 3.4, 0, Math.PI * 2);
      ctx.fill();
      glow(lx, ly, 26, '255,70,60', 0.7 * (1 - dawn * 0.6));
      bloom((g) => { g.fillStyle = 'rgba(255,60,50,1)'; g.beginPath(); g.arc(lx, ly, 6, 0, Math.PI * 2); g.fill(); }, 1);
    }
  }

  // neon
  for (const [i, s] of C.signs.entries()) signBoard(s, i, f, neon, dawn, o.neonStart ?? -999);
}

function signBoard(s, i, f, neon, dawn, start) {
  const ctx = R.ctx;
  piece(s.sh, { x: s.x, y: s.y, color: mix('#15121f', '#4d4452', dawn), tex: null, lift: 0, edge: 0.15 });
  // is it lit this frame?
  let lit = neon > hash('nn', i) * 0.95 + 0.02;
  if (start > -999 && f - start < s.on) lit = false;
  if (lit && s.flick > 0 && hash('fk', i, f) < 0.14 * s.flick) lit = false;
  const t0 = start > -999 ? f - start - s.on : 99;
  if (t0 >= 0 && t0 < 2 && hash('fz', i, f) < 0.5) lit = !lit;
  const n = [...s.text];
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const draw = (g, bright) => {
    g.font = s.kind === 'v' ? `600 22px ${F.hand}` : `600 20px ${F.hand}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const put = (fn) => {
      if (s.kind === 'v') n.forEach((ch, k) => fn(ch, 0, -s.bh / 2 + 20 + k * 27));
      else fn(s.text, 0, 1);
    };
    if (bright) {
      g.lineWidth = 3;
      g.strokeStyle = `rgba(${s.color},0.95)`;
      put((t, x, y) => g.strokeText(t, x, y));
      g.fillStyle = 'rgba(255,250,245,0.95)';
      put((t, x, y) => g.fillText(t, x, y));
    } else {
      g.fillStyle = `rgba(${s.color},0.22)`;
      put((t, x, y) => g.fillText(t, x, y));
    }
  };
  draw(ctx, lit);
  ctx.restore();
  if (lit) {
    glow(s.x, s.y, Math.max(s.bw, s.bh) * 0.9, s.color, 0.55);
    bloom((g) => { g.translate(s.x, s.y); draw(g, true); g.fillStyle = `rgba(${s.color},0.5)`; g.fillRect(-s.bw / 2, -s.bh / 2, s.bw, s.bh); }, 1);
  }
}

