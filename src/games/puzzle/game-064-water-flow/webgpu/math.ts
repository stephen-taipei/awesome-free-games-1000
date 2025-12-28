/**
 * Water Flow - Math Utilities
 * Aquatic / Underwater Plumbing Theme
 * Game #064
 */

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Smooth step interpolation
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Water ripple function
export function waterRipple(
  x: number,
  y: number,
  time: number,
  centerX: number = 0,
  centerY: number = 0,
  frequency: number = 10,
  decay: number = 0.1
): number {
  const dx = x - centerX;
  const dy = y - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const wave = Math.sin(dist * frequency - time * 4) * Math.exp(-dist * decay);
  return wave;
}

// Caustics pattern (light through water)
export function caustics(x: number, y: number, time: number, scale: number = 5): number {
  const x1 = Math.sin(x * scale + time * 0.7) * Math.cos(y * scale * 0.8 + time * 0.5);
  const y1 = Math.cos(x * scale * 0.9 + time * 0.6) * Math.sin(y * scale + time * 0.8);
  const x2 = Math.sin((x + y) * scale * 0.5 + time * 0.9);
  return (x1 + y1 + x2) / 3 * 0.5 + 0.5;
}

// Bubble rising motion
export function bubbleRise(
  baseY: number,
  time: number,
  speed: number = 50,
  wobble: number = 0.5,
  phase: number = 0
): { x: number; y: number } {
  const y = baseY - (time * speed) % 500;
  const x = Math.sin(time * 3 + phase) * wobble * 20;
  return { x, y };
}

// Water flow velocity
export function flowVelocity(
  x: number,
  y: number,
  time: number,
  direction: number = 0
): { vx: number; vy: number } {
  const angle = direction * Math.PI / 180;
  const turbulence = Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time * 0.7);
  const baseSpeed = 50;

  return {
    vx: Math.cos(angle) * baseSpeed + turbulence * 10,
    vy: Math.sin(angle) * baseSpeed + turbulence * 5
  };
}

// Pipe glow intensity
export function pipeGlow(time: number, hasWater: boolean, phase: number = 0): number {
  if (!hasWater) return 0.2;
  return 0.5 + Math.sin(time * 3 + phase) * 0.2;
}

// Water shimmer effect
export function waterShimmer(x: number, y: number, time: number): number {
  const wave1 = Math.sin(x * 0.05 + time * 2);
  const wave2 = Math.cos(y * 0.07 + time * 1.5);
  const wave3 = Math.sin((x + y) * 0.03 + time * 2.5);
  return (wave1 + wave2 + wave3) / 6 + 0.5;
}

// Pressure pulse for pipe fill
export function pressurePulse(t: number, intensity: number = 1): number {
  const pulse = Math.sin(t * Math.PI * 8) * Math.exp(-t * 3);
  return pulse * intensity;
}

// Swirl effect for rotation
export function swirlEffect(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angle: number,
  time: number
): { x: number; y: number } {
  const dx = x - centerX;
  const dy = y - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const currentAngle = Math.atan2(dy, dx);
  const swirlAngle = currentAngle + angle * Math.PI / 180 + Math.sin(time) * 0.1;

  return {
    x: centerX + Math.cos(swirlAngle) * dist,
    y: centerY + Math.sin(swirlAngle) * dist
  };
}

// Droplet splash pattern
export function splashPattern(t: number, rings: number = 3): number {
  let total = 0;
  for (let i = 0; i < rings; i++) {
    const delay = i * 0.1;
    const phase = Math.max(0, t - delay);
    const ring = Math.sin(phase * 10) * Math.exp(-phase * 4);
    total += ring;
  }
  return total / rings;
}

// Underwater fog density
export function underwaterFog(depth: number, maxDepth: number = 1): number {
  const normalizedDepth = clamp(depth / maxDepth, 0, 1);
  return smoothstep(0, 1, normalizedDepth) * 0.4;
}

// Seaweed sway motion
export function seaweedSway(y: number, time: number, amplitude: number = 15): number {
  const wave1 = Math.sin(time * 1.5 + y * 0.01) * amplitude;
  const wave2 = Math.sin(time * 2.3 + y * 0.015) * amplitude * 0.5;
  return wave1 + wave2;
}

// Generate random color in aquatic palette
export function aquaticColor(seed: number): { r: number; g: number; b: number } {
  const hue = 180 + (seed % 60); // 180-240 range (cyan to blue)
  const saturation = 0.6 + (seed % 4) * 0.1;
  const lightness = 0.5 + (seed % 3) * 0.1;

  // HSL to RGB conversion
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = lightness - c / 2;

  let r = 0, g = 0, b = 0;
  if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else { r = x; g = 0; b = c; }

  return {
    r: clamp(r + m, 0, 1),
    g: clamp(g + m, 0, 1),
    b: clamp(b + m, 0, 1)
  };
}
