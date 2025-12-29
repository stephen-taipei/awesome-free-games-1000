/**
 * Math Utilities - Path Finder
 * Neon Circuit / Electronic Data Flow Theme
 * Game #050
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Circuit pulse wave
export function circuitPulse(time: number, frequency: number = 2): number {
  const t = (time * frequency) % 1;
  return t < 0.1 ? t / 0.1 : t < 0.2 ? 1 - (t - 0.1) / 0.1 : 0;
}

// Signal propagation wave
export function signalWave(time: number, offset: number, speed: number = 3): number {
  const t = (time * speed + offset) % 1;
  const width = 0.15;
  if (t < width) {
    return Math.sin(t / width * Math.PI);
  }
  return 0;
}

// Electric flicker effect
export function electricFlicker(time: number, seed: number): number {
  const base = Math.sin(time * 20 + seed * 100) * 0.5 + 0.5;
  const noise = Math.sin(time * 47 + seed * 73) * 0.3;
  return clamp(base + noise, 0, 1);
}

// Data flow along path
export function dataFlow(time: number, position: number, speed: number = 2): number {
  const t = (time * speed - position) % 1;
  if (t < 0) return 0;
  return Math.exp(-t * 5) * Math.sin(t * Math.PI * 4);
}

// Neon glow intensity
export function neonGlow(time: number, base: number = 0.8): number {
  const flicker = Math.sin(time * 30) * 0.05;
  const pulse = Math.sin(time * 2) * 0.1;
  return clamp(base + flicker + pulse, 0, 1);
}

// Grid trace pattern
export function tracePattern(x: number, y: number, gridSize: number = 0.1): number {
  const gx = (x % gridSize) / gridSize;
  const gy = (y % gridSize) / gridSize;
  const traceWidth = 0.05;
  const isHorizontal = gy < traceWidth || gy > 1 - traceWidth;
  const isVertical = gx < traceWidth || gx > 1 - traceWidth;
  return (isHorizontal || isVertical) ? 1 : 0;
}

// Connection node pulse
export function nodePulse(time: number, id: number): number {
  const offset = id * 0.3;
  const t = (time * 1.5 + offset) % 1;
  return 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
}

// Voltage spike
export function voltageSpikeA(time: number, frequency: number = 4): number {
  const t = (time * frequency) % 1;
  if (t < 0.05) return t / 0.05;
  if (t < 0.1) return 1 - (t - 0.05) / 0.05;
  return 0;
}

// Distance calculation
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Angle calculation
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Ease out quad
export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

// Ease in out sine
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
