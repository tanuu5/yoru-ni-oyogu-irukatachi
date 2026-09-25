// audio.js — everything you hear is synthesised live with WebAudio:
// soft pads, keys, the fridge's hum and voice, the dolphin's whistle, bubbles,
// coffee dripping, the clock, the neon.

const IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function freq(n) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
  const midi = 12 * (parseInt(m[2], 10) + 1) + IDX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const MOODS = {
  title: { notes: ['A2', 'E3', 'G3', 'C4', 'D4'], gain: 0.028, cut: 800 },
  dark: { notes: [], gain: 0, cut: 400 },
  room: { notes: ['F2', 'C3', 'E3', 'A3', 'G4'], gain: 0.026, cut: 850 },
  banter: { notes: ['D3', 'A3', 'C4', 'F4', 'E4'], gain: 0.024, cut: 900 },
  kitchen: { notes: ['G2', 'D3', 'F3', 'B3', 'E4'], gain: 0.022, cut: 800 },
  story: { notes: ['C3', 'G3', 'A3', 'E4', 'D5'], gain: 0.024, cut: 1200 },
  night: { notes: ['E3', 'B3', 'D4', 'G4'], gain: 0.024, cut: 750 },
  confess: { notes: ['C#3', 'G#3', 'B3', 'E4', 'F#4'], gain: 0.026, cut: 620 },
  faces: { notes: ['D3', 'A3', 'E4', 'F#4', 'C#5'], gain: 0.026, cut: 1000 },
  swim: { notes: ['D3', 'A3', 'C#4', 'E4', 'G#4'], gain: 0.03, cut: 1300, sea: true },
  dawn: { notes: ['D3', 'A3', 'D4', 'F#4', 'A4', 'E5'], gain: 0.03, cut: 1600 },
  hush: { notes: ['D3', 'A3'], gain: 0.018, cut: 500 },
};

export const A = {
  ctx: null,
  on: true,
  voices: [],
  moodName: null,
  seaNode: null,
  humNode: null,
  ks: new Map(),

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.on ? 0.9 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.master.connect(comp).connect(ctx.destination);
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.verb.connect(wet).connect(this.master);
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    this.send = ctx.createGain();
    this.send.gain.value = 0.9;
    this.send.connect(this.verb);
    this.padBus = ctx.createGain();
    this.padBus.connect(this.master);
    const padSend = ctx.createGain();
    padSend.gain.value = 0.6;
    this.padBus.connect(padSend).connect(this.verb);
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },

  impulse(sec) {
    const ctx = this.ctx, sr = ctx.sampleRate, len = Math.floor(sr * sec);
    const b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    return b;
  },

  get live() { return !!this.ctx && this.on && this.ctx.state === 'running'; },

  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  setOn(v) {
    this.on = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.05);
  },

  mood(name) {
    if (!this.ctx || name === this.moodName) return;
    this.moodName = name;
    const ctx = this.ctx, t = ctx.currentTime;
    const m = MOODS[name] || MOODS.dark;
    for (const v of this.voices) {
      v.g.gain.cancelScheduledValues(t);
      v.g.gain.setTargetAtTime(0, t, 0.9);
      v.oscs.forEach((o) => { try { o.stop(t + 6); } catch (e) { /* already stopped */ } });
    }
    this.voices = [];
    this.setSea(!!m.sea);
    if (!m.notes.length) return;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = m.cut;
    lp.Q.value = 0.3;
    lp.connect(this.padBus);
    for (const n of m.notes) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(lp);
      const f0 = freq(n);
      const oscs = [-5, 5].map((det) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f0;
        o.detune.value = det;
        o.connect(g);
        o.start(t);
        return o;
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + Math.random() * 0.09;
      const lg = ctx.createGain();
      lg.gain.value = m.gain * 0.3;
      lfo.connect(lg).connect(g.gain);
      lfo.start(t);
      oscs.push(lfo);
      g.gain.setTargetAtTime(m.gain, t + 0.05, 1.4);
      this.voices.push({ g, oscs });
    }
  },

  setSea(on) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (on && !this.seaNode) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 480;
      const g = ctx.createGain();
      g.gain.value = 0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lg = ctx.createGain();
      lg.gain.value = 0.014;
      lfo.connect(lg).connect(g.gain);
      src.connect(lp).connect(g).connect(this.bus);
      src.start(t);
      lfo.start(t);
      g.gain.setTargetAtTime(0.02, t, 1.2);
      this.seaNode = { src, g, lfo };
    } else if (!on && this.seaNode) {
      const s = this.seaNode;
      s.g.gain.cancelScheduledValues(t);
      s.g.gain.setTargetAtTime(0, t, 0.5);
      s.src.stop(t + 3);
      s.lfo.stop(t + 3);
      this.seaNode = null;
    }
  },

  // The fridge's low running sound (ブーン). level 0 = off.
  hum(level) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (!this.humNode && level > 0) {
      const g = ctx.createGain();
      g.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 260;
      const oscs = [[58, 1], [116, 0.5], [174, 0.18]].map(([fq, a]) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = fq;
        const og = ctx.createGain();
        og.gain.value = a;
        o.connect(og).connect(lp);
        o.start(t);
        return o;
      });
      const wob = ctx.createOscillator();
      wob.frequency.value = 0.7;
      const wg = ctx.createGain();
      wg.gain.value = 0.004;
      wob.connect(wg).connect(g.gain);
      wob.start(t);
      lp.connect(g).connect(this.bus);
      this.humNode = { g, oscs: [...oscs, wob] };
    }
    if (this.humNode) this.humNode.g.gain.setTargetAtTime(0.018 * level, t, 0.4);
  },

  // --- one-shots -------------------------------------------------------------
  tap(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400 + Math.random() * 1600;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22 * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.075);
    src.connect(bp).connect(g).connect(this.bus);
    src.start(t, Math.random() * 1.8, 0.1);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.07);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.1 * v, t);
    og.gain.exponentialRampToValueAtTime(0.0006, t + 0.09);
    o.connect(og).connect(this.bus);
    o.start(t);
    o.stop(t + 0.12);
  },

  // a key on the keyboard (a few per frame when typing fast)
  key(v = 1, delay = 0) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600 + Math.random() * 2400;
    bp.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1 * v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.035);
    src.connect(bp).connect(g).connect(this.bus);
    src.start(t, Math.random() * 1.8, 0.05);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(420 + Math.random() * 120, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.03);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.035 * v, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.04);
    o.connect(og).connect(this.bus);
    o.start(t);
    o.stop(t + 0.05);
  },
  typing(frames = 1, v = 1) {
    // a burst of keys spread over this frame
    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n * frames; i++) this.key(v * (0.6 + Math.random() * 0.4), Math.random() * 0.08 * frames);
  },

  rustle(dur = 0.4, v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3200;
    bp.Q.value = 0.5;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    for (let s = 0; s < dur; s += 0.028) {
      const env = Math.sin(Math.PI * Math.min(1, s / dur));
      g.gain.setValueAtTime(0.12 * v * env * (0.25 + Math.random() * 0.75), t + s);
    }
    g.gain.setValueAtTime(0, t + dur);
    src.connect(bp).connect(hp).connect(g).connect(this.bus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  },

  // cellophane crinkling (the dolphin turning over)
  crinkle(dur = 0.5, v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let s = 0; s < dur; s += 0.02 + Math.random() * 0.05) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 4000 + Math.random() * 5000;
      bp.Q.value = 2.5;
      const g = ctx.createGain();
      const a = 0.05 * v * (0.3 + Math.random());
      g.gain.setValueAtTime(0, t + s);
      g.gain.linearRampToValueAtTime(a, t + s + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0004, t + s + 0.03);
      src.connect(bp).connect(g).connect(this.bus);
      src.start(t + s, Math.random() * 1.8, 0.04);
    }
  },

  click() {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.018);
    src.connect(hp).connect(g).connect(this.bus);
    src.start(t, Math.random(), 0.03);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 1900;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.03, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.02);
    o.connect(og).connect(this.bus);
    o.start(t);
    o.stop(t + 0.03);
  },

  // the clock on the wall
  tick(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 3100;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    bp.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.012);
    o.connect(bp).connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.02);
  },

  // a neon tube catching (buzz + tick)
  neon(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    this.click();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 120;
    const lp = ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.016 * v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.35);
    o.connect(lp).connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.4);
  },

  // The fridge speaks: three soft beeps, like an appliance does.
  fridgeVoice(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    ['E6', 'G6', 'C7'].forEach((n, i) => {
      const t = t0 + i * 0.09;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq(n);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.022 * v, t + 0.005);
      g.gain.setValueAtTime(0.022 * v, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0004, t + 0.08);
      o.connect(lp).connect(g).connect(this.bus);
      o.start(t);
      o.stop(t + 0.1);
    });
  },
  // a short machine murmur while its text is being typed
  fridgeBlip(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 700 + Math.floor(Math.random() * 4) * 110;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.008 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 0.05);
    o.connect(lp).connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.06);
  },

  // The dolphin's voice: a small whistle that bends.
  whistle(v = 1, up = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f0 = 1500 + Math.random() * 300;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * (up > 0 ? 1.45 : 0.72), t + 0.12);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.15, t + 0.22);
    const vib = ctx.createOscillator();
    vib.frequency.value = 22;
    const vg = ctx.createGain();
    vg.gain.value = 18;
    vib.connect(vg).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03 * v, t + 0.02);
    g.gain.setValueAtTime(0.03 * v, t + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.26);
    o.connect(g);
    g.connect(this.bus);
    g.connect(this.send);
    o.start(t);
    vib.start(t);
    o.stop(t + 0.3);
    vib.stop(t + 0.3);
  },
  // soft clicks under its talking
  chatter(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f0 = 900 + Math.random() * 700;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * (0.8 + Math.random() * 0.5), t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.012 * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 0.06);
    o.connect(g).connect(this.bus);
    g.connect(this.send);
    o.start(t);
    o.stop(t + 0.07);
  },
  bubble(v = 1, delay = 0) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f0 = 300 + Math.random() * 300;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 2.4, t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03 * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.08);
    o.connect(g);
    g.connect(this.bus);
    g.connect(this.send);
    o.start(t);
    o.stop(t + 0.1);
  },
  drip(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1300 + Math.random() * 300, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03 * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.07);
    o.connect(g);
    g.connect(this.bus);
    g.connect(this.send);
    o.start(t);
    o.stop(t + 0.09);
  },
  pour(dur = 1, v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * v, t + 0.15);
    g.gain.setValueAtTime(0.05 * v, t + dur - 0.2);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp).connect(g).connect(this.bus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  },
  stamp(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.18);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.2);
    this.tap(0.7 * v);
  },

  // A small music-box / celesta note.
  bell(note, v = 0.1, delay = 0) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime + delay, f = freq(note);
    const out = ctx.createGain();
    out.gain.value = v;
    out.connect(this.bus);
    out.connect(this.send);
    [[1, 1, 2.2], [2, 0.22, 1.2], [2.76, 0.12, 0.7], [5.4, 0.05, 0.35]].forEach(([mul, a, dec]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dec + 0.05);
    });
  },

  // A plucked string (Karplus-Strong, rendered once per pitch).
  pluck(note, v = 0.25) {
    if (!this.live) return;
    const ctx = this.ctx;
    let buf = this.ks.get(note);
    if (!buf) {
      const sr = ctx.sampleRate, f = freq(note), N = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * 2.2);
      buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      const ring = new Float32Array(N);
      let prev = 0;
      for (let i = 0; i < N; i++) { prev = prev * 0.5 + (Math.random() * 2 - 1) * 0.5; ring[i] = prev; }
      let idx = 0;
      for (let i = 0; i < len; i++) {
        const a = ring[idx], b = ring[(idx + 1) % N];
        d[i] = a;
        ring[idx] = (a + b) * 0.5 * 0.996;
        idx = (idx + 1) % N;
      }
      this.ks.set(note, buf);
    }
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.value = v;
    src.connect(lp).connect(g);
    g.connect(this.bus);
    g.connect(this.send);
    src.start(t);
  },

  chime(notes, v = 0.08, spacing = 0.09) {
    notes.forEach((n, i) => this.bell(n, v, i * spacing));
  },
};
