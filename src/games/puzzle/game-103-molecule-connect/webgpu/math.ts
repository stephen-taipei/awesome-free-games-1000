/**
 * Math Utilities - Molecule Connect
 * Science Lab / Chemistry Theme
 * Game #103
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

export function electronOrbit(
  time: number,
  centerX: number,
  centerY: number,
  radius: number,
  speed: number,
  phase: number
): [number, number] {
  const angle = time * speed + phase;
  return [
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius
  ];
}

export function bondEnergy(distance: number, optimalDistance: number): number {
  const ratio = distance / optimalDistance;
  return Math.exp(-((ratio - 1) * (ratio - 1)) * 4);
}

export function molecularVibration(time: number, frequency: number, amplitude: number): number {
  return Math.sin(time * frequency) * amplitude;
}

export function atomicGlow(distance: number, radius: number): number {
  const normalized = distance / radius;
  if (normalized > 2) return 0;
  return Math.exp(-normalized * normalized * 2);
}

export function hexagonalGrid(x: number, y: number, scale: number): number {
  const px = x * scale;
  const py = y * scale;
  const qx = Math.abs(px % 1.732 - 0.866);
  const qy = Math.abs(py % 1.5 - 0.75);
  return Math.max(qx / 0.866, qy / 0.75);
}

export function chemicalReactionWave(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  time: number,
  speed: number
): number {
  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  const wave = Math.sin(dist * 0.1 - time * speed);
  return wave * Math.exp(-dist * 0.02);
}

export function polarToCartesian(
  angle: number,
  radius: number,
  centerX: number,
  centerY: number
): [number, number] {
  return [
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius
  ];
}
