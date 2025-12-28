/**
 * Math Utilities - Mechanism Puzzle
 * Steampunk / Clockwork / Industrial Brass Theme
 * Game #066
 */

// Steam vapor rising effect
export function steamRise(y: number, time: number, speed: number = 1): number {
  const rise = y - time * speed * 30;
  const wave = Math.sin(time * 2 + y * 0.1) * 5;
  return rise + wave;
}

// Steam dispersion (spreading as it rises)
export function steamSpread(life: number): number {
  return 1 + (1 - life) * 2;
}

// Gear rotation with mechanical tick
export function gearRotation(time: number, speed: number = 1, teeth: number = 8): number {
  const tickAmount = (Math.PI * 2) / teeth;
  const baseRotation = time * speed;
  const tickPhase = Math.floor(baseRotation / tickAmount);
  const tickProgress = (baseRotation / tickAmount) - tickPhase;
  // Smooth tick with slight pause at each tooth
  const smoothTick = Math.pow(tickProgress, 0.8);
  return (tickPhase + smoothTick) * tickAmount;
}

// Spark trajectory with gravity
export function sparkTrajectory(
  startX: number,
  startY: number,
  vx: number,
  vy: number,
  time: number,
  gravity: number = 200
): { x: number; y: number } {
  return {
    x: startX + vx * time,
    y: startY + vy * time + 0.5 * gravity * time * time,
  };
}

// Pressure gauge oscillation
export function pressureOscillation(time: number, pressure: number = 0.7): number {
  const baseAngle = pressure * Math.PI * 0.8;
  const flutter = Math.sin(time * 15) * 0.02 * pressure;
  const surge = Math.sin(time * 3) * 0.05;
  return baseAngle + flutter + surge;
}

// Piston movement
export function pistonPosition(time: number, phase: number = 0): number {
  return Math.sin(time * 4 + phase) * 0.5 + 0.5;
}

// Brass metal glow (warm reflection)
export function brassGlow(x: number, y: number, time: number): number {
  const flicker = Math.sin(time * 8 + x * 0.1) * 0.1 + 0.9;
  const highlight = Math.cos(y * 0.05 + time) * 0.15 + 0.85;
  return flicker * highlight;
}

// Rivet pattern
export function rivetPattern(x: number, y: number, spacing: number = 20): boolean {
  const nx = Math.floor(x / spacing);
  const ny = Math.floor(y / spacing);
  const fx = (x / spacing) - nx;
  const fy = (y / spacing) - ny;
  const centerDist = Math.sqrt((fx - 0.5) ** 2 + (fy - 0.5) ** 2);
  return centerDist < 0.15;
}

// Chain link position
export function chainLinkPosition(index: number, swing: number, time: number): { x: number; y: number; rotation: number } {
  const baseY = index * 15;
  const swingAngle = Math.sin(time * 2 + index * 0.3) * swing;
  const x = Math.sin(swingAngle) * index * 3;
  return {
    x,
    y: baseY + Math.cos(swingAngle) * 2,
    rotation: swingAngle,
  };
}

// Valve wheel rotation
export function valveRotation(time: number, opening: boolean): number {
  if (!opening) return 0;
  return time * 3; // Continuous rotation when opening
}

// Pipe steam leak
export function steamLeak(position: number, time: number): number {
  const burstCycle = Math.sin(time * 5 + position) * 0.5 + 0.5;
  const leak = Math.pow(burstCycle, 3);
  return leak;
}

// Cog teeth collision timing
export function cogMesh(rotation1: number, rotation2: number, teeth: number = 8): boolean {
  const tooth1 = (rotation1 * teeth / (Math.PI * 2)) % 1;
  const tooth2 = (rotation2 * teeth / (Math.PI * 2)) % 1;
  return Math.abs(tooth1 - tooth2) < 0.1 || Math.abs(tooth1 - tooth2 - 1) < 0.1;
}

// Industrial smoke color
export function smokeColor(life: number): { r: number; g: number; b: number } {
  const gray = 0.3 + life * 0.2;
  return {
    r: gray + 0.05,
    g: gray,
    b: gray - 0.02,
  };
}

// Brass color with patina variation
export function brassColor(variation: number = 0): { r: number; g: number; b: number } {
  const base = {
    r: 0.85 + variation * 0.1,
    g: 0.65 + variation * 0.15,
    b: 0.25 + variation * 0.1,
  };
  return base;
}

// Copper accent color
export function copperColor(age: number = 0): { r: number; g: number; b: number } {
  // New copper is orange-red, aged is green patina
  if (age < 0.5) {
    return { r: 0.85, g: 0.45, b: 0.25 };
  }
  return { r: 0.35, g: 0.55, b: 0.45 }; // Patina
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Clamp value
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Random in range
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Noise function for steam/smoke
export function noise2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// FBM for complex steam patterns
export function fbm(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}
