// v2 原创合成音效 + 原创BGM（WebAudio），无任何外部音频
export class Sfx {
  constructor() { this.ctx = null; this.muted = false; this.lastPop = 0; this.bgmTimer = null; this.tempo = 118; this.intense = false; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4; this.comp.attack.value = 0.003; this.comp.release.value = 0.15;
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(this.comp); this.comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = 0.32; this.music.connect(this.master);
    const len = c.sampleRate; this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02); }
  osc(type, f0, f1, dur, vol, when = 0, dest, attack = 0.004) {
    const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  nz(type, f0, f1, dur, vol, when = 0, dest, q = 1) {
    const c = this.ctx, t = c.currentTime + when, s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  // 吞噬：按体积分层（啵 + 嘎吱 + 低频轰）
  eat(size, combo = 0) {
    if (!this.ctx) return; const now = performance.now(); if (now - this.lastPop < 35) return; this.lastPop = now;
    const up = Math.pow(2, Math.min(combo, 36) / 24);
    const f = (700 / (1 + size * 0.5) + 110) * up * (0.95 + Math.random() * 0.1);
    this.osc('sine', f * 1.6, f * 0.5, 0.12 + Math.min(size, 6) * 0.03, 0.35);
    this.osc('triangle', f * 2.4, f * 1.2, 0.06, 0.12);
    this.nz('bandpass', 2500 / (1 + size * 0.3), 600, 0.05 + Math.min(size, 8) * 0.025, 0.35 + Math.min(size, 6) * 0.05, 0, null, 1.2);
    if (size > 2) { this.osc('sine', 120, 38, 0.3 + Math.min(size, 10) * 0.04, Math.min(0.9, 0.3 + size * 0.06)); this.nz('lowpass', 900, 80, 0.35 + Math.min(size, 10) * 0.06, Math.min(0.6, 0.15 + size * 0.04)); }
  }
  segment(i) { // 叠叠楼连锁
    if (!this.ctx) return; const now = performance.now(); if (now - this.lastSeg < 40) return; this.lastSeg = now;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const n = scale[i % scale.length] + 12 * Math.min(2, Math.floor(i / scale.length));
    const f = 220 * Math.pow(2, n / 12);
    this.osc('square', f, f * 0.98, 0.09, 0.08); this.osc('sine', f * 2, f, 0.12, 0.2);
    this.osc('sine', 110, 45, 0.18, 0.35); this.nz('bandpass', 1400, 400, 0.08, 0.3, 0, null, 2);
  }
  gold() { if (!this.ctx) return; [1318, 1760, 2637].forEach((f, i) => this.osc('sine', f, f, 0.5, 0.18, i * 0.05)); this.osc('triangle', 2637, 2637, 0.3, 0.08, 0.15); }
  power(kind) {
    if (!this.ctx) return;
    this.osc('sawtooth', 200, 1200, 0.35, 0.12); this.nz('highpass', 2000, 8000, 0.3, 0.15);
    const base = kind === 'magnet' ? 523 : kind === 'speed' ? 659 : 392;
    [0, 4, 7, 12, 16].forEach((s, i) => this.osc('square', base * Math.pow(2, s / 12), base * Math.pow(2, s / 12), 0.12, 0.08, 0.08 + i * 0.05));
  }
  combo(level) { if (!this.ctx) return; const b = 392 * Math.pow(2, Math.min(level, 6) * 2 / 12); [0, 4, 7].forEach(s => this.osc('sawtooth', b * Math.pow(2, s / 12), b * Math.pow(2, s / 12), 0.25, 0.07)); this.osc('sine', b * 2, b * 2, 0.3, 0.12, 0.05); }
  levelUp() { if (!this.ctx) return; [523, 659, 784, 1047, 1319].forEach((f, i) => { this.osc('square', f, f, 0.14, 0.09, i * 0.06); this.osc('triangle', f * 2, f * 2, 0.12, 0.06, i * 0.06); }); this.nz('highpass', 4000, 9000, 0.4, 0.12, 0.2); }
  tick() { if (this.ctx) this.osc('square', 1400, 1300, 0.05, 0.1); }
  count() { if (this.ctx) this.osc('square', 660, 660, 0.15, 0.12); }
  go() { if (!this.ctx) return; this.osc('square', 880, 880, 0.35, 0.12); this.osc('triangle', 1320, 1320, 0.4, 0.1); this.osc('sine', 150, 40, 0.4, 0.6); }
  eatHole() { if (!this.ctx) return; this.osc('sawtooth', 400, 50, 0.7, 0.18); this.osc('sine', 160, 30, 0.8, 0.8); this.nz('lowpass', 2000, 60, 0.8, 0.6); }
  eaten() { if (this.ctx) { this.osc('sawtooth', 600, 40, 1.0, 0.2); this.nz('bandpass', 1200, 100, 1.0, 0.3, 0, null, 3); } }
  rush() { if (!this.ctx) return; for (let i = 0; i < 3; i++) this.osc('sawtooth', 500, 1400, 0.3, 0.1, i * 0.32); this.osc('sine', 120, 40, 0.5, 0.7); }
  fanfare() { if (!this.ctx) return; [523, 659, 784, 1047, 784, 1047].forEach((f, i) => { this.osc('square', f, f, i === 5 ? 0.7 : 0.16, 0.1, i * 0.13); this.osc('triangle', f / 2, f / 2, i === 5 ? 0.7 : 0.16, 0.12, i * 0.13); }); }
  bubble() { if (!this.ctx) return; const f = 500 + Math.random() * 400; this.osc('sine', f, f * 2.6, 0.09, 0.3); this.osc('sine', f * 1.5, f * 3, 0.05, 0.12, 0.03); }
  sting() { if (!this.ctx) return; this.osc('sawtooth', 900, 120, 0.35, 0.22); this.osc('square', 1300, 200, 0.2, 0.1); this.nz('highpass', 3000, 800, 0.3, 0.35); }
  pearl() { if (!this.ctx) return; [1568, 2093, 2637, 3136].forEach((f, i) => this.osc('sine', f, f, 0.4, 0.14, i * 0.06)); }
  slurp(size) { if (!this.ctx) return; const now = performance.now(); if (now - this.lastPop < 35) return; this.lastPop = now; const f = 500 / (1 + size * 0.5) + 120; this.osc('sine', f * 0.6, f * 2, 0.15, 0.3); this.nz('bandpass', 400, 1800, 0.18, 0.25, 0, null, 3); if (size > 2) this.osc('sine', 90, 35, 0.4, 0.6); }
  startAmbience() {
    if (!this.ctx || this.amb) return; const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const g = c.createGain(); g.gain.value = 0.25; const l = c.createOscillator(); l.frequency.value = 0.12; const lg = c.createGain(); lg.gain.value = 120; l.connect(lg); lg.connect(f.frequency);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(); l.start(); this.amb = [s, l];
  }
  stopAmbience() { if (this.amb) { this.amb.forEach(n => n.stop()); this.amb = null; } }
  // ---- BGM：鼓组 + 贝斯 + 和弦 + 旋律 ----
  setIntense(on) { this.intense = on; this.tempo = on ? 138 : 118; }
  startMusic() {
    if (!this.ctx || this.bgmTimer) return;
    const c = this.ctx, M = this.music; let n = 0, next = c.currentTime + 0.08;
    const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const prog = this.seaMode ? [[45, 48, 52, 57], [41, 45, 48, 53], [43, 47, 50, 55], [40, 43, 47, 52]] : [[48, 52, 55, 60], [43, 47, 50, 55], [45, 48, 52, 57], [41, 45, 48, 53]]; // C G Am F / 海底：Am F G Em
    const mel = [72, 0, 76, 79, 0, 76, 74, 72, 74, 0, 76, 0, 79, 81, 79, 76, 72, 0, 74, 76, 0, 79, 76, 74, 72, 0, 69, 72, 0, 74, 72, 0];
    const kick = (t) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g); g.connect(M); o.start(t); o.stop(t + 0.3); };
    const hit = (t, type, f, dur, vol) => { const s = c.createBufferSource(); s.buffer = this.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl); fl.connect(g); g.connect(M); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.01); };
    const note = (t, type, f, dur, vol, cut) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); if (cut) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); fl.connect(g); } else o.connect(g); g.connect(M); o.start(t); o.stop(t + dur + 0.02); };
    const sched = () => {
      while (next < c.currentTime + 0.25) {
        const step = 60 / this.tempo / 4, t = next, s16 = n % 16, bar = ((n / 16) | 0) % 4, ch = prog[bar];
        if (s16 % 4 === 0) kick(t);
        if (this.intense && s16 === 14) kick(t);
        if (s16 === 4 || s16 === 12) { hit(t, 'highpass', 1500, 0.16, 0.5); note(t, 'triangle', 190, 0.08, 0.25); }
        if (s16 % 2 === 0 || this.intense) hit(t, 'highpass', 8000, 0.04, s16 % 4 === 2 ? 0.22 : 0.12);
        if (s16 % 2 === 0) note(t, 'sawtooth', mf(ch[0] - 12 + (s16 % 8 === 6 ? 12 : 0)), step * 1.8, 0.35, 700);
        if (s16 === 2 || s16 === 6 || s16 === 10 || s16 === 14) for (const m of ch.slice(1)) note(t, 'triangle', mf(m + 12), step * 1.5, 0.07);
        const mi = (n >> 1) % 32; const m = mel[mi];
        if (n % 2 === 0 && m && ((n >> 7) % 2 === 1 || this.intense)) { note(t, 'square', mf(m), step * 1.8, 0.07); note(t, 'sine', mf(m + 12), step * 1.5, 0.05); }
        next += step; n++;
      }
    };
    this.bgmTimer = setInterval(sched, 40); sched();
  }
  stopMusic() { clearInterval(this.bgmTimer); this.bgmTimer = null; }
}
