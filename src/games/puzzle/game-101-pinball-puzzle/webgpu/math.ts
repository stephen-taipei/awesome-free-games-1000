/**
 * WebGPU Math Utilities - Pinball Puzzle
 * Neon Arcade / Retro Pinball Machine Theme
 * Game #101
 */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function ballTrail(x: number, y: number, vx: number, vy: number, time: number): number {
  const speed = Math.sqrt(vx * vx + vy * vy);
  return Math.min(1, speed * 0.1) * Math.sin(time * 10) * 0.5 + 0.5;
}

export function neonFlicker(time: number, frequency: number = 8): number {
  const base = Math.sin(time * frequency) * 0.5 + 0.5;
  const fast = Math.sin(time * frequency * 3.7) * 0.2;
  return clamp(base + fast, 0.6, 1);
}

export function bumperPulse(time: number, offset: number = 0): number {
  const phase = time * 2 + offset;
  return Math.sin(phase) * 0.3 + 0.7;
}

export function scanlinePattern(y: number, time: number): number {
  const line = Math.sin(y * 200 + time * 2) * 0.5 + 0.5;
  return line * 0.15 + 0.85;
}

export function starField(x: number, y: number, time: number, seed: number): number {
  const px = x * 50 + seed;
  const py = y * 50 + seed * 1.3;
  const hash = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
  const value = hash - Math.floor(hash);
  return value > 0.98 ? Math.sin(time * 2 + seed) * 0.5 + 0.5 : 0;
}

export function colorToVec4(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [r, g, b];
}

// Pinball arcade colors
export const PINBALL_COLORS = {
  neonPink: '#ff00ff',
  neonCyan: '#00ffff',
  neonYellow: '#ffd93d',
  bumperGreen: '#6bcb77',
  flipperRed: '#ff6b6b',
  ballSilver: '#c0c0c0',
  darkPurple: '#2d1b4e',
  deepPurple: '#1a0a30'
};
