/**
 * Shadow Match - Math Utilities
 * Noir / Shadow Art / Silhouette Theme
 * Game #065
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

// Spotlight cone effect
export function spotlightCone(
  x: number,
  y: number,
  lightX: number,
  lightY: number,
  angle: number,
  spread: number,
  range: number
): number {
  const dx = x - lightX;
  const dy = y - lightY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > range) return 0;

  const currentAngle = Math.atan2(dy, dx);
  const angleDiff = Math.abs(normalizeAngle(currentAngle - angle));

  if (angleDiff > spread) return 0;

  const angleAttenuation = 1 - angleDiff / spread;
  const distAttenuation = 1 - dist / range;

  return angleAttenuation * distAttenuation;
}

// Normalize angle to -PI to PI range
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

// Shadow projection
export function shadowProjection(
  objectX: number,
  objectY: number,
  lightX: number,
  lightY: number,
  groundY: number
): { x: number; length: number } {
  const dx = objectX - lightX;
  const dy = objectY - lightY;

  if (dy <= 0) return { x: objectX, length: 0 };

  const scale = (groundY - lightY) / dy;
  const shadowX = lightX + dx * scale;
  const shadowLength = Math.abs(shadowX - objectX);

  return { x: shadowX, length: shadowLength };
}

// Light flicker effect
export function lightFlicker(
  time: number,
  intensity: number = 0.1,
  speed: number = 10
): number {
  const base = Math.sin(time * speed) * 0.5 + 0.5;
  const noise = Math.sin(time * speed * 2.3) * Math.sin(time * speed * 3.7);
  return 1 - (base * 0.5 + noise * 0.3) * intensity;
}

// Dust mote floating motion
export function dustMote(
  time: number,
  index: number
): { x: number; y: number; alpha: number } {
  const phase = index * 0.7;
  const x = Math.sin(time * 0.5 + phase) * 30;
  const y = Math.cos(time * 0.3 + phase * 1.5) * 20 - time * 10;
  const alpha = (Math.sin(time * 2 + phase) * 0.5 + 0.5) * 0.6;

  return { x, y, alpha };
}

// Vignette intensity
export function vignette(x: number, y: number, strength: number = 0.5): number {
  const distFromCenter = Math.sqrt(
    Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2)
  );
  return 1 - smoothstep(0.3, 0.8, distFromCenter) * strength;
}

// Noir film grain
export function filmGrain(x: number, y: number, time: number): number {
  const seed = x * 12.9898 + y * 78.233 + time * 43.1234;
  return (Math.sin(seed) * 43758.5453) % 1;
}

// Light ray intensity
export function lightRay(
  x: number,
  y: number,
  rayX: number,
  rayWidth: number,
  angle: number,
  time: number
): number {
  const rotatedX = Math.cos(angle) * (x - rayX) - Math.sin(angle) * y;
  const distFromRay = Math.abs(rotatedX);

  if (distFromRay > rayWidth) return 0;

  const intensity = 1 - distFromRay / rayWidth;
  const flicker = 0.8 + Math.sin(time * 3 + rayX * 10) * 0.2;

  return intensity * intensity * flicker;
}

// Dramatic shadow edge
export function shadowEdge(
  x: number,
  edgeX: number,
  softness: number = 0.1
): number {
  return smoothstep(edgeX - softness, edgeX + softness, x);
}

// Pulse effect for matches
export function matchPulse(t: number, frequency: number = 3): number {
  const pulse = Math.sin(t * Math.PI * frequency) * Math.exp(-t * 2);
  return Math.max(0, pulse);
}

// Reveal animation progress
export function revealProgress(
  t: number,
  duration: number = 0.5
): number {
  const progress = clamp(t / duration, 0, 1);
  return smoothstep(0, 1, progress);
}

// Generate noir color palette
export function noirColor(brightness: number): { r: number; g: number; b: number } {
  // Warm noir tones (amber/sepia tint)
  const warmth = 0.1;
  return {
    r: clamp(brightness + warmth * 0.2, 0, 1),
    g: clamp(brightness + warmth * 0.1, 0, 1),
    b: clamp(brightness - warmth * 0.1, 0, 1)
  };
}

// Spotlight color (warm amber)
export function spotlightColor(intensity: number): { r: number; g: number; b: number } {
  return {
    r: clamp(0.95 * intensity, 0, 1),
    g: clamp(0.75 * intensity, 0, 1),
    b: clamp(0.35 * intensity, 0, 1)
  };
}

// Success glow color
export function successGlow(intensity: number): { r: number; g: number; b: number } {
  return {
    r: clamp(0.2 * intensity, 0, 1),
    g: clamp(0.85 * intensity, 0, 1),
    b: clamp(0.4 * intensity, 0, 1)
  };
}
