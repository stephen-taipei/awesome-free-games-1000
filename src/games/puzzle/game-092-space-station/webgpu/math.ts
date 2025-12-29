/**
 * WebGPU Math Utilities - Space Station
 * Space Station / Nebula / Cosmic Theme
 * Game #092
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

// Space station orbit path
export function orbitPath(angle: number, radius: number, wobble: number = 0): [number, number] {
  const r = radius + Math.sin(angle * 3) * wobble;
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

// Nebula cloud pattern
export function nebulaCloud(x: number, y: number, time: number): number {
  const n1 = Math.sin(x * 2 + time) * Math.cos(y * 2 - time * 0.5);
  const n2 = Math.sin(x * 3 - y * 2 + time * 0.7) * 0.5;
  const n3 = Math.cos(x * y * 0.5 + time * 0.3) * 0.3;
  return (n1 + n2 + n3) * 0.5 + 0.5;
}

// Star twinkle effect
export function starTwinkle(seed: number, time: number): number {
  const base = Math.sin(seed * 12345.6789 + time * 2) * 0.5 + 0.5;
  const flicker = Math.sin(seed * 98765.4321 + time * 8) * 0.2;
  return clamp(base + flicker, 0.3, 1.0);
}

// Thruster flame pattern
export function thrusterFlame(progress: number, time: number): number {
  const wave = Math.sin(progress * Math.PI * 4 + time * 10) * 0.3;
  const decay = 1 - progress;
  return clamp(decay + wave * decay, 0, 1);
}

// Docking energy pulse
export function dockingPulse(distance: number, time: number, speed: number = 1): number {
  const wave = Math.sin(distance * 10 - time * speed * 5);
  const envelope = Math.exp(-distance * 2);
  return wave * envelope;
}

// Deep space blue
export function getSpaceColor(depth: number): [number, number, number] {
  const r = lerp(0.04, 0.1, depth);
  const g = lerp(0.04, 0.15, depth);
  const b = lerp(0.1, 0.25, depth);
  return [r, g, b];
}

// Nebula purple/pink
export function getNebulaColor(intensity: number): [number, number, number] {
  const r = lerp(0.3, 0.8, intensity);
  const g = lerp(0.1, 0.3, intensity);
  const b = lerp(0.5, 0.9, intensity);
  return [r, g, b];
}

// Station blue glow
export function getStationColor(energy: number): [number, number, number] {
  const r = lerp(0.45, 0.6, energy);
  const g = lerp(0.73, 0.9, energy);
  const b = lerp(1.0, 1.0, energy);
  return [r, g, b];
}

// Thruster orange/blue
export function getThrusterColor(heat: number): [number, number, number] {
  if (heat > 0.7) {
    // Hot core - white/blue
    return [lerp(0.8, 1.0, heat), lerp(0.9, 1.0, heat), 1.0];
  } else if (heat > 0.3) {
    // Mid - orange
    return [1.0, lerp(0.4, 0.8, heat), lerp(0.1, 0.4, heat)];
  } else {
    // Outer - red/orange
    return [1.0, lerp(0.2, 0.5, heat), 0.1];
  }
}

// Docking success green
export function getDockColor(success: number): [number, number, number] {
  const r = lerp(0.18, 0.3, success);
  const g = lerp(0.8, 1.0, success);
  const b = lerp(0.44, 0.6, success);
  return [r, g, b];
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
