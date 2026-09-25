// Scene 4 — the story he is writing, played as a shadow play on his screen.
// A robot cat who only says "meow"; a fridge; and, suddenly, the world.
import { room, SHOT, SCR, MUG, steam } from '../room.js';
import { editor, theatre } from '../screen.js';
import { dolphin, bubbles } from '../dolphin.js';
import { manBack, chairBack } from '../man.js';
import { faceShot } from '../closeup.js';
import { TYPED0 } from './s1_room.js';
import { CAPS } from '../text.js';
import { ease, seg } from '../util.js';
import { camAt, homeSpot, swimTo, talking, dolMouth, clockAt } from '../common.js';

const caps = [
  { a: 8, b: 42, ...CAPS.s4[0] },
  { a: 50, b: 88, ...CAPS.s4[1] },
  { a: 150, b: 216, ...CAPS.s4[2] },
  { a: 292, b: 344, ...CAPS.s4[3] },
  { a: 352, b: 396, ...CAPS.s4[4] },
  { a: 404, b: 432, ...CAPS.s4[5] },
];
const PLAY0 = 100; // the page lifts away; the shadow play begins
const BUMP = 358, ROLL = 382; // (scene frames)

function dol(f, globe) {
  if (f < 342) {
    const h = homeSpot(f, { u: 548, v: 58, amp: 0.8 });
    return { ...h, s: 0.4 };
  }
  if (!globe) return { ...homeSpot(f), s: 0.4 };
  const gu = globe.x - SCR.x, gv = globe.y - SCR.y;
  if (f < BUMP) return { ...swimTo(f, 342, BUMP, [548, 58], [gu + 58, gv - 60], 20), s: 0.44, dir: -1 };
  const back = ease.out(seg(f, BUMP, BUMP + 10));
  return { x: SCR.x + gu + 58 + back * 40, y: SCR.y + gv - 60 - back * 10, s: 0.44, dir: -1, r: Math.sin(f * 0.3) * 0.08 };
}

export default {
  id: 's4',
  len: 440,
  mood: 'story',
  caps,
  warm: [10, 60, 130, 200, 280, 360, 420],
  draw(f) {
    const time = clockAt(0, 21, f);
    const dTalk = talking(caps, f, 'dol');
    if ((f >= 44 && f < 94) || f >= 398) {
      const m = talking(caps, f, 'man');
      faceShot({ face: f < 398 ? 'grin' : 'sheepish', talk: m, blink: f === 70, reflect: { x: 0.9, y: 0.2 } });
      return;
    }
    const inPlay = f >= PLAY0 - 8 && f < 398;
    const cam = f < 44 ? SHOT.screen : camAt(f, [[94, SHOT.screen], [140, { x: 1520, y: 412, z: 1.72 }], [398, { x: 1520, y: 412, z: 1.8 }]]);
    room({
      cam,
      time,
      mug: {},
      bg: () => steam('mug', MUG.x, MUG.y - 58, f, 1, 1),
      screenBase: inPlay && f >= PLAY0 + 4 ? '#f8f0de' : undefined,
      screen: (ctx) => {
        let globe = null;
        if (inPlay && f >= PLAY0 + 4) globe = theatre(ctx, f - PLAY0, { bump: BUMP - PLAY0, rollAway: ROLL - PLAY0 });
        else editor(ctx, { f, typed: TYPED0 + 76, reqs: 6, link: 0.3, hidePage: f >= PLAY0 - 8 ? seg(f, PLAY0 - 8, PLAY0 + 4) : 0, sidebar: inPlay ? 1 - seg(f, PLAY0 - 8, PLAY0) : 1 });
        const d = dol(f, globe);
        dolphin({ x: d.x, y: d.y, s: d.s, r: d.r, dir: d.dir, pose: Math.floor(f / 2), mouth: dolMouth(dTalk, f), mode: 'box', seed: 1 });
        if (f >= BUMP && f < BUMP + 20) bubbles('bump', d.x - 40, d.y - 10, f, { start: BUMP, life: 16, n: 5, s: 0.8 });
      },
      fg: () => {
        manBack({ head: { turn: 0.15, nod: f > 150 ? 0.4 : 0 }, type: f > 100 && f < 290 && Math.floor(f / 2) % 3 !== 0 });
        chairBack({});
      },
    });
  },
  sfx(f, A) {
    if (f === 0) A.hum(0.25);
    for (const c of caps) {
      if (c.who === 'dol' && f === c.a) A.whistle(0.7, 1);
      if (c.who === 'dol' && f > c.a && talking(caps, f, 'dol') && f % 3 === 0) A.chatter(0.7);
    }
    if (f === PLAY0 - 8) A.rustle(0.6, 0.7);
    const t = f - PLAY0;
    if (t === 20) A.bell('E6', 0.06); // "meow"
    if (t === 22) A.bell('C6', 0.05);
    if (t === 64) A.rustle(0.9, 0.35); // blue film slides in
    if (t > 78 && t < 104 && t % 4 === 0) A.pluck(['C4', 'E4', 'G4', 'A4'][(t / 4) % 4], 0.12);
    if (t === 106) A.pluck('C3', 0.2);
    if (t === 110) A.tap(0.6);
    if (t === 124) A.chime(['C6', 'E6'], 0.04, 0.08);
    if (t === 152) A.chime(['C4', 'G4', 'C5', 'E5', 'G5'], 0.05, 0.07);
    if (t === 172) A.chime(['G5', 'C6'], 0.05, 0.1);
    if (f === BUMP) { A.tap(0.8); A.bubble(0.8); A.bubble(0.6, 0.1); }
    if (f === ROLL) A.rustle(1.2, 0.5);
    if (f > 100 && f < 290 && Math.floor(f / 2) % 3 !== 0 && f % 2 === 0) A.typing(1, 0.5);
  },
};
