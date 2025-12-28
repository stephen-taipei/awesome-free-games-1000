/**
 * Math Utilities - Domino Chain
 * Wooden Board Game / Classic Domino Theme
 * Game #061
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

// Wood grain pattern
export function woodGrain(x: number, y: number, time: number, seed: number): number {
  const phase = seed * 100;
  const ring = Math.sin(x * 10 + Math.sin(y * 2 + phase) * 3) * 0.5 + 0.5;
  const grain = Math.sin(y * 50 + Math.sin(x * 10) * 3 + phase) * 0.3;
  const knot = Math.exp(-((x - 0.3) ** 2 + (y - 0.5) ** 2) * 50) * 0.2;
  return ring + grain + knot;
}

// Domino fall trajectory
export function dominoFall(progress: number, direction: number): number {
  // Eased fall with slight bounce at end
  const t = clamp(progress, 0, 1);
  const fall = t * t * (3 - 2 * t); // smoothstep
  const bounce = Math.sin(t * Math.PI * 3) * 0.05 * (1 - t);
  return (fall + bounce) * 90 * direction;
}

// Chain reaction wave
export function chainWave(distance: number, time: number, speed: number): number {
  const wave = Math.max(0, 1 - Math.abs(distance - time * speed) * 2);
  return wave * wave;
}

// Impact dust pattern
export function impactDust(angle: number, distance: number, time: number): { x: number; y: number } {
  const spread = 1 + time * 2;
  const drift = Math.sin(angle * 3 + time * 5) * 0.2;
  return {
    x: Math.cos(angle + drift) * distance * spread,
    y: Math.sin(angle + drift) * distance * spread - time * 0.5
  };
}

// Collision spark
export function collisionSpark(time: number, seed: number): { angle: number; speed: number } {
  const baseAngle = seed * Math.PI * 2;
  const wobble = Math.sin(time * 10 + seed * 5) * 0.3;
  return {
    angle: baseAngle + wobble,
    speed: 1 + Math.sin(seed * 100) * 0.5
  };
}

// Target glow pulse
export function targetPulse(time: number, intensity: number = 1): number {
  const pulse = Math.sin(time * 3) * 0.3 + 0.7;
  const shimmer = Math.sin(time * 8) * 0.1 + 0.9;
  return pulse * shimmer * intensity;
}

// Shockwave ripple
export function shockwaveRipple(distance: number, time: number, speed: number): number {
  const waveFront = time * speed;
  const thickness = 0.1;
  const inWave = Math.abs(distance - waveFront) < thickness;
  return inWave ? (1 - Math.abs(distance - waveFront) / thickness) * (1 - time) : 0;
}

// Domino shadow projection
export function dominoShadow(angle: number, lightAngle: number): { offsetX: number; offsetY: number; blur: number } {
  const shadowAngle = lightAngle + Math.PI;
  const length = Math.abs(Math.sin(angle * Math.PI / 180)) * 15;
  return {
    offsetX: Math.cos(shadowAngle) * length,
    offsetY: Math.sin(shadowAngle) * length + 3,
    blur: 5 + length * 0.5
  };
}

// Victory confetti physics
export function confettiPhysics(time: number, seed: number, gravity: number): { x: number; y: number; rotation: number } {
  const initialVx = (seed - 0.5) * 8;
  const initialVy = -5 - seed * 5;
  const flutter = Math.sin(time * 10 + seed * 20) * (1 - time * 0.5);

  return {
    x: initialVx * time + flutter * 0.5,
    y: initialVy * time + gravity * time * time * 0.5,
    rotation: time * (seed - 0.5) * 10
  };
}

// Surface bounce
export function surfaceBounce(velocity: number, elasticity: number): number {
  return -velocity * elasticity;
}

// Domino placement preview
export function placementPreview(distance: number, valid: boolean, time: number): number {
  const base = valid ? 0.8 : 0.3;
  const pulse = Math.sin(time * 4) * 0.1;
  const fade = smoothstep(50, 0, distance);
  return (base + pulse) * fade;
}

// Board edge glow
export function boardEdgeGlow(x: number, y: number, width: number, height: number): number {
  const edgeX = Math.min(x, width - x) / 50;
  const edgeY = Math.min(y, height - y) / 50;
  const edge = Math.min(edgeX, edgeY);
  return smoothstep(0, 1, edge);
}

// Domino rotation inertia
export function rotationInertia(currentAngle: number, targetAngle: number, damping: number): number {
  const diff = targetAngle - currentAngle;
  return currentAngle + diff * (1 - damping);
}

// Chain momentum transfer
export function momentumTransfer(impactVelocity: number, massRatio: number): number {
  return impactVelocity * (2 * massRatio) / (1 + massRatio);
}
