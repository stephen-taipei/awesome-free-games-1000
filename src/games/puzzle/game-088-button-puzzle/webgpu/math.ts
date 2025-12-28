/**
 * WebGPU Math Utilities - Button Puzzle
 * Arcade / Neon / Retro Theme
 * Game #088
 */

export function neonPulse(time: number, speed: number = 3): number {
  return 0.7 + Math.sin(time * speed) * 0.3;
}

export function arcadeFlash(time: number, buttonIndex: number): number {
  const offset = buttonIndex * 0.5;
  return Math.pow(Math.sin(time * 5 + offset) * 0.5 + 0.5, 2);
}

export function retroWave(x: number, y: number, time: number): number {
  return Math.sin(x * 0.1 + time * 2) * Math.cos(y * 0.1 + time * 1.5) * 0.5 + 0.5;
}

export function ringExpand(time: number, maxRadius: number): number {
  return (time % 1) * maxRadius;
}

export function sparklePhase(seed: number, time: number): { x: number; y: number; alpha: number } {
  const angle = seed * Math.PI * 2 + time * 3;
  const radius = 10 + Math.sin(time * 5 + seed) * 5;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    alpha: 0.5 + Math.sin(time * 8 + seed * 4) * 0.5,
  };
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
    { r: 1.0, g: 0.2, b: 0.4 },   // Neon red
    { r: 0.2, g: 0.6, b: 1.0 },   // Neon blue
    { r: 0.2, g: 1.0, b: 0.5 },   // Neon green
    { r: 1.0, g: 0.9, b: 0.2 },   // Neon yellow
    { r: 0.7, g: 0.3, b: 1.0 },   // Neon purple
    { r: 0.2, g: 1.0, b: 0.9 },   // Neon cyan
    { r: 1.0, g: 0.5, b: 0.1 },   // Neon orange
    { r: 1.0, g: 0.4, b: 0.7 },   // Neon pink
    { r: 0.9, g: 0.9, b: 1.0 },   // Neon white
  ];
  return colors[index % colors.length];
}

export function getArcadeColor(intensity: number): { r: number; g: number; b: number } {
  // Purple to magenta arcade gradient
  return {
    r: lerp(0.4, 1.0, intensity),
    g: lerp(0.2, 0.4, intensity),
    b: lerp(0.8, 1.0, intensity),
  };
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
