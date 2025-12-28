/**
 * WebGPU Math Utilities - Color Sort
 * Bubbly / Liquid / Glass Theme
 * Game #083
 */

export function bubbleRise(y: number, time: number, speed: number): number {
  return y - Math.sin(time * speed) * 0.5;
}

export function liquidWave(x: number, y: number, time: number): number {
  const wave1 = Math.sin(x * 0.05 + time * 2) * 0.3;
  const wave2 = Math.cos(y * 0.04 + time * 1.5) * 0.3;
  return (wave1 + wave2 + 1) * 0.5;
}

export function glassReflection(x: number, y: number, time: number): number {
  const shimmer = Math.sin(x * 0.1 + y * 0.1 + time * 0.5);
  return shimmer * 0.3 + 0.7;
}

export function bubbleWobble(time: number, seed: number): number {
  return Math.sin(time * 3 + seed * 10) * 0.1 + 1;
}

export function pourCurve(t: number): number {
  return Math.sin(t * Math.PI) * (1 - t);
}

export function splashRadius(t: number): number {
  return Math.sqrt(t) * (1 - t * 0.5);
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

export function getRainbowColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.91, g: 0.30, b: 0.24 }, // Red
    { r: 0.90, g: 0.49, b: 0.13 }, // Orange
    { r: 0.95, g: 0.77, b: 0.06 }, // Yellow
    { r: 0.18, g: 0.80, b: 0.44 }, // Green
    { r: 0.10, g: 0.74, b: 0.61 }, // Teal
    { r: 0.20, g: 0.60, b: 0.86 }, // Blue
    { r: 0.61, g: 0.35, b: 0.71 }, // Purple
    { r: 0.91, g: 0.12, b: 0.39 }, // Pink
  ];
  return colors[index % colors.length];
}

export function getBubbleColor(): { r: number; g: number; b: number } {
  return { r: 0.9, g: 0.95, b: 1.0 };
}

export function getGlassColor(): { r: number; g: number; b: number } {
  return { r: 0.85, g: 0.90, b: 0.95 };
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
