// closeup.js — the reverse shot: the man's face, lit by the monitor.
// Behind him, the other side of the room: a doorway to the hall, a print on the wall.
import { R, withCam, stillPiece, backdrop, lights, glow, bloomFlush } from './render.js';
import { cutShape, rectPts } from './cut.js';
import { manFace, lensGlow } from './man.js';
import { mix, hash } from './util.js';

let BG = null;
function build() {
  const o = { jag: 0.3, wander: 0.7, step: 14, corner: 0.5 };
  BG = {
    doorFrame: cutShape(rectPts(250, 820, 1300, 560), 1, o),
    doorHole: cutShape(rectPts(206, 790, 1300, 575), 2, o),
    print: cutShape(rectPts(170, 220, 300, 300), 3, o),
    printIn: cutShape(rectPts(130, 180, 300, 300), 4, o),
    shelf: cutShape(rectPts(260, 14, 330, 520), 5, o),
    lamp: cutShape([[500, 170], [560, 170], [590, 230], [470, 230]], 6, o),
    lampPole: cutShape(rectPts(8, 700, 530, 580), 7, o),
  };
}

// o: face, talk, blink, turn, tilt, reflect, dawn, monitor, z, cx, cy
export function faceShot(o = {}) {
  if (!BG) build();
  const { dawn = 0, monitor = 1, z = 1, cx = 800, cy = 450 } = o;
  withCam(cx, cy, z, () => {
    const ctx = R.ctx;
    backdrop('#7a7394', 'tate', 1.1, { texA: 0.3, tx: 30, ty: 20 });
    stillPiece('cu-door', BG.doorFrame, { color: '#5d5670', tex: 'plain', lift: 6 });
    stillPiece('cu-door-hole', BG.doorHole, { color: '#2a2230', tex: null, lift: 0, edge: 0 });
    stillPiece('cu-print', BG.print, { color: '#3a3642', tex: 'plain', lift: 8 });
    stillPiece('cu-print-in', BG.printIn, { color: '#c9b79a', tex: 'story', ts: 0.5, lift: 2 });
    stillPiece('cu-lamp-pole', BG.lampPole, { color: '#2e2c34', tex: null, lift: 6 });
    stillPiece('cu-lamp', BG.lamp, { color: '#cdbfa6', tex: 'plain', lift: 10 });
    manFace({ x: 800, y: 330, s: 1.02, ...o });
    const mon = monitor * (1 - dawn * 0.4);
    lights(mix('#2c2a42', '#6d6070', dawn), [
      { x: 800, y: 360, r: 660, color: [160, 192, 255], a: 0.9 * mon, core: 0.35 },
      { x: 812, y: 330, r: 300, color: [200, 220, 255], a: 0.42 * mon, core: 0.3 },
      { x: 800, y: 760, r: 520, color: [110, 140, 220], a: 0.3 * mon },
      { x: 180, y: 380, r: 520, color: [255, 90, 170], a: 0.34 * (1 - dawn) },
      { x: 150, y: 520, r: 400, color: [70, 210, 255], a: 0.18 * (1 - dawn) },
      { x: 1300, y: 600, r: 340, color: [255, 180, 110], a: 0.22 },
      { x: 300, y: 450, r: 700, color: [255, 200, 150], a: 0.55 * dawn },
    ]);
    // the hall light, far away, and window-neon out of focus at the left edge
    glow(1300, 520, 150, '255,190,120', 0.18);
    if (dawn < 1) {
      const na = 1 - dawn;
      for (let i = 0; i < 5; i++) {
        const on = hash('bk', i, Math.floor(R.frame / 6)) > 0.15;
        const col = ['255,90,170', '80,220,255', '255,176,72', '190,130,255', '255,90,170'][i];
        glow(40 + i * 26, 180 + i * 130, 70 + (i % 2) * 30, col, (on ? 0.22 : 0.12) * na);
      }
    }
    lensGlow();
    bloomFlush(0.8);
  });
}
