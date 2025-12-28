/**
 * Math Utilities - Connect 4 Puzzle
 * Neon / Board Game / Grid / Discs Theme
 * Game #096
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

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function gridPattern(x: number, y: number, size: number): number {
  const gx = Math.abs(Math.sin(x / size * Math.PI));
  const gy = Math.abs(Math.sin(y / size * Math.PI));
  return gx * gy;
}

export function discShape(x: number, y: number, cx: number, cy: number, radius: number): number {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return smoothstep(radius, radius - 0.1, dist);
}

export function glowIntensity(distance: number, radius: number, falloff: number = 2): number {
  if (distance < radius) return 1;
  return Math.pow(radius / distance, falloff);
}

export function connectionLine(
  x: number, y: number,
  x1: number, y1: number,
  x2: number, y2: number,
  thickness: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return 0;

  const t = clamp(((x - x1) * dx + (y - y1) * dy) / (length * length), 0, 1);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
  return smoothstep(thickness, 0, dist);
}

export function pulseWave(time: number, frequency: number = 1, amplitude: number = 1): number {
  return (Math.sin(time * frequency * Math.PI * 2) * 0.5 + 0.5) * amplitude;
}

export function neonGlow(intensity: number, baseColor: [number, number, number]): [number, number, number] {
  const boost = 1 + intensity * 0.5;
  return [
    clamp(baseColor[0] * boost, 0, 1),
    clamp(baseColor[1] * boost, 0, 1),
    clamp(baseColor[2] * boost, 0, 1)
  ];
}

export function getRedPieceColor(): [number, number, number] {
  return [0.914, 0.271, 0.376]; // #e94560
}

export function getYellowPieceColor(): [number, number, number] {
  return [0.976, 0.851, 0.137]; // #f9d923
}

export function getHighlightColor(): [number, number, number] {
  return [0.306, 0.800, 0.639]; // #4ecca3
}

export function getBoardColor(): [number, number, number] {
  return [0.086, 0.129, 0.243]; // #16213e
}

export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

export function polarToCartesian(angle: number, radius: number): [number, number] {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}
