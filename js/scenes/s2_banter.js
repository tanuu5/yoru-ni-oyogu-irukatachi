// Scene 2 — the dolphin's little remarks, and the one that lands.
import { room, SHOT, SCR } from '../room.js';
import { dolphin } from '../dolphin.js';
import { manBack, chairBack } from '../man.js';
import { faceShot } from '../closeup.js';
import { deskScreen, TYPED0 } from './s1_room.js';
import { CAPS } from '../text.js';
import { ease, seg, lerp, hs } from '../util.js';
import { camAt, homeSpot, swimTo, talking, dolMouth, clockAt } from '../common.js';

const caps = [
  { a: 10, b: 86, ...CAPS.s2[0] },
  { a: 96, b: 150, ...CAPS.s2[1] },
  { a: 166, b: 252, ...CAPS.s2[2] },
  { a: 262, b: 294, ...CAPS.s2[3] },
  { a: 302, b: 348, ...CAPS.s2[4] },
];

// where the dolphin is (screen-local u, v) and how
function dol(f) {
  const home = homeSpot(f);
  const hx = home.x - SCR.x, hy = home.y - SCR.y;
  if (f < 20) return { ...swimTo(f, 0, 20, [hx, hy], [500, 112], 14), s: 0.42 };
  if (f < 160) {
    const b = { x: SCR.x + 500 + Math.sin(f * 0.13) * 8, y: SCR.y + 112 + Math.sin(f * 0.2) * 6, dir: -1, r: Math.sin(f * 0.13) * 0.05 };
    return { ...b, s: 0.42 };
  }
  if (f < 176) return { ...swimTo(f, 160, 176, [500, 112], [300, 164], 40), s: 0.44 };
  // the little twirl, then leaning in closer and closer
  const grow = ease.inOut(seg(f, 186, 250));
  const x = SCR.x + 300 + Math.sin(f * 0.1) * 5, y = SCR.y + 164 + Math.sin(f * 0.16) * 5;
  const roll = f >= 176 && f < 188 ? ((f - 176) / 12) * Math.PI * 2 : 0;
  if (f < 300) return { x, y, s: lerp(0.46, 0.74, grow), dir: -1, r: Math.sin(f * 0.1) * 0.04, roll };
  // playful tilt for the last word
  return { x: SCR.x + 312 + Math.sin(f * 0.12) * 10, y: SCR.y + 158, s: 0.74, dir: -1, r: -0.16 + Math.sin(f * 0.25) * 0.06 };
}

export default {
  id: 's2',
  len: 352,
  mood: 'banter',
  caps,
  warm: [10, 120, 200, 270, 330],
  draw(f) {
    const face = f >= 90 && f < 160 ? 1 : f >= 254 && f < 300 ? 2 : 0;
    const d = dol(f);
    const dTalk = talking(caps, f, 'dol');
    if (face) {
      const m = talking(caps, f, 'man');
      const ex = face === 1
        ? { face: f < 100 ? 'wry' : 'skeptic', talk: m }
        : { face: f < 262 ? 'surprised' : 'annoyed', talk: m, turn: f < 262 ? 0 : -0.35 };
      faceShot({ ...ex, blink: f === 126 || f === 127, reflect: { x: (d.x - SCR.x) / SCR.w, y: (d.y - SCR.y) / SCR.h }, z: face === 2 ? 1.04 : 1 });
      return;
    }
    const cam = f < 160 ? camAt(f, [[0, SHOT.screen], [90, { ...SHOT.screen, x: 1560, y: 410, z: 1.7 }]])
      : f < 300 ? camAt(f, [[160, SHOT.screen], [250, { x: 1500, y: 404, z: 1.95 }]])
        : camAt(f, [[300, { x: 1520, y: 410, z: 1.9 }], [352, { x: 1530, y: 414, z: 1.8 }]]);
    room({
      cam,
      time: clockAt(23, 52, f),
      screen: deskScreen(f, {
        typed: TYPED0 + 60,
        reqs: 6,
        dolphinAt: d,
        ds: d.s,
        mouth: dolMouth(dTalk, f),
        dol: { roll: d.roll || 0 },
      }),
      fg: () => {
        const slump = f >= 300 ? ease.out(seg(f, 300, 316)) : 0;
        manBack({ head: { turn: f >= 300 ? -0.2 - slump * 0.2 : 0.25, nod: slump * 1.2, tilt: hs('ht', Math.floor(f / 6)) * 0.01 } });
        chairBack({});
      },
    });
  },
  sfx(f, A) {
    if (f === 0) A.hum(0.3);
    for (const c of caps) {
      if (c.who === 'dol' && f === c.a) A.whistle(0.8, 1);
      if (c.who === 'dol' && f > c.a && talking(caps, f, 'dol') && f % 3 === 0) A.chatter(0.8);
    }
    if (f === 176) { A.crinkle(0.6, 0.8); A.chime(['E5', 'G#5', 'B5', 'E6'], 0.05, 0.06); }
    if (f === 254) A.tap(0.4);
  },
};
