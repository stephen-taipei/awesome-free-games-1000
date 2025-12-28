/**
 * Math Utilities - Traffic Sign
 * Urban / Road / Traffic Theme
 * Game #135
 */

export const TRAFFIC_COLORS = {
  // Road colors
  asphalt: [0.17, 0.24, 0.31, 1.0],       // Dark asphalt
  roadLine: [0.95, 0.8, 0.2, 1.0],        // Yellow road marking
  whiteMarking: [0.95, 0.95, 0.95, 1.0],  // White road marking

  // Sign colors
  stopRed: [0.91, 0.30, 0.24, 1.0],       // Stop sign red
  warningYellow: [0.95, 0.77, 0.06, 1.0], // Warning yellow
  infoBlue: [0.20, 0.60, 0.86, 1.0],      // Info sign blue
  goGreen: [0.18, 0.80, 0.44, 1.0],       // Go/success green

  // Urban elements
  trafficCone: [1.0, 0.5, 0.0, 1.0],      // Orange cone
  headlight: [1.0, 0.95, 0.7, 1.0],       // Car headlight
  taillight: [0.9, 0.2, 0.15, 1.0],       // Car taillight
  streetlight: [1.0, 0.9, 0.6, 1.0],      // Street lamp glow

  // Background
  nightSky: [0.08, 0.12, 0.18, 1.0],      // Night sky
  dusk: [0.25, 0.15, 0.25, 1.0],          // Dusk purple
} as const;

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

export function lerpColor(
  color1: readonly number[],
  color2: readonly number[],
  t: number
): number[] {
  return [
    lerp(color1[0], color2[0], t),
    lerp(color1[1], color2[1], t),
    lerp(color1[2], color2[2], t),
    lerp(color1[3], color2[3], t),
  ];
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function getSignColor(signColor: string): readonly number[] {
  switch (signColor) {
    case '#e74c3c': return TRAFFIC_COLORS.stopRed;
    case '#f1c40f': return TRAFFIC_COLORS.warningYellow;
    case '#3498db': return TRAFFIC_COLORS.infoBlue;
    case '#2ecc71': return TRAFFIC_COLORS.goGreen;
    case '#f39c12': return TRAFFIC_COLORS.trafficCone;
    default: return TRAFFIC_COLORS.whiteMarking;
  }
}
