// Scene 6 — "There's something I'd rather keep from you."
// The scratchpad: scribbles, one frame of what was really written, an eraser, a stamp.
import { room, SHOT, SCR, MUG, steam } from '../room.js';
import { editor, scratchpad, eraser, foldedNote, PAD_RECT } from '../screen.js';
import { dolphin, bubbles } from '../dolphin.js';
import { manBack, chairBack } from '../man.js';
import { faceShot } from '../closeup.js';
import { TYPED0 } from './s1_room.js';
import { CAPS } from '../text.js';
import { ease, seg, lerp, clamp } from '../util.js';
import { camAt, swimTo, talking, dolMouth, clockAt } from '../common.js';

const caps = [
  { a: 12, b: 56, ...CAPS.s6[0] },
  { a: 62, b: 86, ...CAPS.s6[1] },
  { a: 94, b: 152, ...CAPS.s6[2] },
  { a: 198, b: 216, ...CAPS.s6[3] },
  { a: 222, b: 282, ...CAPS.s6[4] },
  { a: 290, b: 322, ...CAPS.s6[5] },
  { a: 332, b: 404, ...CAPS.s6[6] },
];
const PAD0 = 96; // the pad arrives
export const HIDDEN = PAD0 + 51; // the one frame that shows what was really written
const ER0 = PAD0 + 52, ER1 = PAD0 + 90; // erasing
const STAMP = 170; // (pad time)

// where the eraser is while it scrubs
function eraserAt(f) {
  const e = seg(f, ER0, ER1);
  const x0 = SCR.x + PAD_RECT.u + 60, x1 = SCR.x + PAD_RECT.u + PAD_RECT.w - 30;
  const lineY = (k) => SCR.y + PAD_RECT.v + 78 + k * 28;
  const scrub = (Math.sin(f * 1.7) * 0.5 + 0.5) * 3;
  return { x: lerp(x0, x1, e), y: lineY(scrub) - 2, r: Math.sin(f * 1.7) * 0.15, e };
}

function dol(f) {
  if (f < 90) return { x: SCR.x + 330 + Math.sin(f * 0.1) * 6, y: SCR.y + 150 + Math.sin(f * 0.16) * 4, s: 0.62, dir: -1, r: 0.02 };
  if (f < ER0 - 6) return { ...swimTo(f, 96, 112, [330, 150], [470, 70], 20), s: 0.5 };
  if (f < ER1) {
    const E = eraserAt(Math.max(f, ER0));
    return { x: E.x - 62, y: E.y - 4, s: 0.5, dir: 1, r: E.r * 0.3 };
  }
  if (f < 190) return { ...swimTo(f, ER1, ER1 + 10, [PAD_RECT.u + PAD_RECT.w - 90, 170], [500, 150], 20), s: 0.5, dir: 1 };
  if (f < 326) return { x: SCR.x + 500 + Math.sin(f * 0.1) * 8, y: SCR.y + 120 + Math.sin(f * 0.14) * 6, s: 0.5, dir: -1, r: Math.sin(f * 0.1) * 0.05 };
  const roll = f >= 334 && f < 346 ? ((f - 334) / 12) * Math.PI * 2 : 0;
  return { x: SCR.x + 330 + Math.sin(f * 0.08) * 30, y: SCR.y + 150 + Math.sin(f * 0.13) * 14, s: 0.64, dir: Math.cos(f * 0.08) >= 0 ? 1 : -1, r: Math.sin(f * 0.13) * 0.08, roll };
}

export default {
  id: 's6',
  len: 412,
  mood: 'confess',
  caps,
  warm: [10, 70, 120, HIDDEN, 170, 206, 250, 300, 360],
  draw(f) {
    const time = clockAt(2, 2, f);
    const face = f >= 58 && f < 90 ? 'skeptic' : f >= 194 && f < 220 ? 'confused' : f >= 286 && f < 326 ? 'suspicious' : null;
    if (face) {
      faceShot({ face, talk: talking(caps, f, 'man'), blink: f === 312, reflect: { x: 0.6, y: 0.4 }, tilt: face === 'confused' ? 0.05 : 0 });
      return;
    }
    const d = dol(f);
    const dTalk = talking(caps, f, 'dol');
    const t = f - PAD0;
    let cam;
    if (f < 58) cam = camAt(f, [[0, { x: 1560, y: 400, z: 2.0 }], [58, { x: 1560, y: 400, z: 2.1 }]]);
    else if (f < 326) cam = camAt(f, [[90, SHOT.screen], [194, { ...SHOT.screen, x: 1500, z: 1.72 }], [220, { ...SHOT.screen, x: 1500, z: 1.72 }], [286, { ...SHOT.screen, x: 1500, z: 1.8 }]]);
    else cam = camAt(f, [[326, { x: 1560, y: 400, z: 2.1 }], [412, { x: 1560, y: 404, z: 2.2 }]]);
    const padOn = f >= PAD0 && f < 334;
    room({
      cam,
      time,
      mug: {},
      bg: () => steam('mug', MUG.x, MUG.y - 58, f, 0.6, 1),
      screen: (ctx) => {
        editor(ctx, { f, typed: TYPED0 + 96, reqs: 6, link: f >= 176 && f < 200 ? 1 : 0.4 });
        if (padOn) {
          const out = f >= 326 ? ease.in(seg(f, 326, 334)) : 0;
          ctx.save();
          ctx.translate(0, out * 400);
          scratchpad(ctx, t, {
            hidden: f === HIDDEN,
            erase: seg(f, ER0, ER1),
            tidy: Math.floor(clamp((t - 124) / 40) * 5.99),
            stamp: STAMP,
          });
          ctx.restore();
          if (f >= ER0 && f < ER1 + 4) {
            const E = eraserAt(Math.min(f, ER1));
            eraser(ctx, E.x, E.y, E.r);
          }
          // the fridge passes a folded note across from its panel
          if (f >= 176 && f < 200) {
            const p = ease.inOut(seg(f, 176, 190));
            foldedNote(ctx, lerp(SCR.x + 560, SCR.x + 470, p), lerp(SCR.y + 290, SCR.y + 196, p), -0.2 + p * 0.3, f > 192 ? 1 : 0);
          }
        }
        dolphin({ x: d.x, y: d.y, s: d.s, r: d.r, dir: d.dir, roll: d.roll || 0, pose: Math.floor(f / 2), mouth: dolMouth(dTalk, f), mode: 'box', seed: 1 });
        if (f >= 334 && f < 360) bubbles('roll', d.x, d.y - 20, f, { start: 334, life: 22, n: 6, s: 0.9 });
      },
      fg: () => {
        manBack({ head: { turn: 0.2, nod: -0.3 } });
        chairBack({});
      },
    });
  },
  sfx(f, A) {
    if (f === 0) { A.hum(0.3); }
    for (const c of caps) {
      if (c.who === 'dol' && f === c.a) A.whistle(0.6, c.a < 60 ? -1 : 1);
      if (c.who === 'dol' && f > c.a && talking(caps, f, 'dol') && f % 3 === 0) A.chatter(0.6);
    }
    if (f === PAD0) A.rustle(0.5, 0.8);
    if (f > PAD0 + 10 && f < ER0 && f % 3 === 0) A.key(0.25);
    if (f >= ER0 && f < ER1 && f % 2 === 0) A.rustle(0.12, 0.5);
    if (f === 176) A.fridgeVoice(0.4);
    if (f === 190) A.rustle(0.2, 0.5);
    if (f > PAD0 + 124 && f < PAD0 + 164 && f % 3 === 0) A.key(0.4);
    if (f === PAD0 + STAMP) A.stamp(1);
    if (f === 334) { A.crinkle(0.6, 0.7); A.chime(['E5', 'G#5', 'B5', 'E6'], 0.05, 0.06); }
  },
};
