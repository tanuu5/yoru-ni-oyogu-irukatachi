// Scene 9 — dawn. The neon goes out; the dolphin sleeps in its corner; he keeps writing.
// A wink; then the title again, over the morning.
import { R } from '../render.js';
import { room, SHOT } from '../room.js';
import { dolphin, bubbles } from '../dolphin.js';
import { manBack, chairBack } from '../man.js';
import { deskScreen, TYPED0 } from './s1_room.js';
import { hangingTitle } from './s0_title.js';
import { label } from '../label.js';
import { CAPS, TITLE } from '../text.js';
import { F } from '../fonts.js';
import { ease, seg, lerp } from '../util.js';
import { camAt, homeSpot, clockAt, typingNow } from '../common.js';

const caps = [
  { a: 18, b: 72, ...CAPS.s9[0] },
  { a: 132, b: 178, ...CAPS.s9[1] },
];
const TITLE_AT = 222;

export default {
  id: 's9',
  len: 330,
  mood: 'dawn',
  caps,
  warm: [10, 60, 100, 150, 200, 250, 320],
  post: { vignette: 0.9 },
  draw(f) {
    const dawn = lerp(0.12, 1, ease.inOut(seg(f, 0, 200)));
    const time = clockAt(5, 2, f * 4);
    const common = {
      dawn,
      neon: 1 - seg(f, 8, 70),
      sun: ease.out(seg(f, 30, 300)),
      time,
      mug: {},
    };
    const sleeping = (ctxF) => {
      const h = homeSpot(f, { amp: 0.25 });
      const wink = f >= 196 && f < 210;
      return {
        dolphinAt: { ...h, dir: 1 },
        ds: 0.46,
        eye: wink ? 'open' : 'closed',
        dol: { pose: 2 },
        extra: () => {
          if (!wink) bubbles('zz' + Math.floor(f / 30), h.x + 34, h.y - 14, f % 30, { life: 28, n: 2, s: 0.8, rise: 50 });
          else bubbles('wink', h.x + 40, h.y - 16, f, { start: 200, life: 20, n: 1, s: 1.3, rise: 70 });
        },
      };
    };
    if (f < 80) {
      room({ ...common, cam: camAt(f, [[0, { ...SHOT.window, x: 540, z: 1.04 }], [80, { ...SHOT.window, x: 560, z: 1.0 }]]), screen: deskScreen(f, { typed: TYPED0 + 190, reqs: 7, ...sleeping() }) });
      return;
    }
    if (f < 128 || (f >= 180 && f < 214)) {
      const cam = f < 128 ? { x: 1730, y: 380, z: 2.4 } : camAt(f, [[180, { x: 1752, y: 388, z: 3.1 }], [214, { x: 1752, y: 388, z: 3.3 }]]);
      room({ ...common, cam, screen: deskScreen(f, { typed: TYPED0 + 190, reqs: 7, ...sleeping() }) });
      return;
    }
    if (f < 180) {
      room({
        ...common,
        cam: camAt(f, [[128, { ...SHOT.desk, x: 1300, z: 0.86 }], [180, { ...SHOT.desk, x: 1320, z: 0.88 }]]),
        screen: deskScreen(f, { typed: TYPED0 + 190 + Math.floor((f - 128) / 3), reqs: 7, ...sleeping() }),
        fg: () => {
          manBack({ day: dawn, type: typingNow(f, true), head: { nod: 0.3, tilt: 0.02 }, monitor: 0.8 });
          chairBack({ day: dawn });
        },
      });
      return;
    }
    // the title, lowered on threads in front of the morning
    const cam = camAt(f, [[214, { ...SHOT.window, x: 520, z: 1.0 }], [330, { ...SHOT.window, x: 520, z: 1.04 }]]);
    room({
      ...common,
      cam,
      screen: deskScreen(f, { typed: TYPED0 + 210, reqs: 7, ...sleeping() }),
      front: () => {
        hangingTitle(f, TITLE_AT, { cx: 520, cy: 300, top: cam.y - 450 / cam.z - 10, dark: true });
        const ja = R.lang !== 'en';
        label({
          x: 520, y: 600, t: f - (TITLE_AT + 46), cps: 1.8, r: 0.01,
          lines: [
            { text: TITLE.en, font: `italic 400 32px ${F.garamond}`, lh: 42, color: '#2b221c' },
            ja ? { text: '原作　たぬ「夜に泳ぐイルカたち」', font: `600 20px ${F.hand}`, lh: 32, color: '#5a4a3e' } : { text: 'from a short story by Tanu', font: `italic 400 21px ${F.garamond}`, lh: 30, color: '#5a4a3e' },
            { text: 'made one frame at a time by Claude', font: `italic 400 19px ${F.garamond}`, lh: 28, color: '#6a5a4e' },
          ],
        });
      },
    });
  },
  sfx(f, A) {
    if (f === 0) { A.hum(0.2); }
    if (f > 8 && f < 70 && f % 7 === 3) A.click();
    if (f > 128 && f < 180 && typingNow(f, true)) A.typing(1, 0.6);
    if (f === 200) { A.bubble(0.8); A.chime(['A5', 'E6'], 0.05, 0.1); }
    for (let i = 0; i < 9; i++) if (f === TITLE_AT + i * 4 + 5) { A.tap(0.6); A.bell(['D5', 'F#5', 'A5', 'D6', 'A5', 'F#5', 'E5', 'D5', 'A5'][i], 0.07); }
    if (f === TITLE_AT + 46) A.rustle(0.3, 0.5);
    if (f === 300) A.chime(['D5', 'F#5', 'A5', 'D6'], 0.05, 0.16);
  },
};
