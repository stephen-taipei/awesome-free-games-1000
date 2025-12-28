/**
 * WebGPU Math Utilities - Track Switch
 * Railway / Industrial Theme
 * Game #108
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

// Steam puff animation
export function steamPuff(time: number, phase: number): number {
  const t = (time + phase) % 2;
  return Math.sin(t * Math.PI) * Math.exp(-t * 0.5);
}

// Train wheel rotation
export function wheelRotation(distance: number, wheelRadius: number): number {
  return (distance / wheelRadius) % (Math.PI * 2);
}

// Track curvature
export function trackCurve(t: number, curvature: number): number {
  return Math.sin(t * Math.PI) * curvature;
}

// Signal light blink
export function signalBlink(time: number, frequency: number = 2): number {
  return Math.sin(time * frequency * Math.PI) > 0 ? 1 : 0;
}

// Coal ember glow
export function emberGlow(time: number, seed: number): number {
  const flicker = Math.sin(time * 10 + seed * 20) * 0.3;
  return 0.7 + flicker + Math.sin(time * 3 + seed * 10) * 0.2;
}

// Smoke drift pattern
export function smokeDrift(time: number, y: number): number {
  const drift = Math.sin(time * 0.5 + y * 0.1) * 20;
  return drift;
}

// Railway sleeper pattern
export function sleeperPattern(x: number, spacing: number): number {
  const p = (x % spacing) / spacing;
  return p < 0.3 ? 1 : 0;
}

// Crossing gate angle
export function gateAngle(time: number, isClosing: boolean): number {
  const target = isClosing ? Math.PI / 2 : 0;
  return target * (1 - Math.exp(-time * 2));
}

// Vibration pattern for trains
export function trainVibration(time: number, speed: number): number {
  const base = Math.sin(time * speed * 20) * 0.002;
  const secondary = Math.sin(time * speed * 35) * 0.001;
  return base + secondary;
}

// Bell swing
export function bellSwing(time: number): number {
  return Math.sin(time * 8) * Math.exp(-time * 0.5) * 0.3;
}

// Spark trajectory
export function sparkPath(t: number, angle: number, gravity: number): { x: number; y: number } {
  const vx = Math.cos(angle) * 50;
  const vy = Math.sin(angle) * 50 - gravity * t;
  return {
    x: vx * t,
    y: vy * t + 0.5 * gravity * t * t,
  };
}

// Piston motion
export function pistonMotion(wheelAngle: number): number {
  return Math.sin(wheelAngle) * 0.5 + 0.5;
}

// Steam whistle frequency
export function whistleFreq(time: number, baseFreq: number): number {
  const vibrato = Math.sin(time * 15) * 10;
  return baseFreq + vibrato;
}

// Track switch animation
export function switchTransition(time: number, duration: number): number {
  const t = clamp(time / duration, 0, 1);
  return t * t * (3 - 2 * t); // Smooth step
}

// Countryside hill
export function hillProfile(x: number, seed: number): number {
  return Math.sin(x * 0.01 + seed) * 30 + Math.sin(x * 0.02 + seed * 2) * 15;
}
