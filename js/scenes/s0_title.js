// Scene 0 — the window at night. Neon comes on; the title is lowered on threads;
// a cellophane dolphin swims through it.
import { R, sprite, letterSprite, thread } from '../render.js';
import { room, SHOT } from '../room.js';
import { dolphin, dolphinLight, dolphinBloom, bubbles } from '../dolphin.js';
import { label } from '../label.js';
import { TITLE } from '../text.js';
import { F } from '../fonts.js';
import { ease, seg, lerp, hs, boil, hash } from '../util.js';
import { camAt } from '../common.js';

const LS = {};
function letters(dark = false) {
  const k = dark ? 'dark' : 'light';
  return (LS[k] ||= [...TITLE.ja].map((ch, i) =>
    letterSprite(ch, { font: `900 118px ${F.mincho}`, color: dark ? '#343a62' : '#d9d0e2', tex: i % 2 ? 'tate' : 'book', seed: 20 + i, ts: 0.72, grow: 3 })));
}
// two rows: 夜に泳ぐ / イルカたち
export function titleLayout(cx, cy, scale = 1) {
  const sp = letters(false);
  const rows = [[0, 1, 2, 3], [4, 5, 6, 7, 8]];
  const out = [];
  rows.forEach((ids, ri) => {
    const widths = ids.map((i) => sp[i].w * 0.78 * scale);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = cx - total / 2 + (ri === 0 ? -40 : 40) * scale;
    ids.forEach((i, k) => {
      out[i] = { x: x + widths[k] / 2, y: cy + (ri === 0 ? -70 : 78) * scale + hs('ty', i) * 8 * scale };
      x += widths[k];
    });
  });
  return out;
}
// A letter hung on a thread: dropped in, bounces on the thread, settles and sways.
export function hangingTitle(f, start, o = {}) {
  const { cx = 520, cy = 330, scale = 1, top = -40, alpha = 1, dark = false } = o;
  const sp = letters(dark);
  const pos = titleLayout(cx, cy, scale);
  sp.forEach((s, i) => {
    const t = f - start - i * 4;
    if (t < 0) return;
    const { x, y } = pos[i];
    const fall = t < 5 ? ease.in(t / 5) : 1;
    const bounce = t >= 5 ? Math.exp(-(t - 5) * 0.22) * Math.cos((t - 5) * 0.9) * 18 * scale : 0;
    const yy = lerp(top - 60, y, fall) - bounce;
    const sway = Math.sin((f + i * 7) * 0.12) * 0.035 + (t < 20 ? hs('sw', i, t) * 0.04 : 0);
    const b = t < 8 ? boil('tl' + i, f, 1.2) : [0, 0, 0];
    const topY = yy - s.h * 0.34 * scale;
    thread(x + b[0], top, x + b[0] + sway * 20, topY, { alpha });
    sprite(s, { x: x + b[0], y: yy + b[1], r: sway + b[2], s: scale * 0.92, lift: 18, alpha });
  });
}

const CAM = [[0, { ...SHOT.window, z: 1.0 }], [108, { ...SHOT.window, x: 530, z: 1.07 }]];

export default {
  id: 's0',
  len: 108,
  mood: 'title',
  caps: [],
  warm: [2, 60, 100],
  draw(f) {
    const cam = camAt(f, CAM, ease.sine);
    const sw = seg(f, 62, 100);
    const swimming = f >= 62 && f <= 100;
    const dp = { x: lerp(1040, -60, ease.inOut(sw)), y: 360 - Math.sin(sw * Math.PI) * 120, s: 0.9 };
    room({
      cam,
      neonStart: 4,
      time: { h: 23, m: 38, s: f / 12 },
      monitor: 1,
      lightsExtra: swimming ? [dolphinLight(dp.x, dp.y, dp.s)] : [],
      front: () => {
        hangingTitle(f, 18, { cx: 520, cy: 316, top: cam.y - 450 / cam.z - 10 });
        if (swimming) {
          dolphin({ ...dp, pose: Math.floor(f / 2), mode: 'glow', dir: -1, r: -Math.cos(sw * Math.PI) * 0.35, seed: 3 });
          dolphinBloom(dp.x, dp.y, dp.s);
          bubbles('t0', dp.x + 60, dp.y, f, { mode: 'glow', start: 64, life: 30, n: 9, s: 1.2 });
        }
        const ja = R.lang !== 'en';
        label({
          x: 520, y: 600, t: f - 74, cps: 1.6, r: -0.012,
          lines: [
            { text: TITLE.en, font: `italic 400 34px ${F.garamond}`, lh: 44, color: '#2b221c' },
            ja ? { text: TITLE.tagJa, font: `600 22px ${F.hand}`, lh: 34, color: '#5a4a3e' } : { text: TITLE.tagEn, font: `italic 400 22px ${F.garamond}`, lh: 32, color: '#5a4a3e' },
          ],
        });
      },
    });
  },
  sfx(f, A) {
    if (f === 0) A.hum(0.4);
    if (f >= 6 && f < 44 && (f - 7) % 3 === 0 && hash('nsfx', f) > 0.3) A.neon(0.7);
    for (let i = 0; i < 9; i++) if (f === 18 + i * 4 + 5) { A.tap(0.7); A.bell(['A4', 'C5', 'E5', 'G5', 'E5', 'D5', 'C5', 'A4', 'E5'][i], 0.08); }
    if (f === 64) A.whistle(0.9, 1);
    if (f > 64 && f < 96 && f % 5 === 0) A.bubble(0.6);
    if (f === 74) A.rustle(0.25, 0.5);
  },
};
