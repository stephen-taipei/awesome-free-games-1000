/**
 * Math Utilities - Note Puzzle
 * Music / Concert Hall Theme
 * Game #110
 */

// Musical note oscillation (vibrato effect)
export function vibrato(t: number, frequency: number, depth: number): number {
  return Math.sin(t * frequency * Math.PI * 2) * depth;
}

// Sound wave pattern
export function soundWave(x: number, t: number, amplitude: number, frequency: number): number {
  return amplitude * Math.sin(x * frequency + t);
}

// Musical staff line position
export function staffLineY(lineIndex: number, staffHeight: number, baseY: number): number {
  const spacing = staffHeight / 4;
  return baseY + lineIndex * spacing;
}

// Note bounce animation
export function noteBounce(t: number, height: number): number {
  const bounce = Math.abs(Math.sin(t * Math.PI * 2));
  return height * bounce * Math.exp(-t * 2);
}

// Treble clef curve (simplified)
export function trebleClefCurve(t: number): { x: number; y: number } {
  const angle = t * Math.PI * 4;
  const radius = 1 - t * 0.5;
  return {
    x: Math.sin(angle) * radius * 0.3,
    y: t - 0.5 + Math.cos(angle) * 0.1,
  };
}

// Sound ring expansion
export function soundRing(t: number, maxRadius: number): { radius: number; opacity: number } {
  const progress = Math.min(t, 1);
  return {
    radius: maxRadius * Math.sqrt(progress),
    opacity: 1 - progress,
  };
}

// Frequency to visual height mapping
export function freqToHeight(frequency: number, minFreq: number, maxFreq: number): number {
  const normalized = (Math.log(frequency) - Math.log(minFreq)) / (Math.log(maxFreq) - Math.log(minFreq));
  return Math.max(0, Math.min(1, normalized));
}

// Beat pulse
export function beatPulse(t: number, bpm: number): number {
  const beatDuration = 60 / bpm;
  const phase = (t % beatDuration) / beatDuration;
  return Math.exp(-phase * 5);
}

// Harmonic series
export function harmonicSeries(fundamental: number, harmonicIndex: number): number {
  return fundamental * (harmonicIndex + 1);
}

// Musical note stem position
export function noteStemOffset(noteY: number, staffCenter: number): number {
  return noteY > staffCenter ? -1 : 1;
}

// Crescendo curve
export function crescendo(t: number, duration: number): number {
  const progress = Math.min(t / duration, 1);
  return Math.pow(progress, 0.5);
}

// Decrescendo curve
export function decrescendo(t: number, duration: number): number {
  const progress = Math.min(t / duration, 1);
  return 1 - Math.pow(progress, 2);
}

// Staccato bounce
export function staccatoBounce(t: number): number {
  if (t > 0.2) return 0;
  return Math.sin(t * Math.PI / 0.2);
}

// Legato smooth
export function legatoSmooth(current: number, target: number, smoothing: number): number {
  return current + (target - current) * smoothing;
}

// Musical dynamics (pp to ff)
export function dynamicsToScale(dynamics: number): number {
  // dynamics: 0 = pp, 1 = ff
  return 0.3 + dynamics * 0.7;
}

// Note color based on pitch
export function pitchToColor(pitch: number): { r: number; g: number; b: number } {
  // Map pitch (0-11 for chromatic scale) to rainbow colors
  const hue = (pitch / 12) * 360;
  const s = 0.8;
  const l = 0.6;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return { r: r + m, g: g + m, b: b + m };
}
