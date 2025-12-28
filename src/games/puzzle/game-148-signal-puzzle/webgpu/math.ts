/**
 * Math Utilities - Signal Puzzle
 * Radio / Telecommunications / Electromagnetic Theme
 * Game #148
 */

export const SIGNAL_COLORS = {
  // Electromagnetic spectrum
  signalCyan: [0.0, 0.81, 0.79, 1.0] as const,
  signalTeal: [0.0, 0.72, 0.58, 1.0] as const,
  electricBlue: [0.0, 0.58, 0.88, 1.0] as const,
  radioWave: [0.42, 0.36, 0.91, 1.0] as const,
  frequencyPurple: [0.61, 0.35, 0.71, 1.0] as const,

  // Power/Energy
  powerYellow: [0.99, 0.80, 0.43, 1.0] as const,
  transmitOrange: [0.88, 0.44, 0.33, 1.0] as const,
  activeGreen: [0.18, 0.80, 0.44, 1.0] as const,

  // Dark backdrop
  spaceBlack: [0.12, 0.15, 0.18, 1.0] as const,
  nightSky: [0.18, 0.20, 0.27, 1.0] as const,
  gridDark: [0.22, 0.27, 0.32, 1.0] as const,

  // Effects
  staticWhite: [0.87, 0.90, 0.93, 0.8] as const,
  interferenceGlow: [0.0, 0.81, 0.79, 0.4] as const,
  dataStream: [0.0, 0.95, 0.88, 1.0] as const,
} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function oscillate(time: number, frequency: number = 1, amplitude: number = 1): number {
  return Math.sin(time * frequency * Math.PI * 2) * amplitude;
}

export function signalPulse(time: number, decay: number = 2): number {
  return Math.exp(-time * decay) * Math.sin(time * 15);
}

export function colorToVec4(color: readonly [number, number, number, number]): Float32Array {
  return new Float32Array(color);
}

export function lerpColor(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];
}
