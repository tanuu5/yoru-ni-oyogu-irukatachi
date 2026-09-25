// common.js — small helpers the scenes share.
import { R, speaking, setCaptionIcons } from './render.js';
import { ease, seg, lerp, hash, hs, clamp } from './util.js';
import { dolphinIcon } from './dolphin.js';
import { SCR } from './room.js';

// Camera keyframes: [[frame, {x,y,z}], ...] eased between (on the frame grid).
export function camAt(f, keys, e = ease.inOut) {
  if (f <= keys[0][0]) return { ...keys[0][1] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, a] = keys[i], [f1, b] = keys[i + 1];
    if (f < f1) {
      if (b.cut) return { ...a };
      const p = e(seg(f, f0, f1));
      return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), p)) };
    }
  }
  return { ...keys[keys.length - 1][1] };
}

// Which shot is on at local frame f: [[from, value], ...]
export function pickAt(f, list) {
  let v = list[0][1];
  for (const [f0, val] of list) if (f >= f0) v = val;
  return v;
}

// The dolphin idling in the screen's right-hand corner.
export function homeSpot(f, o = {}) {
  const { u = 540, v = 150, amp = 1 } = o;
  return {
    x: SCR.x + u + Math.sin(f * 0.11) * 16 * amp,
    y: SCR.y + v + Math.sin(f * 0.17 + 1) * 9 * amp,
    r: Math.sin(f * 0.11 + 1.4) * 0.08 * amp,
    dir: Math.cos(f * 0.11) >= 0 ? 1 : -1,
  };
}

// A swim from a to b (screen-local coordinates), with a gentle arc.
export function swimTo(f, f0, f1, a, b, arc = 30) {
  const p = ease.inOut(clamp(seg(f, f0, f1) + hs('sw', f) * 0.01));
  const x = lerp(a[0], b[0], p), y = lerp(a[1], b[1], p) - Math.sin(p * Math.PI) * arc;
  return { x: SCR.x + x, y: SCR.y + y, dir: b[0] >= a[0] ? 1 : -1, r: (b[1] - a[1]) * 0.002 * Math.sin(p * Math.PI) };
}

// Is this speaker's line being typed right now? (mouths move while it is)
export const talking = (caps, f, who) => speaking(caps, f, who);

// Mouth for a talking dolphin: 0 closed .. 2 open, on twos.
export const dolMouth = (on, f) => (on ? [2, 1, 0, 2, 1][Math.floor(f / 2) % 5] : 0);

// Clock time for a scene: start hh:mm plus frames at a given speed (seconds per frame).
export function clockAt(h, m, f, speed = 1 / 12) {
  const total = h * 3600 + m * 60 + f * speed;
  return { h: Math.floor(total / 3600) % 24, m: Math.floor(total / 60) % 60, s: total % 60 };
}

// Keys: roughly how many key presses in this frame while he types.
export const typingNow = (f, on) => on && hash('ty', f) > 0.28;

// Caption icons: a pen nib (the man), a dolphin, the fridge's green light.
setCaptionIcons({
  pen(c, x, y) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.7);
    c.fillStyle = '#2b2f4a';
    c.beginPath();
    c.moveTo(-3, -14); c.lineTo(3, -14); c.lineTo(3, 6); c.lineTo(0, 13); c.lineTo(-3, 6);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(-0.6, 0, 1.2, 8);
    c.restore();
  },
  dol(c, x, y, f) { dolphinIcon(c, x + 4, y + 2, f); },
  fri(c, x, y) {
    c.save();
    c.translate(x, y);
    c.fillStyle = '#b9bfb8';
    c.fillRect(-9, -15, 18, 30);
    c.fillStyle = '#8b918a';
    c.fillRect(-9, -3, 18, 1.5);
    c.fillRect(4, -12, 1.5, 7);
    c.fillStyle = '#32d676';
    c.beginPath();
    c.arc(-3, -9, 2.4, 0, Math.PI * 2);
    c.fill();
    c.restore();
  },
});

export { R };
