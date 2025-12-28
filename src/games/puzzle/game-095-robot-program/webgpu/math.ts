/**
 * WebGPU Math Utilities - Robot Program
 * Cyber / Robot / Programming / Circuit Theme
 * Game #095
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

// Circuit pattern value
export function circuitPattern(x: number, y: number, scale: number = 20): number {
  const gx = Math.floor(x * scale);
  const gy = Math.floor(y * scale);
  const fx = (x * scale) % 1;
  const fy = (y * scale) % 1;

  // Create circuit-like junctions
  const junction = (gx + gy) % 3 === 0 ? 1 : 0;
  const hLine = fy > 0.45 && fy < 0.55 ? 1 : 0;
  const vLine = fx > 0.45 && fx < 0.55 ? 1 : 0;

  return Math.max(junction * 0.5, (hLine + vLine) * 0.3);
}

// Electric pulse wave
export function electricPulse(distance: number, time: number, speed: number = 2): number {
  const wave = Math.sin(distance * 10 - time * speed);
  return Math.max(0, wave * wave);
}

// Data flow animation
export function dataFlow(x: number, y: number, time: number): number {
  const flow = Math.sin(x * 5 + y * 3 - time * 2);
  const noise = Math.sin(x * 17 + y * 13) * 0.3;
  return clamp((flow + noise) * 0.5 + 0.5, 0, 1);
}

// Robot glow intensity
export function robotGlow(distance: number, pulseFactor: number = 1): number {
  return Math.exp(-distance * 3) * pulseFactor;
}

// Named cyber colors
export function getCyberColor(index: number): [number, number, number] {
  const colors: [number, number, number][] = [
    [0.0, 0.85, 1.0],   // #00d9ff - Cyan (primary)
    [0.18, 1.0, 0.42],  // #2ecc6b - Green (success)
    [1.0, 0.84, 0.0],   // #ffd600 - Yellow (warning)
    [1.0, 0.29, 0.29],  // #ff4b4b - Red (error)
    [0.65, 0.45, 1.0],  // #a673ff - Purple (data)
  ];
  return colors[index % colors.length];
}

// Spark trail
export function sparkTrail(t: number): number {
  return Math.exp(-t * 3) * Math.sin(t * 10);
}

// Binary pattern for background
export function binaryPattern(x: number, y: number, time: number): number {
  const cell = Math.floor(x * 30) + Math.floor(y * 20) * 30;
  const phase = Math.sin(cell * 0.1 + time) > 0.7 ? 1 : 0;
  return phase * 0.1;
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
