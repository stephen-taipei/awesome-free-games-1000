/**
 * WebGPU Math Utilities - Castle Mechanism
 * Medieval Castle / Steampunk Theme
 * Game #122
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

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Medieval castle color palette
export const COLORS = {
  // Stone
  stoneLight: [0.42, 0.40, 0.38],
  stoneDark: [0.30, 0.28, 0.26],
  stoneAccent: [0.50, 0.48, 0.44],

  // Metal / Mechanism
  brass: [0.71, 0.53, 0.26],
  brassShiny: [0.85, 0.68, 0.40],
  iron: [0.40, 0.40, 0.42],
  ironDark: [0.25, 0.25, 0.27],
  copper: [0.72, 0.45, 0.20],

  // Gears
  gearGold: [0.80, 0.60, 0.20],
  gearBronze: [0.55, 0.35, 0.15],

  // Effects
  spark: [1.0, 0.85, 0.40],
  steam: [0.85, 0.85, 0.90],
  glow: [0.30, 0.80, 0.45],

  // Mechanism colors
  leverRed: [0.91, 0.30, 0.24],
  gearOrange: [0.90, 0.50, 0.13],
  buttonGreen: [0.18, 0.80, 0.44],
  wheelYellow: [0.95, 0.61, 0.07],
} as const;

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function gearRotation(t: number, speed: number = 1): number {
  return t * Math.PI * 2 * speed;
}
