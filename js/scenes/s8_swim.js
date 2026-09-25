// Scene 8 — past two. He keeps writing. Behind him, the room fills with moving
// water-light, and two dolphins swim out: one from the screen, one from the fridge.
import { room, SHOT, SCR, FRIDGE } from '../room.js';
import { dolphin, dolphinLight, dolphinBloom, bubbles } from '../dolphin.js';
import { manBack, chairBack } from '../man.js';
import { faceShot } from '../closeup.js';
import { deskScreen, TYPED0 } from './s1_room.js';
import { CAPS } from '../text.js';
import { ease, seg, lerp, hs } from '../util.js';
import { camAt, homeSpot, talking, dolMouth, clockAt, typingNow } from '../common.js';

const caps = [
  { a: 30, b: 90, ...CAPS.s8[0] },
  { a: 96, b: 132, ...CAPS.s8[1] },
  { a: 140, b: 180, ...CAPS.s8[2] },
  { a: 240, b: 286, ...CAPS.s8[3] },
  { a: 294, b: 354, ...CAPS.s8[4] },
  { a: 368, b: 406, ...CAPS.s8[5] },
];
const SWIM0 = 182;
const OUT_A = 204, OUT_B = 216, LOOP = 228, BACK = 378, HOME = 400;

const smooth = (t) => t * t * (3 - 2 * t);
// a loop through the room (Lissajous), phase-shifted for the second dolphin
function loop(f, k) {
  const u = (f - LOOP) * 0.028;
  const ph = k * 0.55;
  const x = 1430 + 1000 * Math.sin(u + 0.4 - ph);
  const y = 330 + 170 * Math.sin(2 * u + 1.2 - ph * 1.6) + k * 30;
  const dx = Math.cos(u + 0.4 - ph), dy = 0.34 * Math.cos(2 * u + 1.2 - ph * 1.6);
  const s = 1.08 + 0.32 * Math.sin(u * 0.8 + k);
  return { x, y, s, dir: dx >= 0 ? 1 : -1, r: Math.atan2(dy, Math.abs(dx)) * 0.7 * (dx >= 0 ? 1 : -1) };
}
function dolA(f) {
  const exit = { x: SCR.x + 560, y: SCR.y - 20, s: 0.6, dir: 1, r: -0.5 };
  if (f < OUT_A) return null;
  if (f < LOOP + 16) {
    const L = loop(Math.max(f, LOOP), 0);
    const p = smooth(seg(f, OUT_A, LOOP + 16));
    return { x: lerp(exit.x, L.x, p), y: lerp(exit.y, L.y, p) - Math.sin(p * Math.PI) * 80, s: lerp(0.6, L.s, p), dir: p < 0.5 ? -1 : L.dir, r: lerp(-0.4, L.r, p) };
  }
  if (f < BACK) return loop(f, 0);
  const L = loop(BACK, 0);
  const p = smooth(seg(f, BACK, HOME));
  const home = { x: SCR.x + 560, y: SCR.y - 10 };
  return { x: lerp(L.x, home.x, p), y: lerp(L.y, home.y, p) - Math.sin(p * Math.PI) * 60, s: lerp(L.s, 0.5, p), dir: home.x > L.x ? 1 : -1, r: 0.3 * p };
}
function dolB(f) {
  const crack = { x: FRIDGE.split + 40, y: 330, s: 0.5 };
  if (f < OUT_B) return null;
  if (f < LOOP + 24) {
    const L = loop(Math.max(f, LOOP), 1);
    const p = smooth(seg(f, OUT_B, LOOP + 24));
    return { x: lerp(crack.x, L.x, p), y: lerp(crack.y, L.y, p) - Math.sin(p * Math.PI) * 60, s: lerp(0.5, L.s, p), dir: -1, r: 0 };
  }
  if (f < BACK + 4) return loop(f, 1);
  const L = loop(BACK + 4, 1);
  const p = smooth(seg(f, BACK + 4, HOME + 4));
  return { x: lerp(L.x, crack.x, p), y: lerp(L.y, crack.y, p), s: lerp(L.s, 0.45, p), dir: crack.x > L.x ? 1 : -1, r: 0 };
}

export default {
  id: 's8',
  len: 412,
  mood: 'night',
  moodAt: (f) => (f >= SWIM0 ? 'swim' : 'night'),
  caps,
  warm: [10, 60, 110, 160, 200, 230, 280, 330, 390],
  draw(f) {
    if (f >= 136 && f < 182) {
      faceShot({ face: 'soft', talk: talking(caps, f, 'man'), blink: f === 172, reflect: { x: 0.9, y: 0.4 } });
      return;
    }
    const dTalk = talking(caps, f, 'dol');
    const time = f < SWIM0 ? clockAt(2, 14, f) : clockAt(2, 20, (f - SWIM0) * 38);
    if (f < 26) {
      room({ cam: SHOT.clock, time, mug: {} });
      return;
    }
    if (f < SWIM0) {
      const desk = f >= 92;
      const slump = desk ? ease.out(seg(f, 96, 110)) * (1 - ease.inOut(seg(f, 120, 132))) : 0;
      room({
        cam: desk ? { ...SHOT.desk, z: 1.04 } : SHOT.screen,
        time,
        mug: {},
        screen: deskScreen(f, { typed: TYPED0 + 100 + Math.max(0, f - 120), reqs: 6, dolphinAt: homeSpot(f, { u: 470, v: 150 }), ds: 0.55, mouth: dolMouth(dTalk, f), eye: dTalk ? 'open' : 'happy' }),
        fg: () => {
          manBack({ head: { nod: slump * 2, turn: 0.1 }, type: f > 132 && typingNow(f, true) });
          chairBack({});
        },
      });
      return;
    }
    // the night swim
    // wide as they come out; closer while they circle over his head; wide again as they go home
    const cam = camAt(f, [
      [SWIM0, { x: 1500, y: 450, z: 0.54 }], [258, { x: 1500, y: 440, z: 0.6 }], [296, { x: 1380, y: 405, z: 0.8 }],
      [350, { x: 1330, y: 398, z: 0.84 }], [384, { x: 1500, y: 450, z: 0.58 }], [412, { x: 1500, y: 450, z: 0.56 }],
    ]);
    const caustic = ease.inOut(seg(f, SWIM0, SWIM0 + 30)) * (1 - ease.inOut(seg(f, HOME, 412)));
    const A = dolA(f), B = dolB(f);
    const door = f < OUT_B - 6 ? 0 : f < HOME + 4 ? 0.22 * ease.out(seg(f, OUT_B - 6, OUT_B)) : 0.22 * (1 - ease.in(seg(f, HOME + 4, HOME + 10)));
    const inScreen = f < OUT_A + 4 || f >= HOME - 2;
    const Ls = [];
    if (A && !inScreen) Ls.push(dolphinLight(A.x, A.y, A.s, 'blue'));
    if (B) Ls.push(dolphinLight(B.x, B.y, B.s, 'pale'));
    if (door > 0) Ls.push({ x: 2760, y: 360, r: 420, color: [110, 200, 255], a: 1.6 * door });
    const laughing = (k) => Math.floor((f + k * 11) / 24) % 3 === 0;
    const drawD = (D, kind, k) => {
      if (!D) return;
      const laugh = laughing(k);
      dolphin({ x: D.x, y: D.y, s: D.s, r: D.r, dir: D.dir, pose: Math.floor(f / 2) + k * 3, mouth: laugh ? [2, 1][Math.floor(f / 2) % 2] : 0, eye: laugh ? 'happy' : 'open', mode: 'glow', kind, seed: 7 + k });
      dolphinBloom(D.x, D.y, D.s, kind);
      bubbles('sw' + k + Math.floor(f / 10), D.x - D.dir * 90 * D.s, D.y, f % 10, { life: 10, n: 3, s: D.s * 1.4, mode: 'glow' });
    };
    const nearA = A && A.s > 1.2, nearB = B && B.s > 1.2;
    room({
      cam,
      time,
      mug: {},
      monitor: 1 - caustic * 0.25,
      caustic,
      fridge: { door, sea: true, led: 0.6 },
      lightsExtra: Ls,
      screen: deskScreen(f, {
        typed: TYPED0 + 150 + Math.floor((f - SWIM0) / 5),
        reqs: 6,
        dolphin: inScreen,
        dolphinAt: f < OUT_A + 4 ? { x: SCR.x + lerp(540, 590, seg(f, SWIM0 + 8, OUT_A + 4)), y: SCR.y + lerp(150, -40, ease.in(seg(f, SWIM0 + 8, OUT_A + 4))), dir: 1, r: -0.6 * seg(f, SWIM0 + 8, OUT_A + 4) } : homeSpot(f),
        ds: 0.42,
      }),
      air: () => {
        if (!inScreen && !nearA) drawD(A, 'blue', 0);
        if (!nearB) drawD(B, 'pale', 1);
      },
      fg: () => {
        manBack({ type: typingNow(f, true), head: { nod: 0.4 }, monitor: 1 - caustic * 0.2 });
        chairBack({});
      },
      front: () => {
        if (!inScreen && nearA) drawD(A, 'blue', 0);
        if (nearB) drawD(B, 'pale', 1);
      },
    });
  },
  sfx(f, A) {
    if (f === 0) A.hum(0.3);
    if (f < 26 && f % 12 === 0) A.tick(1.2);
    for (const c of caps) {
      if (c.who === 'dol' && f === c.a) A.whistle(0.5, -1);
      if (c.who === 'dol' && f > c.a && talking(caps, f, 'dol') && f % 3 === 0) A.chatter(0.5);
    }
    if (f > 132 && f < SWIM0 && typingNow(f, true)) A.typing(1, 0.6);
    if (f > SWIM0 && typingNow(f, true) && f % 2 === 0) A.typing(1, 0.35);
    if (f === OUT_A) { A.whistle(1, 1); A.crinkle(0.4, 0.5); }
    if (f === OUT_B - 6) { A.tap(0.4); A.hum(0.6); }
    if (f === OUT_B) A.whistle(0.8, 1);
    if (f > LOOP && f < BACK) {
      if (f % 24 === 0 || f % 24 === 11) A.whistle(0.45, (f / 24) % 2 ? 1 : -1);
      if (f % 6 === 0) A.bubble(0.35 + hs('sb', f) * 0.3);
      if (f % 12 === 4) A.bell(['D5', 'F#5', 'A5', 'C#6', 'E6', 'A5', 'F#5', 'E5'][(f / 12 | 0) % 8], 0.035);
    }
    if (f === HOME + 4) { A.tap(0.5); A.hum(0.25); }
  },
};
