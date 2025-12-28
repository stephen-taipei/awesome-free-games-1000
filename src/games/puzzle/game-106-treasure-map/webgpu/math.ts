/**
 * WebGPU Math Utilities - Treasure Map
 * Pirate Adventure / Nautical Theme
 * Game #106
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

// Ocean wave pattern
export function oceanWave(x: number, time: number, amplitude: number = 10): number {
  const wave1 = Math.sin(x * 0.02 + time * 2) * amplitude;
  const wave2 = Math.sin(x * 0.03 + time * 1.5) * amplitude * 0.5;
  const wave3 = Math.sin(x * 0.01 + time) * amplitude * 0.3;
  return wave1 + wave2 + wave3;
}

// Compass needle direction
export function compassDirection(time: number, targetAngle: number): number {
  const wobble = Math.sin(time * 3) * 0.1;
  const drift = Math.sin(time * 0.5) * 0.05;
  return targetAngle + wobble + drift;
}

// Parchment crinkle texture
export function parchmentTexture(x: number, y: number): number {
  const noise1 = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5;
  const noise2 = Math.sin(x * 0.2 + 1) * Math.cos(y * 0.15) * 0.3;
  return 0.7 + noise1 + noise2;
}

// Treasure sparkle pattern
export function sparklePattern(time: number, seed: number): number {
  const phase = seed * 6.283;
  const flicker = Math.sin(time * 8 + phase) * 0.5 + 0.5;
  const twinkle = Math.pow(flicker, 3);
  return twinkle;
}

// X marks the spot glow
export function xMarkGlow(x: number, y: number, centerX: number, centerY: number, size: number): number {
  const dx = Math.abs(x - centerX);
  const dy = Math.abs(y - centerY);
  const inX = dx < size && Math.abs(dx - dy) < size * 0.2;
  return inX ? 1 : 0;
}

// Ship wheel rotation
export function wheelRotation(time: number, speed: number = 1): number {
  return (time * speed) % (Math.PI * 2);
}

// Gold coin shimmer
export function coinShimmer(time: number, index: number): number {
  const phase = index * 0.5;
  const rotation = Math.sin(time * 4 + phase);
  const shine = Math.pow(Math.max(0, rotation), 2);
  return shine;
}

// Rope swing motion
export function ropeSwing(time: number, amplitude: number = 15): number {
  return Math.sin(time * 1.5) * amplitude * Math.exp(-time * 0.1);
}

// Map edge burning effect
export function burnEdge(x: number, y: number, width: number, height: number): number {
  const edgeDist = Math.min(x, y, width - x, height - y);
  const threshold = Math.min(width, height) * 0.1;
  return smoothstep(0, threshold, edgeDist);
}

// Anchor drop physics
export function anchorDrop(time: number, maxDepth: number): number {
  const gravity = 200;
  const drag = 0.98;
  let velocity = 0;
  let position = 0;

  for (let t = 0; t < time; t += 0.016) {
    velocity += gravity * 0.016;
    velocity *= drag;
    position += velocity * 0.016;
    if (position >= maxDepth) {
      position = maxDepth;
      break;
    }
  }
  return position;
}
