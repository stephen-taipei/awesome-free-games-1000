/**
 * Math Utilities - Fruit Ninja
 * Ninja / Dojo / Dark Red and Black Theme
 * Game #163
 */

export const NINJA_COLORS = {
  // Background
  dojoBlack: [0.10, 0.10, 0.18, 1.0] as [number, number, number, number],
  dojoDeep: [0.09, 0.13, 0.24, 1.0] as [number, number, number, number],
  woodBrown: [0.36, 0.25, 0.18, 1.0] as [number, number, number, number],

  // Blade
  bladeSilver: [0.85, 0.88, 0.92, 1.0] as [number, number, number, number],
  bladeGlow: [1.0, 1.0, 1.0, 0.8] as [number, number, number, number],

  // Fruits
  appleRed: [0.91, 0.30, 0.24, 1.0] as [number, number, number, number],
  orangeOrange: [0.95, 0.61, 0.07, 1.0] as [number, number, number, number],
  watermelonGreen: [0.15, 0.68, 0.38, 1.0] as [number, number, number, number],
  watermelonRed: [1.0, 0.42, 0.42, 1.0] as [number, number, number, number],
  bananaYellow: [0.95, 0.77, 0.06, 1.0] as [number, number, number, number],
  fruitFlesh: [1.0, 0.98, 0.90, 1.0] as [number, number, number, number],

  // Bomb
  bombBlack: [0.17, 0.24, 0.31, 1.0] as [number, number, number, number],
  fuseOrange: [0.95, 0.61, 0.07, 1.0] as [number, number, number, number],
  explosionRed: [0.91, 0.30, 0.24, 1.0] as [number, number, number, number],

  // Juice
  juiceRed: [0.91, 0.30, 0.24, 0.8] as [number, number, number, number],
  juiceOrange: [0.95, 0.61, 0.07, 0.8] as [number, number, number, number],
  juiceGreen: [0.15, 0.68, 0.38, 0.8] as [number, number, number, number],
  juiceYellow: [0.95, 0.77, 0.06, 0.8] as [number, number, number, number],

  // Combo / UI
  comboGold: [1.0, 0.84, 0.0, 1.0] as [number, number, number, number],
  ninjaRed: [0.80, 0.15, 0.15, 1.0] as [number, number, number, number],
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
  a: [number, number, number, number],
  b: [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function vec2Length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function normalize2D(x: number, y: number): [number, number] {
  const len = vec2Length(x, y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

export function getRandomJuiceColor(): [number, number, number, number] {
  const colors = [
    NINJA_COLORS.juiceRed,
    NINJA_COLORS.juiceOrange,
    NINJA_COLORS.juiceGreen,
    NINJA_COLORS.juiceYellow,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getFruitColor(fruitType: string): [number, number, number, number] {
  switch (fruitType) {
    case 'apple': return NINJA_COLORS.appleRed;
    case 'orange': return NINJA_COLORS.orangeOrange;
    case 'watermelon': return NINJA_COLORS.watermelonRed;
    case 'banana': return NINJA_COLORS.bananaYellow;
    default: return NINJA_COLORS.appleRed;
  }
}
