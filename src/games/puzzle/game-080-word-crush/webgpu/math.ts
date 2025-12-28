/**
 * WebGPU Math Utilities - Word Crush
 * Literary / Typography Theme
 * Game #080
 */

export function inkFlow(x: number, y: number, time: number): number {
  const wave1 = Math.sin(x * 0.1 + time * 2) * 0.5;
  const wave2 = Math.cos(y * 0.08 - time * 1.5) * 0.5;
  return (wave1 + wave2 + 1) * 0.5;
}

export function letterPulse(time: number, phase: number = 0): number {
  return Math.sin(time * 3 + phase) * 0.3 + 0.7;
}

export function wordGlow(progress: number, time: number): number {
  const base = Math.sin(progress * Math.PI);
  const pulse = Math.sin(time * 4) * 0.2 + 0.8;
  return base * pulse;
}

export function typewriterFlash(time: number): number {
  return time % 1 < 0.5 ? 1 : 0.7;
}

export function paperTexture(x: number, y: number): number {
  const noise = Math.sin(x * 50) * Math.sin(y * 50) * 0.05;
  return 0.95 + noise;
}

export function inkSplatter(dist: number, time: number): number {
  const spread = Math.exp(-dist * 3) * (Math.sin(time * 5) * 0.2 + 0.8);
  return Math.max(0, spread);
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

export function getLetterColor(valid: boolean, selected: boolean): { r: number; g: number; b: number } {
  if (valid) {
    return { r: 0.2, g: 0.8, b: 0.4 }; // Green for valid
  }
  if (selected) {
    return { r: 1.0, g: 0.6, b: 0.2 }; // Orange for selected
  }
  return { r: 0.4, g: 0.3, b: 0.6 }; // Purple for default
}

export function getWarmColor(index: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 1.0, g: 0.4, b: 0.4 },   // Coral
    { r: 1.0, g: 0.6, b: 0.2 },   // Orange
    { r: 1.0, g: 0.8, b: 0.3 },   // Gold
    { r: 0.9, g: 0.5, b: 0.7 },   // Pink
    { r: 0.6, g: 0.4, b: 0.8 },   // Purple
  ];
  return colors[index % colors.length];
}

export function getInkColor(): { r: number; g: number; b: number } {
  return { r: 0.15, g: 0.1, b: 0.25 };
}
