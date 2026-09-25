// screen.js — what is on the monitor. The screen is a lightbox: paper laid on
// it shows its fibres and darkens the light; ink prints dark; film tints.
import { R, vlang, pat, setPat, glow } from './render.js';
import { cutShape, smooth, ellipsePts, disc } from './cut.js';
import { hash, hs, clamp, lerp, ease, seg } from './util.js';
import { F } from './fonts.js';
import { SCR } from './room.js';
import { UI, MANUSCRIPT } from './text.js';

const X = (u) => SCR.x + u, Y = (v) => SCR.y + v;
export const SX = X, SY = Y;

function paperOn(ctx, x, y, w, h, color, a = 1, fibres = 0.6, r = 4) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  ctx.fill();
  if (fibres > 0) {
    const p = pat('washi');
    setPat(p, x * 1.3, y * 0.7, 0.7, 0);
    ctx.globalAlpha = a * fibres;
    ctx.fillStyle = p;
    ctx.fill();
  }
  ctx.restore();
}
function inkText(ctx, text, x, y, font, color = 'rgba(26,30,44,0.9)', align = 'left') {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
function filmDot(ctx, x, y, r, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The editor, the readers' requests and the fridge's little panel.
// o: typed (characters of MANUSCRIPT shown), reqs (how many request cards), reqNew (frame a new card arrived),
//    link (0..1 fridge panel active), linkText, f (frame), hidePage (0..1 page lifted away), sidebar (0..1)
export function editor(ctx, o = {}) {
  const f = o.f ?? R.frame;
  const L = UI[vlang()];
  const lift = clamp(o.hidePage || 0);
  // title bar
  paperOn(ctx, X(0), Y(0), SCR.w, 24, '#c7d3e2', 1, 0.3, 0);
  filmDot(ctx, X(14), Y(12), 5, '#ff7d6e');
  filmDot(ctx, X(30), Y(12), 5, '#ffcf5a');
  filmDot(ctx, X(46), Y(12), 5, '#7ad48a');
  inkText(ctx, L.file, X(66), Y(12.5), `400 12px ${F.mono}`, 'rgba(40,50,70,0.8)');
  // the page (it can be lifted off the light, like a sheet of paper)
  if (lift < 1) {
    ctx.save();
    const dy = -ease.in(lift) * 380, rot = -lift * 0.05;
    ctx.translate(X(20) + 210, Y(36) + 150 + dy);
    ctx.rotate(rot);
    ctx.translate(-(X(20) + 210), -(Y(36) + 150));
    paperOn(ctx, X(16), Y(34), 424, 300, '#f3f1ea', 1, 0.8, 2);
    const typed = o.typed ?? 999;
    let budget = typed;
    const lh = 25;
    let cx = 0, cy = 0;
    MANUSCRIPT.forEach((line, i) => {
      const chars = [...line];
      const n = Math.max(0, Math.min(chars.length, budget));
      budget -= chars.length;
      const font = i === 0 ? `700 16px ${F.mincho}` : `400 15px ${F.mincho}`;
      const yy = Y(56 + i * lh);
      if (n > 0) inkText(ctx, chars.slice(0, n).join(''), X(34), yy, font);
      if (budget <= 0 && n >= 0 && !cy) {
        ctx.save();
        ctx.font = font;
        cx = X(34) + ctx.measureText(chars.slice(0, n).join('')).width + 2;
        cy = yy;
        ctx.restore();
      }
    });
    if (!cy) { cx = X(34); cy = Y(56 + MANUSCRIPT.length * lh); }
    // the cursor, blinking on sixes
    if (Math.floor(f / 6) % 2 === 0 || o.typing) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(30,60,140,0.85)';
      ctx.fillRect(cx, cy - 9, 2, 18);
      ctx.restore();
    }
    ctx.restore();
  }
  // sidebar: readers' requests
  const sb = o.sidebar ?? 1;
  if (sb > 0) {
    const sx0 = X(454);
    paperOn(ctx, sx0, Y(30), 150, 308, '#d3deea', sb, 0.4, 3);
    inkText(ctx, L.req, sx0 + 12, Y(46), `600 12px ${F.hand}`, `rgba(30,40,70,${0.85 * sb})`);
    const n = o.reqs ?? 5;
    filmDot(ctx, sx0 + 136, Y(46), 9, '#ff8a7a');
    inkText(ctx, String(n + 7), sx0 + 136, Y(46.5), `700 10px ${F.mono}`, 'rgba(90,20,20,0.9)', 'center');
    const arrive = o.reqNew ?? -99;
    for (let i = 0; i < Math.min(5, n); i++) {
      let yy = Y(62 + i * 34);
      const t = f - arrive;
      if (i === 0 && t >= 0 && t < 4) yy -= [26, 12, 4, 1][t];
      if (i > 0 && t >= 0 && t < 4) yy -= [34, 18, 6, 1][t];
      const k = (n - 1 - i + 70) % L.reqs.length;
      paperOn(ctx, sx0 + 8, yy, 134, 28, i === 0 && t >= 0 && t < 14 ? '#fff1c8' : '#eef2f6', sb, 0.5, 3);
      inkText(ctx, L.reqs[k], sx0 + 16, yy + 10, `400 11px ${F.hand}`, `rgba(30,36,60,${0.9 * sb})`);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(80,90,120,${0.35 * sb})`;
      for (let w = 0; w < 3; w++) ctx.fillRect(sx0 + 16 + w * 22, yy + 20, 18, 2);
      ctx.restore();
    }
    // the fridge's panel
    const link = o.link ?? 0.4;
    const fy = Y(248);
    paperOn(ctx, sx0 + 8, fy, 134, 80, '#e3ece4', sb, 0.5, 4);
    // a tiny fridge
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(150,160,158,${sb})`;
    ctx.fillRect(sx0 + 18, fy + 12, 22, 40);
    ctx.fillStyle = `rgba(90,100,98,${sb})`;
    ctx.fillRect(sx0 + 18, fy + 30, 22, 1.5);
    ctx.fillRect(sx0 + 35, fy + 16, 1.5, 10);
    ctx.restore();
    inkText(ctx, L.fridge, sx0 + 50, fy + 18, `600 12px ${F.hand}`, `rgba(30,50,40,${0.9 * sb})`);
    inkText(ctx, o.linkText || '3.1℃', sx0 + 50, fy + 38, `400 12px ${F.dot}`, `rgba(30,60,40,${0.9 * sb})`);
    const on = link > 0.5 ? (Math.floor(f / 4) % 2 ? 1 : 0.55) : 0.8;
    filmDot(ctx, sx0 + 126, fy + 18, 5, on > 0.7 ? '#58e08a' : '#9ad6ad');
    inkText(ctx, L.link, sx0 + 50, fy + 60, `400 10px ${F.hand}`, `rgba(40,70,50,${0.8 * sb})`);
    if (link > 0.5) {
      // the fridge is talking to the dolphin: little bars
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(40,140,90,${0.8 * sb})`;
      for (let i = 0; i < 6; i++) {
        const h = 3 + Math.abs(hs(i, f, 'lk')) * 12;
        ctx.fillRect(sx0 + 96 + i * 6, fy + 60 - h / 2, 3, h);
      }
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// The shadow play: the man's story, as black paper against the light.
let TH = null;
function buildTheatre() {
  const o = { jag: 0.3, wander: 0.6, step: 10, corner: 0.4 };
  const cat = smooth([
    [-30, 0], [-34, -24], [-28, -40], [-30, -58], [-36, -66], [-30, -86], [-18, -74], [0, -78], [14, -86], [18, -66], [16, -48], [22, -34], [26, -10], [30, 0],
  ], true, 3);
  const tail = [[26, -6], [44, -10], [58, -30], [62, -52], [56, -54], [52, -34], [40, -18], [26, -14]];
  const antenna = [[-2, -78], [0, -78], [4, -100], [1, -100]];
  const knob = ellipsePts(4, 4, 10, 2.5, -103);
  const legs = [
    [[-82, -210], [-50, -210], [-52, -14], [-70, -14], [-76, -120]],
    [[-44, -210], [-10, -210], [-18, -110], [-24, -14], [-42, -14], [-40, -120]],
    smooth([[-74, -16], [-50, -18], [-34, -10], [-30, 0], [-78, 0]], true, 3),
    smooth([[-44, -16], [-20, -18], [-2, -10], [2, 0], [-46, 0]], true, 3),
  ];
  const fridge = [[-40, 0], [-40, -150], [-34, -156], [34, -156], [40, -150], [40, 0]];
  const door = [[0, 0], [0, -150], [38, -150], [38, 0]];
  const sun = disc(26, 5);
  const rays = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    rays.push([[Math.cos(a - 0.1) * 32, Math.sin(a - 0.1) * 32], [Math.cos(a) * 48, Math.sin(a) * 48], [Math.cos(a + 0.1) * 32, Math.sin(a + 0.1) * 32]]);
  }
  const moon = disc(22, 6);
  const fish = smooth([[-18, 0], [-8, -7], [8, -6], [16, 0], [8, 6], [-8, 7]], true, 3);
  const fishTail = [[16, 0], [26, -8], [24, 0], [26, 8]];
  const globe = disc(70, 7);
  const crown = [[-16, 0], [-18, -18], [-9, -9], [0, -22], [9, -9], [18, -18], [16, 0]];
  const bubble = smooth([[-36, -16], [36, -16], [40, 10], [8, 12], [-2, 24], [-6, 12], [-40, 10]], true, 3);
  const pole = [[0, 0], [3, 0], [3, -60], [0, -60]];
  const flag = [[3, -60], [46, -52], [3, -40]];
  TH = {
    cat: cutShape([cat, tail, antenna, knob], 1, o), legs: cutShape(legs, 2, o), fridge: cutShape(fridge, 3, o), door: cutShape(door, 4, o),
    sun: cutShape([...[sun.pts], ...rays], 5, { ...o, jag: 0.2 }), moon, fish: cutShape([fish, fishTail], 8, o), globe,
    crown: cutShape(crown, 9, o), bubble: cutShape(bubble, 10, { ...o, jag: 0.2 }), pole: cutShape(pole, 11, o), flag: cutShape(flag, 12, o),
  };
}

function black(ctx, sh, x, y, o = {}) {
  const { r = 0, s = 1, sx = 1, a = 0.94 } = o;
  ctx.save();
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  ctx.scale(s * sx, s);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(14,12,18,${a})`;
  ctx.fill(sh.path);
  // a little light creeps round the edge of black paper
  ctx.strokeStyle = 'rgba(255,240,220,0.18)';
  ctx.lineWidth = 1 / s;
  ctx.stroke(sh.path);
  ctx.restore();
}

// t: frames since the play began. Returns the globe's position (the dolphin needs it).
export function theatre(ctx, t, o = {}) {
  if (!TH) buildTheatre();
  const L = UI[vlang()];
  const ground = Y(SCR.h - 34);
  const XS = (u) => SCR.x + u; // backdrop (sun, moon, ground)
  const X = (u) => SCR.x + u + 70; // actors: the stage sits right of his head
  const nightK = ease.inOut(seg(t, 64, 76));
  // the light itself: warm lamp paper by day; blue film slides over for night
  paperOn(ctx, XS(0), Y(0), SCR.w, SCR.h, '#f6dcae', 1, 0.9, 0);
  if (nightK > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#3d4fa8';
    const w = SCR.w * nightK;
    ctx.fillRect(XS(SCR.w - w), Y(0), w, SCR.h);
    ctx.restore();
  }
  // ground
  ctx.save();
  ctx.fillStyle = 'rgba(14,12,18,0.95)';
  ctx.beginPath();
  ctx.moveTo(XS(0), ground);
  for (let u = 0; u <= SCR.w; u += 24) ctx.lineTo(XS(u), ground + hs('gr', u) * 2);
  ctx.lineTo(XS(SCR.w), Y(SCR.h));
  ctx.lineTo(XS(0), Y(SCR.h));
  ctx.fill();
  ctx.restore();
  const f = R.frame;
  const bob = (k) => (Math.floor(f / 2) % 2 ? k : 0);
  let globe = null;
  if (t < 72) {
    // DAY. a sun; a person's legs; the cat, who only says "meow"
    black(ctx, TH.sun, XS(90), Y(70), { r: t * 0.02 });
    const lx = lerp(250, -120, ease.in(seg(t, 44, 70)));
    black(ctx, TH.legs, X(lx), ground + 1, { sx: 1 });
    black(ctx, TH.cat, X(300), ground + 1, { sx: -1, r: bob(0.02) });
    if (t > 18 && t < 60) {
      // a paper speech bubble: lighter paper, so the light shows through it
      const p = Math.min(1, (t - 18) / 3);
      ctx.save();
      ctx.translate(X(262), ground - 118);
      ctx.scale(p, p);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#e9e1d2';
      ctx.fill(TH.bubble.path);
      ctx.restore();
      if (p >= 1) inkText(ctx, L.nyaa, X(262), ground - 120, `600 17px ${F.hand}`, 'rgba(20,16,20,0.95)', 'center');
    }
    black(ctx, TH.fridge, X(500), ground + 1);
  } else if (t < 150) {
    // NIGHT. the moon is a hole cut in the blue; the cat's eyes are green film
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,250,225,0.95)';
    ctx.translate(XS(96), Y(64));
    ctx.fill(TH.moon.path);
    ctx.restore();
    const walk = ease.inOut(seg(t, 78, 104));
    const cx = lerp(300, 438, walk);
    const step = walk > 0 && walk < 1 ? bob(3) : 0;
    const open = ease.out(seg(t, 110, 118));
    // fridge (its door swings open towards the cat: light pours out of it)
    black(ctx, TH.fridge, X(500), ground + 1);
    if (open > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,236,190,${0.95 * open})`;
      ctx.fillRect(X(462), ground - 146, 76, 144);
      const g = ctx.createLinearGradient(X(462), 0, X(380), 0);
      g.addColorStop(0, `rgba(255,236,190,${0.5 * open})`);
      g.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(X(462), ground - 146); ctx.lineTo(X(360), ground); ctx.lineTo(X(462), ground);
      ctx.fill();
      ctx.restore();
      black(ctx, TH.door, X(462), ground + 1, { sx: -Math.cos(open * 1.3) });
    }
    // the tail goes into the fridge like a cable
    if (t > 104) {
      const k = ease.out(seg(t, 104, 110));
      ctx.save();
      ctx.strokeStyle = 'rgba(14,12,18,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X(cx + 26), ground - 10);
      ctx.quadraticCurveTo(X(cx + 40), ground - 60, X(lerp(cx + 30, 470, k)), ground - lerp(40, 70, k));
      ctx.stroke();
      ctx.restore();
    }
    black(ctx, TH.cat, X(cx), ground + 1 - step, { sx: 1 });
    for (const ex of [-12, 6]) {
      filmDot(ctx, X(cx + ex), ground - 60, 3.4, '#46e07a');
      glow(X(cx + ex), ground - 60, 10, '90,255,140', 0.6);
    }
    if (t > 122) {
      const fp = ease.out(seg(t, 122, 132));
      black(ctx, TH.fish, X(lerp(500, cx + 10, fp)), ground - lerp(80, 96, fp), { r: -0.3 });
    }
  } else {
    // WORLD DOMINATION. a globe rises; the cat climbs it and puts on a crown
    const rise = ease.outBack(seg(t, 150, 164));
    const wob = o.bump ? Math.sin((t - o.bump) * 0.9) * Math.exp(-(t - o.bump) * 0.12) * 0.25 : 0;
    const roll = o.rollAway ? ease.in(seg(t, o.rollAway, o.rollAway + 18)) : 0;
    const gx = X(300 + roll * 420), gy = ground + 20 - rise * 92;
    globe = { x: gx, y: gy - 20, r: 70 };
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(wob + roll * 3);
    ctx.fillStyle = 'rgba(14,12,18,0.95)';
    ctx.fill(TH.globe.path);
    // continents cut out of the black (light shows through)
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,236,200,0.55)';
    ctx.beginPath();
    ctx.ellipse(-22, -18, 22, 14, 0.4, 0, Math.PI * 2);
    ctx.ellipse(24, 10, 16, 24, -0.3, 0, Math.PI * 2);
    ctx.ellipse(-10, 34, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255,236,200,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 70, 22, 0, 0, Math.PI * 2);
    ctx.moveTo(0, -70); ctx.lineTo(0, 70);
    ctx.stroke();
    ctx.restore();
    if (roll < 0.35) {
      const on = ease.out(seg(t, 162, 170));
      const catY = gy - 68 * on;
      black(ctx, TH.cat, X(300 + roll * 420) + wob * 60, catY, { r: wob * 0.8 });
      if (t > 172) black(ctx, TH.crown, X(300 + roll * 420) + wob * 60 - 6, catY - 84, { r: wob * 0.8 - 0.1 });
      for (const ex of [-12, 6]) filmDot(ctx, X(300 + roll * 420 + ex) + wob * 60, catY - 60, 3.4, '#46e07a');
    }
    // the fridge at its side, with a little flag
    black(ctx, TH.fridge, X(500), ground + 1);
    if (t > 176) {
      black(ctx, TH.pole, X(470), ground - 150);
      black(ctx, TH.flag, X(470), ground - 150);
      inkText(ctx, L.conquer, X(488), ground - 204, `700 10px ${F.mincho}`, 'rgba(255,240,210,0.95)', 'center');
    }
  }
  return globe;
}

// ---------------------------------------------------------------------------
// The scratchpad: a sheet of notes about the AIs' own thinking, "for audit".
// t: frames since it arrived. o.hidden: the one frame that shows what was really written.
const PAD = { u: 70, v: 26, w: 360, h: 300 };
export const PAD_RECT = PAD;
export function scratchpad(ctx, t, o = {}) {
  const L = UI[vlang()];
  const f = R.frame;
  const inK = ease.out(seg(t, 0, 8));
  const dy = (1 - inK) * 360;
  const x0 = X(PAD.u), y0 = Y(PAD.v) + dy;
  ctx.save();
  ctx.translate(x0 + PAD.w / 2, y0 + PAD.h / 2);
  ctx.rotate(-0.025 + (1 - inK) * 0.08);
  ctx.translate(-(x0 + PAD.w / 2), -(y0 + PAD.h / 2));
  // backlit notepaper: warmer, and the fibres show. It is thick enough to hide
  // most of what is underneath (a ghost of the manuscript still shows).
  ctx.save();
  ctx.fillStyle = 'rgba(236,243,250,0.9)';
  ctx.fillRect(x0, y0, PAD.w, PAD.h);
  ctx.restore();
  paperOn(ctx, x0, y0, PAD.w, PAD.h, '#f1e3c4', 1, 1.1, 2);
  // binding at the top
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(120,70,60,0.85)';
  ctx.fillRect(x0, y0, PAD.w, 16);
  ctx.fillStyle = 'rgba(80,110,160,0.35)';
  for (let yy = y0 + 64; yy < y0 + PAD.h; yy += 28) ctx.fillRect(x0 + 10, yy, PAD.w - 20, 1.2);
  ctx.fillStyle = 'rgba(200,80,70,0.45)';
  ctx.fillRect(x0 + 36, y0 + 16, 1.4, PAD.h - 16);
  ctx.restore();
  inkText(ctx, L.pad, x0 + 46, y0 + 34, `700 17px ${F.hand}`, 'rgba(30,30,50,0.92)');
  inkText(ctx, `— ${L.padSub} —`, x0 + 46, y0 + 54, `400 12px ${F.hand}`, 'rgba(60,60,80,0.8)');
  const erase = o.erase ?? 0; // 0..1 how far the eraser has gone
  const tidy = o.tidy ?? 0; // how many tidy lines are written
  const lineY = (i) => y0 + 78 + i * 28;
  if (o.hidden) {
    // what was really written (one frame only)
    L.secret.forEach((s, i) => inkText(ctx, s, x0 + 46, lineY(i), `600 13px ${F.hand}`, 'rgba(24,40,110,0.95)'));
    doodle(ctx, x0 + 250, lineY(3) + 20, 1);
  } else {
    // quick scribbles in blue — too small and fast to read
    for (let i = 0; i < 4; i++) {
      const x1 = x0 + 46 + (PAD.w - 80) * (i === 3 ? 0.55 : 0.92);
      const cut = x0 + 46 + (PAD.w - 60) * erase * 1.15 - i * 30;
      if (cut > x1) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(Math.max(x0 + 40, cut), lineY(i) - 14, PAD.w, 28);
      ctx.clip();
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = 'rgba(30,50,130,0.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let xx = x0 + 46; xx < x1; xx += 3) {
        const yy = lineY(i) + Math.sin(xx * 0.55 + i) * 4 + hs('scr', i, Math.floor(xx / 9)) * 3;
        if (xx === x0 + 46) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (erase < 0.8) doodle(ctx, x0 + 250, lineY(3) + 20, 1 - erase / 0.8);
  }
  // crumbs from the eraser
  if (erase > 0 && erase < 1.2) {
    for (let i = 0; i < 26; i++) {
      const born = hash('cb', i) * 0.9;
      if (erase < born) continue;
      const cx = x0 + 46 + (PAD.w - 60) * born * 1.1 + hs('cbx', i) * 10;
      const cy = lineY(Math.floor(hash('cbl', i) * 4)) + 8 + (erase - born) * 60;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(200,140,150,0.8)';
      ctx.fillRect(cx, cy, 3 + hash('cbs', i) * 3, 2 + hash('cbt', i) * 2);
      ctx.restore();
    }
  }
  // the tidy version, typed in afterwards
  for (let i = 0; i < Math.min(tidy, L.padLines.length); i++) {
    inkText(ctx, L.padLines[i], x0 + 46, lineY(i), `400 13px ${F.mono}`, 'rgba(30,30,40,0.9)');
  }
  // the stamp
  if (o.stamp != null && t >= o.stamp) {
    const k = t - o.stamp;
    const sc = [1.5, 1.15, 1][k] || 1;
    ctx.save();
    ctx.translate(x0 + PAD.w - 78, y0 + PAD.h - 64);
    ctx.rotate(-0.18);
    ctx.scale(sc, sc);
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = 'rgba(210,40,40,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(210,40,40,0.9)';
    ctx.font = vlang() === 'ja' ? `700 17px ${F.mincho}` : `700 12px ${F.garamond}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(L.stamp, 0, 1);
    ctx.restore();
  }
  ctx.restore();
}

// A little drawing: a dolphin and a fridge, laughing.
function doodle(ctx, x, y, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = a;
  ctx.strokeStyle = 'rgba(30,50,130,0.85)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // fridge
  ctx.rect(x + 34, y - 30, 22, 40);
  ctx.moveTo(x + 34, y - 12); ctx.lineTo(x + 56, y - 12);
  ctx.moveTo(x + 40, y - 22); ctx.arc(x + 42, y - 22, 1, 0, Math.PI * 2);
  ctx.moveTo(x + 50, y - 22); ctx.arc(x + 48, y - 22, 1, 0, Math.PI * 2);
  ctx.moveTo(x + 40, y - 17); ctx.quadraticCurveTo(x + 45, y - 13, x + 50, y - 17);
  // dolphin
  ctx.moveTo(x - 30, y);
  ctx.quadraticCurveTo(x - 10, y - 22, x + 16, y - 8);
  ctx.quadraticCurveTo(x + 24, y - 6, x + 26, y - 2);
  ctx.quadraticCurveTo(x + 6, y + 6, x - 22, y + 4);
  ctx.lineTo(x - 34, y + 12); ctx.lineTo(x - 30, y); ctx.lineTo(x - 40, y - 8);
  ctx.moveTo(x - 4, y - 14); ctx.lineTo(x - 10, y - 24); ctx.lineTo(x - 14, y - 12);
  // laughing marks
  ctx.moveTo(x + 8, y - 26); ctx.lineTo(x + 12, y - 32);
  ctx.moveTo(x + 16, y - 24); ctx.lineTo(x + 22, y - 28);
  ctx.moveTo(x + 60, y - 38); ctx.lineTo(x + 64, y - 44);
  ctx.stroke();
  ctx.restore();
}

// The eraser (pink paper) and a folded note, for the dolphin to push around.
export function eraser(ctx, x, y, r = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#f2a9b4';
  ctx.fillRect(-20, -10, 40, 20);
  ctx.fillStyle = 'rgba(80,120,190,0.7)';
  ctx.fillRect(-4, -10, 24, 20);
  ctx.restore();
}
export function foldedNote(ctx, x, y, r = 0, open = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  paperOn(ctx, -14, -10, 28 + open * 20, 20, '#f6f0dd', 1, 0.6, 1);
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = 'rgba(120,110,90,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-14, -10); ctx.lineTo(0, 0); ctx.lineTo(14, -10);
  ctx.stroke();
  ctx.restore();
}
