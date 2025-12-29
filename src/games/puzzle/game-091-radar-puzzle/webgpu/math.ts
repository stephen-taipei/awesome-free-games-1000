/**
 * WebGPU Math Utilities - Radar Puzzle
 * Radar / Sonar / Military Theme
 * Game #091
 */

export function radarSweep(time: number, speed: number = 1): number {
  return (time * speed) % (Math.PI * 2);
}

export function sonarPing(time: number, frequency: number = 1): number {
  return Math.sin(time * frequency * Math.PI * 2) * 0.5 + 0.5;
}

export function blipFade(age: number, maxAge: number): number {
  return Math.max(0, 1 - age / maxAge);
}

export function scanPulse(distance: number, time: number): number {
  const pulse = (time * 2) % 1;
  const diff = Math.abs(distance - pulse);
  return Math.max(0, 1 - diff * 10);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function getRadarColor(intensity: number): { r: number; g: number; b: number } {
  // Classic radar green
  return {
    r: 0.1 * intensity,
    g: 0.8 * intensity,
    b: 0.3 * intensity,
  };
}

export function getSonarColor(depth: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 0.2, g: 0.9, b: 0.5 },   // Bright green
    { r: 0.1, g: 0.7, b: 0.4 },   // Medium green
    { r: 0.15, g: 0.6, b: 0.35 }, // Teal green
    { r: 0.2, g: 0.5, b: 0.3 },   // Dark green
    { r: 0.3, g: 0.8, b: 0.6 },   // Light teal
    { r: 0.1, g: 0.65, b: 0.45 }, // Aqua green
  ];
  return colors[Math.abs(Math.floor(depth)) % colors.length];
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r, g, b };
}
