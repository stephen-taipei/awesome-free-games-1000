/**
 * Math Utilities - Magnet Puzzle
 * Plasma Physics Lab / Electromagnetic Field Theme
 * Game #052
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Plasma oscillation - for glowing plasma effects
export function plasmaOscillation(time: number, frequency: number = 3.0): number {
  const base = Math.sin(time * frequency);
  const harmonic = Math.sin(time * frequency * 2.3) * 0.3;
  const sub = Math.sin(time * frequency * 0.7) * 0.2;
  return (base + harmonic + sub) * 0.5 + 0.5;
}

// Electromagnetic field strength - for field visualization
export function fieldStrength(distance: number, power: number = 1.0): number {
  // Inverse square law for magnetic fields
  const minDist = 0.1;
  const d = Math.max(distance, minDist);
  return power / (d * d);
}

// Field line curvature - for magnetic field lines
export function fieldLineCurve(t: number, polarity: number): number {
  // Polarity: 1 for N (outward), -1 for S (inward)
  return Math.sin(t * Math.PI) * polarity;
}

// Arc discharge pattern - for energy arcs
export function arcDischarge(time: number, position: number): number {
  const noise = Math.sin(position * 50 + time * 20) * 0.3;
  const pulse = Math.pow(Math.sin(time * 15 + position * 5), 2);
  const flicker = Math.random() > 0.95 ? 0.5 : 0;
  return clamp(pulse + noise + flicker, 0, 1);
}

// Plasma containment ripple - for containment field effects
export function containmentRipple(distance: number, time: number): number {
  const wave = Math.sin(distance * 20 - time * 5) * 0.5 + 0.5;
  const decay = Math.exp(-distance * 3);
  return wave * decay;
}

// Energy flow pattern - for flowing energy visualization
export function energyFlow(position: number, time: number): number {
  const flow = Math.sin(position * 10 - time * 3);
  const pulse = Math.sin(time * 8) * 0.3;
  return (flow + pulse) * 0.5 + 0.5;
}

// Attraction force visualization
export function attractionForce(distance: number, time: number): number {
  const pull = 1 / (1 + distance * 5);
  const oscillation = Math.sin(time * 10) * 0.1 + 0.9;
  return pull * oscillation;
}

// Repulsion force visualization
export function repulsionForce(distance: number, time: number): number {
  const push = Math.exp(-distance * 2);
  const burst = Math.abs(Math.sin(time * 12));
  return push * burst;
}

// Lab grid flicker - for high-tech lab atmosphere
export function labGridFlicker(time: number): number {
  const stable = 0.8;
  const flicker = Math.sin(time * 60) > 0.98 ? 0.3 : 0;
  const hum = Math.sin(time * 120) * 0.02;
  return stable + flicker + hum;
}

// Polarity glow intensity
export function polarityGlow(polarity: 'N' | 'S', time: number): number {
  const base = 0.7;
  const pulse = Math.sin(time * (polarity === 'N' ? 4 : 5)) * 0.15;
  const flare = Math.pow(Math.sin(time * 2), 4) * 0.15;
  return base + pulse + flare;
}

// Magnetic field vector direction
export function magneticFieldVector(
  px: number, py: number,
  mx: number, my: number,
  polarity: number
): { x: number; y: number } {
  const dx = px - mx;
  const dy = py - my;
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
  const strength = polarity / (dist * dist);
  return {
    x: (dx / dist) * strength,
    y: (dy / dist) * strength
  };
}

// Particle spiral for plasma containment
export function plasmaSpiral(angle: number, time: number, radius: number): { x: number; y: number } {
  const spiralAngle = angle + time * 2;
  const r = radius * (1 + Math.sin(time * 3) * 0.1);
  return {
    x: Math.cos(spiralAngle) * r,
    y: Math.sin(spiralAngle) * r
  };
}
