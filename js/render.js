// render.js — the camera, the lights and the hands that place paper (and cellophane).
import { W, H, hash, hs, clamp, canvas, boil, strHash } from './util.js';
import { TEX, TS, GRAIN, VIGNETTE, CRINKLE } from './textures.js';
import { F } from './fonts.js';

export const R = {
  canvas: null,
  ctx: null,
  k: 1, // device pixels per virtual unit (no camera)
  px: 1, // device pixels per world unit under the current camera
  lang: 'ja', // caption language: ja | en | both
  reduced: false,
  frame: 0,
  cam: { x: W / 2, y: H / 2, z: 1 },
  pats: new Map(),
  blooms: [],
  bloomClip: null,
  dbg: {},
  stats: { bakes: 0 },
};
export const vlang = () => (R.lang === 'en' ? 'en' : 'ja');

export function setup(cv) {
  R.canvas = cv;
  R.ctx = cv.getContext('2d', { alpha: false });
}

export function resize(cssW, cssH, dpr) {
  const bw = Math.min(Math.round(cssW * dpr), 1920);
  const bh = Math.round((bw * H) / W);
  if (R.canvas.width !== bw || R.canvas.height !== bh) {
    R.canvas.width = bw;
    R.canvas.height = bh;
  }
  R.k = bw / W;
}

const PATS = new WeakMap();
export function pat(name, ctx = R.ctx) {
  let m = PATS.get(ctx);
  if (!m) { m = new Map(); PATS.set(ctx, m); }
  let p = m.get(name);
  if (!p) {
    const src = name === 'crinkle' ? CRINKLE : TEX[name];
    p = ctx.createPattern(src, 'repeat');
    m.set(name, p);
  }
  return p;
}
export function setPat(p, tx, ty, ts, tr) {
  try {
    let m = new DOMMatrix().translateSelf(tx, ty);
    if (tr) m = m.rotateSelf(tr);
    if (ts !== 1) m = m.scaleSelf(ts, ts);
    p.setTransform(m);
  } catch (e) { /* very old browsers: texture simply stays unaligned */ }
}

// ---------------------------------------------------------------------------
// Frame & camera

export function beginFrame(g) {
  const ctx = R.ctx;
  R.frame = g;
  R.blooms.length = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#08070b';
  ctx.fillRect(0, 0, R.canvas.width, R.canvas.height);
  // Gate weave: the whole picture shifts by a hair each frame.
  const wx = R.reduced ? 0 : hs(g, 'weave-x') * 0.55;
  const wy = R.reduced ? 0 : hs(g, 'weave-y') * 0.55;
  ctx.setTransform(R.k, 0, 0, R.k, wx * R.k, wy * R.k);
  R.px = R.k;
}

// Camera looks at world point (cx, cy) with zoom z. Everything drawn inside fn
// is in world units.
export function withCam(cx, cy, z, fn) {
  const ctx = R.ctx;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);
  const px = R.px, cam = R.cam;
  R.px = px * z;
  R.cam = { x: cx, y: cy, z };
  try { fn(); } finally {
    R.px = px;
    R.cam = cam;
    ctx.restore();
  }
}

// Multiplane: a layer nearer (par > 1) or farther (par < 1) than the set
// slides faster or slower as the camera pans. The set lines up at `anchor`.
export const ANCHOR = { x: 1480, y: 470 };
export function planeShift(par) {
  return [(R.cam.x - ANCHOR.x) * (1 - par), (R.cam.y - ANCHOR.y) * (1 - par) * 0.6];
}
export function withPlane(par, fn) {
  const ctx = R.ctx;
  const [dx, dy] = planeShift(par);
  ctx.save();
  ctx.translate(dx, dy);
  try { fn(dx, dy); } finally { ctx.restore(); }
}

// Nested local transform that also scales shadows (for scenes shown inside scenes).
export function withLocal(x, y, s, fn) {
  const ctx = R.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const px = R.px;
  R.px = px * s;
  try { fn(); } finally {
    R.px = px;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Shadows — pieces stand a little off the wall behind them; the room's light
// comes from the front and a little above, so shadows fall down and right.

const LX = 0.45, LY = 0.8;

function shadow(ctx, lift, strength = 1) {
  const px = R.px;
  ctx.shadowColor = `rgba(8,6,14,${clamp(0.55 - lift * 0.003, 0.22, 0.55) * strength})`;
  ctx.shadowBlur = Math.min(90, (1.4 + lift * 0.85) * px);
  ctx.shadowOffsetX = Math.min(200, lift * LX * px);
  ctx.shadowOffsetY = Math.min(260, lift * LY * px);
}
function contact(ctx, strength = 1) {
  const px = R.px;
  ctx.shadowColor = `rgba(6,4,10,${0.36 * strength})`;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0.7 * px;
  ctx.shadowOffsetY = 1.1 * px;
}
function noShadow(ctx) {
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// ---------------------------------------------------------------------------
// A paper piece.
//   sh: { path, b } from cut.js (local coordinates)
//   o:  x, y, r, s, sx, sy, lift, color, tex, ts, tx, ty, tr, alpha, texA,
//       edge (highlight strength), shade (0..1 darkening) + shadeColor,
//       rim: { color: 'r,g,b', a, w, ang } light from behind catching the edge,
//       print(ctx) callback

export function piece(sh, o = {}) {
  const ctx = R.ctx;
  const {
    x = 0, y = 0, r = 0, s = 1, sx = 1, sy = 1, lift = 2, color = '#efe6d3', tex = 'plain',
    ts = 1, tx = 0, ty = 0, tr = 0, alpha = 1, edge = 0.3, shade = 0, shadeColor = '52,44,70', print = null,
    shadowK = 1, texA = 1, rim = null,
  } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  if (s !== 1 || sx !== 1 || sy !== 1) ctx.scale(s * sx, s * sy);
  if (alpha < 1) ctx.globalAlpha = alpha;

  ctx.fillStyle = color;
  if (lift > 0 && shadowK > 0 && !R.dbg.noShadow) {
    if (lift < 30) { contact(ctx, shadowK); ctx.fill(sh.path); }
    shadow(ctx, lift, shadowK);
  }
  ctx.fill(sh.path);
  noShadow(ctx);

  if (tex && !R.dbg.noTex) {
    const p = pat(tex);
    setPat(p, tx, ty, ts, tr);
    ctx.globalCompositeOperation = 'multiply';
    if (texA < 1) ctx.globalAlpha = alpha * texA;
    ctx.fillStyle = p;
    ctx.fill(sh.path);
    ctx.globalAlpha = alpha;
  }
  if (shade > 0) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(${shadeColor},${shade})`;
    ctx.fill(sh.path);
  }
  ctx.globalCompositeOperation = 'source-over';
  if (print) {
    ctx.save();
    ctx.clip(sh.path);
    print(ctx);
    ctx.restore();
  }
  if (edge > 0 && !R.dbg.noEdge) {
    // Paper thickness catching the light on the upper-left edges.
    ctx.save();
    ctx.clip(sh.path);
    const sc = Math.max(0.2, s * Math.max(Math.abs(sx), Math.abs(sy)));
    ctx.translate(0.9 / sc, 1.2 / sc);
    ctx.lineWidth = 2.2 / sc;
    ctx.strokeStyle = `rgba(255,251,240,${edge})`;
    ctx.stroke(sh.path);
    ctx.restore();
  }
  if (rim && sh.b) for (const rr of [].concat(rim)) if (rr) rimLight(ctx, sh, rr, s * Math.max(Math.abs(sx), Math.abs(sy)));
  ctx.restore();
}

// Light from behind a piece: a bright band just inside its outline, strongest
// on the side the light comes from (ang: direction towards the light, radians).
function rimLight(ctx, sh, rim, sc) {
  const { color = '170,205,255', a = 0.7, w = 7, ang = -Math.PI / 2, spread = 0.9 } = rim;
  const b = sh.b;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const L = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2;
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const g = ctx.createLinearGradient(cx - ux * L, cy - uy * L, cx + ux * L, cy + uy * L);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(clamp(1 - spread, 0, 0.98), `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${a})`);
  ctx.save();
  ctx.clip(sh.path);
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = g;
  ctx.lineWidth = (w * 2) / Math.max(0.2, sc);
  ctx.stroke(sh.path);
  ctx.restore();
}

// Print text onto a piece (inside a print callback). Ink multiplies with paper.
export function ink(ctx, text, x, y, font, color = 'rgba(40,32,28,0.92)', align = 'center') {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Cellophane. The AIs in this film are cut from it: film you can see light through.
//   mode 'box':  lying on a lit screen (tints the light passing through it)
//   mode 'glow': floating in the dark, lit from within
//   o: x, y, r, s, sx, sy, color, alpha, crinkle, edge, tx, ty, print(ctx)

function rgbOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function cello(sh, o = {}) {
  const ctx = R.ctx;
  const {
    x = 0, y = 0, r = 0, s = 1, sx = 1, sy = 1, color = '#58b8d8', alpha = 1, mode = 'box',
    crinkle = 0.55, edge = 0.55, tx = 0, ty = 0, print = null, glowA = 0.62,
  } = o;
  if (alpha <= 0) return;
  const [cr, cg, cb] = rgbOf(color);
  ctx.save();
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  if (s !== 1 || sx !== 1 || sy !== 1) ctx.scale(s * sx, s * sy);
  const sc = Math.max(0.15, s * Math.max(Math.abs(sx), Math.abs(sy)));
  ctx.globalAlpha = alpha;
  if (mode === 'box') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    ctx.fill(sh.path);
  } else {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${glowA})`;
    ctx.fill(sh.path);
  }
  if (crinkle > 0 && CRINKLE && !R.dbg.noTex) {
    const p = pat('crinkle');
    setPat(p, tx, ty, 0.9 / sc, 0);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = alpha * crinkle;
    ctx.fillStyle = p;
    ctx.fill(sh.path);
    ctx.globalAlpha = alpha;
  }
  if (edge > 0) {
    // the cut edge of film: a dark line with a bright sliver beside it
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = mode === 'box' ? 'multiply' : 'source-over';
    ctx.strokeStyle = `rgba(${cr * 0.35 | 0},${cg * 0.35 | 0},${cb * 0.4 | 0},${0.55 * edge})`;
    ctx.lineWidth = 1.7 / sc;
    ctx.stroke(sh.path);
    ctx.save();
    ctx.clip(sh.path);
    ctx.translate(-1.1 / sc, -1.4 / sc);
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * edge})`;
    ctx.lineWidth = 1.5 / sc;
    ctx.stroke(sh.path);
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  if (print) {
    ctx.save();
    print(ctx, sc);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Light. A small light map is built each frame (ambient + additive lights, in
// world coordinates) and multiplied over the picture: paper only shows where
// light reaches it. Self-lit things (screen, neon, cellophane) are drawn after.

let LM = null;
const LMDIV = 4;
export function lights(ambient, list = []) {
  if (R.dbg.noLight) return;
  const ctx = R.ctx;
  const w = Math.ceil(R.canvas.width / LMDIV), h = Math.ceil(R.canvas.height / LMDIV);
  if (!LM) LM = canvas(w, h);
  if (LM.width !== w || LM.height !== h) { LM.width = w; LM.height = h; }
  const g = LM.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.fillStyle = ambient;
  g.fillRect(0, 0, w, h);
  const m = ctx.getTransform();
  g.setTransform(m.a / LMDIV, m.b / LMDIV, m.c / LMDIV, m.d / LMDIV, m.e / LMDIV, m.f / LMDIV);
  g.globalCompositeOperation = 'lighter';
  for (const L of list) {
    if (!L || (L.a ?? 1) <= 0.002) continue;
    const [r, gg, b] = L.color;
    const a = L.a ?? 1;
    if (L.type === 'rect' || L.type === 'poly') {
      g.save();
      g.fillStyle = `rgba(${r},${gg},${b},${a})`;
      g.shadowColor = `rgba(${r},${gg},${b},${a})`;
      g.shadowBlur = (L.blur || 40) * (R.px / LMDIV);
      g.shadowOffsetX = 0;
      g.shadowOffsetY = 0;
      g.beginPath();
      if (L.type === 'rect') g.rect(L.x, L.y, L.w, L.h);
      else L.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.fill();
      g.restore();
      continue;
    }
    const gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
    const k = L.core ?? 0.35;
    gr.addColorStop(0, `rgba(${r},${gg},${b},${a})`);
    gr.addColorStop(k, `rgba(${r},${gg},${b},${a * 0.6})`);
    gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr;
    if (L.sy && L.sy !== 1) {
      g.save();
      g.translate(L.x, L.y);
      g.scale(1, L.sy);
      g.translate(-L.x, -L.y);
      g.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      g.restore();
    } else g.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(LM, 0, 0, R.canvas.width, R.canvas.height);
  ctx.restore();
}

// Glow of something self-lit (window, LED) drawn after the light pass.
const GLOWS = new Map();
function halo(color) {
  let c = GLOWS.get(color);
  if (!c) {
    c = canvas(96, 96);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, `rgba(${color},1)`);
    gr.addColorStop(0.35, `rgba(${color},0.35)`);
    gr.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 96, 96);
    GLOWS.set(color, c);
  }
  return c;
}
export function glow(x, y, r, color = '255,196,110', a = 0.5, ctx = R.ctx) {
  const prevOp = ctx.globalCompositeOperation, prevA = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, a * 0.75);
  ctx.drawImage(halo(color), x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = prevOp;
  ctx.globalAlpha = prevA;
}

// Bloom: bright things are drawn again into two tiny canvases, which are
// stretched back over the picture — the blur comes free from the enlargement.
// bloom(fn, k): fn(g) draws the bright shapes in world units.
// While R.bloomClip is set ({ rects, m }), glows stay inside those rects (the window panes).
export function bloom(fn, k = 1) {
  R.blooms.push({ fn, k, m: R.ctx.getTransform(), clip: R.bloomClip || null });
}
const BL = [];
export function bloomFlush(strength = 1) {
  if (!R.blooms.length || strength <= 0 || R.dbg.noBloom) { R.blooms.length = 0; return; }
  const ctx = R.ctx;
  for (const [i, div, a] of [[0, 6, 0.5], [1, 20, 0.75]]) {
    let c = BL[i];
    if (!c) c = BL[i] = document.createElement('canvas');
    const w = Math.ceil(R.canvas.width / div), h = Math.ceil(R.canvas.height / div);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, w, h);
    for (const b of R.blooms) {
      const m = b.m;
      g.save();
      if (b.clip) {
        const cm = b.clip.m;
        g.setTransform(cm.a / div, cm.b / div, cm.c / div, cm.d / div, cm.e / div, cm.f / div);
        g.beginPath();
        for (const [x, y, w, h] of b.clip.rects) g.rect(x, y, w, h);
        g.clip();
      }
      g.setTransform(m.a / div, m.b / div, m.c / div, m.d / div, m.e / div, m.f / div);
      g.globalAlpha = Math.min(1, b.k);
      try { b.fn(g); } catch (e) { console.error(e); }
      g.restore();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, a * 0.55 * strength);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, R.canvas.width, R.canvas.height);
    ctx.restore();
  }
  R.blooms.length = 0;
}

// ---------------------------------------------------------------------------
// Sprites: pre-cut pieces that are too fussy to cut every frame (letters).

export function letterSprite(ch, o = {}) {
  const { font = `900 150px ${F.mincho}`, color = '#efe3c8', tex = 'tate', ts = 0.7, seed = 1, grow = 2.5 } = o;
  const m = canvas(4, 4).getContext('2d');
  m.font = font;
  const met = m.measureText(ch);
  const size = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
  const pad = Math.ceil(size * 0.12);
  const w = Math.ceil(met.width + pad * 2), h = Math.ceil(size * 1.3 + pad * 2);
  const SS = 2;
  const mask = canvas(w * SS, h * SS), mg = mask.getContext('2d');
  mg.scale(SS, SS);
  mg.font = font;
  mg.textAlign = 'center';
  mg.textBaseline = 'middle';
  mg.fillStyle = '#000';
  mg.strokeStyle = '#000';
  mg.lineJoin = 'round';
  mg.lineWidth = grow;
  mg.fillText(ch, w / 2, h / 2 + size * 0.04);
  mg.strokeText(ch, w / 2, h / 2 + size * 0.04);
  return { img: cutFromMask(mask, color, tex, w, h, SS, seed, ts), w, h };
}

// Colour + texture inside a mask, plus a light rim on the upper-left edges.
export function cutFromMask(mask, color, tex, w, h, SS, seed, ts) {
  const c = canvas(w * SS, h * SS), g = c.getContext('2d');
  g.save();
  g.scale(SS, SS);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  if (tex) {
    const p = g.createPattern(TEX[tex], 'repeat');
    setPat(p, -hash(seed, 1) * TS, -hash(seed, 2) * TS, ts, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = p;
    g.fillRect(0, 0, w, h);
  }
  g.restore();
  const rim = canvas(w * SS, h * SS), rg = rim.getContext('2d');
  rg.drawImage(mask, 0, 0);
  rg.globalCompositeOperation = 'destination-out';
  rg.drawImage(mask, 1.6 * SS, 2.2 * SS);
  rg.globalCompositeOperation = 'source-in';
  rg.fillStyle = 'rgba(255,250,238,0.55)';
  rg.fillRect(0, 0, w * SS, h * SS);
  g.drawImage(rim, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mask, 0, 0);
  return c;
}

export function sprite(sp, o = {}) {
  const ctx = R.ctx;
  const { x = 0, y = 0, r = 0, s = 1, lift = 3, alpha = 1 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  if (s !== 1) ctx.scale(s, s);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (lift > 0) {
    if (lift < 30) { contact(ctx); ctx.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h); }
    shadow(ctx, lift);
  }
  ctx.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
  noShadow(ctx);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The paper that stays put. A still piece is cut, printed and shadowed once,
// kept as an image, and simply set back down on later frames — which is also
// how a stop-motion set works. Only the pieces being moved are re-cut.

const SPR = new Map();
let sprPx = 0;
const SPR_BUDGET = 40e6;
export const REGION = [-700, -500, 3800, 1500]; // everything the camera can ever see

export const spriteStats = () => ({ n: SPR.size, px: sprPx });
function evict() {
  if (sprPx <= SPR_BUDGET) return;
  const list = [...SPR.entries()].sort((a, b) => a[1].used - b[1].used);
  for (const [k, sp] of list) {
    if (sprPx <= SPR_BUDGET * 0.8) break;
    SPR.delete(k);
    sprPx -= sp.px;
  }
}

function bake(bounds, fn, q) {
  const x0 = Math.max(bounds[0], REGION[0]), y0 = Math.max(bounds[1], REGION[1]);
  const x1 = Math.min(bounds[2], REGION[2]), y1 = Math.min(bounds[3], REGION[3]);
  if (x1 <= x0 || y1 <= y0) return { empty: true, px: 0, q, used: 0 };
  q = Math.min(q, 4096 / (x1 - x0), 4096 / (y1 - y0));
  const cw = Math.ceil((x1 - x0) * q), ch = Math.ceil((y1 - y0) * q);
  const cv = canvas(cw, ch), g = cv.getContext('2d');
  g.setTransform(q, 0, 0, q, -x0 * q, -y0 * q);
  const sc = R.ctx, sp = R.px;
  R.ctx = g;
  R.px = q;
  try { fn(); } finally { R.ctx = sc; R.px = sp; }
  R.stats.bakes++;
  return { img: cv, x0, y0, w: cw / q, h: ch / q, q, px: cw * ch, used: 0 };
}

// Draw whatever fn() draws (world coordinates, inside bounds) from a cached image.
export function layer(key, bounds, fn, o = {}) {
  if (R.dbg.noCache) { fn(); return; }
  const need = R.px;
  let sp = SPR.get(key);
  const res = o.res || 1.12;
  if (!sp || sp.q < need * res * 0.8) {
    if (sp) { SPR.delete(key); sprPx -= sp.px; }
    sp = bake(bounds, fn, Math.min(need * res, o.maxQ || 3.4));
    SPR.set(key, sp);
    sprPx += sp.px;
    evict();
  }
  sp.used = R.frame;
  if (sp.empty) return;
  const ctx = R.ctx;
  const { dx = 0, dy = 0, rot = 0, ax = 0, ay = 0, shadowLift = 0, alpha = 1 } = o;
  if (rot || shadowLift || alpha < 1) {
    ctx.save();
    ctx.translate(ax + dx, ay + dy);
    if (rot) ctx.rotate(rot);
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (shadowLift) shadow(ctx, shadowLift);
    ctx.drawImage(sp.img, sp.x0 - ax, sp.y0 - ay, sp.w, sp.h);
    ctx.restore();
  } else {
    ctx.drawImage(sp.img, sp.x0 + dx, sp.y0 + dy, sp.w, sp.h);
  }
}

export function pieceBounds(sh, o) {
  const b = sh.b;
  if (!b) return REGION;
  const { x = 0, y = 0, r = 0, s = 1, sx = 1, sy = 1, lift = 2 } = o;
  const c = Math.cos(r), sn = Math.sin(r);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]]) {
    const X = px * s * sx, Y = py * s * sy;
    const wx = x + X * c - Y * sn, wy = y + X * sn + Y * c;
    x0 = Math.min(x0, wx); y0 = Math.min(y0, wy); x1 = Math.max(x1, wx); y1 = Math.max(y1, wy);
  }
  const m = 3 + (1.4 + lift * 0.85) * 1.4;
  return [x0 - m, y0 - m, x1 + m + lift * LX, y1 + m + lift * LY];
}

// A piece that is not being moved right now. dx/dy/rot nudge the finished piece.
export function stillPiece(key, sh, o = {}) {
  const { dx = 0, dy = 0, rot = 0, liveShadow = false, alpha = 1 } = o;
  const bakeO = liveShadow ? { ...o, lift: 0, alpha: 1 } : { ...o, alpha: 1 };
  layer(key, pieceBounds(sh, o), () => piece(sh, bakeO), {
    dx, dy, rot, ax: o.x || 0, ay: o.y || 0, shadowLift: liveShadow ? o.lift || 0 : 0, alpha, maxQ: o.maxQ,
  });
}

// ---------------------------------------------------------------------------
// Backdrop: a big sheet.

export function backdrop(color, tex = 'plain', ts = 1.2, o = {}) {
  const ctx = R.ctx;
  const { x0 = -2400, y0 = -2400, w = 8400, h = 6400, tx = 0, ty = 0, texA = 1 } = o;
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, w, h);
  if (tex) {
    const p = pat(tex);
    setPat(p, tx, ty, ts, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = texA;
    ctx.fillStyle = p;
    ctx.fillRect(x0, y0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// A thread (the kind that holds paper up in a toy theatre).
export function thread(x0, y0, x1, y1, o = {}) {
  const ctx = R.ctx;
  const { width = 1.3, color = 'rgba(230,226,240,0.55)', alpha = 1 } = o;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(8,6,14,0.25)';
  ctx.lineWidth = width * 1.4;
  ctx.beginPath(); ctx.moveTo(x0 + 3, y0 + 5); ctx.lineTo(x1 + 3, y1 + 5); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Post: exposure flicker, vignette, film grain.

export function post(g, o = {}) {
  const ctx = R.ctx;
  const { flicker = 1, vignette = 1, grain = 0.085 } = o;
  ctx.save();
  ctx.setTransform(R.k, 0, 0, R.k, 0, 0);
  if (!R.reduced && flicker > 0) {
    let a = 0.012 + hash(g, 'exp') * 0.03;
    if (hash(g, 'exp2') > 0.94) a += 0.03;
    ctx.fillStyle = `rgba(10,6,12,${a * flicker})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (vignette > 0 && VIGNETTE) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = vignette;
    ctx.drawImage(VIGNETTE, -6, -4, W + 12, H + 8);
    ctx.globalAlpha = 1;
  }
  if (grain > 0 && GRAIN.length) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grain;
    const gi = ((g % GRAIN.length) + GRAIN.length) % GRAIN.length;
    const key = 'grain' + gi;
    let p = R.pats.get(key);
    if (!p) { p = ctx.createPattern(GRAIN[gi], 'repeat'); R.pats.set(key, p); }
    setPat(p, hash(g, 'gx') * 256, hash(g, 'gy') * 256, 1, 0);
    ctx.fillStyle = p;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Captions: a strip of paper with the words typed onto it.
// Each speaker has their own paper:
//   nar — manuscript paper (原稿用紙), the story's own voice
//   man — plain cream paper
//   dol — pale sea-green paper with a little cellophane dolphin
//   fri — pale grey paper, printed in the fridge's dotted display type

const STYLE = {
  nar: { paper: '#f3ead6', ink: '#2e2620', en: '#3b312a', cps: 1, icon: null },
  man: { paper: '#f2e8d4', ink: '#2b221c', en: '#43382f', cps: 1, icon: 'pen' },
  dol: { paper: '#d4ecee', ink: '#16323f', en: '#27495a', cps: 1.3, icon: 'dol' },
  fri: { paper: '#e3e8de', ink: '#223a2a', en: '#2f4a37', cps: 2, icon: 'fri' },
};

const capShapes = new Map();
function wrapCap(text) { return text ? text.split('\n') : []; }

let ICONS = null;
export function setCaptionIcons(icons) { ICONS = icons; }

function stripShape(key, sw, sh) {
  let shape = capShapes.get(key);
  if (shape) return shape;
  const seed = strHash(key) & 0xffff;
  const hw = sw / 2, hh = sh / 2;
  const p = new Path2D();
  const pts = [];
  const n = 18;
  for (let i = 0; i <= n; i++) pts.push([-hw + (sw * i) / n, -hh + hs(seed, i) * 1.2]);
  for (let i = 0; i <= 6; i++) pts.push([hw + hs(seed, 'r', i) * 4, -hh + (sh * i) / 6]);
  for (let i = n; i >= 0; i--) pts.push([-hw + (sw * i) / n, hh + hs(seed, 'b', i) * 1.2]);
  for (let i = 6; i >= 0; i--) pts.push([-hw + hs(seed, 'l', i) * 4, -hh + (sh * i) / 6]);
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  shape = { path: p, b: { x0: -hw - 6, y0: -hh - 3, x1: hw + 6, y1: hh + 3 } };
  capShapes.set(key, shape);
  return shape;
}

export function caption(cap, lf, onShow) {
  const t = lf - cap.a;
  if (t < 0 || lf > cap.b + 2 || R.lang === 'off') return;
  const ctx = R.ctx;
  const st = STYLE[cap.who] || STYLE.man;
  const showJa = R.lang === 'ja' || R.lang === 'both';
  const showEn = R.lang === 'en' || R.lang === 'both';
  const ja = showJa ? wrapCap(cap.ja) : [];
  const en = showEn ? wrapCap(cap.en) : [];
  const grid = cap.who === 'nar' && ja.length > 0;
  const dot = cap.who === 'fri';
  const longest = Math.max(0, ...ja.map((l) => [...l].length));
  const jaSize = grid ? 27 : longest > 30 ? 27 : 30;
  const jaFont = dot ? `400 ${jaSize}px ${F.dot}` : grid ? `500 ${jaSize}px ${F.mincho}` : `600 ${jaSize}px ${F.hand}`;
  const enFont = dot ? `400 ${showJa ? 21 : 27}px ${F.dot}` : showJa ? `italic 400 23px ${F.garamond}` : `italic 400 32px ${F.garamond}`;
  const cell = 38;
  const jaLH = grid ? cell + 8 : 45, enLH = showJa ? 30 : 41;

  ctx.save();
  ctx.setTransform(R.k, 0, 0, R.k, 0, 0);
  let wMax = 0;
  if (grid) wMax = longest * cell;
  else {
    ctx.font = jaFont;
    for (const l of ja) wMax = Math.max(wMax, ctx.measureText(l).width);
  }
  ctx.font = enFont;
  for (const l of en) wMax = Math.max(wMax, ctx.measureText(l).width);
  const iconW = st.icon ? 46 : 0;
  const padX = 40, padY = 22;
  const sw = Math.min(W - 40, wMax + padX * 2 + iconW);
  const sh = ja.length * jaLH + en.length * enLH + padY * 2 - (en.length && ja.length ? 4 : grid ? 8 : 10);
  const key = `${R.lang}|${cap.who}|${cap.ja}|${Math.round(sw)}|${Math.round(sh)}`;
  const shape = stripShape(key, sw, sh);
  const textX0 = -sw / 2 + padX + iconW; // left edge of the text block
  const blockW = sw - padX * 2 - iconW;

  const cps = st.cps;
  const typeText = (c) => {
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    let y = -sh / 2 + padY + jaLH / 2 - (grid ? 2 : 2);
    let budget = Math.max(0, (t - 1) * cps);
    c.fillStyle = st.ink;
    c.font = jaFont;
    for (const l of ja) {
      const chars = [...l];
      const n = Math.max(0, Math.min(chars.length, Math.floor(budget)));
      budget -= chars.length;
      if (grid) {
        // manuscript cells, centred as a block
        const gx0 = textX0 + (blockW - chars.length * cell) / 2;
        c.save();
        c.globalCompositeOperation = 'multiply';
        c.strokeStyle = 'rgba(176,86,60,0.62)';
        c.lineWidth = 1.2;
        c.beginPath();
        for (let i = 0; i <= chars.length; i++) { c.moveTo(gx0 + i * cell, y - cell / 2); c.lineTo(gx0 + i * cell, y + cell / 2); }
        c.moveTo(gx0, y - cell / 2); c.lineTo(gx0 + chars.length * cell, y - cell / 2);
        c.moveTo(gx0, y + cell / 2); c.lineTo(gx0 + chars.length * cell, y + cell / 2);
        c.stroke();
        c.restore();
        c.textAlign = 'center';
        for (let i = 0; i < n; i++) {
          const ch = chars[i];
          const off = '、。'.includes(ch) ? [-cell * 0.22, -cell * 0.18] : [0, 1];
          c.fillText(ch, gx0 + i * cell + cell / 2 + off[0], y + off[1]);
        }
        c.textAlign = 'left';
      } else {
        const full = c.measureText(l).width;
        if (n > 0) c.fillText(chars.slice(0, n).join(''), textX0 + (blockW - full) / 2, y);
      }
      y += jaLH;
    }
    let enBudget = Math.max(0, (t - 1) * (showJa ? 2.4 : 2.1) * Math.max(1, cps * 0.8));
    c.font = enFont;
    c.fillStyle = showJa ? st.en : st.ink;
    if (ja.length) y += (enLH - jaLH) / 2;
    else y = -sh / 2 + padY + enLH / 2 - 2;
    for (const l of en) {
      const shown = l.slice(0, Math.max(0, Math.min(l.length, Math.floor(enBudget))));
      enBudget -= l.length;
      const full = c.measureText(l).width;
      if (shown) c.fillText(shown, textX0 + (blockW - full) / 2, y);
      y += enLH;
    }
    if (cap.who === 'nar' && !grid) {
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = 'rgba(176,86,60,0.5)';
      c.fillRect(-sw / 2 + 22, -sh / 2 + 8, 1.4, sh - 16);
      c.restore();
    }
    if (st.icon && ICONS && ICONS[st.icon]) ICONS[st.icon](c, -sw / 2 + padX + 12, 0, lf);
  };

  // enter / exit
  let dy = 0, lift = 3, s = 1;
  const out = lf - cap.b;
  const moving = t < 3 || out > 0;
  if (t < 3) { dy = [22, 8, 2][t]; lift = [26, 12, 5][t]; s = [1.04, 1.015, 1][t]; }
  if (out > 0) { dy = [-10, -26][out - 1]; lift = [18, 40][out - 1]; s = [1.02, 1.05][out - 1]; }
  const [bx, by, br] = boil('cap' + cap.a, lf, 0.35);
  const tilt = hs(cap.a, cap.who, 'tilt') * 0.006;
  const cx = W / 2, cy = H - 28 - sh / 2;
  R.px = R.k;
  const paper = { color: st.paper, tex: 'plain', tx: hash(cap.a) * 900, ty: 40, edge: 0.25 };
  if (moving) {
    piece(shape, { ...paper, x: cx + bx, y: cy + dy + by, r: br + tilt, s, lift, print: typeText });
  } else {
    stillPiece('cap|' + key, shape, { ...paper, x: cx, y: cy, r: tilt, lift: 3, dx: bx, dy: by, rot: br });
    ctx.translate(cx + bx, cy + by);
    ctx.rotate(br + tilt);
    typeText(ctx);
  }
  ctx.restore();
  if (t === 0 && onShow) onShow(cap);
}

// How far a caption's text has been typed (0..1), for mouths that move while speaking.
export function speaking(caps, lf, who) {
  for (const c of caps) {
    if (c.who !== who) continue;
    const t = lf - c.a;
    if (t < 1) continue;
    const len = [...(R.lang === 'en' ? c.en : c.ja).replace(/\n/g, '')].length;
    const st = STYLE[who] || STYLE.man;
    const typedFrames = R.lang === 'en' ? len / 2.1 : len / st.cps;
    if (t <= typedFrames + 2) return true;
  }
  return false;
}
