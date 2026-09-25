// Scene 5 — the fridge reports on the soy milk; the dolphin asks how they look
// to him, then vanishes from the edge of the screen and swims the whole desktop.
import { room, SHOT, SCR, MUG, steam } from '../room.js';
import { dolphin, bubbles } from '../dolphin.js';
import { manBack, chairBack } from '../man.js';
import { faceShot } from '../closeup.js';
import { deskScreen, TYPED0 } from './s1_room.js';
import { CAPS, LCD } from '../text.js';
import { vlang } from '../render.js';
import { ease, seg, lerp, hs } from '../util.js';
import { camAt, homeSpot, swimTo, talking, dolMouth, clockAt } from '../common.js';

const caps = [
  { a: 16, b: 66, ...CAPS.s5[0] },
  { a: 74, b: 108, ...CAPS.s5[1] },
  { a: 142, b: 206, ...CAPS.s5[2] },
  { a: 214, b: 252, ...CAPS.s5[3] },
  { a: 260, b: 292, ...CAPS.s5[4] },
];
const LOOP0 = 318, LOOP1 = 380;

function dol(f) {
  if (f < 150) return { ...homeSpot(f), s: 0.42 };
  if (f < 170) return { ...swimTo(f, 150, 170, [540, 150], [330, 150], 20), s: lerp(0.42, 0.62, seg(f, 150, 170)) };
  if (f < 280) return { x: SCR.x + 330 + Math.sin(f * 0.09) * 10, y: SCR.y + 150 + Math.sin(f * 0.15) * 6, s: 0.62, dir: 1, r: Math.sin(f * 0.09) * 0.04 };
  if (f < 300) {
    // turns and swims out through the right-hand edge of the screen
    const p = ease.in(seg(f, 280, 300));
    return { x: SCR.x + lerp(330, 720, p), y: SCR.y + 150 - p * 30, s: 0.62, dir: 1, r: -0.1 };
  }
  if (f < LOOP0) return null;
  // back from the left edge, all over the desktop: a figure of eight
  const p = seg(f, LOOP0, LOOP1);
  const a = p * Math.PI * 2 - Math.PI / 2;
  const x = 306 + Math.cos(a) * 250 * (p < 0.08 ? 1 + (0.08 - p) * 8 : 1);
  const y = 172 + Math.sin(2 * a) * 105;
  const dx = -Math.sin(a) * 250, dy = Math.cos(2 * a) * 210;
  if (f >= LOOP1) return { ...swimTo(f, LOOP1, LOOP1 + 12, [306, 172], [540, 150], 30), s: 0.46 };
  return { x: SCR.x + x, y: SCR.y + y, s: 0.5, dir: dx >= 0 ? 1 : -1, r: Math.atan2(dy, Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1) };
}

export default {
  id: 's5',
  len: 396,
  mood: 'night',
  caps,
  warm: [10, 80, 120, 170, 230, 270, 310, 350],
  draw(f) {
    const time = f < 114 ? clockAt(1, 11, f) : clockAt(1, 12, f - 114);
    if (f >= 210 && f < 256) {
      faceShot({ face: 'deadpan', talk: talking(caps, f, 'man'), blink: f === 236, reflect: { x: 0.55, y: 0.44 } });
      return;
    }
    const d = dol(f);
    const dTalk = talking(caps, f, 'dol');
    const fTalk = talking(caps, f, 'fri');
    let cam, fg;
    if (f < 56) cam = camAt(f, [[0, SHOT.fridge], [56, { ...SHOT.fridge, z: 2.0 }]]);
    else if (f < 114) cam = camAt(f, [[56, { ...SHOT.desk, z: 0.92 }], [114, { ...SHOT.desk, z: 0.96 }]]);
    else if (f < 142) cam = SHOT.clock;
    else if (f < 300) cam = camAt(f, [[142, SHOT.screen], [206, { ...SHOT.screen, z: 1.72 }], [256, SHOT.screen]]);
    else if (f < LOOP0) cam = { ...SHOT.desk, z: 1.08 };
    else cam = camAt(f, [[LOOP0, { x: 1520, y: 412, z: 1.5 }], [396, { x: 1520, y: 412, z: 1.56 }]]);
    const turnToFridge = f >= 60 && f < 114 ? ease.out(seg(f, 62, 72)) : 0;
    room({
      cam,
      time,
      mug: {},
      bg: () => steam('mug', MUG.x, MUG.y - 58, f, 0.8, 1),
      fridge: {
        led: fTalk ? (Math.floor(f / 3) % 2 ? 1 : 0.4) : 1,
        lcd: fTalk ? { wave: 1 } : f < 114 ? { text: LCD.soy[vlang()], scroll: true } : {},
      },
      screen: deskScreen(f, {
        typed: TYPED0 + 90,
        reqs: 6,
        dolphin: !!d,
        dolphinAt: d || undefined,
        ds: d ? d.s : 0.42,
        mouth: dolMouth(dTalk, f),
        extra: d && f >= LOOP0 && f < LOOP1 ? () => bubbles('loop' + Math.floor(f / 8), d.x - d.dir * 40, d.y, f % 8, { life: 8, n: 3, s: 0.7 }) : null,
      }),
      fg: () => {
        const puzzled = f >= 300 && f < LOOP0;
        manBack({
          head: { turn: turnToFridge * 0.9 + (puzzled ? 0.35 : 0), tilt: puzzled ? 0.06 : 0, nod: -turnToFridge * 0.5 },
          arm: puzzled ? 'mouse' : 'keys',
          type: f >= 114 && f < 140,
        });
        chairBack({});
      },
    });
  },
  sfx(f, A) {
    if (f === 0) A.hum(0.8);
    if (f === 16) A.fridgeVoice(0.8);
    if (f > 16 && talking(caps, f, 'fri') && f % 2 === 0) A.fridgeBlip(0.6);
    if (f === 56) A.hum(0.35);
    if (f >= 114 && f < 142 && (f - 114) % 12 === 0) A.tick(1);
    for (const c of caps) {
      if (c.who === 'dol' && f === c.a) A.whistle(0.7, c.a > 250 ? -1 : 1);
      if (c.who === 'dol' && f > c.a && talking(caps, f, 'dol') && f % 3 === 0) A.chatter(0.7);
    }
    if (f === 290) A.whistle(0.5, 1);
    if (f === 306 || f === 310) A.click();
    if (f === LOOP0) { A.whistle(1, 1); A.crinkle(0.3, 0.5); }
    if (f > LOOP0 && f < LOOP1 && f % 4 === 0) A.bubble(0.5 + hs('bb', f) * 0.3);
    if (f > LOOP0 && f < LOOP1 && f % 8 === 2) A.bell(['E5', 'G#5', 'B5', 'C#6', 'E6', 'C#6', 'B5', 'G#5'][((f - LOOP0) / 8) % 8 | 0], 0.05);
  },
};
