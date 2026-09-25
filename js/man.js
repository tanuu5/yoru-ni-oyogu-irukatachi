// man.js — the writer. Thirty-eight, a former editor, up past two again.
// Three puppets: his back (over-the-shoulder shots), his face (seen from the
// monitor), and his arm (reaching into the kitchen).
import { R, piece } from './render.js';
import { cutShape, smooth, ellipsePts, rectPts } from './cut.js';
import { hash, hs, mix, clamp, rng, boil } from './util.js';
import { dolphinShape } from './dolphin.js';

const cs = (pts, seed, o) => cutShape(pts, seed, { jag: 0.3, wander: 0.6, step: 12, corner: 0.4, ...o });

// ===========================================================================
// 1. His back. Origin: the base of his neck. y grows downward.

let B = null;
function buildBack() {
  const hair = smooth([
    [-58, -28], [-78, -60], [-86, -100], [-88, -144], [-74, -172], [-62, -188], [-50, -192], [-28, -204], [-12, -214], [4, -206],
    [28, -208], [50, -198], [56, -204], [70, -182], [86, -156], [92, -122], [87, -94], [78, -58], [58, -28], [40, -20], [20, -27],
    [0, -19], [-20, -27], [-40, -20],
  ], true, 4);
  const earL = ellipsePts(12, 23, 20, -95, -90);
  const earR = ellipsePts(12, 23, 20, 95, -90);
  const cheekR = smooth([[76, -118], [90, -104], [101, -88], [94, -76], [89, -54], [76, -32], [64, -28], [72, -72]], true, 4);
  const cheekL = cheekR.map(([x, y]) => [-x, y]);
  const neck = rectPts(66, 64, 0, -6);
  const collar = smooth([[-50, 8], [-28, -2], [0, -5], [28, -2], [50, 8], [38, 13], [0, 7], [-38, 13]], true, 4);
  const T = 0.86;
  const torso = smooth([
    [-56, 0], [-120, 18], [-178, 52], [-206, 110], [-214, 200], [-222, 262], [-212, 330], [-206, 470],
    [206, 470], [212, 330], [222, 262], [214, 200], [206, 110], [178, 52], [120, 18], [56, 0], [0, 8],
  ].map(([x, y]) => [x * T, y]), true, 4);
  // right arm, forearm reaching forward to the mouse on the desk
  const armR = [[140, 56], [196, 76], [222, 150], [236, 196], [338, -32], [302, -50], [192, 176], [150, 150]];
  const handR = smooth([[300, -46], [312, -70], [338, -80], [364, -72], [372, -52], [360, -36], [330, -30]], true, 4);
  const mouse = smooth([[318, -44], [326, -62], [352, -66], [370, -56], [366, -40], [340, -34]], true, 4);
  const chair = smooth([
    [-150, 176], [-120, 160], [0, 152], [120, 160], [150, 176], [168, 260], [170, 420], [150, 520], [-150, 520], [-170, 420], [-168, 260],
  ], true, 4);
  const chairRim = smooth([
    [-158, 170], [-124, 150], [0, 142], [124, 150], [158, 170], [178, 260], [180, 420], [160, 530], [-160, 530], [-180, 420], [-178, 260],
  ], true, 4);
  const arm = { jag: 0.2, wander: 0.4, step: 14, corner: 0.3 };
  B = {
    hair: cs(hair, 1, { jag: 0.5, wander: 1 }), earL: cs(earL, 2, arm), earR: cs(earR, 3, arm), cheekR: cs(cheekR, 4, arm), cheekL: cs(cheekL, 5, arm),
    neck: cs(neck, 6, arm), collar: cs(collar, 7, arm), torso: cs(torso, 8), armR: cs(smooth(armR, true, 3), 9), handR: cs(handR, 10, arm),
    mouse: cs(mouse, 11, arm), chair: cs(chair, 12), chairRim: cs(chairRim, 13),
  };
}

const NIGHT = { hair: '#1b161b', skin: '#5a4442', wool: '#2c2b22', collar: '#2a2b31', chair: '#141318', rim: '#1f1e27' };
const DAY = { hair: '#3b2e2c', skin: '#b58b74', wool: '#6a6348', collar: '#8a8a92', chair: '#3b3842', rim: '#4a4652' };
const tint = (k, day) => mix(NIGHT[k], DAY[k], day);

// o: x, y, day (0 night .. 1 morning), head { turn: -1..1, tilt, nod }, type (bool), arm ('keys'|'mouse'),
//    lift (standing up, world units upward), sway, monitor (0..1 rim from the screen), neon (0..1)
export function manBack(o = {}) {
  if (!B) buildBack();
  const { x = 1335, y = 690, day = 0, head = {}, type = false, arm = 'keys', lift = 0, monitor = 1, neon = 1, f = R.frame } = o;
  const ctx = R.ctx;
  const turn = clamp(head.turn || 0, -1, 1);
  const tilt = (head.tilt || 0) + turn * 0.03;
  const nod = head.nod || 0;
  // typing: shoulders and elbows jiggle a little, on twos
  const tk = type ? Math.floor(f / 2) : 0;
  const sh = type ? hs('sh', tk) * 1.8 : 0;
  const b = boil('man', Math.floor(f / 2), 0.5);
  const rimMon = { color: '160,205,255', a: 0.75 * monitor * (1 - day * 0.5), w: 5, ang: -0.9, spread: 0.62 };
  const rimBody = { ...rimMon, a: rimMon.a * 0.6, spread: 0.45 };
  const rimNeon = { color: day > 0.5 ? '255,205,160' : '255,110,190', a: (0.3 * neon + day * 0.4), w: 4, ang: Math.PI * 0.95, spread: 0.45 };
  const base = { tex: 'plain', lift: 0, edge: 0, shadowK: 0 };
  ctx.save();
  ctx.translate(x + b[0], y - lift + b[1]);
  // right arm first (behind the torso's shoulder)
  if (arm === 'mouse') {
    const ay = type ? 0 : sh;
    piece(B.armR, { ...base, y: ay, color: tint('wool', day), tex: 'washi', rim: rimBody });
    piece(B.mouse, { ...base, y: ay, color: '#26252c', rim: rimBody });
    piece(B.handR, { ...base, y: ay + hs('hand', Math.floor(f / 3)) * 1.2, color: tint('skin', day), rim: rimMon });
  }
  // torso (cardigan)
  piece(B.torso, { ...base, y: sh * 0.6, color: tint('wool', day), tex: 'washi', ts: 0.7, rim: [rimBody, rimNeon], print: (c) => {
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, 20); c.lineTo(0, 470); // centre seam
    c.moveTo(-180, 60); c.quadraticCurveTo(-150, 120, -170, 260); // shoulder seams
    c.moveTo(180, 60); c.quadraticCurveTo(150, 120, 170, 260);
    c.stroke();
    c.restore();
  } });
  // neck, collar, head
  ctx.save();
  ctx.translate(0, nod * 6);
  piece(B.neck, { ...base, color: tint('skin', day), rim: rimBody });
  piece(B.collar, { ...base, color: tint('collar', day) });
  ctx.translate(0, -30);
  ctx.scale(1.12, 1.12);
  ctx.rotate(tilt);
  ctx.translate(-turn * 5, 30 + nod * 4);
  const earShift = turn * 10;
  piece(B.earL, { ...base, x: earShift * (turn > 0 ? 1.4 : 0.6), sx: 1 - Math.max(0, -turn) * 0.4, color: tint('skin', day), rim: rimNeon });
  piece(B.earR, { ...base, x: earShift * (turn < 0 ? 1.4 : 0.6), sx: 1 - Math.max(0, turn) * 0.4, color: tint('skin', day), rim: rimMon });
  if (turn > 0.3) piece(B.cheekR, { ...base, x: (1 - turn) * -14, color: tint('skin', day), rim: { ...rimMon, a: rimMon.a * 1.4, w: 8 } });
  if (turn < -0.3) piece(B.cheekL, { ...base, x: (1 + turn) * 14, color: tint('skin', day), rim: rimNeon });
  piece(B.hair, { ...base, color: tint('hair', day), tex: 'washi', ts: 0.6, rim: [{ ...rimMon, a: rimMon.a * 1.2, w: 7 }, rimNeon], print: (c) => {
    c.save();
    c.globalCompositeOperation = 'screen';
    c.strokeStyle = `rgba(120,140,190,${0.07 * monitor})`;
    c.lineWidth = 1.6;
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i < 7; i++) {
      const x0 = -56 + i * 19 + hs('hs', i) * 6;
      c.moveTo(x0, -196 + Math.abs(i - 3) * 7 + hs('hs2', i) * 8);
      c.quadraticCurveTo(x0 + 8 - i * 2.5 + hs('hs3', i) * 5, -130, x0 * 0.8, -58 - hash('hs4', i) * 30);
    }
    c.stroke();
    c.restore();
  } });
  ctx.restore();
  ctx.restore();
}

// The chair back, in front of him. spin: 0 facing the desk .. 1 turned right round.
export function chairBack(o = {}) {
  if (!B) buildBack();
  const { x = 1335, y = 690, day = 0, spin = 0, monitor = 1 } = o;
  const s = Math.cos(spin * Math.PI);
  const sx = Math.max(0.16, Math.abs(s));
  const rim = { color: '160,205,255', a: 0.55 * monitor * (1 - day * 0.5), w: 5, ang: -1.2, spread: 0.7 };
  piece(B.chairRim, { x, y, sx, color: tint('rim', day), tex: 'plain', lift: 0, edge: 0, shadowK: 0, rim });
  piece(B.chair, { x, y, sx, color: s < 0 ? mix(tint('chair', day), '#3a3445', 0.4) : tint('chair', day), tex: 'mesh', ts: 0.6, lift: 0, edge: 0, shadowK: 0 });
}

// ===========================================================================
// 2. His face, seen from the monitor. Origin: between the eyes.

let FC = null;
function buildFace() {
  const r = rng(38);
  const face = smooth([[0, -176], [74, -164], [116, -124], [130, -56], [130, 6], [122, 60], [102, 110], [64, 148], [0, 164], [-64, 148], [-102, 110], [-122, 60], [-130, 6], [-130, -56], [-116, -124], [-74, -164]], true, 5);
  const hairBack = smooth([[-150, 40], [-162, -60], [-152, -150], [-108, -208], [-30, -236], [52, -230], [122, -198], [160, -130], [164, -40], [152, 40], [136, 34], [128, -40], [-128, -40], [-136, 34]], true, 4);
  const fringe = [
    [-156, -40], [-160, -110], [-140, -176], [-90, -216], [-40, -234], [40, -238], [110, -212], [150, -162], [164, -100], [160, -40],
    [146, -58], [134, -86], [118, -62], [100, -98], [82, -76], [62, -106], [42, -90], [22, -120], [2, -110], [-18, -138], [-36, -154],
    [-52, -164], [-76, -152], [-100, -142], [-120, -114], [-136, -86], [-144, -60],
  ];
  const ear = (sgn) => ellipsePts(20, 36, 20, sgn * 132, -8);
  const neck = [[-58, 110], [58, 110], [64, 250], [-64, 250]];
  const body = smooth([[-470, 720], [-410, 390], [-290, 262], [-136, 222], [0, 240], [136, 222], [290, 262], [410, 390], [470, 720]], true, 4);
  const tee = smooth([[-98, 226], [-52, 212], [0, 236], [52, 212], [98, 226], [72, 282], [0, 298], [-72, 282]], true, 4);
  const lapelL = [[-136, 222], [-44, 246], [-12, 720], [-240, 720]];
  const lapelR = lapelL.map(([x, y]) => [-x, y]);
  const nose = smooth([[-6, -40], [6, -40], [12, 16], [26, 42], [14, 54], [0, 57], [-14, 54], [-26, 42], [-12, 16]], true, 4);
  const brow = smooth([[-36, 4], [-30, -5], [0, -8], [34, -3], [36, 5], [0, 3]], true, 3);
  const eyeW = smooth([[-21, 0], [-9, -10], [9, -10], [21, 0], [9, 8], [-9, 8]], true, 4);
  const stubble = [];
  for (let i = 0; i < 520; i++) {
    const x = (r() - 0.5) * 240, y = 40 + r() * 122;
    const jaw = 124 - Math.max(0, y - 60) * 0.6;
    if (Math.abs(x) > jaw) continue;
    if (Math.abs(x) < 40 && y > 80 && y < 112) continue; // the mouth
    if (Math.abs(x) < 26 && y < 60) continue; // under the nose
    stubble.push([x, y, 0.8 + r() * 1.1]);
  }
  const a = { jag: 0.15, wander: 0.3, step: 12, corner: 0.3 };
  FC = {
    face: cs(face, 20, a), hairBack: cs(hairBack, 21), fringe: cs(fringe, 22, { jag: 0.4, wander: 0.8 }), earL: cs(ear(-1), 23, a), earR: cs(ear(1), 24, a),
    neck: cs(neck, 25, a), body: cs(body, 26), tee: cs(tee, 27, a), lapelL: cs(lapelL, 28), lapelR: cs(lapelR, 29), nose: cs(nose, 30, a),
    brow: cs(brow, 31, { jag: 0.3, wander: 0.5, step: 10 }), eyeW: cs(eyeW, 32, a), stubble,
  };
}

// Expressions: brows [dy, angle] per side (left = his right, screen left), eyes, gaze, mouth
export const FACES = {
  neutral: { bl: [0, 0], br: [0, 0], eyes: 'open', gaze: [0, 0], mouth: 'closed' },
  wry: { bl: [-3, -0.06], br: [2, 0.1], eyes: 'half', gaze: [3, 1], mouth: 'smirk' },
  skeptic: { bl: [-9, -0.1], br: [3, 0.14], eyes: 'open', gaze: [4, 0], mouth: 'closed' },
  surprised: { bl: [-12, -0.05], br: [-12, 0.05], eyes: 'wide', gaze: [0, -1], mouth: 'o' },
  annoyed: { bl: [4, 0.18], br: [4, -0.18], eyes: 'half', gaze: [-7, 2], mouth: 'flat' },
  grin: { bl: [-8, -0.04], br: [-8, 0.04], eyes: 'happy', gaze: [3, 0], mouth: 'grin' },
  sheepish: { bl: [-6, 0.16], br: [-6, -0.16], eyes: 'half', gaze: [-5, 4], mouth: 'smile' },
  deadpan: { bl: [2, 0], br: [2, 0], eyes: 'half', gaze: [0, 1], mouth: 'flat' },
  confused: { bl: [-12, -0.08], br: [4, 0.16], eyes: 'open', gaze: [2, 0], mouth: 'o' },
  suspicious: { bl: [5, 0.16], br: [5, -0.16], eyes: 'narrow', gaze: [5, 0], mouth: 'flat' },
  grimace: { bl: [4, 0.2], br: [4, -0.2], eyes: 'narrow', gaze: [0, 0], mouth: 'grimace' },
  soft: { bl: [-3, 0.04], br: [-3, -0.04], eyes: 'soft', gaze: [2, 2], mouth: 'smile' },
  tired: { bl: [1, 0.06], br: [1, -0.06], eyes: 'half', gaze: [0, 2], mouth: 'closed' },
};

const SKIN = '#dcb08e';
// o: x, y, s, face (preset name or object), talk (bool), blink (bool), turn (-1..1), tilt, f,
//    reflect (dolphin in his glasses: {x,y} 0..1 across the screen, or null)
export function manFace(o = {}) {
  if (!FC) buildFace();
  const { x = 800, y = 380, s = 1, talk = false, blink = false, turn = 0, tilt = 0, f = R.frame } = o;
  const E = typeof o.face === 'string' ? FACES[o.face] || FACES.neutral : o.face || FACES.neutral;
  const ctx = R.ctx;
  const b = boil('face', Math.floor(f / 2), 0.4);
  const P = { tex: 'plain', lift: 3, edge: 0.18 };
  ctx.save();
  ctx.translate(x + b[0], y + b[1]);
  ctx.scale(s, s);
  // body stays put; the head turns a little
  piece(FC.body, { ...P, color: '#4b4936', tex: 'washi', ts: 0.7, lift: 4, print: (c) => {
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 6; i++) c.fillRect(-18, 360 + i * 44, 6, 6); // buttons... of a sort
    c.restore();
  } });
  piece(FC.tee, { ...P, color: '#7d7f88', lift: 3 });
  piece(FC.lapelL, { ...P, color: '#43412f', tex: 'washi', lift: 6 });
  piece(FC.lapelR, { ...P, color: '#43412f', tex: 'washi', lift: 6 });
  piece(FC.neck, { ...P, color: '#b88a6c', lift: 2, print: (c) => {
    const g = c.createLinearGradient(0, 120, 0, 190);
    g.addColorStop(0, 'rgba(60,30,30,0.45)');
    g.addColorStop(1, 'rgba(60,30,30,0)');
    c.fillStyle = g;
    c.globalCompositeOperation = 'multiply';
    c.fillRect(-80, 120, 160, 80);
  } });
  ctx.rotate(tilt + b[2]);
  const tx = turn * 12;
  piece(FC.hairBack, { ...P, color: '#221b1e', tex: 'washi', lift: 2 });
  piece(FC.earL, { ...P, x: tx * 0.6, color: '#cc9a7a', lift: 4 });
  piece(FC.earR, { ...P, x: tx * 0.6, color: '#cc9a7a', lift: 4 });
  piece(FC.face, { ...P, x: tx * 0.3, color: SKIN, lift: 5, edge: 0.22, print: (c) => {
    c.save();
    c.globalCompositeOperation = 'multiply';
    for (const [sx, sy, sz] of FC.stubble) {
      c.fillStyle = 'rgba(70,70,95,0.25)';
      c.fillRect(sx, sy, sz, sz);
    }
    // under-eye bags and the lines of a long night
    c.strokeStyle = 'rgba(140,90,90,0.28)';
    c.lineWidth = 2.2;
    c.beginPath();
    c.arc(-54 + tx, 2, 18, 0.25 * Math.PI, 0.75 * Math.PI);
    c.moveTo(54 + 18 * Math.cos(0.25 * Math.PI) + tx, 2 + 18 * Math.sin(0.25 * Math.PI));
    c.arc(54 + tx, 2, 18, 0.25 * Math.PI, 0.75 * Math.PI);
    c.moveTo(-26 + tx, 50); c.quadraticCurveTo(-44 + tx, 76, -40 + tx, 104);
    c.moveTo(26 + tx, 50); c.quadraticCurveTo(44 + tx, 76, 40 + tx, 104);
    c.stroke();
    c.restore();
  } });
  // eyes
  for (const side of [-1, 1]) {
    const ex = side * 54 + tx, ey = -24;
    eye(ctx, ex, ey, side, E, blink, f);
  }
  // brows
  for (const [side, [dy, ang]] of [[-1, E.bl], [1, E.br]]) {
    piece(FC.brow, { ...P, x: side * 56 + tx, y: -60 + dy, r: ang * side * -1, sx: side, color: '#261f22', tex: 'washi', lift: 4 });
  }
  piece(FC.nose, { ...P, x: tx * 1.3, color: '#d3a283', lift: 7, print: (c) => {
    c.save();
    c.globalCompositeOperation = 'multiply';
    const g = c.createLinearGradient(-26, 0, 26, 0);
    g.addColorStop(0, 'rgba(150,100,100,0.05)');
    g.addColorStop(1, 'rgba(120,70,80,0.4)');
    c.fillStyle = g;
    c.fillRect(-30, -40, 60, 100);
    c.fillStyle = 'rgba(90,50,50,0.5)';
    c.beginPath(); c.ellipse(-10, 50, 5, 3, 0.3, 0, Math.PI * 2); c.ellipse(10, 50, 5, 3, -0.3, 0, Math.PI * 2); c.fill();
    c.restore();
  } });
  mouth(ctx, tx, talk ? talkShape(f) : E.mouth);
  // fringe over the forehead (in front of the brows when they rise)
  piece(FC.fringe, { ...P, color: '#241c20', tex: 'washi', ts: 0.6, lift: 6, edge: 0.15 });
  glasses(ctx, tx, o);
  ctx.restore();
}

function talkShape(f) {
  const k = Math.floor(f / 2);
  const v = hash('talk', k);
  return v < 0.4 ? 'talk' : v < 0.7 ? 'o' : v < 0.85 ? 'flat' : 'talkWide';
}

function eye(ctx, ex, ey, side, E, blink, f) {
  const shut = blink || E.eyes === 'closed';
  if (shut) {
    ctx.strokeStyle = '#2a2020';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - 19, ey + 1);
    ctx.quadraticCurveTo(ex, ey + 7, ex + 19, ey + 1);
    ctx.stroke();
    return;
  }
  const wide = E.eyes === 'wide';
  const sy = wide ? 1.25 : 1;
  piece(FC.eyeW, { x: ex, y: ey, sy, color: '#f0ebe1', tex: 'plain', lift: 1, edge: 0, shadowK: 0.4 });
  const [gx, gy] = E.gaze || [0, 0];
  ctx.fillStyle = '#211b1b';
  ctx.beginPath();
  ctx.arc(ex + gx, ey - 1 + gy, wide ? 6.5 : 7.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(ex + gx - 2.5, ey - 3.5 + gy, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // lids
  const lid = E.eyes === 'half' ? 0.45 : E.eyes === 'narrow' ? 0.6 : E.eyes === 'soft' ? 0.35 : E.eyes === 'happy' ? 0.3 : 0;
  if (lid > 0) {
    ctx.fillStyle = '#d2a384';
    ctx.beginPath();
    ctx.moveTo(ex - 22, ey - 12);
    ctx.lineTo(ex + 22, ey - 12);
    ctx.lineTo(ex + 22, ey - 9 + lid * 16);
    ctx.quadraticCurveTo(ex, ey - 12 + lid * 20, ex - 22, ey - 9 + lid * 16);
    ctx.closePath();
    ctx.fill();
  }
  if (E.eyes === 'happy' || E.eyes === 'narrow') {
    // lower lid pushed up
    ctx.fillStyle = '#d2a384';
    ctx.beginPath();
    ctx.moveTo(ex - 22, ey + 10);
    ctx.quadraticCurveTo(ex, ey + (E.eyes === 'happy' ? -1 : 2), ex + 22, ey + 10);
    ctx.lineTo(ex + 22, ey + 14);
    ctx.lineTo(ex - 22, ey + 14);
    ctx.closePath();
    ctx.fill();
  }
  // lash line
  ctx.strokeStyle = '#231a1c';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const top = ey - 9 * sy + lid * 12;
  ctx.moveTo(ex - 20, ey - 1 + lid * 6);
  ctx.quadraticCurveTo(ex, top - 3, ex + 20, ey - 1 + lid * 6);
  ctx.stroke();
}

function mouth(ctx, tx, kind) {
  const mx = tx * 1.1, my = 98;
  ctx.save();
  ctx.translate(mx, my);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5a2e2e';
  ctx.fillStyle = '#3a1a1c';
  ctx.lineWidth = 3.4;
  const teeth = (w, y) => { ctx.fillStyle = '#efe7da'; ctx.fillRect(-w / 2, y, w, 5); };
  ctx.beginPath();
  switch (kind) {
    case 'smirk': ctx.moveTo(-22, 3); ctx.quadraticCurveTo(0, 5, 24, -6); ctx.stroke(); break;
    case 'flat': ctx.moveTo(-20, 1); ctx.lineTo(20, 1); ctx.stroke(); break;
    case 'o': ctx.ellipse(0, 2, 10, 8, 0, 0, Math.PI * 2); ctx.fill(); break;
    case 'talk': ctx.ellipse(0, 3, 17, 9, 0, 0, Math.PI * 2); ctx.fill(); teeth(22, -6); break;
    case 'talkWide': ctx.ellipse(0, 4, 21, 12, 0, 0, Math.PI * 2); ctx.fill(); teeth(28, -8); break;
    case 'grin':
      ctx.moveTo(-28, -4); ctx.quadraticCurveTo(0, 26, 28, -4); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip(); teeth(50, -6); ctx.restore(); break;
    case 'smile': ctx.moveTo(-24, -2); ctx.quadraticCurveTo(0, 12, 24, -2); ctx.stroke(); break;
    case 'grimace':
      ctx.moveTo(-26, 4); ctx.lineTo(26, 4); ctx.lineTo(22, 12); ctx.lineTo(-22, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#efe7da'; ctx.fillRect(-22, 5, 44, 5); break;
    default: ctx.moveTo(-20, 1); ctx.quadraticCurveTo(0, 4, 20, 1); ctx.stroke();
  }
  ctx.restore();
}

// Glasses: black paper frames; the lenses are film and are drawn lit later.
function glasses(ctx, tx, o) {
  ctx.save();
  ctx.translate(tx * 0.9, 0);
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(10,6,14,0.45)';
  ctx.shadowBlur = 4 * R.px;
  ctx.shadowOffsetX = 2 * R.px;
  ctx.shadowOffsetY = 4 * R.px;
  ctx.strokeStyle = '#1b1a20';
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (const side of [-1, 1]) roundRectPath(ctx, side * 57 - 45, -58, 90, 64, 16);
  ctx.moveTo(-12, -32); ctx.quadraticCurveTo(0, -40, 12, -32);
  ctx.moveTo(-102, -40); ctx.lineTo(-128, -32);
  ctx.moveTo(102, -40); ctx.lineTo(128, -32);
  ctx.stroke();
  ctx.restore();
  // the lit lenses are drawn after the light pass (see lensGlow)
  FACE_LENS.tx = tx * 0.9;
  FACE_LENS.m = ctx.getTransform();
  FACE_LENS.reflect = o.reflect || null;
  FACE_LENS.bright = o.lensBright ?? 1;
}
function roundRectPath(c, x, y, w, h, r) {
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
const FACE_LENS = { tx: 0, m: null, reflect: null, bright: 1 };

// After the light pass: the screen reflected in his glasses (and, small, the dolphin).
export function lensGlow() {
  if (!FACE_LENS.m) return;
  const ctx = R.ctx;
  ctx.save();
  ctx.setTransform(FACE_LENS.m);
  const k = FACE_LENS.bright;
  for (const side of [-1, 1]) {
    const lx = side * 57 + FACE_LENS.tx, ly = -26;
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, lx - 42, ly - 29, 84, 58, 14);
    ctx.clip();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(120,150,210,${0.16 * k})`;
    ctx.fillRect(lx - 50, ly - 40, 100, 80);
    // the monitor, a pale slanted rectangle
    ctx.fillStyle = `rgba(210,230,255,${0.34 * k})`;
    ctx.beginPath();
    ctx.moveTo(lx - 30, ly - 18); ctx.lineTo(lx + 26, ly - 22); ctx.lineTo(lx + 30, ly + 10); ctx.lineTo(lx - 26, ly + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.35 * k})`;
    ctx.fillRect(lx - 36, ly - 26, 6, 40);
    const rf = FACE_LENS.reflect;
    if (rf) {
      // the dolphin, mirrored and tiny
      const S = dolphinShape(Math.floor(R.frame / 2) % 8, 0, 'blue');
      ctx.save();
      ctx.translate(lx + 26 - rf.x * 52, ly - 14 + rf.y * 26);
      ctx.scale(-0.075, 0.075);
      ctx.fillStyle = `rgba(90,200,245,${0.9 * k})`;
      ctx.fill(S.all.path);
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
  FACE_LENS.m = null;
}

// ===========================================================================
// 3. His arm, reaching in from the bottom left (point of view shots).
// The hand is at the origin; the sleeve runs away down-left.

let AR = null;
function buildArm() {
  const sleeve = [[-22, 18], [28, 34], [-150, 640], [-330, 640]];
  const cuff = [[-24, 14], [30, 30], [16, 66], [-36, 50]];
  const reach = smooth([[-8, 6], [0, -22], [22, -40], [58, -46], [70, -38], [60, -30], [36, -28], [52, -18], [44, -6], [26, 4], [18, 20]], true, 4);
  const thumbR = smooth([[4, -18], [18, -54], [30, -58], [26, -34], [14, -10]], true, 4);
  const grip = smooth([[-8, 6], [-4, -26], [16, -44], [40, -42], [48, -26], [40, -8], [24, 4], [16, 20]], true, 4);
  const knuckles = smooth([[16, -44], [40, -42], [48, -26], [44, -12], [34, -22], [30, -34]], true, 4);
  const a = { jag: 0.2, wander: 0.4, step: 12, corner: 0.3 };
  AR = {
    sleeve: cs(smooth(sleeve, true, 3), 60), cuff: cs(cuff, 61, a),
    reach: cs(reach, 62, a), thumb: cs(thumbR, 63, a), grip: cs(grip, 64, a), knuckles: cs(knuckles, 65, a),
  };
}
// o: x, y (hand), r, pose ('reach'|'grip'), day, s
export function arm(o = {}) {
  if (!AR) buildArm();
  const { x = 0, y = 0, r = 0, pose = 'reach', s = 1, lit = 0.6 } = o;
  const P = { x, y, r, s, tex: 'plain', lift: 26, edge: 0.3 };
  const skin = mix('#6a4f4a', '#d2a687', lit), wool = mix('#26251d', '#5a5640', lit);
  piece(AR.sleeve, { ...P, color: wool, tex: 'washi', ts: 0.7 });
  piece(AR.cuff, { ...P, color: mix('#1f1e18', '#4a4735', lit), tex: 'washi' });
  if (pose === 'grip') {
    piece(AR.grip, { ...P, color: skin });
    piece(AR.knuckles, { ...P, color: mix(skin, '#000000', 0.08), lift: 28 });
  } else {
    piece(AR.reach, { ...P, color: skin });
    piece(AR.thumb, { ...P, color: mix(skin, '#000000', 0.06), lift: 28 });
  }
}
