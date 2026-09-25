// Scene 7 — "now and then, we show each other a slightly different face."
// The dolphin turns over: its other side is a night sea. So is the back of the fridge's display.
import { room, SHOT, SCR, MUG, steam } from '../room.js';
import { dolphin } from '../dolphin.js';
import { manBack, chairBack } from '../man.js';
import { faceShot } from '../closeup.js';
import { deskScreen, TYPED0 } from './s1_room.js';
import { CAPS } from '../text.js';
import { ease, seg } from '../util.js';
import { camAt, talking, dolMouth, clockAt } from '../common.js';

const caps = [
  { a: 10, b: 98, ...CAPS.s7[0] },
  { a: 156, b: 190, ...CAPS.s7[1] },
  { a: 198, b: 248, ...CAPS.s7[2] },
  { a: 254, b: 280, ...CAPS.s7[3] },
];

function flipAt(f) {
  if (f < 58) return 0;
  if (f < 72) return ease.inOut(seg(f, 58, 72)) * Math.PI;
  if (f < 192) return Math.PI;
  if (f < 204) return Math.PI + ease.inOut(seg(f, 192, 204)) * Math.PI;
  return 0;
}

export default {
  id: 's7',
  len: 290,
  mood: 'faces',
  caps,
  warm: [10, 66, 90, 120, 170, 210, 266],
  draw(f) {
    const time = clockAt(2, 8, f);
    if ((f >= 150 && f < 192) || f >= 250) {
      const m = talking(caps, f, 'man');
      const face = f < 192 ? 'grimace' : m ? 'annoyed' : 'wry';
      faceShot({ face, talk: m, turn: f >= 250 ? -0.3 : 0, blink: f === 176, reflect: { x: 0.62, y: 0.42 } });
      return;
    }
    const dTalk = talking(caps, f, 'dol');
    if (f >= 100 && f < 150) {
      // the fridge, in the dark kitchen: its little display turns over too
      room({
        cam: camAt(f, [[100, { ...SHOT.fridge, y: 300, z: 2.4 }], [150, { ...SHOT.fridge, y: 300, z: 2.55 }]]),
        time,
        mug: {},
        monitor: 0.9,
        fridge: { lcd: { flip: ease.inOut(seg(f, 108, 122)) }, led: Math.floor(f / 4) % 2 ? 1 : 0.3 },
      });
      return;
    }
    const x = SCR.x + 380 + Math.sin(f * 0.07) * 8, y = SCR.y + 150 + Math.sin(f * 0.12) * 6;
    room({
      cam: camAt(f, [[0, { x: 1600, y: 390, z: 2.25 }], [100, { x: 1600, y: 390, z: 2.45 }], [192, { x: 1600, y: 392, z: 2.35 }], [250, { x: 1600, y: 392, z: 2.3 }]]),
      time,
      mug: {},
      bg: () => steam('mug', MUG.x, MUG.y - 58, f, 0.5, 1),
      screen: deskScreen(f, {
        typed: TYPED0 + 96,
        reqs: 6,
        dolphinAt: { x, y, dir: -1, r: Math.sin(f * 0.07) * 0.04 },
        ds: 0.72,
        mouth: dolMouth(dTalk, f),
        dol: { flip: flipAt(f), seed: 5 },
      }),
      fg: () => {
        manBack({ head: { turn: 0.2 } });
        chairBack({});
      },
    });
  },
  sfx(f, A) {
    if (f === 0) A.hum(0.3);
    for (const c of caps) {
      if (c.who === 'dol' && f === c.a) A.whistle(0.6, 1);
      if (c.who === 'dol' && f > c.a && talking(caps, f, 'dol') && f % 3 === 0) A.chatter(0.6);
    }
    if (f === 58 || f === 192) { A.crinkle(0.9, 1); A.chime(['D5', 'A5', 'C#6', 'F#6'], 0.05, 0.08); }
    if (f === 100) A.hum(0.9);
    if (f === 108) { A.crinkle(0.5, 0.6); A.chime(['A5', 'E6', 'F#6'], 0.045, 0.08); }
    if (f === 150) A.hum(0.3);
  },
};
