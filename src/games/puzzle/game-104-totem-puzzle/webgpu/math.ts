/**
 * WebGPU Math Utilities - Totem Puzzle
 * Ancient Tribal / Spirit Theme
 * Game #104
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

// Flickering fire effect
export function fireFlicker(time: number, intensity: number = 1): number {
  const flicker1 = Math.sin(time * 15) * 0.1;
  const flicker2 = Math.sin(time * 23) * 0.05;
  const flicker3 = Math.sin(time * 37) * 0.03;
  return intensity * (0.85 + flicker1 + flicker2 + flicker3);
}

// Rising smoke/spirit motion
export function spiritRise(time: number, x: number): { x: number; y: number } {
  const wobble = Math.sin(time * 2 + x * 0.1) * 20;
  const drift = Math.sin(time * 0.5 + x * 0.05) * 10;
  return { x: wobble + drift, y: 0 };
}

// Tribal pattern generator (triangular/zigzag)
export function tribalPattern(x: number, y: number, scale: number = 50): number {
  const sx = x / scale;
  const sy = y / scale;
  const zigzag = Math.abs((sx % 2) - 1);
  const wave = Math.abs(Math.sin(sy * Math.PI));
  return (zigzag + wave) * 0.5;
}

// Totem carving depth simulation
export function carvingDepth(x: number, y: number, patternType: number): number {
  const scale = 30;
  const px = x / scale;
  const py = y / scale;

  switch (patternType % 4) {
    case 0: // Circular eyes
      const dist = Math.sqrt(px * px + py * py);
      return Math.sin(dist * 3) * 0.5 + 0.5;
    case 1: // Triangular teeth
      return Math.abs((px % 1) - 0.5) + Math.abs((py % 1) - 0.5);
    case 2: // Diamond pattern
      return (Math.abs(px % 2 - 1) + Math.abs(py % 2 - 1)) * 0.5;
    case 3: // Wave pattern
      return Math.sin(px * 2) * Math.cos(py * 2) * 0.5 + 0.5;
    default:
      return 0.5;
  }
}

// Spirit orb floating path
export function spiritPath(time: number, index: number): { x: number; y: number } {
  const phase = index * Math.PI * 2 / 5;
  const radius = 30 + Math.sin(time * 0.5 + phase) * 20;
  const angle = time * 0.3 + phase;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle * 1.5) * radius * 0.5 + Math.sin(time * 0.8) * 10
  };
}

// Ancient energy pulse
export function energyPulse(time: number, centerDistance: number): number {
  const wave = Math.sin(time * 2 - centerDistance * 0.1);
  return smoothstep(0.3, 1, wave) * Math.exp(-centerDistance * 0.02);
}

// Dust/particle drift
export function dustDrift(time: number, seed: number): { x: number; y: number } {
  const t = time + seed;
  return {
    x: Math.sin(t * 0.7) * 15 + Math.sin(t * 1.3) * 8,
    y: Math.sin(t * 0.5) * 10 + Math.cos(t * 0.9) * 5
  };
}

// Sacred geometry - hexagonal pattern
export function sacredHexagon(x: number, y: number, scale: number = 40): number {
  const px = x / scale;
  const py = y / scale * 1.732;
  const row = Math.floor(py);
  const col = Math.floor(px + (row % 2) * 0.5);
  const cx = col - (row % 2) * 0.5 + 0.5;
  const cy = row / 1.732 + 0.289;
  const dist = Math.sqrt((px - cx) ** 2 + (py / 1.732 - cy) ** 2);
  return smoothstep(0.4, 0.5, dist);
}

// Torch fire animation
export function torchFire(x: number, y: number, time: number): number {
  const noiseX = Math.sin(x * 0.1 + time * 3) * Math.cos(y * 0.15 + time * 2);
  const noiseY = Math.sin(y * 0.12 + time * 4) * Math.cos(x * 0.08 + time * 2.5);
  const turbulence = (noiseX + noiseY) * 0.5 + 0.5;
  const height = 1 - y * 0.01;
  return clamp(height * turbulence, 0, 1);
}
