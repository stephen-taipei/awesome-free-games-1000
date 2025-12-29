/**
 * WebGPU Math Utilities - Dice Puzzle
 * Casino / Velvet Table / Gold Theme
 * Game #098
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

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function diceRollMotion(t: number): number {
  // Simulates dice rolling with deceleration
  return 1 - Math.pow(1 - t, 4);
}

export function casinoTablePattern(x: number, y: number, time: number): number {
  // Velvet table texture with subtle waves
  const wave1 = Math.sin(x * 0.02 + time * 0.3) * 0.02;
  const wave2 = Math.sin(y * 0.03 + time * 0.2) * 0.015;
  return 0.5 + wave1 + wave2;
}

export function goldShimmer(x: number, y: number, time: number): number {
  // Gold trim shimmer effect
  const shimmer = Math.sin((x + y) * 0.05 + time * 2) * 0.5 + 0.5;
  return shimmer * shimmer;
}

export function diceShape(localX: number, localY: number, size: number): number {
  // Rounded cube shape for dice particles
  const halfSize = size * 0.5;
  const dx = Math.abs(localX) - halfSize * 0.8;
  const dy = Math.abs(localY) - halfSize * 0.8;
  const corner = Math.max(dx, dy);
  return smoothstep(0, size * 0.1, -corner);
}

export function dotPattern(localX: number, localY: number, value: number, size: number): number {
  // Render dice dots based on value
  const dotRadius = size * 0.08;
  const spacing = size * 0.25;

  const positions: [number, number][] = [];

  if (value === 1 || value === 3 || value === 5) {
    positions.push([0, 0]); // Center
  }
  if (value >= 2) {
    positions.push([-spacing, -spacing]); // Top-left
    positions.push([spacing, spacing]); // Bottom-right
  }
  if (value >= 4) {
    positions.push([spacing, -spacing]); // Top-right
    positions.push([-spacing, spacing]); // Bottom-left
  }
  if (value === 6) {
    positions.push([-spacing, 0]); // Middle-left
    positions.push([spacing, 0]); // Middle-right
  }

  let intensity = 0;
  for (const [px, py] of positions) {
    const dist = Math.sqrt((localX - px) ** 2 + (localY - py) ** 2);
    intensity = Math.max(intensity, smoothstep(dotRadius, dotRadius * 0.6, dist));
  }

  return intensity;
}

// Casino theme colors
export function getVelvetGreen(): [number, number, number] {
  return [0.133, 0.545, 0.333]; // #228b55 Emerald green
}

export function getGoldColor(): [number, number, number] {
  return [0.855, 0.647, 0.125]; // #daa520 Gold
}

export function getIvoryColor(): [number, number, number] {
  return [0.98, 0.96, 0.90]; // Ivory white for dice
}

export function getWoodBrown(): [number, number, number] {
  return [0.396, 0.263, 0.129]; // Dark wood brown
}

export function getGoalGreen(): [number, number, number] {
  return [0.306, 0.800, 0.639]; // #4ecca3 Goal highlight
}

export function getBlockedRed(): [number, number, number] {
  return [0.914, 0.271, 0.376]; // #e94560 Blocked cell
}
