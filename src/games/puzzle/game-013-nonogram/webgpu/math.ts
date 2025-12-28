/**
 * Math Utilities - Nonogram
 * Game #013
 */

export function createMat4(): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

export function ortho(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number
): Float32Array {
  const out = createMat4();
  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);
  const nf = 1 / (near - far);

  out[0] = -2 * lr;
  out[5] = -2 * bt;
  out[10] = 2 * nf;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;

  return out;
}

export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vec2Length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
