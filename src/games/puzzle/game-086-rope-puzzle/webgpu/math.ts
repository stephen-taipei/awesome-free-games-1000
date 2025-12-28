/**
 * WebGPU Math Utilities - Rope Puzzle
 * Neon / String / Glow Theme
 * Game #086
 */

export function stringWave(x: number, y: number, time: number): number {
  return Math.sin(x * 0.08 + y * 0.06 + time * 2) * 0.5 + 0.5;
}

export function neonPulse(time: number, frequency: number = 3): number {
  return 0.7 + Math.sin(time * frequency) * 0.3;
}

export function ropeFlow(angle: number, time: number): { x: number; y: number } {
  const wave = Math.sin(angle * 3 + time * 2) * 0.3;
  return {
    x: Math.cos(angle + wave) * 25,
    y: Math.sin(angle + wave) * 25,
  };
}

export function knotTwist(progress: number, time: number): number {
  return progress * Math.PI * 4 + Math.sin(time * 4) * 0.5;
}

export function glowIntensity(distance: number, maxDist: number): number {
  const normalized = 1 - Math.min(distance / maxDist, 1);
  return normalized * normalized;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function getNeonColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.40, g: 0.49, b: 0.92 }, // Purple-blue
    { r: 0.46, g: 0.30, b: 0.64 }, // Deep purple
    { r: 0.90, g: 0.30, b: 0.60 }, // Pink
    { r: 0.18, g: 0.80, b: 0.44 }, // Green
    { r: 0.95, g: 0.61, b: 0.07 }, // Orange
    { r: 0.20, g: 0.71, b: 0.90 }, // Cyan
  ];
  return colors[index % colors.length];
}

export function getGlowColor(intensity: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.55, g: 0.35, b: 0.95 }, // Purple glow
    { r: 0.35, g: 0.55, b: 0.95 }, // Blue glow
    { r: 0.95, g: 0.55, b: 0.85 }, // Pink glow
  ];
  const idx = Math.floor(intensity * (colors.length - 1));
  return colors[clamp(idx, 0, colors.length - 1)];
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r, g, b };
}
