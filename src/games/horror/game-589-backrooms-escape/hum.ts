/**
 * The continuous fluorescent hum. The kit's Sfx only plays short one-shots, so this owns a small
 * audio graph of its own: a 120 Hz mains buzz with harmonics, plus a distorted, wobbling copy that
 * is mixed in as the entity gets closer. Silent until `start()` runs inside a user gesture.
 */
export class Hum {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private wet: GainNode | null = null;
  private tremolo: GainNode | null = null;
  private buzz: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private playing = false;
  private dread = -1;
  muted = false;

  constructor(storageKey = 'g3d-muted') {
    try { this.muted = localStorage.getItem(storageKey) === '1'; } catch { /* default on */ }
  }

  private build(): void {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      const out = ctx.createGain();
      out.gain.value = 0;
      out.connect(ctx.destination);

      const dry = ctx.createGain();
      dry.gain.value = 1;
      dry.connect(out);
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 900;
      tone.connect(dry);

      const buzz = ctx.createOscillator();
      buzz.type = 'sawtooth';
      buzz.frequency.value = 120;
      const buzzGain = ctx.createGain();
      buzzGain.gain.value = 0.05;
      buzz.connect(buzzGain).connect(tone);

      const mains = ctx.createOscillator();
      mains.type = 'sine';
      mains.frequency.value = 60;
      const mainsGain = ctx.createGain();
      mainsGain.gain.value = 0.06;
      mains.connect(mainsGain).connect(dry);

      const whine = ctx.createOscillator();
      whine.type = 'square';
      whine.frequency.value = 240;
      const whineFilter = ctx.createBiquadFilter();
      whineFilter.type = 'highpass';
      whineFilter.frequency.value = 2200;
      const whineGain = ctx.createGain();
      whineGain.gain.value = 0.008;
      whine.connect(whineFilter).connect(whineGain).connect(dry);

      // Distorted branch with tremolo: silent until something approaches.
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * 6);
      }
      shaper.curve = curve;
      const tremolo = ctx.createGain();
      tremolo.gain.value = 1;
      const wet = ctx.createGain();
      wet.gain.value = 0;
      buzz.connect(shaper).connect(tremolo).connect(wet).connect(out);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 7;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.6;
      lfo.connect(lfoDepth).connect(tremolo.gain);

      for (const osc of [buzz, mains, whine, lfo]) osc.start();
      this.ctx = ctx;
      this.out = out;
      this.wet = wet;
      this.tremolo = tremolo;
      this.buzz = buzz;
      this.lfo = lfo;
    } catch {
      this.ctx = null;
    }
  }

  /** Fades the hum in. Call from a user gesture the first time so the audio context may start. */
  start(): void {
    if (!this.ctx) this.build();
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    this.playing = true;
    void ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(this.muted ? 0 : 0.5, t, 0.4);
  }

  /** Fades the hum out and suspends the context, so nothing keeps running while paused. */
  stop(): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.playing) return;
    this.playing = false;
    const t = ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(0, t, 0.05);
    window.setTimeout(() => { if (!this.playing) void ctx.suspend().catch(() => {}); }, 300);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.out && this.playing) this.out.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }

  /** 0 = calm hum; 1 = the entity is on top of you: the buzz sags, distorts and stutters. */
  setDread(dread: number): void {
    if (!this.ctx || !this.wet || !this.buzz || !this.lfo || !this.playing) return;
    if (Math.abs(dread - this.dread) < 0.02) return;
    this.dread = dread;
    const t = this.ctx.currentTime;
    this.wet.gain.setTargetAtTime(dread * dread * 0.07, t, 0.1);
    this.buzz.frequency.setTargetAtTime(120 - dread * 16, t, 0.2);
    this.buzz.detune.setTargetAtTime((Math.random() - 0.5) * dread * 120, t, 0.05);
    this.lfo.frequency.setTargetAtTime(6 + dread * 12, t, 0.2);
    this.tremolo?.gain.setTargetAtTime(1 - dread * 0.3, t, 0.2);
  }
}
