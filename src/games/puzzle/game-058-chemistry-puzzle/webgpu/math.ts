/**
 * Math Utilities - Chemistry Puzzle
 * Science Lab / Chemistry Laboratory Theme
 * Game #058
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

// Bubble rise path with wobble
export function bubblePath(t: number, seed: number): { x: number; y: number } {
  const phase = seed * Math.PI * 2;
  return {
    x: Math.sin(t * 3 + phase) * 0.1 + Math.sin(t * 7 + phase) * 0.03,
    y: -t * 2 - Math.sin(t * 5) * 0.05
  };
}

// Molecular bond vibration
export function moleculeBond(time: number, bondStrength: number): number {
  const vibration = Math.sin(time * 20) * (1 - bondStrength) * 0.1;
  const stretch = Math.sin(time * 8) * 0.02;
  return vibration + stretch;
}

// Liquid wave in beaker
export function liquidWave(x: number, time: number, viscosity: number): number {
  const wave1 = Math.sin(x * 4 + time * 2) * 0.05 * (1 - viscosity);
  const wave2 = Math.sin(x * 8 - time * 3) * 0.02 * (1 - viscosity);
  return wave1 + wave2;
}

// Chemical reaction glow
export function reactionGlow(distance: number, intensity: number, time: number): number {
  const pulse = Math.sin(time * 10) * 0.2 + 0.8;
  const glow = Math.exp(-distance * 3) * intensity * pulse;
  return glow;
}

// Smoke particle drift
export function smokeDrift(time: number, seed: number): { x: number; y: number } {
  const phase = seed * Math.PI * 2;
  return {
    x: Math.sin(time * 2 + phase) * 0.3 + Math.sin(time * 0.5 + phase) * 0.5,
    y: -time * 0.5 - Math.abs(Math.sin(time + phase)) * 0.1
  };
}

// Electron orbit path
export function electronOrbit(angle: number, radius: number, wobble: number, time: number): { x: number; y: number } {
  const r = radius + Math.sin(time * 10) * wobble;
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r * 0.6
  };
}

// Flask condensation drip
export function condensationDrip(progress: number): number {
  // Slow start, fast fall
  if (progress < 0.3) {
    return progress * 0.5;
  }
  return 0.15 + (progress - 0.3) * 1.2;
}

// Bunsen burner flame flicker
export function flameFlicker(x: number, time: number, intensity: number): number {
  const noise1 = Math.sin(x * 10 + time * 15) * 0.5;
  const noise2 = Math.sin(x * 25 + time * 30) * 0.3;
  const base = 1 - Math.abs(x) * 2;
  return Math.max(0, base + (noise1 + noise2) * intensity);
}

// pH indicator color shift
export function pHColor(pH: number): { r: number; g: number; b: number } {
  if (pH < 3) {
    return { r: 0.9, g: 0.2, b: 0.2 }; // Strong acid - red
  } else if (pH < 6) {
    return { r: 0.9, g: 0.6, b: 0.2 }; // Weak acid - orange
  } else if (pH < 8) {
    return { r: 0.2, g: 0.8, b: 0.3 }; // Neutral - green
  } else if (pH < 11) {
    return { r: 0.3, g: 0.5, b: 0.9 }; // Weak base - blue
  } else {
    return { r: 0.6, g: 0.2, b: 0.8 }; // Strong base - purple
  }
}

// Crystallization pattern
export function crystalGrowth(angle: number, time: number, branches: number): number {
  const segment = (angle / (Math.PI * 2)) * branches;
  const branch = Math.abs(Math.sin(segment * Math.PI));
  const growth = Math.min(1, time * 0.5);
  return branch * growth;
}

// Titration drop fall
export function dropFall(progress: number, viscosity: number): { y: number; stretch: number } {
  const gravity = 1 - viscosity * 0.5;
  const y = progress * progress * gravity;
  const stretch = Math.max(1, 1 + (1 - progress) * 0.5);
  return { y, stretch };
}

// Magnetic stirrer vortex
export function stirrerVortex(x: number, y: number, time: number, speed: number): { dx: number; dy: number } {
  const angle = Math.atan2(y, x) + time * speed;
  const dist = Math.sqrt(x * x + y * y);
  const pull = Math.exp(-dist * 3);
  return {
    dx: -Math.sin(angle) * pull * 0.1,
    dy: Math.cos(angle) * pull * 0.1
  };
}

// Gas diffusion pattern
export function gasDiffusion(x: number, y: number, time: number, density: number): number {
  const noise1 = Math.sin(x * 5 + time) * Math.cos(y * 5 + time);
  const noise2 = Math.sin(x * 10 - time * 2) * Math.cos(y * 10 + time * 2) * 0.5;
  return (noise1 + noise2) * density;
}
