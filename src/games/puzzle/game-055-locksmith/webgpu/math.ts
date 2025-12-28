/**
 * Math Utilities - Locksmith
 * Vintage Locksmith Workshop / Steampunk Theme
 * Game #055
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

// Gear rotation pattern
export function gearRotation(angle: number, teeth: number, time: number): number {
  const tooth = Math.sin(angle * teeth + time * 2);
  return tooth > 0.8 ? 1 : smoothstep(0.5, 0.8, tooth);
}

// Lock tumbler movement
export function tumblerMovement(position: number, spring: number, time: number): number {
  const oscillation = Math.sin(time * spring * 10) * Math.exp(-time * 2);
  return position + oscillation * 0.1;
}

// Metal reflection shimmer
export function metalShimmer(position: number, angle: number, time: number): number {
  const shimmer = Math.sin(position * 20 + angle + time * 3);
  return smoothstep(0.7, 1.0, shimmer) * 0.5;
}

// Key slot depth
export function keySlotDepth(x: number, pattern: number[]): number {
  const index = Math.floor(x * pattern.length) % pattern.length;
  return pattern[index] || 0;
}

// Pin spring tension
export function springTension(displacement: number, stiffness: number): number {
  return displacement * stiffness * (1 + Math.sin(displacement * 10) * 0.1);
}

// Brass patina texture
export function brassPatina(x: number, y: number, age: number): number {
  const noise = Math.sin(x * 50) * Math.sin(y * 50);
  const patina = smoothstep(0.3, 0.7, noise + age * 0.5);
  return patina;
}

// Lock mechanism click
export function mechanismClick(progress: number): number {
  const clicks = [0.25, 0.5, 0.75, 1.0];
  for (const click of clicks) {
    if (Math.abs(progress - click) < 0.02) {
      return 1 - Math.abs(progress - click) / 0.02;
    }
  }
  return 0;
}

// Oil drip pattern
export function oilDrip(y: number, time: number, seed: number): number {
  const drip = Math.sin(y * 5 + time * 2 + seed * 10) * 0.5 + 0.5;
  const gravity = Math.max(0, 1 - y * 0.5);
  return drip * gravity;
}

// Keyhole light flicker
export function keyholeLight(distance: number, time: number): number {
  const flicker = Math.sin(time * 20) * 0.1 + 0.9;
  const glow = Math.exp(-distance * 3);
  return glow * flicker;
}

// Cylinder rotation resistance
export function cylinderResistance(angle: number, pins: number[]): number {
  let resistance = 0;
  for (let i = 0; i < pins.length; i++) {
    resistance += (1 - pins[i]) * Math.cos(angle + i);
  }
  return clamp(resistance / pins.length, 0, 1);
}

// Steampunk steam puff
export function steamPuff(x: number, y: number, time: number): { dx: number; dy: number; density: number } {
  const angle = Math.atan2(y, x) + time * 0.5;
  const dist = Math.sqrt(x * x + y * y);
  return {
    dx: Math.cos(angle) * 0.01,
    dy: -0.02 - Math.random() * 0.01,
    density: Math.exp(-dist * 2) * (Math.sin(time * 5) * 0.3 + 0.7)
  };
}

// Vintage metal wear
export function metalWear(x: number, y: number): number {
  const scratch = Math.sin(x * 100 + y * 50) * Math.sin(x * 30 - y * 70);
  return smoothstep(0.6, 1.0, scratch) * 0.3;
}

// Lock shackle swing
export function shackleSwing(time: number, unlocked: boolean): number {
  if (!unlocked) return 0;
  const swing = Math.sin(time * 3) * Math.exp(-time * 0.5);
  return swing * 0.3;
}

// Torsion wrench tension
export function torsionTension(angle: number): number {
  return Math.sin(angle * Math.PI) * (1 - Math.cos(angle * Math.PI * 2) * 0.2);
}

// Pick tool vibration
export function pickVibration(time: number, intensity: number): number {
  return Math.sin(time * 100) * intensity * Math.exp(-time * 10);
}
