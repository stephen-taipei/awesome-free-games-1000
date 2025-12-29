/**
 * WebGPU Math Utilities - Layer Stack
 * Holographic / Translucent / Layered Theme
 * Game #090
 */

export function holographicShift(time: number, offset: number = 0): number {
  return Math.sin(time * 2 + offset) * 0.5 + 0.5;
}

export function translucentWave(x: number, y: number, time: number): number {
  return Math.sin(x * 0.05 + y * 0.03 + time * 2) * 0.5 + 0.5;
}

export function layerDepth(index: number, total: number): number {
  return 1 - (index / total) * 0.5;
}

export function shimmerPhase(x: number, y: number, time: number): number {
  return Math.sin(x * 0.08 + time * 3) * Math.cos(y * 0.06 + time * 2.5) * 0.5 + 0.5;
}

export function stackPulse(time: number, layerIndex: number): number {
  return Math.sin(time * 4 + layerIndex * 0.5) * 0.3 + 0.7;
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

export function getHolographicColor(hue: number): { r: number; g: number; b: number } {
  return hsvToRgb(hue, 0.6, 1.0);
}

export function getLayerColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.3, g: 0.8, b: 1.0 },   // Cyan
    { r: 0.8, g: 0.4, b: 1.0 },   // Purple
    { r: 0.4, g: 1.0, b: 0.8 },   // Teal
    { r: 1.0, g: 0.6, b: 0.8 },   // Pink
    { r: 0.6, g: 0.8, b: 1.0 },   // Light Blue
    { r: 1.0, g: 0.8, b: 0.5 },   // Gold
  ];
  return colors[index % colors.length];
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
