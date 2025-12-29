/**
 * WebGPU Math Utilities - Screw Puzzle
 * Workshop / Industrial / Metallic Theme
 * Game #085
 */

export function metalShine(x: number, y: number, time: number): number {
  const shimmer = Math.sin(x * 0.05 + y * 0.03 + time * 0.8);
  return shimmer * 0.3 + 0.7;
}

export function sparkTrail(angle: number, time: number): { x: number; y: number } {
  const radius = 30 + time * 15;
  return {
    x: Math.cos(angle + time * 8) * radius,
    y: Math.sin(angle + time * 8) * radius,
  };
}

export function screwRotation(progress: number): number {
  return progress * Math.PI * 4; // 2 full rotations
}

export function industrialPulse(time: number): number {
  return 0.8 + Math.sin(time * 4) * 0.2;
}

export function gearTeeth(angle: number, teeth: number): number {
  return Math.abs(Math.sin(angle * teeth)) * 0.3 + 0.7;
}

export function vibration(time: number, intensity: number): number {
  return Math.sin(time * 25) * intensity;
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

export function getMetalColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.75, g: 0.75, b: 0.78 }, // Silver
    { r: 0.83, g: 0.69, b: 0.22 }, // Brass
    { r: 0.72, g: 0.45, b: 0.20 }, // Copper
    { r: 0.40, g: 0.40, b: 0.42 }, // Steel
    { r: 0.90, g: 0.90, b: 0.88 }, // Chrome
    { r: 0.55, g: 0.55, b: 0.60 }, // Iron
  ];
  return colors[index % colors.length];
}

export function getSparkColor(): { r: number; g: number; b: number } {
  const colors = [
    { r: 1.0, g: 0.85, b: 0.2 },  // Yellow spark
    { r: 1.0, g: 0.6, b: 0.1 },   // Orange spark
    { r: 1.0, g: 0.95, b: 0.8 },  // White hot
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getWoodColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.55, g: 0.27, b: 0.07 }, // Dark wood
    { r: 0.63, g: 0.32, b: 0.18 }, // Medium wood
    { r: 0.80, g: 0.52, b: 0.25 }, // Light wood
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
