/**
 * Math Utilities - DNA Match
 * Biology / Science / DNA Helix Theme
 * Game #134
 */

export const DNA_COLORS = {
  // Base pair colors
  adenine: [0.85, 0.25, 0.25, 1.0],      // Red - A
  thymine: [0.25, 0.55, 0.85, 1.0],      // Blue - T
  guanine: [0.25, 0.75, 0.35, 1.0],      // Green - G
  cytosine: [0.9, 0.8, 0.2, 1.0],        // Yellow - C

  // Science/Lab colors
  helixBackbone: [0.4, 0.45, 0.55, 1.0], // Steel blue backbone
  labGlass: [0.7, 0.85, 0.95, 0.6],      // Glass/beaker color
  bioGlow: [0.3, 0.9, 0.6, 1.0],         // Bioluminescent green
  scienceBlue: [0.2, 0.4, 0.8, 1.0],     // Lab blue
  moleculeWhite: [0.95, 0.95, 1.0, 1.0], // Molecule highlight
  energyPurple: [0.6, 0.3, 0.9, 1.0],    // Energy/bond color

  // Background
  labDark: [0.08, 0.1, 0.15, 1.0],       // Dark lab background
  gridLine: [0.15, 0.2, 0.3, 0.4],       // Grid lines
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

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function getBaseColor(base: string): readonly number[] {
  switch (base.toUpperCase()) {
    case 'A': return DNA_COLORS.adenine;
    case 'T': return DNA_COLORS.thymine;
    case 'G': return DNA_COLORS.guanine;
    case 'C': return DNA_COLORS.cytosine;
    default: return DNA_COLORS.moleculeWhite;
  }
}
