/**
 * Math Utilities - Room Escape
 * Mystery Escape Room / Detective Noir Theme
 * Game #060
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

// Dust mote floating pattern
export function dustFloat(time: number, seed: number): { x: number; y: number } {
  const phase = seed * Math.PI * 2;
  const slowDrift = Math.sin(time * 0.3 + phase) * 0.15;
  const verticalDrift = Math.sin(time * 0.2 + phase * 1.3) * 0.1;
  const turbulence = Math.sin(time * 1.5 + phase * 2) * 0.02;
  return {
    x: slowDrift + turbulence,
    y: -0.05 + verticalDrift
  };
}

// Flickering light intensity
export function lightFlicker(time: number, seed: number, baseIntensity: number = 0.8): number {
  const phase = seed * 100;
  const slow = Math.sin(time * 2 + phase) * 0.1;
  const fast = Math.sin(time * 15 + phase * 2) * 0.05;
  const random = Math.sin(time * 30 + phase * 3) * 0.02;
  return clamp(baseIntensity + slow + fast + random, 0.3, 1.0);
}

// Light beam ray pattern
export function lightRay(x: number, y: number, angle: number, spread: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const dot = x * dx + y * dy;
  const perp = Math.abs(x * -dy + y * dx);
  const inBeam = dot > 0 && perp < spread * dot;
  return inBeam ? Math.exp(-dot * 2) * (1 - perp / (spread * dot)) : 0;
}

// Mystery fog drift
export function fogDrift(x: number, y: number, time: number, seed: number): number {
  const phase = seed * 50;
  const n1 = Math.sin(x * 2 + time * 0.1 + phase) * Math.cos(y * 2 + time * 0.08);
  const n2 = Math.sin(x * 5 - time * 0.05 + phase) * Math.cos(y * 3 + time * 0.06) * 0.5;
  return (n1 + n2 + 1) * 0.5;
}

// Lock mechanism rotation
export function lockRotation(progress: number): number {
  // Simulates lock tumbler falling into place
  const stages = [0.25, 0.5, 0.75, 1.0];
  let rotation = 0;
  for (const stage of stages) {
    if (progress >= stage) {
      rotation += Math.PI / 2;
    } else if (progress > stage - 0.1) {
      const t = (progress - (stage - 0.1)) / 0.1;
      rotation += t * Math.PI / 2;
      break;
    } else {
      break;
    }
  }
  return rotation;
}

// Key sparkle pattern
export function keySparkle(time: number, seed: number): number {
  const phase = seed * Math.PI * 2;
  const sparkle = Math.pow(Math.sin(time * 5 + phase), 8);
  return sparkle * (0.5 + Math.random() * 0.5);
}

// Discovery glow pulse
export function discoveryPulse(time: number, intensity: number = 1): number {
  const pulse = Math.sin(time * 3) * 0.3 + 0.7;
  const shimmer = Math.sin(time * 12) * 0.1 + 0.9;
  return pulse * shimmer * intensity;
}

// Door swing animation
export function doorSwing(progress: number): number {
  // Smooth door opening with slight bounce
  const t = clamp(progress, 0, 1);
  const swing = t * Math.PI / 3; // 60 degree opening
  const bounce = Math.sin(t * Math.PI * 2) * 0.05 * (1 - t);
  return swing + bounce;
}

// Shadow casting
export function shadowCast(lightX: number, lightY: number, objectX: number, objectY: number, distance: number): number {
  const dx = objectX - lightX;
  const dy = objectY - lightY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const falloff = Math.exp(-dist / distance);
  return 1 - falloff * 0.7;
}

// Mysterious aura wobble
export function auraWobble(angle: number, time: number, seed: number): number {
  const phase = seed * Math.PI * 2;
  const wobble = Math.sin(angle * 3 + time * 2 + phase) * 0.1;
  const pulse = Math.sin(time * 1.5 + phase) * 0.05;
  return 1 + wobble + pulse;
}

// Safe dial rotation
export function dialRotation(time: number, targetAngle: number, speed: number = 1): number {
  const current = (time * speed * Math.PI) % (Math.PI * 2);
  const diff = targetAngle - current;
  return current + Math.sin(diff) * 0.1;
}

// Escape celebration burst
export function celebrationBurst(index: number, total: number, time: number): { x: number; y: number; scale: number } {
  const angle = (index / total) * Math.PI * 2 + time * 0.5;
  const radius = 0.5 + Math.sin(time * 2 + index) * 0.2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    scale: 1 + Math.sin(time * 3 + index * 0.5) * 0.3
  };
}

// Evidence highlight
export function evidenceGlow(time: number, priority: number): number {
  const base = 0.5 + priority * 0.3;
  const pulse = Math.sin(time * (2 + priority)) * 0.2;
  return clamp(base + pulse, 0.3, 1.0);
}

// Keyhole light leak
export function keyholeLight(x: number, y: number, time: number): number {
  const centerDist = Math.sqrt(x * x + y * y);
  const shape = x > 0 && centerDist < 0.3 ? 1 : 0;
  const flicker = lightFlicker(time, 0, 0.9);
  return shape * flicker;
}

// Fingerprint reveal
export function fingerprintReveal(progress: number, angle: number): number {
  const ridgePattern = Math.sin(angle * 15) * 0.5 + 0.5;
  const reveal = smoothstep(0, 1, progress);
  return ridgePattern * reveal;
}

// Clock pendulum
export function pendulumSwing(time: number, amplitude: number = 0.5): number {
  return Math.sin(time * 2) * amplitude;
}
