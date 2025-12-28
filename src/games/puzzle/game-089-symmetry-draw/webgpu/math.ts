/**
 * WebGPU Math Utilities - Symmetry Draw
 * Kaleidoscope / Rainbow / Prismatic Theme
 * Game #089
 */

export function prismRefract(angle: number, time: number): number {
  return angle + Math.sin(time * 2 + angle) * 0.1;
}

export function kaleidoscopePulse(time: number): number {
  return 0.7 + Math.sin(time * 3) * 0.3;
}

export function rainbowCycle(time: number, offset: number = 0): number {
  return (time * 0.2 + offset) % 1;
}

export function shimmerPhase(x: number, y: number, time: number): number {
  return Math.sin(x * 0.1 + y * 0.08 + time * 4) * 0.5 + 0.5;
}

export function prismSpread(angle: number, segments: number): number[] {
  const angles: number[] = [];
  for (let i = 0; i < segments; i++) {
    angles.push(angle + (i / segments) * Math.PI * 2);
  }
  return angles;
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

export function getRainbowColor(hue: number): { r: number; g: number; b: number } {
  return hsvToRgb(hue, 0.9, 1.0);
}

export function getPrismaticColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 1.0, g: 0.3, b: 0.4 },   // Red-pink
    { r: 1.0, g: 0.6, b: 0.2 },   // Orange
    { r: 1.0, g: 1.0, b: 0.3 },   // Yellow
    { r: 0.3, g: 1.0, b: 0.5 },   // Green
    { r: 0.3, g: 0.7, b: 1.0 },   // Blue
    { r: 0.6, g: 0.3, b: 1.0 },   // Violet
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
