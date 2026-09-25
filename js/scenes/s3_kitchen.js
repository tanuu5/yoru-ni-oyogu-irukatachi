// Scene 3 — he gets up for coffee. The fridge has an opinion.
import { room, SHOT, KETTLE, DRIP, COUNTER, MUG, soyCarton, mug, steam } from '../room.js';
import { manBack, chairBack, arm } from '../man.js';
import { dolphin } from '../dolphin.js';
import { deskScreen, TYPED0 } from './s1_room.js';
import { CAPS, LCD } from '../text.js';
import { vlang } from '../render.js';
import { ease, seg, lerp, clamp } from '../util.js';
import { camAt, homeSpot, talking, clockAt } from '../common.js';

const caps = [
  { a: 54, b: 108, ...CAPS.s3[0] },
  { a: 114, b: 140, ...CAPS.s3[1] },
];
const HANDLE = { x: 2728, y: 356 };

function handPath(f) {
  // reach for the handle, stop (the fridge speaks), open, take the soy milk, shut
  if (f < 50) {
    const p = ease.out(seg(f, 34, 50));
    return { x: lerp(2250, HANDLE.x - 8, p), y: lerp(1040, HANDLE.y + 30, p), r: lerp(-0.5, -0.18, p), pose: 'reach' };
  }
  if (f < 140) {
    const flinch = f >= 56 && f < 62 ? (62 - f) * 3 : 0;
    return { x: HANDLE.x - 8 - flinch, y: HANDLE.y + 30 + flinch * 0.5, r: -0.18, pose: 'reach' };
  }
  if (f < 150) {
    const p = ease.inOut(seg(f, 140, 150));
    return { x: lerp(HANDLE.x - 8, HANDLE.x - 150, p), y: lerp(HANDLE.y + 30, HANDLE.y + 40, p), r: -0.18, pose: 'grip' };
  }
  if (f < 162) {
    const p = ease.inOut(seg(f, 150, 162));
    return { x: lerp(HANDLE.x - 150, 2770, p), y: lerp(HANDLE.y + 40, 330, p), r: lerp(-0.18, -0.05, p), pose: p > 0.8 ? 'grip' : 'reach' };
  }
  const p = ease.in(seg(f, 164, 178));
  return { x: lerp(2770, 2300, p), y: lerp(330, 1060, p), r: -0.1, pose: 'grip' };
}
const doorAt = (f) => (f < 142 ? 0 : f < 152 ? ease.out(seg(f, 142, 152)) : f < 166 ? 1 : 1 - ease.in(seg(f, 166, 174)));

export default {
  id: 's3',
  len: 226,
  mood: 'kitchen',
  caps,
  warm: [10, 40, 100, 150, 190, 214],
  draw(f) {
    const time = clockAt(0, 4, f);
    if (f < 30) {
      // he gets up; the chair turns after him
      const up = ease.in(seg(f, 4, 20));
      const spin = f < 10 ? 0 : Math.sin(seg(f, 10, 30) * Math.PI) * 0.32;
      room({
        cam: camAt(f, [[0, SHOT.desk], [30, { ...SHOT.desk, z: 1.03 }]]),
        time,
        mug: null,
        screen: deskScreen(f, { typed: TYPED0 + 70, reqs: 6, dol: { eye: f > 12 ? 'open' : 'open' } }),
        fg: () => {
          if (up < 1) manBack({ lift: up * 640, head: { nod: -up * 2, turn: -0.3 * up } });
          chairBack({ spin });
        },
      });
      return;
    }
    if (f < 180) {
      const h = handPath(f);
      const fTalk = talking(caps, f, 'fri');
      const door = doorAt(f);
      const tookSoy = f >= 158;
      room({
        cam: camAt(f, [[30, { ...SHOT.kitchen, x: 2520, y: 440, z: 1.12 }], [180, { ...SHOT.kitchen, x: 2560, y: 430, z: 1.2 }]]),
        time,
        mug: null,
        fridge: {
          door,
          soyGone: tookSoy,
          led: fTalk ? (Math.floor(f / 3) % 2 ? 1 : 0.4) : 1,
          lcd: fTalk ? { wave: 1 } : f >= 108 && f < 142 ? { text: LCD.caffeine[vlang()], scroll: false } : {},
        },
        kitchen: {},
        bg: () => {
          mug({ x: 2420 - 60, y: COUNTER.top, lift: 4 });
        },
        front: () => {
          if (tookSoy && f < 178) soyCarton(h.x + 16, h.y + 8, -0.1, 1.2);
          arm({ ...h, s: 1.25, lit: door > 0 ? 0.55 + door * 0.35 : 0.45 });
        },
      });
      return;
    }
    // coffee: kettle over the dripper
    if (f < 214) {
      const t = f - 180;
      const tilt = ease.inOut(seg(t, 0, 6)) * (t < 28 ? 1 : 1 - ease.inOut(seg(t, 28, 34)));
      const k = { x: lerp(KETTLE.x, 2190, ease.inOut(seg(t, 0, 5))), y: lerp(KETTLE.y, 470, ease.inOut(seg(t, 0, 5))), r: -0.35 * tilt, lift: 22 };
      const c = Math.cos(k.r), s = Math.sin(k.r);
      const hx = k.x + (-54 * c - -30 * s), hy = k.y + (-54 * s + -30 * c);
      room({
        cam: { x: 2250, y: 440, z: 1.6 },
        time,
        mug: null,
        kitchen: { kettle: k, pour: t > 6 && t < 28 ? 1 : 0, drip: t > 10, level: clamp((t - 10) / 26) * 0.62 },
        bg: () => {
          mug({ x: 2360, y: COUNTER.top, lift: 4 });
          if (t > 14) steam('srv', DRIP.x, DRIP.y - 100, f, 0.8, 1);
        },
        front: () => arm({ x: hx, y: hy, r: -0.25 + k.r, pose: 'grip', s: 1.2, lit: 0.45 }),
      });
      return;
    }
    // back at the desk: the fridge's status has appeared beside the dolphin
    const d = homeSpot(f, { u: 520, v: 214, amp: 1.4 });
    room({
      cam: SHOT.screen,
      time,
      mug: {},
      bg: () => steam('mug', MUG.x, MUG.y - 58, f, 1, 1),
      screen: deskScreen(f, { typed: TYPED0 + 70, reqs: 6, link: 1, linkText: vlang() === 'ja' ? 'カフェイン検知' : 'caffeine!', dolphinAt: { ...d, r: d.r + Math.sin(f * 0.6) * 0.3 }, ds: 0.4 }),
      fg: () => {
        manBack({ head: { turn: 0.1 } });
        chairBack({});
      },
    });
  },
  sfx(f, A) {
    if (f === 0) A.hum(0.4);
    if (f === 6) A.rustle(0.5, 0.5);
    if (f === 30) A.hum(0.9);
    if (f === 54) A.fridgeVoice(1);
    if (f > 54 && talking(caps, f, 'fri') && f % 2 === 0) A.fridgeBlip(0.8);
    if (f === 142) { A.rustle(0.3, 0.6); A.tap(0.4); }
    if (f === 166) A.tap(0.9);
    if (f === 180) A.hum(0.5);
    if (f === 186) A.pour(1.8, 0.9);
    if (f > 190 && f < 214 && f % 4 === 0) A.drip(0.7);
    if (f === 214) { A.hum(0.3); A.tap(0.5); }
  },
};
