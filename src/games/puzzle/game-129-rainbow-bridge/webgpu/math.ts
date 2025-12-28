/**
 * WebGPU Math Utilities - Rainbow Bridge
 * Rainbow / Sky Theme
 * Game #129
 */

// Rainbow color palette
export const COLORS = {
  // Rainbow spectrum
  red: [0.91, 0.3, 0.24],
  orange: [0.9, 0.49, 0.13],
  yellow: [0.95, 0.77, 0.06],
  green: [0.18, 0.8, 0.44],
  blue: [0.2, 0.6, 0.86],
  indigo: [0.61, 0.35, 0.71],
  violet: [0.56, 0.27, 0.68],

  // Sky colors
  skyBlue: [0.53, 0.81, 0.92],
  skyLight: [0.88, 0.97, 0.98],
  cloudWhite: [1.0, 1.0, 1.0],
  cloudShadow: [0.9, 0.92, 0.95],

  // Effects
  sparkle: [1.0, 1.0, 1.0],
  goldGlow: [1.0, 0.84, 0.0],
  prismLight: [0.95, 0.95, 1.0],

  // Ground
  grassGreen: [0.4, 0.73, 0.42],
  grassDark: [0.3, 0.55, 0.3],
};

// Get rainbow color by index
export function getRainbowColor(index: number): number[] {
  const colors = [
    COLORS.red,
    COLORS.orange,
    COLORS.yellow,
    COLORS.green,
    COLORS.blue,
    COLORS.indigo,
    COLORS.violet,
  ];
  return colors[index % colors.length];
}

// Easing functions
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

// Utility functions
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function lerpColor(a: number[], b: number[], t: number): number[] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
