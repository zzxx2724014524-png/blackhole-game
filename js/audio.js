// 原创合成音效（WebAudio），无外部音频文件
export class Sfx {
  constructor() { this.ctx = null; this.muted = false; this.lastPop = 0; this.musicOn = true; this.bgmTimer = null; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.gain.value = 0.16; this.music.connect(this.master);
    const len = this.ctx.sampleRate * 0.5; this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.02); }
  tone(f0, f1, dur, type = 'sine', vol = 0.3, when = 0, dest) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  thump(vol, dur, freq = 400) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(60, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur);
  }
  pop(size) {
    if (!this.ctx) return; const now = performance.now(); if (now - this.lastPop < 45) return; this.lastPop = now;
    const f = 900 / (1 + size * 0.45) + 90 + Math.random() * 60;
    this.tone(f, f * 0.35, 0.12 + Math.min(size, 8) * 0.03, 'triangle', 0.22);
    if (size > 2.5) this.thump(Math.min(0.6, 0.15 + size * 0.04), 0.25 + Math.min(size, 10) * 0.05, 300);
  }
  levelUp() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f * 1.01, 0.18, 'square', 0.09, i * 0.07)); }
  tick() { this.tone(1200, 1150, 0.06, 'square', 0.08); }
  go() { this.tone(880, 880, 0.35, 'square', 0.1); this.tone(1320, 1320, 0.35, 'triangle', 0.08); }
  count() { this.tone(660, 660, 0.15, 'square', 0.08); }
  eatHole() { this.tone(300, 60, 0.6, 'sawtooth', 0.12); this.thump(0.5, 0.6, 600); }
  eaten() { this.tone(500, 50, 0.9, 'sawtooth', 0.15); }
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, f, i === 5 ? 0.6 : 0.16, 'square', 0.09, i * 0.13)); }
  startMusic() {
    if (!this.ctx || this.bgmTimer) return;
    const bpm = 128, step = 60 / bpm / 2; let n = 0, next = this.ctx.currentTime + 0.1;
    const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
    const mel = [76, 0, 74, 72, 0, 72, 69, 0, 72, 0, 74, 76, 0, 79, 76, 0];
    const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const sched = () => {
      while (next < this.ctx.currentTime + 0.2) {
        const bar = ((n / 8) | 0) % 4, ch = prog[bar], when = next - this.ctx.currentTime;
        if (n % 2 === 0) this.tone(mf(ch[0] - 12), mf(ch[0] - 12), step * 1.6, 'triangle', 0.5, when, this.music);
        this.tone(mf(ch[n % 3] + 12), mf(ch[n % 3] + 12), step * 0.8, 'square', 0.12, when, this.music);
        const m = mel[n % 16]; if (m && (n >> 4) % 2 === 1) this.tone(mf(m), mf(m), step * 0.9, 'triangle', 0.25, when, this.music);
        if (n % 4 === 0) { const t = next; const s = this.ctx.createBufferSource(); s.buffer = this.noise; const g = this.ctx.createGain(); const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(f); f.connect(g); g.connect(this.music); s.start(t); s.stop(t + 0.06); }
        next += step; n++;
      }
    };
    this.bgmTimer = setInterval(sched, 50); sched();
  }
  stopMusic() { clearInterval(this.bgmTimer); this.bgmTimer = null; }
}
