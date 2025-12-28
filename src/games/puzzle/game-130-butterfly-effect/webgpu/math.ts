/**
 * Math utilities for WebGPU - Butterfly Effect
 * Nature / Butterfly Theme
 * Game #130
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

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Nature/Butterfly color palette
export const NATURE_COLORS = {
  butterflyPink: [0.91, 0.12, 0.39],
  butterflyOrange: [0.96, 0.49, 0.13],
  butterflyYellow: [1.0, 0.92, 0.23],
  flowerPink: [1.0, 0.41, 0.71],
  flowerGold: [1.0, 0.84, 0.0],
  leafGreen: [0.13, 0.55, 0.13],
  skyBlue: [0.53, 0.81, 0.92],
  grassGreen: [0.49, 0.99, 0.0],
  white: [1.0, 1.0, 1.0],
  warmGlow: [1.0, 0.96, 0.88]
};

export function hexToRgb(hex: string): number[] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ]
    : [1, 0, 0];
}
