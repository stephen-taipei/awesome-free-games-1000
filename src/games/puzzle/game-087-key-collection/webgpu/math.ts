/**
 * WebGPU Math Utilities - Key Collection
 * Dungeon / Golden / Mystery Theme
 * Game #087
 */

export function torchFlicker(time: number): number {
  return 0.8 + Math.sin(time * 8) * 0.15 + Math.sin(time * 13) * 0.05;
}

export function goldenShimmer(x: number, y: number, time: number): number {
  return Math.sin(x * 0.1 + y * 0.08 + time * 3) * 0.3 + 0.7;
}

export function keySparkle(angle: number, time: number): { x: number; y: number } {
  const wave = Math.sin(time * 5) * 0.2;
  return {
    x: Math.cos(angle + wave) * 15,
    y: Math.sin(angle + wave) * 15,
  };
}

export function mysteryPulse(time: number): number {
  return 0.6 + Math.sin(time * 2) * 0.4;
}

export function dustFloat(time: number, seed: number): { x: number; y: number } {
  return {
    x: Math.sin(time * 0.5 + seed * 3.14) * 20,
    y: Math.cos(time * 0.3 + seed * 2.71) * 15 - time * 5,
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

export function getGoldenColor(intensity: number): { r: number; g: number; b: number } {
  // Gold gradient from dark bronze to bright gold
  return {
    r: lerp(0.6, 1.0, intensity),
    g: lerp(0.4, 0.85, intensity),
    b: lerp(0.1, 0.2, intensity),
  };
}

export function getDungeonColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.95, g: 0.77, b: 0.06 }, // Gold
    { r: 0.90, g: 0.60, b: 0.10 }, // Bronze
    { r: 0.80, g: 0.50, b: 0.20 }, // Copper
    { r: 0.30, g: 0.50, b: 0.70 }, // Stone blue
    { r: 0.50, g: 0.35, b: 0.25 }, // Wood brown
    { r: 0.40, g: 0.60, b: 0.40 }, // Moss green
  ];
  return colors[index % colors.length];
}

export function getTorchColor(): { r: number; g: number; b: number } {
  const colors = [
    { r: 1.0, g: 0.7, b: 0.2 },
    { r: 1.0, g: 0.6, b: 0.15 },
    { r: 1.0, g: 0.8, b: 0.3 },
  ];
  return colors[Math.floor(Math.random() * colors.length)];
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
