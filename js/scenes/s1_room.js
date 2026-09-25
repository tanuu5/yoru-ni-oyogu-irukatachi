// Scene 1 — from the window across the room to the desk: the man writing,
// the dolphin idling in the corner of his screen.

import { room, SHOT } from '../room.js';
import { editor } from '../screen.js';
import { dolphin } from '../dolphin.js';
import { manBack, chairBack } from '../man.js';
import { CAPS } from '../text.js';
import { ease } from '../util.js';
import { camAt, homeSpot, clockAt, typingNow } from '../common.js';

const CAM = [[0, { ...SHOT.window, x: 530, z: 1.07 }], [26, { ...SHOT.window, x: 560, z: 1.05 }], [128, SHOT.desk], [210, { ...SHOT.desk, x: 1500, z: 1.05 }]];
export const TYPED0 = 150; // characters of the manuscript already on screen when the film starts

export function deskScreen(f, o = {}) {
  return (ctx) => {
    editor(ctx, { f, typed: o.typed ?? TYPED0, reqs: o.reqs ?? 5, reqNew: o.reqNew, link: o.link ?? 0.3, typing: o.typing, sidebar: o.sidebar, hidePage: o.hidePage, linkText: o.linkText });
    if (o.dolphin !== false) {
      const h = o.dolphinAt || homeSpot(f);
      dolphin({ x: h.x, y: h.y, s: o.ds ?? 0.42, r: h.r, dir: h.dir, pose: Math.floor(f / 2), mouth: o.mouth || 0, eye: o.eye || 'open', mode: 'box', seed: 1, ...(o.dol || {}) });
    }
    if (o.extra) o.extra(ctx);
  };
}

export default {
  id: 's1',
  len: 210,
  mood: 'room',
  caps: [
    { a: 14, b: 74, ...CAPS.s1[0] },
    { a: 110, b: 204, ...CAPS.s1[1] },
  ],
  warm: [0, 70, 130, 200],
  draw(f) {
    const cam = camAt(f, CAM, ease.inOut);
    const typing = f > 60;
    room({
      cam,
      time: clockAt(23, 41, f),
      screen: deskScreen(f, { typed: TYPED0 + Math.max(0, Math.floor((f - 60) * 0.4)), reqNew: 168, reqs: f >= 168 ? 6 : 5, typing }),
      fg: () => {
        manBack({ type: typing && typingNow(f, true), head: { tilt: Math.sin(f * 0.05) * 0.01, nod: typing ? 0.3 : 0 }, arm: f > 150 && f < 190 ? 'mouse' : 'keys' });
        chairBack({});
      },
    });
  },
  sfx(f, A) {
    if (f === 0) A.hum(0.35);
    if (f > 60 && typingNow(f, true)) A.typing(1, 0.8);
    if (f === 168) A.chime(['E6', 'B6'], 0.035, 0.08);
  },
};
