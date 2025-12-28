/**
 * Math Utilities - Constellation
 * Celestial Night Sky / Observatory Astronomy Theme
 * Game #059
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Star twinkle pattern
export function starTwinkle(time: number, seed: number, intensity: number = 1): number {
  const phase = seed * Math.PI * 2;
  const slow = Math.sin(time * 1.5 + phase) * 0.3;
  const fast = Math.sin(time * 5 + phase * 2) * 0.2;
  return (0.5 + slow + fast) * intensity;
}

// Shooting star trail
export function shootingStarPath(t: number, startX: number, startY: number, angle: number): { x: number; y: number } {
  const speed = 2;
  return {
    x: startX + Math.cos(angle) * t * speed,
    y: startY + Math.sin(angle) * t * speed
  };
}

// Nebula cloud density
export function nebulaDensity(x: number, y: number, time: number, seed: number): number {
  const phase = seed * 100;
  const n1 = Math.sin(x * 3 + time * 0.2 + phase) * Math.cos(y * 3 + time * 0.15);
  const n2 = Math.sin(x * 7 - time * 0.1 + phase) * Math.cos(y * 5 + time * 0.08) * 0.5;
  return (n1 + n2 + 1) * 0.5;
}

// Constellation line glow
export function lineGlow(distance: number, time: number, connected: boolean): number {
  const base = Math.exp(-distance * 5);
  const pulse = connected ? (Math.sin(time * 3) * 0.2 + 0.8) : 0.5;
  return base * pulse;
}

// Aurora wave
export function auroraWave(x: number, y: number, time: number): number {
  const wave1 = Math.sin(x * 2 + time * 0.5) * 0.5;
  const wave2 = Math.sin(x * 4 + time * 0.8 + y * 2) * 0.3;
  const curtain = smoothstep(0.3, 0.8, y);
  return (wave1 + wave2) * curtain;
}

// Galaxy spiral arm
export function spiralArm(angle: number, radius: number, time: number, arms: number): number {
  const spiral = (angle + radius * 0.5 + time * 0.1) * arms;
  const armStrength = Math.sin(spiral) * 0.5 + 0.5;
  const fade = Math.exp(-radius * 2);
  return armStrength * fade;
}

// Celestial rotation
export function celestialRotation(x: number, y: number, time: number, speed: number): { rx: number; ry: number } {
  const angle = time * speed;
  const cx = 0.5, cy = 0.5;
  const dx = x - cx, dy = y - cy;
  return {
    rx: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
    ry: cy + dx * Math.sin(angle) + dy * Math.cos(angle)
  };
}

// Stellar corona
export function stellarCorona(distance: number, time: number): number {
  const rays = Math.sin(distance * 20 - time * 2) * 0.3 + 0.7;
  const fade = Math.exp(-distance * 3);
  return rays * fade;
}

// Parallax starfield
export function parallaxOffset(layer: number, scrollX: number, scrollY: number): { x: number; y: number } {
  const speed = 1 / (layer + 1);
  return {
    x: scrollX * speed,
    y: scrollY * speed
  };
}

// Planetary ring
export function planetaryRing(angle: number, radius: number, ringWidth: number): number {
  const inRing = Math.abs(radius - 0.5) < ringWidth;
  if (!inRing) return 0;
  const edge = 1 - Math.abs(radius - 0.5) / ringWidth;
  const gap = Math.sin(angle * 8) * 0.3 + 0.7;
  return edge * gap;
}

// Comet tail
export function cometTail(t: number, headX: number, headY: number, velocity: number): { x: number; y: number; alpha: number } {
  const spread = t * 0.3;
  const randomAngle = (Math.random() - 0.5) * spread;
  return {
    x: headX - t * velocity + Math.sin(randomAngle) * t * 0.2,
    y: headY + Math.sin(randomAngle) * t * 0.1,
    alpha: 1 - t
  };
}

// Star cluster distribution
export function clusterDistribution(index: number, total: number, radius: number): { x: number; y: number } {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = index * goldenAngle;
  const r = Math.sqrt(index / total) * radius;
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r
  };
}

// Zodiac constellation highlight
export function zodiacHighlight(time: number, month: number): number {
  const current = (time / 30) % 12;
  const diff = Math.abs(current - month);
  return Math.exp(-diff * 2);
}
